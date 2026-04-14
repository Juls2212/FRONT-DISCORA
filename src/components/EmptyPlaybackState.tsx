type EmptyPlaybackStateProps = {
  libraryCount: number;
  playlistCount: number;
};

export function EmptyPlaybackState({ libraryCount, playlistCount }: EmptyPlaybackStateProps) {
  return (
    <main className="main-content home-view home-control-view">
      <section className="hero-card home-control-empty">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="home-empty-layout">
          <div className="home-empty-vinyl">
            <div className="home-empty-vinyl-ring home-empty-vinyl-ring-one" />
            <div className="home-empty-vinyl-ring home-empty-vinyl-ring-two" />
            <div className="home-empty-vinyl-core" />
          </div>
          <div className="home-empty-copy">
            <p className="eyebrow">Inicio</p>
            <h1>La cabina esta lista</h1>
            <p className="hero-copy">
              Elige una cancion desde tu biblioteca o una playlist para convertir este espacio en tu
              centro de control.
            </p>
            <div className="home-empty-stats">
              <article className="home-empty-stat">
                <span>Biblioteca</span>
                <strong>{libraryCount} canciones</strong>
              </article>
              <article className="home-empty-stat">
                <span>Playlists</span>
                <strong>{playlistCount} colecciones</strong>
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
