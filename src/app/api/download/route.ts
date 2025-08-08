import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { sanitizeFilename, isYouTubeUrl } from "@/lib/validators";
import { Readable, PassThrough } from "stream";
import contentDisposition from "content-disposition";

export const runtime = "nodejs";

// Ensure ffmpeg binary is wired for serverless or local environments
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();
  const formatParam = searchParams.get("format")?.trim() as string | null;
  const itagParam = searchParams.get("itag")?.trim() || null;

  if (!url || !isYouTubeUrl(url)) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  if (!formatParam && !itagParam) {
    return NextResponse.json(
      { error: "Missing format or itag" },
      { status: 400 }
    );
  }

  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
        },
      },
    } as any);
    const title = sanitizeFilename(info.videoDetails.title || "video");

    if (formatParam === "mp3") {
      // Audio-only to MP3 via ffmpeg
      const audioStream = ytdl(url, {
        quality: "highestaudio",
        filter: "audioonly",
        requestOptions: {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "accept-language": "en-US,en;q=0.9",
          },
        },
      });
      const pass = new PassThrough();
      ffmpeg(audioStream)
        .audioBitrate(128)
        .format("mp3")
        .on("error", (err) => {
          // eslint-disable-next-line no-console
          console.error("ffmpeg error:", err);
        })
        .on("start", () => {
          // started
        })
        .on("end", () => {
          // finished
        })
        .pipe(pass, { end: true });

      const headers = new Headers({
        "Content-Type": "audio/mpeg",
        "Content-Disposition": contentDisposition(`${title}.mp3`, {
          type: "attachment",
        }),
      });

      // Ensure we have data before responding to avoid ERR_EMPTY_RESPONSE
      const firstChunkQueue: Uint8Array[] = [];
      await new Promise<void>((resolve, reject) => {
        const onData = (chunk: Buffer) => {
          firstChunkQueue.push(new Uint8Array(chunk));
          cleanup();
          resolve();
        };
        const onError = (err: unknown) => {
          cleanup();
          reject(err);
        };
        const onEnd = () => {
          cleanup();
          reject(new Error("No data produced"));
        };
        const cleanup = () => {
          pass.off("data", onData);
          pass.off("error", onError as any);
          pass.off("end", onEnd);
        };
        pass.on("data", onData);
        pass.once("error", onError as any);
        pass.once("end", onEnd);
      });

      const webStream = new ReadableStream<Uint8Array>({
        start(controller) {
          while (firstChunkQueue.length)
            controller.enqueue(firstChunkQueue.shift()!);
          pass.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
          pass.once("end", () => controller.close());
          pass.once("error", (err) => controller.error(err));
        },
        cancel() {
          try {
            pass.destroy();
          } catch {}
        },
      });
      return new Response(webStream, { headers, status: 200 });
    }

    // MP4 via itag (supports progressive or adaptive). If adaptive (video-only), user will get video-only file.
    const itag = itagParam ? Number(itagParam) : NaN;
    if (!Number.isInteger(itag)) {
      return NextResponse.json({ error: "Invalid itag" }, { status: 400 });
    }
    const targetFormat = Array.isArray(info.formats)
      ? info.formats.find((f) => f.itag === itag)
      : undefined;
    const hasFormat = !!targetFormat;
    if (!hasFormat) {
      return NextResponse.json(
        { error: `Requested quality not available for this video` },
        { status: 400 }
      );
    }

    const videoStream = ytdl(url, {
      quality: itag,
      requestOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
        },
      },
    } as any);
    const headers = new Headers({
      "Content-Type": targetFormat?.mimeType?.split(";")?.[0] || "video/mp4",
      "Content-Disposition": contentDisposition(
        `${title}.${targetFormat?.container || "mp4"}`,
        {
          type: "attachment",
        }
      ),
    });

    // Ensure first data chunk before responding
    const firstChunkQueue: Uint8Array[] = [];
    await new Promise<void>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        firstChunkQueue.push(new Uint8Array(chunk));
        cleanup();
        resolve();
      };
      const onError = (err: unknown) => {
        cleanup();
        reject(err);
      };
      const onEnd = () => {
        cleanup();
        reject(new Error("No data produced"));
      };
      const cleanup = () => {
        (videoStream as any).off("data", onData);
        (videoStream as any).off("error", onError as any);
        (videoStream as any).off("end", onEnd);
      };
      (videoStream as any).on("data", onData);
      (videoStream as any).once("error", onError as any);
      (videoStream as any).once("end", onEnd);
    });

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        while (firstChunkQueue.length)
          controller.enqueue(firstChunkQueue.shift()!);
        (videoStream as any).on("data", (chunk: Buffer) =>
          controller.enqueue(new Uint8Array(chunk))
        );
        (videoStream as any).once("end", () => controller.close());
        (videoStream as any).once("error", (err: unknown) =>
          controller.error(err)
        );
      },
      cancel() {
        try {
          (videoStream as any).destroy();
        } catch {}
      },
    });
    return new Response(webStream, { headers, status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to start download" },
      { status: 500 }
    );
  }
}
