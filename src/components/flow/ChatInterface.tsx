"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User } from "lucide-react";

interface Message {
    role: "user" | "agent";
    content: string;
}

interface ChatInterfaceProps {
    flowId: string;
    onClose: () => void;
}

export default function ChatInterface({ flowId, onClose }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Generate a unique session ID when the component mounts
    useEffect(() => {
        setSessionId(crypto.randomUUID());
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input when loading finishes
    useEffect(() => {
        if (!isLoading) {
            inputRef.current?.focus();
        }
    }, [isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch(`/api/agent/${flowId}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId: sessionId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.details || errorData.error || `HTTP ${response.status}`;
                throw new Error(detail);
            }

            const data = await response.json();
            setMessages((prev) => [...prev, { role: "agent", content: data.message }]);
        } catch (error) {
            console.error("Error chatting with agent:", error);
            const errorMessage = error instanceof Error ? error.message : "Could not reach agent.";
            setMessages((prev) => [
                ...prev,
                { role: "agent", content: `Error: ${errorMessage}` },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 right-24 z-50 w-[500px] rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <Bot size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Agent Chat</h3>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-500 hover:bg-gray-200"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex h-[600px] flex-col overflow-y-auto bg-gray-50 p-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                        <Bot size={48} className="mb-2" />
                        <p className="text-sm">Start a conversation with your agent.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user"
                                        ? "bg-blue-600 text-white"
                                        : "bg-white text-gray-800 shadow-sm border border-gray-100"
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl bg-white px-4 py-2 text-sm text-gray-500 shadow-sm border border-gray-100 italic">
                                    Typing...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white p-3 rounded-b-2xl">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isLoading}
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
