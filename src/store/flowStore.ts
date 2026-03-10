import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type { AppNode, AppEdge, ConditionEdgeData, Tool, InfoCollectionItem, KnowledgeBase } from "@/types";
import { AgentNodeType, ConditionType } from "@/types";
import {
  createInitialNodes,
  createInitialEdges,
  createNode,
  createEdge,
  generateNodeId,
} from "@/lib/defaults";

// Debounce timeout for auto-save
let saveTimeout: NodeJS.Timeout | null = null;

// ── Store types ─────────────────────────────────────────────────
interface FlowState {
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  currentFlowId: string | null;
  currentFlowName: string;
  baseSystemPrompt: string;

  // React Flow change handlers
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;

  // Selection
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;

  // Node CRUD
  addNode: (node: AppNode) => void;
  addChildNode: (
    parentId: string,
    childType: AgentNodeType,
    edgeLabel?: string
  ) => void;
  updateNodeData: (
    nodeId: string,
    data: Partial<Record<string, unknown>>
  ) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

  // Edge CRUD
  addEdge: (edge: AppEdge) => void;
  updateEdgeData: (
    edgeId: string,
    data: Partial<ConditionEdgeData>
  ) => void;
  deleteEdge: (edgeId: string) => void;

  // Tool management
  addToolToNode: (nodeId: string, tool: Tool) => void;
  removeToolFromNode: (nodeId: string, toolId: string) => void;
  updateToolInNode: (nodeId: string, toolId: string, updates: Partial<Tool>) => void;

  // Info Collection management
  addInfoCollectionToNode: (nodeId: string, item: InfoCollectionItem) => void;
  removeInfoCollectionFromNode: (nodeId: string, itemId: string) => void;
  updateInfoCollectionInNode: (nodeId: string, itemId: string, updates: Partial<InfoCollectionItem>) => void;

  // Knowledge Base management
  addKnowledgeBaseToNode: (nodeId: string, kb: KnowledgeBase) => void;
  removeKnowledgeBaseFromNode: (nodeId: string, kbId: string) => void;

  // Flow management
  isFlowLoaded: boolean;
  setCurrentFlowId: (id: string) => void;
  updateFlowName: (name: string) => void;
  updateBaseSystemPrompt: (prompt: string) => void;
  loadFlow: (id: string) => Promise<void>;
  setFlowData: (data: { nodes: AppNode[]; edges: AppEdge[]; name: string; baseSystemPrompt: string }) => void;
  saveFlow: () => void;
}

const DEFAULT_BASE_SYSTEM_PROMPT =
  "Do not end the conversation unless the user asks you to do so or you have collected all the information you need.";

// ── Helper: compute position below parent (centered) ─────────────
function getChildPosition(
  parentNode: AppNode,
  siblingCount: number,
  childType?: AgentNodeType
): { x: number; y: number } {
  // Estimate node widths for centering
  const getNodeWidth = (type: string | undefined) => {
    switch (type) {
      case AgentNodeType.Agent: return 260;
      case AgentNodeType.Start: return 100;
      case AgentNodeType.Tool: return 150;
      case AgentNodeType.End: return 100;
      case AgentNodeType.SelectAgent: return 150;
      default: return 150;
    }
  };

  const parentWidth = getNodeWidth(parentNode.type);
  const childWidth = getNodeWidth(childType);

  // Center child relative to parent
  const centerOffset = (parentWidth - childWidth) / 2;

  // For multiple siblings, offset horizontally
  const siblingOffset = siblingCount * 250;

  return {
    x: parentNode.position.x + centerOffset + siblingOffset,
    y: parentNode.position.y + 180,
  };
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: createInitialNodes(),
  edges: createInitialEdges(),
  selectedNodeId: null,
  selectedEdgeId: null,
  currentFlowId: null,
  currentFlowName: "New Agent",
  baseSystemPrompt: DEFAULT_BASE_SYSTEM_PROMPT,
  isFlowLoaded: false,

  // ── React Flow handlers ─────────────────────────────────────
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
    get().saveFlow();
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().saveFlow();
  },

  // ── Selection ───────────────────────────────────────────────
  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  // ── Add node directly (e.g., from edge drop) ────────────────
  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      selectedNodeId: node.id,
      selectedEdgeId: null,
    });
    get().saveFlow();
  },

  // ── Add child node from "+" button ──────────────────────────
  addChildNode: (parentId, childType, edgeLabel) => {
    const { nodes, edges } = get();
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return;

    // Count existing children to offset new node
    const existingChildren = edges.filter((e) => e.source === parentId).length;
    const position = getChildPosition(parent, existingChildren, childType);

    const newNode = createNode(childType, position);

    // Determine condition type based on parent type
    const parentType = parent.type as AgentNodeType;
    let conditionType: ConditionType | null;

    if (parentType === AgentNodeType.Start) {
      // Start edges have no condition
      conditionType = null;
    } else if (parentType === AgentNodeType.Tool) {
      conditionType = ConditionType.ToolResult;
    } else {
      conditionType = ConditionType.LLMCondition;
    }

    const label = edgeLabel || "New condition";
    const newEdge = createEdge(parentId, newNode.id, label, conditionType, childType, parentType);

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
      selectedNodeId: newNode.id,
      selectedEdgeId: null,
    });
    get().saveFlow();
  },

  // ── Update node data ────────────────────────────────────────
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
    get().saveFlow();
  },

  // ── Delete node & connected edges ───────────────────────────
  deleteNode: (nodeId) => {
    if (nodeId === "start-node") return; // can't delete start
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId:
        get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
    get().saveFlow();
  },

  // ── Duplicate node ──────────────────────────────────────────
  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const newId = generateNodeId();
    const clone: AppNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: { ...node.data },
    };
    set({ nodes: [...get().nodes, clone], selectedNodeId: newId });
    get().saveFlow();
  },

  // ── Edge CRUD ───────────────────────────────────────────────
  addEdge: (edge) => {
    set({ edges: [...get().edges, edge] });
    get().saveFlow();
  },

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, ...data } as ConditionEdgeData }
          : e
      ),
    });
    get().saveFlow();
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      selectedEdgeId:
        get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
    get().saveFlow();
  },

  // ── Tool management ─────────────────────────────────────────
  addToolToNode: (nodeId, tool) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentTools = (n.data as any).tools || [];
          return {
            ...n,
            data: {
              ...n.data,
              tools: [...currentTools, tool],
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  removeToolFromNode: (nodeId, toolId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentTools = (n.data as any).tools || [];
          return {
            ...n,
            data: {
              ...n.data,
              tools: currentTools.filter((t: Tool) => t.id !== toolId),
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  updateToolInNode: (nodeId, toolId, updates) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentTools = (n.data as any).tools || [];
          return {
            ...n,
            data: {
              ...n.data,
              tools: currentTools.map((t: Tool) =>
                t.id === toolId ? { ...t, ...updates } : t
              ),
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  // ── Info Collection management ──────────────────────────────
  addInfoCollectionToNode: (nodeId, item) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentItems = (n.data as any).infoCollection || [];
          return {
            ...n,
            data: {
              ...n.data,
              infoCollection: [...currentItems, item],
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  removeInfoCollectionFromNode: (nodeId, itemId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentItems = (n.data as any).infoCollection || [];
          return {
            ...n,
            data: {
              ...n.data,
              infoCollection: currentItems.filter((item: InfoCollectionItem) => item.id !== itemId),
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  updateInfoCollectionInNode: (nodeId, itemId, updates) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentItems = (n.data as any).infoCollection || [];
          return {
            ...n,
            data: {
              ...n.data,
              infoCollection: currentItems.map((item: InfoCollectionItem) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  // ── Knowledge Base management ───────────────────────────────
  addKnowledgeBaseToNode: (nodeId, kb) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentKBs = (n.data as any).knowledgeBases || [];
          return {
            ...n,
            data: {
              ...n.data,
              knowledgeBases: [...currentKBs, kb],
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  removeKnowledgeBaseFromNode: (nodeId, kbId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentKBs = (n.data as any).knowledgeBases || [];
          return {
            ...n,
            data: {
              ...n.data,
              knowledgeBases: currentKBs.filter((kb: KnowledgeBase) => kb.id !== kbId),
            },
          };
        }
        return n;
      }),
    });
    get().saveFlow();
  },

  // ── Flow management ────────────────────────────────────────
  setCurrentFlowId: (id) => set({ currentFlowId: id }),

  updateFlowName: (name) => {
    set({ currentFlowName: name });
    get().saveFlow();
  },

  updateBaseSystemPrompt: (prompt) => {
    set({ baseSystemPrompt: prompt });
    get().saveFlow();
  },

  setFlowData: (data) => {
    set({
      nodes: data.nodes,
      edges: data.edges,
      currentFlowName: data.name,
      baseSystemPrompt: data.baseSystemPrompt,
    });
    get().saveFlow();
  },

  loadFlow: async (id) => {
    set({ isFlowLoaded: false }); // Reset loaded flag
    try {
      const response = await fetch(`/api/flows/${id}`);
      if (response.ok) {
        const flowData = await response.json();
        set({
          nodes: flowData.nodes || createInitialNodes(),
          edges: flowData.edges || createInitialEdges(),
          currentFlowName: flowData.name || "New Agent",
          baseSystemPrompt: flowData.baseSystemPrompt ?? DEFAULT_BASE_SYSTEM_PROMPT,
          isFlowLoaded: true, // Mark as loaded
        });
      } else {
        // Flow doesn't exist yet, use defaults
        set({
          nodes: createInitialNodes(),
          edges: createInitialEdges(),
          currentFlowName: "New Agent",
          baseSystemPrompt: DEFAULT_BASE_SYSTEM_PROMPT,
          isFlowLoaded: true, // Mark as loaded (new flow)
        });
      }
    } catch (error) {
      console.error("Error loading flow:", error);
      // Even on error, we might want to allow editing? Or keep locked?
      // Better to allow editing default state if load fails
      set({ isFlowLoaded: true });
    }
  },

  saveFlow: () => {
    const { currentFlowId, currentFlowName, nodes, edges, baseSystemPrompt, isFlowLoaded } = get();
    if (!currentFlowId || !isFlowLoaded) return; // Prevent saving if not loaded 

    // Debounce save to avoid too many API calls
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await fetch("/api/flows/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentFlowId,
            name: currentFlowName,
            nodes,
            edges,
            baseSystemPrompt,
          }),
        });
      } catch (error) {
        console.error("Error saving flow:", error);
      }
    }, 1000); // Wait 1 second before saving
  },
}));
