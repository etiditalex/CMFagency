import type { FusionFormBlock } from "@/lib/fusion-forms";

function BlockBody({ body, className }: { body: string; className?: string }) {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <div className={className ?? "mt-3 space-y-3 text-sm leading-relaxed text-gray-700"}>
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length > 1) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.replace(/^- /, "")}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{lines[0]}</p>;
      })}
    </div>
  );
}

export default function FormBlockCard({
  block,
  id,
  className = "mt-4",
}: {
  block: FusionFormBlock;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-gray-200 bg-white px-5 py-7 text-left shadow-sm sm:px-6 sm:py-8 ${className}`}
    >
      {block.heading.trim() ? <h2 className="text-xl font-bold text-gray-900">{block.heading}</h2> : null}
      <BlockBody body={block.body} className={block.heading.trim() ? undefined : "space-y-3 text-sm leading-relaxed text-gray-700"} />
    </section>
  );
}

export function FormIntroCopy({ body, className }: { body: string; className?: string }) {
  return <BlockBody body={body} className={className ?? "space-y-3 text-sm leading-relaxed text-gray-700"} />;
}
