"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Users } from "lucide-react";
import type { SelectAgentNodeData } from "@/types";
import { useFlowStore } from "@/store/flowStore";

export default function SelectAgentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SelectAgentNodeData;
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);

  return (
    <div className="relative flex flex-col items-center gap-2">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />

      <div
        className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 shadow-sm border border-dashed border-red-300 cursor-pointer hover:shadow-md transition-shadow"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(id);
        }}
      >
        <Users size={16} className="text-red-400" />
        <span className="text-sm font-medium text-red-500">
          {nodeData.label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />
    </div>
  );
}
