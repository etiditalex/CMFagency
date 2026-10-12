export type LiveVoteConsent = {
  name: string;
  email: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseLiveVoteConsent(input: {
  name?: unknown;
  email?: unknown;
  acceptTerms?: unknown;
}): { ok: true; voter: LiveVoteConsent } | { ok: false; error: string } {
  if (input.acceptTerms !== true) {
    return { ok: false, error: "Accept the terms and conditions to vote." };
  }
  if (typeof input.name !== "string") return { ok: false, error: "Enter your name to vote." };
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80 || /[<>]/.test(name) || /[\u0000-\u001f]/.test(name)) {
    return { ok: false, error: "Enter your name to vote." };
  }
  if (typeof input.email !== "string") return { ok: false, error: "Enter a valid email address to vote." };
  const email = input.email.trim().toLowerCase();
  if (email.length < 6 || email.length > 120 || !EMAIL.test(email)) {
    return { ok: false, error: "Enter a valid email address to vote." };
  }
  return { ok: true, voter: { name, email } };
}
