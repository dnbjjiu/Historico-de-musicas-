import type { PlaySource } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PlayPayload = {
  trackId?: number;
  source?: PlaySource;
};

const allowedSources = new Set<PlaySource>(["internal_player", "external_youtube"]);

export async function POST(request: Request) {
  const body = (await request.json()) as PlayPayload;

  if (!body.trackId || !body.source || !allowedSources.has(body.source)) {
    return NextResponse.json(
      { error: "trackId e source válido são obrigatórios." },
      { status: 400 }
    );
  }

  const play = await prisma.playEvent.create({
    data: {
      trackId: body.trackId,
      source: body.source
    },
    include: { track: { include: { genre: true } } }
  });

  return NextResponse.json({ play }, { status: 201 });
}
