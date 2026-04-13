export type Song = {
  id: number | string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  cover: string;
};

export type Playlist = {
  id: number | string;
  name: string;
  songCount: number;
  artwork: string;
  detail: string;
};

export type PlaylistSongNode = {
  nodeId: number | string;
  songId: number | string;
};
