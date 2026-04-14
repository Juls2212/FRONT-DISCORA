import { featuredMoment } from '../data';
import { PlaybackContext, Playlist, Song } from '../types';
import { FeaturedPanel } from './FeaturedPanel';
import { PlaylistCard } from './PlaylistCard';
import { RecentSongItem } from './RecentSongItem';
import { SectionContainer } from './SectionContainer';
import { StateMessage } from './StateMessage';

type MainContentProps = {
  onPlayTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  playlists: Playlist[];
  playlistsError: string | null;
  playlistsLoading: boolean;
  songs: Song[];
  songsError: string | null;
  songsLoading: boolean;
};

export function MainContent({
  onPlayTrack,
  playlists,
  playlistsError,
  playlistsLoading,
  songs,
  songsError,
  songsLoading,
}: MainContentProps) {
  const featuredPlaylists = playlists.slice(0, 4);
  const recentSongs = songs.slice(0, 6);

  return (
    <main className="main-content home-view">
      <section className="hero-card home-hero">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="home-hero-layout">
          <div className="hero-copy-block home-hero-copy">
            <p className="eyebrow">Inicio</p>
            <h1>Bienvenido a Discora</h1>
            <p className="hero-copy">
              Un espacio editorial para descubrir musica entre sombras suaves, texturas profundas y
              detalles inspirados por la cultura del vinilo.
            </p>
          </div>
          <div className="home-curation-strip" aria-label="Resumen editorial">
            <article className="home-curation-card">
              <span>Seleccion viva</span>
              <strong>{songsLoading ? '...' : `${songs.length} temas`}</strong>
              <p>Descubrimiento continuo desde tu catalogo conectado.</p>
            </article>
            <article className="home-curation-card">
              <span>Rutas de escucha</span>
              <strong>{playlistsLoading ? '...' : `${playlists.length} playlists`}</strong>
              <p>Entradas curadas para volver a un ambiente especifico.</p>
            </article>
          </div>
        </div>
        <FeaturedPanel
          eyebrow={featuredMoment.eyebrow}
          title={featuredMoment.title}
          description={featuredMoment.description}
          note={songsLoading ? 'Actualizando seleccion' : `${songs.length} canciones disponibles`}
          artwork={featuredMoment.artwork}
        />
      </section>

      <SectionContainer
        title="Playlists destacadas"
        subtitle="Seleccion para esta noche"
        label="Descubrimiento"
        className="home-section home-section-featured"
      >
        {playlistsLoading ? (
          <StateMessage
            title="Cargando playlists"
            description="Discora esta consultando tu coleccion disponible."
          />
        ) : null}
        {!playlistsLoading && playlistsError ? (
          <StateMessage title="No fue posible cargar playlists" description={playlistsError} />
        ) : null}
        {!playlistsLoading && !playlistsError && playlists.length === 0 ? (
          <StateMessage
            title="Todavia no hay playlists"
            description="Cuando el backend devuelva playlists, apareceran aqui."
          />
        ) : null}
        {!playlistsLoading && !playlistsError && playlists.length > 0 ? (
          <div className="playlist-grid home-playlist-grid">
            {featuredPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : null}
      </SectionContainer>

      <SectionContainer
        title="Escuchado recientemente"
        subtitle="Vuelve a entrar en ambiente"
        label="Retorno"
        className="home-section home-section-recent"
      >
        {songsLoading ? (
          <StateMessage
            title="Cargando canciones"
            description="Estamos preparando la seleccion mas reciente."
          />
        ) : null}
        {!songsLoading && songsError ? (
          <StateMessage title="No fue posible cargar canciones" description={songsError} />
        ) : null}
        {!songsLoading && !songsError && songs.length === 0 ? (
          <StateMessage
            title="No hay canciones disponibles"
            description="Agrega canciones en el backend para verlas aqui."
          />
        ) : null}
        {!songsLoading && !songsError && songs.length > 0 ? (
          <div className="recent-songs-list">
            {recentSongs.map((song) => (
              <RecentSongItem
                key={song.id}
                song={song}
                onClick={() => onPlayTrack(song, { type: 'library' }, songs)}
              />
            ))}
          </div>
        ) : null}
      </SectionContainer>
    </main>
  );
}
