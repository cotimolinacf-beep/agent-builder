import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET() {
    try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");

        // Check if uploads directory exists
        if (!existsSync(uploadsDir)) {
            return NextResponse.json([]);
        }

        // Read all files in uploads directory
        const files = await readdir(uploadsDir);

        // Filter out .gitkeep and get file stats
        const fileMetadata = await Promise.all(
            files
                .filter((file) => file !== ".gitkeep")
                .map(async (fileName) => {
                    const filePath = path.join(uploadsDir, fileName);
                    const stats = await stat(filePath);

                    // Extract timestamp from filename if available
                    const match = fileName.match(/-(\d+)(\.[^.]+)$/);
                    const timestamp = match ? parseInt(match[1]) : stats.birthtimeMs;

                    // Generate original name by removing timestamp
                    const originalName = match
                        ? fileName.replace(`-${match[1]}`, "")
                        : fileName;

                    return {
                        id: `kb-${timestamp}`,
                        name: originalName,
                        description: `Uploaded: ${new Date(stats.mtime).toLocaleDateString()}`,
                        fileName: fileName,
                        filePath: `/uploads/${fileName}`,
                        uploadDate: stats.mtime.toISOString(),
                        fileSize: stats.size,
                    };
                })
        );

        // Sort by upload date (newest first)
        fileMetadata.sort(
            (a, b) =>
                new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );

        return NextResponse.json(fileMetadata);
    } catch (error) {
        console.error("Error listing files:", error);
        return NextResponse.json(
            { error: "Failed to list files" },
            { status: 500 }
        );
    }
}
