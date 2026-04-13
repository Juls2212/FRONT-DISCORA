import { featuredMoment } from '../data';
import { Playlist, Song } from '../types';
import { FeaturedPanel } from './FeaturedPanel';
import { PlaylistCard } from './PlaylistCard';
import { RecentSongItem } from './RecentSongItem';
import { SectionContainer } from './SectionContainer';
import { StateMessage } from './StateMessage';

type MainContentProps = {
  playlists: Playlist[];
  playlistsError: string | null;
  playlistsLoading: boolean;
  songs: Song[];
  songsError: string | null;
  songsLoading: boolean;
};

export function MainContent({
  playlists,
  playlistsError,
  playlistsLoading,
  songs,
  songsError,
  songsLoading,
}: MainContentProps) {
  return (
    <main className="main-content">
      <section className="hero-card">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="hero-copy-block">
          <p className="eyebrow">Inicio</p>
          <h1>Bienvenido a Discora</h1>
          <p className="hero-copy">
            Un espacio editorial para descubrir musica entre sombras suaves, texturas profundas y
            detalles inspirados por la cultura del vinilo.
          </p>
        </div>
        <FeaturedPanel
          eyebrow={featuredMoment.eyebrow}
          title={featuredMoment.title}
          description={featuredMoment.description}
          note={songsLoading ? 'Actualizando seleccion' : `${songs.length} canciones disponibles`}
          artwork={featuredMoment.artwork}
        />
      </section>

      <SectionContainer title="Playlists destacadas" subtitle="Seleccion para esta noche">
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
          <div className="playlist-grid">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : null}
      </SectionContainer>

      <SectionContainer title="Escuchado recientemente" subtitle="Vuelve a entrar en ambiente">
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
            {songs.map((song) => (
              <RecentSongItem key={song.id} song={song} />
            ))}
          </div>
        ) : null}
      </SectionContainer>
    </main>
  );
}
