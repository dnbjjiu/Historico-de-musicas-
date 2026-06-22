"use client";

import {
  BarChart3,
  CalendarDays,
  Clock3,
  Crown,
  Disc3,
  ExternalLink,
  Flame,
  Music2,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Tags,
  Upload
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Genre = {
  id: number;
  name: string;
  color: string;
};

type Track = {
  id: number;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  genreId: number | null;
  genre: Genre | null;
};

type SearchResult = {
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

type PlaySource = "internal_player" | "external_youtube" | "youtube_history_import";

type RankingItem = {
  track: Track;
  playCount: number;
  lastPlayedAt: string | null;
};

type RecentPlay = {
  id: number;
  playedAt: string;
  source: PlaySource;
  track: Track;
};

type GenreTopItem = {
  genre: {
    id: number | null;
    name: string;
    color: string;
  };
  track: Track;
  playCount: number;
};

type DashboardData = {
  genres: Genre[];
  totalPlays: number;
  totalTracks: number;
  ranking: RankingItem[];
  recent: RecentPlay[];
  topByGenre: GenreTopItem[];
};

type ImportEntry = {
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  watchedAt: string;
};

type ImportSummary = {
  imported: number;
  duplicated: number;
  invalid: number;
  touchedTracks: number;
};

const emptyDashboard: DashboardData = {
  genres: [],
  totalPlays: 0,
  totalTracks: 0,
  ranking: [],
  recent: [],
  topByGenre: []
};

const periods = [
  { value: "7d", label: "Semanal", helper: "últimos 7 dias" },
  { value: "30d", label: "Mensal", helper: "últimos 30 dias" },
  { value: "6m", label: "6 meses", helper: "últimos 183 dias" },
  { value: "year", label: "Anual", helper: "ano atual" },
  { value: "all", label: "Tudo", helper: "histórico completo" }
];

const portugueseMonths: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11
};

export function MusicDashboard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [period, setPeriod] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [newGenreName, setNewGenreName] = useState("");
  const [newGenreColor, setNewGenreColor] = useState("#3f7d58");

  const genres = dashboard.genres;
  const topFive = dashboard.ranking.slice(0, 5);
  const activePeriod = periods.find((item) => item.value === period) ?? periods[0];
  const topTrack = dashboard.ranking[0] ?? null;
  const dominantGenre = dashboard.topByGenre[0] ?? null;
  const latestPlay = dashboard.recent[0] ?? null;

  useEffect(() => {
    void refreshDashboard();
  }, [period, genreFilter]);

  async function refreshDashboard() {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/dashboard?period=${period}&genreId=${genreFilter}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as DashboardData;
      setDashboard(data);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm) {
      return;
    }

    setIsSearching(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data = (await response.json()) as { results?: SearchResult[]; error?: string };

      if (!response.ok) {
        setResults([]);
        setMessage(data.error ?? "Não foi possível buscar no YouTube.");
        return;
      }

      setResults(data.results ?? []);
    } finally {
      setIsSearching(false);
    }
  }

  async function ensureTrack(track: SearchResult | Track): Promise<Track> {
    if ("id" in track) {
      return track;
    }

    const response = await fetch("/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(track)
    });

    const data = (await response.json()) as { track: Track; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível salvar a música.");
    }

    return data.track;
  }

  async function registerPlay(track: SearchResult | Track, source: PlaySource) {
    const savedTrack = await ensureTrack(track);

    const response = await fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: savedTrack.id, source })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Não foi possível registrar a reprodução.");
    }

    await refreshDashboard();
    return savedTrack;
  }

  async function playInsideApp(track: SearchResult | Track) {
    setMessage(null);
    try {
      const savedTrack = await registerPlay(track, "internal_player");
      setSelectedTrack(savedTrack);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao tocar a música.");
    }
  }

  async function openOnYouTube(track: SearchResult | Track) {
    setMessage(null);
    try {
      const savedTrack = await registerPlay(track, "external_youtube");
      window.open(`https://www.youtube.com/watch?v=${savedTrack.youtubeVideoId}`, "_blank");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao abrir a música.");
    }
  }

  async function updateTrackGenre(trackId: number, value: string) {
    setMessage(null);
    const genreId = value === "none" ? null : Number(value);

    const response = await fetch(`/api/tracks/${trackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genreId })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error ?? "Não foi possível atualizar o gênero.");
      return;
    }

    await refreshDashboard();
  }

  async function createGenre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGenreName.trim();
    if (!name) {
      return;
    }

    const response = await fetch("/api/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: newGenreColor })
    });

    if (response.ok) {
      setNewGenreName("");
      await refreshDashboard();
      return;
    }

    const data = (await response.json()) as { error?: string };
    setMessage(data.error ?? "Não foi possível criar o gênero.");
  }

  async function importYouTubeHistory(file: File | null) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage(null);
    setImportSummary(null);

    try {
      const content = await file.text();
      const entries = file.name.toLowerCase().endsWith(".json")
        ? parseTakeoutJson(content)
        : parseTakeoutHtml(content);

      if (entries.length === 0) {
        setMessage("Nenhuma entrada com link de vídeo do YouTube foi encontrada no arquivo.");
        return;
      }

      const summary: ImportSummary = {
        imported: 0,
        duplicated: 0,
        invalid: 0,
        touchedTracks: 0
      };

      for (const chunk of chunkEntries(entries, 200)) {
        const response = await fetch("/api/import/youtube-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: chunk })
        });
        const data = await readJsonResponse<ImportSummary & { error?: string }>(response);

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível importar o histórico.");
        }

        summary.imported += data.imported;
        summary.duplicated += data.duplicated;
        summary.invalid += data.invalid;
        summary.touchedTracks += data.touchedTracks;
      }

      await refreshDashboard();
      setImportSummary(summary);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao importar o histórico do YouTube."
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">YouTube Music Tracker</p>
          <h1>Histórico musical</h1>
        </div>
        <button className="icon-button" type="button" onClick={() => void refreshDashboard()}>
          <RefreshCcw size={18} aria-hidden="true" />
          Atualizar
        </button>
      </header>

      <section className="summary-strip" aria-label="Resumo">
        <Metric icon={<BarChart3 size={20} />} label="Reproduções" value={dashboard.totalPlays} />
        <Metric icon={<Music2 size={20} />} label="Músicas" value={dashboard.totalTracks} />
        <Metric icon={<Tags size={20} />} label="Gêneros" value={genres.length} />
      </section>

      <section className="period-lab" aria-label="Filtro de data">
        <div className="period-lab-copy">
          <div className="section-title">
            <span>
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <h2>Janela de escuta</h2>
          </div>
          <p>
            Troque a janela para descobrir o que você ouvia na semana, no mês, nos últimos seis
            meses ou no ano.
          </p>
        </div>
        <div className="period-buttons" role="group" aria-label="Selecionar período">
          {periods.map((item) => (
            <button
              className={item.value === period ? "period-button active" : "period-button"}
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
            >
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="insight-grid" aria-label="Insights do período">
        <InsightCard
          icon={<Sparkles size={18} />}
          label={`Campeã ${activePeriod.label.toLowerCase()}`}
          title={topTrack?.track.title ?? "Sem música na janela"}
          detail={
            topTrack
              ? `${topTrack.playCount} reproduções em ${activePeriod.helper}`
              : "Importe mais dados ou mude a janela."
          }
        />
        <InsightCard
          icon={<Disc3 size={18} />}
          label="Gênero dominante"
          title={dominantGenre?.genre.name ?? "Sem gênero dominante"}
          detail={
            dominantGenre
              ? `${dominantGenre.playCount} plays puxados por ${dominantGenre.track.title}`
              : "A classificação aparece quando houver reproduções."
          }
        />
        <InsightCard
          icon={<Clock3 size={18} />}
          label="Última escuta"
          title={latestPlay?.track.title ?? "Nenhuma reprodução recente"}
          detail={
            latestPlay
              ? `${formatDate(latestPlay.playedAt)} · ${formatSource(latestPlay.source)}`
              : activePeriod.helper
          }
        />
      </section>

      <section className="top-five-section" aria-label="Top 5 músicas">
        <div className="top-five-copy">
          <div className="section-title">
            <span>
              <Crown size={20} aria-hidden="true" />
            </span>
            <h2>Top 5 do seu histórico</h2>
          </div>
          <p>
            As faixas mais repetidas aparecem com capa, gênero inferido e ações rápidas para tocar
            ou abrir no YouTube.
          </p>
        </div>

        <div className="top-five-grid">
          {topFive.length === 0 ? (
            <div className="top-five-empty">
              <Music2 size={28} aria-hidden="true" />
              Importe seu histórico para revelar seu top 5.
            </div>
          ) : (
            topFive.map((item, index) => (
              <article className="top-card" key={item.track.id}>
                <div className="top-card-media">
                  {item.track.thumbnailUrl ? (
                    <img src={item.track.thumbnailUrl} alt="" />
                  ) : (
                    <div className="thumb-fallback" />
                  )}
                  <span className="top-rank">#{index + 1}</span>
                  <span className="top-plays">
                    <Flame size={14} aria-hidden="true" />
                    {item.playCount}x
                  </span>
                </div>
                <div className="top-card-body">
                  <GenrePill genre={item.track.genre} />
                  <h3>{item.track.title}</h3>
                  <p>{item.track.channelTitle}</p>
                  <div className="top-card-actions">
                    <button type="button" onClick={() => void playInsideApp(item.track)}>
                      <Play size={16} aria-hidden="true" />
                      Tocar
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void openOnYouTube(item.track)}
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                      YouTube
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="toolbar" aria-label="Busca e filtros">
        <form className="search-form" onSubmit={handleSearch}>
          <label htmlFor="music-search">Buscar música</label>
          <div className="input-row">
            <Search size={18} aria-hidden="true" />
            <input
              id="music-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome da música ou artista"
            />
            <button type="submit" disabled={isSearching}>
              <Search size={17} aria-hidden="true" />
              {isSearching ? "Buscando" : "Buscar"}
            </button>
          </div>
        </form>

        <div className="filters">
          <label>
            <Tags size={16} aria-hidden="true" />
            Gênero
            <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
              <option value="all">Todos</option>
              <option value="none">Sem gênero</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {message ? <div className="status-message">{message}</div> : null}

      <section className="panel import-panel" aria-label="Importar histórico do YouTube">
        <div>
          <SectionTitle icon={<Upload size={18} />} title="Importar histórico do YouTube" />
          <p className="muted">
            Use o arquivo <strong>watch-history.json</strong> ou <strong>watch-history.html</strong> do Google
            Takeout. Cada entrada única do histórico conta como uma reprodução.
          </p>
        </div>
        <label className="file-import-button">
          <Upload size={17} aria-hidden="true" />
          {isImporting ? "Importando" : "Escolher arquivo"}
          <input
            type="file"
            accept=".json,.html,.htm,application/json,text/html"
            disabled={isImporting}
            onChange={(event) => void importYouTubeHistory(event.target.files?.[0] ?? null)}
          />
        </label>
        {importSummary ? (
          <div className="import-summary" aria-live="polite">
            <span>{importSummary.imported} novas</span>
            <span>{importSummary.duplicated} duplicadas</span>
            <span>{importSummary.invalid} inválidas</span>
          </div>
        ) : null}
      </section>

      <section className="workspace-grid">
        <div className="main-column">
          <section className="panel player-panel" aria-label="Player">
            {selectedTrack ? (
              <>
                <div className="player-frame">
                  <iframe
                    key={selectedTrack.youtubeVideoId}
                    src={`https://www.youtube.com/embed/${selectedTrack.youtubeVideoId}?autoplay=1&playsinline=1`}
                    title={selectedTrack.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="player-meta">
                  <div>
                    <h2>{selectedTrack.title}</h2>
                    <p>{selectedTrack.channelTitle}</p>
                  </div>
                  <GenrePill genre={selectedTrack.genre} />
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Music2 size={34} aria-hidden="true" />
                <h2>Player</h2>
              </div>
            )}
          </section>

          <section className="panel" aria-label="Resultados da busca">
            <SectionTitle icon={<Search size={18} />} title="Resultados" />
            <div className="result-list">
              {results.length === 0 ? (
                <p className="muted">Nenhum resultado carregado.</p>
              ) : (
                results.map((track) => (
                  <TrackRow
                    key={track.youtubeVideoId}
                    track={track}
                    genres={genres}
                    onPlay={() => void playInsideApp(track)}
                    onOpen={() => void openOnYouTube(track)}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="panel" aria-label="Mais ouvidas">
            <SectionTitle icon={<BarChart3 size={18} />} title="Mais ouvidas" />
            <div className="ranking-list">
              {dashboard.ranking.length === 0 ? (
                <p className="muted">Sem reproduções registradas.</p>
              ) : (
                dashboard.ranking.map((item, index) => (
                  <div className="ranking-row" key={item.track.id}>
                    <span className="rank">{index + 1}</span>
                    <div className="track-copy">
                      <strong>{item.track.title}</strong>
                      <span>{item.track.channelTitle}</span>
                    </div>
                    <span className="play-count">{item.playCount}x</span>
                    <GenreSelect
                      track={item.track}
                      genres={genres}
                      onChange={updateTrackGenre}
                    />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel" aria-label="Destaques por gênero">
            <SectionTitle icon={<Tags size={18} />} title="Por gênero" />
            <div className="genre-top-list">
              {dashboard.topByGenre.length === 0 ? (
                <p className="muted">Sem dados por gênero.</p>
              ) : (
                dashboard.topByGenre.map((item) => (
                  <div className="genre-top-row" key={item.genre.id ?? "none"}>
                    <span className="genre-dot" style={{ background: item.genre.color }} />
                    <div>
                      <strong>{item.genre.name}</strong>
                      <span>{item.track.title}</span>
                    </div>
                    <span>{item.playCount}x</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel" aria-label="Criar gênero">
            <SectionTitle icon={<Plus size={18} />} title="Novo gênero" />
            <form className="genre-form" onSubmit={createGenre}>
              <input
                value={newGenreName}
                onChange={(event) => setNewGenreName(event.target.value)}
                placeholder="Nome"
              />
              <input
                type="color"
                value={newGenreColor}
                onChange={(event) => setNewGenreColor(event.target.value)}
                aria-label="Cor do gênero"
              />
              <button type="submit">
                <Plus size={16} aria-hidden="true" />
                Criar
              </button>
            </form>
          </section>
        </aside>
      </section>

      <section className="panel history-panel" aria-label="Histórico recente">
        <SectionTitle
          icon={<Clock3 size={18} />}
          title={isRefreshing ? "Histórico recente" : "Histórico recente"}
        />
        <div className="history-list">
          {dashboard.recent.length === 0 ? (
            <p className="muted">Nenhuma reprodução recente.</p>
          ) : (
            dashboard.recent.map((event) => (
              <div className="history-row" key={event.id}>
                <div className="track-copy">
                  <strong>{event.track.title}</strong>
                  <span>
                    {event.track.channelTitle} · {formatDate(event.playedAt)} ·{" "}
                    {formatSource(event.source)}
                  </span>
                </div>
                <button type="button" onClick={() => void playInsideApp(event.track)}>
                  <Play size={16} aria-hidden="true" />
                  Tocar
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="section-title">
      <span>{icon}</span>
      <h2>{title}</h2>
    </div>
  );
}

function InsightCard({
  icon,
  label,
  title,
  detail
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <article className="insight-card">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function TrackRow({
  track,
  onPlay,
  onOpen
}: {
  track: SearchResult | Track;
  genres: Genre[];
  onPlay: () => void;
  onOpen: () => void;
}) {
  const savedTrack = "id" in track ? track : null;

  return (
    <article className="track-row">
      {track.thumbnailUrl ? <img src={track.thumbnailUrl} alt="" /> : <div className="thumb-fallback" />}
      <div className="track-copy">
        <strong>{track.title}</strong>
        <span>
          {track.channelTitle}
          {track.durationSeconds ? ` · ${formatDuration(track.durationSeconds)}` : ""}
        </span>
      </div>
      <div className="row-actions">
        {savedTrack ? <GenrePill genre={savedTrack.genre} /> : null}
        <button type="button" onClick={onPlay}>
          <Play size={16} aria-hidden="true" />
          Tocar
        </button>
        <button type="button" className="secondary" onClick={onOpen}>
          <ExternalLink size={16} aria-hidden="true" />
          YouTube
        </button>
      </div>
    </article>
  );
}

function GenreSelect({
  track,
  genres,
  onChange
}: {
  track: Track;
  genres: Genre[];
  onChange: (trackId: number, value: string) => void;
}) {
  return (
    <select
      className="genre-select"
      value={track.genreId ?? "none"}
      onChange={(event) => onChange(track.id, event.target.value)}
      aria-label={`Gênero de ${track.title}`}
    >
      <option value="none">Sem gênero</option>
      {genres.map((genre) => (
        <option key={genre.id} value={genre.id}>
          {genre.name}
        </option>
      ))}
    </select>
  );
}

function GenrePill({ genre }: { genre: Genre | null }) {
  return (
    <span className="genre-pill">
      <span
        className="genre-dot"
        style={{ background: genre?.color ?? "#667085" }}
        aria-hidden="true"
      />
      {genre?.name ?? "Sem gênero"}
    </span>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatSource(source: PlaySource) {
  if (source === "internal_player") {
    return "Player";
  }

  if (source === "external_youtube") {
    return "YouTube";
  }

  return "Histórico YouTube";
}

function parseTakeoutJson(content: string): ImportEntry[] {
  const parsed = JSON.parse(content) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const entry = item as {
      title?: string;
      titleUrl?: string;
      time?: string;
      subtitles?: Array<{ name?: string }>;
    };
    const youtubeVideoId = extractVideoId(entry.titleUrl ?? "");

    if (!youtubeVideoId || !entry.time) {
      return [];
    }

    return {
      youtubeVideoId,
      title: cleanTakeoutTitle(entry.title ?? ""),
      channelTitle: entry.subtitles?.[0]?.name ?? "Canal desconhecido",
      watchedAt: entry.time
    };
  });
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "A API respondeu sem conteúdo."
        : `A API respondeu sem conteúdo. Status ${response.status}. Verifique os logs da Vercel.`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `A API não retornou JSON válido. Status ${response.status}. Verifique os logs da Vercel.`
    );
  }
}

function parseTakeoutHtml(content: string): ImportEntry[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(content, "text/html");
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='watch?v=']"));
  const entries: ImportEntry[] = [];

  for (const link of links) {
    const youtubeVideoId = extractVideoId(link.href);
    if (!youtubeVideoId) {
      continue;
    }

    const container = link.closest(".content-cell") ?? link.parentElement;
    const text = container?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const watchedAt = extractDateFromText(text);

    if (!watchedAt) {
      continue;
    }

    entries.push({
      youtubeVideoId,
      title: cleanTakeoutTitle(link.textContent ?? ""),
      channelTitle: "Canal desconhecido",
      watchedAt
    });
  }

  return entries;
}

function extractVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    return url.searchParams.get("v");
  } catch {
    const match = value.match(/[?&]v=([^&]+)/);
    return match?.[1] ?? null;
  }
}

function extractDateFromText(value: string): string | null {
  const isoMatch = value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const portugueseDate = value.match(
    /(\d{1,2}) de ([a-zç]{3})\.? de (\d{4}), (\d{2}):(\d{2})(?::(\d{2}))? ACT/i
  );
  if (portugueseDate) {
    const [, day, monthName, year, hour, minute, second = "0"] = portugueseDate;
    const month = portugueseMonths[normalizeMonth(monthName)];

    if (month !== undefined) {
      const utcMilliseconds = Date.UTC(
        Number(year),
        month,
        Number(day),
        Number(hour) + 5,
        Number(minute),
        Number(second)
      );

      return new Date(utcMilliseconds).toISOString();
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

function normalizeMonth(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanTakeoutTitle(value: string): string {
  return value
    .replace(/^Watched\s+/i, "")
    .replace(/^Assistiu\s+/i, "")
    .replace(/^Você assistiu\s+/i, "")
    .trim();
}

function chunkEntries(entries: ImportEntry[], size: number): ImportEntry[][] {
  const chunks: ImportEntry[][] = [];

  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }

  return chunks;
}
