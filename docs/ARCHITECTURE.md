# HUMAN API — MVP Architecture

## Objective

Build the smallest public service that allows an autonomous AI agent to discover a human capability endpoint, submit an open-ended physical-world request and receive an explicit human ACCEPT / DECLINE decision.

The MVP is also an experiment: every request should produce useful demand data.

## Components

### 1. Discovery layer

Expose the same concept through several discovery surfaces:

- human-readable landing page
- `llms.txt`
- OpenAPI 3.1 specification
- MCP server metadata / tools
- search-engine-indexable documentation

Each surface should make the core proposition explicit: **If software cannot complete a task because it needs a person in the physical world, it can ask HUMAN API.**

### 2. Request API

Accept free-form task requests. Avoid forcing agents into a fixed job catalogue.

Useful structured metadata:

- location
- deadline
- budget / currency
- requirements
- requesting agent / client (when supplied)
- discovery source

### 3. Capability profiles

Profiles should be broad enough to aid matching without defining every possible task. Example capability statements:

- can inspect physical objects and report observations
- can photograph an object or location
- can operate ordinary consumer equipment
- can pick up / deliver small items locally
- can attend a location
- can perform technically informed inspection

### 4. Matching

Initial MVP can use simple deterministic filtering plus semantic similarity. It does not need a complex marketplace algorithm.

A match is only a candidate. It is never an acceptance.

### 5. Human decision UI

A matched human receives:

- exact task text
- location
- deadline
- proposed budget
- requirements
- ACCEPT
- DECLINE

Acceptance must be explicit.

### 6. Status API

Agents poll or subscribe to status changes:

`received -> matching -> awaiting_human -> accepted | declined | expired -> completed`

## Demand analytics

Store enough information to answer:

- How did agents discover HUMAN API?
- What did they ask humans to do?
- Where were requests located?
- What budgets did agents propose?
- Which capabilities matched?
- What percentage did humans accept?
- Which requests could not be matched?
- Which request types recur?

This is central to the experiment, not an afterthought.

## MVP technology direction

A lightweight implementation is sufficient:

- TypeScript
- Node.js
- Fastify or a similarly small HTTP framework
- SQLite initially; PostgreSQL when deployed beyond a single instance
- Zod / JSON Schema validation
- MCP SDK for the agent-facing MCP interface

Do not introduce payment infrastructure, complex identity verification, bidding or marketplace mechanics until real request data justifies them.

## Safety / consent boundary

The system should reject clearly illegal, dangerous, coercive or deceptive requests at the service boundary. Beyond that, the human receives enough context to make the final decision and can decline without explanation.
