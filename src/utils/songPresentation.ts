import { Song, SongPresentationState } from '../types';

export function getSongIdKey(songId: Song['id']): string {
  return String(songId);
}

export function getResolvedSongCover(song: Song, state: SongPresentationState): string {
  const songId = getSongIdKey(song.id);

  return (
    state.manualCoverBySongId[songId] ||
    state.embeddedCoverBySongId[songId] ||
    song.backendCoverUrl ||
    song.cover ||
    song.placeholderCover
  );
}

export function decorateSong(song: Song, state: SongPresentationState): Song {
  const songId = getSongIdKey(song.id);

  return {
    ...song,
    cover: getResolvedSongCover(song, state),
    isFavorite: state.favoriteSongIds.includes(songId),
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
