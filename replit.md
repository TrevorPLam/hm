# Aria AI

A sleek, minimal AI chat app — mobile-first — rivaling ChatGPT, Claude, and Gemini. Powered by GPT-5.4 via Replit AI Integrations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — auto-provisioned via Replit AI Integrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) — primary platform
- API: Express 5 with streaming SSE
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI GPT-5.4 via Replit AI Integrations (no API key required)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app (primary UI)
- `artifacts/api-server/` — Express API server
- `artifacts/api-server/src/routes/openai/` — AI chat routes (streaming)
- `lib/api-spec/openapi.yaml` — API contracts (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/db/src/schema/` — Drizzle DB schema (conversations, messages)
- `lib/integrations-openai-ai-server/` — OpenAI SDK wrapper

## Architecture decisions

- Mobile-first: Expo app is the primary surface. Web can be added as a second artifact later.
- Streaming SSE: AI responses stream token-by-token via Server-Sent Events for real-time feel.
- No auth in MVP: auth to be added later (Clerk or Replit Auth recommended).
- Conversations persisted in PostgreSQL via Drizzle ORM — full history across sessions.
- OpenAPI-first: all API changes go through `lib/api-spec/openapi.yaml` → codegen → typed hooks.

## Product

- Create and manage multiple AI conversations
- Real-time streaming AI responses (GPT-5.4)
- Conversation history persisted to database
- Auto-titles conversations from first message
- Dark/light mode support
- Clean, minimal UI inspired by ChatGPT Mobile and Claude

## User preferences

- Mobile development is the priority.
- Sleek, minimal, professional design.
- Auth not needed in MVP — to be built later.
- Follow the blueprint structure from the attached asset when adding features.

## Gotchas

- Always run codegen after changing `lib/api-spec/openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after changing DB schema
- Use `import { fetch } from 'expo/fetch'` for streaming on mobile — not global fetch
- SSE streaming endpoints cannot use generated React Query hooks — use manual fetch

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/integrations-openai-ai-server/` for OpenAI SDK usage
