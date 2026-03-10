import { NextRequest, NextResponse } from "next/server";
import { getComposio, getComposioUserId } from "@/lib/composio";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  try {
    const composio = getComposio();
    const userId = getComposioUserId();

    switch (action) {
      case "list-toolkits": {
        const result = await composio.toolkits.get({ limit: 100 });
        const items = Array.isArray(result) ? result : [];
        return NextResponse.json({ items });
      }

      case "list-tools": {
        const toolkitSlug = request.nextUrl.searchParams.get("toolkitSlug");
        if (!toolkitSlug) {
          return NextResponse.json(
            { error: "toolkitSlug query parameter is required" },
            { status: 400 }
          );
        }
        const result = await composio.tools.getRawComposioTools({
          toolkits: [toolkitSlug],
          limit: 100,
        });
        const items = Array.isArray(result) ? result : [];
        return NextResponse.json({ items });
      }

      case "check-connection": {
        const toolkitSlug = request.nextUrl.searchParams.get("toolkitSlug");
        if (!toolkitSlug) {
          return NextResponse.json(
            { error: "toolkitSlug query parameter is required" },
            { status: 400 }
          );
        }
        // Use connectedAccounts.list so we see actual connections for this user/toolkit
        // (session.toolkits() only returns toolkits enabled for the session and can miss new connections)
        const listResponse = await composio.connectedAccounts.list({
          userIds: [userId],
          toolkitSlugs: [toolkitSlug],
        });
        const items = (listResponse as { items?: Array<{ status?: string }> }).items ?? [];
        const hasActive = items.some((a) => a.status === "ACTIVE");
        return NextResponse.json({ isConnected: hasActive, slug: toolkitSlug });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 });
    }
  } catch (err) {
    console.error("Composio API error:", err);
    const message = err instanceof Error ? err.message : "Composio request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  try {
    const composio = getComposio();
    const userId = getComposioUserId();

    if (action === "authorize") {
      const body = await request.json().catch(() => ({}));
      const toolkitSlug = body.toolkitSlug ?? request.nextUrl.searchParams.get("toolkitSlug");
      if (!toolkitSlug || typeof toolkitSlug !== "string") {
        return NextResponse.json(
          { error: "toolkitSlug is required" },
          { status: 400 }
        );
      }
      const connectionRequest = await composio.toolkits.authorize(userId, toolkitSlug);
      const redirectUrl =
        connectionRequest.redirectUrl ?? (connectionRequest as { redirect_url?: string }).redirect_url ?? null;
      return NextResponse.json({ redirectUrl });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 });
  } catch (err) {
    console.error("Composio API error:", err);
    const message = err instanceof Error ? err.message : "Composio request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
