import Link from "next/link";

import FxQrCodeGeneratorSharePanel from "@/components/fusion-xpress/FxQrCodeGeneratorSharePanel";
import {
  FX_QR_GENERATOR_FAQ,
  FX_QR_GENERATOR_HOW_TO_STEPS,
  FX_QR_GENERATOR_SHORT_ANSWER,
  FX_QR_GENERATOR_USE_CASES,
} from "@/lib/fx-qr-code-generator-seo";

export default function FxQrCodeGeneratorDashboardGuide() {
  return (
    <div className="space-y-6">
      <section className="border border-[#e5e5e5] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#1a2332]">How the public tool works</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{FX_QR_GENERATOR_SHORT_ANSWER}</p>
        <ol className="mt-4 space-y-3">
          {FX_QR_GENERATOR_HOW_TO_STEPS.map((step, index) => (
            <li key={step.name} className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="font-bold text-gray-900">{step.name}</p>
                <p className="mt-0.5 leading-relaxed text-gray-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border border-[#e5e5e5] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#1a2332]">Use cases to promote</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {FX_QR_GENERATOR_USE_CASES.map((item) => (
            <article key={item.title} className="border border-[#e5e5e5] bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Part of{" "}
          <Link href="/fusion-xpress" className="font-semibold text-primary-700 hover:underline">
            Fusion Xpress
          </Link>{" "}
          — point campaigns and clients to the public generator page, not this dashboard guide.
        </p>
      </section>

      <FxQrCodeGeneratorSharePanel variant="dashboard" />

      <section className="border border-[#e5e5e5] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#1a2332]">FAQ for your marketing team</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {FX_QR_GENERATOR_FAQ.map((item) => (
            <div key={item.question} className="border border-[#e5e5e5] bg-white p-4">
              <dt className="text-sm font-bold text-gray-900">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
