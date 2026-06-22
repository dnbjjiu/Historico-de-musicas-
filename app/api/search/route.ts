import { NextResponse } from "next/server";
import { searchYouTubeMusic } from "@/lib/youtube";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchYouTubeMusic(query);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Error && error.message === "YOUTUBE_API_KEY_MISSING") {
      return NextResponse.json(
        {
          error:
            "Configure YOUTUBE_API_KEY no arquivo .env para buscar músicas no YouTube."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível buscar músicas no YouTube agora." },
      { status: 502 }
    );
  }
}
