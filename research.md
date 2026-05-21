Below is the consolidated, deduplicated, and priority-ranked research agenda extracted from all 16 aspects of the enhanced blueprint. Each item is traceable to its source aspect and includes a suggested priority and cross‑reference to any dependent aspects.

---

# Unified Research Agenda  
*Derived from the 16‑Aspect Enhanced AI Platform Blueprint, May 2026*

## How to use this agenda
- **Aspect:** The original blueprint aspect owning the question.
- **Priority:** **High** – needed before design or implementation can proceed; **Medium** – important but not blocking; **Low** – nice‑to‑have or future‑phase consideration.
- **Dependencies:** Other aspects whose research will influence or be influenced by this item.
- **Suggested approach:** Brief note on how to investigate the question.

---

### Aspect 1 – Deployment & Compute Infrastructure

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 1.1 | ECS Fargate → EKS transition cost: what is the operational and financial tipping point? | High | 2, 3 | Benchmark Fargate at projected load; define trigger metrics (CPU/memory overhead, GPU need, multi‑region requirement). |
| 1.2 | KEDA autoscaling configuration for LLM inference metrics (especially `vllm:num_requests_waiting` and KV cache usage). | High | 4 | Build a test harness with a sample vLLM deployment; measure scale‑up/scale‑down latency under realistic traffic. |
| 1.3 | GPU warm‑start and pre‑pull best practices: what combination of pre‑pulled images, PVC model storage, and streaming loading yields acceptable cold start? | High | 4 | Time cold starts under different configurations; document trade‑offs between image size, storage cost, and startup time. |
| 1.4 | Cross‑region failover for stateful services (PostgreSQL, pgvector, LangGraph checkpoints). | Medium | 2, 5, 7 | Evaluate RPO/RTO achievable with managed cross‑region replication; test failover with read/write workloads. |
| 1.5 | Multi‑cloud portability of GPU inference (AMD MI300X vs. NVIDIA H100) – what software and performance gaps exist? | Medium | 4 | Run the same vLLM workload on both GPU types; measure throughput, TTFT, and operational differences. |
| 1.6 | Container image pre‑pulling and layer caching strategies for AI‑inference pods in Kubernetes. | Medium | 4 | Compare image pull times with and without pre‑pull daemonsets; consider lazy layer loading. |

---

### Aspect 2 – Multi‑Tenancy, Authentication & Data Isolation

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 2.1 | RLS performance with pgvector under high tenant counts (10k+) and hybrid search. | High | 5, 9 | Simulate multi‑tenant pgvector with RLS; measure query latency as tenant count and index size increase. |
| 2.2 | Clerk + WorkOS coexistence model: can both auth providers sit behind a unified middleware? | High | – | Prototype middleware that checks JWT issuer and routes to appropriate provider; document token format differences. |
| 2.3 | Tenant‑resident data architecture: how to enforce storage‑level affinity for EU data residency while keeping services stateless? | Medium | 5, 10 | Design an abstracted storage service that resolves bucket/PVC affinity based on tenant metadata; test with multiple storage backends. |
| 2.4 | Export API design for legal portability (GDPR Article 20): what machine‑readable formats and metadata are expected? | Medium | 7, 15 | Survey legal requirements and enterprise RFPs; design a streaming export endpoint that packages all tenant data. |

---

### Aspect 3 – Model Gateway & Routing

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 3.1 | LiteLLM overhead at realistic RPS (250+): p50/p99 latency and CPU/memory consumption. | High | 1, 8 | Load‑test LiteLLM proxy with multiple model backends; profile under varying concurrency and response sizes. |
| 3.2 | Semantic cache hit rates and false‑positive rates for typical chat and RAG workloads. | High | 5, 6 | Run a three‑tier cache against a representative query corpus; measure hit rate, latency delta, and semantic false‑positive rate. |
| 3.3 | Best policy for compute‑aware rate limiting: how to detect and mitigate model‑switching abuse? | Medium | 1, 10 | Model cold‑load costs; implement a token‑bucket per model+tenant; test against simulated switching abuse. |
| 3.4 | Prompt caching effectiveness with structured system prompts (static prefix, dynamic suffix). | Medium | 8 | Measure TTFT and cost reduction with and without prompt caching across OpenAI, Anthropic, and self‑hosted endpoints. |

---

### Aspect 4 – Inference Engines & Self‑Hosting

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 4.1 | vLLM vs SGLang workload boundaries: precise latency and throughput trade‑offs for interactive vs. batch workloads. | High | 3, 6 | Run a controlled benchmark with identical models (Llama‑3.1‑70B‑FP8) across both engines; measure TTFT, TPOT, and throughput under varying concurrency. |
| 4.2 | CPU inference viability on modern server hardware (64‑core EPYC, Xeon with AMX): which quantized models reach acceptable tok/s for background tasks? | High | 3, 6 | Benchmark llama.cpp + OpenVINO with 7B‑14B models at Q4_K_M; measure decode throughput and TTFT under batch. |
| 4.3 | Reserved GPU economics: what is the cost crossover point for 1‑year reserved H100/H200 instances vs. on‑demand API usage? | High | 1, 12 | Build a TCO model factoring instance cost, utilization rates, and API pricing per million tokens. |
| 4.4 | Model selection evaluation framework: which open‑weight model (DeepSeek V4 Flash, Qwen 3.5, Llama‑4, GLM‑5.1) performs best on the platform’s specific agentic and RAG tasks? | High | 5, 6, 9 | Run the eval harness (Aspect 9) against each candidate model; score on groundedness, faithfulness, and latency. |
| 4.5 | AMD MI300X software maturity for vLLM/SGLang: what gaps remain in operator coverage and performance? | Medium | 1 | Deploy a test vLLM instance on MI300X; validate all required features (prefix caching, FP8, etc.). |
| 4.6 | Model streaming and sleep/wake modes: can vLLM sleep mode reduce idle costs without unacceptable wake latency? | Medium | 1 | Test vLLM sleep mode with a small workload; measure wake latency and memory offload/restore times. |

---

### Aspect 5 – Data Pipeline & RAG Architecture

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 5.1 | Optimal chunk sizes by document type (code, prose, tables). | High | 6, 9 | Run retrieval accuracy benchmarks with different chunk sizes per content type; measure recall@k and groundedness. |
| 5.2 | Retrieval quality under large corpora (>1M chunks): how does hybrid search latency scale? | High | 2 | Populate pgvector with 1M+ chunks; measure end‑to‑end retrieval latency with hybrid+rerank pipeline. |
| 5.3 | Rerank cost vs. quality gains: is cross‑encoder rerank necessary for every query, or can a lightweight threshold filter suffice? | Medium | 6 | A/B test with and without rerank; measure quality (FaithJudge) vs. latency and token cost. |
| 5.4 | Storage design for atomic reindexing: how to invalidate old chunks and replace with new without downtime? | Medium | 2 | Design a transaction‑based swap mechanism; test with concurrent reads. |
| 5.5 | Managed vs. self‑hosted embedding model trade‑offs (cost, latency, privacy) at scale. | Medium | 4 | Compare nomic‑embed‑text‑v1.5 vs. text‑embedding‑3‑small vs. Cohere Embed v4 on retrieval accuracy and cost per million tokens. |

---

### Aspect 6 – Agent Runtime & Tool Integration

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 6.1 | LangGraph state serialization overhead: what state sizes begin to degrade checkpointing latency? | High | 7 | Build a test agent with configurable state size; measure Postgres write latency per checkpoint. |
| 6.2 | Optimal checkpoint retention policy (`keep_last`, TTL) for production reliability. | Medium | 7 | Simulate long conversations; measure storage growth and replay reliability under different policies. |
| 6.3 | MCP server overhead vs. direct Python tool calls: latency and throughput impact. | Medium | 3, 4 | Benchmark an identical tool (web search) as an MCP server vs. direct call; measure TTFT and request completion time. |
| 6.4 | Tool schema design best practices: how to maximize LLM tool‑use accuracy. | Medium | 6 | Review OpenAI/Anthropic/MCP schema guidelines; test alternative schemas for the same tool. |
| 6.5 | Sandbox security guarantees of E2B vs. alternatives: what are the isolation boundaries and escape vectors? | Medium | 10 | Conduct a lightweight security review; test file system and network isolation. |

---

### Aspect 7 – Memory, Context & State Management

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 7.1 | Fact extraction quality: how accurate is end‑of‑conversation extraction, and how do we measure it? | High | 9 | Build a small golden dataset of known user facts; measure precision/recall of extraction pipeline. |
| 7.2 | Memory schema design: what fields are essential for organisational memory vs. user facts? | Medium | 2 | Survey enterprise knowledge management needs; prototype a schema. |
| 7.3 | Retrieval relevance metrics: how to tune the number of injected facts for optimal agent performance. | Medium | 9 | Run A/B tests with 1, 3, 5, and 10 injected facts; measure groundedness and hallucination rate. |
| 7.4 | Memory export format expectations: what formats do enterprise customers expect for portability? | Medium | 2 | Research GDPR compliance guides and enterprise RFP requirements. |

---

### Aspect 8 – Observability, Tracing & Prompt Management

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 8.1 | OTel schema design for agent traces: what span structure best captures LangGraph multi‑step runs? | High | 6 | Design a span structure that represents plan→tool_call→observe→answer; validate in Langfuse. |
| 8.2 | Langfuse integration patterns: does OTLP ingestion cover all required LLM‑specific fields (prompt templates, token counts, tool calls)? | High | 3 | Send a representative agent trace via OTLP; verify all fields are preserved in Langfuse UI. |
| 8.3 | Dashboard split between engineering (GPU/latency) and business (spend/eval scores) stakeholders. | Medium | 12 | Prototype two Grafana dashboards with distinct data sources; get feedback from potential users. |
| 8.4 | Prompt versioning and rollback workflow in CI/CD: how to automate label updates safely. | Medium | 15 | Integrate Langfuse prompt SDK into the deployment pipeline; test canary and rollback. |

---

### Aspect 9 – Evaluation, Quality & Hallucination Control

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 9.1 | Best LLM‑as‑judge architecture per workflow: which judge model and prompt structure yields human‑correlated scores? | High | 6, 8 | Evaluate FaithJudge, GPT‑4, and Claude as judges against a human‑annotated dataset; measure correlation. |
| 9.2 | Claim‑level evaluation methods: how to decompose outputs into atomic claims automatically? | High | 5, 6 | Implement a claim splitter; evaluate precision of atomic claim extraction against human annotation. |
| 9.3 | Conformal prediction applicability: which nonconformity scores (e.g., token entropy, LI scores) yield efficient prediction sets for agent outputs? | Medium | – | Implement TECP or a simple token‑entropy CP; measure coverage and set size on held‑out data. |
| 9.4 | Threshold setting by domain risk: what hallucination/groundedness thresholds are acceptable for high‑stakes (compliance) vs. low‑stakes (creative) tasks? | Medium | 10 | Survey enterprise expectations; define tiered targets. |
| 9.5 | Golden dataset growth strategy: how to efficiently scale from 30 to 10,000 examples without introducing bias. | Medium | 6 | Pilot a semi‑automated annotation pipeline with human review. |

---

### Aspect 10 – Security, Guardrails & Compliance

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 10.1 | Best guardrail stack per workload: NeMo + GLiNER Guard vs. LLM Guard vs. Azure AI Content Safety – which combination optimizes precision/recall for chat and RAG? | High | 3, 6 | Run a red‑team battery against each combination; measure false positive/negative rates and latency. |
| 10.2 | PII scrubbing strategy: GLiNER Guard bi‑encoder vs. Microsoft Presidio vs. ensemble – what is the right balance for performance and coverage? | High | 3 | Test each on a diverse PII dataset; measure detection recall, precision, and inference time. |
| 10.3 | Prompt extraction defense patterns: how effective is the PSM shield against state‑of‑the‑art extraction attacks? | Medium | 6 | Attempt extraction against an agent with and without PSM; measure success rate. |
| 10.4 | Compliance evidence model: what audit trails are needed for SOC 2 Type I and EU AI Act Article 26? | Medium | 8, 15 | Consult a compliance advisor; map required evidence to existing telemetry. |
| 10.5 | Tenant‑configurable guardrails: how to design a policy DSL that is expressive enough for enterprise but safe to administer. | Medium | 14 | Prototype a policy schema; test with example tenant policies. |

---

### Aspect 11 – Frontend & Agent‑Native UX

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 11.1 | AG‑UI integration patterns with LangGraph: what events need to be emitted for a rich tool‑call UI? | High | 6 | Build a sample agent with tool‑call UI; map AG‑UI events to LangGraph state transitions. |
| 11.2 | Multilingual prompt behavior: how does model response quality vary by language? | Medium | 5, 9 | Run the eval harness in multiple languages; compare groundedness and hallucination rates. |
| 11.3 | Accessibility test strategy: which WCAG 2.1 AA criteria are most critical for streaming chat interfaces? | Medium | – | Engage an accessibility auditor; implement automated and manual testing. |
| 11.4 | Structured artifact UX patterns: how to let users edit structured outputs (e.g., generated reports) safely. | Medium | 6 | Prototype editable JSON/table views; test user acceptance. |

---

### Aspect 12 – Go‑to‑Market, Pricing & Moat

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 12.1 | Customer willingness to pay by segment: what are self‑serve vs. enterprise price points? | High | – | Conduct a pricing survey or analyse competitor pricing pages. |
| 12.2 | Best packaging for enterprise vs. self‑serve: per‑seat, per‑token, or hybrid? | High | 3, 8 | Model revenue under different packaging scenarios; evaluate customer simplicity. |
| 12.3 | Price sensitivity across usage tiers: at what token volume do customers churn due to cost? | Medium | 8 | Analyze usage data (if available) or survey benchmarks. |
| 12.4 | Deprecation policy expectations: what notice periods and migration paths do enterprise customers require? | Medium | 13 | Review API deprecation policies of leading platforms. |

---

### Aspect 13 – Previously Unconsidered Dimensions

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 13.1 | Multimodal model integration: which vision/audio model is most practical for Phase 4+ and what are the API/SDK requirements? | Medium | 4, 5 | Evaluate Gemini Omni, GPT‑4.1‑V, and open‑weight alternatives (e.g., Qwen‑VL) on a few agentic use cases. |
| 13.2 | Mobile SDK architecture: how to balance on‑device (LiteRT‑LM) and cloud inference? | Low | 4, 11 | Prototype a hybrid client; measure latency and data privacy trade‑offs. |
| 13.3 | Carbon footprint tracking: what metrics and tooling are acceptable for enterprise sustainability reporting? | Low | 1, 4 | Evaluate tools like CodeCarbon or cloud‑native carbon dashboards; map to expected GPU energy usage. |
| 13.4 | A/B testing framework: how to integrate SimAB or similar for model/prompt experimentation in CI/CD? | Medium | 9 | Deploy a small A/B infrastructure; measure statistical power and minimal detectable effect. |
| 13.5 | Agentic CI/CD (self‑testing agents): can an agent autonomously write and run basic integration tests? | Low | 6, 16 | Experiment with an agent that generates tests for tool definitions; evaluate false negatives. |
| 13.6 | GPU supply chain forecasting: what are the lead time and cost trends for H100/H200 instances over the next 12 months? | Medium | 1 | Subscribe to cloud provider updates and SemiAnalysis reports; build a rolling forecast. |

---

### Aspect 14 – Content Moderation & Safety Architecture

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 14.1 | Moderation classifier selection: Nemotron Content Safety vs. Azure AI Content Safety vs. open‑source alternatives – which yields best precision/recall for custom policies? | High | 10 | Run a head‑to‑head comparison with a set of custom safety policies. |
| 14.2 | Governance UX: how to design a moderation dashboard that supports efficient review queues and policy configuration. | Medium | 11 | Mock up a dashboard; conduct usability testing with prospective moderators. |
| 14.3 | Appeal workflow design: what is the optimal balance between automation and human review? | Medium | 11 | Study existing content moderation workflows (e.g., Discord, Reddit) and adapt. |
| 14.4 | Audit trail structure for moderation: what data must be preserved to satisfy SOC 2 and EU AI Act requirements? | Medium | 10 | Map regulatory requirements to specific log events; implement a retention policy. |

---

### Aspect 15 – Copyright, Ownership & Data Provenance

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 15.1 | Legal positioning by market segment: how do U.S. and EU views on AI output ownership differ, and what contractual language is needed? | High | – | Consult an IP attorney; review recent case law and the EU AI Act. |
| 15.2 | Model card template: what fields are required by the EU AI Act and industry best practices? | High | 9 | Draft a model card based on the Act’s Annex IV and leading templates (e.g., Hugging Face). |
| 15.3 | Provenance metadata schema: how to track training/fine‑tuning data lineage in a CI/CD pipeline. | Medium | 5 | Design a metadata store that records dataset sources, licenses, and processing steps. |
| 15.4 | Copyright complaint handling process: what is the DMCA‑compliant workflow for receiving and acting on infringement claims? | Medium | – | Draft a policy and integrate a reporting form; consult legal. |

---

### Aspect 16 – Red Teaming & Adversarial Testing

| # | Research Question | Priority | Dependencies | Suggested Approach |
|---|---|---|---|---|
| 16.1 | Attack libraries by workflow: what specific OWASP ASI risks apply to the platform’s core agent workflows? | High | 6 | Map each agent workflow to the OWASP ASI categories; generate 5–8 attack scenarios per workflow. |
| 16.2 | Realistic autonomous attack simulation: how well does Dreadnode SDK or an equivalent automated red‑teaming agent generalize to custom tools? | High | 6 | Run Dreadnode against the platform’s tool suite; measure attack success rate and false positives. |
| 16.3 | Automated scoring quality: do automated red‑teaming scorers correlate with expert human judgments? | Medium | 9 | Conduct a blind comparison of automated vs. human severity ratings. |
| 16.4 | Red team cadence by release type: what is the right frequency of manual review vs. automated testing? | Medium | 6 | Define a calendar: PR‑level automated, nightly semi‑automated, quarterly manual. |

---

# Summary Statistics

- **Total research questions:** 68  
- **High priority:** 29  
- **Medium priority:** 33  
- **Low priority:** 6  

This agenda is designed to be executed incrementally, guided by the phases, and owned by the leads responsible for each aspect. All questions map directly back to the blueprint, ensuring that research stays connected to architectural decisions and product milestones.