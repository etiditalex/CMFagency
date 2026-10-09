"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

const ITEMS = [
  {
    question: "What is a Changer Fusions poll?",
    answer:
      "It is a simple way to ask an audience, a brand, a campaign, or a room what they think, then share the live tally. Use it for a runway choice, a public read, or a decision that should stay visible while people vote.",
  },
  {
    question: "How do I create a poll?",
    answer:
      "Enter the question, add at least two answers, and create the poll. It publishes straight away. Share the link, and the totals update on the public results page as votes come in. Set a close date when the poll should end on a given day.",
  },
  {
    question: "Can I customize my poll?",
    answer:
      "You can add a short description, choose the answers, and set when the poll closes. Each browser can vote once. The public page uses the Changer Fusions palette, and the results stay visible while the poll is open and after it closes.",
  },
  {
    question: "Are the results reliable?",
    answer:
      "Each browser can cast one vote, and the totals update as those votes are recorded. Someone can still vote again from another browser, so treat the tally as a live read of the people who had the link.",
  },
  {
    question: "How can I share my poll, and who can vote in it?",
    answer:
      "After you create the poll you get a link. Anyone with that link can vote, and no account is required. Share it in the room, by message, or on a campaign page.",
  },
  {
    question: "Is it free to use?",
    answer:
      "Yes. Creating a poll and voting are free. You do not need an account to publish a poll or to take part.",
  },
] as const;

export default function CreatePollFaq() {
  const [open, setOpen] = useState<number[]>(ITEMS.map((_, index) => index));

  function toggle(index: number) {
    setOpen((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]));
  }

  return (
    <section className="poll-create-faq mx-auto max-w-3xl pb-4 pt-8" aria-labelledby="poll-create-faq-heading">
      <h2 id="poll-create-faq-heading" className="poll-create-faq-title">
        Poll FAQ
      </h2>
      <div className="mt-10 border-t border-white/15">
        {ITEMS.map((item, index) => {
          const expanded = open.includes(index);
          return (
            <div key={item.question} className="border-b border-white/15 py-5">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 text-base font-bold text-white"
                aria-expanded={expanded}
                onClick={() => toggle(index)}
              >
                <span>{item.question}</span>
                {expanded ? <Minus className="mt-1 h-4 w-4 shrink-0" aria-hidden /> : <Plus className="mt-1 h-4 w-4 shrink-0" aria-hidden />}
              </button>
              {expanded ? <p className="mt-3 max-w-3xl">{item.answer}</p> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-8">
        If you have another question about a poll, an event, or a campaign, reach the{" "}
        <Link href="/contact" className="font-semibold text-primary-200 underline underline-offset-2 hover:text-white">
          Changer Fusions team
        </Link>
        .
      </p>
    </section>
  );
}
