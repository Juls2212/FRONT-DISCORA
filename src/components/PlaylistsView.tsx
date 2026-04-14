import { useEffect, useMemo, useState } from 'react';
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  moveSongDownInPlaylist,
  moveSongUpInPlaylist,
  removeSongFromPlaylist,
} from '../services/discoraApi';
import { FavoriteButton } from './FavoriteButton';
import { decorateSong, getCoverSurfaceStyle } from '../utils/songPresentation';
import { PlaybackContext, Playlist, PlaylistDetail, Song, SongPresentationState } from '../types';
import { PlaylistCard } from './PlaylistCard';
import { SectionContainer } from './SectionContainer';
import { StateMessage } from './StateMessage';

type PlaylistsViewProps = SongPresentationState & {
  playlists: Playlist[];
  playlistsError: string | null;
  playlistsLoading: boolean;
  songs: Song[];
  onRefreshPlaylists: () => Promise<void>;
  onPlayTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  onToggleFavorite: (songId: Song['id']) => void;
};

export function PlaylistsView({
  embeddedCoverBySongId,
  favoriteSongIds,
  manualCoverBySongId,
  playlists,
  playlistsError,
  playlistsLoading,
  songs,
  onRefreshPlaylists,
  onPlayTrack,
  onToggleFavorite,
}: PlaylistsViewProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<Playlist['id'] | null>(null);
  const [playlistDetail, setPlaylistDetail] = useState<PlaylistDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [addingSong, setAddingSong] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<Playlist['id'] | null>(null);
  const [removingNodeId, setRemovingNodeId] = useState<Playlist['id'] | null>(null);
  const [persistingReorder, setPersistingReorder] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<Playlist['id'] | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<Playlist['id'] | null>(null);

  const presentationState: SongPresentationState = useMemo(
    () => ({
      embeddedCoverBySongId,
      favoriteSongIds,
      manualCoverBySongId,
    }),
    [embeddedCoverBySongId, favoriteSongIds, manualCoverBySongId],
  );

  const displayedPlaylistSongs = useMemo(
    () => playlistDetail?.songs.map((entry) => ({ ...entry, song: decorateSong(entry.song, presentationState) })) ?? [],
    [playlistDetail, presentationState],
  );

  const availableSongs = songs.filter(
    (song) => !displayedPlaylistSongs.some((entry) => entry.song.id === song.id),
  );

  const selectedPlaylistSummary = selectedPlaylistId
    ? playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null
    : null;

  const getPlaylistPlaybackContext = (): PlaybackContext | null => {
    if (!playlistDetail) {
      return null;
    }

    return {
      playlistId: playlistDetail.id,
      playlistName: playlistDetail.name,
      type: 'playlist',
    };
  };

  const loadPlaylistDetail = async (playlistId: Playlist['id']) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const nextDetail = await getPlaylistById(playlistId);
      setPlaylistDetail(nextDetail);
    } catch {
      setDetailError('No se pudo abrir la playlist seleccionada.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!playlists.length) {
      setSelectedPlaylistId(null);
      setPlaylistDetail(null);
    }
  }, [playlists]);

  useEffect(() => {
    if (!selectedPlaylistId) {
      return;
    }

    void loadPlaylistDetail(selectedPlaylistId);
  }, [selectedPlaylistId]);

  const handleOpenPlaylist = (playlistId: Playlist['id']) => {
    setSelectedPlaylistId(playlistId);
    setPlaylistDetail(null);
    setDetailError(null);
    setSelectedSongId('');
  };

  const handleBackToPlaylists = () => {
    setSelectedPlaylistId(null);
    setPlaylistDetail(null);
    setDetailError(null);
    setSelectedSongId('');
  };

  const handleCreatePlaylist = async () => {
    const trimmedName = createName.trim();

    if (!trimmedName) {
      setActionMessage('Escribe un nombre para crear la playlist.');
      return;
    }

    setCreating(true);
    setActionMessage(null);

    try {
      const nextPlaylist = await createPlaylist({ name: trimmedName });
      await onRefreshPlaylists();
      setCreateName('');
      setActionMessage('Playlist creada correctamente.');
      handleOpenPlaylist(nextPlaylist.id);
    } catch {
      setActionMessage('No se pudo crear la playlist.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: Playlist['id']) => {
    setDeletingPlaylistId(playlistId);
    setActionMessage(null);

    try {
      await deletePlaylist(playlistId);
      await onRefreshPlaylists();
      setActionMessage('Playlist eliminada correctamente.');

      if (selectedPlaylistId === playlistId) {
        handleBackToPlaylists();
      }
    } catch {
      setActionMessage('No se pudo eliminar la playlist.');
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleAddSong = async () => {
    if (!playlistDetail || !selectedSongId) {
      setActionMessage('Selecciona una cancion para agregar.');
      return;
    }

    setAddingSong(true);
    setActionMessage(null);

    try {
      const nextDetail = await addSongToPlaylist(playlistDetail.id, { songId: selectedSongId });
      setPlaylistDetail(nextDetail);
      await onRefreshPlaylists();
      setSelectedSongId('');
      setActionMessage('Cancion agregada a la playlist.');
    } catch {
      setActionMessage('No se pudo agregar la cancion a la playlist.');
    } finally {
      setAddingSong(false);
    }
  };

  const handleRemoveSong = async (nodeId: Playlist['id']) => {
    if (!playlistDetail) {
      return;
    }

    setRemovingNodeId(nodeId);
    setActionMessage(null);

    try {
      const nextDetail = await removeSongFromPlaylist(playlistDetail.id, nodeId);
      setPlaylistDetail(nextDetail);
      await onRefreshPlaylists();
      setActionMessage('Cancion eliminada de la playlist.');
    } catch {
      setActionMessage('No se pudo quitar la cancion de la playlist.');
    } finally {
      setRemovingNodeId(null);
    }
  };

  const handleDragStart = (nodeId: Playlist['id']) => {
    setDraggedNodeId(nodeId);
    setDragOverNodeId(nodeId);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
  };

  const reorderSongs = (nodeId: Playlist['id'], targetNodeId: Playlist['id']) => {
    if (!playlistDetail || nodeId === targetNodeId) {
      return null;
    }

    const sourceIndex = playlistDetail.songs.findIndex((entry) => entry.nodeId === nodeId);
    const targetIndex = playlistDetail.songs.findIndex((entry) => entry.nodeId === targetNodeId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return null;
    }

    const nextSongs = [...playlistDetail.songs];
    const [movedEntry] = nextSongs.splice(sourceIndex, 1);
    nextSongs.splice(targetIndex, 0, movedEntry);

    return {
      nextSongs,
      sourceIndex,
      targetIndex,
    };
  };

  const persistReorder = async (nodeId: Playlist['id'], sourceIndex: number, targetIndex: number) => {
    if (!playlistDetail || sourceIndex === targetIndex) {
      return;
    }

    setPersistingReorder(true);
    setActionMessage(null);

    try {
      const moveSong = sourceIndex > targetIndex ? moveSongUpInPlaylist : moveSongDownInPlaylist;
      const moves = Math.abs(sourceIndex - targetIndex);

      for (let index = 0; index < moves; index += 1) {
        await moveSong(playlistDetail.id, nodeId);
      }

      await loadPlaylistDetail(playlistDetail.id);
      await onRefreshPlaylists();
      setActionMessage('Orden actualizado correctamente.');
    } catch {
      await loadPlaylistDetail(playlistDetail.id);
      setActionMessage('No se pudo actualizar el orden de la playlist.');
    } finally {
      setPersistingReorder(false);
      handleDragEnd();
    }
  };

  if (selectedPlaylistId) {
    return (
      <main className="main-content playlists-view playlists-detail-view">
        <section className="hero-card playlists-hero playlists-space-hero">
          <div className="hero-atmosphere hero-atmosphere-left" />
          <div className="hero-atmosphere hero-atmosphere-right" />
          <div className="playlist-detail-hero">
            <button className="playlist-back-button" type="button" onClick={handleBackToPlaylists}>
              Volver a playlists
            </button>
            <div
              className="playlist-detail-hero-cover"
              style={{ background: selectedPlaylistSummary?.artwork ?? 'linear-gradient(145deg, #52627d 0%, #202739 100%)' }}
            >
              <div className="playlist-ring" />
            </div>
            <div className="playlist-detail-hero-copy">
              <p className="eyebrow">Playlist</p>
              <h1>{playlistDetail?.name ?? selectedPlaylistSummary?.name ?? 'Abriendo playlist'}</h1>
              <p className="hero-copy">
                {playlistDetail?.detail ??
                  selectedPlaylistSummary?.detail ??
                  'Una seleccion curada para seguir escuchando en Discora.'}
              </p>
              <span className="playlist-detail-meta-line">
                {playlistDetail?.songCount ?? selectedPlaylistSummary?.songCount ?? 0} canciones
              </span>
            </div>
          </div>
        </section>

        {actionMessage ? <p className="playlist-feedback">{actionMessage}</p> : null}

        <SectionContainer
          title={playlistDetail?.name ?? selectedPlaylistSummary?.name ?? 'Detalle de playlist'}
          subtitle={playlistDetail ? `${playlistDetail.songCount} canciones` : 'Cargando canciones'}
          label="Espacio de escucha"
          className="playlist-detail-section"
        >
          {detailLoading ? (
            <StateMessage
              title="Abriendo playlist"
              description="Discora esta cargando las canciones de esta playlist."
            />
          ) : null}
          {!detailLoading && detailError ? (
            <StateMessage title="No fue posible abrir la playlist" description={detailError} />
          ) : null}
          {!detailLoading && !detailError && playlistDetail ? (
            <div className="playlist-detail-panel">
              <div className="playlist-detail-toolbar">
                <label className="library-search playlist-song-select">
                  <span>Agregar cancion</span>
                  <select value={selectedSongId} onChange={(event) => setSelectedSongId(event.target.value)}>
                    <option value="">Selecciona una cancion de la biblioteca</option>
                    {availableSongs.map((song) => (
                      <option key={song.id} value={String(song.id)}>
                        {song.title} - {song.artist}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="playlist-detail-toolbar-actions">
                  <button className="library-primary-button" type="button" onClick={handleAddSong} disabled={addingSong}>
                    {addingSong ? 'Agregando...' : 'Agregar a playlist'}
                  </button>
                  <button
                    className="library-danger-button"
                    type="button"
                    onClick={() => handleDeletePlaylist(playlistDetail.id)}
                    disabled={deletingPlaylistId === playlistDetail.id}
                  >
                    {deletingPlaylistId === playlistDetail.id ? 'Eliminando...' : 'Eliminar playlist'}
                  </button>
                </div>
              </div>

              {displayedPlaylistSongs.length === 0 ? (
                <StateMessage
                  title="Esta playlist esta vacia"
                  description="Agrega canciones desde la biblioteca para verla completa."
                />
              ) : (
                <div className="playlist-detail-list">
                  {displayedPlaylistSongs.map((entry) => (
                    <article
                      key={entry.nodeId}
                      className={`playlist-detail-row${playlistDetail.currentNodeId === entry.nodeId ? ' playlist-detail-row-current' : ''}${draggedNodeId === entry.nodeId ? ' playlist-detail-row-dragging' : ''}${dragOverNodeId === entry.nodeId && draggedNodeId !== entry.nodeId ? ' playlist-detail-row-drop-target' : ''}`}
                      draggable={!persistingReorder}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(entry.nodeId));
                        handleDragStart(entry.nodeId);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!persistingReorder && draggedNodeId && draggedNodeId !== entry.nodeId) {
                          event.dataTransfer.dropEffect = 'move';
                          setDragOverNodeId(entry.nodeId);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();

                        if (persistingReorder || !draggedNodeId || draggedNodeId === entry.nodeId || !playlistDetail) {
                          return;
                        }

                        const result = reorderSongs(draggedNodeId, entry.nodeId);

                        if (!result) {
                          handleDragEnd();
                          return;
                        }

                        setPlaylistDetail({
                          ...playlistDetail,
                          songs: result.nextSongs,
                        });
                        void persistReorder(draggedNodeId, result.sourceIndex, result.targetIndex);
                      }}
                      onDragEnd={handleDragEnd}
                    >
                      <button
                        className="playlist-detail-meta"
                        type="button"
                        onClick={() => {
                          const context = getPlaylistPlaybackContext();

                          if (context) {
                            onPlayTrack(
                              entry.song,
                              context,
                              displayedPlaylistSongs.map((playlistSong) => playlistSong.song),
                            );
                          }
                        }}
                      >
                        <div className="playlist-detail-cover" style={getCoverSurfaceStyle(entry.song.cover)} />
                        <div>
                          <h3>{entry.song.title}</h3>
                          <p>{entry.song.artist} - {entry.song.album}</p>
                          {playlistDetail.currentNodeId === entry.nodeId ? (
                            <span className="playlist-current-badge">Actual</span>
                          ) : null}
                        </div>
                      </button>
                      <div className="playlist-detail-actions">
                        <span className="playlist-drag-indicator" aria-hidden="true">
                          ::
                        </span>
                        <span>{entry.song.duration}</span>
                        <FavoriteButton
                          isActive={Boolean(entry.song.isFavorite)}
                          onClick={() => onToggleFavorite(entry.song.id)}
                        />
                        <button
                          className="library-secondary-button"
                          type="button"
                          onClick={() => {
                            const context = getPlaylistPlaybackContext();

                            if (context) {
                              onPlayTrack(
                                entry.song,
                                context,
                                displayedPlaylistSongs.map((playlistSong) => playlistSong.song),
                              );
                            }
                          }}
                          aria-label={`Reproducir ${entry.song.title}`}
                        >
                          {'>'}
                        </button>
                        <button
                          className="library-danger-button playlist-remove-button"
                          type="button"
                          onClick={() => handleRemoveSong(entry.nodeId)}
                          disabled={removingNodeId === entry.nodeId}
                          aria-label={`Quitar ${entry.song.title}`}
                        >
                          {removingNodeId === entry.nodeId ? '...' : 'x'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </SectionContainer>
      </main>
    );
  }

  return (
    <main className="main-content playlists-view playlists-overview-view">
      <section className="hero-card playlists-hero playlists-overview-hero">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="hero-copy-block">
          <p className="eyebrow">Playlists</p>
          <h1>Gestiona tus playlists</h1>
          <p className="hero-copy">
            Crea playlists, revisa su identidad y entra a cada una como una vista propia.
          </p>
        </div>
        <div className="playlist-create-panel">
          <label className="library-search">
            <span>Nombre de la playlist</span>
            <input
              type="text"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Escribe el nombre de una nueva playlist"
            />
          </label>
          <button className="library-primary-button" type="button" onClick={handleCreatePlaylist} disabled={creating}>
            {creating ? 'Creando...' : 'Crear playlist'}
          </button>
        </div>
      </section>

      {actionMessage ? <p className="playlist-feedback">{actionMessage}</p> : null}

      <SectionContainer
        title="Todas las playlists"
        subtitle={`${playlists.length} disponibles`}
        label="Coleccion"
        className="playlists-overview-section"
      >
        {playlistsLoading ? (
          <StateMessage
            title="Cargando playlists"
            description="Discora esta reuniendo tu coleccion de playlists."
          />
        ) : null}
        {!playlistsLoading && playlistsError ? (
          <StateMessage title="No fue posible cargar playlists" description={playlistsError} />
        ) : null}
        {!playlistsLoading && !playlistsError && playlists.length === 0 ? (
          <StateMessage
            title="No hay playlists disponibles"
            description="Crea una playlist para comenzar a organizar tu musica."
          />
        ) : null}
        {!playlistsLoading && !playlistsError && playlists.length > 0 ? (
          <div className="playlist-grid playlists-overview-grid">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} onClick={() => handleOpenPlaylist(playlist.id)} />
            ))}
          </div>
        ) : null}
      </SectionContainer>
    </main>
  );
}
