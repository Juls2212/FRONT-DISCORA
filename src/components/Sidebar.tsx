const navigationItems = ['Inicio', 'Explorar', 'Biblioteca'];
const collectionItems = ['Tus mezclas', 'Favoritos', 'Recientes'];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">Discora</div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigationItems.map((item) => (
            <button key={item} className="nav-button" type="button">
              {item}
            </button>
          ))}
        </nav>
      </div>

      <section className="sidebar-collection" aria-label="Colección">
        <p className="sidebar-label">Colección</p>
        {collectionItems.map((item) => (
          <button key={item} className="collection-button" type="button">
            {item}
          </button>
        ))}
      </section>
    </aside>
  );
}
