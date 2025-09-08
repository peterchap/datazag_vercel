'use client';

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/ui/copy-button"; // Assuming a simple copy button component

// --- Data for the documentation page ---
const SAMPLE_RESPONSE = `{
  "domain": "example.com",
  "status": "active",
  "risk_score": 20,
  "flags": {
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
  { name: "exclude", type: "string", required: false, desc: "Comma-separated fields to exclude" },
];

const FIELDS = [
  { key: "risk_score", type: "int (0–100)", desc: "Higher score indicates higher risk." },
  { key: "flags.is_phishing", type: "bool", desc: "True if the domain is on phishing blacklists." },
  { key: "flags.is_disposable", type: "bool", desc: "True if domain is a disposable provider." },
  { key: "flags.is_mailable", type: "bool", desc: "True if domain is suitable for sending/receiving mail." },
];

const TOC = [
  { id: "overview", label: "Overview" }, { id: "auth", label: "Authentication" }, { id: "endpoint", label: "Endpoint" }, { id: "responses", label: "Responses" }, { id: "errors", label: "Errors" },
];
// --- End Data ---

// This is the new Client Component for your documentation page.
export function DocsClient() {
  const curl = useMemo(() => `curl -H "X-API-Key: YOUR_API_KEY" https://api.datazag.com/domain-intel/example.com`, []);
  const python = useMemo(() => `import requests\n\nurl = "https://api.datazag.com/domain-intel/example.com"\nheaders = {"X-API-Key": "YOUR_API_KEY"}\nresponse = requests.get(url, headers=headers)\nprint(response.json())`, []);
  const node = useMemo(() => `const response = await fetch('https://api.datazag.com/domain-intel/example.com', {\n  headers: { 'X-API-Key': 'YOUR_API_KEY' }\n});\nconst data = await response.json();\nconsole.log(data);`, []);

  return (
    <div className="bg-background text-foreground">
      {/* Header Section */}
      <header className="border-b bg-muted/20 py-16 md:py-24">
        <div className="container mx-auto max-w-5xl px-4">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Domain Intelligence API</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Real-time domain risk & deliverability data for KYC, Email Analytics, and Bulk Cleaning.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg"><a href="/register">Get API Key</a></Button>
                <Button asChild size="lg" variant="outline"><a href="#endpoint">Skip to Endpoint</a></Button>
            </div>
        </div>
      </header>

      {/* Main Content with Sticky Table of Contents */}
      <main>
        <div className="container mx-auto max-w-5xl flex gap-12 px-4 py-12">
          {/* Sticky Table of Contents for desktop */}
          <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-56 shrink-0 lg:block">
            <nav>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">On this page</h3>
              <ul className="space-y-2 text-sm">
                {TOC.map((t) => (
                  <li key={t.id}><a href={`#${t.id}`} className="block text-muted-foreground hover:text-primary">{t.label}</a></li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Documentation Sections */}
          <div className="min-w-0 flex-1 space-y-16">
            <section id="overview">
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-muted-foreground mb-6">Query a continuously refreshed dataset of 280M+ domains with DNS, risk, and deliverability signals. This API is designed for KYC, security operations, and data engineering workflows.</p>
            </section>

            <section id="auth">
              <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
              <p className="text-muted-foreground mb-4">All requests require a valid API key passed via the <code className="font-mono text-sm bg-muted p-1 rounded">X-API-Key</code> header.</p>
               <CodeBlock language="bash" text={'X-API-Key: YOUR_API_KEY'} />
            </section>

            <section id="endpoint">
              <h2 className="text-2xl font-semibold mb-4">Endpoint</h2>
              <p className="mb-2 text-muted-foreground">Retrieve domain intelligence as JSON.</p>
              <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm">
                <Badge variant="success">GET</Badge>
                <span>/domain-intel/&#123;domain&#125;</span>
              </div>
              <h3 className="text-lg font-semibold mt-6 mb-4">Parameters</h3>
              <DataTable columns={["Parameter", "Type", "Required", "Description"]} data={PARAMS.map(p => [p.name, p.type, p.required ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>, p.desc])} />
              <h3 className="text-lg font-semibold mt-6 mb-4">Example Request</h3>
              <Tabs defaultValue="curl">
                <TabsList><TabsTrigger value="curl">cURL</TabsTrigger><TabsTrigger value="python">Python</TabsTrigger><TabsTrigger value="node">Node.js</TabsTrigger></TabsList>
                <TabsContent value="curl"><CodeBlock language="bash" text={curl} /></TabsContent>
                <TabsContent value="python"><CodeBlock language="python" text={python} /></TabsContent>
                <TabsContent value="node"><CodeBlock language="javascript" text={node} /></TabsContent>
              </Tabs>
            </section>
            
            <section id="responses">
              <h2 className="text-2xl font-semibold mb-4">Responses</h2>
              <p className="mb-4 text-muted-foreground">Successful requests return a 200 OK with a JSON body.</p>
              <CodeBlock language="json" text={SAMPLE_RESPONSE} />
              <h3 className="text-lg font-semibold mt-6 mb-4">Field Glossary</h3>
              <DataTable columns={["Field", "Type", "Description"]} data={FIELDS.map(f => [f.key, f.type, f.desc])} />
            </section>

            <section id="errors">
                <h2 className="text-2xl font-semibold mb-4">Errors</h2>
                <p className="mb-4 text-muted-foreground">The API uses conventional HTTP status codes to indicate success or failure.</p>
                <DataTable columns={["HTTP Status", "Message", "Description"]} data={ERROR_ROWS.map(e => [e.code, e.message, e.desc])} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Reusable Helper Components ---
const CodeBlock = ({ language, text }: { language: string, text: string }) => (
  <div className="relative">
    <CopyButton text={text} className="absolute top-2 right-2" />
    <pre className="overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm text-foreground">
      <code>{text}</code>
    </pre>
  </div>
);

const DataTable = ({ columns, data }: { columns: string[], data: (string|React.ReactNode)[][] }) => (
    <div className="rounded-lg border">
        <Table>
            <TableHeader><TableRow>{columns.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j} className={j === 0 ? "font-medium" : ""}>{cell}</TableCell>)}</TableRow>)}</TableBody>
        </Table>
    </div>
);