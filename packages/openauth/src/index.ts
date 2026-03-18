import { createClient as _createClient } from "./client.js"
import { issuer as _issuer } from "./issuer.js"
import { createSubjects as _createSubjects } from "./subject.js"

const to_exports = {
  issuer: _issuer,
  createClient: _createClient,
  createSubjects: _createSubjects,
}

export const issuer = to_exports.issuer
export const createClient = to_exports.createClient
/**
 * @deprecated
 * Use `import { createSubjects } from "@kagii/openauth/subject"` instead - it will tree shake better
 */
export const createSubjects = to_exports.createSubjects
/**
 * @deprecated
 * Use `import { issuer } from "@kagii/openauth"` instead, it was renamed
 */
export const authorizer = to_exports.issuer
