import { useCallback, useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  Heart,
  Home,
  Compass,
  Plus,
  Bell,
  UserRound,
  Menu,
  X,
  Store,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Star,
  Phone,
  Globe,
  Clock,
  Share2,
  Flag,
  MessageCircle,
  Navigation,
  Check,
  Ticket,
  Map as MapIcon,
  ChevronRight,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { api } from "./api";
import type { Business, Catalog, Post, Review, User } from "./types";
import {
  Editor,
  Empty,
  Logo,
  Modal,
  Picture,
  SectionTitle,
  icons,
  money,
} from "./ui";
import MapView from "./MapView";
import Admin from "./Admin";

const emptyCatalog: Catalog = {
  businesses: [],
  categories: [],
  favorites: [],
  posts: [],
};
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
function usePage() {
  const [page, setPage] = useState(location.hash.slice(1) || "home");
  useEffect(() => {
    const f = () => {
      setPage(location.hash.slice(1) || "home");
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return [
    page,
    (p: string) => {
      location.hash = p;
    },
  ] as const;
}
export default function App() {
  const [page, go] = usePage(),
    [catalog, setCatalog] = useState<Catalog>(emptyCatalog),
    [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [auth, setAuth] = useState(false),
    [register, setRegister] = useState(false),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(0),
    [filters, setFilters] = useState(false),
    [indoor, setIndoor] = useState(false),
    [sort, setSort] = useState("recommended"),
    [notifications, setNotifications] = useState<any[] | null>(null);
  const refresh = useCallback(async () => {
    setCatalog(await api<Catalog>("catalog"));
  }, []);
  useEffect(() => {
    api<{ user: User | null }>("session")
      .then(async (s) => {
        setUser(s.user);
        setCatalog(await api<Catalog>("catalog"));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = (m: string) => setToast(m);
  const requireUser = () => {
    if (user) return true;
    setAuth(true);
    return false;
  };
  const favorite = async (id: number) => {
    if (!requireUser()) return;
    try {
      await api("favorite", { business_id: id });
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const openNotifications = async () => {
    if (!requireUser()) return;
    try {
      setNotifications(await api("notifications"));
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const filtered = catalog.businesses
    .filter(
      (b) =>
        (!category || Number(b.category_id) === category) &&
        (!indoor || b.node_id) &&
        normalizeSearch(`${b.name} ${b.category} ${b.address}`).includes(
          normalizeSearch(search),
        ),
    )
    .sort((a, b) =>
      sort === "rating"
        ? Number(b.rating) - Number(a.rating)
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : Number(a.id) - Number(b.id),
    );
  const isAdmin = page.startsWith("admin"),
    business = page.startsWith("business/")
      ? catalog.businesses.find(
          (b) => Number(b.id) === Number(page.split("/")[1]),
        )
      : undefined;
  const nav = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "explore", label: "Explorar", icon: Compass },
    { id: "map", label: "Galerías", icon: MapIcon },
    { id: "favorites", label: "Favoritos", icon: Heart },
  ];
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <button className="brand-button" onClick={() => go("home")}>
            <Logo />
          </button>
          <nav className={menu ? "top-nav open" : "top-nav"}>
            {nav.map((n) => (
              <button
                key={n.id}
                className={page === n.id ? "active" : ""}
                onClick={() => {
                  go(n.id);
                  setMenu(false);
                }}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <span className="location">
              <MapPin size={16} /> Tucumán, Argentina
            </span>
            <button
              className="icon-button bell"
              aria-label="Notificaciones"
              onClick={openNotifications}
            >
              <Bell size={21} />
            </button>
            <button
              className="avatar"
              aria-label="Mi perfil"
              onClick={() => (user ? go("profile") : setAuth(true))}
            >
              {user ? user.name.slice(0, 1) : <UserRound size={21} />}
            </button>
          </div>
        </div>
      </header>
      {loading ? (
        <main className="shell">
          <div className="skeleton hero-skeleton" />
          <div className="business-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton card-skeleton" />
            ))}
          </div>
        </main>
      ) : error ? (
        <main className="shell">
          <Empty title="No pudimos conectar con LocalConnect">{error}</Empty>
          <button className="primary" onClick={() => location.reload()}>
            Volver a intentar
          </button>
        </main>
      ) : (
        <>
          {isAdmin ? (
            <Admin
              user={user}
              catalog={catalog}
              refresh={refresh}
              notify={notify}
              onLogin={() => setAuth(true)}
              go={go}
            />
          ) : (
            <main className="shell">
              {(page === "home" || page === "explore") && (
                <>
                  <div className="welcome-line">
                    <span className="eyebrow">
                      <span className="live-dot" /> HECHO PARA CONECTARNOS
                    </span>
                    <span className="quiet">
                      Tu próxima buena experiencia está cerca.
                    </span>
                  </div>
                  <div className="intro">
                    <div>
                      <h1>
                        {page === "home" ? (
                          <>
                            Lo mejor de tu ciudad,
                            <br />
                            <span>más cerca de vos.</span>
                          </>
                        ) : (
                          "Encontrá tu próximo lugar."
                        )}
                      </h1>
                      <p>
                        Descubrí comercios, apoyá lo local y encontrá tu camino.
                      </p>
                    </div>
                    <span className="intro-stamp">
                      <MapPin />
                      <span>
                        De Tucumán.
                        <br />
                        <strong>Para vos.</strong>
                      </span>
                    </span>
                  </div>
                  <div className="search-row">
                    <div className="search-box">
                      <Search size={22} />
                      <input
                        aria-label="Buscar comercios"
                        placeholder="¿Qué estás buscando hoy?"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button
                          className="icon-button"
                          aria-label="Limpiar búsqueda"
                          onClick={() => setSearch("")}
                        >
                          <X size={17} />
                        </button>
                      )}
                      <span className="search-hint">
                        Comercios, categorías y lugares
                      </span>
                    </div>
                    <button
                      className={"filter-button " + (filters ? "selected" : "")}
                      onClick={() => setFilters(!filters)}
                    >
                      <SlidersHorizontal size={19} /> Filtros{" "}
                      {category || indoor || sort !== "recommended" ? (
                        <span className="filter-dot" />
                      ) : null}
                    </button>
                  </div>
                  {filters && (
                    <div className="filters card">
                      <label>
                        Categoría
                        <select
                          value={category}
                          onChange={(e) => setCategory(Number(e.target.value))}
                        >
                          <option value={0}>Todas</option>
                          {catalog.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ordenar por
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="recommended">Recomendados</option>
                          <option value="rating">Mejor valoración</option>
                          <option value="name">Nombre A–Z</option>
                        </select>
                      </label>
                      <label className="check-field">
                        <input
                          type="checkbox"
                          checked={indoor}
                          onChange={(e) => setIndoor(e.target.checked)}
                        />{" "}
                        Con navegación interior
                      </label>
                      <button
                        className="text-button"
                        onClick={() => {
                          setCategory(0);
                          setSort("recommended");
                          setIndoor(false);
                          setSearch("");
                        }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                  {page === "home" && !search && !category && (
                    <div className="hero">
                      <div className="hero-copy">
                        <span className="hero-tag">
                          <Ticket size={14} /> PEQUEÑOS COMERCIOS, GRANDES
                          HALLAZGOS
                        </span>
                        <h2>
                          Tu barrio tiene
                          <br />
                          mucho <span>para descubrir.</span>
                        </h2>
                        <p>
                          Historias, sabores y oportunidades.
                          <br />
                          Encontrá eso que buscás, a la vuelta de casa.
                        </p>
                        <button
                          className="hero-button"
                          onClick={() => go("offers")}
                        >
                          Explorar promociones <ArrowUpRight size={19} />
                        </button>
                        <div className="hero-bottom">
                          <span className="hero-dots">
                            <i />
                            <i />
                            <i />
                          </span>
                          <span>Conectá con lo nuestro.</span>
                        </div>
                      </div>
                      <div className="store-art" aria-hidden="true">
                        <div className="orbit orbit-one" />
                        <div className="orbit orbit-two" />
                        <div className="floating-pin">
                          <MapPin size={27} />
                        </div>
                        <div className="store-building">
                          <div className="store-sign">
                            local<span>♥</span>
                          </div>
                          <div className="store-roof" />
                          <div className="store-awning">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <i key={i} />
                            ))}
                          </div>
                          <div className="store-window">
                            <span />
                            <span />
                            <div className="window-plant">✦</div>
                          </div>
                          <div className="store-door">
                            <span />
                          </div>
                          <div className="store-step" />
                        </div>
                        <div className="offer-ticket">
                          %<span>hecho cerca</span>
                        </div>
                        <div className="plant">
                          <i />
                          <i />
                          <i />
                          <b />
                        </div>
                        <span className="art-spark one">✦</span>
                        <span className="art-spark two">✦</span>
                      </div>
                    </div>
                  )}
                  <SectionTitle
                    title="¿Qué te gustaría encontrar?"
                    action={category ? "Ver todas" : "Explorar categorías"}
                    onAction={() => {
                      setCategory(0);
                      setFilters(true);
                    }}
                  />
                  <div className="category-row">
                    {catalog.categories.map((c, i) => {
                      const Icon = icons[c.icon] ?? Store;
                      return (
                        <button
                          key={c.id}
                          className={
                            "category " +
                            (category === Number(c.id) ? "chosen" : "")
                          }
                          onClick={() =>
                            setCategory(
                              category === Number(c.id) ? 0 : Number(c.id),
                            )
                          }
                        >
                          <span className={"category-icon tone-" + (i % 6)}>
                            <Icon size={27} strokeWidth={1.6} />
                          </span>
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <SectionTitle
                    eyebrow={
                      search || category
                        ? "EXPLORÁ A TU MANERA"
                        : "LUGARES QUE VALE LA PENA CONOCER"
                    }
                    title={
                      search
                        ? `Resultados para “${search}”`
                        : category
                          ? (catalog.categories.find(
                              (c) => Number(c.id) === category,
                            )?.name ?? "Comercios")
                          : "Recomendados para vos"
                    }
                    action={
                      page === "home"
                        ? "Ver todos"
                        : `${filtered.length} comercios`
                    }
                    onAction={() => go("explore")}
                  />
                  <div className="business-grid">
                    {(page === "home" && !search && !category
                      ? filtered.slice(0, 4)
                      : filtered
                    ).map((b) => (
                      <BusinessCard
                        key={b.id}
                        b={b}
                        favorite={catalog.favorites
                          .map(Number)
                          .includes(Number(b.id))}
                        onFavorite={() => favorite(Number(b.id))}
                        onOpen={() => go("business/" + b.id)}
                      />
                    ))}
                  </div>
                  {!filtered.length && (
                    <Empty title="Todavía no encontramos ese lugar">
                      Probá con otra palabra o quitá algún filtro.
                    </Empty>
                  )}
                  <div className="nearby">
                    <div className="mini-map" aria-hidden="true">
                      <span className="map-road r1" />
                      <span className="map-road r2" />
                      <span className="map-road r3" />
                      <MapPin className="pin p1" />
                      <MapPin className="pin p2" />
                      <MapPin className="pin p3" />
                      <span className="map-label">TU PRÓXIMO DESTINO</span>
                    </div>
                    <div className="nearby-copy">
                      <span className="eyebrow">LLEGÁ HASTA LA PUERTA</span>
                      <h2>
                        Encontrá tu lugar.
                        <br />
                        También dentro de la galería.
                      </h2>
                      <p>
                        Elegí un local y seguí el recorrido en nuestro plano
                        interactivo.
                      </p>
                    </div>
                    <button className="primary" onClick={() => go("map")}>
                      Explorar el mapa <ArrowRight size={18} />
                    </button>
                  </div>
                  <div className="demo-note">
                    <ShieldCheck size={16} />
                    <span>
                      Proyecto académico · Comercios, reseñas y planos iniciales
                      de demostración.
                    </span>
                  </div>
                </>
              )}
              {page === "favorites" && (
                <>
                  <div className="page-heading">
                    <span className="eyebrow">TUS LUGARES, SIEMPRE A MANO</span>
                    <h1>
                      Mis favoritos<span className="purple">.</span>
                    </h1>
                    <p>Guardá los comercios a los que querés volver.</p>
                  </div>
                  {!user ? (
                    <Empty title="Tus favoritos te esperan">
                      <button className="primary" onClick={() => setAuth(true)}>
                        Iniciar sesión
                      </button>
                    </Empty>
                  ) : (
                    <div className="business-grid">
                      {catalog.businesses
                        .filter((b) =>
                          catalog.favorites.map(Number).includes(Number(b.id)),
                        )
                        .map((b) => (
                          <BusinessCard
                            key={b.id}
                            b={b}
                            favorite
                            onFavorite={() => favorite(Number(b.id))}
                            onOpen={() => go("business/" + b.id)}
                          />
                        ))}
                    </div>
                  )}
                  {user && !catalog.favorites.length && (
                    <Empty title="Tu lista empieza con un corazón">
                      Tocá el corazón de un comercio para guardarlo acá.
                    </Empty>
                  )}
                </>
              )}
              {page === "offers" && (
                <>
                  <div className="page-heading">
                    <span className="eyebrow">UN BUEN PLAN, CERCA TUYO</span>
                    <h1>
                      Promociones y novedades<span className="purple">.</span>
                    </h1>
                    <p>
                      Conocé qué tienen para vos los comercios de la comunidad.
                    </p>
                  </div>
                  <div className="posts-grid">
                    {catalog.posts
                      .filter((p) => p.type !== "product")
                      .map((p) => (
                        <PostCard
                          key={p.id}
                          p={p}
                          onOpen={() => go("business/" + p.business_id)}
                        />
                      ))}
                  </div>
                  {!catalog.posts.length && (
                    <Empty title="Pronto habrá novedades" />
                  )}
                </>
              )}
              {page.startsWith("map") && (
                <MapView key={page} businesses={catalog.businesses} go={go} />
              )}
              {page.startsWith("business/") &&
                (business ? (
                  <BusinessDetail
                    business={business}
                    posts={catalog.posts.filter(
                      (p) => Number(p.business_id) === Number(business.id),
                    )}
                    user={user}
                    isFavorite={catalog.favorites
                      .map(Number)
                      .includes(Number(business.id))}
                    onFavorite={() => favorite(Number(business.id))}
                    go={go}
                    notify={notify}
                    requireUser={requireUser}
                    refresh={refresh}
                  />
                ) : (
                  <Empty title="Comercio no disponible">
                    Puede estar pendiente de aprobación o haber sido retirado.
                  </Empty>
                ))}
              {page === "profile" && (
                <div className="profile-layout">
                  <div className="profile-side card">
                    <div className="big-avatar">
                      {user ? user.name.slice(0, 1) : <UserRound />}
                    </div>
                    <h2>{user?.name ?? "Tu lugar en la comunidad"}</h2>
                    <p>
                      {user?.email ??
                        "Guardá favoritos, compartí reseñas y descubrí más."}
                    </p>
                    {user && (
                      <span className="badge">
                        {user.role === "admin"
                          ? "Administrador"
                          : user.role === "merchant"
                            ? "Comercio"
                            : "Visitante"}
                      </span>
                    )}
                    {user && (
                      <button
                        className="text-button"
                        onClick={async () => {
                          try {
                            await api("logout", {});
                            setUser(null);
                            await refresh();
                            go("home");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        <LogOut size={17} /> Cerrar sesión
                      </button>
                    )}
                  </div>
                  <div className="card profile-form">
                    <h1>Mi perfil</h1>
                    {user ? (
                      <>
                        <Editor
                          initial={{ name: user.name }}
                          fields={[
                            { name: "name", label: "Tu nombre" },
                            {
                              name: "current_password",
                              label: "Contraseña actual",
                              type: "password",
                              required: false,
                            },
                            {
                              name: "password",
                              label: "Nueva contraseña",
                              type: "password",
                              required: false,
                              hint: "Solo completá estos dos campos si querés cambiar tu contraseña.",
                            },
                          ]}
                          onSave={async (d) => {
                            const s = await api("profile", d);
                            setUser(s.user);
                            notify("Perfil actualizado");
                          }}
                        />
                        {user.role !== "visitor" && (
                          <button
                            className="outline full"
                            onClick={() => go("admin")}
                          >
                            <LayoutDashboard size={18} />{" "}
                            {user.role === "admin"
                              ? "Panel de administración"
                              : "Gestionar mis comercios"}
                          </button>
                        )}
                      </>
                    ) : (
                      <button className="primary" onClick={() => setAuth(true)}>
                        Ingresar o crear una cuenta
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!["home", "explore", "favorites", "offers", "profile"].includes(
                page,
              ) &&
                !page.startsWith("business/") &&
                !page.startsWith("map") && (
                  <Empty title="Página no encontrada">
                    <button className="primary" onClick={() => go("home")}>
                      Volver al inicio
                    </button>
                  </Empty>
                )}
            </main>
          )}
          <footer className="footer">
            <Logo />
            <span>Conectá con tu local. Conectá con tu comunidad.</span>
            <span>
              © {new Date().getFullYear()} LocalConnect · Proyecto académico
            </span>
          </footer>
        </>
      )}
      <nav className="bottom-nav">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => go("home")}
        >
          <Home />
          Inicio
        </button>
        <button
          className={page === "explore" ? "active" : ""}
          onClick={() => go("explore")}
        >
          <Compass />
          Explorar
        </button>
        <button
          className="publish-nav"
          onClick={() => (user ? go("admin/posts") : setAuth(true))}
        >
          <span>
            <Plus />
          </span>
          Publicar
        </button>
        <button
          className={page === "favorites" ? "active" : ""}
          onClick={() => go("favorites")}
        >
          <Heart />
          Favoritos
        </button>
        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => go("profile")}
        >
          <UserRound />
          Perfil
        </button>
      </nav>
      {auth && (
        <Modal
          title={
            register ? "Sumate a LocalConnect" : "Qué bueno verte de nuevo"
          }
          onClose={() => setAuth(false)}
        >
          <p className="muted">
            {register
              ? "Tu comunidad está a un paso."
              : "Ingresá para guardar tus lugares favoritos y participar."}
          </p>
          <Editor
            key={String(register)}
            fields={[
              ...(register ? [{ name: "name", label: "Nombre completo" }] : []),
              { name: "email", label: "Email", type: "email" },
              {
                name: "password",
                label: "Contraseña",
                type: "password",
                hint: register ? "Al menos 10 caracteres." : undefined,
              },
              ...(register
                ? [
                    {
                      name: "role",
                      label: "Quiero participar como",
                      options: [
                        {
                          value: "visitor",
                          label: "Visitante · descubrir comercios",
                        },
                        {
                          value: "merchant",
                          label: "Comercio · publicar mi negocio",
                        },
                      ],
                    },
                  ]
                : []),
            ]}
            submit={register ? "Crear mi cuenta" : "Iniciar sesión"}
            onSave={async (d) => {
              const r = await api(register ? "register" : "login", d);
              setUser(r.user);
              setAuth(false);
              await refresh();
              notify("¡Bienvenido a LocalConnect!");
            }}
          />
          <button
            className="text-button auth-switch"
            onClick={() => setRegister(!register)}
          >
            {register
              ? "Ya tengo una cuenta"
              : "¿Todavía no tenés cuenta? Registrate"}
          </button>
        </Modal>
      )}
      {notifications && (
        <Modal
          title="Tus notificaciones"
          onClose={() => setNotifications(null)}
        >
          {notifications.length ? (
            notifications.map((n) => (
              <div className="notification" key={n.id}>
                <Bell size={18} />
                <div>
                  <p>{n.message}</p>
                  <small>
                    {new Date(n.created_at).toLocaleDateString("es-AR")} ·{" "}
                    {Number(n.is_read) ? "Leída" : "Nueva"}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <Empty title="Estás al día">
              Las novedades de tu cuenta aparecerán acá.
            </Empty>
          )}
          <button
            className="outline full"
            onClick={async () => {
              try {
                await api("notifications.read", {});
                setNotifications(null);
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            Marcar como leídas
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
function BusinessCard({
  b,
  favorite,
  onFavorite,
  onOpen,
}: {
  b: Business;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="business-card">
      <div className="card-photo">
        <button
          className="photo-link"
          onClick={onOpen}
          aria-label={"Ver " + b.name}
        >
          <Picture src={b.image} alt={b.name} />
        </button>
        <button
          className={"heart-button " + (favorite ? "saved" : "")}
          onClick={onFavorite}
          aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          aria-pressed={favorite}
        >
          <Heart size={19} />
        </button>
        {b.node_id && (
          <span className="indoor-badge">
            <Navigation size={11} /> Mapa interior
          </span>
        )}
      </div>
      <button className="business-info" onClick={onOpen}>
        <span className="business-category">{b.category}</span>
        <h3>
          {b.name}
          <ArrowUpRight size={16} />
        </h3>
        <p>
          <MapPin size={13} />
          {b.gallery || b.address}
        </p>
        <div className="card-bottom">
          <span className="rating">
            <Star size={14} fill="currentColor" />
            {b.rating ? Number(b.rating).toFixed(1) : "Nuevo"}{" "}
            <small>
              {Number(b.review_count) > 0 ? `(${b.review_count})` : ""}
            </small>
          </span>
          <span className="local-label">Comercio local</span>
        </div>
      </button>
    </article>
  );
}
function PostCard({ p, onOpen }: { p: Post; onOpen: () => void }) {
  return (
    <article className="post-card card">
      {p.image && <Picture src={p.image} alt={p.title} />}
      <div>
        <span className="eyebrow">
          {p.type === "promotion"
            ? "PROMOCIÓN"
            : p.type === "product"
              ? "PRODUCTO"
              : "NOVEDAD"}{" "}
          · {p.business_name}
        </span>
        <h3>{p.title}</h3>
        <p>{p.content}</p>
        {p.price !== null && (
          <strong className="price">{money(p.price)}</strong>
        )}
        {p.expires_at && <small>Válido hasta {p.expires_at}</small>}
        <button className="text-button" onClick={onOpen}>
          Ver comercio <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
function BusinessDetail({
  business: b,
  posts,
  user,
  isFavorite,
  onFavorite,
  go,
  notify,
  requireUser,
  refresh,
}: {
  business: Business;
  posts: Post[];
  user: User | null;
  isFavorite: boolean;
  onFavorite: () => void;
  go: (p: string) => void;
  notify: (m: string) => void;
  requireUser: () => boolean;
  refresh: () => Promise<void>;
}) {
  const [reviews, setReviews] = useState<Review[]>([]),
    [modal, setModal] = useState<"review" | "report" | null>(null),
    [reportReview, setReportReview] = useState<number | null>(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const d = await api("business&id=" + b.id);
      setReviews(d.reviews);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [b.id]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <>
      <div className="detail-top">
        <button className="text-button" onClick={() => go("explore")}>
          <ChevronLeft size={18} /> Volver a explorar
        </button>
        <div>
          <button
            className={"icon-button " + (isFavorite ? "purple" : "")}
            onClick={onFavorite}
            aria-label="Favorito"
          >
            <Heart fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button
            className="icon-button"
            aria-label="Compartir comercio"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(location.href);
                notify("Enlace copiado");
              } catch {
                notify("Copiá el enlace desde la barra de direcciones.");
              }
            }}
          >
            <Share2 />
          </button>
        </div>
      </div>
      <div className="detail-cover">
        <Picture src={b.image} alt={b.name} />
        <div className="cover-shade" />
        <div className="cover-info">
          <span className="badge">{b.category}</span>
          <h1>{b.name}</h1>
          <p>{b.gallery || b.address}</p>
        </div>
      </div>
      <div className="detail-stats card">
        <div>
          <Star className="gold" />
          <strong>{b.rating ? Number(b.rating).toFixed(1) : "Nuevo"}</strong>
          <span>{b.review_count} reseñas</span>
        </div>
        <div>
          <Store />
          <strong>{b.category}</strong>
          <span>Comercio local</span>
        </div>
        <div>
          <MapPin />
          <strong>{b.floor || "Ubicación exterior"}</strong>
          <span>{b.location || b.address}</span>
        </div>
        <div>
          <Ticket />
          <strong>{b.price_level}</strong>
          <span>Rango de precios</span>
        </div>
      </div>
      <div className="detail-actions">
        {b.phone ? (
          <>
            <a
              className="primary"
              href={"https://wa.me/" + b.phone.replace(/\D/g, "")}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={19} /> Contactar
            </a>
            <a className="outline" href={"tel:" + b.phone}>
              <Phone size={19} /> Llamar
            </a>
          </>
        ) : (
          <span className="muted">Contacto de demostración sin teléfono.</span>
        )}
        {b.node_id && (
          <button className="primary" onClick={() => go("map?to=" + b.node_id)}>
            <Navigation size={19} /> Cómo llegar al local
          </button>
        )}
        <button
          className="outline"
          onClick={() => {
            if (requireUser()) {
              setReportReview(null);
              setModal("report");
            }
          }}
        >
          <Flag size={17} /> Reportar
        </button>
      </div>
      <div className="detail-columns">
        <section className="card info-card">
          <h2>Conocé este comercio</h2>
          <p>{b.description}</p>
          <hr />
          <div>
            <MapPin />
            <span>
              <strong>Dirección</strong>
              {b.address}
              <a
                className="text-button"
                href={
                  "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent(b.address)
                }
                target="_blank"
                rel="noreferrer"
              >
                Consultar ubicación exterior <ArrowUpRight size={14} />
              </a>
            </span>
          </div>
          <div>
            <Clock />
            <span>
              <strong>Horario de atención</strong>
              {b.hours}
            </span>
          </div>
          {b.phone && (
            <div>
              <Phone />
              <a href={"tel:" + b.phone}>{b.phone}</a>
            </div>
          )}
          {b.instagram && (
            <div>
              <Mail />
              <a
                target="_blank"
                rel="noreferrer"
                href={"https://instagram.com/" + b.instagram.replace(/^@/, "")}
              >
                @{b.instagram.replace(/^@/, "")}
              </a>
            </div>
          )}
          {b.website && (
            <div>
              <Globe />
              <a href={b.website} target="_blank" rel="noreferrer">
                Visitar sitio web <ArrowUpRight size={14} />
              </a>
            </div>
          )}
        </section>
        <div>
          <div className="card route-promo">
            <div className="route-icon">
              <MapIcon size={36} />
            </div>
            <span className="eyebrow">CADA PASO, MÁS CERCA</span>
            <h2>
              Del acceso
              <br />a tu comercio.
            </h2>
            <p>
              Ubicá el local en el plano y encontrá un recorrido desde una
              entrada o punto QR.
            </p>
            {b.node_id ? (
              <button
                className="primary"
                onClick={() => go("map?to=" + b.node_id)}
              >
                Abrir plano interior <ArrowRight size={18} />
              </button>
            ) : (
              <a
                className="primary"
                target="_blank"
                rel="noreferrer"
                href={
                  "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent(b.address)
                }
              >
                Ver ubicación exterior
              </a>
            )}
          </div>
          <div className="demo-note">
            Datos iniciales de demostración. No representan un establecimiento
            verificado.
          </div>
        </div>
      </div>
      {posts.length > 0 && (
        <>
          <SectionTitle title="Novedades y productos" />
          <div className="posts-grid">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                p={p}
                onOpen={() => go("business/" + b.id)}
              />
            ))}
          </div>
        </>
      )}
      <SectionTitle
        title="La comunidad cuenta"
        action={
          reviews.some((r) => Number(r.user_id) === Number(user?.id))
            ? "Editar mi reseña"
            : "Escribir una reseña"
        }
        onAction={() => {
          if (requireUser()) setModal("review");
        }}
      />
      {error && <p className="error">{error}</p>}
      <div className="review-grid">
        {reviews.map((r) => (
          <article className="card review" key={r.id}>
            <div>
              <span className="avatar">{r.name.slice(0, 1)}</span>
              <strong>{r.name}</strong>
              <span className="gold">{"★".repeat(Number(r.rating))}</span>
            </div>
            <p>{r.comment}</p>
            <small>{new Date(r.created_at).toLocaleDateString("es-AR")}</small>
            <button
              className="text-button"
              onClick={() => {
                if (requireUser()) {
                  setReportReview(Number(r.id));
                  setModal("report");
                }
              }}
            >
              Reportar reseña
            </button>
          </article>
        ))}
      </div>
      {!reviews.length && (
        <Empty title="La primera opinión puede ser la tuya">
          Compartí tu experiencia con la comunidad.
        </Empty>
      )}
      {modal && (
        <Modal
          title={
            modal === "review" ? "Tu experiencia importa" : "Reportar contenido"
          }
          onClose={() => setModal(null)}
        >
          <Editor
            initial={
              modal === "review"
                ? {
                    ...reviews.find(
                      (r) => Number(r.user_id) === Number(user?.id),
                    ),
                    rating:
                      reviews.find(
                        (r) => Number(r.user_id) === Number(user?.id),
                      )?.rating ?? 5,
                  }
                : {}
            }
            fields={
              modal === "review"
                ? [
                    {
                      name: "rating",
                      label: "Valoración",
                      options: [5, 4, 3, 2, 1].map((n) => ({
                        value: n,
                        label: `${n} estrellas`,
                      })),
                    },
                    {
                      name: "comment",
                      label: "Contanos tu experiencia",
                      type: "textarea",
                      max: 2000,
                    },
                  ]
                : [
                    {
                      name: "reason",
                      label: "Motivo del reporte",
                      type: "textarea",
                      max: 2000,
                    },
                  ]
            }
            submit={modal === "review" ? "Publicar reseña" : "Enviar reporte"}
            onSave={async (d) => {
              await api(modal, {
                ...d,
                business_id: b.id,
                review_id: reportReview,
              });
              await load();
              await refresh();
              setModal(null);
              notify(
                modal === "review"
                  ? "Reseña guardada"
                  : "Reporte enviado a administración",
              );
            }}
          />
        </Modal>
      )}
    </>
  );
}
