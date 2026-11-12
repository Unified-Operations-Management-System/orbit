"use client";

import { useState, type ReactNode } from "react";
import { colors } from "@orbit/design-tokens";
import {
  Alert,
  AreaIcon,
  Avatar,
  Badge,
  BarChart,
  Button,
  buttonClass,
  Card,
  Checkbox,
  DashboardPage,
  DataTable,
  DateInput,
  Dialog,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Panel,
  ProgressBar,
  RadioGroup,
  SearchInput,
  Select,
  Shape,
  Skeleton,
  StatCard,
  StatusPill,
  Stepper,
  Tabs,
  Textarea,
  Timeline,
} from "@/components/ui";

// One entry per shared component: what it's for, a live demo, the code to copy
// and its props. Everything imports from "@/components/ui".

export type Prop = [name: string, type: string, note: string];
export type Entry = { id: string; name: string; group: string; summary: string; demo: () => ReactNode; code: string; props?: Prop[] };

const items = [
  { sku: "SUG-01", name: "Cane sugar 25 kg", onHand: 12, status: "slowed" as const },
  { sku: "FLR-02", name: "Bread flour 20 kg", onHand: 48, status: "onTrack" as const },
  { sku: "BTR-03", name: "Butter block 5 kg", onHand: 0, status: "stalled" as const },
];

function TabsDemo() {
  const [tab, setTab] = useState("members");
  return (
    <div className="flex flex-col gap-3">
      <Tabs tabs={[{ id: "members", label: "Members" }, { id: "roles", label: "Roles and permissions" }, { id: "devices", label: "Devices" }]} value={tab} onChange={setTab} />
      <p className="text-sm text-muted">Selected: {tab}. Arrow keys move between tabs.</p>
    </div>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Deactivate Sam Patel?">
        <p className="mb-4 text-muted">They lose access right away. Escape or the backdrop closes it.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Deactivate</Button>
        </div>
      </Dialog>
    </>
  );
}

function FormDemo() {
  const [role, setRole] = useState("employee");
  const [shift, setShift] = useState("a");
  const [date, setDate] = useState("2026-11-11");
  const [q, setQ] = useState("");
  const [notify, setNotify] = useState(true);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input label="Email" placeholder="name@example.com" hint="We'll send the invitation here." />
      <Input label="Name" defaultValue="" error="Enter a name." />
      <Select label="Role" value={role} onChange={setRole} options={[{ value: "employee", label: "Employee" }, { value: "supervisor", label: "Supervisor" }, { value: "hr", label: "HR Admin" }]} />
      <DateInput label="Work date" value={date} onChange={setDate} />
      <Textarea label="Reason" hint="Visible to your supervisor." placeholder="Forgot to clock out after sanitation." />
      <div className="flex flex-col gap-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search members" />
        <Checkbox label="Notify the employee by email" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
      </div>
      <RadioGroup label="Shift" value={shift} onChange={setShift} inline options={[{ value: "a", label: "Shift A" }, { value: "b", label: "Shift B" }, { value: "c", label: "Night" }]} />
    </div>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(2);
  return <Pagination page={page} pageCount={5} onPageChange={setPage} />;
}

/** A shrunken, live DashboardPage so the layout rule is visible, not just described. */
function DashboardDemo() {
  return (
    <div className="flex h-[640px] flex-col border-2 border-ink p-4">
      <DashboardPage
        fill
        header={
          <>
            <PageHeader eyebrow="Inventory" title="Stock" actions={<Button>New count</Button>} />
            <div className="mb-4">
              <Tabs tabs={[{ id: "a", label: "Overview" }, { id: "b", label: "Items" }]} value="a" onChange={() => {}} />
            </div>
          </>
        }
      >
        <div className="grid shrink-0 grid-cols-3 gap-3">
          <StatCard label="Items" value="128" accent="blue" />
          <StatCard label="Low stock" value="3" accent="yellow" alert />
          <StatCard label="Value (CAD)" value="$48,210.50" accent="red" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
          <Panel title="Low stock">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="border-t border-line py-2 text-sm">Item {i + 1} · scroll me</div>
            ))}
          </Panel>
          <Panel title="Recent counts" footer={<span className="text-sm text-muted">Footer stays put</span>}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="border-t border-line py-2 text-sm">Count {i + 1}</div>
            ))}
          </Panel>
        </div>
      </DashboardPage>
    </div>
  );
}

export const entries: Entry[] = [
  // ---- Layout
  {
    id: "dashboard-page",
    name: "DashboardPage + Panel",
    group: "Layout",
    summary: "The frame for every signed-in page. The header stays fixed and only the body or its Panels scroll; the window never does (design rule 6). Use `fill` when the page has several sections side by side.",
    demo: () => <DashboardDemo />,
    code: `import { DashboardPage, PageHeader, Panel, StatCard, Tabs } from "@/components/ui";

export function StockView() {
  return (
    <DashboardPage
      fill
      header={
        <>
          <PageHeader eyebrow="Inventory" title="Stock" actions={<Button>New count</Button>} />
          <div className="mb-6"><Tabs tabs={tabs} value={tab} onChange={setTab} /></div>
        </>
      }
    >
      <div className="grid shrink-0 gap-4 lg:grid-cols-3">{/* StatCards */}</div>
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        <Panel title="Low stock" filters={<SearchInput … />} footer={<Pagination … />}>{rows}</Panel>
        <Panel title="Recent counts">{rows}</Panel>
      </div>
    </DashboardPage>
  );
}

// One long list or form instead? Leave out \`fill\` and the whole body scrolls.`,
    props: [
      ["header", "ReactNode", "PageHeader + Tabs; never scrolls"],
      ["fill", "boolean", "lay the body out as Panels that scroll on their own"],
      ["Panel title", "string", "section heading (also the aria-label)"],
      ["Panel actions / filters / footer", "ReactNode", "stay outside the scroll area"],
    ],
  },
  {
    id: "page-header",
    name: "PageHeader",
    group: "Layout",
    summary: "Eyebrow + title at the top of every page, with optional actions on the right. The Bauhaus shapes show when there are no actions.",
    demo: () => <PageHeader eyebrow="Organization" title="Members and access" />,
    code: `<PageHeader eyebrow="Organization" title="Members and access" actions={<Button>Invite member</Button>} />`,
    props: [["eyebrow", "string", "small label above the title"], ["title", "string", ""], ["actions", "ReactNode", "buttons on the right"]],
  },
  {
    id: "tabs",
    name: "Tabs",
    group: "Layout",
    summary: "Second-level navigation inside a page. Put it in the DashboardPage header.",
    demo: () => <TabsDemo />,
    code: `const [tab, setTab] = useState("members");
<Tabs tabs={[{ id: "members", label: "Members" }, { id: "roles", label: "Roles" }]} value={tab} onChange={setTab} />`,
    props: [["tabs", "{ id, label }[]", ""], ["value", "string", "selected id"], ["onChange", "(id) => void", ""]],
  },
  {
    id: "card",
    name: "Card",
    group: "Layout",
    summary: "Grey surface with an optional coloured top bar. The base for stat cards and grouped content.",
    demo: () => (
      <div className="grid gap-3 md:grid-cols-3">
        <Card accent="blue">Blue accent</Card>
        <Card accent="red">Red accent</Card>
        <Card>No accent</Card>
      </div>
    ),
    code: `<Card accent="blue">…</Card>`,
    props: [["accent", "ColorToken", "top bar colour"], ["className", "string", ""]],
  },

  // ---- Actions
  {
    id: "button",
    name: "Button",
    group: "Actions",
    summary: "Red primary for the one main action, ink secondary, ghost for low-emphasis. Use `buttonClass()` to style a Next.js <Link> as a button.",
    demo: () => (
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button disabled>Disabled</Button>
        <a href="#button" className={buttonClass("secondary")}>Link as button</a>
      </div>
    ),
    code: `<Button onClick={save}>Save</Button>
<Button variant="ghost">Cancel</Button>
<Link href="/analytics/purchase-orders/new" className={buttonClass()}>New purchase order</Link>`,
    props: [["variant", '"primary" | "secondary" | "ghost"', "default primary"], ["…button props", "", "onClick, disabled, type"]],
  },
  {
    id: "dialog",
    name: "Dialog",
    group: "Actions",
    summary: "Modal for confirmations and short forms. Closes with Escape and the backdrop.",
    demo: () => <DialogDemo />,
    code: `<Dialog open={open} onClose={() => setOpen(false)} title="Deactivate Sam Patel?">…</Dialog>`,
    props: [["open", "boolean", ""], ["onClose", "() => void", ""], ["title", "string", ""]],
  },

  // ---- Forms
  {
    id: "forms",
    name: "Form controls",
    group: "Forms",
    summary: "Input, Textarea, Select, DateInput, SearchInput, Checkbox, RadioGroup. Never use native <select>, checkbox or date inputs (design rule 2). Every control takes a label, plus hint and error where it makes sense.",
    demo: () => <FormDemo />,
    code: `<Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
<Select label="Role" value={role} onChange={setRole} options={[{ value: "Employee", label: "Employee" }]} />
<DateInput label="Work date" value={date} onChange={setDate} />           // type="time" | "datetime-local"
<Textarea label="Reason" hint="Visible to your supervisor." />
<SearchInput value={q} onChange={setQ} placeholder="Search members" />
<Checkbox label="Notify by email" checked={on} onChange={(e) => setOn(e.target.checked)} />
<RadioGroup label="Shift" value={shift} onChange={setShift} options={[{ value: "a", label: "Shift A" }]} inline />`,
    props: [
      ["label", "string", "required on every control"],
      ["hint / error", "string", "helper text / validation message"],
      ["Select options", "{ value, label }[]", "onChange gets the value"],
      ["RadioGroup options", "{ value, label, description? }[]", "inline for a row"],
    ],
  },

  // ---- Data
  {
    id: "data-table",
    name: "DataTable",
    group: "Data",
    summary: "Typed table with column renderers and an empty state. Put it in a Panel so it scrolls inside the page.",
    demo: () => (
      <DataTable
        rows={items}
        rowKey={(r) => r.sku}
        columns={[
          { key: "sku", header: "SKU", render: (r) => <span className="font-medium">{r.sku}</span> },
          { key: "name", header: "Item", render: (r) => r.name },
          { key: "onHand", header: "On hand", align: "right", render: (r) => r.onHand },
          { key: "status", header: "Status", align: "right", render: (r) => <StatusPill status={r.status} /> },
        ]}
      />
    ),
    code: `<DataTable
  rows={items}
  rowKey={(r) => r.sku}
  columns={[
    { key: "name", header: "Item", render: (r) => r.name },
    { key: "onHand", header: "On hand", align: "right", render: (r) => r.onHand },
  ]}
  empty="No items yet."
/>`,
    props: [["columns", "{ key, header, render, align? }[]", ""], ["rows", "T[]", ""], ["rowKey", "(row) => string | number", ""], ["empty", "ReactNode", "shown with no rows"]],
  },
  {
    id: "pagination",
    name: "Pagination",
    group: "Data",
    summary: "Page through long lists. Use it as a Panel `footer` so it stays visible.",
    demo: () => <PaginationDemo />,
    code: `<Pagination page={page} pageCount={5} onPageChange={setPage} />`,
    props: [["page", "number", "1-based"], ["pageCount", "number", ""], ["onPageChange", "(page) => void", ""]],
  },
  {
    id: "stat-card",
    name: "StatCard",
    group: "Data",
    summary: "One headline number. The value scales with the card, so long currency values never overflow.",
    demo: () => (
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Yield today" value="94.2%" accent="blue" />
        <StatCard label="Low stock" value="3" accent="yellow" alert />
        <StatCard label="Finalized (CAD)" value="$31,958.36" accent="red" />
      </div>
    ),
    code: `<StatCard label="Low stock" value="3" accent="yellow" alert />`,
    props: [["label", "string", ""], ["value", "string", "format numbers yourself"], ["accent", "ColorToken", "top bar"], ["alert", "boolean", "red value"]],
  },
  {
    id: "status",
    name: "StatusPill + Badge",
    group: "Data",
    summary: "StatusPill is for process status (shape + label, never colour alone). Badge is for short tags like roles or iterations.",
    demo: () => (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-6">
          <StatusPill status="onTrack" />
          <StatusPill status="slowed" />
          <StatusPill status="stalled" />
          <StatusPill status="done" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge>Employee</Badge>
          <Badge tone="info">Supervisor</Badge>
          <Badge tone="warning">Pending</Badge>
          <Badge tone="danger">Overdue</Badge>
        </div>
      </div>
    ),
    code: `<StatusPill status="slowed" />                 // onTrack | slowed | stalled | done
<Badge tone="warning">Pending</Badge>            // neutral | info | success | warning | danger`,
  },
  {
    id: "charts",
    name: "ProgressBar + BarChart",
    group: "Data",
    summary: "Simple, accessible charts drawn with tokens. Values are labelled, not only coloured.",
    demo: () => (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ProgressBar label="Batch 112 · Mixing" value={72} />
          <ProgressBar label="Weekly hours" value={38} max={40} accent="red" />
        </div>
        <BarChart title="Cost per unit" accent="red" format={(v) => `$${v.toFixed(2)}`} data={[{ label: "Sourdough", value: 1.42 }, { label: "Croissant", value: 0.88 }, { label: "Rye", value: 1.17 }]} />
      </div>
    ),
    code: `<ProgressBar label="Batch 112 · Mixing" value={72} />
<BarChart title="Cost per unit" data={[{ label: "Sourdough", value: 1.42 }]} format={(v) => \`$\${v.toFixed(2)}\`} />`,
  },
  {
    id: "timeline",
    name: "Timeline + Stepper",
    group: "Data",
    summary: "Timeline for history (audit, receipts). Stepper for a fixed sequence of stages.",
    demo: () => (
      <div className="flex flex-col gap-6">
        <Stepper steps={["Prep", "Mixing", "Packaging", "Labeling"]} current={1} />
        <Timeline
          items={[
            { id: "1", title: "Casey Brown invited", meta: "Nov 10 · 9:14 AM · Alex Morgan", status: "onTrack" },
            { id: "2", title: "Tablet T-03 revoked", meta: "Nov 10 · 2:40 PM · Alex Morgan", status: "stalled" },
          ]}
        />
      </div>
    ),
    code: `<Stepper steps={["Prep", "Mixing", "Packaging"]} current={1} />
<Timeline items={[{ id: "1", title: "Casey Brown invited", meta: "Nov 10 · Alex Morgan", status: "onTrack" }]} />`,
  },
  {
    id: "avatar",
    name: "Avatar",
    group: "Data",
    summary: "Initials for a person.",
    demo: () => (
      <div className="flex items-center gap-3">
        <Avatar name="Alex Morgan" />
        <Avatar name="Jordan Lee" size={40} />
      </div>
    ),
    code: `<Avatar name="Alex Morgan" size={40} />`,
  },

  // ---- Feedback
  {
    id: "alert",
    name: "Alert",
    group: "Feedback",
    summary: "Inline message with a shape per tone and an optional action link.",
    demo: () => (
      <div className="grid gap-3 md:grid-cols-2">
        <Alert tone="info" title="Schedule published">Next week&apos;s shifts are live.</Alert>
        <Alert tone="success" title="Permissions saved." />
        <Alert tone="warning" title="Low stock" action={<a href="#alert" className="font-bold underline">Open</a>}>Cane sugar is below the reorder point.</Alert>
        <Alert tone="error" title="Couldn't save">Check your connection and try again.</Alert>
      </div>
    ),
    code: `<Alert tone="warning" title="Low stock" action={<Link href="…">Open</Link>}>Cane sugar is below the reorder point.</Alert>`,
    props: [["tone", '"info" | "success" | "warning" | "error"', ""], ["title", "string", ""], ["action", "ReactNode", "link on the right"]],
  },
  {
    id: "empty-state",
    name: "EmptyState + Skeleton",
    group: "Feedback",
    summary: "EmptyState when there's nothing to show yet; Skeleton while data loads.",
    demo: () => (
      <div className="grid gap-6 md:grid-cols-2">
        <EmptyState area="inventory" title="No counts yet" body="Start a stock count to see it here." action={<Button>New count</Button>} />
        <div className="flex flex-col gap-3 pt-12">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    ),
    code: `<EmptyState area="inventory" title="No counts yet" body="Start a stock count to see it here." action={<Button>New count</Button>} />
<Skeleton className="h-6 w-1/2" />`,
  },

  // ---- Icons
  {
    id: "icons",
    name: "AreaIcon + Shape",
    group: "Icons",
    summary: "Each functional area has a shape and colour; use AreaIcon for areas and Shape for custom marks.",
    demo: () => (
      <div className="flex flex-wrap items-center gap-6">
        {(["organization", "hr", "production", "inventory", "analytics"] as const).map((a) => (
          <span key={a} className="flex items-center gap-2 text-sm">
            <AreaIcon area={a} size={20} /> {a}
          </span>
        ))}
        <span className="flex items-center gap-2 text-sm">
          <Shape shape="triangle" color={colors.yellow} size={16} /> Shape
        </span>
      </div>
    ),
    code: `<AreaIcon area="inventory" size={20} />
<Shape shape="triangle" color={colors.yellow} size={12} />`,
  },
];
