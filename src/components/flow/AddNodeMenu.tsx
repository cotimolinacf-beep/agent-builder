"use client";

import React, { useEffect, useRef } from "react";
import { Bot, Wrench, Scissors } from "lucide-react";
import { AgentNodeType } from "@/types";
import { useFlowStore } from "@/store/flowStore";

interface AddNodeMenuProps {
  parentId: string;
  onClose: () => void;
}

const menuItems = [
  {
    type: AgentNodeType.Agent,
    label: "Agent",
    icon: Bot,
    description: "Add a conversational agent",
  },
  {
    type: AgentNodeType.Tool,
    label: "Tool dispatch",
    icon: Wrench,
    description: "Dispatch to different tools",
    disabled: true,
    tooltip: "Coming soon",
  },
  {
    type: AgentNodeType.End,
    label: "End",
    icon: Scissors,
    description: "End the conversation",
  },
];

export default function AddNodeMenu({ parentId, onClose }: AddNodeMenuProps) {
  const addChildNode = useFlowStore((s) => s.addChildNode);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }
    // Use capture phase to handle click before other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl bg-white border border-gray-200 shadow-lg p-1 min-w-[200px] nodrag nopan"
    >
      {menuItems.map((item) => (
        <button
          key={item.type}
          disabled={item.disabled}
          title={item.tooltip}
          onClick={(e) => {
            if (item.disabled) return;
            e.stopPropagation();
            addChildNode(parentId, item.type);
            onClose();
          }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
            item.disabled 
              ? "opacity-50 cursor-not-allowed grayscale" 
              : "hover:bg-gray-50 cursor-pointer"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
            <item.icon size={16} className={item.disabled ? "text-gray-400" : "text-gray-600"} />
          </div>
          <div>
            <div className={`text-sm font-medium ${item.disabled ? "text-gray-400" : "text-gray-800"}`}>
              {item.label}
              {item.disabled && (
                <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 ring-1 ring-inset ring-blue-700/10">
                  Soon
                </span>
              )}
            </div>
            <div className={`text-xs ${item.disabled ? "text-gray-300" : "text-gray-400"}`}>
              {item.description}
              {item.disabled && " (Coming soon)"}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
