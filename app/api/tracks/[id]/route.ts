import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const trackId = Number(id);
  const body = (await request.json()) as { genreId?: number | null };

  if (!Number.isInteger(trackId)) {
    return NextResponse.json({ error: "Track inválida." }, { status: 400 });
  }

  if (body.genreId !== null && body.genreId !== undefined) {
    const genre = await prisma.genre.findUnique({ where: { id: Number(body.genreId) } });
    if (!genre) {
      return NextResponse.json({ error: "Gênero não encontrado." }, { status: 404 });
    }
  }

  const track = await prisma.track.update({
    where: { id: trackId },
    data: {
      genreId: body.genreId === undefined ? undefined : body.genreId
    },
    include: { genre: true }
  });

  return NextResponse.json({ track });
}
