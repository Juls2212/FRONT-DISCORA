import { Playlist, Song } from './types';

export const playlists: Playlist[] = [
  {
    id: 1,
    name: 'Órbita de medianoche',
    songCount: 18,
    artwork: 'linear-gradient(145deg, #5c6b8a 0%, #1d2333 52%, #0a0f18 100%)',
    detail: 'Capas suaves para escuchar sin prisa.',
  },
  {
    id: 2,
    name: 'Cámara lenta',
    songCount: 12,
    artwork: 'linear-gradient(145deg, #81616c 0%, #33242f 50%, #11131a 100%)',
    detail: 'Texturas íntimas y pulsos nocturnos.',
  },
  {
    id: 3,
    name: 'Surco azul',
    songCount: 24,
    artwork: 'linear-gradient(145deg, #64748b 0%, #243247 48%, #090d14 100%)',
    detail: 'Selección editorial con brillo analógico.',
  },
  {
    id: 4,
    name: 'Sala de escucha',
    songCount: 9,
    artwork: 'linear-gradient(145deg, #6f665b 0%, #2f2a26 48%, #0d1016 100%)',
    detail: 'Sesiones serenas para bajar el ritmo.',
  },
];

export const recentSongs: Song[] = [
  {
    id: 1,
    title: 'Línea de humo',
    artist: 'Valeria Norte',
    album: 'Edición lunar',
    duration: '3:18',
    cover: 'linear-gradient(145deg, #52627d 0%, #202739 100%)',
  },
  {
    id: 2,
    title: 'Cristal lento',
    artist: 'Costa Clara',
    album: 'Marea privada',
    duration: '4:02',
    cover: 'linear-gradient(145deg, #7f6a77 0%, #2d2330 100%)',
  },
  {
    id: 3,
    title: 'Habitación azul',
    artist: 'Atlas Lunar',
    album: 'Satélite',
    duration: '3:45',
    cover: 'linear-gradient(145deg, #65738c 0%, #1b2233 100%)',
  },
  {
    id: 4,
    title: 'Señal de fondo',
    artist: 'Distrito 9',
    album: 'Kilómetro cero',
    duration: '2:59',
    cover: 'linear-gradient(145deg, #75695d 0%, #2c2722 100%)',
  },
];

export const featuredMoment = {
  eyebrow: 'Selección curada',
  title: 'Una sala creada para escuchar con calma',
  description:
    'Discora reúne playlists y canciones recientes en una atmósfera profunda, sobria y pensada para descubrir música con intención.',
  note: 'Edición nocturna · 26 pistas',
  artwork: 'linear-gradient(145deg, rgba(101, 115, 145, 0.95) 0%, rgba(29, 36, 54, 0.92) 52%, rgba(10, 12, 18, 0.98) 100%)',
};

export const playerTrack = {
  title: 'Cinta de humo',
  artist: 'Valeria Norte',
  album: 'Edición lunar',
  cover: 'linear-gradient(145deg, #5c6b8a 0%, #202739 100%)',
};

export const sidebarPlaylists = [
  'Noches en vinilo',
  'Colección privada',
  'Sesiones suaves',
  'Pulso editorial',
];
