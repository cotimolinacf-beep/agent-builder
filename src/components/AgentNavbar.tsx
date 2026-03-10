"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Sparkles } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import AgentGeneratorModal from "@/components/AgentGeneratorModal";

export default function AgentNavbar() {
    const router = useRouter();
    const currentFlowName = useFlowStore((s) => s.currentFlowName);
    const updateFlowName = useFlowStore((s) => s.updateFlowName);

    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(currentFlowName);
    const [showGenerator, setShowGenerator] = useState(false);

    useEffect(() => {
        setEditedName(currentFlowName);
    }, [currentFlowName]);

    const handleSaveName = () => {
        if (editedName.trim()) {
            updateFlowName(editedName.trim());
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedName(currentFlowName);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSaveName();
        } else if (e.key === "Escape") {
            handleCancelEdit();
        }
    };

    return (
        <>
            <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
                <button
                    onClick={() => router.push("/")}
                    className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>

                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                        />
                        <button
                            onClick={handleSaveName}
                            className="flex h-6 w-6 items-center justify-center rounded text-green-600 hover:bg-green-50"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <h2
                        onClick={() => setIsEditing(true)}
                        className="cursor-pointer text-base font-semibold text-gray-900 hover:text-gray-700 transition-colors"
                    >
                        {currentFlowName}
                    </h2>
                )}

                <div className="ml-auto">
                    <button
                        onClick={() => setShowGenerator(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                        <Sparkles size={13} />
                        Generar con IA
                    </button>
                </div>
            </div>

            {showGenerator && (
                <AgentGeneratorModal onClose={() => setShowGenerator(false)} />
            )}
        </>
    );
}
