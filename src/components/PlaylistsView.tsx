import { useEffect, useState } from 'react';
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  moveSongDownInPlaylist,
  moveSongUpInPlaylist,
  removeSongFromPlaylist,
  setCurrentSongInPlaylist,
} from '../services/discoraApi';
import { Playlist, PlaylistDetail, Song } from '../types';
import { PlaylistCard } from './PlaylistCard';
import { SectionContainer } from './SectionContainer';
import { StateMessage } from './StateMessage';

type PlaylistsViewProps = {
  playlists: Playlist[];
  playlistsError: string | null;
  playlistsLoading: boolean;
  songs: Song[];
  onRefreshPlaylists: () => Promise<void>;
  onSelectTrack: (song: Song) => void;
};

export function PlaylistsView({
  playlists,
  playlistsError,
  playlistsLoading,
  songs,
  onRefreshPlaylists,
  onSelectTrack,
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
  const [movingNodeId, setMovingNodeId] = useState<Playlist['id'] | null>(null);
  const [settingCurrentNodeId, setSettingCurrentNodeId] = useState<Playlist['id'] | null>(null);

  const availableSongs = songs.filter(
    (song) => !playlistDetail?.songs.some((entry) => entry.song.id === song.id),
  );

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
      return;
    }

    setSelectedPlaylistId((currentId) =>
      currentId && playlists.some((playlist) => playlist.id === currentId) ? currentId : playlists[0].id,
    );
  }, [playlists]);

  useEffect(() => {
    if (!selectedPlaylistId) {
      return;
    }

    void loadPlaylistDetail(selectedPlaylistId);
  }, [selectedPlaylistId]);

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
      setSelectedPlaylistId(nextPlaylist.id);
      setCreateName('');
      setActionMessage('Playlist creada correctamente.');
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

  const handleMoveSongUp = async (nodeId: Playlist['id']) => {
    if (!playlistDetail) {
      return;
    }

    setMovingNodeId(nodeId);
    setActionMessage(null);

    try {
      const nextDetail = await moveSongUpInPlaylist(playlistDetail.id, nodeId);
      setPlaylistDetail(nextDetail);
      await onRefreshPlaylists();
      setActionMessage('Cancion movida hacia arriba.');
    } catch {
      setActionMessage('No se pudo mover la cancion hacia arriba.');
    } finally {
      setMovingNodeId(null);
    }
  };

  const handleMoveSongDown = async (nodeId: Playlist['id']) => {
    if (!playlistDetail) {
      return;
    }

    setMovingNodeId(nodeId);
    setActionMessage(null);

    try {
      const nextDetail = await moveSongDownInPlaylist(playlistDetail.id, nodeId);
      setPlaylistDetail(nextDetail);
      await onRefreshPlaylists();
      setActionMessage('Cancion movida hacia abajo.');
    } catch {
      setActionMessage('No se pudo mover la cancion hacia abajo.');
    } finally {
      setMovingNodeId(null);
    }
  };

  const handleSetCurrentSong = async (nodeId: Playlist['id']) => {
    if (!playlistDetail) {
      return;
    }

    setSettingCurrentNodeId(nodeId);
    setActionMessage(null);

    try {
      const nextDetail = await setCurrentSongInPlaylist(playlistDetail.id, nodeId);
      setPlaylistDetail(nextDetail);
      await onRefreshPlaylists();
      setActionMessage('Cancion actual actualizada.');
    } catch {
      setActionMessage('No se pudo marcar la cancion actual.');
    } finally {
      setSettingCurrentNodeId(null);
    }
  };

  return (
    <main className="main-content">
      <section className="hero-card playlists-hero">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="hero-copy-block">
          <p className="eyebrow">Playlists</p>
          <h1>Gestiona tus playlists</h1>
          <p className="hero-copy">
            Crea playlists, revisa sus canciones y administra el orden real definido por el backend.
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

      <SectionContainer title="Todas las playlists" subtitle={`${playlists.length} disponibles`}>
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
          <div className="playlist-grid">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                isActive={playlist.id === selectedPlaylistId}
                onClick={() => setSelectedPlaylistId(playlist.id)}
              />
            ))}
          </div>
        ) : null}
      </SectionContainer>

      <SectionContainer
        title={playlistDetail?.name ?? 'Detalle de playlist'}
        subtitle={playlistDetail ? `${playlistDetail.songCount} canciones` : 'Selecciona una playlist'}
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
        {!detailLoading && !detailError && !playlistDetail ? (
          <StateMessage
            title="Selecciona una playlist"
            description="Elige una playlist para ver su detalle."
          />
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

            {playlistDetail.songs.length === 0 ? (
              <StateMessage
                title="Esta playlist esta vacia"
                description="Agrega canciones desde la biblioteca para verla completa."
              />
            ) : (
              <div className="playlist-detail-list">
                {playlistDetail.songs.map((entry, index) => (
                  <article
                    key={entry.nodeId}
                    className={`playlist-detail-row${playlistDetail.currentNodeId === entry.nodeId ? ' playlist-detail-row-current' : ''}`}
                  >
                    <button className="playlist-detail-meta" type="button" onClick={() => onSelectTrack(entry.song)}>
                      <div className="playlist-detail-cover" style={{ background: entry.song.cover }} />
                      <div>
                        <h3>{entry.song.title}</h3>
                        <p>{entry.song.artist} · {entry.song.album}</p>
                        {playlistDetail.currentNodeId === entry.nodeId ? (
                          <span className="playlist-current-badge">Actual</span>
                        ) : null}
                      </div>
                    </button>
                    <div className="playlist-detail-actions">
                      <span>{entry.song.duration}</span>
                      <button
                        className="library-secondary-button"
                        type="button"
                        onClick={() => handleMoveSongUp(entry.nodeId)}
                        disabled={movingNodeId === entry.nodeId || index === 0}
                      >
                        {movingNodeId === entry.nodeId ? 'Moviendo...' : 'Subir'}
                      </button>
                      <button
                        className="library-secondary-button"
                        type="button"
                        onClick={() => handleMoveSongDown(entry.nodeId)}
                        disabled={movingNodeId === entry.nodeId || index === playlistDetail.songs.length - 1}
                      >
                        {movingNodeId === entry.nodeId ? 'Moviendo...' : 'Bajar'}
                      </button>
                      <button
                        className="library-secondary-button"
                        type="button"
                        onClick={() => handleSetCurrentSong(entry.nodeId)}
                        disabled={settingCurrentNodeId === entry.nodeId || playlistDetail.currentNodeId === entry.nodeId}
                      >
                        {settingCurrentNodeId === entry.nodeId ? 'Guardando...' : 'Marcar actual'}
                      </button>
                      <button className="library-secondary-button" type="button" onClick={() => onSelectTrack(entry.song)}>
                        Escuchar
                      </button>
                      <button
                        className="library-danger-button"
                        type="button"
                        onClick={() => handleRemoveSong(entry.nodeId)}
                        disabled={removingNodeId === entry.nodeId}
                      >
                        {removingNodeId === entry.nodeId ? 'Quitando...' : 'Quitar'}
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
