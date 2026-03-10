"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Scissors, Copy, Trash2 } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";

export default function EndNode({ id, selected }: NodeProps) {
  const { setSelectedNode, deleteNode, duplicateNode } = useFlowStore();

  return (
    <div className="relative flex flex-col items-center gap-2">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />

      <div
        className="group relative flex items-center gap-2 rounded-xl bg-white px-5 py-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(id);
        }}
      >
        <Scissors size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-800">End</span>

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
    </div>
  );
}
