"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Link2, Check, Loader2 } from "lucide-react";
import type { Tool } from "@/types";

interface ToolkitItem {
  name: string;
  slug: string;
  meta?: { logo?: string; description?: string };
}

interface ComposioToolItem {
  name: string;
  slug: string;
  description?: string;
  toolkit?: { name?: string; slug?: string };
}

interface AddComposioToolModalProps {
  onClose: () => void;
  onSave: (tool: Tool) => void;
}

export default function AddComposioToolModal({
  onClose,
  onSave,
}: AddComposioToolModalProps) {
  const [step, setStep] = useState<"toolkits" | "toolkit-detail" | "tools">("toolkits");
  const [toolkits, setToolkits] = useState<ToolkitItem[]>([]);
  const [tools, setTools] = useState<ComposioToolItem[]>([]);
  const [selectedToolkit, setSelectedToolkit] = useState<ToolkitItem | null>(null);
  const [selectedToolSlugs, setSelectedToolSlugs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [toolSearch, setToolSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchToolkits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/composio/list-toolkits");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load toolkits");
      }
      const data = await res.json();
      setToolkits(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load toolkits");
      setToolkits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkConnection = useCallback(async (slug: string) => {
    setConnectionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/composio/check-connection?toolkitSlug=${encodeURIComponent(slug)}`
      );
      if (!res.ok) throw new Error("Failed to check connection");
      const data = await res.json();
      setIsConnected(Boolean(data.isConnected));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check connection");
      setIsConnected(false);
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  const fetchTools = useCallback(async (toolkitSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/composio/list-tools?toolkitSlug=${encodeURIComponent(toolkitSlug)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load tools");
      }
      const data = await res.json();
      setTools(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tools");
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthorize = useCallback(async () => {
    if (!selectedToolkit) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/composio/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkitSlug: selectedToolkit.slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get connect link");
      }
      const data = await res.json();
      const url = data.redirectUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        // Poll connection status after a short delay
        setTimeout(() => checkConnection(selectedToolkit.slug), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open connect link");
    } finally {
      setConnecting(false);
    }
  }, [selectedToolkit, checkConnection]);

  useEffect(() => {
    fetchToolkits();
  }, [fetchToolkits]);

  // Run connection check only when we open the toolkit-detail view
  useEffect(() => {
    if (step === "toolkit-detail" && selectedToolkit) {
      setIsConnected(null);
      checkConnection(selectedToolkit.slug);
    }
  }, [step, selectedToolkit?.slug, checkConnection]);

  const filteredToolkits = toolkits.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      (t.slug && t.slug.toLowerCase().includes(toolSearch.toLowerCase()))
  );

  const toggleTool = (slug: string) => {
    setSelectedToolSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleAddSelected = () => {
    if (!selectedToolkit) return;
    const toAdd = tools.filter((t) => t.slug && selectedToolSlugs.has(t.slug));
    if (toAdd.length === 0) return;
    toAdd.forEach((t, i) => {
      const tool: Tool = {
        id: `tool-${Date.now()}-${i}-${t.slug}`,
        name: t.name || t.slug,
        description: t.description ?? "",
        toolkitSlug: selectedToolkit.slug,
        toolSlug: t.slug!,
      };
      onSave(tool);
    });
    onClose();
  };

  const openToolkitDetail = (toolkit: ToolkitItem) => {
    setSelectedToolkit(toolkit);
    setError(null);
    setStep("toolkit-detail");
  };

  const openToolsStep = () => {
    if (selectedToolkit) {
      setSelectedToolSlugs(new Set());
      setToolSearch("");
      fetchTools(selectedToolkit.slug);
      setStep("tools");
    }
  };

  const backToToolkits = () => {
    setStep("toolkits");
    setSelectedToolkit(null);
    setIsConnected(null);
    setSelectedToolSlugs(new Set());
    setTools([]);
  };

  const backToToolkitDetail = () => {
    setStep("toolkit-detail");
    setTools([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg my-auto flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === "toolkits" && "Select toolkit"}
            {step === "toolkit-detail" && (selectedToolkit?.name ?? "Toolkit")}
            {step === "tools" && "Select tools"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 shrink-0 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "toolkits" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-gray-200 px-6 py-4">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search toolkits..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredToolkits.map((t) => (
                    <li key={t.slug}>
                      <button
                        type="button"
                        onClick={() => openToolkitDetail(t)}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                      >
                        {t.meta?.logo ? (
                          <img
                            src={t.meta.logo}
                            alt=""
                            className="h-8 w-8 rounded object-contain"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-gray-500 text-xs font-medium">
                            {t.slug.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-500">{t.slug}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === "toolkit-detail" && selectedToolkit && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <button
                type="button"
                onClick={backToToolkits}
                className="self-start text-sm font-medium text-blue-600 hover:underline"
              >
                ← Back to toolkits
              </button>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                {selectedToolkit.meta?.logo ? (
                  <img
                    src={selectedToolkit.meta.logo}
                    alt=""
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 text-gray-600 text-sm font-medium">
                    {selectedToolkit.slug.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900">{selectedToolkit.name}</div>
                  <div className="text-xs text-gray-500">{selectedToolkit.slug}</div>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
                {connectionLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 size={18} className="animate-spin shrink-0" />
                    Checking connection…
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {isConnected
                          ? "Connected — you can select tools from this toolkit"
                          : "Not connected — connect to use tools from this toolkit"}
                      </span>
                      {isConnected === false && (
                        <button
                          type="button"
                          onClick={handleAuthorize}
                          disabled={connecting}
                          className="flex shrink-0 items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {connecting ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Link2 size={16} />
                          )}
                          Connect
                        </button>
                      )}
                    </div>
                    {isConnected && (
                      <button
                        type="button"
                        onClick={openToolsStep}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Choose tools from {selectedToolkit.name}
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500">
                After connecting in the new tab, click &quot;Check again&quot; or go back and reopen this toolkit to refresh connection status.
              </p>
              {isConnected === false && !connectionLoading && (
                <button
                  type="button"
                  onClick={() => selectedToolkit && checkConnection(selectedToolkit.slug)}
                  className="self-start rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Check again
                </button>
              )}
            </div>
          )}

        {step === "tools" && selectedToolkit && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-gray-200 px-6 py-4">
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                <button
                  type="button"
                  onClick={backToToolkitDetail}
                  className="text-blue-600 hover:underline"
                >
                  ← Back
                </button>
                <span className="text-gray-400">|</span>
                <span>{selectedToolkit.name}</span>
              </div>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredTools.map((t) => (
                    <li key={t.slug}>
                      <button
                        type="button"
                        onClick={() => t.slug && toggleTool(t.slug)}
                        className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                          t.slug && selectedToolSlugs.has(t.slug)
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300">
                          {t.slug && selectedToolSlugs.has(t.slug) ? (
                            <Check size={14} className="text-blue-600" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900">
                            {t.name || t.slug}
                          </div>
                          {t.description && (
                            <div className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                              {t.description}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={backToToolkitDetail}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={selectedToolSlugs.size === 0}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add {selectedToolSlugs.size > 0 ? selectedToolSlugs.size : ""} tool
                {selectedToolSlugs.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
