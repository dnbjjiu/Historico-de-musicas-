import { NextResponse } from "next/server";
import { getDashboardData, normalizePeriod } from "@/lib/dashboard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = normalizePeriod(searchParams.get("period"));
  const genreId = searchParams.get("genreId");
  const dashboard = await getDashboardData(period, genreId && genreId !== "all" ? genreId : null);

  return NextResponse.json(dashboard);
}
