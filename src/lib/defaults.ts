import { AgentNodeType, ConditionType } from "@/types";
import type {
  AppNode,
  AppEdge,
  AgentNodeData,
  ToolNodeData,
  StartNodeData,
  SelectAgentNodeData,
  EndNodeData,
  ConditionEdgeData,
} from "@/types";

// ── ID generators ───────────────────────────────────────────────
let nodeCounter = 1;
let edgeCounter = 1;

export function generateNodeId(): string {
  return `node-${Date.now()}-${nodeCounter++}`;
}

export function generateEdgeId(): string {
  return `edge-${Date.now()}-${edgeCounter++}`;
}

// ── Default data factories ──────────────────────────────────────
export function createDefaultAgentData(
  label = "New Agent"
): AgentNodeData {
  return {
    label,
    description: "Add a prompt to collect user information.",
    conversationGoal: "",
    thinkingLevel: "auto",
    subItems: 0,
  };
}

export function createDefaultToolData(label = "Tool dispatch"): ToolNodeData {
  return {
    label,
    description: "",
  };
}

export function createDefaultSelectAgentData(
  label = "Select agent"
): SelectAgentNodeData {
  return { label };
}

export function createDefaultEndData(): EndNodeData {
  return {
    label: "End",
    endLabel: "",
  };
}

export function createDefaultStartData(): StartNodeData {
  return { label: "Start" };
}

// ── Factory: create a node with position ────────────────────────
export function createNode(
  type: AgentNodeType,
  position: { x: number; y: number },
  data?: Partial<Record<string, unknown>>
): AppNode {
  const id = generateNodeId();

  const dataMap: Record<AgentNodeType, () => Record<string, unknown>> = {
    [AgentNodeType.Start]: createDefaultStartData,
    [AgentNodeType.Agent]: createDefaultAgentData,
    [AgentNodeType.Tool]: createDefaultToolData,
    [AgentNodeType.SelectAgent]: createDefaultSelectAgentData,
    [AgentNodeType.End]: createDefaultEndData,
  };

  return {
    id,
    type,
    position,
    data: { ...dataMap[type](), ...data } as AppNode["data"],
  };
}

// ── Factory: create an edge ─────────────────────────────────────
export function createEdge(
  source: string,
  target: string,
  label = "New condition",
  conditionType: ConditionType | null = ConditionType.LLMCondition,
  targetNodeType?: string,
  sourceNodeType?: string
): AppEdge {
  const edgeData: ConditionEdgeData = {
    label,
    conditionType,
  };

  // Initialize isSuccess and label for tool result edges
  if (conditionType === ConditionType.ToolResult) {
    edgeData.isSuccess = true;
    edgeData.label = "Success"; // Default label matches switch state
  }

  // For edges to End nodes: set default condition, label, and mark override as false
  if (targetNodeType === AgentNodeType.End) {
    edgeData.label = "End Condition";
    edgeData.conditionExpression = "End Condition";
    edgeData.overrideEndCondition = false;
  }

  // For agent→agent edges: optional default return transition config
  if (
    sourceNodeType === AgentNodeType.Agent &&
    targetNodeType === AgentNodeType.Agent
  ) {
    edgeData.returnTransition = {
      enabled: true,
      label: "",
      conditionExpression:
        "When the user wants something different or changes their goal (e.g. not what they originally asked for).",
    };
  }

  return {
    id: generateEdgeId(),
    source,
    target,
    type: "conditionEdge",
    data: edgeData,
  };
}

// ── Initial canvas: just a Start node ───────────────────────────
export function createInitialNodes(): AppNode[] {
  return [
    {
      id: "start-node",
      type: AgentNodeType.Start,
      position: { x: 400, y: 50 },
      data: createDefaultStartData(),
    },
  ];
}

export function createInitialEdges(): AppEdge[] {
  return [];
}
