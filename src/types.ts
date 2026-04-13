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
