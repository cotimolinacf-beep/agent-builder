"use client";

import React from "react";

const navItems = [
  "Agent",
  "Workflow",
  "Knowledge Base",
  "Analysis",
  "Tools",
  "Tests",
  "Widget",
  "Security",
  "Advanced",
];

export default function TopNav() {
  return (
    <nav className="flex h-11 items-center border-b border-gray-200 bg-white px-4">
      {navItems.map((item, i) => (
        <button
          key={item}
          className={`px-3 py-2 text-sm transition-colors ${
            i === 1
              ? "font-semibold text-red-500"
              : "font-medium text-gray-500 hover:text-gray-800"
          }`}
        >
          {item}
        </button>
      ))}
    </nav>
  );
}
