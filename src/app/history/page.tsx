"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type HistoryItem = {
  _id: string;
  title: string;
  format: string;
  thumbnail?: string;
  createdAt: string | number | Date;
};

type HistoryResponse = { items: HistoryItem[] };

export default function HistoryPage() {
  const { data: session } = useSession();
  const userId = (session as { userId?: string } | null | undefined)?.userId;
  const { data } = useSWR<HistoryResponse>(
    userId ? `/api/history?userId=${userId}` : null,
    fetcher
  );
  const items: HistoryItem[] = data?.items || [];

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold">Download History</h1>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-foreground/70">No downloads yet.</p>
        ) : (
          items.map((it) => (
            <div
              key={it._id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium" title={it.title}>
                    {it.title}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {it.format} • {new Date(it.createdAt).toLocaleString()}
                  </p>
                </div>
                {it.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.thumbnail}
                    alt="thumb"
                    className="h-16 w-28 rounded object-cover"
                  />
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
