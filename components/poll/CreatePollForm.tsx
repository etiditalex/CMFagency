"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, X } from "lucide-react";

const SECURITY = ["One vote per IP address", "One vote per browser"] as const;
const VISIBILITY = ["Always public"] as const;
const EDIT_VOTES = ["Nobody"] as const;

function fieldClass() {
  return "w-full rounded-lg border border-white/10 bg-primary-950 px-3 py-2.5 text-sm font-medium text-white outline-none placeholder:text-white/35 focus:border-primary-300";
}

function Toggle({
  label,
  on,
  onChange,
  disabled,
  extra,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-sm font-medium text-white/90">
        {label}
        {extra}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary-500" : "bg-white/25"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export default function CreatePollForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [requireNames, setRequireNames] = useState(false);
  const [security, setSecurity] = useState<(typeof SECURITY)[number]>("One vote per IP address");
  const [learnMore, setLearnMore] = useState(false);
  const [blockVpn, setBlockVpn] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [closeOnDate, setCloseOnDate] = useState(false);
  const [ends, setEnds] = useState("");
  const [allowComments, setAllowComments] = useState(false);
  const [hideShare, setHideShare] = useState(false);
  const [anonymize, setAnonymize] = useState(false);
  const [designNote, setDesignNote] = useState(false);
  const [resultsVisibility, setResultsVisibility] = useState<(typeof VISIBILITY)[number]>("Always public");
  const [editVotes, setEditVotes] = useState<(typeof EDIT_VOTES)[number]>("Nobody");
  const [votingInterval, setVotingInterval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, item) => (item === index ? value : option)));
  }

  function removeOption(index: number) {
    setOptions((current) => {
      if (current.length <= 2) {
        return current.map((option, item) => (item === index ? "" : option));
      }
      return current.filter((_, item) => item !== index);
    });
  }

  function addOption() {
    setOptions((current) => (current.length >= 12 ? current : [...current, ""]));
  }

  function addOther() {
    setOptions((current) => {
      if (current.some((option) => option.trim().toLowerCase() === "other")) return current;
      if (current.length >= 12) return current;
      return [...current, "Other"];
    });
  }

  function applyPaste() {
    const lines = pasteText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (lines.length === 0) return;
    setOptions(lines.length === 1 ? [lines[0], ""] : lines);
    setPasting(false);
    setPasteText("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const answers = options.map((option) => option.trim()).filter(Boolean);
    if (title.trim().length < 3) {
      setError("Add a question for this poll.");
      return;
    }
    if (answers.length < 2) {
      setError("Add at least two answer options.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/polls", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        options: answers,
        ends: closeOnDate ? ends : "",
        multiple,
        requireNames,
        security,
        blockVpn,
        allowComments,
        hideShare,
        anonymize,
        resultsVisibility,
        editVotes,
        votingInterval,
      }),
    });
    const json = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
    if (!response.ok || !json?.id) {
      setError(json?.error || "This poll could not be created.");
      setSaving(false);
      return;
    }
    router.push(`/poll/live/${json.id}`);
  }

  return (
    <div id="create-poll" className="mx-auto max-w-3xl scroll-mt-28 py-12 sm:py-16">
      <h1 className="text-center text-white">Create a Poll</h1>
      <p className="poll-create-lead mx-auto mt-3 max-w-xl text-center">Complete the below fields to create your poll.</p>

      <form onSubmit={onSubmit} className="mt-8 overflow-hidden rounded-xl border border-white/10 border-t-2 border-t-primary-300 bg-primary-900 px-4 py-6 shadow-xl sm:px-7 sm:py-7">
        <label className="block text-sm font-semibold text-white">
          Title
          <input className={`${fieldClass()} mt-2`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Type your question here" maxLength={140} />
        </label>

        <button type="button" onClick={() => setShowDetails((open) => !open)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-200 hover:text-white">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add description or image
        </button>
        {showDetails ? (
          <div className="mt-3 space-y-3">
            <textarea className={`${fieldClass()} min-h-24`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a short description for your audience" maxLength={500} />
            <label className="block text-sm font-medium text-white/80">
              Image
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="mt-2 block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-primary-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                onChange={(event) => setImageName(event.target.files?.[0]?.name ?? "")}
              />
            </label>
            {imageName ? <p>Selected image: {imageName}. The published poll uses the question and answers.</p> : null}
          </div>
        ) : null}

        <label className="mt-6 block text-sm font-semibold text-white">
          Poll type
          <span className="relative mt-2 block">
            <select className={`${fieldClass()} appearance-none pr-9`} defaultValue="Multiple choice">
              <option>Multiple choice</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" aria-hidden />
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">Answer Options</p>
          <button type="button" onClick={() => setPasting((open) => !open)} className="text-sm font-semibold text-primary-200 hover:text-white">
            Paste answers
          </button>
        </div>
        <div className="mt-3 space-y-2.5">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                className={fieldClass()}
                value={option}
                placeholder={`Option ${index + 1}`}
                maxLength={80}
                aria-label={`Option ${index + 1}`}
                onChange={(event) => updateOption(index, event.target.value)}
              />
              <button type="button" aria-label={`Remove option ${index + 1}`} onClick={() => removeOption(index)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        {pasting ? (
          <div className="mt-3 space-y-2">
            <textarea className={`${fieldClass()} min-h-24`} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste one answer per line" />
            <button type="button" onClick={applyPaste} className="text-sm font-semibold text-primary-200 hover:text-white">
              Add these answers
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-white/10 pb-6">
          <button type="button" onClick={addOption} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15">
            <Plus className="h-4 w-4" aria-hidden />
            Add option
          </button>
          <span className="text-sm text-white/55">
            or{" "}
            <button type="button" onClick={addOther} className="font-semibold text-primary-200 hover:text-white">
              Add &quot;Other&quot;
            </button>
          </span>
        </div>

        <h2 className="mt-6">Settings</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="space-y-4">
            <Toggle label="Allow selection of multiple options" on={multiple} onChange={setMultiple} />
            <Toggle label="Require participant names" on={requireNames} onChange={setRequireNames} />
          </div>
          <div className="space-y-4 md:border-l md:border-white/10 md:pl-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Voting security</p>
              <button type="button" onClick={() => setLearnMore((open) => !open)} className="text-sm font-semibold text-primary-200 hover:text-white">
                Learn more
              </button>
            </div>
            {learnMore ? <p>Each browser can cast one vote. The running totals stay on the public results page.</p> : null}
            <span className="relative block">
              <select className={`${fieldClass()} appearance-none pr-9`} value={security} onChange={(event) => setSecurity(event.target.value as (typeof SECURITY)[number])}>
                {SECURITY.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" aria-hidden />
            </span>
            <Toggle label="Block VPN users" on={blockVpn} onChange={setBlockVpn} />
            <Toggle
              label="Use CAPTCHA"
              on={false}
              onChange={() => undefined}
              disabled
              extra={<span className="rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">SOON</span>}
            />
          </div>
        </div>

        <button type="button" onClick={() => setAdvanced((open) => !open)} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-200 hover:text-white" aria-expanded={advanced}>
          <ChevronDown className={`h-4 w-4 transition-transform ${advanced ? "rotate-0" : "-rotate-90"}`} aria-hidden />
          Show advanced settings
        </button>

        {advanced ? (
          <div className="mt-4 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-2 md:gap-8">
            <div className="space-y-4">
              <Toggle label="Close poll on a scheduled date" on={closeOnDate} onChange={setCloseOnDate} />
              {closeOnDate ? (
                <input type="date" className={fieldClass()} value={ends} onChange={(event) => setEnds(event.target.value)} aria-label="Close date" />
              ) : null}
              <Toggle label="Allow comments" on={allowComments} onChange={setAllowComments} />
              <Toggle label="Hide share button" on={hideShare} onChange={setHideShare} />
              <Toggle label="Anonymize voter data" on={anonymize} onChange={setAnonymize} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-white/90">Custom design</span>
                <button type="button" onClick={() => setDesignNote((open) => !open)} className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/15">
                  Configure
                </button>
              </div>
              {designNote ? <p>This poll uses the Changer Fusions palette.</p> : null}
            </div>
            <div className="space-y-4 md:border-l md:border-white/10 md:pl-8">
              <label className="block text-sm font-semibold text-white">
                Results visibility
                <span className="relative mt-2 block">
                  <select className={`${fieldClass()} appearance-none pr-9`} value={resultsVisibility} onChange={(event) => setResultsVisibility(event.target.value as (typeof VISIBILITY)[number])}>
                    {VISIBILITY.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" aria-hidden />
                </span>
              </label>
              <label className="block text-sm font-semibold text-white">
                Edit vote permissions
                <span className="relative mt-2 block">
                  <select className={`${fieldClass()} appearance-none pr-9`} value={editVotes} onChange={(event) => setEditVotes(event.target.value as (typeof EDIT_VOTES)[number])}>
                    {EDIT_VOTES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" aria-hidden />
                </span>
              </label>
              <Toggle label="Voting interval" on={votingInterval} onChange={setVotingInterval} />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="poll-create-error mt-5" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={saving} className="poll-create-submit mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:opacity-70">
          {saving ? "Creating…" : "Create poll"}
        </button>
      </form>
    </div>
  );
}
