import { Composio } from "@composio/core";
import { LangchainProvider } from "@composio/langchain";

const COMPOSIO_USER_ID = "default_user";

function getApiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    throw new Error("COMPOSIO_API_KEY is not set in environment");
  }
  return key;
}

/**
 * Returns a Composio instance configured with the API key from env.
 * Uses LangchainProvider so tools can be wrapped for LangGraph.
 */
export function getComposio(): Composio<LangchainProvider> {
  return new Composio({
    apiKey: getApiKey(),
    provider: new LangchainProvider(),
  });
}

export function getComposioUserId(): string {
  return COMPOSIO_USER_ID;
}
