"use client";

import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Bot, Copy, Trash2, Plus, Wrench, Book, Tag, AlertCircle } from "lucide-react";
import type { AgentNodeData } from "@/types";
import { useFlowStore } from "@/store/flowStore";
import AddNodeMenu from "../AddNodeMenu";

export default function AgentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const { setSelectedNode, deleteNode, duplicateNode } = useFlowStore();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Check if node has error (missing conversation goal)
  const hasError = !nodeData.conversationGoal || nodeData.conversationGoal.trim() === "";

  return (
    <div className="relative flex flex-col items-center gap-2">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />

      <div
        className="group relative w-[260px] rounded-2xl bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(id);
        }}
      >
        {/* Error indicator */}
        {hasError && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 shadow-sm">
            <AlertCircle size={14} className="text-white" />
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Bot size={16} className="text-gray-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">
              {nodeData.label}
            </h3>
            <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
              {nodeData.description}
            </p>
          </div>
        </div>

        {/* Footer - Show tool, knowledge base, and info collection counts */}
        <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2">
          {/* Tools count */}
          <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            <Wrench size={12} />
            <span>+{nodeData.tools?.length || 0}</span>
          </div>
          {/* Knowledge base count */}
          <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            <Book size={12} />
            <span>+{nodeData.knowledgeBases?.length || 0}</span>
          </div>
          {/* Info collection count */}
          <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            <Tag size={12} />
            <span>+{nodeData.infoCollection?.length || 0}</span>
          </div>
        </div>

        {/* Action buttons (visible on hover / when selected) */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-gray-600 shadow-sm"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-red-500 shadow-sm"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Plus button */}
      <button
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 border border-gray-300 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
      >
        <Plus size={14} />
      </button>

      {menuOpen && (
        <AddNodeMenu parentId={id} onClose={() => setMenuOpen(false)} />
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />
    </div>
  );
}
