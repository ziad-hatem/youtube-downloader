import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    const db = await getDb();
    const existing = await db
      .collection("users")
      .findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const doc = {
      email: String(email).toLowerCase(),
      name: name || null,
      passwordHash,
      createdAt: new Date(),
    };
    const res = await db.collection("users").insertOne(doc);
    return NextResponse.json(
      { ok: true, id: String(res.insertedId) },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to register";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
