"use client";

import React from "react";
import { Scissors } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import type { EndNodeData } from "@/types";

export default function EndNodeView() {
    const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
    const nodes = useFlowStore((s) => s.nodes);
    const updateNodeData = useFlowStore((s) => s.updateNodeData);

    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;

    const data = node.data as unknown as EndNodeData;

    return (
        <div className="flex h-full w-[480px] shrink-0 flex-col border-l border-gray-200 bg-white">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                <Scissors size={18} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">End</h2>
            </div>

            {/* Content */}
            <div className="p-4">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        End Label
                    </label>
                    <input
                        type="text"
                        value={data.endLabel ?? ""}
                        onChange={(e) => updateNodeData(node.id, { endLabel: e.target.value })}
                        placeholder="Enter a label to identify this end..."
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        This label helps identify which end the agent went through.
                    </p>
                </div>
            </div>
        </div>
    );
}
