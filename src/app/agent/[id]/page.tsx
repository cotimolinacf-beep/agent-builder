"use client";

import React, { use, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import AgentBuilderCanvas from "@/components/flow/AgentBuilderCanvas";
import ConfigPanel from "@/components/panel/ConfigPanel";
import AgentNavbar from "@/components/AgentNavbar";
import { useFlowStore } from "@/store/flowStore";

export default function AgentEditorPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const loadFlow = useFlowStore((s) => s.loadFlow);
    const setCurrentFlowId = useFlowStore((s) => s.setCurrentFlowId);

    useEffect(() => {
        setCurrentFlowId(id);
        loadFlow(id);
    }, [id, loadFlow, setCurrentFlowId]);

    return (
        <ReactFlowProvider>
            <div className="flex h-screen flex-col overflow-hidden">
                <AgentNavbar />
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1">
                        <AgentBuilderCanvas />
                    </div>
                    <ConfigPanel />
                </div>
            </div>
        </ReactFlowProvider>
    );
}
