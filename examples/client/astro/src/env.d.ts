import type { SubjectPayload } from "@kagii/openauth/subject"
import { subjects } from "./auth"

declare global {
  declare namespace App {
    interface Locals {
      subject?: SubjectPayload<typeof subjects>
    }
  }
}
