import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ genres });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; color?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Nome do gênero é obrigatório." }, { status: 400 });
  }

  const genre = await prisma.genre.upsert({
    where: { name },
    update: { color: body.color ?? undefined },
    create: {
      name,
      color: body.color ?? "#3f7d58"
    }
  });

  return NextResponse.json({ genre }, { status: 201 });
}
