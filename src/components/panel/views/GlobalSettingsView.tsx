"use client";

import React, { useState } from "react";
import { Settings, Info } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";

export default function GlobalSettingsView() {
  const [preventInfiniteLoops, setPreventInfiniteLoops] = useState(false);
  const baseSystemPrompt = useFlowStore((s) => s.baseSystemPrompt);
  const updateBaseSystemPrompt = useFlowStore((s) => s.updateBaseSystemPrompt);

  return (
    <div className="flex h-full w-[480px] shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Settings size={18} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">Global settings</h2>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Base system prompt */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Base system prompt
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Applied to all agents. Each agent&apos;s conversation goal is appended to this.
          </p>
          <textarea
            value={baseSystemPrompt ?? ""}
            onChange={(e) => updateBaseSystemPrompt(e.target.value)}
            placeholder="Do not end the conversation unless the user asks you to do so or you have collected all the information you need."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[120px] resize-y"
          />
        </div>

        {/* Info message */}
        <div className="flex gap-3 rounded-lg bg-gray-50 border border-gray-200 p-4">
          <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">
            To disable a workflow, disconnect the start node.
          </p>
        </div>

        {/* Prevent infinite loops */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Prevent infinite loops
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preventInfiniteLoops}
                onChange={(e) => setPreventInfiniteLoops(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Prevents the workflow from continuously transiting in a loop when
            all conditions are true.
          </p>
        </div>
      </div>
    </div>
  );
}
