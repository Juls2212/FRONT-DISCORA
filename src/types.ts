export type Song = {
  id: number | string;
  title: string;
  artist: string;
  album: string;
  audioUrl: string;
  backendCoverUrl?: string;
  duration: string;
  cover: string;
  placeholderCover: string;
  isFavorite?: boolean;
  sourceType?: 'backend' | 'youtube';
  youtubePlaylistId?: string;
  youtubeVideoId?: string;
};

export type PlaylistSourceType = 'backend' | 'youtube';

export type Playlist = {
  id: number | string;
  name: string;
  songCount: number;
  artwork: string;
  detail: string;
  coverUrl?: string;
  sourceLabel?: string;
  sourceType?: PlaylistSourceType;
  youtubePlaylistId?: string;
};

export type PlaylistSongNode = {
  nodeId: number | string;
  songId: number | string;
};

export type PlaylistSongEntry = {
  nextNodeId: number | string | null;
  nodeId: number | string;
  prevNodeId: number | string | null;
  song: Song;
};

export type PlaylistDetail = Playlist & {
  currentNodeId: number | string | null;
  songs: PlaylistSongEntry[];
};

export type FrontendPlaylistOverride = {
  currentNodeId: number | string | null;
  playlistId: number | string;
  songs: PlaylistSongEntry[];
};

export type PlaybackContext =
  | {
      type: 'library';
    }
  | {
      playlistId: number | string;
      playlistName: string;
      type: 'playlist';
    };

export type EqualizerState = {
  bass: number;
  mid: number;
  treble: number;
};

export type MixerState = {
  crossfader: number;
  filter: number;
  gain: number;
};

export type DeckState = {
  cuePoint: number | null;
  loopEnabled: boolean;
  loopInPoint: number | null;
  loopOutPoint: number | null;
  slipMode: boolean;
  vinylMode: boolean;
};

export type SongPresentationState = {
  embeddedCoverBySongId: Record<string, string>;
  favoriteSongIds: string[];
  manualCoverBySongId: Record<string, string>;
};
