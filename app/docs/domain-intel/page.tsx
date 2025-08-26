// app/documentation/domain-intel/page.tsx
"use client";
import React, { useMemo, useState } from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
}

function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{children}</span>
  );
}

interface PillProps {
  children: React.ReactNode;
  tone?: "slate" | "green" | "red" | "amber" | "blue" | "violet";
}

function Pill({ children, tone = "slate" }: PillProps) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

function SectionHeading({ eyebrow, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">{eyebrow}</div>}
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
    </div>
  );
}

interface TableColumn {
  key: string;
  header: string;
  cell?: (row: any) => React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
}

function Table({ columns, data }: TableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 align-top text-sm text-slate-700">{typeof c.cell === "function" ? c.cell(row) : (row as any)[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CopyButtonProps {
  text: string;
  className?: string;
}

function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch (e) {}
      }}
      className={`rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 ${className}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface CodeProps {
  children: React.ReactNode;
  language?: string;
}

function Code({ children, language = "bash" }: CodeProps) {
  return (
    <pre className="relative overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-slate-100">
      <div className="absolute right-2 top-2 text-[10px] uppercase tracking-wide text-slate-400">{language}</div>
      <code className="whitespace-pre">{children}</code>
    </pre>
  );
}

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  initial?: number;
}

function Tabs({ tabs, initial = 0 }: TabsProps) {
  const [active, setActive] = useState(initial);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`rounded-xl border px-3 py-1.5 text-sm ${i === active ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[active]?.content}</div>
    </div>
  );
}

interface KbdProps {
  children: React.ReactNode;
}

function Kbd({ children }: KbdProps) {
  return <kbd className="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">{children}</kbd>;
}

const SAMPLE_RESPONSE = `{
  "domain": "example.com",
  "ns": "ns1.provider.net",
  "soa": "hostmaster@example.com",
  "status": "active",
  "suffix": "com",
  "ip": "192.0.2.1",
  "country_dm": "US",
  "risk_score": 20,
  "flags": {
    "is_mailbox_provider": false,
    "is_phishing": false,
    "is_mailable": true,
    "is_disposable": false,
    "has_dmarc": true,
    "has_spf": true
  }
}`;

const ERROR_ROWS = [
  { code: 400, message: "Bad Request", desc: "Malformed domain or parameters" },
  { code: 401, message: "Unauthorized", desc: "Invalid or missing API key" },
  { code: 404, message: "Not Found", desc: "Domain not found" },
  { code: 429, message: "Too Many Requests", desc: "Rate limit exceeded" },
  { code: 500, message: "Internal Server Error", desc: "Unexpected server error" },
];

const PARAMS = [
  { name: "domain", type: "string", required: true, desc: "Domain to query, e.g. example.com" },
  { name: "exclude", type: "string", required: false, desc: "Comma-separated fields to exclude from response" },
  { name: "risk_threshold", type: "int", required: false, desc: "Only return data if risk_score >= threshold" },
];

const FIELDS = [
  { key: "risk_score", type: "int (0–100)", desc: "Higher means higher risk; use your own cutoffs per use case" },
  { key: "flags.is_phishing", type: "bool", desc: "True if the domain appears on phishing sources" },
  { key: "flags.is_disposable", type: "bool", desc: "True if domain is a disposable provider" },
  { key: "flags.is_mailable", type: "bool", desc: "True if domain is suitable for sending/receiving" },
  { key: "flags.has_spf", type: "bool", desc: "Domain publishes SPF" },
  { key: "flags.has_dmarc", type: "bool", desc: "Domain publishes DMARC" },
  { key: "ns / soa / ip", type: "string", desc: "Core DNS records and resolution hints" },
];

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "auth", label: "Authentication" },
  { id: "endpoint", label: "Endpoint" },
  { id: "responses", label: "Responses" },
  { id: "use-cases", label: "Use cases" },
  { id: "limits", label: "Rate limits" },
  { id: "errors", label: "Errors" },
  { id: "faq", label: "FAQ" },
  { id: "changelog", label: "Changelog" },
];

function StickyToc() {
  return (
    <nav className="sticky top-24 hidden h-[calc(100vh-6rem)] w-64 shrink-0 lg:block">
      <Card className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">On this page</p>
        <ul className="space-y-1 text-sm">
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="block rounded-md px-2 py-1 text-slate-700 hover:bg-slate-50">
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </nav>
  );
}

export default function Page() {
  const curl = useMemo(() => `curl -H "X-API-Key: YOUR_API_KEY" https://api.datazag.com/domain-intel/example.com`, []);
  const python = useMemo(
    () => `import requests\n\nurl = "https://api.datazag.com/domain-intel/example.com"\nheaders = {"X-API-Key": "YOUR_API_KEY"}\nr = requests.get(url, headers=headers, timeout=30)\nprint(r.json())`,
    []
  );
  const node = useMemo(
    () => `import fetch from 'node-fetch'\n\nconst url = 'https://api.datazag.com/domain-intel/example.com'\nconst r = await fetch(url, { headers: { 'X-API-Key': 'YOUR_API_KEY' }})\nconsole.log(await r.json())`,
    []
  );

  return (
    <div className="bg-gradient-to-b from-white to-blue-50/40">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <Container className="py-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge>FastAPI</Badge>
                <Badge>BigQuery-backed</Badge>
                <Badge>JSON over HTTPS</Badge>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Domain Intelligence API</h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                Real-time domain risk & deliverability data for KYC, Email Analytics, Email Verification, and Bulk Cleaning.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/documentation" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Open API Docs</a>
                <a href="#endpoint" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Skip to Endpoint</a>
              </div>
            </div>
            <Card className="w-full max-w-md p-5">
              <p className="text-sm font-medium text-slate-700">Quick start</p>
              <div className="mt-3">
                <Tabs
                  tabs={[
                    { label: "cURL", content: (<div className="relative"><CopyButton text={curl} className="absolute right-2 top-2" /><Code language="bash">{curl}</Code></div>) },
                    { label: "Python", content: (<div className="relative"><CopyButton text={python} className="absolute right-2 top-2" /><Code language="python">{python}</Code></div>) },
                    { label: "Node.js", content: (<div className="relative"><CopyButton text={node} className="absolute right-2 top-2" /><Code language="js">{node}</Code></div>) },
                  ]}
                />
              </div>
              <div className="mt-3 text-xs text-slate-500">Use header <Kbd>X-API-Key</Kbd> with your key.</div>
            </Card>
          </div>
        </Container>
      </header>

      <main>
        <Container className="relative flex gap-8 py-12">
          <StickyToc />

          <div className="min-w-0 flex-1 space-y-12">
            <section id="overview">
              <SectionHeading eyebrow="Overview" title="Answers, not just data" subtitle="Query a continuously refreshed BigQuery dataset of 280M+ domains with DNS, risk, and deliverability signals." />
              <Card className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <ul className="space-y-2 text-slate-700">
                      <li>• Real-time domain scoring (0–100) with phishing, disposable, parked & typo signals.</li>
                      <li>• Deliverability checks: SPF / DMARC presence, mailbox provider categorization.</li>
                      <li>• Designed for KYC, security ops, growth, and data engineering workflows.</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <div className="mb-2 font-semibold">Tip</div>
                    <p>Use <Kbd>exclude</Kbd> to trim large payloads in latency-sensitive paths; use <Kbd>risk_threshold</Kbd> to short-circuit processing on low-risk domains.</p>
                  </div>
                </div>
              </Card>
            </section>

            <section id="auth">
              <SectionHeading eyebrow="Security" title="Authentication" subtitle="All requests require a valid API key passed via header." />
              <Card className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-700">Include your key in the HTTP header:</p>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div><Kbd>X-API-Key</Kbd>: <span className="text-slate-500">YOUR_API_KEY</span></div>
                    </div>
                  </div>
                  <div>
                    <ul className="text-sm text-slate-700">
                      <li>• Rotate keys regularly.</li>
                      <li>• Keep keys out of client-side code; proxy from your backend.</li>
                      <li>• Different environments → different keys.</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </section>

            <section id="endpoint">
              <SectionHeading eyebrow="Reference" title="Endpoint: GET /domain-intel/{domain}" subtitle="Retrieve domain intelligence as JSON." />
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">Request</h3>
                  <Table
                    columns={[{ key: "name", header: "Parameter" }, { key: "type", header: "Type" }, { key: "required", header: "Required", cell: (r: any) => (r.required ? <Pill tone="green">Yes</Pill> : <Pill>No</Pill>) }, { key: "desc", header: "Description" }]}
                    data={PARAMS}
                  />
                  <div className="mt-4 text-xs text-slate-500">Path param <Kbd>domain</Kbd> accepts <em>example.com</em>-style hostnames.</div>
                </Card>
                <Card className="p-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">Example</h3>
                  <Tabs tabs={[{ label: "cURL", content: <Code language="bash">{curl}</Code> }, { label: "Python", content: <Code language="python">{python}</Code> }, { label: "Node.js", content: <Code language="js">{node}</Code> }]} />
                </Card>
              </div>

              <Card className="mt-6 p-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Field glossary</h3>
                <Table columns={[{ key: "key", header: "Field" }, { key: "type", header: "Type" }, { key: "desc", header: "Description" }]} data={FIELDS} />
              </Card>
            </section>

            <section id="responses">
              <SectionHeading eyebrow="Output" title="Response samples" subtitle="Shape your logic around risk, flags, and deliverability signals." />
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">200 OK</h3>
                  <CopyButton text={SAMPLE_RESPONSE} className="mb-2" />
                  <Code language="json">{SAMPLE_RESPONSE}</Code>
                </Card>
                <Card className="p-6">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Recommended decisioning</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li>• Block if <Kbd>flags.is_phishing</Kbd> or <Kbd>flags.is_disposable</Kbd> is true.</li>
                    <li>• Warn if <Kbd>risk_score</Kbd> ≥ 70; require extra verification.</li>
                    <li>• Prefer sending to domains with <Kbd>flags.has_spf</Kbd> & <Kbd>flags.has_dmarc</Kbd>.</li>
                  </ul>
                </Card>
              </div>
            </section>

            <section id="use-cases">
              <SectionHeading eyebrow="Guides" title="Use cases" subtitle="Implementation patterns for four common workloads." />
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">KYC / AML</div>
                  <h3 className="text-lg font-semibold text-slate-900">Customer domain checks</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li>• Reject disposable or phishing domains.</li>
                    <li>• Require manual review if <Kbd>risk_score</Kbd> ≥ 60.</li>
                    <li>• Cross-reference mailbox provider categories.</li>
                  </ul>
                </Card>
                <Card className="p-6">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Email Deliverability</div>
                  <h3 className="text-lg font-semibold text-slate-900">Pre-send checks</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li>• Confirm <Kbd>flags.has_spf</Kbd> and <Kbd>flags.has_dmarc</Kbd>.</li>
                    <li>• Avoid known mailbox provider blocks and parked domains.</li>
                    <li>• Group by TLD and provider for analytics.</li>
                  </ul>
                </Card>
                <Card className="p-6">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Email Verification</div>
                  <h3 className="text-lg font-semibold text-slate-900">Syntax → Domain → Mailbox</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li>• Validate domain exists and is mailable.</li>
                    <li>• Downstream: MX checks or SMTP ping (optional).</li>
                    <li>• Deny disposable and high-risk domains.</li>
                  </ul>
                </Card>
                <Card className="p-6">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Bulk Data Cleaning</div>
                  <h3 className="text-lg font-semibold text-slate-900">Batch workflows</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li>• Use <Kbd>exclude</Kbd> to reduce bandwidth and storage.</li>
                    <li>• Backoff & retry on 429; parallelize within limits.</li>
                    <li>• Save flags + risk_score for downstream segmentation.</li>
                  </ul>
                </Card>
              </div>
            </section>

            <section id="limits">
              <SectionHeading eyebrow="Operations" title="Rate limits & performance" />
              <Card className="p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">10 RPS</div>
                    <div className="text-sm text-slate-600">Default burst allowance</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">99.9%</div>
                    <div className="text-sm text-slate-600">Target monthly uptime</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">Daily</div>
                    <div className="text-sm text-slate-600">Dataset refresh cadence</div>
                  </div>
                </div>
                <div className="mt-6 text-sm text-slate-700">For higher throughput or dedicated capacity, contact sales for enterprise plans.</div>
              </Card>
            </section>

            <section id="errors">
              <SectionHeading eyebrow="Reliability" title="Error handling" />
              <Card className="p-6">
                <Table columns={[{ key: "code", header: "HTTP" }, { key: "message", header: "Message" }, { key: "desc", header: "Description" }]} data={ERROR_ROWS} />
                <div className="mt-4 text-sm text-slate-700">Implement retries with exponential backoff for <Kbd>429</Kbd>, and raise to ops on persistent <Kbd>5xx</Kbd>.</div>
              </Card>
            </section>

            <section id="faq">
              <SectionHeading eyebrow="Help" title="FAQ" />
              <div className="grid gap-4">
                <Card className="p-5">
                  <p className="font-medium text-slate-900">How fresh is the data?</p>
                  <p className="mt-1 text-sm text-slate-700">The underlying BigQuery tables are refreshed daily, with critical risk lists updated more frequently.</p>
                </Card>
                <Card className="p-5">
                  <p className="font-medium text-slate-900">Do you support subdomains?</p>
                  <p className="mt-1 text-sm text-slate-700">Query root domains (example.com). Subdomain handling is on the roadmap; contact us for early access.</p>
                </Card>
                <Card className="p-5">
                  <p className="font-medium text-slate-900">Is batch processing available?</p>
                  <p className="mt-1 text-sm text-slate-700">Yes via enterprise bulk endpoints and cloud data shares (Snowflake, Databricks, BigQuery, etc.).</p>
                </Card>
              </div>
            </section>

            <section id="changelog">
              <SectionHeading eyebrow="Lifecycle" title="Changelog" subtitle="Summaries of notable changes to this endpoint." />
              <Card className="p-6">
                <ul className="space-y-3 text-sm text-slate-700">
                  <li>
                    <div className="font-medium text-slate-900">2025-08-15</div>
                    <div>Added <Kbd>risk_threshold</Kbd> filter; improved phishing signal coverage.</div>
                  </li>
                  <li>
                    <div className="font-medium text-slate-900">2025-07-20</div>
                    <div>Performance tuning for high-concurrency clients; clarified error semantics.</div>
                  </li>
                </ul>
              </Card>
            </section>

            <section className="pb-6 pt-2">
              <Card className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Ready to build?</h3>
                  <p className="text-sm text-slate-600">Grab an API key and explore interactive docs.</p>
                </div>
                <div className="flex gap-3">
                  <a href="/signup" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Get API Key</a>
                  <a href="/documentation" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Open API Docs</a>
                </div>
              </Card>
            </section>
          </div>
        </Container>
      </main>
    </div>
  );
}