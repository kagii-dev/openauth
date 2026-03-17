# AGENTS.md

Guidance for coding agents working in `openauth`.

## Repo snapshot
- Runtime and package manager: `bun`
- Main package: `packages/openauth`
- Language: TypeScript, ESM, `"type": "module"`
- Main libraries: Hono, jose, valibot, Bun test
- Published package name in this fork: `@kagii/openauth`

## Higher-priority agent rules
- No `.cursor/rules/` directory was found.
- No `.cursorrules` file was found.
- No `.github/copilot-instructions.md` file was found.
- If any of those files appear later, treat them as higher-priority guidance and update this file.

## Key directories
- `packages/openauth/src` - library source
- `packages/openauth/test` - Bun tests
- `packages/openauth/script` - build scripts
- `examples/` - examples and integrations
- `www/` - docs/site assets

## Working principles
- Prefer focused diffs over broad refactors.
- Keep public APIs stable unless the task explicitly changes them.
- Preserve existing `.js` extensions in relative TypeScript imports.
- Do not hand-edit generated output under `dist/`.
- Avoid touching examples unless the task needs it.

## Install
`bun install`

## Root commands
Run these from the repo root:

```bash
bun run check
bun run check:write
bun run check:ci
bun run test
bun run typecheck
```

- `check`, `check:write`, and `check:ci` run Biome across package workspaces.
- `test` runs workspace package tests.
- `typecheck` runs `tsc --noEmit` where configured.

## Package commands
Useful when you only want the published package:

```bash
bun run --filter "@kagii/openauth" build
bun run --filter "@kagii/openauth" test
bun run --filter "@kagii/openauth" check
bun run --filter "@kagii/openauth" check:write
bun run --filter "@kagii/openauth" typecheck
```

Inside `packages/openauth`:
```bash
bun run build
bun test
biome check .
biome check --write .
tsc --noEmit -p tsconfig.json
```

## Single-test commands
From the repo root, run a single test file with Bun:

```bash
bun test packages/openauth/test/client.test.ts
bun test packages/openauth/test/issuer.test.ts
bun test packages/openauth/test/redirect-uri-validation.test.ts
```

From `packages/openauth`:
```bash
bun test test/client.test.ts
```

Run one test or one describe block by name:
```bash
bun test packages/openauth/test/client.test.ts --test-name-pattern "success"
```

## Recommended validation flow
- Small source change: run the most relevant single test file first.
- API or type change: run `bun run typecheck`.
- Formatting or lint-sensitive change: run `bun run check` or `bun run check:write`.
- Broader behavior change: finish with `bun run test`.

Typical sequence:
```bash
bun test packages/openauth/test/<relevant>.test.ts
bun run typecheck
bun run check
bun run test
```

## Build details
- Build script lives at `packages/openauth/script/build.ts`.
- Build deletes `dist/`, builds ESM output into `dist/esm`, and emits declarations into `dist/types`.
- Source entrypoints are discovered with Bun `Glob` over `src/**/*.{ts,tsx}`.
- TSX is used in UI code with `jsxImportSource: "hono/jsx"`.

## Formatting
- Biome is the formatter and linter.
- Indentation is 2 spaces.
- Semicolons are usually omitted.
- Use double quotes.
- Let Biome format instead of hand-aligning code.
- Root Biome config ignores `examples`, `dist`, `.next`, `.sst`, and `.svelte-kit`.
- Package-level Biome rules allow `any` and non-null assertions when necessary; still use them sparingly.

## Imports
- Use ESM imports only.
- Keep relative imports with explicit `.js` extensions, for example `./error.js`.
- Prefer `import type` for type-only imports.
- Prefer named imports over namespace imports.
- Let Biome handle final import ordering.
- Do not introduce path aliases unless the repo already uses them.

## TypeScript style
- Prefer explicit exported interfaces and types for public APIs.
- Use `interface` for object-shaped config and API contracts.
- Use `type` for unions, mapped types, utility types, and aliases.
- Preserve strong inference in helpers like `issuer()` and `createClient()`.
- Avoid widening public types without a clear reason.
- Match existing protocol naming such as `clientID`, `redirectURI`, and `response_type`.

## Naming
- Provider factory functions use PascalCase, for example `GithubProvider`.
- General helpers use camelCase, for example `issuer`, `createClient`, `createSubjects`.
- Error classes use PascalCase and end in `Error`.
- Internal variables and functions use camelCase.
- Test names should read like behavioral expectations.
- Keep OAuth query and form parameter names in protocol casing, including snake_case.

## Error handling
- Prefer `OauthError` subclasses for protocol-facing failures.
- Reuse existing JSON error or redirect shapes used by nearby endpoints.
- Preserve existing status code behavior unless the change intentionally fixes it.
- Throw specific custom errors when callers or `onError` logic already distinguish them.
- Do not silently swallow unexpected errors; logging with `console.error` is common in this repo.

## Testing conventions
- Tests use `bun:test`.
- Test files live in `packages/openauth/test` and use `*.test.ts`.
- Follow the existing `describe()` plus focused `test()` structure.
- Reuse helpers like `issuer`, `createClient`, `MemoryStorage`, and `createSubjects`.
- For auth flows, assert status codes, response payloads, and redirect URLs.
- For time-sensitive behavior, use `setSystemTime()` and restore time in cleanup.
- For security fixes, add regression tests that prove the unsafe input no longer succeeds.

## Documentation and comments
- Preserve existing JSDoc on exported APIs when editing those areas.
- Add comments only for non-obvious logic, protocol caveats, or security-sensitive behavior.
- Keep examples aligned with the forked package name `@kagii/openauth` when you touch docs.

## Git and generated files
- Pre-commit runs `bun run check:write && git add -A`.
- Expect formatting changes to be staged automatically during commit.
- Avoid changing `bun.lockb` unless dependency resolution actually changed.
- Never manually edit `dist/` artifacts.

## When unsure
- Follow nearby patterns in `packages/openauth/src/issuer.ts`, `packages/openauth/src/client.ts`, and existing tests.
- Choose the smallest safe change.
- Run the narrowest relevant test first, then broaden validation.
