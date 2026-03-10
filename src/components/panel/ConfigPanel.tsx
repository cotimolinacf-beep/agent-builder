"use client";

import React, { useState, useEffect } from "react";
import { Bot, Wrench, Users, Scissors, MessageSquare, X, GitBranch } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import type { AnyNodeData } from "@/types";
import GeneralTab from "./tabs/GeneralTab";
import KnowledgeBaseTab from "./tabs/KnowledgeBaseTab";
import ToolsTab from "./tabs/ToolsTab";
import InfoCollectionTab from "./tabs/InfoCollectionTab";
import EdgesTab from "./tabs/EdgesTab";
import ReturnTransitionTab from "./tabs/ReturnTransitionTab";
import StartNodeView from "./views/StartNodeView";
import GlobalSettingsView from "./views/GlobalSettingsView";
import EndNodeView from "./views/EndNodeView";

const agentTabs = ["General", "Knowledge Base", "Tools", "Info collection"];
const toolDispatchTabs = ["Tools"];
const edgeTabs = ["Forward", "Return"];

const nodeIcons: Record<string, React.ReactNode> = {
  start: <MessageSquare size={18} className="text-gray-500" />,
  agent: <Bot size={18} className="text-gray-600" />,
  tool: <Wrench size={18} className="text-gray-500" />,
  selectAgent: <Users size={18} className="text-red-400" />,
  end: <Scissors size={18} className="text-gray-500" />,
};

export default function ConfigPanel() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const setSelectedEdge = useFlowStore((s) => s.setSelectedEdge);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const [activeTab, setActiveTab] = useState("General");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const isNodeSelected = selectedNodeId !== null;
  const isEdgeSelected = selectedEdgeId !== null;

  // Auto-switch to Forward tab when edge is selected
  useEffect(() => {
    if (isEdgeSelected) {
      setActiveTab("Forward");
    }
  }, [isEdgeSelected]);

  // Reset editing state when selection changes
  useEffect(() => {
    setIsEditingName(false);
  }, [selectedNodeId, selectedEdgeId]);

  // Show Global Settings when nothing is selected
  if (!isNodeSelected && !isEdgeSelected) {
    return <GlobalSettingsView />;
  }

  const node = isNodeSelected
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const edge = isEdgeSelected
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  if (!node && !edge) {
    return <GlobalSettingsView />;
  }

  // Show Start Node View for start node
  if (node?.type === "start") {
    return <StartNodeView />;
  }

  // Show End Node View for end node
  if (node?.type === "end") {
    return <EndNodeView />;
  }

  // Determine tabs based on selection type
  const tabs = isEdgeSelected
    ? edgeTabs
    : node?.type === "tool"
      ? toolDispatchTabs
      : agentTabs;

  const currentTab = isEdgeSelected
    ? (edgeTabs.includes(activeTab) ? activeTab : "Forward")
    : tabs.includes(activeTab)
      ? activeTab
      : tabs[0]; // Default to first available tab

  const title = node
    ? (node.data as unknown as AnyNodeData).label
    : `Edge: ${edge?.data?.label || "Condition"}`;
  const icon = node
    ? nodeIcons[node.type || "agent"]
    : <GitBranch size={18} className="text-gray-500" />;

  const handleClose = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  function renderTabContent() {
    switch (currentTab) {
      case "General":
        return <GeneralTab />;
      case "Knowledge Base":
        return <KnowledgeBaseTab />;
      case "Tools":
        return <ToolsTab />;
      case "Info collection":
        return <InfoCollectionTab />;
      case "Forward":
        return <EdgesTab />;
      case "Return":
        return <ReturnTransitionTab />;
      default:
        return null;
    }
  }

  // Handle name editing
  const handleNameClick = () => {
    if (node && (node.type === "agent" || node.type === "tool")) {
      setIsEditingName(true);
      setEditedName((node.data as AnyNodeData).label);
    }
  };

  const handleNameBlur = () => {
    if (node && editedName.trim()) {
      updateNodeData(node.id, { label: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameBlur();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  return (
    <div className="flex h-full w-[480px] shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon}
          {isEditingName && node ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="text-sm font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-1 flex-1 min-w-0"
              autoFocus
            />
          ) : (
            <h2
              className={`text-sm font-semibold text-gray-900 ${node && (node.type === "agent" || node.type === "tool")
                ? "cursor-pointer hover:text-blue-600"
                : ""
                }`}
              onClick={handleNameClick}
            >
              {title}
            </h2>
          )}
        </div>
        <button
          onClick={handleClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2.5 text-xs font-medium transition-colors ${currentTab === tab
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-400 hover:text-gray-600"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">{renderTabContent()}</div>
    </div>
  );
}
