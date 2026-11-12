"use client";

import { useState } from "react";
import { areas, colors, statuses, textPairs, typeScale, type ColorToken } from "@orbit/design-tokens";
import { AreaIcon, StatusPill } from "@/components/ui";
import { OrbitMark } from "@/components/orbit-mark";
import { entries, type Entry, type Prop } from "./entries";

// Component site for the team: every shared building block with a live demo,
// the code to copy and its props. Same layout rule as the app: the window never
// scrolls, the content column does.

const rules = [
  "Import colours, type and spacing from @orbit/design-tokens; no raw hex, no ad-hoc font sizes.",
  "Reach for a components/ui piece before writing a new one. No native <select>, checkbox or date inputs.",
  "Build your area's screens in apps/web/features/<area>/ and export them from its index.ts.",
  "Yellow is never text. Only the text pairs below are used for text.",
  "Every status shows a shape and a label, not colour alone.",
  "Every signed-in page is a DashboardPage: the window never scrolls, only the body or its Panels do. Design for 1280×720 first.",
  "Business rules live in the Go API. Hiding a button by role is UX only; the API enforces permissions.",
];

const groups = ["Layout", "Actions", "Forms", "Data", "Feedback", "Icons"];

export function DesignSystemSite() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <nav aria-label="Sections" className="flex w-60 shrink-0 flex-col gap-5 overflow-y-auto bg-ink px-5 py-6 text-paper">
        <div className="flex items-center gap-2.5">
          <OrbitMark onDark />
          <span className="text-xl font-bold">orbit ui</span>
        </div>
        <NavGroup title="Foundations" links={[["rules", "Rules"], ["colours", "Colours"], ["type", "Type"], ["areas", "Areas and statuses"]]} />
        {groups.map((g) => (
          <NavGroup key={g} title={g} links={entries.filter((e) => e.group === g).map((e) => [e.id, e.name])} />
        ))}
      </nav>

      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-14 px-10 py-10">
          <header>
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Design system</div>
            <h1 className="text-[32px] font-extrabold leading-[1.05]">What you can build Orbit with</h1>
            <p className="mt-3 max-w-prose text-muted">
              Every piece below is in <Code>@/components/ui</Code> and already matches the Orbit look. Copy the snippet, change the data, done. Full guide:{" "}
              <Code>docs/design/README.md</Code>.
            </p>
          </header>

          <Section id="rules" title="Rules">
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </Section>

          <Section id="colours" title="Colours">
            <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
              {(Object.keys(colors) as ColorToken[]).map((c) => (
                <div key={c} className="border border-line">
                  <div className="h-14" style={{ background: colors[c] }} />
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-bold">{c}</div>
                    <div className="text-muted">{colors[c]}</div>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="mt-6 mb-2 font-bold">Allowed text pairs (text on background)</h3>
            <div className="flex flex-wrap gap-2">
              {textPairs.map(([fg, bg]) => (
                <span key={`${fg}-${bg}`} className="border border-line px-3 py-1.5 text-sm font-bold" style={{ color: colors[fg], background: colors[bg] }}>
                  {fg} on {bg}
                </span>
              ))}
            </div>
          </Section>

          <Section id="type" title="Type">
            <p className="mb-3 text-muted">Jost. Use these sizes only; Tailwind classes in brackets.</p>
            <div className="flex flex-col gap-3">
              {Object.entries(typeScale).map(([name, t]) => (
                <div key={name} className="flex items-baseline gap-6 border-t border-line pt-3">
                  <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-muted">{name}</span>
                  <span style={{ fontSize: t.size, fontWeight: Number(t.weight), lineHeight: `${t.lineHeight}px` }}>The quick bakery run</span>
                  <span className="ml-auto shrink-0 text-sm text-muted">
                    {t.size}px / {t.weight} [text-[{t.size}px]]
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="areas" title="Areas and statuses">
            <div className="grid gap-3 md:grid-cols-5">
              {Object.entries(areas).map(([key, a]) => (
                <div key={key} className="flex flex-col items-start gap-2 border border-line p-3">
                  <AreaIcon area={key as keyof typeof areas} size={28} />
                  <span className="font-bold">{a.label}</span>
                  <span className="text-xs text-muted">
                    {a.shape} · {a.color} · {a.href}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              {Object.keys(statuses).map((s) => (
                <StatusPill key={s} status={s as keyof typeof statuses} />
              ))}
            </div>
          </Section>

          {groups.map((g) => (
            <div key={g} className="flex flex-col gap-14">
              <h2 className="-mb-8 text-xs font-bold uppercase tracking-[0.12em] text-muted">{g}</h2>
              {entries
                .filter((e) => e.group === g)
                .map((e) => (
                  <ComponentEntry key={e.id} entry={e} />
                ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function NavGroup({ title, links }: { title: string; links: string[][] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted-ink">{title}</div>
      {links.map(([id, label]) => (
        <a key={id} href={`#${id}`} className="py-0.5 text-[15px] hover:underline">
          {label}
        </a>
      ))}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-8 border-t-2 border-ink pt-4">
      <h2 className="mb-4 text-[22px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ComponentEntry({ entry }: { entry: Entry }) {
  return (
    <Section id={entry.id} title={entry.name}>
      <p className="mb-4 max-w-prose text-muted">{entry.summary}</p>
      <div className="border border-line p-6">{entry.demo()}</div>
      <CodeBlock code={entry.code} />
      {entry.props ? <PropsTable props={entry.props} /> : null}
    </Section>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-3 bg-ink text-paper">
      <button
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 px-2 py-1 text-xs font-bold text-muted-ink hover:text-paper"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4 pr-16 text-[13px] leading-5">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function PropsTable({ props }: { props: Prop[] }) {
  return (
    <table className="mt-3 w-full border-t-2 border-ink text-left text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-[0.12em] text-muted">
          <th className="py-2 pr-4 font-bold">Prop</th>
          <th className="py-2 pr-4 font-bold">Type</th>
          <th className="py-2 font-bold">Notes</th>
        </tr>
      </thead>
      <tbody>
        {props.map(([name, type, note]) => (
          <tr key={name} className="border-t border-line">
            <td className="py-2 pr-4 font-bold">{name}</td>
            <td className="py-2 pr-4 font-mono text-[13px]">{type}</td>
            <td className="py-2 text-muted">{note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-surface px-1 font-mono text-[13px]">{children}</code>;
}
