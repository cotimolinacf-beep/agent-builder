"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentGeneratorModalProps {
  onClose: () => void;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "¡Hola! Soy tu asistente para crear flujos de agentes IA. Vamos a diseñarlo juntos paso a paso.\n\n¿Qué tipo de agente o automatización querés construir?",
};

const INITIAL_OPTIONS = [
  "Atención al cliente",
  "Ventas y comercial",
  "Procesamiento de datos",
  "Automatización de tareas",
  "Investigación y análisis",
  "Otro / personalizado",
];

export default function AgentGeneratorModal({ onClose }: AgentGeneratorModalProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [options, setOptions] = useState<string[]>(INITIAL_OPTIONS);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedFlow, setGeneratedFlow] = useState<any>(null);
  const [flowLoaded, setFlowLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const setFlowData = useFlowStore((s) => s.setFlowData);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setOptions([]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent-generator/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      const data = await response.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      if (data.options?.length) setOptions(data.options);
      if (data.flowData) {
        setGeneratedFlow(data.flowData);
        setFlowLoaded(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleLoadToCanvas = () => {
    if (!generatedFlow) return;
    setFlowData({
      nodes: generatedFlow.nodes || [],
      edges: generatedFlow.edges || [],
      name: generatedFlow.name || "Agente Generado",
      baseSystemPrompt: generatedFlow.baseSystemPrompt || "",
    });
    setFlowLoaded(true);
  };

  const handleRegenerate = () => {
    setGeneratedFlow(null);
    setFlowLoaded(false);
    sendMessage("Regenera el flujo con las mismas especificaciones, mejorando la estructura y los prompts de los agentes.");
  };

  const agentCount = generatedFlow?.nodes?.filter((n: any) => n.type === "agent").length ?? 0;
  const endCount = generatedFlow?.nodes?.filter((n: any) => n.type === "end").length ?? 0;
  const edgeCount = generatedFlow?.edges?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-[88vh] w-[700px] max-w-[95vw] flex-col rounded-2xl bg-white shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
              <Sparkles size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Generador de Agentes IA</h2>
              <p className="text-xs text-gray-400">Diseñá tu flujo a través de una conversación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated flow card */}
          {generatedFlow && (
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle size={15} className="text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">{generatedFlow.name}</span>
              </div>
              <p className="text-xs text-purple-600 mb-3">
                {agentCount} agente{agentCount !== 1 ? "s" : ""} · {endCount} fin{endCount !== 1 ? "es" : ""} · {edgeCount} conexione{edgeCount !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {!flowLoaded ? (
                  <button
                    onClick={handleLoadToCanvas}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    <CheckCircle size={13} />
                    Cargar en el canvas
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    <CheckCircle size={13} />
                    Cargado en el canvas
                  </span>
                )}
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  Regenerar
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Option chips */}
        {options.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-3">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => sendMessage(opt)}
                className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribí tu respuesta o elegí una opción…"
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-purple-400 focus:bg-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
