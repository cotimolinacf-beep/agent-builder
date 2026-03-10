"use client";

import React, { useState, useRef, useEffect } from "react";
import { Book, Trash2, Search, FileText, Upload, Loader2 } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import type { AgentNodeData, KnowledgeBase } from "@/types";

export default function KnowledgeBaseTab() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const addKnowledgeBaseToNode = useFlowStore((s) => s.addKnowledgeBaseToNode);
  const removeKnowledgeBaseFromNode = useFlowStore((s) => s.removeKnowledgeBaseFromNode);

  const [showKBList, setShowKBList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableKBs, setAvailableKBs] = useState<KnowledgeBase[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available knowledge bases from API
  const fetchKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/knowledge-base/files");
      if (response.ok) {
        const data = await response.json();
        setAvailableKBs(data);
      }
    } catch (error) {
      console.error("Error fetching knowledge bases:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    if (showKBList) {
      fetchKnowledgeBases();
    }
  }, [showKBList]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setShowKBList(false);
        setSearchTerm("");
      }
    }
    if (showKBList) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showKBList]);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const data = node.data as unknown as AgentNodeData;
  const addedKBs = data.knowledgeBases || [];
  const addedKBIds = new Set(addedKBs.map(kb => kb.id));

  // Filter based on search and exclude already added KBs
  const filteredKBs = availableKBs.filter(
    (kb) =>
      !addedKBIds.has(kb.id) &&
      kb.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddKB = (kb: KnowledgeBase) => {
    addKnowledgeBaseToNode(node.id, kb);
    setSearchTerm(""); // Clear search after adding
  };

  const handleRemoveKB = (kbId: string) => {
    removeKnowledgeBaseFromNode(node.id, kbId);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const uploadedKB = await response.json();
        // Refresh the list
        await fetchKnowledgeBases();
        // Optionally auto-add the uploaded file
        // addKnowledgeBaseToNode(node.id, uploadedKB);
      } else {
        console.error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Add knowledge base button */}
      <div className="relative">
        <button
          onClick={() => setShowKBList(!showKBList)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Add knowledge base
        </button>

        {/* Floating knowledge base list dropdown */}
        {showKBList && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-50 mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white shadow-lg p-3"
          >
            {/* File upload button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.txt,.md,.doc,.docx"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload new file
                  </>
                )}
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents..."
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                autoFocus
              />
            </div>

            {/* Available knowledge bases list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Loading...
                </div>
              ) : filteredKBs.length > 0 ? (
                filteredKBs.map((kb) => (
                  <button
                    key={kb.id}
                    onClick={() => handleAddKB(kb)}
                    className="w-full flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-200 p-2 text-left hover:bg-gray-100 transition-colors"
                  >
                    <FileText size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {kb.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {kb.description} {kb.fileSize && `• ${formatFileSize(kb.fileSize)}`}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-gray-400">
                  {searchTerm ? "No knowledge bases found" : "No files uploaded yet"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Added knowledge bases */}
      {addedKBs.length > 0 && (
        <div className="flex flex-col gap-2">
          {addedKBs.map((kb) => (
            <div
              key={kb.id}
              className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Book size={16} className="text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {kb.name}
                </h4>
                <p className="mt-0.5 text-xs text-gray-400 truncate">
                  {kb.description}
                </p>
              </div>
              <button
                onClick={() => handleRemoveKB(kb.id)}
                className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {addedKBs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Book size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">No knowledge bases added yet</p>
          <p className="text-xs text-gray-300">
            Click "Add knowledge base" to link documents
          </p>
        </div>
      )}
    </div>
  );
}
