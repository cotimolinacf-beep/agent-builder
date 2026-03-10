import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { getComposio } from "@/lib/composio";

// Module-level cache for Composio toolkits
let toolkitsCache: string | null = null;

async function getToolkitsList(): Promise<string> {
  if (toolkitsCache) return toolkitsCache;
  try {
    const composio = getComposio();
    const result = await composio.toolkits.get({ limit: 100 });
    const items = Array.isArray(result) ? result : [];
    toolkitsCache = items
      .slice(0, 80)
      .map((t: any) => `- **${t.slug}**: ${t.description || t.name || t.slug}`)
      .join("\n");
    return toolkitsCache || "(no toolkits available)";
  } catch {
    return "(Composio tools temporarily unavailable — check COMPOSIO_API_KEY)";
  }
}

function buildSystemPrompt(toolkitsList: string): string {
  return `You are an expert AI Agent Flow Builder assistant. Your job is to help users design and generate multi-agent flows through a friendly, step-by-step conversation.

## Flow Architecture
A flow consists of:
- **Start node** (always 1, fixed id="start-node"): Entry point, no configuration needed
- **Agent nodes**: LLM-powered agents with a system prompt (conversationGoal), optional Composio tools, and optional info collection fields
- **End nodes**: Terminal states with a descriptive endLabel
- **Edges**: Directed connections between nodes with conditions

## Node JSON Schemas

Start node:
\`\`\`json
{ "id": "start-node", "type": "start", "position": {"x": 400, "y": 50}, "data": {"label": "Start"} }
\`\`\`

Agent node:
\`\`\`json
{
  "id": "agent-1",
  "type": "agent",
  "position": {"x": 350, "y": 220},
  "data": {
    "label": "Agent Name",
    "description": "Brief role description",
    "conversationGoal": "Detailed system prompt for this agent. Include persona, goals, tone, and behavior rules.",
    "thinkingLevel": "auto",
    "timezone": "America/Argentina/Buenos_Aires",
    "tools": [
      {
        "id": "tool-1",
        "name": "Human-readable tool name",
        "description": "What this tool does",
        "toolkitSlug": "gmail",
        "toolSlug": "GMAIL_SEND_EMAIL"
      }
    ],
    "infoCollection": [
      { "id": "info-1", "label": "Field label", "description": "What to collect and why" }
    ],
    "knowledgeBases": [],
    "subItems": 0
  }
}
\`\`\`

End node:
\`\`\`json
{ "id": "end-1", "type": "end", "position": {"x": 350, "y": 600}, "data": {"label": "End", "endLabel": "Descriptive end name"} }
\`\`\`

## Edge JSON Schema
\`\`\`json
{
  "id": "edge-1",
  "source": "source-node-id",
  "target": "target-node-id",
  "type": "conditionEdge",
  "data": {
    "label": "Short condition label",
    "conditionType": null,
    "conditionExpression": "When this condition is met (only for llm_condition type)"
  }
}
\`\`\`

Edge conditionType rules:
- start → agent: conditionType = null, no conditionExpression
- agent → agent: conditionType = "llm_condition", add conditionExpression
- agent → end: conditionType = "llm_condition", add conditionExpression

## Suggested Positions Layout
- Start node: {x: 400, y: 50}
- Single agent: {x: 350, y: 220}
- Two parallel agents: first {x: 150, y: 420}, second {x: 550, y: 420}
- Sequential agents: increment y by 200 each
- End nodes: last agent y + 200, x centered

## Available Composio Toolkits
${toolkitsList}

## Conversation Protocol
Ask ONE question at a time, in this order:
1. **Use case**: What kind of agent/automation does the user want?
2. **Tasks**: What specific tasks should the agent(s) perform?
3. **Structure**: Single agent or multiple specialized agents?
4. **Agents** (if multiple): Names, roles, and when they hand off to each other
5. **Tools**: Which external integrations are needed? Suggest relevant Composio toolkits based on tasks described
6. **Info collection**: What data should agents collect from users?
7. **Confirm & generate**: Summarize and generate the flow

## Response Format Rules
- When offering choices, include them as: [OPTIONS: Choice A | Choice B | Choice C]
- Keep responses concise and conversational — max 3-4 sentences per reply
- Ask only ONE thing per message
- When you have all the information needed, output the complete flow JSON wrapped exactly like this (no markdown code blocks inside):

FLOW_JSON_START
{
  "id": "generated-${Date.now()}",
  "name": "Flow name here",
  "nodes": [...],
  "edges": [...],
  "baseSystemPrompt": "Global instruction applying to all agents (e.g. language, tone, brand guidelines)",
  "updatedAt": "${new Date().toISOString()}"
}
FLOW_JSON_END

After the FLOW_JSON_END marker, write a brief 2-3 sentence summary of what was generated and how to iterate on it.

IMPORTANT: The flow JSON must be valid, complete, and follow the schemas exactly. Always include at least one agent node and one end node.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const toolkitsList = await getToolkitsList();
    const systemPrompt = buildSystemPrompt(toolkitsList);

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.7,
    });

    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...messages.map((m) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
    ];

    const response = await model.invoke(langchainMessages);
    const rawContent =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Parse [OPTIONS: a | b | c]
    const optionsMatch = rawContent.match(/\[OPTIONS:\s*([^\]]+)\]/);
    const options = optionsMatch
      ? optionsMatch[1].split("|").map((o) => o.trim()).filter(Boolean)
      : undefined;

    // Parse FLOW_JSON_START...FLOW_JSON_END
    const flowMatch = rawContent.match(/FLOW_JSON_START\s*([\s\S]*?)\s*FLOW_JSON_END/);
    let flowData: object | undefined;
    if (flowMatch) {
      try {
        flowData = JSON.parse(flowMatch[1].trim());
      } catch {
        // Try to extract inner JSON object
        const jsonMatch = flowMatch[1].match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            flowData = JSON.parse(jsonMatch[0]);
          } catch {
            /* ignore malformed JSON */
          }
        }
      }
    }

    // Clean response for display
    const cleanMessage = rawContent
      .replace(/\[OPTIONS:[^\]]+\]/g, "")
      .replace(/FLOW_JSON_START[\s\S]*?FLOW_JSON_END/g, "")
      .trim();

    return NextResponse.json({ message: cleanMessage, options, flowData });
  } catch (err) {
    console.error("Agent generator error:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
