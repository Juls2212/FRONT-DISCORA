import { Playlist, Song } from './types';

export const playlists: Playlist[] = [
  {
    id: 1,
    name: 'Radar nocturno',
    description: 'Electrónica suave para cerrar el día.',
    accent: 'linear-gradient(135deg, #2d6a4f 0%, #081c15 100%)',
  },
  {
    id: 2,
    name: 'Pulso urbano',
    description: 'Ritmos modernos para mantener el enfoque.',
    accent: 'linear-gradient(135deg, #f77f00 0%, #6a040f 100%)',
  },
  {
    id: 3,
    name: 'Brisa indie',
    description: 'Guitarras ligeras y voces cercanas.',
    accent: 'linear-gradient(135deg, #4d908e 0%, #1d3557 100%)',
  },
];

export const songs: Song[] = [
  {
    id: 1,
    title: 'Luces de ciudad',
    artist: 'Valeria Norte',
    album: 'Horizonte',
    duration: '3:18',
    cover: 'linear-gradient(135deg, #ff7b00 0%, #ffb703 100%)',
  },
  {
    id: 2,
    title: 'Olas lentas',
    artist: 'Costa Clara',
    album: 'Mar abierto',
    duration: '4:02',
    cover: 'linear-gradient(135deg, #219ebc 0%, #023047 100%)',
  },
  {
    id: 3,
    title: 'Medianoche azul',
    artist: 'Atlas Lunar',
    album: 'Satélite',
    duration: '3:45',
    cover: 'linear-gradient(135deg, #8338ec 0%, #3a0ca3 100%)',
  },
  {
    id: 4,
    title: 'Ruta central',
    artist: 'Distrito 9',
    album: 'Kilómetro cero',
    duration: '2:59',
    cover: 'linear-gradient(135deg, #52b788 0%, #081c15 100%)',
  },
];
