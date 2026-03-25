import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test"
import { array, object, optional, string } from "valibot"
import { createClient } from "../src/client.js"
import { issuer } from "../src/issuer.js"
import type { Provider } from "../src/provider/provider.js"
import { MemoryStorage } from "../src/storage/memory.js"
import { createSubjects } from "../src/subject.js"

const subjects = createSubjects({
  user: object({
    userID: string(),
    permissions: optional(array(string())),
  }),
})

const storage = MemoryStorage()
const issuerConfig = {
  storage,
  subjects,
  allow: async () => true,
  ttl: {
    access: 60,
    refresh: 6000,
    refreshReuse: 60,
    refreshRetention: 6000,
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
      client: async ({ clientID, clientSecret }) => {
        if (clientID !== "myuser" && clientSecret !== "mypass") {
          throw new Error("Wrong credentials")
        }
        return {
          email: "foo@bar.com",
        }
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
}
const auth = issuer(issuerConfig)

const expectNonEmptyString = expect.stringMatching(/.+/)

beforeEach(async () => {
  setSystemTime(new Date("1/1/2024"))
})

afterEach(() => {
  setSystemTime()
})

describe("response_type=token", () => {
  test("returns Bearer token metadata without refresh_token", async () => {
    const url = new URL("https://auth.example.com/authorize")
    url.searchParams.set("client_id", "123")
    url.searchParams.set("redirect_uri", "https://client.example.com/callback")
    url.searchParams.set("response_type", "token")
    url.searchParams.set("provider", "dummy")

    let response = await auth.request(url.toString())
    expect(response.status).toBe(302)

    response = await auth.request(response.headers.get("location")!, {
      headers: {
        cookie: response.headers.get("set-cookie")!,
      },
    })

    expect(response.status).toBe(302)
    const location = new URL(response.headers.get("location")!)
    expect(location.origin + location.pathname).toBe(
      "https://client.example.com/callback",
    )

    const fragmentParams = new URLSearchParams(location.hash.substring(1))

    expect(fragmentParams.has("access_token")).toBe(true)
    expect(fragmentParams.get("access_token")).toMatch(/.+/)

    expect(fragmentParams.get("token_type")).toBe("Bearer")

    expect(fragmentParams.has("expires_in")).toBe(true)
    expect(parseInt(fragmentParams.get("expires_in")!, 10)).toBeGreaterThan(0)

    expect(fragmentParams.has("refresh_token")).toBe(false)

    expect(fragmentParams.has("state")).toBe(true)
  })
})

describe("code flow", () => {
  test("success", async () => {
    const client = createClient({
      issuer: "https://auth.example.com",
      clientID: "123",
      fetch: (a, b) => Promise.resolve(auth.request(a, b)),
    })
    const { challenge, url } = await client.authorize(
      "https://client.example.com/callback",
      "code",
      {
        pkce: true,
      },
    )
    let response = await auth.request(url)
    expect(response.status).toBe(302)
    response = await auth.request(response.headers.get("location")!, {
      headers: {
        cookie: response.headers.get("set-cookie")!,
      },
    })
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get("location")!)
    const code = location.searchParams.get("code")
    expect(code).not.toBeNull()
    const exchanged = await client.exchange(
      code!,
      "https://client.example.com/callback",
      challenge.verifier,
    )
    if (exchanged.err) throw exchanged.err
    const tokens = exchanged.tokens
    expect(tokens).toStrictEqual({
      access: expectNonEmptyString,
      refresh: expectNonEmptyString,
      expiresIn: 60,
    })
    const verified = await client.verify(subjects, tokens.access, {
      audience: "123",
    })
    if (verified.err) throw verified.err
    expect(verified.subject).toStrictEqual({
      type: "user",
      properties: {
        userID: "123",
      },
    })
  })
})

describe("error handling (same-request)", () => {
  test("select() throws after authorization is set -> must redirect with OAuth error", async () => {
    // Two entries pointing to the same dummy provider to trigger the select() UI
    const multiProviderIssuer = issuer({
      ...issuerConfig,
      providers: {
        a: issuerConfig.providers.dummy,
        b: issuerConfig.providers.dummy,
      },
      // Force an error after state is set but before the response is returned
      select: async () => {
        throw new Error("boom")
      },
    })

    const client = createClient({
      issuer: "https://auth.example.com",
      clientID: "web",
      fetch: (a, b) => Promise.resolve(multiProviderIssuer.request(a, b)),
    })

    const { url } = await client.authorize(
      "https://client.example.com/callback",
      "code",
    )

    const res = await multiProviderIssuer.request(url)

    // Desired behavior: redirect to redirect_uri with server_error
    expect(res.status).toBe(302)
    const location = new URL(res.headers.get("location")!)
    expect(location.origin + location.pathname).toBe(
      "https://client.example.com/callback",
    )
    expect(location.searchParams.get("error")).toBe("server_error")
  })
})

describe("authorization precedence", () => {
  test("request-local authorization wins over stale cookie when both are present", async () => {
    // 1) Create a stale authorization cookie pointing to old.example.com
    const staleIssuer = issuer(issuerConfig)
    const staleClient = createClient({
      issuer: "https://auth.example.com",
      clientID: "web",
      fetch: (a, b) => Promise.resolve(staleIssuer.request(a, b)),
    })
    const { url: staleUrl } = await staleClient.authorize(
      "https://old.example.com/callback",
      "code",
    )
    const staleRes = await staleIssuer.request(staleUrl)
    expect(staleRes.status).toBe(302)
    const staleCookie = staleRes.headers.get("set-cookie")!

    // 2) In a new request, also create a fresh request-local authorization but throw before responding
    //    to trigger app.onError within the same request. Include the stale cookie in the request.
    const throwingIssuer = issuer({
      ...issuerConfig,
      providers: {
        a: issuerConfig.providers.dummy,
        b: issuerConfig.providers.dummy,
      },
      select: async () => {
        throw new Error("boom")
      },
    })
    const freshClient = createClient({
      issuer: "https://auth.example.com",
      clientID: "web",
      fetch: (a, b) => Promise.resolve(throwingIssuer.request(a, b)),
    })
    const { url: freshUrl } = await freshClient.authorize(
      "https://new.example.com/callback",
      "code",
    )
    const res = await throwingIssuer.request(freshUrl, {
      headers: { cookie: staleCookie },
    })

    // The current request-local authorization should win over the stale cookie
    expect(res.status).toBe(302)
    const location = new URL(res.headers.get("location")!)
    expect(location.origin + location.pathname).toBe(
      "https://new.example.com/callback",
    )
  })
})

describe("client credentials flow", () => {
  test("success", async () => {
    const client = createClient({
      issuer: "https://auth.example.com",
      clientID: "myuser",
      fetch: (a, b) => Promise.resolve(auth.request(a, b)),
    })
    const response = await auth.request("https://auth.example.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        provider: "dummy",
        client_id: "myuser",
        client_secret: "mypass",
      }).toString(),
    })
    expect(response.status).toBe(200)
    const tokens = await response.json()
    expect(tokens).toStrictEqual({
      access_token: expectNonEmptyString,
      refresh_token: expectNonEmptyString,
    })
    const verified = await client.verify(subjects, tokens.access_token, {
      audience: "myuser",
    })
    expect(verified).toStrictEqual({
      aud: "myuser",
      subject: {
        type: "user",
        properties: {
          userID: "123",
        },
      },
    })
  })
})

describe("refresh token", () => {
  let tokens: { access: string; refresh: string }
  let client: ReturnType<typeof createClient>

  const generateTokens = async (issuer: typeof auth) => {
    const { challenge, url } = await client.authorize(
      "https://client.example.com/callback",
      "code",
      {
        pkce: true,
      },
    )
    let response = await issuer.request(url)
    response = await issuer.request(response.headers.get("location")!, {
      headers: {
        cookie: response.headers.get("set-cookie")!,
      },
    })
    const location = new URL(response.headers.get("location")!)
    const code = location.searchParams.get("code")
    const exchanged = await client.exchange(
      code!,
      "https://client.example.com/callback",
      challenge.verifier,
    )
    if (exchanged.err) throw exchanged.err
    return exchanged.tokens
  }

  const createClientAndTokens = async (issuer: typeof auth) => {
    client = createClient({
      issuer: "https://auth.example.com",
      clientID: "123",
      fetch: (a, b) => Promise.resolve(issuer.request(a, b)),
    })
    tokens = await generateTokens(issuer)
  }

  const requestRefreshToken = async (
    refresh_token: string,
    issuer?: typeof auth,
  ) =>
    (issuer ?? auth).request("https://auth.example.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        ...(refresh_token ? { refresh_token } : {}),
      }).toString(),
    })

  beforeEach(async () => {
    await createClientAndTokens(auth)
  })

  test("success", async () => {
    setSystemTime(Date.now() + 1000 * 60 + 1000)
    const response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(200)
    const refreshed = await response.json()
    expect(refreshed).toStrictEqual({
      access_token: expectNonEmptyString,
      refresh_token: expectNonEmptyString,
      expires_in: expect.any(Number),
    })
    expect(refreshed.access_token).not.toEqual(tokens.access)
    expect(refreshed.refresh_token).not.toEqual(tokens.refresh)

    const verified = await client.verify(subjects, refreshed.access_token, {
      audience: "123",
    })
    expect(verified).toStrictEqual({
      aud: "123",
      subject: {
        type: "user",
        properties: {
          userID: "123",
        },
      },
    })
  })

  test("success with valid access token", async () => {
    // have to increment the time so new access token claims are different (i.e. exp)
    setSystemTime(Date.now() + 1000)
    const response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(200)
    const refreshed = await response.json()
    expect(refreshed).toStrictEqual({
      access_token: expectNonEmptyString,
      refresh_token: expectNonEmptyString,
      expires_in: expect.any(Number),
    })

    expect(refreshed.access_token).not.toEqual(tokens.access)
    expect(refreshed.refresh_token).not.toEqual(tokens.refresh)

    const verified = await client.verify(subjects, refreshed.access_token, {
      audience: "123",
    })
    expect(verified).toStrictEqual({
      aud: "123",
      subject: {
        type: "user",
        properties: {
          userID: "123",
        },
      },
    })
  })

  test("multiple active tokens", async () => {
    const tokens2 = await generateTokens(auth)

    let response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(200)

    response = await requestRefreshToken(tokens2.refresh)
    expect(response.status).toBe(200)
  })

  test("failure with reuse interval disabled", async () => {
    const issuerWithoutReuse = issuer({
      ...issuerConfig,
      ttl: {
        ...issuerConfig.ttl,
        reuse: 0,
        retention: 0,
      },
    })
    await createClientAndTokens(issuerWithoutReuse)
    let response = await requestRefreshToken(tokens.refresh, issuerWithoutReuse)
    expect(response.status).toBe(200)

    response = await requestRefreshToken(tokens.refresh, issuerWithoutReuse)
    expect(response.status).toBe(400)
    const reused = await response.json()
    expect(reused.error).toBe("invalid_grant")
  })

  test("success with reuse interval enabled", async () => {
    let response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(200)
    const refreshed = await response.json()
    const [, refreshedAccessPayload] = refreshed.access_token.split(".")

    setSystemTime(Date.now() + 1000 * 30)

    response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(200)
    const reused = await response.json()
    const [, reusedAccessPayload] = reused.access_token.split(".")
    expect(refreshed.refresh_token).toEqual(reused.refresh_token)
    /**
     * Access token signature is different every time for ES256 alg,
     * but the payload should be the same.
     */
    expect(refreshedAccessPayload).toEqual(reusedAccessPayload)
  })

  test("invalidated with reuse detection", async () => {
    let response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(200)

    setSystemTime(Date.now() + 1000 * 60 + 1000)

    response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(400)
  })

  test("expired failure", async () => {
    setSystemTime(Date.now() + 1000 * 6000 + 1000)
    const response = await requestRefreshToken(tokens.refresh)
    expect(response.status).toBe(400)
    const reused = await response.json()
    expect(reused.error).toBe("invalid_grant")
  })

  test("missing failure", async () => {
    const response = await requestRefreshToken("")
    expect(response.status).toBe(400)
    const reused = await response.json()
    expect(reused.error).toBe("invalid_request")
  })

  test("refresh callback updates properties", async () => {
    let refreshCallCount = 0
    const refreshedSubjects = createSubjects({
      user: object({
        userID: string(),
        permissions: optional(array(string())),
      }),
    })
    const issuerWithRefresh = issuer({
      ...issuerConfig,
      subjects: refreshedSubjects,
      refresh: async (ctx, value) => {
        refreshCallCount++
        expect(value.type).toBe("user")
        expect(value.properties).toStrictEqual({ userID: "123" })
        expect(value.subject).toMatch(/^user:[a-f0-9]+$/)
        expect(value.clientID).toBe("123")

        return ctx.subject("user", {
          userID: "123",
          permissions: ["read", "write"],
        })
      },
    })

    const client = createClient({
      issuer: "https://auth.example.com",
      clientID: "123",
      fetch: (a, b) => Promise.resolve(issuerWithRefresh.request(a, b)),
    })

    // Generate initial tokens
    const { challenge, url } = await client.authorize(
      "https://client.example.com/callback",
      "code",
      { pkce: true },
    )
    let response = await issuerWithRefresh.request(url)
    response = await issuerWithRefresh.request(
      response.headers.get("location")!,
      {
        headers: {
          cookie: response.headers.get("set-cookie")!,
        },
      },
    )
    const location = new URL(response.headers.get("location")!)
    const code = location.searchParams.get("code")
    const exchanged = await client.exchange(
      code!,
      "https://client.example.com/callback",
      challenge.verifier,
    )
    if (exchanged.err) throw exchanged.err
    const initialTokens = exchanged.tokens

    // Verify initial token doesn't have permissions (just has userID)
    const initialVerified = await client.verify(
      refreshedSubjects,
      initialTokens.access,
    )
    if (initialVerified.err) throw initialVerified.err
    expect(initialVerified.subject.type).toBe("user")
    expect(initialVerified.subject.properties.userID).toBe("123")
    expect(initialVerified.subject.properties.permissions).toBeUndefined()
    expect(refreshCallCount).toBe(0)

    // Refresh the token
    setSystemTime(Date.now() + 1000 * 60 + 1000)
    response = await issuerWithRefresh.request(
      "https://auth.example.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: initialTokens.refresh,
        }).toString(),
      },
    )
    expect(response.status).toBe(200)
    const refreshed = await response.json()
    expect(refreshCallCount).toBe(1)

    // Verify refreshed token has updated properties including permissions
    const refreshedVerified = await client.verify(
      refreshedSubjects,
      refreshed.access_token,
    )
    expect(refreshedVerified).toStrictEqual({
      aud: "123",
      subject: {
        type: "user",
        properties: {
          userID: "123",
          permissions: ["read", "write"],
        },
      },
    })
    if (refreshedVerified.err) throw refreshedVerified.err
    // Explicitly verify permissions were added by the refresh callback
    expect(refreshedVerified.subject.properties.permissions).toStrictEqual([
      "read",
      "write",
    ])
  })
})

describe("user info", () => {
  let tokens: { access: string; refresh: string }
  let client: ReturnType<typeof createClient>

  const generateTokens = async (issuer: typeof auth) => {
    const { challenge, url } = await client.authorize(
      "https://client.example.com/callback",
      "code",
      { pkce: true },
    )
    let response = await issuer.request(url)
    response = await issuer.request(response.headers.get("location")!, {
      headers: {
        cookie: response.headers.get("set-cookie")!,
      },
    })
    const location = new URL(response.headers.get("location")!)
    const code = location.searchParams.get("code")
    const exchanged = await client.exchange(
      code!,
      "https://client.example.com/callback",
      challenge.verifier,
    )
    if (exchanged.err) throw exchanged.err
    return exchanged.tokens
  }

  const createClientAndTokens = async (issuer: typeof auth) => {
    client = createClient({
      issuer: "https://auth.example.com",
      clientID: "123",
      fetch: (a, b) => Promise.resolve(issuer.request(a, b)),
    })
    tokens = await generateTokens(issuer)
  }

  beforeEach(async () => {
    await createClientAndTokens(auth)
  })

  test("success", async () => {
    const response = await auth.request("https://auth.example.com/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access}` },
    })

    const userinfo = await response.json()

    expect(userinfo).toStrictEqual({ userID: "123" })
  })

  test("invalid token", async () => {
    const response = await auth.request("https://auth.example.com/userinfo", {
      headers: { Authorization: "Bearer invalid.token.here" },
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toStrictEqual({
      error: "invalid_token",
      error_description: "Token verification failed",
    })
  })
})
