import { Song } from '../types';
import { formatDurationFromSeconds } from '../utils/audio';

type UnknownRecord = Record<string, unknown>;

type InvidiousPlaylistResponse = {
  title?: string;
  videoCount?: number;
  videos?: unknown[];
};

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

const youtubeArtwork = [
  'linear-gradient(145deg, #5b667e 0%, #202739 100%)',
  'linear-gradient(145deg, #7f6a77 0%, #2d2330 100%)',
  'linear-gradient(145deg, #65738c 0%, #1b2233 100%)',
  'linear-gradient(145deg, #75695d 0%, #2c2722 100%)',
];

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
    .map((item) => asString(item.url))
    .find((value) => value.length > 0);

  return directThumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function normalizeImportedSong(
  item: unknown,
  index: number,
  playlistId: string,
  playlistTitle: string,
): Song | null {
  const record = asRecord(item);
  const videoId = asString(record.videoId ?? record.url?.toString().split('/').pop());

  if (!videoId) {
    return null;
  }

  const durationInSeconds = asNumber(
    record.lengthSeconds ?? record.duration ?? record.durationSeconds ?? record.length,
  );
  const placeholderCover = youtubeArtwork[index % youtubeArtwork.length];
  const thumbnail = getThumbnailUrl(record, videoId);

  return {
    album: playlistTitle || 'Importado desde YouTube',
    artist: asString(record.author ?? record.uploaderName ?? record.artist) || 'Canal de YouTube',
    audioUrl: videoId,
    backendCoverUrl: thumbnail,
    cover: thumbnail || placeholderCover,
    duration: durationInSeconds ? formatDurationFromSeconds(durationInSeconds) : '--:--',
    id: `yt:${playlistId}:${videoId}`,
    placeholderCover,
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
        return songs;
      }
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error('No playlist data available');
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

export async function importYouTubePlaylist(input: string): Promise<Song[]> {
  const playlistId = parsePlaylistId(input);

  if (!playlistId) {
    throw new Error('Invalid playlist id');
  }

  try {
    return await fetchInvidiousPlaylist(playlistId);
  } catch {
    return fetchPipedPlaylist(playlistId);
  }
}

export async function resolveYouTubeAudioStream(videoId: string): Promise<string> {
  try {
    return await fetchInvidiousAudio(videoId);
  } catch {
    return fetchPipedAudio(videoId);
  }
}
