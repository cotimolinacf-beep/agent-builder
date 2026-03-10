"use client";

import React from "react";
import { MessageSquare, Info } from "lucide-react";

export default function StartNodeView() {
  return (
    <div className="flex h-full w-[480px] shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <MessageSquare size={18} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">Start</h2>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex gap-3 rounded-lg bg-gray-50 border border-gray-200 p-4">
          <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">
            This node determines the entry point of the workflow.
          </p>
        </div>
      </div>
    </div>
  );
}
