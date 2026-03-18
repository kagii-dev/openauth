/**
 * VULNERABILITY TEST: JWT Audience (aud) Claim Validation
 *
 * These tests FAIL when vulnerability exists (before commit 4676a2f)
 * These tests PASS when vulnerability is fixed (after commit 4676a2f)
 *
 * Vulnerability: JWT tokens were created with audience claims but never
 * validated during verification, violating RFC 7519 §4.1.3 requirements.
 *
 * Impact: Token mix-up attacks where tokens issued for one service could
 * be used to authenticate with another service.
 *
 * Reference:
 * - Commit: 4676a2f03420927c1a4c23de1cfb18e799aebe51
 * - RFC 7519 §4.1.3: https://tools.ietf.org/html/rfc7519#section-4.1.3
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { object, string } from "valibot"
import { createClient, type VerifyError } from "../src/client.js"
import { InvalidAccessTokenError } from "../src/error.js"
import { issuer } from "../src/issuer.js"
import type { Provider } from "../src/provider/provider.js"
import { MemoryStorage } from "../src/storage/memory.js"
import { createSubjects } from "../src/subject.js"

const subjects = createSubjects({
  user: object({
    userID: string(),
  }),
})

let storage = MemoryStorage()

describe("JWT Audience Validation (RFC 7519 §4.1.3)", () => {
  let auth: ReturnType<typeof issuer>
  let clientA: ReturnType<typeof createClient>
  let clientB: ReturnType<typeof createClient>

  beforeEach(() => {
    storage = MemoryStorage()
    auth = issuer({
      storage,
      subjects,
      providers: {
        dummy: {
          type: "dummy",
          init(route, ctx) {
            route.get("/authorize", async (c) => {
              return ctx.success(c, {
                email: "foo@bar.com",
              })
            })
          },
        } satisfies Provider<{ email: string }>,
      },
      success: async (ctx, value) => {
        if (value.provider === "dummy") {
          return ctx.subject("user", {
            userID: "123",
          })
        }
        throw new Error("Invalid provider: " + value.provider)
      },
    })

    // Client A - represents one service
    clientA = createClient({
      issuer: "https://auth.example.com",
      clientID: "client-a",
      fetch: (a, b) => Promise.resolve(auth.request(a, b)),
    })

    // Client B - represents a different service
    clientB = createClient({
      issuer: "https://auth.example.com",
      clientID: "client-b",
      fetch: (a, b) => Promise.resolve(auth.request(a, b)),
    })
  })

  async function generateTokenForClient(clientID: string) {
    const client = createClient({
      issuer: "https://auth.example.com",
      clientID,
      fetch: (a, b) => Promise.resolve(auth.request(a, b)),
    })

    const { challenge, url } = await client.authorize(
      "https://client.example.com/callback",
      "code",
      { pkce: true },
    )

    let response = await auth.request(url)
    response = await auth.request(response.headers.get("location")!, {
      headers: { cookie: response.headers.get("set-cookie")! },
    })

    const location = new URL(response.headers.get("location")!)
    const code = location.searchParams.get("code")!

    const exchanged = await client.exchange(
      code,
      "https://client.example.com/callback",
      challenge.verifier,
    )

    if (exchanged.err) throw exchanged.err
    return exchanged.tokens.access
  }

  describe("Token Mix-Up Attack Prevention", () => {
    test("Token issued for client-a should NOT work for client-b", async () => {
      // Generate token for client A
      const tokenForClientA = await generateTokenForClient("client-a")

      // Try to use client A's token with client B
      const result = await clientB.verify(subjects, tokenForClientA)

      // Should fail with audience mismatch error
      expect(result.err).toBeInstanceOf(InvalidAccessTokenError)
    })
  })
  describe("Backward Compatibility", () => {
    test("Token should still work for the same client", async () => {
      const tokenForClientA = await generateTokenForClient("client-a")
      const res = await clientA.verify(subjects, tokenForClientA)
      expect(res.err).toBeUndefined()

      expect(
        (res as Exclude<typeof res, VerifyError>).subject.properties,
      ).toEqual({
        userID: "123",
      })
    })
  })
  describe("Edge Cases", () => {
    test("Case-sensitive audience mismatching", async () => {
      const token = await generateTokenForClient("MyService")

      const lowerClient = createClient({
        issuer: "https://auth.example.com",
        clientID: "myservice", // lowercase
        fetch: (a, b) => Promise.resolve(auth.request(a, b)),
      })

      // Lowercase should fail (case-sensitive)
      const lowerResult = await lowerClient.verify(subjects, token)
      expect(lowerResult.err).toBeInstanceOf(InvalidAccessTokenError)
    })
  })
})
