import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";

export async function GET() {
  await seed();
  try {
    const marketCount = db.markets.getAll().length;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      markets: marketCount,
      version: "1.0.0",
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
