/** Test-only stub; tests mock getSecret and this fallback fails closed. */
export async function getSecret(_secretName: string): Promise<null> {
  return null;
}
