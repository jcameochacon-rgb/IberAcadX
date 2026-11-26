/** Invitations use an implicit grant; recovery can also use the token_hash email template. */
export function invitationSession(hash: string) {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const access_token = p.get("access_token"),
    refresh_token = p.get("refresh_token");
  if (
    !access_token ||
    !refresh_token ||
    access_token.length > 16000 ||
    refresh_token.length > 4096
  )
    return null;
  return { access_token, refresh_token };
}
