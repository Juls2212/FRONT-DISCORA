import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FavoriteButton } from './FavoriteButton';
import { deleteSong, getSongs, searchSongs, uploadSong } from '../services/discoraApi';
import { PlaybackContext, Song, SongPresentationState } from '../types';
import { extractEmbeddedCover, readImageFileAsDataUrl } from '../utils/mp3Metadata';
import { decorateSongs } from '../utils/songPresentation';
import { needsDurationResolution, resolveSongDuration } from '../utils/audio';
import { SectionContainer } from './SectionContainer';
import { StateMessage } from './StateMessage';

type LibraryViewProps = SongPresentationState & {
  onAssignEmbeddedCover: (songId: Song['id'], coverDataUrl: string) => void;
  onAssignManualCover: (songId: Song['id'], coverDataUrl: string) => void;
  onPlayTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  onSongsReload: (songs: Song[]) => void;
  onToggleFavorite: (songId: Song['id']) => void;
};

type UploadStatus = 'error' | 'idle' | 'success' | 'uploading';

export function LibraryView({
  embeddedCoverBySongId,
  favoriteSongIds,
  manualCoverBySongId,
  onAssignEmbeddedCover,
  onAssignManualCover,
  onPlayTrack,
  onSongsReload,
  onToggleFavorite,
}: LibraryViewProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedEmbeddedCover, setSelectedEmbeddedCover] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadMessage, setUploadMessage] = useState('Selecciona un archivo MP3 para importarlo a tu biblioteca.');
  const [deletingId, setDeletingId] = useState<Song['id'] | null>(null);
  const [coverTargetSongId, setCoverTargetSongId] = useState<Song['id'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const presentationState: SongPresentationState = useMemo(
    () => ({
      embeddedCoverBySongId,
      favoriteSongIds,
      manualCoverBySongId,
    }),
    [embeddedCoverBySongId, favoriteSongIds, manualCoverBySongId],
  );

  const displayedSongs = useMemo(() => decorateSongs(songs, presentationState), [presentationState, songs]);

  const loadSongs = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextSongs = searchTerm.trim() ? await searchSongs(searchTerm.trim()) : await getSongs();
      setSongs(nextSongs);
      onSongsReload(nextSongs);
      return nextSongs;
    } catch {
      setError('No se pudo cargar la biblioteca.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSongs();
  }, [searchTerm]);

  useEffect(() => {
    const songsToResolve = songs.filter((song) => song.audioUrl && needsDurationResolution(song));

    if (!songsToResolve.length) {
      return;
    }

    let active = true;

    void Promise.allSettled(
      songsToResolve.map(async (song) => ({
        duration: await resolveSongDuration(song),
        id: song.id,
      })),
    ).then((results) => {
      if (!active) {
        return;
      }

      const resolvedDurations = new Map(
        results
          .filter(
            (result): result is PromiseFulfilledResult<{ duration: string; id: Song['id'] }> =>
              result.status === 'fulfilled',
          )
          .map((result) => [result.value.id, result.value.duration]),
      );

      if (!resolvedDurations.size) {
        return;
      }

      setSongs((currentSongs) => {
        const nextSongs = currentSongs.map((song) =>
          resolvedDurations.has(song.id)
            ? { ...song, duration: resolvedDurations.get(song.id) ?? song.duration }
            : song,
        );
        onSongsReload(nextSongs);
        return nextSongs;
      });
    });

    return () => {
      active = false;
    };
  }, [songs, onSongsReload]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const embeddedCover = await extractEmbeddedCover(file);
    setSelectedFile(file);
    setSelectedEmbeddedCover(embeddedCover);
    setUploadStatus('idle');
    setUploadMessage(
      embeddedCover
        ? `Archivo listo para importar: ${file.name}. Se detecto portada integrada.`
        : `Archivo listo para importar: ${file.name}`,
    );
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('idle');
      setUploadMessage('Selecciona un archivo MP3 para importarlo a tu biblioteca.');
      return;
    }

    const previousSongIds = new Set(songs.map((song) => String(song.id)));
    setUploadStatus('uploading');
    setUploadMessage(`Importando ${selectedFile.name}...`);

    try {
      await uploadSong({
        file: selectedFile,
      });

      const nextSongs = await loadSongs();
      const importedSong = nextSongs.find((song) => !previousSongIds.has(String(song.id)));

      if (importedSong && selectedEmbeddedCover) {
        onAssignEmbeddedCover(importedSong.id, selectedEmbeddedCover);
      }

      setUploadStatus('success');
      setUploadMessage(`Importacion completada: ${selectedFile.name}`);
      setSelectedFile(null);
      setSelectedEmbeddedCover(null);
    } catch {
      setUploadStatus('error');
      setUploadMessage('No se pudo importar el archivo seleccionado.');
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    setSelectedEmbeddedCover(null);
    setUploadStatus('idle');
    setUploadMessage('Selecciona un archivo MP3 para importarlo a tu biblioteca.');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleCoverSelection = (songId: Song['id']) => {
    setCoverTargetSongId(songId);
    coverInputRef.current?.click();
  };

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || coverTargetSongId === null) {
      return;
    }

    try {
      const coverDataUrl = await readImageFileAsDataUrl(file);
      onAssignManualCover(coverTargetSongId, coverDataUrl);
    } catch {
      setError('No se pudo cargar la portada seleccionada.');
    } finally {
      setCoverTargetSongId(null);

      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
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
          <label className="library-search library-search-wide">
            <span>Buscar en la biblioteca</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por titulo o artista"
            />
          </label>
          <div className="library-import-panel">
            <div className={`library-import-status library-import-status-${uploadStatus}`}>
              <p className="library-import-label">Importador MP3</p>
              <h3>
                {uploadStatus === 'uploading'
                  ? 'Subiendo archivo'
                  : uploadStatus === 'success'
                    ? 'Importacion completada'
                    : uploadStatus === 'error'
                      ? 'No se pudo importar'
                      : selectedFile
                        ? 'Archivo preparado'
                        : 'Listo para importar'}
              </h3>
              <p>{uploadMessage}</p>
            </div>
            {selectedEmbeddedCover ? (
              <div className="library-import-preview">
                <div className="library-import-preview-cover" style={{ backgroundImage: `url(${selectedEmbeddedCover})` }} />
                <span>Portada integrada detectada</span>
              </div>
            ) : null}
            <div className="library-import-actions">
              <button className="library-secondary-button" type="button" onClick={handleUploadClick}>
                Elegir MP3
              </button>
              <button
                className="library-primary-button"
                type="button"
                onClick={handleConfirmUpload}
                disabled={!selectedFile || uploadStatus === 'uploading'}
              >
                {uploadStatus === 'uploading' ? 'Importando...' : 'Confirmar importacion'}
              </button>
              {selectedFile ? (
                <button className="library-secondary-button" type="button" onClick={handleClearSelectedFile}>
                  Quitar archivo
                </button>
              ) : null}
            </div>
          </div>
          <input
            ref={fileInputRef}
            className="library-file-input"
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleFileChange}
          />
          <input
            ref={coverInputRef}
            className="library-file-input"
            type="file"
            accept="image/*"
            onChange={handleCoverFileChange}
          />
        </div>
      </section>

      <SectionContainer title="Todas las canciones" subtitle={`${displayedSongs.length} resultados`}>
        {loading ? (
          <StateMessage
            title="Cargando biblioteca"
            description="Discora esta reuniendo todas las canciones disponibles."
          />
        ) : null}
        {!loading && error ? <StateMessage title="No fue posible cargar la biblioteca" description={error} /> : null}
        {!loading && !error && displayedSongs.length === 0 ? (
          <StateMessage
            title="No se encontraron canciones"
            description="Prueba otra busqueda o importa un archivo MP3 para comenzar."
          />
        ) : null}
        {!loading && !error && displayedSongs.length > 0 ? (
          <div className="library-song-list">
            {displayedSongs.map((song) => (
              <article key={song.id} className="library-song-row">
                <button
                  className="library-song-meta"
                  type="button"
                  onClick={() => onPlayTrack(song, { type: 'library' }, displayedSongs)}
                >
                  <div className="library-song-cover" style={{ background: song.cover }} />
                  <div>
                    <h3>{song.title}</h3>
                    <p>{song.artist} - {song.album}</p>
                  </div>
                </button>
                <div className="library-song-actions">
                  <span>{song.duration}</span>
                  <FavoriteButton isActive={Boolean(song.isFavorite)} onClick={() => onToggleFavorite(song.id)} />
                  <button className="library-secondary-button" type="button" onClick={() => handleCoverSelection(song.id)}>
                    Portada
                  </button>
                  <button
                    className="library-secondary-button"
                    type="button"
                    onClick={() => onPlayTrack(song, { type: 'library' }, displayedSongs)}
                  >
                    Reproducir
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
