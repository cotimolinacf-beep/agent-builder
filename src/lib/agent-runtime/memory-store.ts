import { MemorySaver } from "@langchain/langgraph";

// Global singleton to persist state across hot reloads in dev (and calls in production runtime)
// Note: In Next.js serverless, this is still fragile, but works for "npm run dev" usually.
const globalForMemory = global as unknown as { agentMemory?: MemorySaver };

export const memoryStore =
    globalForMemory.agentMemory || new MemorySaver();

if (process.env.NODE_ENV !== "production") {
    globalForMemory.agentMemory = memoryStore;
}
