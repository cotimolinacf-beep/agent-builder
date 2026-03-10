"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  BackgroundVariant,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  LayoutGrid,
} from "lucide-react";

import { useFlowStore } from "@/store/flowStore";
import { ConditionType, type AppEdge, AgentNodeType } from "@/types";
import { createEdge, createNode } from "@/lib/defaults";

import StartNode from "./nodes/StartNode";
import AgentNode from "./nodes/AgentNode";
import ToolNode from "./nodes/ToolNode";
import SelectAgentNode from "./nodes/SelectAgentNode";
import EndNode from "./nodes/EndNode";
import ConditionEdge from "./edges/ConditionEdge";
import FloatingValidationButton from "./FloatingValidationButton";

function AgentBuilderCanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addEdge,
    addNode,
    setSelectedNode,
    setSelectedEdge,
  } = useFlowStore();

  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const connectingNodeId = useRef<string | null>(null);

  // Register custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      start: StartNode,
      agent: AgentNode,
      tool: ToolNode,
      selectAgent: SelectAgentNode,
      end: EndNode,
    }),
    []
  );

  // Register custom edge types
  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      conditionEdge: ConditionEdge,
    }),
    []
  );

  // Handle manual connections via drag
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Check source node type to determine condition type
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const conditionType =
        sourceNode?.type === "tool"
          ? ConditionType.ToolResult
          : ConditionType.LLMCondition;

      const edge = createEdge(
        connection.source,
        connection.target,
        "New condition",
        conditionType,
        targetNode?.type,
        sourceNode?.type
      );
      addEdge(edge);
    },
    [nodes, addEdge]
  );

  // Click on pane deselects everything
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  // Handle edge clicks (entire edge line, not just label)
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: AppEdge) => {
      // Don't select start edges (they have no condition)
      if (edge.data?.conditionType === null) return;

      setSelectedEdge(edge.id);
      setSelectedNode(null);
    },
    [setSelectedEdge, setSelectedNode]
  );

  // Track when connection starts
  const onConnectStart = useCallback(
    (_: unknown, { nodeId }: { nodeId: string | null }) => {
      connectingNodeId.current = nodeId;
    },
    []
  );

  // Handle dropping connection on pane (not on a node)
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeId.current) return;

      const targetIsPane = (event.target as Element)?.classList.contains(
        "react-flow__pane"
      );

      if (targetIsPane) {
        // Convert screen coordinates to flow coordinates
        const position = reactFlowInstance.screenToFlowPosition({
          x: (event as MouseEvent).clientX,
          y: (event as MouseEvent).clientY,
        });

        // Create new agent node at drop position
        const newNode = createNode(AgentNodeType.Agent, position);

        // Determine edge condition type based on source node
        const sourceNode = nodes.find((n) => n.id === connectingNodeId.current);
        const conditionType =
          sourceNode?.type === "tool"
            ? ConditionType.ToolResult
            : sourceNode?.type === "start"
              ? null
              : ConditionType.LLMCondition;

        const newEdge = createEdge(
          connectingNodeId.current,
          newNode.id,
          conditionType === ConditionType.ToolResult ? "Success" : "New condition",
          conditionType,
          AgentNodeType.Agent,
          sourceNode?.type
        );

        addNode(newNode);
        addEdge(newEdge);
      }

      connectingNodeId.current = null;
    },
    [nodes, addNode, addEdge, reactFlowInstance]
  );

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "conditionEdge" }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} />

        {/* Top-left toolbar */}
        <Panel position="top-left" className="flex items-center gap-1">
          <button className="ml-2 flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <LayoutGrid size={14} />
            Templates
          </button>
        </Panel>

        <Controls position="bottom-left" />

        <FloatingValidationButton />
      </ReactFlow>
    </div>
  );
}

export default function AgentBuilderCanvas() {
  return <AgentBuilderCanvasInner />;
}
