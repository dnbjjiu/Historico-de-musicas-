import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { inferGenre } from "@/lib/genre-inference";
import { prisma } from "@/lib/prisma";

type ImportEntry = {
  youtubeVideoId?: string;
  title?: string;
  channelTitle?: string;
  watchedAt?: string;
};

type ImportPayload = {
  entries?: ImportEntry[];
};

const MAX_ENTRIES_PER_REQUEST = 2000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportPayload;
    const entries = body.entries ?? [];

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma entrada válida foi enviada para importação." },
        { status: 400 }
      );
    }

    if (entries.length > MAX_ENTRIES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Envie no máximo ${MAX_ENTRIES_PER_REQUEST} entradas por lote.` },
        { status: 413 }
      );
    }

    let imported = 0;
    let duplicated = 0;
    let invalid = 0;
    const touchedTracks = new Set<number>();

    for (const entry of entries) {
      const youtubeVideoId = entry.youtubeVideoId?.trim();
      const watchedAt = parseDate(entry.watchedAt);

      if (!youtubeVideoId || !watchedAt) {
        invalid += 1;
        continue;
      }

      const sourceKey = `takeout:${youtubeVideoId}:${watchedAt.toISOString()}`;
      const title = cleanTitle(entry.title) || `YouTube video ${youtubeVideoId}`;
      const channelTitle = entry.channelTitle?.trim() || "Canal desconhecido";
      const inferredGenre = inferGenre({ title, channelTitle });

      try {
        const genre = await prisma.genre.upsert({
          where: { name: inferredGenre.name },
          update: { color: inferredGenre.color },
          create: inferredGenre
        });

        const track = await prisma.track.upsert({
          where: { youtubeVideoId },
          update: {
            title,
            channelTitle,
            genreId: genre.id
          },
          create: {
            youtubeVideoId,
            title,
            channelTitle,
            genreId: genre.id
          }
        });

        await prisma.playEvent.create({
          data: {
            trackId: track.id,
            playedAt: watchedAt,
            source: "youtube_history_import",
            sourceKey
          }
        });

        imported += 1;
        touchedTracks.add(track.id);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          duplicated += 1;
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json({
      imported,
      duplicated,
      invalid,
      touchedTracks: touchedTracks.size
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      return NextResponse.json(
        {
          error:
            "Erro no banco de dados. Na Vercel, configure um banco persistente e rode as tabelas do Prisma."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno ao importar o histórico." },
      { status: 500 }
    );
  }
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function cleanTitle(value: string | undefined): string {
  return (value ?? "")
    .replace(/^Watched\s+/i, "")
    .replace(/^Assistiu\s+/i, "")
    .replace(/^Você assistiu\s+/i, "")
    .trim();
}
