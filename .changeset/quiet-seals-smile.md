---
"@kagii/openauth": minor
---

Add several updates since `0.6.0`:

- Add an optional `refresh` callback to `issuer()` so refreshed tokens can recalculate dynamic subject properties (for example roles/permissions) at refresh time.
- Include `token_type: "Bearer"` in token endpoint responses for `authorization_code` and `refresh_token` grants.
- Pass an explicit action type (`"register" | "change"`) to `PasswordProvider` `sendCode` callbacks.
