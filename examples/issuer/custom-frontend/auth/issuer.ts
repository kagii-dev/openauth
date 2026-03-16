import { issuer } from "@kagii/openauth"
import { MemoryStorage } from "@kagii/openauth/storage/memory"
import { CodeProvider } from "@kagii/openauth/provider/code"
import { subjects } from "../../../subjects.js"

async function getUser(email: string) {
  // Get user from database
  // Return user ID
  return "123"
}

export default issuer({
  subjects,
  storage: MemoryStorage({
    persist: "./persist.json",
  }),
  providers: {
    code: CodeProvider({
      sendCode: async (claims, code) => {
        console.log(claims.email, code)
      },
      async request(req, state, _form, error) {
        const url = new URL(`http://localhost:3001`)
        url.pathname = `/auth/${state.type}`
        if (error) url.searchParams.set("error", error.type)
        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
          },
        })
      },
    }),
  },
  success: async (ctx, value) => {
    if (value.provider === "code") {
      return ctx.subject("user", {
        id: await getUser(value.claims.email),
      })
    }
    throw new Error("Invalid provider")
  },
})
