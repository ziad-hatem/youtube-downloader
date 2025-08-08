"use client";

import * as React from "react";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";

const formSchema = z.object({
  url: z
    .string()
    .url("Enter a valid URL")
    .refine(
      (val) => /(youtube\.com|youtu\.be)/i.test(val),
      "Enter a valid YouTube URL"
    ),
});

type FormValues = z.infer<typeof formSchema>;

type VideoFormat = {
  itag: number;
  qualityLabel: string;
  container: string;
  fps?: number;
  bitrate?: number;
  contentLength?: string;
  approxSizeMB?: number;
};

type VideoInfo = {
  title: string;
  author: string;
  duration: string;
  thumbnail?: string;
  progressive: VideoFormat[];
  adaptive: VideoFormat[];
  bestAudioItag: number | null;
  audio: { mp3: boolean };
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [selected, setSelected] = useState<string>("mp3");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const urlValue = watch("url");

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      setInfo(null);
      const res = await fetch(`/api/info?url=${encodeURIComponent(data.url)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch info");
      setInfo(json as VideoInfo);
      const mp4 =
        (json as VideoInfo).progressive?.[0] ||
        (json as VideoInfo).adaptive?.[0];
      setSelected(mp4 ? `itag:${mp4.itag}` : "mp3");
      toast.success("Video info loaded");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not fetch video info";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const startDownload = async () => {
    if (!info) return;
    let url = "";
    if (selected === "mp3") {
      url = `/api/download?url=${encodeURIComponent(urlValue)}&format=mp3`;
    } else if (selected.startsWith("itag:")) {
      const itag = selected.split(":")[1];
      url = `/api/download?url=${encodeURIComponent(urlValue)}&itag=${itag}`;
    } else {
      toast.error("Select a format");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10 lg:px-16 bg-gradient-to-b from-white to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          YouTube Downloader
        </h1>
        <p className="mt-3 text-base md:text-lg text-foreground/70">
          Download MP4 (720p/360p) or extract MP3 audio. Fast and free.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-foreground/60">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="Paste a YouTube URL (e.g. https://youtu.be/...)"
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-background pl-10 pr-36 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("url")}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-1 top-1.5 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Fetch"}
            </button>
          </div>
          {errors.url && (
            <p className="mt-2 text-sm text-red-600">{errors.url.message}</p>
          )}
        </form>

        {info && (
          <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background p-5 text-left shadow-sm">
            <div className="flex gap-4">
              {info.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={info.thumbnail}
                  alt="Thumbnail"
                  className="h-28 w-48 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate" title={info.title}>
                  {info.title}
                </h2>
                <p className="text-sm text-foreground/70 mt-1">{info.author}</p>
                <p className="text-sm text-foreground/70">
                  Duration: {info.duration}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="text-sm text-foreground/70">Format</label>
                  <div className="flex items-center gap-3">
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {info.progressive?.map((f) => (
                        <option key={f.itag} value={`itag:${f.itag}`}>
                          {f.container.toUpperCase()} {f.qualityLabel}
                          {f.fps ? ` ${f.fps}fps` : ""}
                          {typeof f.approxSizeMB === "number"
                            ? ` • ~${f.approxSizeMB}MB`
                            : ""}
                        </option>
                      ))}
                      {info.adaptive?.length ? (
                        <optgroup label="Video-only (no audio)">
                          {info.adaptive.map((f) => (
                            <option key={f.itag} value={`itag:${f.itag}`}>
                              {f.container.toUpperCase()} {f.qualityLabel}
                              {f.fps ? ` ${f.fps}fps` : ""}
                              {typeof f.approxSizeMB === "number"
                                ? ` • ~${f.approxSizeMB}MB`
                                : ""}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {info.audio?.mp3 && (
                        <option value="mp3">MP3 Audio</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={startDownload}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-500"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="mx-auto max-w-5xl mt-16 text-center text-sm text-foreground/60">
        © {new Date().getFullYear()} YouTube Downloader. For personal use only.
      </footer>
    </main>
  );
}
