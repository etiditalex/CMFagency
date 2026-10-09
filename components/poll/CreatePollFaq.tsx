"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { CREATE_POLL_FAQ } from "@/lib/poll/create-poll-content";

const ITEMS = CREATE_POLL_FAQ;

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
