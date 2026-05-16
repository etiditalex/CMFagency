"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const inputClass =
  "mt-1.5 w-full min-h-[48px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm";

const btnPrimary =
  "inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-secondary-400 px-4 py-3 text-sm font-bold text-gray-900 transition hover:bg-secondary-300 active:scale-[0.99] disabled:opacity-60";

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 sm:mb-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary-700 text-sm font-bold text-white sm:h-10 sm:w-10">
        {n}
      </span>
      <span className="text-lg font-bold leading-tight text-primary-800 sm:text-xl">{label}</span>
    </div>
  );
}

export default function VisitorSignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("Kenya");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [website, setWebsite] = useState("");

  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!terms) {
      setError("Please accept the terms and conditions.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/visitor-management/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          country,
          addressLine1,
          addressLine2,
          suburb,
          state,
          postcode,
          website,
          email,
          contactName,
          password,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string; emailWarning?: string };
      if (!res.ok) throw new Error(json.error ?? "Registration failed");
      setSuccess(json.message ?? "Account created. Check your email for a login code.");
      setTimeout(() => router.push("/fusion-xpress/smart-visitor-management/sign-in"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mt-8 rounded-xl border border-secondary-200 bg-secondary-50 p-6 text-center">
        <p className="font-semibold text-gray-900">{success}</p>
        <p className="mt-2 text-sm text-gray-600">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 sm:mt-6">
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {step === 1 ? (
        <>
          <StepBadge n={1} label="Project details" />
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Business name *</span>
              <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Country or region *</span>
              <select required value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                <option value="Kenya">Kenya</option>
                <option value="Uganda">Uganda</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Address line 1 *</span>
              <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Address line 2 (optional)</span>
              <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputClass} />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Suburb / city *</span>
                <input type="text" required value={suburb} onChange={(e) => setSuburb(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">State / province *</span>
                <input type="text" required value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Postcode *</span>
              <input type="text" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Website (optional)</span>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`${btnPrimary} mt-6`}
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <StepBadge n={2} label="Login details" />
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Your email *</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Your name *</span>
              <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Password *</span>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600" />
              <span>
                I agree with the{" "}
                <Link href="/terms" className="font-semibold text-secondary-700 hover:text-primary-700">
                  terms and conditions
                </Link>
                *
              </span>
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-outline inline-flex min-h-[48px] flex-1 items-center justify-center py-3 text-sm"
            >
              Back
            </button>
            <button type="submit" disabled={loading} className={`${btnPrimary} flex-1`}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

