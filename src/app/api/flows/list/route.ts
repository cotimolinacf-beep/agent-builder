import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET() {
    try {
        const flowsDir = path.join(process.cwd(), "public", "flows");

        // Check if flows directory exists
        if (!existsSync(flowsDir)) {
            return NextResponse.json([]);
        }

        // Read all JSON files in flows directory
        const files = await readdir(flowsDir);
        const jsonFiles = files.filter(file => file.endsWith(".json"));

        // Read and parse each flow file
        const flows = await Promise.all(
            jsonFiles.map(async (fileName) => {
                const filePath = path.join(flowsDir, fileName);
                const fileContent = await readFile(filePath, "utf8");
                const flowData = JSON.parse(fileContent);

                return {
                    id: flowData.id,
                    name: flowData.name,
                    updatedAt: flowData.updatedAt,
                    nodeCount: flowData.nodes?.length || 0,
                };
            })
        );

        // Sort by updated date (newest first)
        flows.sort(
            (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        return NextResponse.json(flows);
    } catch (error) {
        console.error("Error listing flows:", error);
        return NextResponse.json(
            { error: "Failed to list flows" },
            { status: 500 }
        );
    }
}
