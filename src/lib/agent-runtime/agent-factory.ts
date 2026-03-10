import {
    StateGraph,
    StateSchema,
    MessagesValue,
    GraphNode,
    START,
    END,
} from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage, SystemMessage, AIMessage, ToolMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import * as z from "zod";
import { AppNode, AppEdge, AgentNodeData, KnowledgeBase, InfoCollectionItem, Tool, ThinkingLevel } from "@/types";
import { getComposio, getComposioUserId } from "@/lib/composio";
import { memoryStore } from "./memory-store";
import { initializeVectorStore, retrieveContextWithScores } from "./rag-service";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { getModelForThinkingLevel } from "./model-factory";

// System prompt constants
const DEFAULT_SYSTEM_PROMPT = "Do not end the conversation unless the user asks you to do so or you have collected all the information you need.";

const TRANSFER_INSTRUCTIONS_PROMPT = "\n\n⚠️ CRITICAL TRANSFER RULE: When you need to transfer the conversation, call the appropriate transfer tool IMMEDIATELY and SILENTLY. DO NOT announce the transfer, DO NOT say things like 'I'm transferring you...', 'Let me connect you...', or 'I'll pass you to...'. Just execute the tool without any verbal announcement.";

const TRANSFER_CONTEXT_PROMPT = "[SYSTEM CONTEXT: You are now handling this conversation after a transfer from another agent. Speak to the user naturally, do not greet them and continue helping them. Do not mention the transfer. Do not transfer back to the previous agent.]";

// RAG configuration constants
const RAG_CONTEXT_MESSAGES = 3; // Number of recent messages to consider for RAG context

// 1. Define Custom State Schema
const AgentState = new StateSchema({
    messages: MessagesValue,
    currentAgent: z.string().default(""),
    collectedInfo: z.record(z.string(), z.any()).default({}), // Store collected info by agent ID
});

// 2. Define Agent Configuration Structure
interface AgentConfig {
    id: string;
    label: string;
    systemPrompt: string;
    transferTools: StructuredToolInterface[]; // Tools to transfer to other agents/END
    composioTools?: StructuredToolInterface[]; // LangChain-wrapped Composio tools (from node.data.tools)
    knowledgeBases?: KnowledgeBase[];
    infoCollection?: InfoCollectionItem[];
    tools?: Tool[]; // Composio tool refs (toolkitSlug, toolSlug) for display/serialization
    thinkingLevel?: ThinkingLevel;
}

type AgentConfigMap = Record<string, AgentConfig>;

/**
 * Tool Types:
 * 1. TRANSFER TOOLS: Change currentAgent state (tracked in toolToAgentMap)
 * 2. NORMAL TOOLS: Execute logic, return results (no state change)
 * 
 * The agent will be bound with ALL tools: [...transferTools, ...normalTools]
 * The tool execution node knows which are transfers via toolToAgentMap
 */

interface TransferToolInfo {
    tool: StructuredToolInterface;
    targetAgentId: string; // "END" for end nodes, or agent node ID
}

// 3. Create Helper Functions
function findInitialAgent(nodes: AppNode[], edges: AppEdge[]): string {
    const startNode = nodes.find(n => n.type === "start");
    if (!startNode) throw new Error("No start node found");
    
    const startEdge = edges.find(e => e.source === startNode.id);
    if (!startEdge) throw new Error("No edge from start node");
    
    return startEdge.target;
}

function getAgentNodes(nodes: AppNode[]): AppNode[] {
    return nodes.filter(n => n.type === "agent");
}

function getOutgoingEdges(nodeId: string, edges: AppEdge[]): AppEdge[] {
    return edges.filter(e => e.source === nodeId);
}

function getIncomingEdgesWithReturn(nodeId: string, edges: AppEdge[]): AppEdge[] {
    return edges.filter(e =>
        e.target === nodeId &&
        e.data?.returnTransition?.enabled
    );
}

/**
 * Returns only conversational messages (HumanMessage and AIMessage without tool_calls).
 * Used by the RAG node so Gemini is never sent tool turns, avoiding "function response turn
 * must come immediately after function call turn" errors.
 */
function getConversationMessagesWithoutToolTurns(messages: BaseMessage[]): (HumanMessage | AIMessage)[] {
    return messages.filter((msg): msg is HumanMessage | AIMessage => {
        if (HumanMessage.isInstance(msg)) return true;
        if (ToolMessage.isInstance(msg)) return false;
        if (AIMessage.isInstance(msg)) return !(msg as AIMessage).tool_calls?.length;
        return false;
    }) as (HumanMessage | AIMessage)[];
}

// 4. Implement Transfer Tool Creation with Info Collection
function createTransferTools(
    agentNode: AppNode,
    outgoingEdges: AppEdge[],
    nodes: AppNode[]
): TransferToolInfo[] {
    const tools: TransferToolInfo[] = [];
    const agentData = agentNode.data as AgentNodeData;
    
    for (const edge of outgoingEdges) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) continue;
        
        // Skip tool dispatch nodes for now
        if (targetNode.type === "tool") continue;
        
        if (targetNode.type === "agent") {
            // Build schema: required reason + optional info collection fields
            const schemaFields: Record<string, z.ZodString> = {
                reason: z.string().describe("Brief reason why you are transferring the conversation (e.g. what the user asked for or indicated)."),
            };
            if (agentData.infoCollection && agentData.infoCollection.length > 0) {
                agentData.infoCollection.forEach(field => {
                    const paramName = field.label.toLowerCase().replace(/\s+/g, '_');
                    schemaFields[paramName] = z.string().describe(field.description);
                });
            }
            
            const targetData = targetNode.data as AgentNodeData;
            const targetLabel = targetData.label;
            const toolName = `transfer_to_${targetLabel.toLowerCase().replace(/\s+/g, "_")}`;
            const description = edge.data?.conditionExpression || `Transfer conversation to ${targetLabel}`;
            
            const transferTool = tool(
                (params) => {
                    const reason = (params as { reason?: string }).reason;
                    const collectedFields = Object.keys(params).filter(k => k !== "reason");
                    const parts = [reason ? `Reason: ${reason}` : null, collectedFields.length > 0 ? `Collected: ${collectedFields.join(", ")}` : null].filter(Boolean);
                    return `Transferred to ${targetLabel}. ${parts.join(". ")}`;
                },
                {
                    name: toolName,
                    description: description,
                    schema: z.object(schemaFields),
                }
            );
            
            tools.push({ tool: transferTool, targetAgentId: edge.target });
        } else if (targetNode.type === "end") {
            const schemaFields: Record<string, z.ZodString> = {
                reason: z.string().describe("Brief reason why you are ending the conversation (e.g. user said goodbye, request completed)."),
            };
            if (agentData.infoCollection && agentData.infoCollection.length > 0) {
                agentData.infoCollection.forEach(field => {
                    const paramName = field.label.toLowerCase().replace(/\s+/g, '_');
                    schemaFields[paramName] = z.string().describe(field.description);
                });
            }
            
            const description = (targetNode.data as any).description || "If the user says goodbye, end the conversation";
            const transferTool = tool(
                (params) => {
                    const reason = (params as { reason?: string }).reason;
                    const collectedFields = Object.keys(params).filter(k => k !== "reason");
                    const parts = [reason ? `Reason: ${reason}` : null, collectedFields.length > 0 ? `Collected: ${collectedFields.join(", ")}` : null].filter(Boolean);
                    return `Conversation ended. ${parts.join(". ")}`;
                },
                {
                    name: "end_conversation",
                    description: description,
                    schema: z.object(schemaFields),
                }
            );
            
            tools.push({ tool: transferTool, targetAgentId: "END" });
        }
    }
    
    return tools;
}

// 4b. Create return tools from incoming edges (reason required)
function createReturnTools(
    nodeId: string,
    incomingEdgesWithReturn: AppEdge[],
    nodes: AppNode[]
): TransferToolInfo[] {
    const tools: TransferToolInfo[] = [];
    for (const edge of incomingEdgesWithReturn) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode || sourceNode.type !== "agent") continue;
        const sourceData = sourceNode.data as AgentNodeData;
        const sourceLabel = sourceData.label;
        const returnConfig = edge.data?.returnTransition;
        if (!returnConfig?.enabled) continue;
        const toolName = `return_to_${sourceLabel.toLowerCase().replace(/\s+/g, "_")}`;
        const description = returnConfig.conditionExpression || `Transfer back to ${sourceLabel}`;
        const returnTool = tool(
            (params) => {
                const reason = (params as { reason?: string }).reason;
                return reason ? `Returned to ${sourceLabel}. Reason: ${reason}` : `Returned successfully to ${sourceLabel}`;
            },
            {
                name: toolName,
                description: description,
                schema: z.object({
                    reason: z.string().describe("Brief reason why you are returning the conversation (e.g. user wants something different or changed their goal)."),
                }),
            }
        );
        tools.push({ tool: returnTool, targetAgentId: edge.source });
    }
    return tools;
}

// 5. Build Agent Configuration Map
function buildAgentConfigMap(
    nodes: AppNode[],
    edges: AppEdge[]
): { configMap: AgentConfigMap; toolToAgentMap: Record<string, string> } {
    const agentNodes = getAgentNodes(nodes);
    const configMap: AgentConfigMap = {};
    const toolToAgentMap: Record<string, string> = {}; // Maps tool name → target agent ID
    
    for (const agentNode of agentNodes) {
        const agentData = agentNode.data as AgentNodeData;
        const outgoingEdges = getOutgoingEdges(agentNode.id, edges);
        const transferToolInfos = createTransferTools(agentNode, outgoingEdges, nodes);
        const incomingWithReturn = getIncomingEdgesWithReturn(agentNode.id, edges);
        const returnToolInfos = createReturnTools(agentNode.id, incomingWithReturn, nodes);
        
        // Map tool names to target agent IDs (forward + return)
        transferToolInfos.forEach(info => {
            toolToAgentMap[info.tool.name] = info.targetAgentId;
        });
        returnToolInfos.forEach(info => {
            toolToAgentMap[info.tool.name] = info.targetAgentId;
        });
        
        // Combine forward and return tools for this agent
        const allTransferTools = [
            ...transferToolInfos.map(i => i.tool),
            ...returnToolInfos.map(i => i.tool),
        ];
        
        // Build system prompt with transfer instructions and timezone
        const basePrompt = agentData.conversationGoal || "You are a helpful assistant.";
        const transferInstructions = allTransferTools.length > 0
            ? TRANSFER_INSTRUCTIONS_PROMPT
            : "";

        // Inject current date/time based on configured timezone
        const timezone = (agentData as any).timezone || "America/Argentina/Buenos_Aires";
        const now = new Date();
        const formattedDateTime = now.toLocaleString("es-AR", {
            timeZone: timezone,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const datetimeContext = `\n\n[FECHA Y HORA ACTUAL: ${formattedDateTime} (${timezone})]`;

        configMap[agentNode.id] = {
            id: agentNode.id,
            label: agentData.label,
            systemPrompt: basePrompt + datetimeContext + transferInstructions,
            transferTools: allTransferTools,
            
            // For future use (not implemented yet):
            knowledgeBases: agentData.knowledgeBases || [],
            infoCollection: agentData.infoCollection || [],
            tools: agentData.tools || [],
            thinkingLevel: agentData.thinkingLevel,
        };
    }
    
    return { configMap, toolToAgentMap };
}

// 6. Create RAG Node with Intelligent Question Detection
function createRagNode(
    configMap: AgentConfigMap,
    vectorStoreCache: Record<string, MemoryVectorStore | null>
): GraphNode<typeof AgentState> {
    return async (state) => {
        const currentAgentId = state.currentAgent;
        const config = configMap[currentAgentId];
        
        if (!config) {
            console.warn(`⚠️ Agent configuration not found for RAG: ${currentAgentId}`);
            return { messages: [] };
        }

        // Check if agent has knowledge bases
        if (!config.knowledgeBases || config.knowledgeBases.length === 0) {
            console.log(`📚 Agent ${config.label} has no knowledge bases, skipping RAG`);
            return { messages: [] };
        }

        // Use only conversational turns (no tool calls/responses) so Gemini is not sent invalid turn order
        const conversationOnly = getConversationMessagesWithoutToolTurns(state.messages);
        const recentMessages = conversationOnly.slice(-RAG_CONTEXT_MESSAGES);

        if (recentMessages.length === 0) {
            console.log(`⚠️ No messages in state, skipping RAG`);
            return { messages: [] };
        }

        // Get the last message - should be a HumanMessage (filtered context)
        const lastConversationMessage = recentMessages.at(-1);
        if (!lastConversationMessage || !HumanMessage.isInstance(lastConversationMessage)) {
            console.log(`⚠️ Last conversational message is not a HumanMessage, skipping RAG`);
            return { messages: [] };
        }

        // Use LLM to detect if this is a meaningful question requiring RAG
        const detectionModel = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash-lite",
            temperature: 0,
        });

        // Define structured output schema
        const QuestionDetectionSchema = z.object({
            shouldRetrieve: z.boolean().describe("Whether this message requires knowledge base lookup"),
            searchQuery: z.string().nullable().describe("The optimized search query to use, or null if no retrieval needed"),
            reasoning: z.string().describe("Brief explanation of the decision"),
        });

        const detectionModelWithStructure = detectionModel.withStructuredOutput(QuestionDetectionSchema);

        try {
            // Detect if RAG is needed using recent conversation context
            const detection = await detectionModelWithStructure.invoke([
                new SystemMessage(
                    `You are a question detector. Analyze the recent conversation and determine if the latest message requires looking up information from a knowledge base.
                    
Assume the knowledge base contains broad information about the business, products, services, operations, and any other relevant documentation.

Messages that SHOULD trigger retrieval:
- Any question or inquiry about the business, products, services, or operations
- Requests for information, details, or explanations
- Queries about specific topics that might be in documentation (e.g., hours, location, policies, specifications, etc.)
- Follow-up questions that need more context

Messages that SHOULD NOT trigger retrieval:
- Pure greetings, farewells, or thank you messages (without follow-up questions)
- Simple acknowledgments like "ok", "yes", "no"
- Statements that clearly don't request any information

When in doubt, it is better to retrieve than to skip. If retrieval is needed, extract the key search terms from the conversation context and create an optimized search query.`
                ),
                ...recentMessages,
            ]);

            console.log(`🤔 RAG Detection: shouldRetrieve=${detection.shouldRetrieve}, query="${detection.searchQuery}", reason="${detection.reasoning}"`);

            if (!detection.shouldRetrieve || !detection.searchQuery) {
                console.log(`📋 No retrieval needed, passing through`);
                return { messages: [] };
            }

            // Get or initialize vector store for this agent
            const cacheKey = currentAgentId;
            if (!vectorStoreCache[cacheKey]) {
                console.log(`🔄 Initializing vector store for agent ${config.label}...`);
                vectorStoreCache[cacheKey] = await initializeVectorStore(config.knowledgeBases);
            }

            const vectorStore = vectorStoreCache[cacheKey];
            if (!vectorStore) {
                console.warn(`⚠️ Vector store is null for agent ${config.label}`);
                return { messages: [] };
            }

            // Retrieve context with similarity scores
            const results = await retrieveContextWithScores(
                vectorStore,
                detection.searchQuery,
                4, // Top K
                0.5 // Similarity threshold
            );

            if (results.length === 0) {
                console.log(`📋 No relevant context found above threshold`);
                return { messages: [] };
            }

            // Augment the user message with retrieved context
            const contextText = results
                .map((r, idx) => `${r.content}`)
                .join("\n\n");

            const originalMessage = String(lastConversationMessage.content);
            const augmentedContent = `[Original Message]
${originalMessage}

[Relevant Information from Knowledge Base]
${contextText}`;

            console.log(`✨ Augmenting message with ${results.length} context chunks`);

            // Create a new HumanMessage with augmented content
            const augmentedMessage = new HumanMessage({
                content: augmentedContent,
                id: lastConversationMessage.id,
            });

            // Replace the last message in the state
            // We need to return the full messages array with the last one replaced
            const updatedMessages = [
                ...state.messages.slice(0, -1),
                augmentedMessage,
            ];

            return { messages: updatedMessages };

        } catch (error) {
            console.error(`❌ Error in RAG node:`, error);
            return { messages: [] };
        }
    };
}

// 7. Create Single Agent Node with Dynamic Behavior
function createDynamicAgentNode(
    configMap: AgentConfigMap,
    toolToAgentMap: Record<string, string>,
    baseSystemPrompt: string = DEFAULT_SYSTEM_PROMPT
): GraphNode<typeof AgentState> {
    let previousAgentId: string | null = null;
    
    return async (state) => {
        const currentAgentId = state.currentAgent;
        const config = configMap[currentAgentId];
        
        if (!config) {
            throw new Error(`Agent configuration not found for: ${currentAgentId}`);
        }
        
        // Check if we just transferred to this agent
        const justTransferred = previousAgentId !== null && previousAgentId !== currentAgentId;
        previousAgentId = currentAgentId;
        
        // Build system prompt with base prompt, optional transfer context, and agent prompt
        let systemPrompt = baseSystemPrompt || DEFAULT_SYSTEM_PROMPT;
        
        if (justTransferred) {
            systemPrompt += `${TRANSFER_CONTEXT_PROMPT}\n\n`;
        }
        
        systemPrompt += config.systemPrompt;
        
        // Filter messages to exclude transfer tool messages when just transferred
        // This prevents the agent from responding to transfer confirmations
        let messagesToSend = state.messages;
        if (justTransferred) {
            // Find the last AIMessage with tool_calls before this point
            // and check if any of those tool calls were transfer tools
            // If so, remove that AIMessage and the corresponding ToolMessages
            const messagesToFilter: Set<number> = new Set();
            
            for (let i = state.messages.length - 1; i >= 0; i--) {
                const msg = state.messages[i];
                
                // If we find a ToolMessage, check if it's from a transfer tool
                if (ToolMessage.isInstance(msg)) {
                    // Check if this tool message is from a transfer by looking at recent AI messages
                    const toolCallId = msg.tool_call_id;
                    
                    // Look backwards for the AIMessage that created this tool call
                    for (let j = i - 1; j >= 0; j--) {
                        const prevMsg = state.messages[j];
                        if (AIMessage.isInstance(prevMsg) && prevMsg.tool_calls) {
                            const matchingToolCall = prevMsg.tool_calls.find(tc => tc.id === toolCallId);
                            if (matchingToolCall) {
                                // Check if this tool is a transfer tool
                                if (toolToAgentMap[matchingToolCall.name]) {
                                    // This is a transfer tool message, mark it for filtering
                                    messagesToFilter.add(i);
                                    messagesToFilter.add(j); // Also filter the AI message that called it
                                }
                                break;
                            }
                        }
                    }
                }
            }
            
            // Filter out marked messages
            if (messagesToFilter.size > 0) {
                messagesToSend = state.messages.filter((_, idx) => !messagesToFilter.has(idx));
            }
        }
        
        // Create model using thinking level factory
        const model = getModelForThinkingLevel(config.thinkingLevel);
        
        // Collect ALL tools for this agent (transfer + Composio)
        const allTools = [
            ...config.transferTools,
            ...(config.composioTools ?? []),
        ];
        
        // Bind all tools to model
        const modelWithTools = model.bindTools(allTools);
        
        // Call the model with system prompt and messages
        const response = await modelWithTools.invoke([
            new SystemMessage(systemPrompt),
            ...messagesToSend,
        ]);
        
        return {
            messages: [response],
        };
    };
}

// 8. Create Tool Execution Node
function createToolExecutionNode(
    configMap: AgentConfigMap,
    toolToAgentMap: Record<string, string>
): GraphNode<typeof AgentState> {
    return async (state) => {
        const lastMessage = state.messages.at(-1);

        if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
            return { messages: [] };
        }

        const toolMessages: ToolMessage[] = [];
        let newCurrentAgent = state.currentAgent;
        let newCollectedInfo = state.collectedInfo;

        // Get current agent config to access all tools (transfer + normal)
        const currentConfig = configMap[state.currentAgent];
        if (!currentConfig) {
            throw new Error(`Agent configuration not found: ${state.currentAgent}`);
        }
        
        // Create tool lookup by name (transfer + Composio)
        const toolsByName: Record<string, StructuredToolInterface> = {};
        currentConfig.transferTools.forEach(t => {
            toolsByName[t.name] = t;
        });
        (currentConfig.composioTools ?? []).forEach(t => {
            toolsByName[t.name] = t;
        });

        // Execute tool calls
        for (const toolCall of lastMessage.tool_calls ?? []) {
            const tool = toolsByName[toolCall.name];
            
            if (tool) {
                // Execute the tool
                console.log(`🔄 Executing tool: ${toolCall.name}`);
                const observation = await tool.invoke(toolCall);
                console.log(`🔄 Observation: ${JSON.stringify(observation).slice(0, 100)}...`);
                
                toolMessages.push(observation);
                
                // Check if this is a TRANSFER tool (only transfer tools change currentAgent)
                const targetAgentId = toolToAgentMap[toolCall.name];
                if (targetAgentId) {
                    // This is a transfer tool - update currentAgent
                    newCurrentAgent = targetAgentId;
                    
                    // Store collected info from tool parameters
                    const collectedData = toolCall.args || {};
                    if (Object.keys(collectedData).length > 0) {
                        newCollectedInfo = {
                            ...state.collectedInfo,
                            [state.currentAgent]: collectedData, // Store by agent ID
                        };
                        console.log(`🔄 Transfer: ${toolCall.name} → ${targetAgentId}`);
                        console.log(`📋 Collected info:`, collectedData);
                    } else {
                        console.log(`🔄 Transfer: ${toolCall.name} → ${targetAgentId}`);
                    }
                }
                // If NOT a transfer tool, it's a normal tool - just execute and return result
            }
        }

        return {
            messages: toolMessages,
            currentAgent: newCurrentAgent, // Only changes if transfer tool was called
            collectedInfo: newCollectedInfo, // Update collected info
        };
    };
}

// 9. Create End Node
function createEndNode(): GraphNode<typeof AgentState> {
    return async (state) => {
        // Add a final system message
        return {
            messages: [new SystemMessage("Session finished. Thank you for using our service.")],
        };
    };
}

// 10. Implement Conditional Routing
const shouldContinueFromAgent = (state: any) => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return END;
    }

    if (lastMessage.tool_calls?.length) {
        return "toolNode";
    }

    return END;
};

// 11. Refactor createAgentGraph Method
export class AgentFactory {
    static async createAgentGraph(
        flowId: string,
        nodes: AppNode[],
        edges: AppEdge[],
        baseSystemPrompt?: string
    ) {
        // 1. Find the initial agent
        const initialAgentId = findInitialAgent(nodes, edges);
        
        // 2. Build agent configuration map
        const { configMap, toolToAgentMap } = buildAgentConfigMap(nodes, edges);

        // Define routing logic that needs access to toolToAgentMap
        const routeAfterTool = (state: any) => {
            if (state.currentAgent === "END") {
                return "endNode";
            }

            // Check if any tool call in the last AI message was a transfer
            const lastAiMessage = [...state.messages]
                .reverse()
                .find((msg) => AIMessage.isInstance(msg) && (msg as AIMessage).tool_calls?.length);

            const hasTransfer =
                lastAiMessage &&
                (lastAiMessage as AIMessage).tool_calls?.some((tc) => toolToAgentMap[tc.name]);

            if (hasTransfer) {
                console.log("🔄 Transfer detected, routing to RAG node");
                return "ragNode";
            }

            return "agentNode";
        };

        // 2b. Resolve Composio tools to LangChain tools for each agent
        const userId = getComposioUserId();
        const composio = getComposio();
        for (const agentId of Object.keys(configMap)) {
            const config = configMap[agentId];
            if (config.tools && config.tools.length > 0) {
                try {
                    const toolSlugs = config.tools.filter((t) => t.toolSlug).map((t) => t.toolSlug);
                    if (toolSlugs.length === 0) {
                        config.composioTools = [];
                    } else {
                        const composioTools = await composio.tools.get(userId, { tools: toolSlugs });
                        config.composioTools = Array.isArray(composioTools) ? composioTools : [];
                    }
                } catch (e) {
                    console.warn(`Failed to load Composio tools for agent ${config.label}:`, e);
                    config.composioTools = [];
                }
            }
        }
        
        // 3. Create vector store cache for RAG
        const vectorStoreCache: Record<string, MemoryVectorStore | null> = {};
        
        // 4. Create the RAG node
        const ragNode = createRagNode(configMap, vectorStoreCache);
        
        // 5. Create the dynamic agent node
        const agentNode = createDynamicAgentNode(
            configMap,
            toolToAgentMap,
            baseSystemPrompt ?? DEFAULT_SYSTEM_PROMPT
        );
        
        // 6. Create the tool execution node
        const toolNode = createToolExecutionNode(configMap, toolToAgentMap);
        
        // 7. Create the end node
        const endNode = createEndNode();
        
        // 8. Build StateGraph with RAG
        const workflow = new StateGraph(AgentState)
            .addNode("ragNode", ragNode)
            .addNode("agentNode", agentNode)
            .addNode("toolNode", toolNode)
            .addNode("endNode", endNode)
            // Connect START to RAG node first
            .addEdge(START, "ragNode")
            // RAG node always goes to agent node
            .addEdge("ragNode", "agentNode")
            // Conditional routing from agent
            .addConditionalEdges("agentNode", shouldContinueFromAgent, ["toolNode", END])
            // Conditional routing from tool node
            .addConditionalEdges("toolNode", routeAfterTool, ["ragNode","agentNode", "endNode"])
            // End node goes directly to END
            .addEdge("endNode", END);
        
        // 9. Compile with checkpointer
        const graph = workflow.compile({ 
            checkpointer: memoryStore,
        });
        
        // Return both the compiled graph and the initial agent ID
        return { graph, initialAgentId };
    }
}
