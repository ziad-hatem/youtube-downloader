import { z } from "zod";

export const allowedFormats = ["mp4_720", "mp4_360", "mp3"] as const;
export type AllowedFormat = (typeof allowedFormats)[number];

export const formatSchema = z.enum(allowedFormats);

export const urlSchema = z
  .string()
  .url({ message: "Enter a valid URL" })
  .refine(isYouTubeUrl, { message: "Enter a valid YouTube URL" });

export function isYouTubeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace(/^www\./, "");
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      // Watch, Shorts, or share URLs
      const isWatch = url.pathname === "/watch" && url.searchParams.has("v");
      const isShorts = url.pathname.startsWith("/shorts/");
      const isEmbed = url.pathname.startsWith("/embed/");
      return isWatch || isShorts || isEmbed;
    }
    if (hostname === "youtu.be") {
      return url.pathname.length > 1;
    }
    return false;
  } catch {
    return false;
  }
}

export function sanitizeFilename(input: string): string {
  return input
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
