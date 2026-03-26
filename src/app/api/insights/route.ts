import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";

seed();

export async function GET() {
  try {
    const insights = db.insights.getAll();
    return NextResponse.json({ ok: true, data: insights });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch insights" }, { status: 500 });
  }
}
