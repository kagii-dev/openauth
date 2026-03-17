import { type CryptoKey, type JWTPayload, jwtVerify, SignJWT } from "jose"

export namespace jwt {
  export function create(
    payload: JWTPayload,
    algorithm: string,
    privateKey: CryptoKey,
  ) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: algorithm, typ: "JWT", kid: "sst" })
      .sign(privateKey)
  }

  export function verify<T>(token: string, publicKey: CryptoKey) {
    return jwtVerify<T>(token, publicKey)
  }
}
