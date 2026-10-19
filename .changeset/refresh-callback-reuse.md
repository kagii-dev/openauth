---
"@kagii/openauth": patch
---

Fix refresh token reuse when an `issuer({ refresh })` callback is set. A refresh repeated within the reuse interval returned a new random refresh token that was never stored, so the client's next refresh failed with `invalid_grant`. The callback path now returns the reserved `nextToken` (like the default path) and also includes `token_type: "Bearer"`.
