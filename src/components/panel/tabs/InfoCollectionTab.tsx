"use client";

import React, { useState } from "react";
import { Tag, Trash2 } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import type { AgentNodeData, InfoCollectionItem } from "@/types";
import AddInfoCollectionModal from "../modals/AddInfoCollectionModal";

export default function InfoCollectionTab() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const addInfoCollectionToNode = useFlowStore((s) => s.addInfoCollectionToNode);
  const removeInfoCollectionFromNode = useFlowStore((s) => s.removeInfoCollectionFromNode);

  const [showAddModal, setShowAddModal] = useState(false);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const data = node.data as unknown as AgentNodeData;
  const infoItems = data.infoCollection || [];

  const handleAddInfo = (label: string, description: string) => {
    const newItem: InfoCollectionItem = {
      id: `info-${Date.now()}`,
      label,
      description,
    };
    addInfoCollectionToNode(node.id, newItem);
  };

  const handleRemoveInfo = (itemId: string) => {
    removeInfoCollectionFromNode(node.id, itemId);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Add info collection button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Add info collection
      </button>

      {/* Info items list */}
      {infoItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {infoItems.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Tag size={16} className="text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {item.label}
                </h4>
                <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
                  {item.description || "No description"}
                </p>
              </div>
              <button
                onClick={() => handleRemoveInfo(item.id)}
                className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {infoItems.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Tag size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">No info collection items added yet</p>
          <p className="text-xs text-gray-300">
            Click "Add info collection" to define what to collect
          </p>
        </div>
      )}

      {/* Add Info Modal */}
      {showAddModal && (
        <AddInfoCollectionModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddInfo}
        />
      )}
    </div>
  );
}
