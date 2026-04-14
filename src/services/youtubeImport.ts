import { PlaylistDetail, PlaylistSongEntry, Song } from '../types';
import { formatDurationFromSeconds } from '../utils/audio';
import { createSongFallbackCover } from '../utils/songPresentation';

type UnknownRecord = Record<string, unknown>;

type InvidiousPlaylistResponse = {
  title?: string;
  videoCount?: number;
  videos?: unknown[];
};

export type ImportedYouTubePlaylist = {
  playlist: PlaylistDetail;
  songs: Song[];
};

export type ImportedYouTubePlaylistResult = ImportedYouTubePlaylist & {
  isNewPlaylist: boolean;
  provider: 'invidious' | 'piped';
};

export class YouTubeImportError extends Error {
  code:
    | 'empty'
    | 'invalid_url'
    | 'playlist_empty'
    | 'playlist_private'
    | 'providers_unavailable';

  constructor(
    code:
      | 'empty'
      | 'invalid_url'
      | 'playlist_empty'
      | 'playlist_private'
      | 'providers_unavailable',
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

const invidiousInstances = [
  'https://invidious.fdn.fr',
  'https://inv.nadeko.net',
  'https://yewtu.be',
];

const pipedInstances = [
  'https://piped.video',
  'https://piped.adminforge.de',
];

const REQUEST_TIMEOUT_MS = 8000;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractYouTubeVideoId(value: unknown): string | null {
  const rawValue = asString(value);

  if (!rawValue) {
    return null;
  }

  if (/^[\w-]{6,}$/i.test(rawValue) && !rawValue.includes('/')) {
    return rawValue;
  }

  const normalizedValue = rawValue.startsWith('/') ? `https://www.youtube.com${rawValue}` : rawValue;

  try {
    const url = new URL(normalizedValue);
    const videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || '';
    return videoId.trim() || null;
  } catch {
    const watchMatch = rawValue.match(/[?&]v=([\w-]{6,})/i);

    if (watchMatch) {
      return watchMatch[1];
    }

    const pathMatch = rawValue.match(/\/([\w-]{6,})(?:[/?&#]|$)/);
    return pathMatch?.[1] ?? null;
  }
}

function parsePlaylistId(input: string): string | null {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return null;
  }

  if (/^[\w-]{10,}$/i.test(trimmedInput)) {
    return trimmedInput;
  }

  try {
    const url = new URL(trimmedInput);
    const host = url.hostname.toLowerCase();

    if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      return url.searchParams.get('list');
    }

    return url.searchParams.get('list');
  } catch {
    return null;
  }
}

async function requestJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new YouTubeImportError('playlist_private', 'Playlist is private or unavailable');
      }

      if (response.status === 404) {
        throw new YouTubeImportError('playlist_empty', 'Playlist not found or empty');
      }

      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getThumbnailUrl(record: UnknownRecord, videoId: string): string {
  const thumbnails = asArray<UnknownRecord>(record.videoThumbnails ?? record.thumbnail ?? record.thumbnails);
  const directThumbnail = thumbnails
    .map((item) => {
      const rawUrl = asString(item.url);
      const width = asNumber(item.width) ?? 0;
      const height = asNumber(item.height) ?? 0;
      const quality = asString(item.quality ?? item.qualityLabel);

      if (!rawUrl) {
        return null;
      }

      if (rawUrl.startsWith('//')) {
        return {
          height,
          quality,
          url: `https:${rawUrl}`,
          width,
        };
      }

      if (rawUrl.startsWith('/')) {
        return {
          height,
          quality,
          url: `https://www.youtube.com${rawUrl}`,
          width,
        };
      }

      return {
        height,
        quality,
        url: rawUrl,
        width,
      };
    })
    .filter(
      (
        item,
      ): item is {
        height: number;
        quality: string;
        url: string;
        width: number;
      } => item !== null && /^https?:\/\//i.test(item.url),
    )
    .sort((left, right) => {
      const leftScore = left.width * left.height + (left.quality.toLowerCase().includes('max') ? 100000 : 0);
      const rightScore = right.width * right.height + (right.quality.toLowerCase().includes('max') ? 100000 : 0);
      return rightScore - leftScore;
    })
    .find((item) => item.url.length > 0)?.url;

  return directThumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function normalizeImportedSong(
  item: unknown,
  index: number,
  playlistId: string,
  playlistTitle: string,
): Song | null {
  const record = asRecord(item);
  const videoId =
    extractYouTubeVideoId(record.videoId) ??
    extractYouTubeVideoId(record.id) ??
    extractYouTubeVideoId(record.url) ??
    extractYouTubeVideoId(record.videoUrl);

  if (!videoId) {
    console.debug('Discora YouTube import skipped item without valid video id', {
      index,
      item,
      playlistId,
    });
    return null;
  }

  const durationInSeconds = asNumber(
    record.lengthSeconds ?? record.duration ?? record.durationSeconds ?? record.length,
  );
  const thumbnail = getThumbnailUrl(record, videoId);
  const fallbackCover = createSongFallbackCover({
    album: playlistTitle || 'Importado desde YouTube',
    artist: asString(record.author ?? record.uploaderName ?? record.artist) || 'Canal de YouTube',
    id: `yt:${playlistId}:${videoId}`,
    sourceType: 'youtube',
    title: asString(record.title) || `Video ${index + 1}`,
  });
  const resolvedThumbnail = /^https?:\/\//i.test(thumbnail) ? thumbnail : '';

  return {
    album: playlistTitle || 'Importado desde YouTube',
    artist: asString(record.author ?? record.uploaderName ?? record.artist) || 'Canal de YouTube',
    audioUrl: videoId,
    backendCoverUrl: resolvedThumbnail || undefined,
    cover: resolvedThumbnail || fallbackCover,
    duration: durationInSeconds ? formatDurationFromSeconds(durationInSeconds) : '--:--',
    id: `yt:${playlistId}:${videoId}`,
    placeholderCover: fallbackCover,
    sourceType: 'youtube',
    title: asString(record.title) || `Video ${index + 1}`,
    youtubePlaylistId: playlistId,
    youtubeVideoId: videoId,
  };
}

async function fetchInvidiousPlaylist(playlistId: string): Promise<Song[]> {
  let lastError: Error | null = null;

  for (const instance of invidiousInstances) {
    try {
      const collectedSongs: Song[] = [];
      let page = 1;
      let expectedVideos = Number.POSITIVE_INFINITY;
      let playlistTitle = 'Importado desde YouTube';

      while (page <= 20 && collectedSongs.length < expectedVideos) {
        const url = `${instance}/api/v1/playlists/${playlistId}?page=${page}`;
        const payload = await requestJson<InvidiousPlaylistResponse>(url);
        const playlistVideos = asArray<unknown>(payload.videos);

        if (!playlistVideos.length) {
          break;
        }

        playlistTitle = asString(payload.title) || playlistTitle;
        expectedVideos = payload.videoCount ?? playlistVideos.length;

        playlistVideos.forEach((video, index) => {
          const normalizedSong = normalizeImportedSong(
            video,
            collectedSongs.length + index,
            playlistId,
            playlistTitle,
          );

          if (normalizedSong) {
            collectedSongs.push(normalizedSong);
          }
        });

        if (playlistVideos.length < 100) {
          break;
        }

        page += 1;
      }

      if (collectedSongs.length) {
        console.debug('Discora YouTube playlist normalized from Invidious', {
          playlistId,
          songCount: collectedSongs.length,
        });
        return collectedSongs;
      }
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error('No playlist data available');
}

async function fetchPipedPlaylist(playlistId: string): Promise<Song[]> {
  let lastError: Error | null = null;

  for (const instance of pipedInstances) {
    try {
      const payload = await requestJson<UnknownRecord>(`${instance}/playlists/${playlistId}`);
      const playlistTitle = asString(payload.name) || 'Importado desde YouTube';
      const relatedStreams = asArray<unknown>(payload.relatedStreams);
      const songs = relatedStreams
        .map((item, index) => normalizeImportedSong(item, index, playlistId, playlistTitle))
        .filter((song): song is Song => Boolean(song));

      if (songs.length) {
        console.debug('Discora YouTube playlist normalized from Piped', {
          playlistId,
          songCount: songs.length,
        });
        return songs;
      }
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error('No playlist data available');
}

function buildPlaylistArtwork(songs: Song[], playlistId: string): string {
  const thumbnail = songs.find((song) => song.backendCoverUrl)?.backendCoverUrl;

  if (thumbnail) {
    return `linear-gradient(145deg, rgba(13, 18, 28, 0.14), rgba(13, 18, 28, 0.48)), url("${thumbnail}") center/cover no-repeat`;
  }

  return createSongFallbackCover({
    album: 'Playlist de YouTube',
    artist: 'Discora',
    id: `ytpl:${playlistId}`,
    sourceType: 'youtube',
    title: `Playlist ${playlistId}`,
  });
}

function buildPlaylistSongs(songs: Song[], playlistId: string): PlaylistSongEntry[] {
  return songs.map((song, index) => ({
    nextNodeId: index < songs.length - 1 ? `yt-node:${playlistId}:${index + 1}` : null,
    nodeId: `yt-node:${playlistId}:${index}`,
    prevNodeId: index > 0 ? `yt-node:${playlistId}:${index - 1}` : null,
    song,
  }));
}

function buildImportedPlaylist(playlistId: string, songs: Song[]): ImportedYouTubePlaylist {
  const playlistTitle = songs[0]?.album || 'Importado desde YouTube';
  const playlistSongs = buildPlaylistSongs(songs, playlistId);
  const coverUrl = songs.find((song) => song.backendCoverUrl)?.backendCoverUrl;

  return {
    playlist: {
      artwork: buildPlaylistArtwork(songs, playlistId),
      coverUrl,
      currentNodeId: null,
      detail: 'Playlist importada desde YouTube para escucharla dentro de Discora.',
      id: `ytpl:${playlistId}`,
      name: playlistTitle,
      songCount: songs.length,
      songs: playlistSongs,
      sourceLabel: 'YouTube',
      sourceType: 'youtube',
      youtubePlaylistId: playlistId,
    },
    songs,
  };
}

function getBestAudioStream(record: UnknownRecord): string | null {
  const candidates = asArray<UnknownRecord>(
    record.audioStreams ?? record.adaptiveFormats ?? record.formatStreams,
  )
    .map((item) => ({
      bitrate:
        asNumber(item.bitrate ?? item.averageBitrate ?? item.audioQuality) ??
        0,
      type: asString(item.type ?? item.mimeType ?? item.codec),
      url: asString(item.url),
    }))
    .filter((item) => item.url && (!item.type || item.type.toLowerCase().includes('audio')))
    .sort((left, right) => right.bitrate - left.bitrate);

  return candidates[0]?.url ?? null;
}

async function fetchInvidiousAudio(videoId: string): Promise<string> {
  let lastError: Error | null = null;

  for (const instance of invidiousInstances) {
    try {
      const payload = await requestJson<UnknownRecord>(`${instance}/api/v1/videos/${videoId}`);
      const streamUrl = getBestAudioStream(payload);

      if (streamUrl) {
        return streamUrl;
      }
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error('No audio stream available');
}

async function fetchPipedAudio(videoId: string): Promise<string> {
  let lastError: Error | null = null;

  for (const instance of pipedInstances) {
    try {
      const payload = await requestJson<UnknownRecord>(`${instance}/streams/${videoId}`);
      const streamUrl = getBestAudioStream(payload);

      if (streamUrl) {
        return streamUrl;
      }
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error('No audio stream available');
}

export async function importYouTubePlaylist(input: string): Promise<ImportedYouTubePlaylistResult> {
  const playlistId = parsePlaylistId(input);

  if (!input.trim()) {
    throw new YouTubeImportError('empty', 'Missing playlist input');
  }

  if (!playlistId) {
    throw new YouTubeImportError('invalid_url', 'Invalid playlist id');
  }

  try {
    const songs = await fetchInvidiousPlaylist(playlistId);
    if (!songs.length) {
      throw new YouTubeImportError('playlist_empty', 'Playlist returned no songs');
    }

    return {
      ...buildImportedPlaylist(playlistId, songs),
      isNewPlaylist: true,
      provider: 'invidious',
    };
  } catch (error) {
    if (error instanceof YouTubeImportError && (error.code === 'empty' || error.code === 'invalid_url')) {
      throw error;
    }

    const songs = await fetchPipedPlaylist(playlistId);
    if (!songs.length) {
      throw new YouTubeImportError('playlist_empty', 'Playlist returned no songs');
    }

    return {
      ...buildImportedPlaylist(playlistId, songs),
      isNewPlaylist: true,
      provider: 'piped',
    };
  }
}

export function getYouTubeImportFeedbackMessage(error: unknown): string {
  if (error instanceof YouTubeImportError) {
    if (error.code === 'empty' || error.code === 'invalid_url') {
      return 'Pega una URL valida de playlist o un ID publico de YouTube.';
    }

    if (error.code === 'playlist_private') {
      return 'La playlist parece privada o no esta disponible para importacion publica.';
    }

    if (error.code === 'playlist_empty') {
      return 'La playlist no tiene videos importables o no devolvio resultados.';
    }
  }

  return 'Las instancias publicas de YouTube no estan disponibles en este momento.';
}

export async function resolveYouTubeAudioStream(videoId: string): Promise<string> {
  try {
    return await fetchInvidiousAudio(videoId);
  } catch {
    return fetchPipedAudio(videoId);
  }
}
