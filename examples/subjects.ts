import { object, string } from "valibot"
import { createSubjects } from "@kagii/openauth/subject"

export const subjects = createSubjects({
  user: object({
    id: string(),
  }),
})
