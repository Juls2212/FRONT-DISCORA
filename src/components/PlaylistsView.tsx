import { useEffect, useState } from 'react';
import { getPlaylistById } from '../services/discoraApi';
import { Playlist, PlaylistDetail, Song } from '../types';
import { PlaylistCard } from './PlaylistCard';
import { SectionContainer } from './SectionContainer';
import { StateMessage } from './StateMessage';

type PlaylistsViewProps = {
  playlists: Playlist[];
  playlistsError: string | null;
  playlistsLoading: boolean;
  onSelectTrack: (song: Song) => void;
};

export function PlaylistsView({
  playlists,
  playlistsError,
  playlistsLoading,
  onSelectTrack,
}: PlaylistsViewProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<Playlist['id'] | null>(null);
  const [playlistDetail, setPlaylistDetail] = useState<PlaylistDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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

    let active = true;

    const loadPlaylistDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const nextDetail = await getPlaylistById(selectedPlaylistId);

        if (!active) {
          return;
        }

        setPlaylistDetail(nextDetail);
      } catch {
        if (active) {
          setDetailError('No se pudo abrir la playlist seleccionada.');
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    };

    void loadPlaylistDetail();

    return () => {
      active = false;
    };
  }, [selectedPlaylistId]);

  return (
    <main className="main-content">
      <section className="hero-card playlists-hero">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="hero-copy-block">
          <p className="eyebrow">Playlists</p>
          <h1>Explora tus playlists</h1>
          <p className="hero-copy">
            Recorre cada lista, abre su detalle y revisa las canciones en el orden real del backend.
          </p>
        </div>
      </section>

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
            description="Crea una playlist en el backend para verla aqui."
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
        {!detailLoading && !detailError && playlistDetail && playlistDetail.songs.length === 0 ? (
          <StateMessage
            title="Esta playlist esta vacia"
            description="Todavia no hay canciones dentro de esta playlist."
          />
        ) : null}
        {!detailLoading && !detailError && playlistDetail && playlistDetail.songs.length > 0 ? (
          <div className="playlist-detail-list">
            {playlistDetail.songs.map((entry) => (
              <article key={entry.nodeId} className="playlist-detail-row">
                <button className="playlist-detail-meta" type="button" onClick={() => onSelectTrack(entry.song)}>
                  <div className="playlist-detail-cover" style={{ background: entry.song.cover }} />
                  <div>
                    <h3>{entry.song.title}</h3>
                    <p>
                      {entry.song.artist} · {entry.song.album}
                    </p>
                  </div>
                </button>
                <div className="playlist-detail-actions">
                  <span>{entry.song.duration}</span>
                  <button className="library-secondary-button" type="button" onClick={() => onSelectTrack(entry.song)}>
                    Escuchar
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
