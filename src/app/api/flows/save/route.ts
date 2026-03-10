import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
    try {
        const flowData = await request.json();
        const { id, name, nodes, edges, baseSystemPrompt } = flowData;

        if (!id || !name) {
            return NextResponse.json(
                { error: "Flow ID and name are required" },
                { status: 400 }
            );
        }

        // Create flows directory if it doesn't exist
        const flowsDir = path.join(process.cwd(), "public", "flows");
        if (!existsSync(flowsDir)) {
            await mkdir(flowsDir, { recursive: true });
        }

        // Prepare flow data with metadata
        const fullFlowData = {
            id,
            name,
            nodes: nodes || [],
            edges: edges || [],
            baseSystemPrompt,
            updatedAt: new Date().toISOString(),
        };

        // Save to file
        const filePath = path.join(flowsDir, `${id}.json`);
        await writeFile(filePath, JSON.stringify(fullFlowData, null, 2));

        return NextResponse.json({ success: true, flowId: id });
    } catch (error) {
        console.error("Error saving flow:", error);
        return NextResponse.json(
            { error: "Failed to save flow" },
            { status: 500 }
        );
    }
}
