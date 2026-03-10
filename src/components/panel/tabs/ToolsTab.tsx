"use client";

import React, { useState } from "react";
import { Wrench, Trash2 } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import type { AgentNodeData, ToolNodeData, Tool } from "@/types";
import AddComposioToolModal from "../modals/AddComposioToolModal";

export default function ToolsTab() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const addToolToNode = useFlowStore((s) => s.addToolToNode);
  const removeToolFromNode = useFlowStore((s) => s.removeToolFromNode);

  const [showAddModal, setShowAddModal] = useState(false);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const data = node.data as unknown as AgentNodeData | ToolNodeData;
  const tools = data.tools || [];

  const handleAddTool = (tool: Tool) => {
    addToolToNode(node.id, tool);
  };

  const handleRemoveTool = (toolId: string) => {
    removeToolFromNode(node.id, toolId);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Add Composio tool button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Add tool from toolkit
      </button>

      {/* Tools list */}
      {tools.length > 0 && (
        <div className="flex flex-col gap-2">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Wrench size={16} className="text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {tool.name}
                </h4>
                <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
                  {tool.description || "No description"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {tool.toolkitSlug} · {tool.toolSlug}
                </p>
              </div>
              <button
                onClick={() => handleRemoveTool(tool.id)}
                className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {tools.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Wrench size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">No tools added yet</p>
          <p className="text-xs text-gray-300">
            Add tools from Composio toolkits (search, select, connect, then choose actions).
          </p>
        </div>
      )}

      {/* Add Composio Tool Modal */}
      {showAddModal && (
        <AddComposioToolModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddTool}
        />
      )}
    </div>
  );
}
