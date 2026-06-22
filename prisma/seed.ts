import { PrismaClient } from "@prisma/client";
import { defaultGenres } from "../lib/genre-inference";

const prisma = new PrismaClient();

async function main() {
  for (const genre of defaultGenres) {
    await prisma.genre.upsert({
      where: { name: genre.name },
      update: { color: genre.color },
      create: genre
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
