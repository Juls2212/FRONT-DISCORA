import { Playlist, PlaylistSongNode, Song } from '../types';
import { request } from './http';

type UnknownRecord = Record<string, unknown>;

const playlistArtwork = [
  'linear-gradient(145deg, #5c6b8a 0%, #1d2333 52%, #0a0f18 100%)',
  'linear-gradient(145deg, #81616c 0%, #33242f 50%, #11131a 100%)',
  'linear-gradient(145deg, #64748b 0%, #243247 48%, #090d14 100%)',
  'linear-gradient(145deg, #6f665b 0%, #2f2a26 48%, #0d1016 100%)',
];

const songArtwork = [
  'linear-gradient(145deg, #52627d 0%, #202739 100%)',
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

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function normalizeSong(item: unknown, index: number): Song {
  const record = asRecord(item);

  return {
    album: asString(record.album ?? record.playlist, 'Sin album'),
    artist: asString(record.artist ?? record.author, 'Artista sin nombre'),
    cover: songArtwork[index % songArtwork.length],
    duration: asString(record.duration ?? record.length, '--:--'),
    id: asNumber(record.id, index + 1),
    title: asString(record.title ?? record.name, `Cancion ${index + 1}`),
  };
}

function normalizePlaylist(item: unknown, index: number): Playlist {
  const record = asRecord(item);
  const songs = asArray<unknown>(record.songs ?? record.items);

  return {
    artwork: playlistArtwork[index % playlistArtwork.length],
    detail: asString(record.description, 'Seleccion creada desde la coleccion de Discora.'),
    id: asNumber(record.id, index + 1),
    name: asString(record.name ?? record.title, `Playlist ${index + 1}`),
    songCount: asNumber(record.songCount ?? songs.length, songs.length),
  };
}

function normalizePlaylistSongNode(item: unknown): PlaylistSongNode {
  const record = asRecord(item);

  return {
    nodeId: asNumber(record.nodeId ?? record.id, 0),
    songId: asNumber(record.songId ?? record.song_id, 0),
  };
}

export async function getSongs(): Promise<Song[]> {
  const response = await request<unknown>('/songs');
  return asArray<unknown>(response).map(normalizeSong);
}

export async function searchSongs(query: string): Promise<Song[]> {
  const params = new URLSearchParams({ q: query });
  const response = await request<unknown>(`/songs/search?${params.toString()}`);
  return asArray<unknown>(response).map(normalizeSong);
}

export async function getPlaylists(): Promise<Playlist[]> {
  const response = await request<unknown>('/playlists');
  return asArray<unknown>(response).map(normalizePlaylist);
}

export async function createPlaylist(payload: { description?: string; name: string }): Promise<Playlist> {
  const response = await request<unknown>('/playlists', {
    body: payload,
    method: 'POST',
  });

  return normalizePlaylist(response, 0);
}

export async function getPlaylistById(id: number): Promise<Playlist> {
  const response = await request<unknown>(`/playlists/${id}`);
  return normalizePlaylist(response, 0);
}

export async function addSongToPlaylist(
  playlistId: number,
  payload: { songId: number },
): Promise<PlaylistSongNode> {
  const response = await request<unknown>(`/playlists/${playlistId}/songs`, {
    body: payload,
    method: 'POST',
  });

  return normalizePlaylistSongNode(response);
}

export async function removeSongFromPlaylist(playlistId: number, nodeId: number): Promise<void> {
  await request<void>(`/playlists/${playlistId}/songs/${nodeId}`, {
    method: 'DELETE',
  });
}

export async function deleteSong(songId: number): Promise<void> {
  await request<void>(`/songs/${songId}`, {
    method: 'DELETE',
  });
}
