import { Song, SongPresentationState } from '../types';

export function getSongIdKey(songId: Song['id']): string {
  return String(songId);
}

function normalizeCoverUrl(value: string | undefined): string {
  const trimmedValue = value?.trim() || '';

  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.startsWith('//')) {
    return `https:${trimmedValue}`;
  }

  if (trimmedValue.startsWith('/')) {
    return `https://www.youtube.com${trimmedValue}`;
  }

  return trimmedValue;
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createSongFallbackCover(song: Pick<Song, 'album' | 'artist' | 'id' | 'sourceType' | 'title'>): string {
  const seed = `${song.sourceType ?? 'discora'}:${song.id}:${song.title}:${song.artist}:${song.album}`;
  const hash = hashString(seed);
  const hue = hash % 360;
  const accentHue = (hue + 26) % 360;
  const shadowHue = (hue + 320) % 360;

  return `linear-gradient(145deg, hsla(${hue} 26% ${clamp(44 + (hash % 8), 42, 52)}% / 1) 0%, hsla(${accentHue} 24% ${clamp(22 + (hash % 6), 22, 28)}% / 1) 52%, hsla(${shadowHue} 30% 12% / 1) 100%)`;
}

function isUsableRemoteCover(value: string | undefined): boolean {
  const trimmedValue = normalizeCoverUrl(value);

  if (!trimmedValue) {
    return false;
  }

  return (
    trimmedValue.startsWith('http://') ||
    trimmedValue.startsWith('https://') ||
    trimmedValue.startsWith('data:image/') ||
    trimmedValue.startsWith('linear-gradient') ||
    trimmedValue.startsWith('radial-gradient') ||
    trimmedValue.startsWith('conic-gradient')
  );
}

export function getResolvedSongCover(song: Song, state: SongPresentationState): string {
  const songId = getSongIdKey(song.id);
  const normalizedCover =
    state.manualCoverBySongId[songId] ||
    state.embeddedCoverBySongId[songId] ||
    (isUsableRemoteCover(song.backendCoverUrl) ? normalizeCoverUrl(song.backendCoverUrl) : '') ||
    (isUsableRemoteCover(song.cover) ? normalizeCoverUrl(song.cover) : '') ||
    (isUsableRemoteCover(song.placeholderCover) ? normalizeCoverUrl(song.placeholderCover) : '');

  return normalizedCover || createSongFallbackCover(song);
}

export function decorateSong(song: Song, state: SongPresentationState): Song {
  const songId = getSongIdKey(song.id);
  const resolvedCover = getResolvedSongCover(song, state);

  return {
    ...song,
    cover: resolvedCover,
    isFavorite: state.favoriteSongIds.includes(songId),
    placeholderCover: song.placeholderCover || createSongFallbackCover(song),
  };
}

export function decorateSongs(songs: Song[], state: SongPresentationState): Song[] {
  return songs.map((song) => decorateSong(song, state));
}

export function getCoverSurfaceStyle(cover: string | undefined): Record<string, string> {
  const fallback = 'linear-gradient(145deg, #52627d 0%, #202739 100%)';
  const resolvedCover = cover?.trim() || fallback;

  if (
    resolvedCover.startsWith('linear-gradient') ||
    resolvedCover.startsWith('radial-gradient') ||
    resolvedCover.startsWith('conic-gradient')
  ) {
    return {
      background: resolvedCover,
    };
  }

  return {
    backgroundColor: 'transparent',
    backgroundImage: `url("${resolvedCover}")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  };
}
