import { NextResponse } from "next/server";
import ytdl, {
  videoFormat as YtdlVideoFormat,
  videoInfo as YtdlVideoInfo,
} from "@distube/ytdl-core";
import { isYouTubeUrl } from "@/lib/validators";

export const runtime = "nodejs";

function formatDuration(secondsString?: string) {
  const total = Number(secondsString ?? 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  const parts = [hours, minutes, seconds].map((n) =>
    String(n).padStart(2, "0")
  );
  return hours > 0 ? parts.join(":") : parts.slice(1).join(":");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();

  if (!url || !isYouTubeUrl(url)) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  try {
    const cookie = process.env.YTDL_COOKIE;
    const info: YtdlVideoInfo = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
          ...(cookie ? { cookie } : {}),
        } as Record<string, string>,
      },
    });

    const { videoDetails, formats } = info;

    const title = videoDetails.title;
    const author = videoDetails.author?.name ?? "Unknown";
    const lengthSeconds = videoDetails.lengthSeconds;
    const duration = formatDuration(lengthSeconds);
    const thumbnail =
      videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url;

    const progressive = Array.isArray(formats)
      ? (formats as YtdlVideoFormat[])
          .filter(
            (f) =>
              f.hasAudio &&
              f.hasVideo &&
              (f.container === "mp4" || f.container === "webm") &&
              (f.qualityLabel || f.height)
          )
          .map((f) => ({
            itag: f.itag as number,
            qualityLabel:
              (f.qualityLabel as string) || (f.height ? `${f.height}p` : ""),
            container: f.container as string,
            fps: (f.fps as number) || undefined,
            bitrate: (f.bitrate as number) || undefined,
            contentLength: (f.contentLength as string) || undefined,
            approxSizeMB: f.contentLength
              ? Math.round((Number(f.contentLength) / (1024 * 1024)) * 10) / 10
              : undefined,
            height:
              (f.height as number) ||
              (typeof f.qualityLabel === "string"
                ? Number((f.qualityLabel as string).replace(/\D/g, ""))
                : 0),
          }))
          .sort((a, b) => (a.height && b.height ? b.height - a.height : 0))
      : [];

    const adaptive = Array.isArray(formats)
      ? (formats as YtdlVideoFormat[])
          .filter(
            (f) => f.hasVideo && !f.hasAudio && (f.qualityLabel || f.height)
          )
          .map((f) => ({
            itag: f.itag as number,
            qualityLabel:
              (f.qualityLabel as string) || (f.height ? `${f.height}p` : ""),
            container: f.container as string,
            fps: (f.fps as number) || undefined,
            bitrate: (f.bitrate as number) || undefined,
            contentLength: (f.contentLength as string) || undefined,
            approxSizeMB: f.contentLength
              ? Math.round((Number(f.contentLength) / (1024 * 1024)) * 10) / 10
              : undefined,
            height:
              (f.height as number) ||
              (typeof f.qualityLabel === "string"
                ? Number((f.qualityLabel as string).replace(/\D/g, ""))
                : 0),
          }))
          .sort((a, b) => (a.height && b.height ? b.height - a.height : 0))
      : [];

    const bestAudio = Array.isArray(formats)
      ? (formats as YtdlVideoFormat[])
          .filter((f) => f.hasAudio && !f.hasVideo)
          .sort(
            (a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0)
          )[0]
      : undefined;

    return NextResponse.json({
      title,
      author,
      duration,
      thumbnail,
      progressive: progressive.map(({ height: _, ...rest }) => rest),
      adaptive: adaptive.map(({ height: _, ...rest }) => rest),
      bestAudioItag: bestAudio?.itag ?? null,
      audio: { mp3: true },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch video info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
