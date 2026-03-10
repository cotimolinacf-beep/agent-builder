"use client";

import React from "react";
import type { ConditionEdgeData } from "@/types";
import { useFlowStore } from "@/store/flowStore";

export default function ReturnTransitionTab() {
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const edges = useFlowStore((s) => s.edges);
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);
  const nodes = useFlowStore((s) => s.nodes);

  const edge = edges.find((e) => e.id === selectedEdgeId);
  if (!edge) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-sm text-gray-400">
          Select an edge to configure return transition.
        </div>
      </div>
    );
  }

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const isAgentToAgent =
    sourceNode?.type === "agent" && targetNode?.type === "agent";

  if (!isAgentToAgent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-sm text-gray-500">
          Return transition only applies to agent-to-agent edges.
        </div>
      </div>
    );
  }

  const data = edge.data as ConditionEdgeData;
  const returnConfig = data.returnTransition ?? {
    enabled: false,
    label: "",
    conditionExpression: "",
  };
  const sourceLabel = (sourceNode?.data as { label?: string })?.label ?? "source agent";

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="return-enabled"
          checked={returnConfig.enabled}
          onChange={(e) =>
            updateEdgeData(edge.id, {
              returnTransition: {
                ...returnConfig,
                enabled: e.target.checked,
              },
            })
          }
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="return-enabled" className="text-sm font-medium text-gray-700 select-none">
          Enable return transition
        </label>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Return label
        </label>
        <input
          type="text"
          value={returnConfig.label}
          onChange={(e) =>
            updateEdgeData(edge.id, {
              returnTransition: {
                ...returnConfig,
                label: e.target.value,
              },
            })
          }
          placeholder={`e.g. Return to ${sourceLabel}`}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Condition expression
        </label>
        <textarea
          value={returnConfig.conditionExpression}
          onChange={(e) =>
            updateEdgeData(edge.id, {
              returnTransition: {
                ...returnConfig,
                conditionExpression: e.target.value,
              },
            })
          }
          placeholder={`Describe when to transfer back to ${sourceLabel}...`}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[80px] resize-y"
        />
      </div>
    </div>
  );
}
