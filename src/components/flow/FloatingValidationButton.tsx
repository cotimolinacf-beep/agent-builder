"use client";

import React, { useState, useRef, useEffect } from "react";
import { AlertCircle, CheckCircle, MessageSquare } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import { validateFlow } from "@/lib/validation";
import ChatInterface from "./ChatInterface";

export default function FloatingValidationButton() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const currentFlowId = useFlowStore((s) => s.currentFlowId);
  const [showErrors, setShowErrors] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const errors = validateFlow(nodes, edges);
  const isValid = errors.length === 0;

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowErrors(false);
      }
    }
    if (showErrors) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showErrors]);

  const handleClick = async () => {
    if (isValid) {
      if (isChatOpen) {
        setIsChatOpen(false);
        return;
      }

      setIsCompiling(true);
      try {
        const response = await fetch(`/api/agent/${currentFlowId}/compile`, {
          method: "POST"
        });

        if (response.ok) {
          setIsChatOpen(true);
        } else {
          console.error("Compilation failed");
        }
      } catch (error) {
        console.error("Error compiling agent:", error);
      } finally {
        setIsCompiling(false);
      }
    } else {
      // Toggle error popover
      setShowErrors(!showErrors);
    }
  };

  return (
    <>
      <div className="absolute bottom-6 right-6 z-50" ref={popoverRef}>
        {/* Error popover */}
        {showErrors && !isValid && (
          <div className="absolute bottom-full right-0 mb-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Flow Validation Errors
              </h3>
            </div>
            <div className="max-h-60 overflow-y-auto p-2">
              {errors.map((error, index) => (
                <div
                  key={`${error.id}-${index}`}
                  className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating button */}
        <button
          onClick={handleClick}
          disabled={isCompiling}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${isValid
            ? "bg-blue-600 text-white hover:scale-105 hover:bg-blue-700"
            : "bg-red-500 text-white hover:scale-105 hover:bg-red-600"
            } ${isCompiling ? "opacity-75 cursor-wait" : ""}`}
        >
          {isValid ? (
            isCompiling ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <MessageSquare size={24} />
            )
          ) : (
            <>
              <AlertCircle size={24} />
              {/* Error count badge */}
              <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-red-500 shadow-md">
                {errors.length}
              </div>
            </>
          )}
        </button>
      </div>

      {isChatOpen && currentFlowId && (
        <ChatInterface
          flowId={currentFlowId}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
}
