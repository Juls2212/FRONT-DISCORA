const navigationItems = ['Inicio', 'Biblioteca', 'Playlists'];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-block">
        <div className="brand">Discora</div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigationItems.map((item) => (
            <button key={item} className="nav-button" type="button">
              {item}
            </button>
          ))}
        </nav>
      </div>

      <section className="sidebar-collection" aria-label="Estado">
        <p className="sidebar-label">Tu música, mejor organizada.</p>
      </section>
    </aside>
  );
}
