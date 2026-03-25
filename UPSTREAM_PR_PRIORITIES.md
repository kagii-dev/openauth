| PR number | link | priority | completed | description |
|---|---|---|---|---|
| 309 | https://github.com/anomalyco/openauth/pull/309 | Critical | [ ] | Security fix for missing JWT `aud` validation; prevents token mix-up/confused deputy attacks. |
| 305 | https://github.com/anomalyco/openauth/pull/305 | Critical | [x] | Security fix for malformed `redirect_uri` bypass that could allow external redirects. |
| 323 | https://github.com/anomalyco/openauth/pull/323 | Critical | [x] | Fixes eventual-consistency race that can create hundreds of keys, causing severe latency and crashes on fresh Workers/KV deploys. |
| 304 | https://github.com/anomalyco/openauth/pull/304 | High | [x] | Fixes implicit-flow RFC violation by removing `refresh_token` issuance and adding required token response fields. |
| 318 | https://github.com/anomalyco/openauth/pull/318 | High | [ ] | Adds required `token_type: Bearer` to auth-code and refresh-token responses for OAuth compliance and client compatibility. |
| 103 | https://github.com/anomalyco/openauth/pull/103 | High | [ ] | Adds OAuth `state` verification to the Cloudflare API example; example-level CSRF protection fix. |
| 325 | https://github.com/anomalyco/openauth/pull/325 | Medium | [ ] | Fixes examples/docs so valid sessions do not trigger unnecessary IdP redirects. |
| 310 | https://github.com/anomalyco/openauth/pull/310 | Medium | [ ] | Fixes resend action naming so the UI correctly shows "Code resent to ...". |
| 308 | https://github.com/anomalyco/openauth/pull/308 | Medium | [x] | Fixes mismatched TypeScript definitions for `sendCode` between Code UI and Code Provider. |
| 258 | https://github.com/anomalyco/openauth/pull/258 | Medium | [ ] | Adds missing `iat` claim for token correctness/spec compatibility. |
| 263 | https://github.com/anomalyco/openauth/pull/263 | Medium | [ ] | Small fix for resend action naming; likely overlaps with PR 310. |
| 315 | https://github.com/anomalyco/openauth/pull/315 | Low | [x] | Improves Cloudflare storage adapter typing so generated `KVNamespace` types work cleanly. |
| 317 | https://github.com/anomalyco/openauth/pull/317 | Low | [x] | Adds missing `license` field to `package.json`. |
| 324 | https://github.com/anomalyco/openauth/pull/324 | Low | [ ] | Updates repository URL in docs/metadata. |
| 296 | https://github.com/anomalyco/openauth/pull/296 | Low | [ ] | Unclear `oidc.ts` update with minimal description; needs review for impact. |
| 292 | https://github.com/anomalyco/openauth/pull/292 | Low | [ ] | Adds a missing import in docs/example content. |
| 287 | https://github.com/anomalyco/openauth/pull/287 | Low | [ ] | Adds `createSubjects` import to a code example for IDE discoverability. |
| 261 | https://github.com/anomalyco/openauth/pull/261 | Low | [ ] | Docs typo fix. |
| 260 | https://github.com/anomalyco/openauth/pull/260 | Low | [ ] | Docs update about Zod Standard Schema support. |
| 243 | https://github.com/anomalyco/openauth/pull/243 | Low | [ ] | Fixes typo in `standalone.mdx`. |
| 319 | https://github.com/anomalyco/openauth/pull/319 | Low | [x] | Adds optional `refresh()` callback to update claims during refresh-token flows. |
| 320 | https://github.com/anomalyco/openauth/pull/320 | Low | [x] | Adds `D1Storage` adapter for Cloudflare D1. |
| 303 | https://github.com/anomalyco/openauth/pull/303 | Low | [ ] | WIP for RFC 8707 resource indicators. |
| 284 | https://github.com/anomalyco/openauth/pull/284 | Low | [ ] | Adds support for native iOS/macOS Sign in with Apple token validation flow. |
| 283 | https://github.com/anomalyco/openauth/pull/283 | Low | [ ] | Adds auth-code flow support for OIDC providers, including Apple-related needs. |
| 279 | https://github.com/anomalyco/openauth/pull/279 | Low | [ ] | Adds OAuth 2.0 client-credentials grant support. |
| 278 | https://github.com/anomalyco/openauth/pull/278 | Low | [ ] | Adds registration/access control options to PasswordProvider and CodeProvider. |
| 270 | https://github.com/anomalyco/openauth/pull/270 | Low | [ ] | Adds passkey authentication support. |
| 251 | https://github.com/anomalyco/openauth/pull/251 | Low | [ ] | Adds Go OpenAuth client. |
| 248 | https://github.com/anomalyco/openauth/pull/248 | Low | [ ] | RFC PR for WebAuthn/passkey support. |
| 237 | https://github.com/anomalyco/openauth/pull/237 | Low | [ ] | Adds Redis storage option for issuer. |
| 236 | https://github.com/anomalyco/openauth/pull/236 | Low | [ ] | Adds `basePath` option for deployments behind rewrites/proxies. |
| 235 | https://github.com/anomalyco/openauth/pull/235 | Low | [ ] | Adds UnStorage adapter support. |
| 229 | https://github.com/anomalyco/openauth/pull/229 | Low | [ ] | Automated version-packages release PR. |
| 222 | https://github.com/anomalyco/openauth/pull/222 | Low | [ ] | Adds Expo React Native OAuth example. |
| 221 | https://github.com/anomalyco/openauth/pull/221 | Low | [ ] | Makes provider button copy configurable. |
| 195 | https://github.com/anomalyco/openauth/pull/195 | Low | [ ] | Adds Qwik framework example. |
| 156 | https://github.com/anomalyco/openauth/pull/156 | Low | [ ] | Adds OAuth2 scope support. |
| 152 | https://github.com/anomalyco/openauth/pull/152 | Low | [ ] | Adds SIWE provider for Ethereum wallet sign-in. |
| 126 | https://github.com/anomalyco/openauth/pull/126 | Low | [ ] | Draft custom base-path support; likely superseded by PR 236. |
| 118 | https://github.com/anomalyco/openauth/pull/118 | Low | [ ] | Adds default code support for email and phone flows. |
| 115 | https://github.com/anomalyco/openauth/pull/115 | Low | [ ] | Adds Bitbucket adapter. |
| 110 | https://github.com/anomalyco/openauth/pull/110 | Low | [ ] | Adds browser-post SAML support. |
| 50 | https://github.com/anomalyco/openauth/pull/50 | Low | [ ] | Older Redis store implementation; likely superseded by PR 237. |
| 21 | https://github.com/anomalyco/openauth/pull/21 | Low | [ ] | Adds SQLite/libsql storage option. |
