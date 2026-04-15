type HomeSafeFallbackProps = {
  detail?: string;
};

export function HomeSafeFallback({ detail }: HomeSafeFallbackProps) {
  return (
    <main className="main-content home-view">
      <section className="hero-card dj-home-shell dj-home-shell-empty">
        <div className="dj-home-empty-copy">
          <p className="eyebrow">Inicio</p>
          <h1>La cabina no pudo cargarse por completo.</h1>
          <p>{detail ?? 'Discora activo un modo seguro para mantener visible la interfaz mientras se estabiliza el panel principal.'}</p>
        </div>
      </section>
    </main>
  );
}
