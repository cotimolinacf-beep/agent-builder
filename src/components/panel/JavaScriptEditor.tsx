"use client";

import React from "react";
import CodeEditor from "@uiw/react-textarea-code-editor";

interface JavaScriptEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export default function JavaScriptEditor({
    value,
    onChange,
    placeholder = "// Write your JavaScript code here...",
    minHeight = "150px",
}: JavaScriptEditorProps) {
    return (
        <CodeEditor
            value={value}
            language="js"
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            padding={12}
            style={{
                fontFamily: '"Fira Code", "Fira Mono", Menlo, Consolas, monospace',
                fontSize: 13,
                backgroundColor: "#1e1e1e",
                borderRadius: "8px",
                minHeight,
            }}
            data-color-mode="dark"
        />
    );
}
