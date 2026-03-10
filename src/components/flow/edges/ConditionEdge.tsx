"use client";

import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { Sparkles, Zap, AlertCircle } from "lucide-react";
import { ConditionType } from "@/types";
import type { ConditionEdgeData } from "@/types";
import { useFlowStore } from "@/store/flowStore";

export default function ConditionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as unknown as ConditionEdgeData | undefined;
  const setSelectedEdge = useFlowStore((s) => s.setSelectedEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const isStartEdge = edgeData?.conditionType === null;
  const isLLM = edgeData?.conditionType === ConditionType.LLMCondition;
  const isToolResult = edgeData?.conditionType === ConditionType.ToolResult;
  
  // Check if LLM condition has error (missing expression)
  const hasError = isLLM && (!edgeData?.conditionExpression || edgeData.conditionExpression.trim() === "");
  
  // Start edges have no label or interactivity
  if (isStartEdge) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: "#d1d5db",
          strokeWidth: 1.5,
        }}
      />
    );
  }
  
  // Display label from data
  const displayLabel = edgeData?.label || "New condition";

  // Determine label colors based on type and state
  let labelClasses = "";
  if (selected) {
    labelClasses = "bg-blue-50 border-blue-300 text-blue-700";
  } else if (isToolResult) {
    // Soft green for success, soft red for failure
    labelClasses = edgeData?.isSuccess
      ? "bg-green-50 border-green-300 text-green-700"
      : "bg-red-50 border-red-300 text-red-700";
  } else {
    // Black text for regular LLM conditions
    labelClasses = "bg-gray-50 border-gray-300 text-gray-900";
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#3b82f6" : "#d1d5db",
          strokeWidth: 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEdge(id);
          }}
          className={`absolute flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm border cursor-pointer hover:shadow-md nodrag nopan ${labelClasses}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {isLLM ? (
            <Sparkles size={12} />
          ) : isToolResult ? (
            <Zap size={12} />
          ) : null}
          {displayLabel}
          {hasError && (
            <AlertCircle size={14} className="text-red-500" />
          )}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
