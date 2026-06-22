import type { Genre, PlaySource, Track } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DashboardPeriod = "all" | "7d" | "30d" | "6m" | "year";

export type TrackWithGenre = Track & {
  genre: Genre | null;
};

export type RankingItem = {
  track: TrackWithGenre;
  playCount: number;
  lastPlayedAt: string | null;
};

export type RecentPlay = {
  id: number;
  playedAt: string;
  source: PlaySource;
  track: TrackWithGenre;
};

export type GenreTopItem = {
  genre: {
    id: number | null;
    name: string;
    color: string;
  };
  track: TrackWithGenre;
  playCount: number;
};

export type DashboardData = {
  genres: Genre[];
  totalPlays: number;
  totalTracks: number;
  ranking: RankingItem[];
  recent: RecentPlay[];
  topByGenre: GenreTopItem[];
};

export function getPeriodStart(period: DashboardPeriod): Date | undefined {
  const now = new Date();

  if (period === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (period === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  if (period === "6m") {
    return new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000);
  }

  if (period === "year") {
    return new Date(now.getFullYear(), 0, 1);
  }

  return undefined;
}

export async function getDashboardData(
  period: DashboardPeriod,
  genreFilter: string | null
): Promise<DashboardData> {
  const playedAt = getPeriodStart(period) ? { gte: getPeriodStart(period) } : undefined;
  const genreWhere =
    genreFilter === "none"
      ? { genreId: null }
      : genreFilter
        ? { genreId: Number(genreFilter) }
        : { genre: { is: { name: { not: "Outros" } } } };

  const playWhere = {
    ...(playedAt ? { playedAt } : {}),
    ...(genreWhere ? { track: genreWhere } : {})
  };

  const [genres, grouped, totalGrouped, totalPlays, recent] = await Promise.all([
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.playEvent.groupBy({
      by: ["trackId"],
      where: playWhere,
      _count: { trackId: true },
      _max: { playedAt: true },
      orderBy: [{ _count: { trackId: "desc" } }, { _max: { playedAt: "desc" } }],
      take: 50
    }),
    prisma.playEvent.groupBy({
      by: ["trackId"],
      where: playWhere,
      _count: { trackId: true }
    }),
    prisma.playEvent.count({ where: playWhere }),
    prisma.playEvent.findMany({
      where: playWhere,
      include: { track: { include: { genre: true } } },
      orderBy: { playedAt: "desc" },
      take: 30
    })
  ]);

  const tracks = await prisma.track.findMany({
    where: { id: { in: grouped.map((item) => item.trackId) } },
    include: { genre: true }
  });
  const tracksById = new Map(tracks.map((track) => [track.id, track]));

  const ranking = grouped.flatMap((item) => {
    const track = tracksById.get(item.trackId);
    if (!track) {
      return [];
    }

    return {
      track,
      playCount: item._count.trackId,
      lastPlayedAt: item._max.playedAt?.toISOString() ?? null
    };
  });

  const topByGenre = buildTopByGenre(ranking);

  return {
    genres,
    totalPlays,
    totalTracks: totalGrouped.length,
    ranking,
    recent: recent.map((event) => ({
      id: event.id,
      playedAt: event.playedAt.toISOString(),
      source: event.source,
      track: event.track
    })),
    topByGenre
  };
}

function buildTopByGenre(ranking: RankingItem[]): GenreTopItem[] {
  const bestByGenre = new Map<string, GenreTopItem>();

  for (const item of ranking) {
    const genre = item.track.genre
      ? {
          id: item.track.genre.id,
          name: item.track.genre.name,
          color: item.track.genre.color
        }
      : {
          id: null,
          name: "Sem gênero",
          color: "#667085"
        };
    const key = genre.id === null ? "none" : String(genre.id);
    const current = bestByGenre.get(key);

    if (!current || item.playCount > current.playCount) {
      bestByGenre.set(key, {
        genre,
        track: item.track,
        playCount: item.playCount
      });
    }
  }

  return Array.from(bestByGenre.values()).sort((a, b) => b.playCount - a.playCount);
}

export function normalizePeriod(period: string | null): DashboardPeriod {
  if (period === "7d" || period === "30d" || period === "6m" || period === "year") {
    return period;
  }

  return "all";
}
