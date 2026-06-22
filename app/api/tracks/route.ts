import { NextResponse } from "next/server";
import { inferGenre } from "@/lib/genre-inference";
import { prisma } from "@/lib/prisma";

type TrackPayload = {
  youtubeVideoId?: string;
  title?: string;
  channelTitle?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
};

export async function POST(request: Request) {
  const body = (await request.json()) as TrackPayload;

  if (!body.youtubeVideoId || !body.title || !body.channelTitle) {
    return NextResponse.json(
      { error: "youtubeVideoId, title e channelTitle são obrigatórios." },
      { status: 400 }
    );
  }

  const inferredGenre = inferGenre({
    title: body.title,
    channelTitle: body.channelTitle
  });
  const genre = await prisma.genre.upsert({
    where: { name: inferredGenre.name },
    update: { color: inferredGenre.color },
    create: inferredGenre
  });

  const track = await prisma.track.upsert({
    where: { youtubeVideoId: body.youtubeVideoId },
    update: {
      title: body.title,
      channelTitle: body.channelTitle,
      thumbnailUrl: body.thumbnailUrl ?? null,
      durationSeconds: body.durationSeconds ?? null,
      genreId: genre.id
    },
    create: {
      youtubeVideoId: body.youtubeVideoId,
      title: body.title,
      channelTitle: body.channelTitle,
      thumbnailUrl: body.thumbnailUrl ?? null,
      durationSeconds: body.durationSeconds ?? null,
      genreId: genre.id
    },
    include: { genre: true }
  });

  return NextResponse.json({ track });
}
