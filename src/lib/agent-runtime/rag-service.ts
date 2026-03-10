import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { KnowledgeBase } from "@/types";
import * as path from "path";
import * as fs from "fs";

/**
 * Initialize a vector store from an agent's knowledge bases
 * Loads PDF and CSV files, splits them into chunks, and creates embeddings
 */
export async function initializeVectorStore(
    knowledgeBases: KnowledgeBase[]
): Promise<MemoryVectorStore | null> {
    if (!knowledgeBases || knowledgeBases.length === 0) {
        return null;
    }

    const allDocuments = [];

    for (const kb of knowledgeBases) {
        if (!kb.filePath) {
            console.warn(`⚠️ Knowledge base ${kb.name} has no filePath, skipping`);
            continue;
        }

        try {
            // Resolve file path relative to public folder
            const fullPath = path.join(process.cwd(), "public", kb.filePath);

            // Check if file exists
            if (!fs.existsSync(fullPath)) {
                console.warn(`⚠️ File not found: ${fullPath}, skipping`);
                continue;
            }

            // Determine loader based on file extension
            const ext = path.extname(kb.filePath).toLowerCase();
            let loader;

            if (ext === ".pdf") {
                loader = new PDFLoader(fullPath);
            } else if (ext === ".csv") {
                loader = new CSVLoader(fullPath);
            } else {
                console.warn(`⚠️ Unsupported file type: ${ext}, skipping ${kb.name}`);
                continue;
            }

            // Load documents
            const docs = await loader.load();
            console.log(`✅ Loaded ${docs.length} documents from ${kb.name}`);

            // Add metadata to track which knowledge base each document came from
            docs.forEach(doc => {
                doc.metadata = {
                    ...doc.metadata,
                    knowledgeBaseId: kb.id,
                    knowledgeBaseName: kb.name,
                };
            });

            allDocuments.push(...docs);
        } catch (error) {
            console.error(`❌ Error loading knowledge base ${kb.name}:`, error);
            // Continue with other knowledge bases
        }
    }

    if (allDocuments.length === 0) {
        console.warn("⚠️ No documents loaded from knowledge bases");
        return null;
    }

    // Split documents into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 128,
    });

    const splitDocs = await textSplitter.splitDocuments(allDocuments);
    console.log(`📄 Split into ${splitDocs.length} chunks`);

    // Create embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "models/gemini-embedding-001",
    });

    // Create and populate vector store
    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings
    );

    console.log(`🗄️ Vector store initialized with ${splitDocs.length} chunks`);

    return vectorStore;
}

/**
 * Retrieve relevant context with similarity scores
 * Returns chunks that meet the similarity threshold
 */
export async function retrieveContextWithScores(
    vectorStore: MemoryVectorStore,
    query: string,
    k: number = 4,
    similarityThreshold: number = 0.7
): Promise<Array<{ content: string; score: number }>> {
    try {
        // Perform similarity search with scores
        const results = await vectorStore.similaritySearchWithScore(query, k);
        
        // Filter by threshold and format results
        const filteredResults = results
            .filter(([_doc, score]) => score >= similarityThreshold)
            .map(([doc, score]) => ({
                content: doc.pageContent,
                score: score,
            }));

        console.log(
            `🔍 Retrieved ${filteredResults.length}/${results.length} chunks above threshold ${similarityThreshold}`
        );

        return filteredResults;
    } catch (error) {
        console.error("❌ Error retrieving context:", error);
        return [];
    }
}
