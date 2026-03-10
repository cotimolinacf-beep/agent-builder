"use client";

import React from "react";
import { ConditionType, AgentNodeType } from "@/types";
import type { ConditionEdgeData } from "@/types";
import { useFlowStore } from "@/store/flowStore";

export default function EdgesTab() {
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const edges = useFlowStore((s) => s.edges);
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);
  const nodes = useFlowStore((s) => s.nodes);

  const edge = edges.find((e) => e.id === selectedEdgeId);
  if (!edge) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-sm text-gray-400">
          Select an edge label to configure conditions.
        </div>
      </div>
    );
  }

  const data = edge.data as ConditionEdgeData;
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const isTool = sourceNode?.type === "tool";
  const isToolResult = data.conditionType === ConditionType.ToolResult;
  const isTargetEndNode = targetNode?.type === AgentNodeType.End;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Condition Type */}
      {isTool && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Condition type
          </label>
          <select
            value={data.conditionType || ConditionType.LLMCondition}
            onChange={(e) =>
              updateEdgeData(edge.id, {
                conditionType: e.target.value as ConditionType,
              })
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value={ConditionType.LLMCondition}>LLM Condition</option>
            <option value={ConditionType.ToolResult}>Tool Result</option>
          </select>
        </div>
      )}

      {/* For Tool Result: Success/Failure switch + label */}
      {isToolResult ? (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Result successful
            </label>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium ${data.isSuccess === false ? "text-gray-900" : "text-gray-400"
                  }`}
              >
                Failure
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.isSuccess ?? true}
                  onChange={(e) => {
                    const isSuccess = e.target.checked;
                    updateEdgeData(edge.id, {
                      isSuccess,
                      label: isSuccess ? "Success" : "Failure",
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span
                className={`text-sm font-medium ${data.isSuccess === true ? "text-gray-900" : "text-gray-400"
                  }`}
              >
                Success
              </span>
            </div>
          </div>

          {/* Label field for tool result */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Label
            </label>
            <input
              type="text"
              value={data.label}
              onChange={(e) =>
                updateEdgeData(edge.id, { label: e.target.value })
              }
              placeholder="e.g. Success, Failure"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
        </>
      ) : (
        <>
          {/* Condition label (only for LLM Condition) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Condition label
            </label>
            <input
              type="text"
              value={data.label}
              onChange={(e) =>
                updateEdgeData(edge.id, { label: e.target.value })
              }
              placeholder="e.g. Ready to check hours"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>

          {/* For edges to End nodes: Override checkbox */}
          {isTargetEndNode && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="override-end-condition"
                checked={!!data.overrideEndCondition}
                onChange={(e) =>
                  updateEdgeData(edge.id, {
                    overrideEndCondition: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="override-end-condition"
                className="text-sm font-medium text-gray-700 select-none"
              >
                Override default end condition
              </label>
            </div>
          )}

          {/* Condition expression - hidden for End nodes unless override is checked */}
          {(!isTargetEndNode || data.overrideEndCondition) && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Condition expression
              </label>
              <textarea
                value={data.conditionExpression || ""}
                onChange={(e) =>
                  updateEdgeData(edge.id, { conditionExpression: e.target.value })
                }
                placeholder="Describe the condition for this transition..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[80px] resize-y"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
