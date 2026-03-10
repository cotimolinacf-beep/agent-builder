"use client";

import React from "react";
import { useFlowStore } from "@/store/flowStore";
import type { AgentNodeData } from "@/types";

export default function GeneralTab() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const data = node.data as unknown as AgentNodeData;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Conversation goal */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Conversation goal
        </label>
        <textarea
          value={data.conversationGoal ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            updateNodeData(node.id, {
              conversationGoal: value,
              description: value, // Update description when conversation goal changes
            });
          }}
          placeholder="Add a prompt to collect user information. Example: Ask the user about their needs."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[100px] resize-y"
        />
      </div>

      {/* Thinking Level */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Thinking Level</label>
        </div>
        <select
          value={data.thinkingLevel ?? "auto"}
          onChange={(e) => updateNodeData(node.id, { thinkingLevel: e.target.value as any })}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-300 focus:outline-none"
        >
          <option value="auto">Auto </option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Timezone */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Timezone</label>
        </div>
        <select
          value={data.timezone ?? "America/Argentina/Buenos_Aires"}
          onChange={(e) => updateNodeData(node.id, { timezone: e.target.value })}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-300 focus:outline-none"
        >
          <optgroup label="Americas">
            <option value="America/Argentina/Buenos_Aires">Argentina - Buenos Aires</option>
            <option value="America/Sao_Paulo">Brasil - Sao Paulo</option>
            <option value="America/Santiago">Chile - Santiago</option>
            <option value="America/Bogota">Colombia - Bogota</option>
            <option value="America/Mexico_City">Mexico - Ciudad de Mexico</option>
            <option value="America/Lima">Peru - Lima</option>
            <option value="America/Caracas">Venezuela - Caracas</option>
            <option value="America/New_York">US - New York (EST)</option>
            <option value="America/Chicago">US - Chicago (CST)</option>
            <option value="America/Denver">US - Denver (MST)</option>
            <option value="America/Los_Angeles">US - Los Angeles (PST)</option>
            <option value="America/Toronto">Canada - Toronto</option>
          </optgroup>
          <optgroup label="Europe">
            <option value="Europe/London">UK - London</option>
            <option value="Europe/Madrid">Spain - Madrid</option>
            <option value="Europe/Paris">France - Paris</option>
            <option value="Europe/Berlin">Germany - Berlin</option>
            <option value="Europe/Rome">Italy - Rome</option>
            <option value="Europe/Moscow">Russia - Moscow</option>
          </optgroup>
          <optgroup label="Asia / Pacific">
            <option value="Asia/Tokyo">Japan - Tokyo</option>
            <option value="Asia/Shanghai">China - Shanghai</option>
            <option value="Asia/Kolkata">India - Kolkata</option>
            <option value="Asia/Dubai">UAE - Dubai</option>
            <option value="Australia/Sydney">Australia - Sydney</option>
          </optgroup>
          <optgroup label="Other">
            <option value="UTC">UTC</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
}
