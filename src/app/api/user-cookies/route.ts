import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as { userId?: string } | null)?.userId;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = await getDb();
    const doc = await db.collection("cookies").findOne({ userId });
    if (!doc) return NextResponse.json({ cookieHeader: null });
    // Do not expose the full cookie back; return existence only
    return NextResponse.json({ cookieHeader: !!doc.cookieHeader });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as { userId?: string } | null)?.userId;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const cookieHeader = String(body?.cookieHeader || "").trim();
    if (!cookieHeader)
      return NextResponse.json(
        { error: "Missing cookieHeader" },
        { status: 400 }
      );
    const db = await getDb();
    await db
      .collection("cookies")
      .updateOne(
        { userId },
        { $set: { userId, cookieHeader, updatedAt: new Date() } },
        { upsert: true }
      );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as { userId?: string } | null)?.userId;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = await getDb();
    await db.collection("cookies").deleteOne({ userId });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
