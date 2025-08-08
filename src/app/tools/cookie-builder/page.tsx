"use client";

import { useMemo, useState } from "react";

function parseNetscapeCookiesToHeader(input: string): string {
  const lines = input.split(/\r?\n/);
  const nameToValue = new Map<string, string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Split by tabs (Netscape cookie format is tab-delimited)
    const parts = line.split(/\t+/);
    // Fallback to generic whitespace split if tabs not present
    const cols = parts.length >= 7 ? parts : line.split(/\s+/);

    if (cols.length >= 7) {
      const name = cols[5];
      const value = cols.slice(6).join(" "); // value may contain spaces
      if (name && value !== undefined) {
        nameToValue.set(name, value);
      }
      continue;
    }

    // If the line looks like name=value; name2=value2; ... just normalize it
    if (/=/.test(line) && /;/.test(line)) {
      const pairs = line.split(/;\s*/);
      for (const pair of pairs) {
        const idx = pair.indexOf("=");
        if (idx > 0) {
          const n = pair.slice(0, idx).trim();
          const v = pair.slice(idx + 1).trim();
          if (n) nameToValue.set(n, v);
        }
      }
    }
  }

  const header = Array.from(nameToValue.entries())
    .map(([n, v]) => `${n}=${v}`)
    .join("; ");
  return header;
}

export default function CookieBuilderPage() {
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => parseNetscapeCookiesToHeader(source), [source]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10 lg:px-16">
      <section className="mx-auto max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          YouTube Cookie Builder
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Paste your Netscape cookies.txt content (from browser export or
          DevTools) and convert it to a single Cookie header line for{" "}
          <code>YTDL_COOKIE</code>.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="text-sm font-medium">Input (cookies.txt)</label>
          <textarea
            className="min-h-[220px] w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-background p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t<expiry>\tNAME\tVALUE"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />

          <div className="flex items-center justify-between mt-2">
            <label className="text-sm font-medium">
              Output (Cookie header)
            </label>
            <button
              type="button"
              onClick={onCopy}
              disabled={!output}
              className="rounded bg-blue-600 px-3 py-1.5 text-white text-sm disabled:opacity-60"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            readOnly
            className="min-h-[140px] w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-background p-3 text-sm shadow-sm"
            value={output}
            placeholder="LOGIN_INFO=...; VISITOR_INFO1_LIVE=...; YSC=...; PREF=...; ..."
          />
          <p className="text-xs text-foreground/60">
            Do not share this string publicly. Treat it like a password.
          </p>
        </div>
      </section>
    </main>
  );
}
