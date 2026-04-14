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
  onFrontendPlaylistDetailChange: (detail: PlaylistDetail) => void;
  onRequestHandled: () => void;
  playlists: Playlist[];
  playlistsError: string | null;
  playlistsLoading: boolean;
  requestedPlaylistId: Playlist['id'] | null;
  songs: Song[];
  onRefreshPlaylists: () => Promise<void>;
  onPlayTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  onResolveFrontendPlaylistDetail: (playlistId: Playlist['id'], baseDetail: PlaylistDetail) => PlaylistDetail;
  onToggleFavorite: (songId: Song['id']) => void;
  unavailableSongIds: string[];
};

export function PlaylistsView({
  embeddedCoverBySongId,
  favoriteSongIds,
  manualCoverBySongId,
  onFrontendPlaylistDetailChange,
  onRequestHandled,
  playlists,
  playlistsError,
  playlistsLoading,
  requestedPlaylistId,
  songs,
  onRefreshPlaylists,
  onPlayTrack,
  onResolveFrontendPlaylistDetail,
  onToggleFavorite,
  unavailableSongIds,
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
    (song) => !displayedPlaylistSongs.some((entry) => String(entry.song.id) === String(song.id)),
  );

  const selectedPlaylistSummary = selectedPlaylistId
    ? playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null
    : null;

  const isYoutubePlaylist = playlistDetail?.sourceType === 'youtube' || selectedPlaylistSummary?.sourceType === 'youtube';

  const isLocalYoutubePlaylist = (playlist: Playlist): playlist is PlaylistDetail =>
    playlist.sourceType === 'youtube' && 'songs' in playlist && 'currentNodeId' in playlist;

  const isFrontendNode = (nodeId: Playlist['id']) => String(nodeId).startsWith('front:');

  const relinkEntries = (entries: PlaylistDetail['songs']): PlaylistDetail['songs'] =>
    entries.map((entry, index) => ({
      ...entry,
      nextNodeId: index < entries.length - 1 ? entries[index + 1].nodeId : null,
      prevNodeId: index > 0 ? entries[index - 1].nodeId : null,
    }));

  const hasFrontendNodes = (detail: PlaylistDetail | null) =>
    Boolean(detail?.songs.some((entry) => isFrontendNode(entry.nodeId)));

  const moveEntryByNodeId = (
    entries: PlaylistDetail['songs'],
    sourceNodeId: Playlist['id'],
    targetNodeId: Playlist['id'],
  ) => {
    const sourceIndex = entries.findIndex((entry) => String(entry.nodeId) === String(sourceNodeId));
    const targetIndex = entries.findIndex((entry) => String(entry.nodeId) === String(targetNodeId));

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return null;
    }

    const sourceEntry = entries[sourceIndex];
    const nextEntries = entries.filter((entry) => String(entry.nodeId) !== String(sourceNodeId));
    const insertAt = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;

    return {
      nextEntries: relinkEntries([
        ...nextEntries.slice(0, insertAt),
        sourceEntry,
        ...nextEntries.slice(insertAt),
      ]),
      sourceIndex,
      targetIndex,
    };
  };

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
      const localPlaylist = playlists.find(
        (playlist): playlist is PlaylistDetail => playlist.id === playlistId && isLocalYoutubePlaylist(playlist),
      );

      if (localPlaylist) {
        setPlaylistDetail(localPlaylist);
        return;
      }

      const nextDetail = await getPlaylistById(playlistId);
      setPlaylistDetail(onResolveFrontendPlaylistDetail(playlistId, nextDetail));
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

    const playlistStillExists = playlists.some((playlist) => playlist.id === selectedPlaylistId);

    if (!playlistStillExists) {
      handleBackToPlaylists();
    }
  }, [playlists, selectedPlaylistId]);

  useEffect(() => {
    if (!selectedPlaylistId) {
      return;
    }

    void loadPlaylistDetail(selectedPlaylistId);
  }, [selectedPlaylistId]);

  useEffect(() => {
    if (!requestedPlaylistId) {
      return;
    }

    setSelectedPlaylistId(requestedPlaylistId);
    setPlaylistDetail(null);
    setDetailError(null);
    setSelectedSongId('');
    onRequestHandled();
  }, [onRequestHandled, requestedPlaylistId]);

  useEffect(() => {
    if (!selectedPlaylistId || !selectedPlaylistSummary) {
      return;
    }

    if (isLocalYoutubePlaylist(selectedPlaylistSummary)) {
      setPlaylistDetail(selectedPlaylistSummary);
      setDetailError(null);
      setDetailLoading(false);
    }
  }, [selectedPlaylistId, selectedPlaylistSummary]);

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

    const selectedSong = songs.find((song) => String(song.id) === selectedSongId);

    if (!selectedSong) {
      setActionMessage('No se encontro la cancion seleccionada.');
      return;
    }

    setAddingSong(true);
    setActionMessage(null);

    try {
      if (selectedSong.sourceType === 'youtube') {
        const nextSongs = relinkEntries([
          ...playlistDetail.songs,
          {
            nextNodeId: null,
            nodeId: `front:${String(playlistDetail.id)}:${String(selectedSong.id)}:${Date.now()}`,
            prevNodeId: null,
            song: selectedSong,
          },
        ]);

        const nextDetail = {
          ...playlistDetail,
          coverUrl: playlistDetail.coverUrl ?? selectedSong.backendCoverUrl,
          currentNodeId: playlistDetail.currentNodeId,
          songCount: nextSongs.length,
          songs: nextSongs,
        };

        setPlaylistDetail(nextDetail);
        onFrontendPlaylistDetailChange(nextDetail);
        setSelectedSongId('');
        setActionMessage('Cancion agregada a la playlist.');
        return;
      }

      const nextDetail = await addSongToPlaylist(playlistDetail.id, { songId: selectedSongId });
      const resolvedDetail = onResolveFrontendPlaylistDetail(playlistDetail.id, nextDetail);
      setPlaylistDetail(resolvedDetail);
      onFrontendPlaylistDetailChange(resolvedDetail);
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
      if (String(nodeId).startsWith('front:')) {
        const nextSongs = relinkEntries(
          playlistDetail.songs.filter((entry) => String(entry.nodeId) !== String(nodeId)),
        );

        const nextDetail = {
          ...playlistDetail,
          currentNodeId:
            playlistDetail.currentNodeId && String(playlistDetail.currentNodeId) === String(nodeId)
              ? null
              : playlistDetail.currentNodeId,
          songCount: nextSongs.length,
          songs: nextSongs,
        };

        setPlaylistDetail(nextDetail);
        onFrontendPlaylistDetailChange(nextDetail);
        setActionMessage('Cancion eliminada de la playlist.');
        return;
      }

      const nextDetail = await removeSongFromPlaylist(playlistDetail.id, nodeId);
      const resolvedDetail = onResolveFrontendPlaylistDetail(playlistDetail.id, nextDetail);
      setPlaylistDetail(resolvedDetail);
      onFrontendPlaylistDetailChange(resolvedDetail);
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

  const persistReorder = async (nodeId: Playlist['id'], sourceIndex: number, targetIndex: number) => {
    if (!playlistDetail || sourceIndex === targetIndex) {
      return;
    }

    if (hasFrontendNodes(playlistDetail)) {
      onFrontendPlaylistDetailChange(playlistDetail);
      setActionMessage('Orden actualizado correctamente.');
      handleDragEnd();
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
              {playlistDetail?.sourceLabel ?? selectedPlaylistSummary?.sourceLabel ? (
                <span className="playlist-detail-meta-line">
                  Fuente: {playlistDetail?.sourceLabel ?? selectedPlaylistSummary?.sourceLabel}
                </span>
              ) : null}
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
              {!isYoutubePlaylist ? (
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
              ) : null}

              {displayedPlaylistSongs.length === 0 ? (
                <StateMessage
                  title="Esta playlist esta vacia"
                  description={
                    isYoutubePlaylist
                      ? 'Esta playlist importada desde YouTube no tiene canciones disponibles.'
                      : 'Agrega canciones desde la biblioteca para verla completa.'
                  }
                />
              ) : (
                <div className="playlist-detail-list">
                  {displayedPlaylistSongs.map((entry) => (
                    <article
                      key={entry.nodeId}
                      className={`playlist-detail-row${playlistDetail.currentNodeId === entry.nodeId ? ' playlist-detail-row-current' : ''}${draggedNodeId === entry.nodeId ? ' playlist-detail-row-dragging' : ''}${dragOverNodeId === entry.nodeId && draggedNodeId !== entry.nodeId ? ' playlist-detail-row-drop-target' : ''}${unavailableSongIds.includes(String(entry.song.id)) ? ' playlist-detail-row-unavailable' : ''}`}
                      draggable={!persistingReorder && !isYoutubePlaylist}
                      onDragStart={(event) => {
                        if (isYoutubePlaylist) {
                          return;
                        }

                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(entry.nodeId));
                        handleDragStart(entry.nodeId);
                      }}
                      onDragOver={(event) => {
                        if (isYoutubePlaylist) {
                          return;
                        }

                        event.preventDefault();
                        if (!persistingReorder && draggedNodeId && draggedNodeId !== entry.nodeId) {
                          event.dataTransfer.dropEffect = 'move';
                          setDragOverNodeId(entry.nodeId);
                        }
                      }}
                      onDrop={(event) => {
                        if (isYoutubePlaylist) {
                          return;
                        }

                        event.preventDefault();

                        if (persistingReorder || !draggedNodeId || draggedNodeId === entry.nodeId || !playlistDetail) {
                          return;
                        }

                        const result = moveEntryByNodeId(playlistDetail.songs, draggedNodeId, entry.nodeId);

                        if (!result) {
                          handleDragEnd();
                          return;
                        }

                        setPlaylistDetail({
                          ...playlistDetail,
                          songs: result.nextEntries,
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
                          {unavailableSongIds.includes(String(entry.song.id)) ? (
                            <span className="playlist-current-badge playlist-current-badge-muted">No disponible</span>
                          ) : null}
                        </div>
                      </button>
                      <div className="playlist-detail-actions">
                        {!isYoutubePlaylist ? (
                          <span className="playlist-drag-indicator" aria-hidden="true">
                            ::
                          </span>
                        ) : null}
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
                        {!isYoutubePlaylist ? (
                          <button
                            className="library-danger-button playlist-remove-button"
                            type="button"
                            onClick={() => handleRemoveSong(entry.nodeId)}
                            disabled={removingNodeId === entry.nodeId}
                            aria-label={`Quitar ${entry.song.title}`}
                          >
                            {removingNodeId === entry.nodeId ? '...' : 'x'}
                          </button>
                        ) : null}
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
