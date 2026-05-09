import { NextRequest, NextResponse } from "next/server";
import { seedDemoData }              from "@/lib/seedDemoData";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const { wallet } = await req.json();

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet required" },
      { status: 400 }
    );
  }

  const result = await seedDemoData(wallet);
  return NextResponse.json(result);
}