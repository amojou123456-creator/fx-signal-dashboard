import { NextResponse } from "next/server";
import { getForexNews } from "@/lib/news";

export async function GET() {
  try {
    const result = await getForexNews();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
