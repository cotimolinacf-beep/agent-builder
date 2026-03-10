"use client";

import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Wrench, Plus, Copy, Trash2, AlertCircle } from "lucide-react";
import type { ToolNodeData } from "@/types";
import { useFlowStore } from "@/store/flowStore";
import AddNodeMenu from "../AddNodeMenu";

export default function ToolNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData;
  const { setSelectedNode, deleteNode, duplicateNode } = useFlowStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const tools = nodeData.tools || [];
  
  // Check if node has error (no tools configured)
  const hasError = tools.length === 0;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />

      <div
        className="group relative rounded-xl bg-white shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
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
        
        {/* Header with icon and label */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Wrench size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-800">
            {nodeData.label}
          </span>
        </div>

        {/* Tools list */}
        {tools.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                {tool.name}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons (visible on hover) */}
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
