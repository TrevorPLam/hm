# TODO.md — Structural Refactor

> **Scope:** align the repository with the consolidated workspace layout. No new features.
> Once all tasks are complete and the final validation gate is green, the structural phase is closed.

***

## Legend

Status: `[ ]` pending | `[x]` complete  
Indicator: `PENDING` | `IN PROGRESS` | `BLOCKED` | `DONE`

***

## ISSUE-001 — Fix mobile typecheck error in useColors.ts

- [x] **ISSUE-001** `DONE`

### Files
- `artifacts/mobile/hooks/useColors.ts`

### Definition of Done
`pnpm --filter @workspace/mobile run typecheck` exits 0 with no TypeScript errors.

### Context
Pre-existing type error discovered during D-02 QA. Type incompatibility in useColors.ts line 21: `colors` object has mixed types (strings and `radius: number`) but is being cast to `Record<string, typeof colors.light>` which expects all values to match the color palette type.

### Depends On
Nothing.

### Blocks
Nothing.

***

## D-02 — Delete lib/integrations-openai-ai-react

- [x] **D-02** `DONE`

### Files
- `lib/integrations-openai-ai-react/` (entire directory, flat path)

### Definition of Done
Directory does not exist. No package named `@workspace/integrations-openai-ai-react` appears in any `package.json` dependency field. `pnpm install` exits 0. Root `tsconfig.json` no longer references the deleted project.

### Out of Scope
- Do not touch `lib/integrations-openai-ai-server` — different package, still active.
- Do not modify any app source files.

### Rules
- Before deletion, run `grep -r "integrations-openai-ai-react" . --include="*.json" --include="*.ts" --include="*.tsx" --include="*.yaml"` and confirm zero matches outside the package itself.
- Remove the root `tsconfig.json` reference to this package in the same change set.

### Pattern
Leaf deletion after consumer verification.

### Anti-Patterns
- Do not confuse with `lib/integrations-openai-ai-server` — that package is active and must not be touched.
- Do not move to an archive directory.

### Imports / Exports
None — confirmed zero consumers anywhere in the codebase.

### Depends On
Nothing.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| D-02-01 | — | Run `grep -r "integrations-openai-ai-react" . --include="*.json" --include="*.ts" --include="*.tsx" --include="*.yaml"` from repo root. Expected: zero results outside `lib/integrations-openai-ai-react/` itself. If any external match exists, resolve it before proceeding. |
| D-02-02 | `tsconfig.json` (root) | Remove `{ "path": "./lib/integrations-openai-ai-react" }` from `references`. |
| D-02-03 | `lib/integrations-openai-ai-react/` | Execute `git rm -r lib/integrations-openai-ai-react`. |
| D-02-04 | — | Run `pnpm install` from root. Confirm exit 0. |

***

## D-03 — Delete orphaned lib/integrations/ nested directory

- [x] **D-03** `DONE`

### Files
- `lib/integrations/` (nested directory, no `package.json`)

### Definition of Done
`lib/integrations/` does not exist. `lib/integrations-openai-ai-server/` is unaffected.

### Out of Scope
`lib/integrations-openai-ai-server/` and `lib/integrations-openai-ai-react/` are flat siblings — do not touch them here.

### Rules
- Confirm `lib/integrations/` has no `package.json` before deleting.
- Confirm it is not referenced by any `tsconfig.json` `references` array.

### Pattern
Orphan cleanup. Verify before act.

### Anti-Patterns
- Do not delete `lib/integrations-openai-ai-server/` by mistake — it lives at `lib/integrations-openai-ai-server`, not `lib/integrations/openai-ai-server`.

### Imports / Exports
None.

### Depends On
Nothing.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| D-03-01 | `lib/integrations/` | Run `ls lib/integrations/` to confirm the directory exists and has no `package.json`. |
| D-03-02 | — | Run `grep -r "lib/integrations/" . --include="*.json" --include="*.ts" --include="*.yaml"` and confirm zero references. |
| D-03-03 | `lib/integrations/` | Execute `git rm -r lib/integrations/`. |

***

## D-04 — Delete scripts/src/hello.ts

- [x] **D-04** `DONE`

### Files
- `scripts/src/hello.ts`

### Definition of Done
File does not exist. `scripts/` package remains a valid workspace member with a compilable `tsconfig.json`.

### Out of Scope
Do not delete the `scripts/` package itself — it is a valid workspace member for future utility scripts.

### Rules
- If `hello.ts` is the only file in `scripts/src/`, update `scripts/package.json` to remove any `exports` pointing at it and update `scripts/tsconfig.json` include paths accordingly.

### Pattern
Placeholder cleanup.

### Anti-Patterns
- Do not delete the `scripts/` package.

### Imports / Exports
None.

### Depends On
Nothing.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| D-04-01 | `scripts/src/` | Run `ls scripts/src/` to confirm `hello.ts` is the only file. |
| D-04-02 | `scripts/src/hello.ts` | Execute `git rm scripts/src/hello.ts`. |
| D-04-03 | `scripts/package.json` | If `exports` or `scripts` reference `hello.ts` or `./src/hello`, remove those entries. |
| D-04-04 | `scripts/tsconfig.json` | If `include` explicitly lists `src/hello.ts`, remove that entry. If `src/` is now empty and `include` is `["src"]`, remove `src/` and update `include` to `[]` or add a `.gitkeep`. |

***

## R-01 — Create top-level directory skeleton

- [x] **R-01** `DONE`

### Files
- `apps/.gitkeep` (new)
- `packages/.gitkeep` (new)
- `packages/ui/.gitkeep` (new — placeholder for E-01)
- `services/.gitkeep` (new)
- `infra/terraform/.gitkeep` (new)
- `infra/kubernetes/base/.gitkeep` (new)
- `infra/kubernetes/overlays/.gitkeep` (new)
- `infra/docker/.gitkeep` (new)

### Definition of Done
All directories exist and are tracked by git via `.gitkeep` files. `pnpm-workspace.yaml` is not yet modified (that is R-02).

### Out of Scope
- Do not move any packages yet.
- Do not add `package.json` files to `services/` or `infra/`.
- Do not populate `packages/ui/` — that is E-01.

### Rules
- Each new directory gets exactly one `.gitkeep` at its root.
- `services/` is not added to `pnpm-workspace.yaml` — Python projects managed by `uv`, not pnpm.

### Pattern
Scaffold-first. Directories exist before anything moves into them.

### Anti-Patterns
- Do not create directories implicitly inside a `git mv` command — explicit creation first prevents silent failures.

### Imports / Exports
None.

### Depends On
Nothing.

### Blocks
E-01, R-02, M-01, M-02, M-03, M-04, M-05, M-06.

| ID | File | Action |
|----|------|--------|
| R-01-01 | `apps/.gitkeep` | `mkdir -p apps && touch apps/.gitkeep` ✅ |
| R-01-02 | `packages/.gitkeep` | `mkdir -p packages && touch packages/.gitkeep` ✅ |
| R-01-03 | `packages/ui/.gitkeep` | `mkdir -p packages/ui && touch packages/ui/.gitkeep` ✅ |
| R-01-04 | `services/.gitkeep` | `mkdir -p services && touch services/.gitkeep` ✅ |
| R-01-05 | `infra/terraform/.gitkeep` | `mkdir -p infra/terraform && touch infra/terraform/.gitkeep` ✅ |
| R-01-06 | `infra/kubernetes/base/.gitkeep` | `mkdir -p infra/kubernetes/base && touch infra/kubernetes/base/.gitkeep` ✅ |
| R-01-07 | `infra/kubernetes/overlays/.gitkeep` | `mkdir -p infra/kubernetes/overlays && touch infra/kubernetes/overlays/.gitkeep` ✅ |
| R-01-08 | `infra/docker/.gitkeep` | `mkdir -p infra/docker && touch infra/docker/.gitkeep` ✅ |
| R-01-09 | — | `git add apps packages services infra` — confirm all `.gitkeep` files are staged. ✅ |

***

## R-02 — Add new glob patterns to pnpm-workspace.yaml

- [x] **R-02** `DONE`

### Files
- `pnpm-workspace.yaml`

### Definition of Done
`pnpm-workspace.yaml` includes `apps/*` and `packages/*` in the `packages` array. Existing entries (`artifacts/*`, `lib/*`, `lib/integrations*`, `scripts`) are still present — not removed until C-01. `pnpm install` exits 0 and recognizes all existing packages.

### Out of Scope
- Do not remove any existing entries yet.
- Do not add `services/*`.

### Rules
- The file must be valid YAML after editing. Validate with `npx js-yaml pnpm-workspace.yaml`.
- Add new entries before moving any packages — this ensures pnpm resolves packages at both old and new paths during the migration window.

### Pattern
Additive-first. Old paths remain valid until C-01 removes them.

### Anti-Patterns
- Do not remove `lib/*` or `artifacts/*` here — packages have not moved yet.

### Imports / Exports
None.

### Depends On
R-01.

### Blocks
M-01, M-02, M-03, M-04, M-05, M-06.

| ID | File | Action |
|----|------|--------|
| R-02-01 | `pnpm-workspace.yaml` | Add `- 'apps/*'` to the `packages` array. |
| R-02-02 | `pnpm-workspace.yaml` | Add `- 'packages/*'` to the `packages` array. |
| R-02-03 | — | Run `pnpm install` from root. Confirm exit 0 with no new errors. |

***

## E-01 — Extract mockup-sandbox UI components to packages/ui

- [x] **E-01** `DONE`

### Files
- `packages/ui/` (destination, scaffolded in R-01)
- `artifacts/mockup-sandbox/src/components/ui/` (source — copy, do not move)
- `artifacts/mockup-sandbox/src/lib/utils.ts` (source — copy, do not move)
- `artifacts/mockup-sandbox/src/hooks/use-toast.ts` (source — copy only if toast components are included)
- `artifacts/mockup-sandbox/package.json` (reference for dependency versions)

### Definition of Done
`packages/ui/` is a valid pnpm workspace package named `@workspace/ui`. All copied shadcn component `.tsx` files exist under `packages/ui/src/components/`. `packages/ui/src/lib/utils.ts` exists. `packages/ui/src/index.ts` re-exports all copied components and `cn`. `pnpm --filter @workspace/ui run typecheck` exits 0.

### Out of Scope
- Do not create consumers of `@workspace/ui` — `apps/web` does not exist yet.
- Do not wire `packages/ui` into `apps/mobile`.
- Do not delete `artifacts/mockup-sandbox/` here — that is D-05.

### Rules
- **Copy** (do not `git mv`) component files — the source must continue functioning until D-05.
- `packages/ui/package.json` must declare all `@radix-ui/react-*` packages and `lucide-react` as `peerDependencies`, matching versions in `artifacts/mockup-sandbox/package.json`.
- `clsx` and `tailwind-merge` are `dependencies`, not `peerDependencies`.
- `tailwindcss` is not a dependency — consumers configure their own Tailwind.
- The `cn` path alias in each copied component file is `"@/lib/utils"` — change every instance to the relative path `"../lib/utils"`.

### Pattern
Deep module boundary. `packages/ui` exposes a single `src/index.ts` barrel. Internal file structure is an implementation detail hidden from consumers.

### Anti-Patterns
- Do not create nested barrels (e.g., `src/components/index.ts` re-exported from `src/index.ts`) — single barrel only.
- Do not include `mockupPreviewPlugin`, `App.tsx`, or Vite/demo scaffolding.
- If toast components are included, do not leave them importing missing hooks; either copy `use-toast.ts` or exclude those components.
- Do not add `tailwindcss` as a direct dependency.

### Imports / Exports
- `packages/ui/src/index.ts` — exports all named component exports and `export { cn } from "./lib/utils"`.
- No imports from any other `@workspace/*` package.

### Depends On
R-01, R-02.

### Blocks
D-05.

| ID | File | Action |
|----|------|--------|
| E-01-01 | `packages/ui/package.json` | Create with `name: "@workspace/ui"`, `version: "0.0.0"`, `private: true`, `type: "module"`, `exports: { ".": "./src/index.ts" }`, `scripts: { typecheck: "tsc -p tsconfig.json --noEmit" }`. Add `clsx` and `tailwind-merge` as `dependencies` (copy exact versions from `artifacts/mockup-sandbox/package.json`). Add all `@radix-ui/react-*` packages and `lucide-react` as `peerDependencies` (copy exact versions). Add `typescript` and `@types/react` as `devDependencies`. |
| E-01-02 | `packages/ui/tsconfig.json` | Create extending `../../tsconfig.base.json`. Set `composite: true`, `declarationMap: true`, `emitDeclarationOnly: true`, `outDir: "dist"`, `rootDir: "src"`, `jsx: "preserve"`, `lib: ["dom", "es2022"]`. `include: ["src"]`. |
| E-01-03 | `packages/ui/src/lib/utils.ts` | Copy from `artifacts/mockup-sandbox/src/lib/utils.ts` verbatim. |
| E-01-04 | `packages/ui/src/components/` | Copy all `.tsx` files from `artifacts/mockup-sandbox/src/components/ui/` into `packages/ui/src/components/`. In each copied file, replace every instance of `from "@/lib/utils"` with `from "../lib/utils"`. If a copied component imports `use-toast`, also copy `artifacts/mockup-sandbox/src/hooks/use-toast.ts` into `packages/ui/src/hooks/use-toast.ts` and update the import to the local hook, or exclude that component entirely. |
| E-01-05 | `packages/ui/src/index.ts` | Create a single barrel file re-exporting every named export from each copied component file, plus `export { cn } from "./lib/utils"`. |
| E-01-06 | — | Run `pnpm install` from root to link the new package. |
| E-01-07 | — | Run `pnpm --filter @workspace/ui run typecheck`. Resolve all errors before marking done. |

***

## D-05 — Delete artifacts/mockup-sandbox

- [x] **D-05** `DONE`

### Files
- `artifacts/mockup-sandbox/` (entire directory)

### Definition of Done
Directory does not exist. `pnpm install` exits 0. No other package has a broken import.

### Out of Scope
Do not touch `artifacts/api-server/` or `artifacts/mobile/`.

### Rules
- E-01 must be marked done before this task begins.
- Run `grep -r "mockup-sandbox" . --include="*.json" --include="*.yaml" --include="*.ts"` and confirm zero non-obvious references remain outside lockfile and pnpm workspace glob resolution.

### Pattern
Delete after extract.

### Anti-Patterns
- Do not run this before E-01 is complete — component files will be lost.

### Imports / Exports
None.

### Depends On
E-01.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| D-05-01 | — | Run `grep -r "mockup-sandbox" . --include="*.json" --include="*.yaml"`. Confirm references are limited to `pnpm-workspace.yaml` glob coverage and `pnpm-lock.yaml` only. |
| D-05-02 | `artifacts/mockup-sandbox/` | Execute `git rm -r artifacts/mockup-sandbox`. |
| D-05-03 | — | Run `pnpm install` from root. Confirm exit 0. |

***

## D-07 — Clean pnpm-workspace.yaml platform-specific and stale entries

- [x] **D-07** `DONE`

### Files
- `pnpm-workspace.yaml`

### Definition of Done
`pnpm-workspace.yaml` no longer contains stale catalog entries for deleted mockup-sandbox Replit plugins. Platform-specific overrides that restrict to `linux-x64-gnu` are removed for cross-platform compatibility. The `@replit/*` and `stripe-replit-sync` entries in `minimumReleaseAgeExclude` remain (Replit is still in use). The `minimumReleaseAge: 1440` setting remains for security. `pnpm install` exits 0.

### Out of Scope
- Do not remove the `minimumReleaseAge: 1440` setting itself — this is good security practice.
- Do not remove `@replit/*` or `stripe-replit-sync` from `minimumReleaseAgeExclude` — Replit is still in use.
- Do not modify any other pnpm-workspace.yaml settings.

### Rules
- Remove catalog entries for `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal` — these are only used by mockup-sandbox which is deleted in D-05.
- Keep `@replit/*` and `stripe-replit-sync` in `minimumReleaseAgeExclude` — Replit is still in use.
- Remove platform-specific overrides that exclude every platform except `linux-x64-gnu` for esbuild, lightningcss, rollup, and expo/ngrok-bin — these break the workspace on Windows/macOS.

### Pattern
Cross-platform workspace config with Replit support retained.

### Anti-Patterns
- Do not leave platform-specific overrides that would break the workspace on Windows or macOS.
- Do not remove Replit-specific minimumReleaseAgeExclude entries.

### Imports / Exports
None.

### Depends On
D-05 (mockup-sandbox must be deleted first).

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| D-07-01 | `pnpm-workspace.yaml` | Remove catalog entries for `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`. |
| D-07-02 | `pnpm-workspace.yaml` | Remove platform-specific overrides for esbuild, lightningcss, rollup, and expo/ngrok-bin that restrict to `linux-x64-gnu`. |
| D-07-03 | — | Run `pnpm install` from root. Confirm exit 0. |

***

## D-08 — Clean stale .gitignore entries

- [x] **D-08** `DONE`

### Files
- `.gitignore`

### Definition of Done
`.gitignore` no longer contains stale references to Nx (`.cursor/rules/nx-rules.mdc` and `.github/instructions/nx.instructions.md`). No other changes to `.gitignore`.

### Out of Scope
- Do not modify any other `.gitignore` entries.
- Do not add new ignore rules.

### Rules
- Remove only the two Nx-specific entries that reference a tool not part of the architecture.

### Pattern
Stale reference cleanup.

### Anti-Patterns
- Do not remove other ignore rules that are still valid.

### Imports / Exports
None.

### Depends On
Nothing.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| D-08-01 | `.gitignore` | Remove `.cursor/rules/nx-rules.mdc` entry. |
| D-08-02 | `.gitignore` | Remove `.github/instructions/nx.instructions.md` entry. |

***

## M-01 — Move lib/api-spec to packages/api-spec

- [ ] **M-01** `PENDING`

### Files
- `lib/api-spec/` → `packages/api-spec/`
- `packages/api-spec/orval.config.ts` (two path constant updates)

### Definition of Done
`lib/api-spec/` does not exist. `packages/api-spec/` exists with all original files intact. `orval.config.ts` path constants resolve to `packages/api-client/src` and `packages/api-zod/src`. `pnpm install` exits 0.

### Out of Scope
- Do not rename the package — `@workspace/api-spec` stays.
- Do not run codegen — that is V-01.

### Rules
- Use `git mv lib/api-spec packages/api-spec` to preserve git history.
- Update `orval.config.ts` path constants in the same commit as the move.
- `root` is computed via `path.resolve(__dirname, '..', '..')` — this stays valid since `packages/api-spec/` is still two levels from the repo root.

### Pattern
Move + internal path fix in one atomic commit.

### Anti-Patterns
- Do not split the `git mv` and the `orval.config.ts` update into separate commits — a commit with the move but stale paths will cause codegen to emit to deleted locations.

### Imports / Exports
`@workspace/api-spec` has no runtime imports from other `@workspace/*` packages — it is dev-time codegen only.

### Depends On
R-01, R-02.

### Blocks
M-02, V-01.

| ID | File | Action |
|----|------|--------|
| M-01-01 | — | Execute `git mv lib/api-spec packages/api-spec`. |
| M-01-02 | `packages/api-spec/orval.config.ts` | Change `const apiClientReactSrc = path.resolve(root, 'lib', 'api-client-react', 'src')` to `const apiClientReactSrc = path.resolve(root, 'packages', 'api-client', 'src')`. |
| M-01-03 | `packages/api-spec/orval.config.ts` | Change `const apiZodSrc = path.resolve(root, 'lib', 'api-zod', 'src')` to `const apiZodSrc = path.resolve(root, 'packages', 'api-zod', 'src')`. |
| M-01-04 | — | Run `pnpm install` from root. Confirm `@workspace/api-spec` resolves correctly. |

***

## M-02 — Move lib/api-zod to packages/api-zod

- [ ] **M-02** `PENDING`

### Files
- `lib/api-zod/` → `packages/api-zod/`

### Definition of Done
`lib/api-zod/` does not exist. `packages/api-zod/` exists with all original files. Package name `@workspace/api-zod` is unchanged. `pnpm install` exits 0.

### Out of Scope
- Do not rename the package.
- Do not delete stale `src/generated/` files — they keep the package compilable until V-01 reruns codegen.

### Rules
- Use `git mv lib/api-zod packages/api-zod`.
- No internal path changes needed — all paths in `tsconfig.json` are relative to `src/`.

### Pattern
Pure move, no renames.

### Anti-Patterns
- Do not delete generated files to "clean up" before codegen reruns — the package must remain compilable throughout the migration.

### Imports / Exports
`@workspace/api-zod` is consumed by `@workspace/api-client` and `artifacts/api-server`. Package name is unchanged so no import edits are needed.

### Depends On
M-01.

### Blocks
M-03.

| ID | File | Action |
|----|------|--------|
| M-02-01 | — | Execute `git mv lib/api-zod packages/api-zod`. |
| M-02-02 | — | Run `pnpm install` from root. Confirm exit 0. |
| M-02-03 | `packages/api-zod/tsconfig.json` | Verify `extends` path `../../tsconfig.base.json` is still valid (depth is unchanged). No edit required — verification only. |

***

## M-03 — Move lib/api-client-react to packages/api-client and rename package

- [ ] **M-03** `PENDING`

### Files
- `lib/api-client-react/` → `packages/api-client/`
- `packages/api-client/package.json` (name field change)
- `artifacts/mobile/package.json` (devDependency key change)
- `artifacts/mobile/app/_layout.tsx` (import string change)
- `artifacts/mobile/app/index.tsx` (import string change)
- `artifacts/mobile/app/chat/[id].tsx` (import string change)
- `artifacts/mobile/components/ConversationItem.tsx` (import string change)

### Definition of Done
`lib/api-client-react/` does not exist. `packages/api-client/` exists. Package name is `@workspace/api-client`. `artifacts/mobile` references `@workspace/api-client` in its `package.json` and all 4 source files (`_layout.tsx`, `index.tsx`, `chat/[id].tsx`, `ConversationItem.tsx`). `pnpm install` exits 0. `pnpm --filter @workspace/mobile run typecheck` exits 0.

### Out of Scope
- Do not move `artifacts/mobile/` — that is M-06.
- Do not update `packages/api-client/tsconfig.json` extends path — still valid.

### Rules
- Use `git mv lib/api-client-react packages/api-client`.
- The `package.json` name change and the five consumer file changes (package.json + 4 source files) must be in the same commit — the workspace must never be in a state where `@workspace/api-client` is declared as a dependency but the package name still reads `@workspace/api-client-react`.
- `packages/api-client/src/custom-fetch.ts` must exist at the new path before V-01 codegen runs.

### Pattern
Move + rename + consumer update, atomic commit.

### Anti-Patterns
- Do not commit the move without the consumer updates — the workspace will have a broken dependency reference.

### Imports / Exports
- `packages/api-client/src/index.ts` exports `setBaseUrl`, `setAuthTokenGetter`, all generated hooks, and types — content unchanged.
- Consumers: `artifacts/mobile/app/_layout.tsx` imports `setBaseUrl`; `artifacts/mobile/app/index.tsx` imports generated hooks; `artifacts/mobile/app/chat/[id].tsx` imports generated hooks; `artifacts/mobile/components/ConversationItem.tsx` imports `OpenaiConversation` type.

### Depends On
M-02.

### Blocks
M-06, V-01.

| ID | File | Action |
|----|------|--------|
| M-03-01 | — | Execute `git mv lib/api-client-react packages/api-client`. |
| M-03-02 | `packages/api-client/package.json` | Change `"name": "@workspace/api-client-react"` to `"name": "@workspace/api-client"`. |
| M-03-03 | `artifacts/mobile/package.json` | In `devDependencies`, change key `"@workspace/api-client-react": "workspace:*"` to `"@workspace/api-client": "workspace:*"`. |
| M-03-04 | `artifacts/mobile/app/_layout.tsx` | Change `import { setBaseUrl } from '@workspace/api-client-react'` to `import { setBaseUrl } from '@workspace/api-client'`. |
| M-03-05 | `artifacts/mobile/app/index.tsx` | Change all imports from `@workspace/api-client-react` to `@workspace/api-client`. |
| M-03-06 | `artifacts/mobile/app/chat/[id].tsx` | Change all imports from `@workspace/api-client-react` to `@workspace/api-client`. |
| M-03-07 | `artifacts/mobile/components/ConversationItem.tsx` | Change `import type { OpenaiConversation } from '@workspace/api-client-react'` to `import type { OpenaiConversation } from '@workspace/api-client'`. |
| M-03-08 | — | Run `pnpm install` from root. Confirm `@workspace/api-client` resolves and no `api-client-react` references remain in the mobile package's lockfile entries. |
| M-03-09 | — | Run `pnpm --filter @workspace/mobile run typecheck`. Confirm exit 0. |

***

## M-04 — Move lib/db to packages/db

- [ ] **M-04** `PENDING`

### Files
- `lib/db/` → `packages/db/`
- `artifacts/api-server/tsconfig.json` (references path update)

### Definition of Done
`lib/db/` does not exist. `packages/db/` exists with all original files. Package name `@workspace/db` is unchanged. `artifacts/api-server/tsconfig.json` references array points to `../../packages/db`, `../../packages/api-zod`, and `../../lib/integrations-openai-ai-server`. `pnpm install` exits 0. `pnpm --filter @workspace/api-server run typecheck` exits 0.

### Out of Scope
- Do not move `artifacts/api-server/` — that is M-05.
- Do not modify Drizzle schema files.
- Do not run `drizzle-kit push` — that is S-04.

### Rules
- Use `git mv lib/db packages/db`.
- `packages/db/drizzle.config.ts` uses `path.join(__dirname, './src/schema/index.ts')` — this stays valid after the move.
- `artifacts/api-server/tsconfig.json` references must be updated in the same edit, not piecemeal.
- `@workspace/db` in `api-server/package.json` dependencies does not need editing — pnpm resolves by package name, not path.

### Pattern
Move + tsconfig reference fix, atomic commit.

### Anti-Patterns
- Do not update the `tsconfig.json` references path before the directory has moved — the TypeScript composite build will error with a missing project path.

### Imports / Exports
`@workspace/db` exports `db`, `conversations`, `messages`, `insertConversationSchema`, `insertMessageSchema`, and their inferred types. All consumed by `artifacts/api-server/src/routes/openai/conversations.ts`.

### Depends On
R-01, R-02, M-02.

### Blocks
M-05.

| ID | File | Action |
|----|------|--------|
| M-04-01 | — | Execute `git mv lib/db packages/db`. |
| M-04-02 | `artifacts/api-server/tsconfig.json` | Update all project references in one pass: `../../lib/db` → `../../packages/db`, `../../lib/api-zod` → `../../packages/api-zod`; keep `../../lib/integrations-openai-ai-server` unchanged. |
| M-04-03 | `packages/db/drizzle.config.ts` | Verify `schema: path.join(__dirname, './src/schema/index.ts')` remains valid after the move. No edit required — verification only. |
| M-04-04 | — | Run `pnpm install` from root. Confirm exit 0. |
| M-04-05 | — | Run `pnpm --filter @workspace/api-server run typecheck`. Confirm exit 0. |

***

## M-05 — Move artifacts/api-server to apps/api

- [ ] **M-05** `PENDING`

### Files
- `artifacts/api-server/` → `apps/api/`
- `apps/api/tsconfig.json` (inherits from moved file)
- `apps/api/package.json` (path-preserved by move)

### Definition of Done
`artifacts/api-server/` does not exist. `apps/api/` exists with all original files intact. `apps/api/tsconfig.json` contains the updated references from M-04-02 unchanged. `pnpm install` exits 0. `pnpm --filter @workspace/api-server run typecheck` is no longer relevant; use `pnpm --filter @workspace/api run typecheck` once the package name is in place.

### Out of Scope
- Do not modify `packages/db`, `packages/api-zod`, or `lib/integrations-openai-ai-server` in this task.
- Do not run build or codegen here.

### Rules
- Use `git mv artifacts/api-server apps/api`.
- The move must preserve the `tsconfig.json` changes from M-04-02.
- No further `tsconfig.json` edits should be needed if M-04-02 was completed correctly.

### Pattern
Pure move after upstream reference repair.

### Anti-Patterns
- Do not re-edit `apps/api/tsconfig.json` if M-04-02 already updated the references correctly.
- Do not split the move into separate commits from the upstream config fix.

### Imports / Exports
`apps/api` continues exporting the same server app, logger, and routes.

### Depends On
M-04.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| M-05-01 | — | Execute `git mv artifacts/api-server apps/api`. |
| M-05-02 | `apps/api/tsconfig.json` | Verify the references array contains `../../packages/db`, `../../packages/api-zod`, and `../../lib/integrations-openai-ai-server`. No edit required — verification only. |
| M-05-03 | `apps/api/package.json` | If the package name still reads `@workspace/api-server`, rename it to `@workspace/api`. Keep scripts unchanged otherwise. |
| M-05-04 | — | Run `pnpm install` from root. Confirm exit 0. |
| M-05-05 | — | Run `pnpm --filter @workspace/api run typecheck`. Confirm exit 0. |

***

## M-06 — Move artifacts/mobile to apps/mobile

- [ ] **M-06** `PENDING`

### Files
- `artifacts/mobile/` → `apps/mobile/`
- `apps/mobile/package.json` (consumer dependency key already updated in M-03)

### Definition of Done
`artifacts/mobile/` does not exist. `apps/mobile/` exists with all original files intact. `apps/mobile` references `@workspace/api-client` in its `package.json` and source files. `pnpm install` exits 0. `pnpm --filter @workspace/mobile run typecheck` exits 0.

### Out of Scope
- Do not change `packages/api-client` here — that belongs to M-03.
- Do not modify `apps/api` here — that belongs to M-05.

### Rules
- Use `git mv artifacts/mobile apps/mobile`.
- Preserve the consumer import updates from M-03.
- No workspace glob changes beyond R-02 are needed here.

### Pattern
Pure move after consumer rename.

### Anti-Patterns
- Do not move before M-03 is complete — the mobile package must already point at `@workspace/api-client`.

### Imports / Exports
`apps/mobile` continues to import the API client and Expo app components.

### Depends On
M-03.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| M-06-01 | — | Execute `git mv artifacts/mobile apps/mobile`. |
| M-06-02 | `apps/mobile/package.json` | Verify the dependency key is `@workspace/api-client`, not `@workspace/api-client-react`. No edit required if M-03 completed correctly. |
| M-06-03 | — | Run `pnpm install` from root. Confirm exit 0. |
| M-06-04 | — | Run `pnpm --filter @workspace/mobile run typecheck`. Confirm exit 0. |

***

## C-01 — Consolidate workspace glob patterns

- [ ] **C-01** `PENDING`

### Files
- `pnpm-workspace.yaml`

### Definition of Done
`pnpm-workspace.yaml` contains exactly: `apps/*`, `packages/*`, `lib/integrations-openai-ai-server`, and `scripts`. No `artifacts/*` entry, no `lib/*` glob, and no `lib/integrations*` glob remains. `pnpm install` exits 0. `pnpm list -r --depth 0` shows `@workspace/integrations-openai-ai-server` as a recognized workspace package and shows no entry for any deleted package.

### Out of Scope
- Do not remove any package path that still exists.
- Do not reintroduce `lib/*` or `artifacts/*` catch-alls if they would keep deleted packages discoverable.

### Rules
- Keep only the workspace entries needed for live packages.
- Validate YAML syntax after edits.

### Pattern
Reduce glob surface area after moves and deletions settle.

### Anti-Patterns
- Do not leave a broad glob in place if it would continue to include deleted directories.
- Do not exclude `lib/integrations-openai-ai-server` if it remains active.

### Imports / Exports
None.

### Depends On
D-02, D-03, D-04, M-01, M-02, M-03, M-04, M-05, M-06.

### Blocks
V-01, V-02.

| ID | File | Action |
|----|------|--------|
| C-01-01 | `pnpm-workspace.yaml` | Remove the `- 'artifacts/*'` entry. |
| C-01-02 | `pnpm-workspace.yaml` | Remove the `- 'lib/*'` entry. |
| C-01-03 | `pnpm-workspace.yaml` | Remove the `- 'lib/integrations*'` entry (or whichever glob currently covers the integrations packages). |
| C-01-04 | `pnpm-workspace.yaml` | Add explicit entry `- 'lib/integrations-openai-ai-server'`. |
| C-01-05 | — | Run `pnpm install` from root. Confirm exit 0 and no `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` errors. |
| C-01-06 | — | Run `pnpm list -r --depth 0`. Confirm `@workspace/integrations-openai-ai-server` appears and no deleted-package names appear in the output. |

***

## C-02 — Normalize tsconfig.base.json

- [ ] **C-02** `PENDING`

### Files
- `tsconfig.base.json`

### Definition of Done
Shared base TypeScript settings are valid for the new workspace layout and do not point at deleted paths. This task only covers the shared base config, not root `tsconfig.json`.

### Out of Scope
- Do not edit root `tsconfig.json` here.
- Do not edit package-local `tsconfig.json` files unless they are truly shared defaults.

### Rules
- Keep this task limited to shared defaults.
- Validate that all remaining references are meaningful after the move.

### Pattern
Base config cleanup only.

### Anti-Patterns
- Do not use this task to fix root project references.

### Imports / Exports
None.

### Depends On
C-01.

### Blocks
V-01, V-02.

| ID | File | Action |
|----|------|--------|
| C-02-01 | `tsconfig.base.json` | Review for stale or deleted package references. |
| C-02-02 | `tsconfig.base.json` | Remove or rewrite any obsolete shared path assumptions. |
| C-02-03 | — | Run `pnpm -w run typecheck:libs` or equivalent root typecheck graph check. Confirm exit 0. |

***

## C-02a — Update root tsconfig.json project references

- [ ] **C-02a** `PENDING`

### Files
- `tsconfig.json` (root)

### Definition of Done
Root `tsconfig.json` `references` array no longer points at any deleted or moved path. The five remaining references are `./packages/db`, `./packages/api-client`, `./packages/api-zod`, `./packages/ui`, and `./lib/integrations-openai-ai-server`. The `./lib/integrations-openai-ai-react` entry was already removed in D-02-02.

### Out of Scope
- Do not edit `tsconfig.base.json` here — that is C-02.
- Do not add other new package references beyond `./packages/ui`.

### Rules
- D-02-02 must be complete before this task — the `integrations-openai-ai-react` reference must already be absent.
- Update the three stale paths (`lib/db`, `lib/api-client-react`, `lib/api-zod`) to their new locations; leave `./lib/integrations-openai-ai-server` unchanged.
- Add the new `./packages/ui` reference created by E-01.
- All path changes must land in a single commit.

### Pattern
Project graph repair after package moves settle.

### Anti-Patterns
- Do not update root `tsconfig.json` before the packages have physically moved — composite build will fail with missing project paths.

### Imports / Exports
None.

### Depends On
D-02, E-01, M-02, M-03, M-04.

### Blocks
V-02.

| ID | File | Action |
|----|------|--------|
| C-02a-01 | `tsconfig.json` (root) | Change `{ "path": "./lib/db" }` to `{ "path": "./packages/db" }`. |
| C-02a-02 | `tsconfig.json` (root) | Change `{ "path": "./lib/api-client-react" }` to `{ "path": "./packages/api-client" }`. |
| C-02a-03 | `tsconfig.json` (root) | Change `{ "path": "./lib/api-zod" }` to `{ "path": "./packages/api-zod" }`. |
| C-02a-04 | `tsconfig.json` (root) | Add `{ "path": "./packages/ui" }` to the references array. |
| C-02a-05 | `tsconfig.json` (root) | Verify `{ "path": "./lib/integrations-openai-ai-server" }` is present and unchanged. |
| C-02a-06 | — | Run `pnpm run typecheck` from root. Confirm exit 0. |

***

## C-03 — Align root package scripts

- [ ] **C-03** `PENDING`

### Files
- `package.json` (root)

### Definition of Done
Root scripts reflect the new workspace layout and point at the new package scopes. Script names remain stable unless a rename is necessary for clarity. `pnpm run build` and `pnpm run typecheck` continue to work.

### Out of Scope
- Do not change package-local scripts here.
- Do not move any files.

### Rules
- Keep script changes minimal.
- If workspace filters are used, ensure they match `apps/*` and `packages/*`, not deleted paths.

### Pattern
Script filter alignment.

### Anti-Patterns
- Do not introduce new script names if the existing ones already work.

### Imports / Exports
None.

### Depends On
C-01.

### Blocks
V-02.

| ID | File | Action |
|----|------|--------|
| C-03-01 | `package.json` (root) | Update workspace filter scripts to target the new package locations. |
| C-03-02 | — | Run `pnpm run build`. Confirm exit 0. |
| C-03-03 | — | Run `pnpm run typecheck`. Confirm exit 0. |

***

## V-01 — Regenerate API artifacts

- [ ] **V-01** `PENDING`

### Files
- `packages/api-spec/`
- `packages/api-client/`
- `packages/api-zod/`

### Definition of Done
Codegen runs successfully from the moved `packages/api-spec` package and regenerates outputs into the new package locations. Generated client and schema artifacts reflect the current API spec. `pnpm --filter @workspace/api-spec run codegen` exits 0.

### Out of Scope
- Do not modify server routes here.
- Do not hand-edit generated output except where the generator itself requires it.

### Rules
- This task depends on the package moves being complete.
- `packages/api-client/src/custom-fetch.ts` must already exist at its new path.

### Pattern
Regenerate after relocation.

### Anti-Patterns
- Do not run codegen before M-01, M-02, and M-03 are complete.
- Do not manually patch generated files if codegen can produce them.

### Imports / Exports
None.

### Depends On
M-01, M-02, M-03, C-01.

### Blocks
V-02.

| ID | File | Action |
|----|------|--------|
| V-01-01 | `packages/api-spec/` | Run the package’s codegen script. |
| V-01-02 | — | Confirm generated files land in `packages/api-client/src/generated` and `packages/api-zod/src/generated` as expected. |
| V-01-03 | — | If codegen fails, fix path or dependency issues before continuing. |

***

## V-02 — Final validation gate

- [ ] **V-02** `PENDING`

### Files
- Entire repository

### Definition of Done
All structural tasks are complete and the workspace is green. Root typecheck, package typechecks, and install all pass. A grep for stale `lib/` and `artifacts/` path references in config and source files returns zero matches outside `pnpm-lock.yaml`.

### Out of Scope
No further structural edits after this task starts.

### Rules
- Run the full validation set only after the earlier tasks are complete.
- If any check fails, fix the root cause rather than adding more compensating steps.

### Pattern
Single final gate.

### Anti-Patterns
- Do not add more migration tasks after this gate.
- Do not leave TODO-only verification steps unresolved.

### Imports / Exports
None.

### Depends On
C-02, C-02a, C-03, V-01.

### Blocks
Nothing.

| ID | File | Action |
|----|------|--------|
| V-02-01 | — | Run `pnpm install` from root. Confirm exit 0. |
| V-02-02 | — | Run `pnpm run typecheck`. Confirm exit 0. |
| V-02-03 | — | Run `pnpm run build`. Confirm exit 0. |
| V-02-04 | — | Run `grep -r 'lib/db\|lib/api-zod\|lib/api-client-react\|artifacts/api-server\|artifacts/mobile' . --include="*.json" --include="*.ts" --include="*.yaml"`. Expected: zero matches outside `pnpm-lock.yaml`. Any match is a stale reference that must be resolved before closing the structural phase. |


***