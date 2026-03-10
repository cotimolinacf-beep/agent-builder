"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, FileText, Trash2 } from "lucide-react";

interface Flow {
  id: string;
  name: string;
  updatedAt: string;
  nodeCount: number;
}

export default function Home() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlows = async () => {
    try {
      const response = await fetch("/api/flows/list");
      if (response.ok) {
        const data = await response.json();
        setFlows(data);
      }
    } catch (error) {
      console.error("Error fetching flows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleCreateNew = () => {
    // Generate new flow ID
    const newId = `flow-${Date.now()}`;
    router.push(`/agent/${newId}`);
  };

  const handleDeleteFlow = async (flowId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const response = await fetch(`/api/flows/${flowId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // Refresh list
        fetchFlows();
      }
    } catch (error) {
      console.error("Error deleting flow:", error);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Agent Builder
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage your AI agents
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              <Plus size={18} />
              New Agent
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading agents...</div>
          </div>
        ) : flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No agents yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Get started by creating your first agent
            </p>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              <Plus size={18} />
              New Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flows.map((flow) => (
              <div
                key={flow.id}
                onClick={() => router.push(`/agent/${flow.id}`)}
                className="group relative rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 truncate pr-8">
                    {flow.name}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteFlow(flow.id, e)}
                    className="opacity-0 group-hover:opacity-100 absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <FileText size={14} />
                    <span>{flow.nodeCount} nodes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{formatDate(flow.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
