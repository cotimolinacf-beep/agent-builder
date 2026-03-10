import type { Node, Edge } from "@xyflow/react";

// ── Node type enum ──────────────────────────────────────────────
export enum AgentNodeType {
  Start = "start",
  Agent = "agent",
  Tool = "tool",
  SelectAgent = "selectAgent",
  End = "end",
}

// ── Edge condition types ────────────────────────────────────────
export enum ConditionType {
  LLMCondition = "llm_condition",
  ToolResult = "tool_result",
}

// ── Tool interface (Composio-only) ───────────────────────────────
export interface Tool {
  id: string;
  name: string;
  description: string;
  /** Composio toolkit slug (e.g. "gmail", "github") */
  toolkitSlug: string;
  /** Composio action/tool slug (e.g. "GMAIL_SEND_EMAIL") */
  toolSlug: string;
}

// ── Info Collection interface ───────────────────────────────────
export interface InfoCollectionItem {
  id: string;
  label: string;
  description: string;
}

// ── Knowledge Base interface ────────────────────────────────────
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  fileName?: string; // Stored filename
  filePath?: string; // Path to file in public folder
  uploadDate?: string; // ISO date string
  fileSize?: number; // File size in bytes
}

export type ThinkingLevel = "low" | "medium" | "high" | "auto";

// ── Node data payloads ──────────────────────────────────────────
export interface StartNodeData {
  label: string;
  [key: string]: unknown;
}

export interface AgentNodeData {
  label: string;
  description: string;
  conversationGoal: string;
  thinkingLevel?: ThinkingLevel;
  timezone?: string;
  subItems: number;
  infoCollection?: InfoCollectionItem[];
  tools?: Tool[];
  knowledgeBases?: KnowledgeBase[];
  [key: string]: unknown;
}

export interface ToolNodeData {
  label: string;
  description: string;
  tools?: Tool[];
  [key: string]: unknown;
}

export interface SelectAgentNodeData {
  label: string;
  [key: string]: unknown;
}

export interface EndNodeData {
  label: string;
  endLabel?: string; // Custom label to identify which end the agent went through
  [key: string]: unknown;
}

// ── Union helpers ───────────────────────────────────────────────
export type AnyNodeData =
  | StartNodeData
  | AgentNodeData
  | ToolNodeData
  | SelectAgentNodeData
  | EndNodeData;

export type AppNode = Node<AnyNodeData, string>;

// ── Return transition (for agent→agent edges) ─────────────────────
export interface ReturnTransitionConfig {
  enabled: boolean;
  label: string; // e.g. "Return to reception"
  conditionExpression: string; // When B should transfer back to A
}

// ── Edge data ───────────────────────────────────────────────────
export interface ConditionEdgeData {
  label: string;
  conditionType: ConditionType | null; // null for start edges (no condition)
  isSuccess?: boolean; // For tool result edges: true = success, false = failure
  conditionExpression?: string; // For LLM conditions: the condition logic
  overrideEndCondition?: boolean; // For edges to End nodes: true = show condition expression
  returnTransition?: ReturnTransitionConfig; // For agent→agent edges: return path B → A
  [key: string]: unknown;
}

export type AppEdge = Edge<ConditionEdgeData>;
