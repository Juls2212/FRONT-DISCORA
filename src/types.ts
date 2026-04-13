export type Song = {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  cover: string;
};

export type Playlist = {
  id: number;
  name: string;
  songCount: number;
  artwork: string;
  detail: string;
};

export type PlaylistSongNode = {
  nodeId: number;
  songId: number;
};
