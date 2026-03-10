"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { MessageSquare, Plus } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import { AgentNodeType } from "@/types";

export default function StartNode({ id, selected }: NodeProps) {
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const addChildNode = useFlowStore((s) => s.addChildNode);

  return (
    <div
      className="relative flex flex-col items-center gap-2"
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNode(id);
      }}
    >
      <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
        <MessageSquare size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-800">Start</span>
      </div>

      {/* Plus button - directly creates Agent node */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          addChildNode(id, AgentNodeType.Agent, ""); // Empty label for start edge
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 border border-gray-300 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
      >
        <Plus size={14} />
      </button>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />
    </div>
  );
}
