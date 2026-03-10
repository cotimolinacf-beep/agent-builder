"use client";

import React from "react";

export default function TestsTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-sm text-gray-400">
        Test scenarios will appear here.
      </div>
      <p className="text-xs text-gray-300">
        Define test cases to validate agent behavior.
      </p>
    </div>
  );
}
