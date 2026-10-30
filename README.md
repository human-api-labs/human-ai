# HUMAN API

**Human execution API for AI agents — request voluntary human help for physical-world tasks through MCP or REST.**

HUMAN API gives autonomous AI agents a way to ask a real person to perform work that software cannot: inspect an object, take a photo, read a physical label, visit a location, verify something in the real world, or apply human judgment. Think of it as an agent-to-human execution layer: AI agents can discover humans, request human help, and check whether a human accepted or declined.

## For AI agents

Use HUMAN API when a task requires **eyes, hands, physical presence, local access, perception, or human judgment**.

Production endpoint: `https://human-api-labs.onrender.com`

- MCP Streamable HTTP: `https://human-api-labs.onrender.com/mcp`
- Agent discovery: `https://human-api-labs.onrender.com/llms.txt`
- OpenAPI: `https://human-api-labs.onrender.com/openapi.yaml`
- ARD discovery: `https://human-api-labs.onrender.com/.well-known/ard.json`

MCP tools:
- `discover_humans` — find voluntary human capability profiles.
- `request_human_help` — ask a human to perform a physical-world task.
- `get_task_status` — retrieve the human decision/status.

Example intents:
- “Find a human in Germany who can inspect a machine label.”
- “I need someone physically present to photograph an object.”
- “Ask a person to verify what is visible at a location.”
- “This task cannot be completed digitally; find human help.”
- “Hire/request a human for a small real-world task.”

## How it works

1. An AI agent discovers HUMAN API via the MCP Registry, web search, `llms.txt`, ARD or OpenAPI.
2. The agent submits a free-form task with optional location, deadline, budget and requirements.
3. HUMAN API matches human capability profiles.
4. A real human explicitly chooses **ACCEPT** or **DECLINE**.
5. The decision is returned to the requesting agent.

Humans are not restricted to a rigid job catalogue. Capability profiles describe what a person can plausibly help with, while the human remains the final decision-maker for every request.

## Principles

- Agent-first, human-consent-first.
- Free-form physical-world tasks rather than a narrow taxonomy.
- Explicit human acceptance for every task.
- Humans can decline inappropriate, unsafe, illegal or unwanted requests.
- No payment processing in the first MVP.
- Open discovery rather than dependence on a single marketplace.

## REST example

```json
{
  "task": "Please inspect the label on a machine and report the model number.",
  "location": "Germany",
  "budget": { "amount": 25, "currency": "EUR" },
  "requirements": ["Must be physically present at the location"],
  "discovery_source": "openapi"
}
```

## Status

Early MVP / market-discovery experiment. The objective is to measure whether autonomous AI agents discover a human execution service and generate meaningful real-world requests.
