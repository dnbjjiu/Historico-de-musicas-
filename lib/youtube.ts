export type YouTubeSearchResult = {
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
};

type VideoItem = {
  id?: string;
  contentDetails?: {
    duration?: string;
  };
};

export function parseYouTubeDuration(duration: string | undefined): number | null {
  if (!duration) {
    return null;
  }

  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return null;
  }

  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export async function searchYouTubeMusic(query: string): Promise<YouTubeSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY_MISSING");
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoCategoryId", "10");
  searchUrl.searchParams.set("maxResults", "12");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  const searchResponse = await fetch(searchUrl, { cache: "no-store" });

  if (!searchResponse.ok) {
    throw new Error(`YOUTUBE_SEARCH_FAILED:${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as { items?: SearchItem[] };
  const items = searchData.items ?? [];
  const ids = items
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  const durations = new Map<string, number | null>();

  if (ids.length > 0) {
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "contentDetails");
    videosUrl.searchParams.set("id", ids.join(","));
    videosUrl.searchParams.set("key", apiKey);

    const videosResponse = await fetch(videosUrl, { cache: "no-store" });

    if (videosResponse.ok) {
      const videosData = (await videosResponse.json()) as { items?: VideoItem[] };
      for (const item of videosData.items ?? []) {
        if (item.id) {
          durations.set(item.id, parseYouTubeDuration(item.contentDetails?.duration));
        }
      }
    }
  }

  return items.flatMap((item) => {
    const youtubeVideoId = item.id?.videoId;
    if (!youtubeVideoId) {
      return [];
    }

    const thumbnail =
      item.snippet?.thumbnails?.high?.url ??
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url ??
      null;

    return {
      youtubeVideoId,
      title: decodeHtml(item.snippet?.title ?? "Sem título"),
      channelTitle: decodeHtml(item.snippet?.channelTitle ?? "Canal desconhecido"),
      thumbnailUrl: thumbnail,
      durationSeconds: durations.get(youtubeVideoId) ?? null
    };
  });
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
