// Base64-encodes a password before it goes over the wire, so it isn't sitting
// in the request body as plain readable text (e.g. in browser devtools/logs).
// This is transport obfuscation, not cryptography — the real security is
// TLS in transit and bcrypt at rest server-side. The server decodes this
// back to the original string before hashing/comparing.
export const encodePassword = (password: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(password)));
