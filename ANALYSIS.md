# Repository Analysis

## Scope
This document is based on the current repository snapshot and the actual source/config files in the workspace. Generated artifacts were inspected where present, but this analysis does **not** rely on repository prose as the source of truth.

## Executive summary
This repository is a pnpm-managed monorepo with five active runtime areas:

- `apps/api` — an Express API server that exposes health and conversation/chat endpoints.
- `apps/mobile` — an Expo Router chat app with a conversation list, chat screen, streaming assistant replies, and a static Expo deployment pipeline.
- `packages/db` — Drizzle schema and database connection code for PostgreSQL.
- `packages/api-spec`, `packages/api-client`, `packages/api-zod` — the OpenAPI source of truth plus generated TypeScript client/hooks and Zod schemas.
- `lib/integrations-openai-ai-server` — a helper package wrapping the OpenAI SDK for chat, image, audio, and batch utilities.
- `packages/ui` — a large web-only component library that currently does not appear to be consumed by the mobile or API apps.

There are also empty scaffolds for `services/` and `infra/`, plus several root-level build, deployment, and workspace configuration files.

## Repository map

### Root
- `package.json` — root scripts, pnpm enforcement, workspace build/typecheck orchestration.
- `pnpm-workspace.yaml` — workspace package globs, supply-chain release-age policy, pnpm catalog versions, overrides.
- `pnpm-lock.yaml` — lockfile.
- `tsconfig.base.json` — shared TypeScript compiler baseline.
- `tsconfig.json` — root project references.
- `.npmrc` — pnpm peer dependency behavior.
- `.replit` — Replit runtime/deployment configuration and port mappings.
- `.neon` — Neon org metadata only.
- `.windsurf/` — workflow/rule documentation for the coding environment.
- `apps/`, `packages/`, `lib/`, `scripts/`, `infra/`, `services/` — workspace structure.

### `apps/api`
- `src/index.ts` — server entry point.
- `src/app.ts` — Express app wiring.
- `src/routes/health.ts` — health endpoint.
- `src/routes/openai/conversations.ts` — conversation CRUD and streaming message route.
- `src/lib/logger.ts` — pino logger configuration.
- `build.mjs` — esbuild bundling to `dist/`.
- `dist/` — generated build output.

### `apps/mobile`
- `app/_layout.tsx` — Expo Router root layout, providers, font loading, splash gating.
- `app/index.tsx` — conversation list/home screen.
- `app/chat/[id].tsx` — chat detail screen.
- `app/chat/_layout.tsx` — chat route stack config.
- `app/+not-found.tsx` — 404 screen.
- `components/` — native UI building blocks for chat and list UX.
- `hooks/useColors.ts` and `constants/colors.ts` — theme selection and palette.
- `lib/api.ts` — manual SSE chat helper and API URL resolution.
- `metro.config.js` — pnpm/workspace Metro resolution.
- `scripts/build.js` — static Expo build pipeline.
- `server/serve.js` — static Expo deployment server.
- `server/templates/landing-page.html` — Expo Go landing page.
- `app.json`, `babel.config.js`, `tsconfig.json`, `expo-env.d.ts` — Expo/TypeScript configuration.
- `assets/images/icon.png` — app icon and splash asset.

### `packages/api-spec`
- `openapi.yaml` — authoritative API contract.
- `orval.config.ts` — generator config for client and Zod outputs.

### `packages/api-client`
- `src/custom-fetch.ts` — custom fetch wrapper with base URL support, auth token support, and response parsing.
- `src/generated/api.ts` — generated React Query functions/hooks.
- `src/generated/api.schemas.ts` — generated plain TypeScript interfaces.
- `src/index.ts` — package entry point.

### `packages/api-zod`
- `src/generated/api.ts` — generated Zod validators.
- `src/generated/types/*.ts` — generated TS types for API shapes.
- `src/index.ts` — package entry point.

### `packages/db`
- `src/index.ts` — PostgreSQL pool and Drizzle DB instance.
- `src/schema/conversations.ts` — conversations table and insert schema.
- `src/schema/messages.ts` — messages table and insert schema.
- `src/schema/index.ts` — schema barrel.
- `drizzle.config.ts` — Drizzle Kit config.
- `dist/` — generated declaration output.

### `packages/ui`
- `src/index.ts` — barrel export for the component suite.
- `src/lib/utils.ts` — `cn()` class name helper.
- `src/components/*.tsx` — large web component library built on Radix, CVA, and Tailwind utility classes.
- `dist/` — generated declaration output.

### `lib/integrations-openai-ai-server`
- `src/client.ts` — configured OpenAI client.
- `src/image/client.ts` — image generation/edit helpers.
- `src/audio/client.ts` — audio conversion, transcription, TTS, and voice chat helpers.
- `src/batch/utils.ts` — retry/rate-limit batch helpers.
- `src/index.ts`, `src/image/index.ts`, `src/audio/index.ts`, `src/batch/index.ts` — barrels.
- `dist/` — generated declaration output.

### `scripts`
- `consolidate-repo.ts` and `consolidate-repo.js` — repository consolidation utility.
- `src/index.ts` — empty placeholder entry point.
- `post-merge.sh` — post-merge install + db push hook.
- `tsconfig.json` — script package TypeScript config.

### Empty scaffolds
- `services/` — present but empty aside from gitkeeping.
- `infra/` — present but empty aside from gitkeeping.

## Runtime architecture

### The actual request flow
1. The mobile app bootstraps an API base URL and configures the generated API client.
2. The home screen fetches conversations via generated React Query hooks.
3. The chat screen fetches a conversation and its persisted messages.
4. Sending a message uses a manual SSE helper, not the generated client, because the reply is streamed token-by-token.
5. The API route persists the user message, streams the model response through an OpenAI-compatible SDK client, and saves the final assistant message.
6. PostgreSQL stores conversations and messages through Drizzle.

### Data flow in more detail
- `apps/mobile/app/index.tsx`
  - Calls `useListOpenaiConversations()`.
  - Creates conversations with `useCreateOpenaiConversation()`.
  - Deletes conversations with `useDeleteOpenaiConversation()`.
  - Groups conversation rows into recency buckets and filters by title.
- `apps/mobile/app/chat/[id].tsx`
  - Calls `useGetOpenaiConversation(id)` to hydrate the local message state once.
  - Uses `streamChat()` for assistant replies.
  - Appends user messages locally immediately, then incrementally updates the assistant message as SSE chunks arrive.
  - Invalidates query caches after the stream ends.
- `apps/api/src/routes/openai/conversations.ts`
  - Reads/writes `conversations` and `messages` directly.
  - Streams model output as SSE events: `data: { content: ... }` and a final `data: { done: true }` frame.
  - Stores the assistant response after the stream completes.
- `packages/db`
  - Defines the persistence layer and shared table schema.

## `apps/api` analysis

### Entry and startup
- `src/index.ts` requires `PORT` and throws immediately if it is missing or invalid.
- `app.listen(...)` is called after validation.
- The callback is written as if it receives an error argument, but Express/Node listen callbacks do not pass errors that way. That means the error branch is not a real listen-error handler.

### Middleware stack
- `pino-http` for request logging.
- `cors()` for cross-origin requests.
- `express.json()` and `express.urlencoded()` for body parsing.
- No cookie/session middleware is actually wired despite `cookie-parser` being listed as a dependency.

### Routing
- `/api/healthz` — health check.
- `/api/openai/conversations` — list/create conversations.
- `/api/openai/conversations/:id` — fetch/delete a conversation.
- `/api/openai/conversations/:id/messages` — list messages or stream a new assistant reply.

### Conversation route behavior
- `GET /api/openai/conversations`
  - Returns all conversations ordered by `createdAt` ascending.
- `POST /api/openai/conversations`
  - Requires a `title` field.
  - Inserts a conversation and returns it with `201`.
- `GET /api/openai/conversations/:id`
  - Loads the conversation and all messages ordered by `createdAt` ascending.
  - Returns `404` if the conversation does not exist.
- `DELETE /api/openai/conversations/:id`
  - Deletes messages for the conversation, then deletes the conversation.
  - The schema also has `onDelete: cascade` on the message foreign key, so deleting the conversation is doubly safe at the database layer.
- `GET /api/openai/conversations/:id/messages`
  - Returns the message list for a conversation.
- `POST /api/openai/conversations/:id/messages`
  - Requires `content`.
  - Confirms the conversation exists.
  - Inserts the user message.
  - Re-reads the full message history and forwards it to the model as chat context.
  - If this is the first user message for a conversation titled `New Chat`, the title is replaced with the first 60 characters of the prompt.
  - Streams assistant output as SSE and persists the final assistant message after the stream ends.

### Validation and error handling
- Runtime validation is minimal.
- `health.ts` uses the generated Zod schema.
- The conversation routes mostly rely on manual presence checks and `Number(...)` coercion.
- There is no centralized request validation middleware.
- Errors during streaming are logged with `req.log.error(...)` and a generic SSE error frame is emitted.

### Logging
- `src/lib/logger.ts` configures `pino` with redaction for authorization, cookies, and set-cookie headers.
- Non-production mode uses `pino-pretty` transport.

### Important API caveats
- The server only implements conversation/chat operations.
- There are no image or audio HTTP routes, even though the OpenAPI tag description mentions image/audio operations and the OpenAI integration package contains image/audio helpers.
- The API does not expose auth, sessions, user accounts, or rate limiting.
- The API contract is narrow: health + conversation CRUD + message list + streaming send.

## `apps/mobile` analysis

### App shell and boot process
- `app/_layout.tsx` is the real native/web app shell.
- It loads Inter fonts, waits on them before rendering, and hides the splash screen once fonts are ready or failed.
- It wraps the app in:
  - `SafeAreaProvider`
  - `ErrorBoundary`
  - `QueryClientProvider`
  - `GestureHandlerRootView`
  - `KeyboardProvider`
- It configures the generated API client with `setBaseUrl(...)` from `@workspace/api-client`.
- It prefers `EXPO_PUBLIC_API_BASE_URL`, then `EXPO_PUBLIC_DOMAIN`, then the client default.
- It logs the base URL environment values to the console during startup.
- The layout stack contains only `index` and `chat` routes with headers hidden.

### Home screen UX (`app/index.tsx`)
- The home screen is a conversation inbox.
- It fetches conversation rows from the generated client.
- Conversations are sorted newest-first and grouped into:
  - Today
  - Yesterday
  - Previous 7 days
  - Previous 30 days
  - Older
- There is a search toggle in the header.
- Search filters by conversation title only.
- The new-chat button uses haptics and creates a `New Chat` conversation.
- Conversation deletion uses a destructive confirmation dialog.
- Empty states are polished and show different copy for “no conversations” vs “no search results.”
- The list supports pull-to-refresh.

### Chat screen UX (`app/chat/[id].tsx`)
- The chat screen is an in-memory view backed by persisted conversation data.
- It loads the conversation and messages via the generated query hook.
- It initializes local message state once, then keeps appending during streaming.
- Messages are rendered in an inverted `FlatList`.
- When the conversation is empty, suggested prompt chips are shown.
- When the model is responding, a typing indicator appears.
- There is a streaming error banner that can be dismissed by tapping it.
- The header includes back navigation and share.
- Share builds a plain-text transcript with `You:` and `Aria:` prefixes.
- Sending a message:
  - adds the user message immediately,
  - sets streaming state,
  - starts an `AbortController`,
  - streams assistant chunks, and
  - invalidates conversation queries when complete.
- The stop button aborts the current request.

### Mobile UI components
- `ConversationItem.tsx`
  - Row item with title, relative date, and delete action.
  - Uses nested pressables for row navigation and delete affordance.
- `ChatInput.tsx`
  - Multiline composer with send/stop toggle.
  - `maxLength` is 4000.
  - Resets the input after send and refocuses it.
- `MessageBubble.tsx`
  - Distinguishes user vs assistant alignment and bubble styling.
  - Long-press copies the message to the clipboard and triggers haptics.
- `SuggestedPrompts.tsx`
  - Displays starter prompts as horizontal chips.
- `TypingIndicator.tsx`
  - Animated three-dot indicator for assistant typing.
- `ErrorBoundary.tsx` / `ErrorFallback.tsx`
  - Class-based React error boundary with a user-facing retry screen.
  - In development, a modal exposes detailed error text and stack traces.
- `KeyboardAwareScrollViewCompat.tsx`
  - Web/native compatibility wrapper for keyboard-aware scrolling.

### Theme and styling
- `constants/colors.ts` contains both light and dark palettes.
- `useColors()` selects the current palette from the system color scheme and adds the shared radius token.
- The UI is intentionally chat-app-like: rounded bubbles, clear hierarchy, subtle borders, and motion feedback.
- The app is styled for both native and web output.

### Mobile API usage
- The generated API client is used for normal list/create/delete/read flows.
- `apps/mobile/lib/api.ts` is a separate manual helper for streaming chat.
- That helper resolves the base URL from environment variables or localhost and parses SSE frames line-by-line.
- It only consumes `data:` frames and ignores other SSE event metadata.
- `setApiBaseUrl()` exists but is not used anywhere else in the repository.
- This creates a split between the generated client base URL and the manual streaming helper base URL.

### Expo deployment pipeline
- `apps/mobile/scripts/build.js`
  - Starts Metro if needed.
  - Downloads iOS and Android bundles plus manifests.
  - Copies assets into a static build directory.
  - Rewrites bundle and manifest URLs for deployment.
  - Supports `BASE_PATH` and deployment-domain environment variables.
- `apps/mobile/server/serve.js`
  - Serves the static Expo output.
  - Returns platform manifests when `expo-platform` is `ios` or `android`.
  - Serves a landing page with QR code instructions otherwise.
  - Uses only Node built-ins.
- `apps/mobile/server/templates/landing-page.html`
  - Provides the Expo Go landing page and deep-link QR flow.

### Mobile configuration notes
- `app.json` sets the Expo name to `Aria AI`.
- The scheme is `mobile`.
- `newArchEnabled` is `true`.
- Typed routes and the React Compiler are enabled.
- The development script in `package.json` hardcodes a local API base URL for one machine-specific IP address.
- The build and serve scripts are Windows-friendly in the repository’s current form, but they are not portable shell-agnostic scripts.

## API spec and generated packages

### OpenAPI source of truth
- `packages/api-spec/openapi.yaml` is the contract used by Orval.
- It defines only:
  - `GET /healthz`
  - `GET /openai/conversations`
  - `POST /openai/conversations`
  - `GET /openai/conversations/{id}`
  - `DELETE /openai/conversations/{id}`
  - `GET /openai/conversations/{id}/messages`
  - `POST /openai/conversations/{id}/messages`
- The spec describes the last route as SSE.
- It does **not** define image or audio HTTP endpoints.

### Generated client (`packages/api-client`)
- Exports React Query hooks for the API spec.
- Uses a custom fetch mutator that supports:
  - configurable base URLs,
  - optional bearer token injection,
  - response parsing,
  - error normalization.
- The generated client includes `sendOpenaiMessage`, but the mobile app does not use it for streaming.
- The generated schemas are plain TypeScript interfaces, not runtime validators.

### Generated Zod package (`packages/api-zod`)
- Contains schema validators and typed interfaces generated from the same OpenAPI file.
- The API server currently uses these schemas only in the health route.
- The conversation routes do not yet validate request bodies through the generated schemas.

## Database layer

### Schema
- `conversations`
  - `id` serial primary key
  - `title` non-null text
  - `created_at` timestamp with timezone, default now
- `messages`
  - `id` serial primary key
  - `conversation_id` foreign key to `conversations.id`
  - `role` text
  - `content` text
  - `created_at` timestamp with timezone, default now
- Deleting a conversation cascades to messages at the database level.

### Connection and tooling
- `packages/db/src/index.ts` creates a pg `Pool` from `DATABASE_URL` and binds it to Drizzle.
- The package throws immediately if `DATABASE_URL` is missing.
- `packages/db/drizzle.config.ts` points Drizzle Kit at `./src/schema/index.ts`.
- The root workspace has already been provisioned for a Neon PostgreSQL database according to the repo state.

### Data model limitations
- There is no user table.
- There is no staff/admin model.
- There is no tenant separation.
- There is no message attachment model.
- There is no moderation/audit table in the runtime code.

## Shared OpenAI integration package

### What it provides
- `client.ts` constructs an OpenAI SDK client from `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`.
- `image/client.ts` exposes image generation/edit helpers.
- `audio/client.ts` exposes audio-format detection, ffmpeg-based conversion, voice chat, TTS, and speech-to-text helpers.
- `batch/utils.ts` provides retry and concurrency helpers for LLM-heavy workflows.

### What the API actually uses
- The API server only imports the `openai` chat client from this package.
- The image/audio/batch helpers are present but not wired into HTTP routes.

### Environment requirements
- The package fails fast if the OpenAI integration env vars are missing.
- The repo’s current state uses an OpenAI-compatible Gemini base URL for local development in the API.

## Workspace and tooling analysis

### Monorepo policy
- The workspace is pnpm-based.
- Root `package.json` blocks non-pnpm installs.
- `pnpm-workspace.yaml` enforces a 24-hour minimum release age for npm packages, with explicit scoped exclusions.
- The workspace uses catalog dependencies and overrides for shared version alignment.

### TypeScript
- The shared base config enables a strict compiler baseline, including `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, and `strictNullChecks`.
- `apps/mobile/tsconfig.json` explicitly sets `strict: true`.
- The root project references include `packages/ui`, which confirms it is part of the workspace even though it is not consumed by the apps right now.

### Build and release artifacts present in the repo
- `dist/` directories are present for multiple packages/apps and should be treated as generated output.
- `tsbuildinfo` files are also present in several packages.
- `apps/api/dist` is the bundled server output.
- `packages/*/dist` and `lib/integrations-openai-ai-server/dist` are declaration outputs.
- `packages/ui/dist` exists, but the package is still effectively a shared library rather than an app dependency in current usage.

### Supporting scripts
- `scripts/consolidate-repo.ts` is a repository snapshot utility that walks the tree and writes a flattened markdown archive.
- `scripts/src/index.ts` is empty.
- `scripts/post-merge.sh` reinstalls dependencies and pushes the database schema.

## What is not here

### Missing docs and planning files
- No `README.md`.
- No `TODO.md`.
- No `refractor.md`.
- No root markdown documentation beyond this analysis and the `.windsurf` support files.

### Missing runtime features
- No authentication.
- No authorization / RBAC.
- No user accounts.
- No session management.
- No password hashing or login flow.
- No file upload pipeline.
- No notification system.
- No test suite files (`*.test.*` or `*.spec.*`) were found.
- No lint configuration or lint script was found in the inspected root files.
- No CI workflow files were found in the visible workspace snapshot.

### Missing service areas
- `services/` is empty.
- `infra/` is empty.
- There is no implemented FastAPI application, LangGraph runtime, or LiteLLM gateway in the repository snapshot.

### Missing HTTP surface relative to the integration package
- No image routes.
- No audio routes.
- No batch processing API.
- No direct OpenAI proxy endpoints beyond the chat/conversation flow.

## Notable mismatches and caveats
- The OpenAPI tag description mentions image/audio operations, but the actual path list does not include them.
- The OpenAI integration package includes image/audio utilities, but the API does not expose them.
- `app.listen(..., (err) => ...)` in `apps/api/src/index.ts` is not a real startup error callback.
- The mobile app has two base-URL mechanisms: generated client config and a separate manual streaming helper.
- `setApiBaseUrl()` exists in `apps/mobile/lib/api.ts` but is currently unused.
- `cookie-parser` is listed as a dependency in the API package, but no cookie middleware is wired into the app.
- `packages/ui` is a large shared library, but there are no imports from application code in the current repository snapshot.
- The `useColors` comment mentions a light-only scaffold, but the palette file actually defines both light and dark themes.

## Final assessment
This repo is a focused chat application stack with a clear vertical path:

- Expo mobile UI
- generated API client/spec
- Express server
- Drizzle/Postgres persistence
- OpenAI-compatible model integration

It is not yet the broader multi-service architecture implied by empty scaffolds and some package names. The current implementation is real and coherent for chat conversations, but the repository also contains a meaningful amount of generated output, unused shared libraries, and documented-but-unimplemented surface area. The most important gaps are missing tests, missing auth/user infrastructure, missing image/audio HTTP routes, and empty `services/` / `infra/` layers.
