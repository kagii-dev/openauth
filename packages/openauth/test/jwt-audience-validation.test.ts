import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test"
import { object, string } from "valibot"
import { createClient } from "../src/client.js"
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

describe("jwt audience validation", () => {
  let auth: ReturnType<typeof issuer>

  beforeEach(() => {
    setSystemTime(new Date("1/1/2024"))
    auth = issuer({
      storage: MemoryStorage(),
      subjects,
      allow: async () => true,
      ttl: {
        access: 60,
        refresh: 6000,
      },
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
      success: async (ctx) => {
        return ctx.subject("user", {
          userID: "123",
        })
      },
    })
  })

  afterEach(() => {
    setSystemTime()
  })

  function createTestClient(clientID: string) {
    return createClient({
      issuer: "https://auth.example.com",
      clientID,
      fetch: (a, b) => Promise.resolve(auth.request(a, b)),
    })
  }

  async function issueTokens(clientID: string) {
    const client = createTestClient(clientID)
    const redirectURI = "https://client.example.com/callback"
    const { challenge, url } = await client.authorize(redirectURI, "code", {
      pkce: true,
    })

    let response = await auth.request(url)
    response = await auth.request(response.headers.get("location")!, {
      headers: {
        cookie: response.headers.get("set-cookie")!,
      },
    })

    const location = new URL(response.headers.get("location")!)
    const code = location.searchParams.get("code")
    const exchanged = await client.exchange(
      code!,
      redirectURI,
      challenge.verifier,
    )

    if (exchanged.err) throw exchanged.err
    return exchanged.tokens
  }

  test("rejects a token issued for another client", async () => {
    const tokens = await issueTokens("client-a")
    const client = createTestClient("client-b")

    expect(
      await client.verify(subjects, tokens.access, {
        audience: "client-b",
      }),
    ).toStrictEqual({
      err: expect.any(InvalidAccessTokenError),
    })
  })

  test("accepts an explicit matching audience override", async () => {
    const tokens = await issueTokens("client-a")
    const client = createTestClient("client-b")

    const verified = await client.verify(subjects, tokens.access, {
      audience: "client-a",
    })

    if (verified.err) throw verified.err
    expect(verified).toStrictEqual({
      aud: "client-a",
      subject: {
        type: "user",
        properties: {
          userID: "123",
        },
      },
    })
  })

  test("rejects an explicit mismatched audience override", async () => {
    const tokens = await issueTokens("client-a")
    const client = createTestClient("client-b")

    expect(
      await client.verify(subjects, tokens.access, {
        audience: "client-b",
      }),
    ).toStrictEqual({
      err: expect.any(InvalidAccessTokenError),
    })
  })

  test("preserves the explicit audience when refreshing an expired token", async () => {
    const tokens = await issueTokens("client-a")
    const client = createTestClient("client-b")

    setSystemTime(Date.now() + 1000 * 61)

    const verified = await client.verify(subjects, tokens.access, {
      audience: "client-a",
      refresh: tokens.refresh,
    })

    if (verified.err) throw verified.err
    expect(verified).toStrictEqual({
      aud: "client-a",
      tokens: {
        access: expect.stringMatching(/.+/),
        refresh: expect.stringMatching(/.+/),
        expiresIn: 60,
      },
      subject: {
        type: "user",
        properties: {
          userID: "123",
        },
      },
    })
  })
})
