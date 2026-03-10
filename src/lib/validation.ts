import type { AppNode, AppEdge, ConditionType } from "@/types";
import { AgentNodeType } from "@/types";

export interface ValidationError {
  id: string;
  type: "node" | "edge";
  message: string;
}

export function validateFlow(
  nodes: AppNode[],
  edges: AppEdge[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check agents without conversation goals
  nodes.forEach((node) => {
    if (node.type === "agent") {
      const data = node.data as any;
      if (!data.conversationGoal || data.conversationGoal.trim() === "") {
        errors.push({
          id: node.id,
          type: "node",
          message: `Agent "${data.label}" is missing a conversation goal`,
        });
      }
    }
  });

  // Check tool dispatch nodes without tools
  nodes.forEach((node) => {
    if (node.type === "tool") {
      const data = node.data as any;
      if (!data.tools || data.tools.length === 0) {
        errors.push({
          id: node.id,
          type: "node",
          message: `Tool dispatch "${data.label}" has no tools configured`,
        });
      }
    }
  });

  // Check LLM condition edges without expressions
  edges.forEach((edge) => {
    const data = edge.data as any;
    // Only check LLM conditions (not tool results or start edges)
    if (
      data.conditionType === "llm_condition" &&
      (!data.conditionExpression || data.conditionExpression.trim() === "")
    ) {
      errors.push({
        id: edge.id,
        type: "edge",
        message: `LLM condition "${data.label}" is missing a condition expression`,
      });
    }
  });

  // Check all leaf nodes (nodes with no outgoing edges) must be "end" type
  nodes.forEach((node) => {
    const hasOutgoingEdges = edges.some((edge) => edge.source === node.id);
    if (!hasOutgoingEdges && node.type !== "end" && node.type !== "start") {
      const data = node.data as any;
      errors.push({
        id: node.id,
        type: "node",
        message: `Node "${data.label}" must connect to an end node`,
      });
    }
  });

  return errors;
}

export function isFlowValid(nodes: AppNode[], edges: AppEdge[]): boolean {
  return validateFlow(nodes, edges).length === 0;
}
