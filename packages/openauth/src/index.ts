export {
  /**
   * @deprecated
   * Use `import { createClient } from "@kagii/openauth/client"` instead - it will tree shake better
   */
  createClient,
} from "./client.js"

export {
  /**
   * @deprecated
   * Use `import { createSubjects } from "@kagii/openauth/subject"` instead - it will tree shake better
   */
  createSubjects,
} from "./subject.js"

import { issuer } from "./issuer.js"

export {
  /**
   * @deprecated
   * Use `import { issuer } from "@kagii/openauth"` instead, it was renamed
   */
  issuer as authorizer,
  issuer,
}
