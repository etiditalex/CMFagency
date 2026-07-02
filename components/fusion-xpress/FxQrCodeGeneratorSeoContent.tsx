import Link from "next/link";

import {
  FX_QR_GENERATOR_HOW_TO_STEPS,
  FX_QR_GENERATOR_USE_CASES,
} from "@/lib/fx-qr-code-generator-seo";

export default function FxQrCodeGeneratorSeoContent() {
  return (
    <>
      <section
        aria-labelledby="fx-qr-howto-heading"
        className="fx-qr-howto-summary mt-8 rounded-[24px] border border-white/80 bg-white/60 p-5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.03),0_24px_64px_-16px_rgba(15,23,42,0.1)] backdrop-blur-2xl backdrop-saturate-150 sm:mt-10 sm:p-7"
      >
        <h2 id="fx-qr-howto-heading" className="text-lg font-extrabold text-slate-900 sm:text-xl">
          How to create a QR code in 4 steps
        </h2>
        <ol className="mt-4 space-y-4">
          {FX_QR_GENERATOR_HOW_TO_STEPS.map((step, index) => (
            <li key={step.name} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{step.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="fx-qr-use-cases-heading"
        className="mt-6 rounded-[24px] border border-white/80 bg-white/60 p-5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.03),0_24px_64px_-16px_rgba(15,23,42,0.1)] backdrop-blur-2xl backdrop-saturate-150 sm:p-7"
      >
        <h2 id="fx-qr-use-cases-heading" className="text-lg font-extrabold text-slate-900 sm:text-xl">
          Popular QR code use cases in Kenya
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {FX_QR_GENERATOR_USE_CASES.map((item) => (
            <article
              key={item.title}
              className="rounded-[20px] border border-white/80 bg-white/75 p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] backdrop-blur-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Part of{" "}
          <Link href="/fusion-xpress" className="font-semibold text-primary-700 underline-offset-2 hover:underline">
            Fusion Xpress
          </Link>{" "}
          by Changer Fusions — business tools, events, and digital experiences from Mombasa, Kenya.
        </p>
      </section>
    </>
  );
}
