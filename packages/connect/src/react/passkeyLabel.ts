/** Names the prompt the person is about to see; "passkey" is the fallback when the platform is unknown. */
export function passkeyLabel(userAgent: string): string {
  if (/iPhone/.test(userAgent)) return "Continue with Face ID";
  if (/Macintosh|iPad/.test(userAgent)) return "Continue with Touch ID";
  if (/Windows/.test(userAgent)) return "Continue with Windows Hello";
  return "Continue with a passkey";
}
