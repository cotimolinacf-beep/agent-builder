import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const flowsDir = path.join(process.cwd(), "public", "flows");
        const filePath = path.join(flowsDir, `${id}.json`);

        if (!existsSync(filePath)) {
            return NextResponse.json(
                { error: "Flow not found" },
                { status: 404 }
            );
        }

        const fileContent = await readFile(filePath, "utf8");
        const flowData = JSON.parse(fileContent);

        return NextResponse.json(flowData);
    } catch (error) {
        console.error("Error loading flow:", error);
        return NextResponse.json(
            { error: "Failed to load flow" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const flowsDir = path.join(process.cwd(), "public", "flows");
        const filePath = path.join(flowsDir, `${id}.json`);

        if (!existsSync(filePath)) {
            return NextResponse.json(
                { error: "Flow not found" },
                { status: 404 }
            );
        }

        await unlink(filePath);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting flow:", error);
        return NextResponse.json(
            { error: "Failed to delete flow" },
            { status: 500 }
        );
    }
}
