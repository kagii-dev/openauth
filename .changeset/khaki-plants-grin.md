---
"@kagii/openauth": minor
---

Improve JWT audience validation in `client.verify()` while preserving existing behavior.

`verify()` now validates token audience against the client `clientID` by default, with optional override via `options.audience` when needed.

This release also adds audience validation regression tests and improves `/userinfo` handling for invalid tokens.
