export type SurveyContact = {
  name: string;
  email: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSurveyContact(input: {
  name?: unknown;
  email?: unknown;
}): { ok: true; voter: SurveyContact } | { ok: false; error: string } {
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
