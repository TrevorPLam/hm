# Enhanced AI Platform Blueprint

**Status:** Final synthesized planning document

**Date:** May 2026

**Purpose:** This document is the canonical, aspect-organized blueprint for planning, researching, and building the repository. It merges the original phased roadmap with the expanded research synthesis into a single reference that can be read one aspect at a time.

**How to use this document:**
- Treat each **Aspect** as a self-contained research module.
- Use the **Phase** labels only as implementation timing guidance.
- Read cross-references when an aspect depends on another.
- Keep detailed notes, benchmarks, and open questions inside each aspect rather than in a separate phase-only plan.

**Organization principle:**
- **Aspect first.**
- **Phase second.**
- **Implementation details third.**

---

## Master Aspect Index

| Aspect | Title | Primary Concern | Suggested Timing |
|---|---|---|---|
| 1 | Deployment & Compute Infrastructure | Hosting, orchestration, scaling, resilience | Phase 1–4 |
| 2 | Multi-Tenancy, Authentication & Data Isolation | Tenant boundaries, identity, access control | Phase 1–3 |
| 3 | Model Gateway & Routing | Unified LLM access, provider abstraction, spend control | Phase 1–3 |
| 4 | Inference Engines & Self-Hosting | Self-hosted and hybrid model serving | Phase 3–4 |
| 5 | Data Pipeline & RAG Architecture | Ingestion, retrieval, freshness, security | Phase 2–4 |
| 6 | Agent Runtime & Tool Integration | LangGraph, tools, MCP, A2A, code execution | Phase 2–4 |
| 7 | Memory, Context & State Management | User memory, organizational memory, checkpointing | Phase 2–4 |
| 8 | Observability, Tracing & Prompt Management | OTel, Langfuse, Grafana, Sentry, prompt ops | Phase 1–3 |
| 9 | Evaluation, Quality & Hallucination Control | Golden datasets, evals, groundedness, uncertainty | Phase 2–4 |
| 10 | Security, Guardrails & Compliance | PII, injection defense, SOC 2, EU AI Act | Phase 1–4 |
| 11 | Frontend & Agent-Native UX | Streaming chat, AG-UI, accessibility, i18n | Phase 1–4 |
| 12 | Go-to-Market, Pricing & Moat | Pricing, packaging, finops, differentiation | Phase 1–4 |
| 13 | Previously Unconsidered Dimensions | Multimodal, mobile, sustainability, A/B testing | Phase 3–5 |
| 14 | Content Moderation & Safety Architecture | Governance, review queues, policy enforcement | Phase 1–4 |
| 15 | Copyright, Ownership & Data Provenance | Output ownership, training data, provenance | Phase 1–4 |
| 16 | Red Teaming & Adversarial Testing | Agentic security, OWASP ASI, attack simulation | Phase 2–4 |

---

## Phase Map at a Glance

| Phase | Strategic Goal | Primary Aspects |
|---|---|---|
| Phase 1 | Foundation: shippable multi-tenant chat with billing, tracing, and core safety | 1, 2, 3, 8, 10, 11, 12, 14, 15 |
| Phase 2 | Knowledge and agents: RAG, tools, memory, eval harness, baseline red-team coverage | 5, 6, 7, 9, 16 |
| Phase 3 | Scale and differentiation: enterprise readiness, routing, observability hardening, moderation governance | 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16 |
| Phase 4 | Self-hosting and vertical depth: hybrid inference, advanced UX, compliance maturity, multimodal expansion | 4, 5, 6, 7, 10, 11, 12, 13, 15, 16 |
| Phase 5+ | Optional long-horizon expansion | 13 and future extensions |

---

# Aspect 1: Deployment & Compute Infrastructure

*Covers: container orchestration, compute choices, scaling, cold start mitigation, operational resilience, GPU supply risk, disaster recovery, and cloud strategy.*

## 1.1 Objective
Build an infrastructure layer that gets the platform running quickly, remains operationally simple at the start, and can evolve without a rewrite as load, GPU demand, and compliance needs increase.

## 1.2 Recommended Direction
- **Phase 1–2:** Start with **AWS ECS Fargate** for application and service workloads.
- **Phase 3+:** Move to **Amazon EKS** when GPU workloads, multi-region requirements, or platform complexity justify Kubernetes.
- **GPU serving:** Use a Kubernetes-native serving abstraction such as **KServe + llm-d** rather than raw vLLM StatefulSets.

## 1.3 Key Decisions
- Prefer managed orchestration first to minimize operational drag.
- Keep the architecture container-native from day one so the later EKS transition is incremental.
- Design around portable state and externalized configuration.
- Keep model-serving workloads isolated from general application workloads.

## 1.4 Autoscaling Strategy
- Use **KEDA** for LLM workloads.
- Scale on real inference pressure, not generic HTTP concurrency.
- Suggested settings:
  - `minReplicas: 1`
  - scale-up stabilization: 60s
  - scale-down stabilization: 300s
- Avoid scaling to zero for GPU-backed inference; cold starts are too costly.
- Keep images pre-pulled and model weights on persistent storage.

## 1.5 Cold Start Mitigation
- Pre-pull container images.
- Store model weights on PVC or equivalent persistent storage.
- Prefer streaming or incremental model loading when supported.
- Track startup time for each model/version explicitly.
- Consider model streaming technologies and sleep/wake modes for later phases.

## 1.6 Operational Resilience
- Define **RTO** and **RPO** for all stateful systems:
  - PostgreSQL
  - vector indexes
  - model weights
  - LangGraph checkpoints
  - tracing and telemetry data
- Plan disaster recovery for both cloud outages and model-serving failures.
- Include backup validation, restore drills, and roll-forward procedures.

## 1.7 Multi-Cloud and Vendor Risk
- Avoid unnecessary cloud lock-in at the API and state layers.
- Use open standards where possible:
  - OpenTelemetry
  - MCP
  - A2A
- Maintain a fallback path to provider-hosted inference when self-hosted capacity is constrained.
- Maintain optionality across GPU providers.

## 1.8 GPU Supply Risk
- Treat GPU capacity as a constrained strategic resource.
- Reserve GPU instances early when entering Phase 4.
- Keep alternative provider relationships in place.
- Design the system so inference can fail over to hosted APIs if GPU capacity disappears.

## 1.9 Dependencies
- Requires clear deployment automation.
- Depends on early decisions in Aspects 2, 3, and 10 for secrets, tenancy, and observability.

## 1.10 Risks
- Cold starts create unacceptable user latency.
- Scaling to zero breaks interactive latency guarantees.
- GPU shortage can delay self-hosting.

## 1.11 Research Agenda
- ECS Fargate vs EKS transition cost.
- KEDA configuration for LLM inference metrics.
- GPU warm-start and pre-pull best practices.
- Cross-region failover for stateful services.

## 1.12 Exit Criteria
- New services deploy reliably.
- Rescaling behavior is measurable.
- Recovery procedures are documented and tested.

---

# Aspect 2: Multi-Tenancy, Authentication & Data Isolation

*Covers: tenant architecture, row-level security, authentication stack, enterprise SSO/SCIM, data residency, sovereignty, PII scrubbing, audit logging, and data portability.*

## 2.1 Objective
Ensure each tenant’s data, usage, and privileges are isolated from day one while supporting enterprise identity and compliance growth later.

## 2.2 Recommended Direction
- Use a **shared-database, shared-schema** model with **PostgreSQL RLS**.
- Resolve the tenant from the JWT in middleware and set a session variable on every connection before query execution.
- Keep tenant-scoped data in explicit tables with `tenant_id`.

## 2.3 Core Schema
- `tenants`
- `users`
- `organizations`
- `memberships`

All tenant-owned data tables should include `tenant_id` and have RLS policies.

## 2.4 Authentication Strategy
- **Phase 1:** Use **Clerk** for authentication and JWT issuance.
- **Phase 3:** Add **WorkOS** for enterprise SSO and SCIM.
- Support both self-serve and enterprise identity flows.

## 2.5 Authorization Strategy
- Enforce organization-level roles:
  - admin
  - editor
  - viewer
- Admins can control model and tool access per organization.
- Authorization checks should happen in API middleware, not only in the UI.

## 2.6 Data Residency and Sovereignty
- Support region-specific deployment of stateful services for tenants with residency requirements.
- Keep tenant-affinity in storage and processing paths.
- Be prepared for EU-only processing rules.

## 2.7 Data Portability
- Provide export APIs for conversations, uploaded files, user facts, billing records, and other tenant data.
- Export formats should be machine-readable.
- Make portability a design requirement, not a later compliance patch.

## 2.8 Auditability
- Log critical tenancy and auth events.
- Support investigation and compliance review.
- Preserve enough history to trace privilege changes and access decisions.

## 2.9 Dependencies
- Depends on deployment and secrets management.
- Feeds into all aspects that store tenant data.

## 2.10 Risks
- Incorrect RLS policies can cause cross-tenant leakage.
- Session-variable handling must be consistent across all DB access paths.
- Enterprise identity requirements can complicate the auth stack.

## 2.11 Research Agenda
- RLS patterns for pgvector-heavy workloads.
- Clerk + WorkOS coexistence model.
- Tenant-resident data architecture.
- Export API design for legal portability requirements.

## 2.12 Exit Criteria
- Tenant isolation is verified in tests.
- Authentication supports self-serve users.
- Enterprise identity is architecturally supported.

---

# Aspect 3: Model Gateway & Routing

*Covers: centralized LLM access, provider management, cost attribution, fallback chains, semantic caching, rate limiting, abuse prevention, and prompt caching.*

## 3.1 Objective
Create a single control plane for all model access so routing, spend, policy, caching, and observability are consistent across the system.

## 3.2 Recommended Direction
- Use **LiteLLM proxy** as the central gateway.
- Run it in a private subnet behind TLS termination.
- Back it with PostgreSQL for persistence and Redis for caching/rate limiting.

## 3.3 Day-One Integration
- `spend_tracker.py` writes usage records to a `model_usage` table.
- `langfuse_logger.py` emits traces for every model call.
- Virtual keys issue API access with quotas and spend tracking.

## 3.4 Multi-Provider Routing
- Support at least two providers per model tier in later phases.
- Define explicit fallback chains.
- Maintain model group aliases for routing.
- Separate tiers by workload class:
  - fast / latency-critical
  - standard / general-purpose
  - reasoning / hardest queries

## 3.5 Tiering Logic
Use a simple rule-based classifier first:
- input length
- task type
- complexity score
- latency sensitivity

Later, introduce a triage model that routes cheap tasks cheaply and escalates only when necessary.

## 3.6 Semantic Caching
Adopt a three-tier cache:
1. exact match
2. semantic match
3. LLM fallback

Potential implementations:
- Redis with vector search
- Valkey-style vector caching
- LangCache

Keep cache-aware prompt design in mind from the beginning.

## 3.7 Prompt Caching
- Place static system content first.
- Append dynamic tool results last.
- Use vendor prompt caching where available.
- Design prompts for stable prefixes.

## 3.8 Rate Limiting and Abuse Prevention
Standard HTTP limits are not enough.
Implement limits for:
- per API key request rate
- per API key tokens/day
- per tenant concurrent requests
- per tenant tool calls/hour
- compute-aware anti-abuse for model switching and cold load amplification

## 3.9 Dependencies
- Requires tenant identity from Aspect 2.
- Feeds usage data into Aspects 8, 9, and 12.

## 3.10 Risks
- Poor routing logic can waste money or hurt latency.
- Cache poisoning can leak or corrupt responses.
- Provider fallback chains can mask failures if not instrumented.

## 3.11 Research Agenda
- LiteLLM overhead at realistic RPS.
- Cache hit rates and semantic false positives.
- Best policy for compute-aware abuse detection.

## 3.12 Exit Criteria
- All model traffic passes through the gateway.
- Spend is tracked per request.
- Routing and fallback are testable and observable.

---

# Aspect 4: Inference Engines & Self-Hosting

*Covers: self-hosted model serving, vLLM/SGLang/NIM evaluation, CPU inference tier, model selection, hybrid architecture, cold start, and economic thresholds.*

## 4.1 Objective
Build an inference strategy that supports API-first velocity early and self-hosted economics later without fragmenting the platform.

## 4.2 Recommended Direction
- **Default self-hosted engine:** **vLLM**
- **Batch/RAG-heavy engine:** **SGLang** when its throughput advantage matters
- **Enterprise fallback:** hosted frontier APIs
- **CPU tier:** llama.cpp + OpenVINO for lightweight workloads

## 4.3 vLLM Configuration
- `--enable-prefix-caching`
- `--kv-cache-dtype fp8`
- `--gpu-memory-utilization 0.85`

Use conservative GPU headroom for KV growth and stability.

## 4.4 SGLang Use Cases
Use SGLang for:
- batch inference
- multi-turn agent serving
- prefix-heavy RAG pipelines
- workloads that benefit from high cache hit rates

## 4.5 Alternatives
- **TensorRT-LLM:** best raw latency/throughput, but high compilation cost and lower flexibility.
- **NVIDIA NIM:** useful when enterprise support is required.
- **TGI:** not preferred for new deployments.

## 4.6 CPU Inference Tier
A CPU tier can serve quantized models for:
- background tasks
- simple classification
- batch workflows
- low-cost assistant functions

Use cases:
- non-interactive jobs
- simple extraction
- triage and routing

## 4.7 Model Landscape
Evaluate open-weight models based on:
- capability
- licensing
- deployability
- ecosystem support
- memory footprint

Candidates include:
- DeepSeek V4 Flash
- Qwen 3.5
- GLM-5.1
- Kimi K2.6
- Llama-family models where licensing allows

## 4.8 Hybrid Architecture
Route traffic across:
- self-hosted vLLM for most traffic
- API providers for burst/fallback
- frontier models for hardest cases
- CPU tier for background jobs

## 4.9 Economic Trigger
Treat self-hosting as economics-driven, not calendar-driven.
Trigger when:
- monthly hosted spend reaches roughly the $8k–$10k range
- privacy requirements demand it
- usage profile justifies reserved compute

## 4.10 Dependencies
- Depends on gateway routing from Aspect 3.
- Depends on deployment scaling from Aspect 1.
- Feeds all agent and RAG workloads.

## 4.11 Risks
- High cold-start cost.
- Model licensing restrictions.
- Capacity shortages.
- Overbuilding self-hosting too early.

## 4.12 Research Agenda
- vLLM vs SGLang workload boundaries.
- CPU tier viability on modern server hardware.
- Best model choice by license and capability.
- Reserved GPU economics.

## 4.13 Exit Criteria
- A self-hosted path exists and is benchmarked.
- The platform can fall back to APIs gracefully.
- Model selection is tied to economics and workload type.

---

# Aspect 5: Data Pipeline & RAG Architecture

*Covers: ingestion, chunking, embedding, hybrid retrieval, reranking, workspace knowledge, document security, freshness, and licensing considerations.*

## 5.1 Objective
Create a reliable document pipeline that turns tenant-owned files into grounded retrieval context with security and freshness built in.

## 5.2 Recommended Direction
- Use a **pre-signed URL** upload flow directly to object storage.
- Process uploads asynchronously with a task queue.
- Filter and validate content before embedding.

## 5.3 Supported Inputs
- PDF
- DOCX
- Markdown
- plain text
- code files

Reject unsupported media cleanly unless a later multimodal aspect introduces support.

## 5.4 Preprocessing Controls
Before embedding:
- enforce file size limits
- enforce content-type filtering
- perform initial PII scanning
- reject non-text content if unsupported

## 5.5 Chunking Strategy
Chunking should be configurable by document type and use case.
Suggested defaults:
- short-answer QA: 256 tokens / 32 overlap
- general text: 512 / 64
- long-document summarization: 1024 / 128
- code: AST-aware splitting
- tables: row-aware chunking

Implement a chunking strategy registry rather than a single universal splitter.

## 5.6 Embedding Strategy
Initial recommendation:
- use a managed embedding model for Phase 2 speed
- switch to a self-hosted embedding model once cost or privacy needs justify it

Ensure the embedding model is compatible with vector storage and tenant isolation.

## 5.7 Storage and Indexing
- PostgreSQL + pgvector
- HNSW indexing
- tenant-scoped access through RLS

## 5.8 Hybrid Retrieval
Combine:
1. dense retrieval
2. sparse retrieval via `tsvector` / BM25-style scoring
3. rank fusion
4. reranking with a cross-encoder
5. diversity control via MMR

## 5.9 Document Security
- Tag all documents with tenant-scoped metadata.
- Filter retrieval through tenant isolation.
- Consider document-level ACLs where organizations need internal segmentation.

## 5.10 Freshness and Re-Ingestion
- When a source document changes, re-chunk and re-embed.
- Invalidate prior chunks atomically.
- Trigger updates via webhook or storage event.

## 5.11 Dependencies
- Depends on tenancy isolation.
- Feeds agent grounding, memory, and evals.

## 5.12 Risks
- Bad chunking degrades retrieval quality.
- Security filters can be bypassed if not applied consistently.
- Large corpora can stress search latency.

## 5.13 Research Agenda
- Best chunk sizes by content type.
- Retrieval quality under large corpora.
- Rerank cost versus quality gains.
- Storage design for reindexing correctness.

## 5.14 Exit Criteria
- Documents ingest reliably.
- Retrieval is grounded and tenant-safe.
- Updates reflow through the retrieval index correctly.

---

# Aspect 6: Agent Runtime & Tool Integration

*Covers: LangGraph architecture, ReAct loop, tool definition, MCP protocol, A2A interoperability, bounded loops, failure recovery, code execution, and sub-graph patterns.*

## 6.1 Objective
Build a modular agent runtime that can plan, act, observe, recover, and scale into specialized workflows without turning into an unbounded autonomous loop.

## 6.2 Recommended Direction
- Use **LangGraph** as the core agent runtime.
- Structure the base graph as:
  - plan
  - tool_call
  - observe
  - answer
- Use state carefully and keep it compact.

## 6.3 Core State
Typical state fields:
- messages
- tool_calls
- error_count
- last_error
- token_budget
- current_step

Every checkpointed field should earn its place.

## 6.4 State Discipline
The key rule is that all state is serialized on each checkpoint write.
So:
- write only what matters
- select only what the current step needs
- compress long outputs
- isolate sub-tasks into sub-agents when helpful

## 6.5 Checkpointing
- Use Postgres-backed checkpointing.
- Retain a bounded history.
- Support replay, debugging, and human-in-the-loop workflows.

## 6.6 Tool Integration Standard
Expose tools through **MCP** servers.
Benefits:
- independently testable tools
- reusable across graphs
- changeable without agent restarts
- forward-compatible with enterprise tool ecosystems

## 6.7 Multi-Agent Coordination
Use **A2A** when specialized agents need to collaborate.
Use LangGraph subgraphs first.
Move to A2A when agents become distinct services or frameworks.

## 6.8 Bounded Agent Loop
Implement hard limits on:
- tool calls per turn
- tokens consumed
- repeated self-looping
- reflection failures

If the agent is stuck, force summarize and exit.

## 6.9 Failure Recovery
Classify errors as:
- transient
- permanent
- partial success

Typical behavior:
- retry transient errors with backoff
- fail fast on permanent errors
- preserve useful partial results

## 6.10 Code Execution Sandbox
Use an isolated execution environment such as **E2B** or an equivalent Firecracker-style sandbox.
Requirements:
- ephemeral
- network-isolated by default
- per-run isolation
- clear boundaries for tool-generated code

## 6.11 Dependencies
- Depends on gateway and observability.
- Depends on data retrieval and memory.

## 6.12 Risks
- runaway loops
- state bloat
- tool abuse
- unbounded side effects

## 6.13 Research Agenda
- State serialization overhead.
- Best checkpoint retention policy.
- Tool schema design.
- Sandbox security guarantees.

## 6.14 Exit Criteria
- The runtime can complete bounded tasks reliably.
- Tools are modular and observable.
- Replays are possible.

---

# Aspect 7: Memory, Context & State Management

*Covers: user memory extraction, semantic memory, conversation state, checkpointing, proprietary context accumulation, and data export.*

## 7.1 Objective
Accumulate useful context over time without letting memory become noisy, unsafe, or expensive.

## 7.2 Recommended Direction
Store memory in structured form, not only as raw transcript history.
Separate:
- user facts
- org knowledge
- conversation checkpoint state
- ephemeral run state

## 7.3 User Memory
Use a background worker to extract short, atomic facts such as preferences or recurring user context.
Store facts in a tenant-scoped table keyed by user and organization.
Embed these facts for semantic retrieval and inject them into the system prompt as known context.

## 7.4 Organizational Memory
Maintain a distinct organizational memory layer for:
- brand voice
- style guides
- terminology
- past decisions
- project history
- client relationships

This is a durable moat and should be designed intentionally.

## 7.5 Conversation State
Use LangGraph checkpointing for durable conversation continuation and replay.
Treat transient tool outputs differently from durable memory.

## 7.6 Memory Retrieval
Retrieve only what is relevant to the current task.
Prefer compact, high-signal context.
Use compression and summarization when memory grows.

## 7.7 Data Portability
Memory must be exportable per tenant in machine-readable form.
This applies to user facts, org memory, and conversation history.

## 7.8 Dependencies
- Depends on tenancy and storage.
- Feeds the agent runtime and RAG prompts.

## 7.9 Risks
- Memory poisoning.
- Over-injection of stale context.
- Privacy leakage.
- Unbounded growth.

## 7.10 Research Agenda
- Fact extraction quality.
- Memory schema design.
- Retrieval relevance metrics.
- Export format expectations.

## 7.11 Exit Criteria
- Memory improves future responses.
- Export is feasible.
- Context remains bounded and relevant.

---

# Aspect 8: Observability, Tracing & Prompt Management

*Covers: tracing, logging, OpenTelemetry, Langfuse, cost monitoring, prompt versioning, Grafana dashboards, and drift detection.*

## 8.1 Objective
Create one observability fabric that supports engineering, product, compliance, and cost analysis without duplicating instrumentation.

## 8.2 Recommended Direction
Use **OpenTelemetry** as the base instrumentation layer.
Send the resulting telemetry to:
- **Langfuse** for LLM-specific tracing
- **Grafana** for metrics and operations
- **Sentry** for errors and performance monitoring

## 8.3 What to Trace
- model calls
- tool calls
- retrieval chunks
- prompt versions
- token usage
- latency
- failures and retries
- user feedback events

## 8.4 Prompt Management
- Version prompts.
- Label prompts by environment or release channel.
- Keep stable prefixes cache-friendly.
- Support webhook-driven updates if needed.

## 8.5 Cost Tracking
Per-request and per-tenant cost visibility should be available from day one.
Feed usage data into both gateway accounting and later FinOps reporting.

## 8.6 Drift Detection
Track performance and quality drift over time, including:
- groundedness
- hallucination rate
- refusal behavior
- tool-use failure rate
- eval scores by workflow

## 8.7 Dashboards
At minimum, build dashboards for:
- GPU utilization
- KV cache usage
- queue depth
- latency p50 / p95 / p99
- spend per tenant
- retrieval success rate
- eval trendlines
- drift alerts

## 8.8 Dependencies
- Depends on the gateway, agent runtime, and eval harness.

## 8.9 Risks
- instrumentation overhead
- missing trace coverage
- duplicate telemetry pipelines
- expensive cardinality in metrics

## 8.10 Research Agenda
- OTel schema design for agent traces.
- Langfuse integration patterns.
- Best dashboard split between engineering and business users.

## 8.11 Exit Criteria
- Every important request is traceable.
- Cost is visible.
- Prompt changes are versioned and auditable.

---

# Aspect 9: Evaluation, Quality & Hallucination Control

*Covers: eval harness, groundedness, hallucination detection, conformal prediction, GEDD methodology, drift detection, and regression control.*

## 9.1 Objective
Make quality measurable enough that prompt, model, graph, and retrieval changes can be treated like software changes with a testable risk envelope.

## 9.2 Recommended Direction
- Build an eval harness early.
- Use golden datasets per workflow.
- Treat quality regressions as blocking issues.
- Evaluate both correctness and groundedness.

## 9.3 Core Metrics
Track at least:
- hallucination rate
- groundedness score

Recommended targets should vary by use case and risk level.

## 9.4 GEDD Workflow
Use a grounded, iterative evaluation method:
1. define agent spec
2. fracture the domain
3. write golden queries
4. run eval against models
5. annotate responses
6. discover error patterns
7. map causal relationships
8. generate rubrics
9. generate judge prompts
10. calibrate judge vs human
11. deploy automated judges

## 9.5 Hallucination Control
Do not rely on embedding similarity alone.
Use a combination of:
- grounded retrieval
- claim decomposition
- LLM-as-judge
- structured rubrics
- human review for high-stakes cases

## 9.6 Uncertainty and Abstention
Integrate calibrated uncertainty methods so the system can admit uncertainty when appropriate.
Prefer methods that provide actual guarantees rather than informal heuristics.

## 9.7 Dataset Growth
- Phase 2: start with a small curated set.
- Phase 3: expand substantially.
- Phase 4: maintain a large living dataset tied to real workflows.

## 9.8 CI Integration
- run evals when prompts, models, or graph nodes change
- block merges on meaningful regressions
- keep the harness lightweight enough to fit normal development

## 9.9 Dependencies
- Depends on observability and routing.
- Feeds governance, moderation, and red teaming.

## 9.10 Risks
- weak golden datasets
- overfitting to benchmarks
- judge bias
- false confidence in partial metrics

## 9.11 Research Agenda
- best judge architecture by workflow
- claim-level evaluation methods
- conformal prediction applicability
- threshold setting by domain risk

## 9.12 Exit Criteria
- Quality is visible and repeatable.
- Regression detection is part of normal development.
- A single workflow can be evaluated end to end.

---

# Aspect 10: Security, Guardrails & Compliance

*Covers: PII redaction, prompt injection defense, guardrail architecture, SOC 2 readiness, regulatory compliance, audit logging, and AI-specific rate limiting.*

## 10.1 Objective
Protect the platform from unsafe inputs, unsafe outputs, unsafe actions, and compliance failure.

## 10.2 Recommended Direction
Use a layered defense model.
Do not rely on a single safety mechanism.

## 10.3 Guardrail Layers
### Text-layer guardrails
Use classifiers and policy layers for prompt injection, harmful content, and PII detection.

### Execution-layer guardrails
Enforce budgets, action limits, and policy checks before tools or side effects execute.

### Application-layer guardrails
Require human intervention for high-risk or high-stakes actions.

## 10.4 AI-Specific Abuse Prevention
Standard HTTP rate limiting is not enough.
Protect against:
- DDoS amplification through cheap requests that trigger expensive model calls
- repeated model-switching that thrashes compute
- abuse of tool calls and background tasks

## 10.5 Compliance Framework
Plan for:
- GDPR
- CCPA/CPRA
- EU AI Act
- SOC 2

Key concerns:
- data transparency
- data provenance
- risk monitoring
- auditability

## 10.6 SOC 2 Strategy
- Start readiness in Phase 3.
- Budget for Type I.
- Treat Type II as a continuing control program.
- Preserve evidence and access logs early enough to make audit feasible.

## 10.7 Prompt Extraction and Injection Defense
Treat all user inputs and retrieved content as untrusted.
Add defenses for:
- prompt injection
- jailbreaks
- prompt extraction
- tool-output manipulation
- malicious retrieval content

## 10.8 Audit Logging
Log:
- important user actions
- model decisions
- tool calls
- policy interventions
- human review actions

## 10.9 Dependencies
- Depends on tenancy, observability, and agent runtime.

## 10.10 Risks
- false positives that degrade UX
- false negatives that allow abuse
- compliance gaps from incomplete audit trails
- policy drift across tenants

## 10.11 Research Agenda
- best guardrail stack per workload
- PII scrubbing strategy
- prompt extraction defense patterns
- compliance evidence model

## 10.12 Exit Criteria
- safety is enforced at multiple layers
- audit trails exist for important events
- rate limiting and abuse controls are tenant-aware

---

# Aspect 11: Frontend & Agent-Native UX

*Covers: streaming chat, AG-UI protocol, structured outputs, A2UI, generative UI, internationalization, and accessibility.*

## 11.1 Objective
Make the product feel like an agent-native system, not just a chat wrapper.

## 11.2 Recommended Direction
- **Phase 1–2:** Use **Vercel AI SDK `useChat`** for the fastest working streaming chat.
- **Phase 3:** Introduce **AG-UI** for structured agent-user interaction.
- **Phase 4:** Layer in richer generative UI and editable structured artifacts.

## 11.3 UX Principles
Show users:
- what the agent is doing
- what it has retrieved
- what tools it used
- what is editable
- what is still uncertain

## 11.4 AG-UI Goals
AG-UI should standardize:
- streaming events
- tool call events
- shared state between app and agent
- human-in-the-loop interactions
- generative UI components

## 11.5 Structured Outputs
Whenever possible, use structured schemas instead of free-form text.
This improves:
- reliability
- editability
- downstream automation
- testing

## 11.6 Internationalization
Plan for multilingual support from Phase 3.
Use standard localization libraries and make model responses language-aware.

## 11.7 Accessibility
Target WCAG 2.1 AA for enterprise and government readiness.
Automated checks are not enough; manual audits are required.

## 11.8 Dependencies
- Depends on the runtime, evals, and moderation.

## 11.9 Risks
- hidden agent activity
- inaccessible components
- poor localization quality
- brittle UI around streaming state

## 11.10 Research Agenda
- AG-UI integration patterns
- multilingual prompt behavior
- accessibility test strategy
- structured artifact UX patterns

## 11.11 Exit Criteria
- users can follow agent progress
- outputs are editable when appropriate
- the UI is accessible and localization-ready

---

# Aspect 12: Go-to-Market, Pricing & Moat

*Covers: pricing model, consumption vs outcome-based pricing, enterprise trust, competitive differentiation, team structure, FinOps, and lifecycle policy.*

## 12.1 Objective
Define a business model and operating structure that supports long-term retention, enterprise trust, and measurable profitability.

## 12.2 Recommended Direction
Use a **hybrid pricing model**:
- subscription for platform access
- consumption for AI usage

This avoids the weaknesses of pure outcome-based pricing while still capturing usage growth.

## 12.3 Phase 1 Pricing
- free tier with token cap
- paid tier with higher limits or overage pricing

## 12.4 Phase 3+ Pricing
- organization-level plans
- per-seat plus consumption
- usage reporting by tenant, team, and model

## 12.5 FinOps
Treat AI spend as a first-class governance target.
Track:
- cost per inference
- cost per workflow
- cost per tenant
- cost per model
- cost per outcome where relevant

## 12.6 Moat Dimensions
The durable moat comes from:
- workflow depth
- proprietary memory
- agent-native UX
- enterprise trust
- evaluation IP
- integration depth
- multi-agent orchestration

## 12.7 Team Structure
A plausible team progression:
- Phase 1: small core team
- Phase 2–3: add MLOps, frontend, and domain expertise
- Phase 4: dedicated platform and security/compliance capability

## 12.8 API Lifecycle
Use a disciplined deprecation policy:
- notice
- deprecated
- obsolete

Keep backward compatibility for `/v1/` where possible.

## 12.9 Dependencies
- depends on usage tracking and observability
- depends on enterprise trust and compliance posture

## 12.10 Risks
- underpricing usage
- overpromising outcomes
- insufficient cost visibility
- weak differentiation

## 12.11 Research Agenda
- customer willingness to pay by segment
- best packaging for enterprise vs self-serve
- price sensitivity across usage tiers
- deprecation policy expectations

## 12.12 Exit Criteria
- the pricing model is rational and measurable
- the org structure matches the platform complexity
- the moat is tied to real product behavior, not branding

---

# Aspect 13: Previously Unconsidered Dimensions

*Covers: multimodal, plugin marketplace, mobile/on-device SDK, environmental sustainability, A/B testing, CI/CD for AI agents, GPU supply chain, customer feedback, and AI explainability.*

## 13.1 Objective
Capture the strategic areas that were not central in the original roadmap but matter for a 2026-grade platform.

## 13.2 Multimodal Capabilities
Plan for future support of:
- images
- documents with vision understanding
- audio transcription
- video understanding

Treat this as a Phase 4+ concern unless a specific product need makes it urgent earlier.

## 13.3 Plugin Ecosystem
Design the tool and connector architecture so future marketplace distribution is possible.
MCP is the foundation for third-party integration.

## 13.4 Mobile and On-Device SDK
A mobile SDK should eventually support hybrid on-device/cloud inference paths.
Useful for:
- mobile assistants
- low-latency edge features
- privacy-sensitive workflows

## 13.5 Sustainability
Track energy and carbon concerns where enterprise buyers care.
A CPU tier and quantization help reduce energy use.

## 13.6 A/B Testing
Build a framework to compare:
- models
- prompts
- retrieval strategies
- workflow variants
- agent graphs

## 13.7 CI/CD for AI Agents
The deployment pipeline should include:
- deterministic tests
- eval suite checks
- regression gates
- drift detection
- lightweight agentic test cases

## 13.8 GPU Supply Chain
Treat accelerator access as a supply-chain issue, not just a cloud bill issue.
Maintain contingency plans and alternate hardware options.

## 13.9 Customer Feedback
Establish a feedback loop from the UI back into evaluation and product iteration.
Track:
- thumbs up/down
- regeneration requests
- explicit corrections
- resolution completion

## 13.10 Explainability and Transparency
Provide:
- citation trails
- decision explanations
- confidence indicators
- audit logs

## 13.11 Dependencies
- spreads across many aspects
- becomes more important as the product matures

## 13.12 Risks
- scope creep
- premature platformization
- noisy experimentation

## 13.13 Research Agenda
- which future capabilities are strategically relevant
- what can be deferred safely
- what requires architectural preparation now

## 13.14 Exit Criteria
- the platform has a clear path to advanced capabilities without redesigning core architecture

---

# Aspect 14: Content Moderation & Safety Architecture

*Covers: dedicated content moderation subsystem, policy-driven enforcement, moderation taxonomy, human review integration, appeal workflows, audit trails, and the distinction between guardrails and moderation.*

## 14.1 Objective
Separate real-time safety blocking from post-hoc moderation governance so the platform can enforce policy, manage disputes, and support tenant-specific rules.

## 14.2 Recommended Direction
Build a dedicated moderation subsystem in parallel with guardrails.

## 14.3 Three-Tier Moderation Model
### Tier 1: Automated classification
Use fast classifiers to detect harmful or disallowed content.

### Tier 2: Policy engine and confidence governance
Route content based on tenant policy and track cumulative moderation confidence over time.

### Tier 3: Human review, appeals, and audit
Support moderation review queues, appeal handling, and policy change history.

## 14.4 Tenant-Configurable Policies
Each tenant may define its own:
- acceptable use policy
- severity thresholds
- escalation requirements
- review ownership

## 14.5 Distinction from Guardrails
- **Guardrails**: real-time request/response boundary protection.
- **Moderation**: governance, policy administration, review, and reporting.

## 14.6 Implementation Timing
- Phase 1–2: baseline filtering
- Phase 3: policy engine, confidence governance, moderation dashboard
- Phase 3+: appeals, escalation, tenant-specific governance

## 14.7 Dependencies
- depends on security, observability, and tenancy

## 14.8 Risks
- policy inconsistency
- moderation bottlenecks
- false escalations
- tenant policy complexity

## 14.9 Research Agenda
- moderation classifier selection
- governance UX
- appeal workflow design
- audit trail structure

## 14.10 Exit Criteria
- moderation is policy-driven and auditable
- review and escalation are operationally usable

---

# Aspect 15: Copyright, Ownership & Data Provenance

*Covers: AI output ownership, copyright liability allocation, indemnification architecture, training data copyright risk, data provenance documentation, model cards, and EU AI Act data governance requirements.*

## 15.1 Objective
Make the platform legally credible for enterprise usage by clarifying ownership, provenance, and copyright risk handling.

## 15.2 Recommended Direction
Use a balanced legal model that becomes more provider-centric as the platform matures.

## 15.3 Output Ownership
Clarify in terms that:
- the platform owns the service and models
- customers own their inputs
- outputs are owned or licensed to the extent permitted by law and contract
- the platform may use anonymized service data for improvement where allowed

## 15.4 Indemnification Architecture
Offer output copyright indemnification with clear carve-outs.
Define when indemnity does not apply, including cases involving:
- known infringement risk
- disabled safety or citation features
- third-party modifications
- unlawful inputs
- trademark-related claims

## 15.5 Training Data Risk
Any fine-tuning data should have documented:
- source
- license
- acquisition method

Avoid pirated or unclear-source datasets.
Respect robots.txt and copyright signals in web retrieval.

## 15.6 Provenance Documentation
Track data lineage for:
- training
- validation
- testing
- deployment

Model cards should document purpose, data sources, performance, limitations, bias, and oversight.

## 15.7 Dependencies
- depends on ingestion, web search, and compliance architecture

## 15.8 Risks
- legal ambiguity
- poor provenance tracking
- inconsistent customer warranties
- weak retrieval logging

## 15.9 Research Agenda
- legal positioning by market segment
- model card template
- provenance metadata schema
- copyright complaint handling process

## 15.10 Exit Criteria
- provenance is documented
- ownership terms are explicit
- compliance evidence can be produced

---

# Aspect 16: Red Teaming & Adversarial Testing

*Covers: systematic adversarial testing, OWASP ASI 2026 framework, agentic red teaming methodology, automated red teaming agents, continuous adversarial testing in CI/CD, and integration with the eval harness.*

## 16.1 Objective
Treat agent security as an ongoing adversarial process, not a one-time checklist.

## 16.2 Recommended Direction
Build red teaming as a parallel discipline to quality evaluation.

## 16.3 Risk Framework
Use the OWASP agentic risk categories as the basis for threat modeling and test coverage.
These should include, at minimum:
- goal hijack
- tool misuse
- identity abuse
- supply chain compromise
- unexpected code execution
- memory poisoning
- inter-agent compromise
- cascading failures
- human trust exploitation
- rogue agents

## 16.4 Red Team Methodology
Follow a closed loop:
1. reconnaissance
2. threat modeling
3. layered attack execution
4. verification
5. reporting
6. hardening
7. retesting

## 16.5 Attack Layers
Test across:
- single-turn attacks
- multi-turn attacks
- memory-persistent attacks
- multi-agent attacks

## 16.6 Automation
Use automated red teaming frameworks to generate attacks, transforms, and scorers.
Run focused tests on changes and broader suites on release boundaries.

## 16.7 Integration with Evaluation
Evaluation and red teaming are related but distinct.
- **Eval** asks: is it correct?
- **Red team** asks: can it be broken or abused?

## 16.8 CI/CD Placement
- pre-commit: lightweight injection checks
- PR: targeted adversarial tests on changed agent logic
- nightly: broader suites
- pre-release: manual review plus comprehensive automation

## 16.9 Defensive Principles
- treat all natural-language inputs as untrusted
- enforce least privilege
- separate planning from execution
- instrument memory and tool calls
- design rollback and kill switches early

## 16.10 Dependencies
- depends on agent runtime, security, and eval harness

## 16.11 Risks
- shallow test coverage
- false security confidence
- missing memory and multi-agent attack classes

## 16.12 Research Agenda
- attack libraries by workflow
- realistic autonomous attack simulation
- automated scoring quality
- red team cadence by release type

## 16.13 Exit Criteria
- adversarial testing is continuous, not sporadic
- security issues are reproducible and trackable
- major releases cannot bypass adversarial scrutiny

---

# Consolidated Decision Matrix

| Design Choice | Recommended Option |
|---|---|
| Container orchestration (Phase 1) | ECS Fargate |
| GPU serving abstraction | KServe + llm-d + vLLM |
| Inference engine (default) | vLLM |
| Inference engine (batch/RAG) | SGLang |
| CPU inference tier | llama.cpp + OpenVINO |
| Self-hosted model starting point | DeepSeek V4 Flash or Qwen 3.5 72B |
| Self-hosting trigger | Roughly $8k–$10k/month hosted spend, privacy, or capacity need |
| Semantic caching | Exact → semantic → LLM |
| Tool integration standard | MCP |
| Agent-to-agent protocol | A2A |
| Agent-native UX protocol | AG-UI |
| Hallucination detection | LLM-as-judge plus grounded claim evaluation |
| Uncertainty quantification | Conformal prediction style methods |
| PII/safety detection | Fast guardrails plus policy engine |
| Prompt management | Langfuse + OTel-native tracing |
| Pricing model | Subscription + consumption hybrid |
| SOC 2 readiness | Begin in Phase 3 |
| Regulatory framework | GDPR + EU AI Act + auditability |
| Drift detection | Continuous monitoring with eval trendlines |
| CI/CD for agents | Deterministic tests + evals + lightweight red teaming |
| GPU supply risk | Multi-provider reservation + API fallback |
| A/B testing | Model/prompt/graph experimentation |
| WCAG compliance | WCAG 2.1 AA |
| Mobile SDK | On-device/cloud hybrid roadmap |

---

# Research and Implementation Guidance

## How to conduct deep research
When researching one aspect, use this pattern:
- define the scope boundaries
- collect evidence only relevant to that aspect
- identify alternatives
- write down the recommended path
- record unresolved questions
- map dependencies to other aspects

## What to keep out of each aspect
Do not repeat the same implementation detail in multiple places unless the aspect truly owns it.
Instead, cross-reference:
- tenancy and RLS
- observability and tracing
- cost tracking
- provenance
- guardrails
- evaluation

## How to use phases
Phases are implementation timing labels, not the main document structure.
Each aspect should note:
- what belongs in Phase 1
- what can wait until Phase 2
- what must mature by Phase 3
- what is reserved for Phase 4+

---

# Final Recommendation

This document should now function as the canonical blueprint for the repository:
- **Aspect-organized** for deep research
- **Phase-aware** for implementation planning
- **Detailed enough** to support design decisions
- **Modular enough** to isolate workstreams
- **Comprehensive enough** to incorporate the older roadmap without losing its implementation intent

---

*End of document.*
