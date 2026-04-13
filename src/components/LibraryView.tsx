import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { deleteSong, getSongs, searchSongs, uploadSong } from '../services/discoraApi';
import { Song } from '../types';
import { SectionContainer } from './SectionContainer';
import { StateMessage } from './StateMessage';

type LibraryViewProps = {
  onSelectTrack: (song: Song) => void;
  onSongsReload: (songs: Song[]) => void;
};

export function LibraryView({ onSelectTrack, onSongsReload }: LibraryViewProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<Song['id'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSongs = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextSongs = searchTerm.trim() ? await searchSongs(searchTerm.trim()) : await getSongs();
      setSongs(nextSongs);
      onSongsReload(nextSongs);
    } catch {
      setError('No se pudo cargar la biblioteca.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSongs();
  }, [searchTerm]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await uploadSong(file);
      await loadSongs();
    } catch {
      setError('No se pudo subir el archivo seleccionado.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteSong = async (songId: Song['id']) => {
    setDeletingId(songId);
    setError(null);

    try {
      await deleteSong(songId);
      await loadSongs();
    } catch {
      setError('No se pudo eliminar la cancion.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="main-content">
      <section className="hero-card library-hero">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="hero-copy-block">
          <p className="eyebrow">Biblioteca</p>
          <h1>Tu coleccion sonora</h1>
          <p className="hero-copy">
            Busca canciones, importa archivos MP3 y administra tu biblioteca desde un solo lugar.
          </p>
        </div>
        <div className="library-actions">
          <label className="library-search">
            <span>Buscar en la biblioteca</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por titulo o artista"
            />
          </label>
          <button
            className="library-primary-button"
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? 'Subiendo audio...' : 'Importar MP3'}
          </button>
          <input
            ref={fileInputRef}
            className="library-file-input"
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleFileChange}
          />
        </div>
      </section>

      <SectionContainer title="Todas las canciones" subtitle={`${songs.length} resultados`}>
        {loading ? (
          <StateMessage
            title="Cargando biblioteca"
            description="Discora esta reuniendo todas las canciones disponibles."
          />
        ) : null}
        {!loading && error ? <StateMessage title="No fue posible cargar la biblioteca" description={error} /> : null}
        {!loading && !error && songs.length === 0 ? (
          <StateMessage
            title="No se encontraron canciones"
            description="Prueba otra busqueda o importa un archivo MP3 para comenzar."
          />
        ) : null}
        {!loading && !error && songs.length > 0 ? (
          <div className="library-song-list">
            {songs.map((song) => (
              <article key={song.id} className="library-song-row">
                <button className="library-song-meta" type="button" onClick={() => onSelectTrack(song)}>
                  <div className="library-song-cover" style={{ background: song.cover }} />
                  <div>
                    <h3>{song.title}</h3>
                    <p>
                      {song.artist} · {song.album}
                    </p>
                  </div>
                </button>
                <div className="library-song-actions">
                  <span>{song.duration}</span>
                  <button className="library-secondary-button" type="button" onClick={() => onSelectTrack(song)}>
                    Seleccionar
                  </button>
                  <button
                    className="library-danger-button"
                    type="button"
                    onClick={() => handleDeleteSong(song.id)}
                    disabled={deletingId === song.id}
                  >
                    {deletingId === song.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </SectionContainer>
    </main>
  );
}
