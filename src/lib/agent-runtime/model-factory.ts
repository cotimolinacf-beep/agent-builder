import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ThinkingLevel } from "@/types";

/**
 * Factory to create a Gemini model based on the requested thinking level.
 * 
 * Mapping:
 * - low: gemini-2.5-flash-lite
 * - medium: gemini-2.5-flash
 * - high: gemini-3-pro
 * - auto: gemini-2.5-flash (default)
 */
export function getModelForThinkingLevel(level: ThinkingLevel = "auto") {
    let modelName: string;

    switch (level) {
        case "low":
            modelName = "gemini-2.5-flash-lite";
            break;
        case "medium":
            modelName = "gemini-2.5-flash";
            break;
        case "high":
            modelName = "gemini-3-flash-preview";
            break;
        case "auto":
        default:
            modelName = "gemini-2.5-flash";
            break;
    }

    return new ChatGoogleGenerativeAI({
        model: modelName,
        temperature: 0.7, // Default temperature for variety
    });
}
