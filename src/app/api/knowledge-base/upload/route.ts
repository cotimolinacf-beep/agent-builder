import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename to avoid conflicts
        const timestamp = Date.now();
        const originalName = file.name;
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const fileName = `${baseName}-${timestamp}${extension}`;

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadsDir, fileName);
        await writeFile(filePath, buffer);

        // Return file metadata
        const fileMetadata = {
            id: `kb-${timestamp}`,
            name: originalName,
            description: `Uploaded: ${new Date().toLocaleDateString()}`,
            fileName: fileName,
            filePath: `/uploads/${fileName}`,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
        };

        return NextResponse.json(fileMetadata);
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}
