import { describe, expect, mock, test } from "bun:test"
import { object, string } from "valibot"
import { issuer } from "../src/issuer.js"
import { PasswordProvider } from "../src/provider/password.js"
import { MemoryStorage } from "../src/storage/memory.js"
import { createSubjects } from "../src/subject.js"

const subjects = createSubjects({
  user: object({ email: string() }),
})

function buildApp(
  sendCode: (
    email: string,
    code: string,
    type: "register" | "change",
  ) => Promise<void>,
) {
  return issuer({
    storage: MemoryStorage(),
    subjects,
    allow: async () => true,
    providers: {
      password: PasswordProvider({
        sendCode,
        login: async () => new Response("login"),
        register: async () => new Response("register"),
        change: async () => new Response("change"),
      }),
    },
    success: async (ctx) => ctx.subject("user", { email: "test@example.com" }),
  })
}

function getSessionCookie(res: Response): string {
  return res.headers.get("set-cookie")?.split(";")[0] ?? ""
}

describe("PasswordProvider sendCode type prop", () => {
  test("sendCode is called with type='register'", async () => {
    const sendCode = mock(async () => {})
    const app = buildApp(sendCode)

    const getRes = await app.request(
      "https://auth.example.com/password/register",
    )
    const cookie = getSessionCookie(getRes)

    const fd = new FormData()
    fd.append("action", "register")
    fd.append("email", "test@example.com")
    fd.append("password", "password123")
    fd.append("repeat", "password123")

    await app.request("https://auth.example.com/password/register", {
      method: "POST",
      headers: { cookie },
      body: fd,
    })

    expect(sendCode).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String),
      "register",
    )
  })

  test("sendCode is called with type='change'", async () => {
    const sendCode = mock(async () => {})
    const app = buildApp(sendCode)

    const getRes = await app.request("https://auth.example.com/password/change")
    const cookie = getSessionCookie(getRes)

    const fd = new FormData()
    fd.append("action", "code")
    fd.append("email", "test@example.com")

    await app.request("https://auth.example.com/password/change", {
      method: "POST",
      headers: { cookie },
      body: fd,
    })

    expect(sendCode).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String),
      "change",
    )
  })
})
