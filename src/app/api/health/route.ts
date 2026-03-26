import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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
