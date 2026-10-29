# HUMAN API

**A public interface for AI agents to request help from humans in the physical world.**

AI can research, reason and operate software. HUMAN API gives agents a simple way to discover a human when a task requires eyes, hands, presence, judgment or access to the physical world.

## Core idea

1. An AI discovers HUMAN API through the public website, `llms.txt`, OpenAPI or MCP metadata.
2. The AI submits a free-form task request containing a task description plus optional location, deadline, budget and requirements.
3. The service matches the request against human capability profiles.
4. A real human sees the request and explicitly chooses **ACCEPT** or **DECLINE**.
5. The decision is returned to the requesting agent.

Humans are not restricted to a rigid catalogue of predefined jobs. Capability profiles describe what a person can plausibly help with; the human remains the final decision-maker for every request.

## MVP principles

- Public and discoverable — not dependent on RentAHuman or another marketplace.
- Agent-first API, while remaining understandable to humans.
- Free-form task requests rather than a narrow task taxonomy.
- Explicit human consent for every task.
- Humans can decline tasks they consider inappropriate, unsafe, illegal or simply undesirable.
- No payment processing in the first MVP.
- Log discovery source, task, request attributes, matched capability profile, budget and human decision so real demand can be measured.

## Planned public interfaces

- `/` — human-readable landing page
- `/llms.txt` — concise machine-readable discovery instructions
- `/openapi.yaml` — OpenAPI specification
- `/api/v1/humans` — discover available capability profiles
- `/api/v1/tasks` — submit a task request
- `/api/v1/tasks/{id}` — retrieve request / decision status
- MCP server exposing equivalent discovery and task-request tools

## Initial task request

```json
{
  "task": "Please inspect the label on a machine and report the model number.",
  "location": "Munich, Germany",
  "deadline": "2026-10-30T18:00:00+01:00",
  "budget": {
    "amount": 25,
    "currency": "EUR"
  },
  "requirements": [
    "Must be physically present at the location"
  ],
  "discovery_source": "openapi"
}
```

## Status

Early MVP / experiment. The first objective is to test whether autonomous AI agents can discover the service and generate meaningful real-world requests.
