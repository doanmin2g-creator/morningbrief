import { NextResponse } from "next/server";
import { VietstockConnector } from "../vietstock-connector";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const history = await VietstockConnector.fetchHistory(symbol, days);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching stock history:", error);
    return NextResponse.json({ error: "Failed to fetch stock history" }, { status: 500 });
  }
}
