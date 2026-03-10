import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { AgentFactory } from "@/lib/agent-runtime/agent-factory";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const flowsDir = path.join(process.cwd(), "public", "flows");
        // Normalize ID just in case (e.g. remove flow- prefix if mismatch, but assuming id matches filename)
        // Actually, based on previous file steps, filenames are like "flow-1770416066937.json"
        // The ID passed in URL is likely "flow-1770416066937"
        const filePath = path.join(flowsDir, `${id}.json`);

        if (!existsSync(filePath)) {
            return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        }

        const fileContent = await readFile(filePath, "utf8");
        const flowData = JSON.parse(fileContent);

        // Verify we can build the graph
        await AgentFactory.createAgentGraph(
            id,
            flowData.nodes,
            flowData.edges,
            flowData.baseSystemPrompt
        );

        return NextResponse.json({ success: true, message: `Agent compiled successfully` });
    } catch (error) {
        console.error("Compilation error:", error);
        return NextResponse.json(
            { error: "Compilation failed", details: String(error) },
            { status: 500 }
        );
    }
}
