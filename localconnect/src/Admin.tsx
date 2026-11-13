import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Store,
  Users,
  FileText,
  Tags,
  Flag,
  MessageCircle,
  Map,
  Layers,
  MapPin,
  GitBranch,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Check,
  ChevronRight,
  ArrowUpRight,
  Shield,
  Search,
  ExternalLink,
  Settings,
  LogOut,
} from "lucide-react";
import { api } from "./api";
import type { Business, Catalog, MapData, Post, User } from "./types";
import {
  Editor,
  Empty,
  Modal,
  Picture,
  SectionTitle,
  type Field,
  money,
} from "./ui";
const blankMap: MapData = { galleries: [], floors: [], nodes: [], edges: [] };
type Edit = {
  title: string;
  action: string;
  fields: Field[];
  initial?: Record<string, any>;
};
const opts = (list: any[], label = "name") =>
  list.map((x) => ({ value: x.id, label: x[label] }));
export default function Admin({
  user,
  catalog,
  refresh,
  notify,
  onLogin,
  go,
}: {
  user: User | null;
  catalog: Catalog;
  refresh: () => Promise<void>;
  notify: (m: string) => void;
  onLogin: () => void;
  go: (p: string) => void;
}) {
  const tab = location.hash.split("/")[1] || "dashboard";
  const [manage, setManage] = useState<{
      businesses: Business[];
      posts: Post[];
    }>({ businesses: [], posts: [] }),
    [adminData, setAdminData] = useState<any>({
      users: [],
      reports: [],
      reviews: [],
      stats: {},
    }),
    [map, setMap] = useState<MapData>(blankMap),
    [edit, setEdit] = useState<Edit | null>(null),
    [confirm, setConfirm] = useState<{
      title: string;
      action: string;
      data: any;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState("");
  const isAdmin = user?.role === "admin";
  const load = useCallback(async () => {
    if (!user || user.role === "visitor") {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const [m, mp, a] = await Promise.all([
        api("manage"),
        api<MapData>("map"),
        isAdmin ? api("admin") : Promise.resolve(null),
      ]);
      setManage(m);
      setMap(mp);
      if (a) setAdminData(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);
  useEffect(() => {
    load();
  }, [load]);
  const mutate = async (action: string, data: any) => {
    await api(action, data);
    await Promise.all([load(), refresh()]);
    notify("Cambios guardados");
  };
  const run = async (action: string, data: any) => {
    try {
      await mutate(action, data);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const businessEditor = (b?: Business) =>
    setEdit({
      title: b ? "Editar comercio" : "Agregar comercio",
      action: "business.save",
      initial: b ?? {
        price_level: "$$",
        status: "approved",
        category_id: catalog.categories[0]?.id,
      },
      fields: [
        { name: "name", label: "Nombre", max: 120 },
        {
          name: "category_id",
          label: "Categoría",
          options: opts(catalog.categories),
        },
        { name: "description", label: "Descripción", type: "textarea" },
        { name: "address", label: "Dirección" },
        {
          name: "phone",
          label: "WhatsApp / teléfono",
          hint: "Formato internacional, por ejemplo +543811234567.",
          required: false,
        },
        { name: "hours", label: "Horario de atención" },
        {
          name: "node_id",
          label: "Ubicación en el plano",
          required: false,
          options: [
            { value: "", label: "Sin ubicación interior" },
            ...opts(
              map.nodes.filter((n) => n.kind === "shop"),
              "label",
            ),
          ],
        },
        { name: "image", label: "URL de imagen", type: "url", required: false },
        { name: "instagram", label: "Usuario de Instagram", required: false },
        { name: "website", label: "Sitio web", type: "url", required: false },
        {
          name: "price_level",
          label: "Rango de precios",
          options: ["$", "$$", "$$$"].map((value) => ({ value, label: value })),
        },
        ...(isAdmin
          ? [
              {
                name: "status",
                label: "Estado",
                options: [
                  { value: "approved", label: "Aprobado" },
                  { value: "pending", label: "Pendiente" },
                  { value: "rejected", label: "Rechazado" },
                ],
              },
            ]
          : []),
      ],
    });
  const postEditor = (p?: Post) =>
    setEdit({
      title: p ? "Editar publicación" : "Crear publicación",
      action: "post.save",
      initial: p ?? {
        business_id: manage.businesses[0]?.id,
        type: "promotion",
        status: "published",
      },
      fields: [
        {
          name: "business_id",
          label: "Comercio",
          options: opts(manage.businesses),
        },
        {
          name: "type",
          label: "Tipo",
          options: [
            { value: "promotion", label: "Promoción" },
            { value: "news", label: "Novedad" },
            { value: "product", label: "Producto" },
          ],
        },
        { name: "title", label: "Título", max: 160 },
        { name: "content", label: "Descripción", type: "textarea" },
        {
          name: "price",
          label: "Precio (ARS)",
          type: "number",
          min: 0,
          required: false,
        },
        { name: "image", label: "URL de imagen", type: "url", required: false },
        {
          name: "expires_at",
          label: "Fecha de vencimiento",
          type: "date",
          required: false,
        },
        {
          name: "status",
          label: "Visibilidad",
          options: [
            { value: "published", label: "Publicada" },
            { value: "hidden", label: "Oculta" },
          ],
        },
      ],
    });
  const galleryEditor = (g?: any) =>
    setEdit({
      title: g ? "Editar galería" : "Nueva galería",
      action: "gallery.save",
      initial: g ?? { simulated: 1 },
      fields: [
        { name: "name", label: "Nombre" },
        { name: "address", label: "Dirección" },
        { name: "description", label: "Descripción", type: "textarea" },
        {
          name: "simulated",
          label: "Escenario simulado de demostración",
          type: "checkbox",
        },
      ],
    });
  const floorEditor = (f?: any) =>
    setEdit({
      title: f ? "Editar piso" : "Agregar piso",
      action: "floor.save",
      initial: f ?? { gallery_id: map.galleries[0]?.id, level: 0 },
      fields: [
        { name: "gallery_id", label: "Galería", options: opts(map.galleries) },
        { name: "name", label: "Nombre del piso" },
        { name: "level", label: "Nivel (0 = planta baja)", type: "number" },
      ],
    });
  const nodeEditor = (n?: any) =>
    setEdit({
      title: n ? "Editar punto del plano" : "Agregar punto",
      action: "node.save",
      initial: n ?? {
        floor_id: map.floors[0]?.id,
        kind: "shop",
        x: 450,
        y: 280,
      },
      fields: [
        {
          name: "floor_id",
          label: "Piso",
          options: map.floors.map((f) => ({
            value: f.id,
            label: `${map.galleries.find((g) => Number(g.id) === Number(f.gallery_id))?.name} · ${f.name}`,
          })),
        },
        { name: "label", label: "Etiqueta", max: 120 },
        {
          name: "kind",
          label: "Tipo de punto",
          options: [
            { value: "shop", label: "Local comercial" },
            { value: "entry", label: "Entrada" },
            { value: "hall", label: "Pasillo / hall" },
            { value: "stairs", label: "Escalera" },
            { value: "elevator", label: "Ascensor" },
            { value: "reference", label: "Referencia / QR" },
          ],
        },
        {
          name: "x",
          label: "Coordenada X (30 a 870)",
          type: "number",
          min: 30,
          max: 870,
        },
        {
          name: "y",
          label: "Coordenada Y (30 a 530)",
          type: "number",
          min: 30,
          max: 530,
        },
      ],
    });
  const edgeEditor = (e?: any) =>
    setEdit({
      title: e ? "Editar conexión" : "Conectar dos puntos",
      action: "edge.save",
      initial: e ?? {
        from_id: map.nodes[0]?.id,
        to_id: map.nodes[1]?.id,
        distance: 10,
        accessible: 1,
        active: 1,
      },
      fields: [
        { name: "from_id", label: "Desde", options: opts(map.nodes, "label") },
        { name: "to_id", label: "Hasta", options: opts(map.nodes, "label") },
        {
          name: "distance",
          label: "Distancia en metros",
          type: "number",
          min: 1,
          max: 10000,
        },
        {
          name: "accessible",
          label: "Tramo accesible sin escaleras",
          type: "checkbox",
        },
        { name: "active", label: "Conexión habilitada", type: "checkbox" },
      ],
    });
  const menus = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "businesses",
      label: isAdmin ? "Comercios" : "Mis comercios",
      icon: Store,
    },
    { id: "posts", label: "Publicaciones", icon: FileText },
    ...(isAdmin
      ? [
          { id: "users", label: "Usuarios", icon: Users },
          { id: "categories", label: "Categorías", icon: Tags },
          { id: "reports", label: "Reportes", icon: Flag },
          { id: "reviews", label: "Reseñas", icon: MessageCircle },
          { id: "galleries", label: "Galerías", icon: Map },
          { id: "floors", label: "Pisos", icon: Layers },
          { id: "nodes", label: "Puntos y códigos QR", icon: MapPin },
          { id: "edges", label: "Conexiones del plano", icon: GitBranch },
          { id: "notifications", label: "Notificaciones", icon: Bell },
        ]
      : []),
  ];
  const stats = isAdmin
    ? adminData.stats
    : {
        businesses: manage.businesses.length,
        posts: manage.posts.length,
        pending: manage.businesses.filter((b) => b.status === "pending").length,
      };
  if (!user)
    return (
      <main className="shell">
        <Empty title="Ingresá para gestionar tus comercios">
          <button className="primary" onClick={onLogin}>
            Iniciar sesión
          </button>
        </Empty>
      </main>
    );
  if (user.role === "visitor")
    return (
      <main className="shell">
        <Empty title="Este panel es para comercios y administradores">
          Tu cuenta es de visitante. Podés crear una cuenta de comercio con otro
          email o solicitar a la administración el cambio de rol.
        </Empty>
      </main>
    );
  const filtered = manage.businesses.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-side-title">
          <Shield size={17} />
          {isAdmin ? "ADMINISTRACIÓN" : "MI COMERCIO"}
        </div>
        <nav>
          {menus.map((m) => (
            <button
              key={m.id}
              className={tab === m.id ? "active" : ""}
              onClick={() => {
                go("admin/" + m.id);
                setSearch("");
              }}
            >
              <m.icon size={19} />
              {m.label}
              {m.id === "reports" && Number(adminData.stats.reports) > 0 && (
                <span className="count">{adminData.stats.reports}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-side-bottom">
          <span className="avatar">{user.name.slice(0, 1)}</span>
          <strong>{user.name}</strong>
          <small>
            {isAdmin ? "Gestión de la plataforma" : "Tu negocio, más visible"}
          </small>
          <button onClick={() => go("home")}>
            Volver al sitio <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-breadcrumb">
          LocalConnect <ChevronRight size={13} /> Panel{" "}
          <ChevronRight size={13} />
          <span>{menus.find((m) => m.id === tab)?.label}</span>
        </div>
        {error && (
          <p className="error">
            {error} <button onClick={load}>Reintentar</button>
          </p>
        )}
        {loading ? (
          <Empty title="Cargando tu panel…" />
        ) : (
          <>
            {tab === "dashboard" && (
              <>
                <div className="page-heading">
                  <span className="eyebrow">TODO LO QUE PASA, EN UN LUGAR</span>
                  <h1>
                    ¡Hola, {user.name.split(" ")[0]}!{" "}
                    <span className="wave">✦</span>
                  </h1>
                  <p>Este es el resumen de tu comunidad LocalConnect.</p>
                </div>
                <div className="stats-grid">
                  {[
                    {
                      key: "businesses",
                      label: "Comercios",
                      icon: Store,
                      color: "purple",
                      tab: "businesses",
                    },
                    ...(isAdmin
                      ? [
                          {
                            key: "users",
                            label: "Usuarios",
                            icon: Users,
                            color: "green",
                            tab: "users",
                          },
                        ]
                      : []),
                    {
                      key: "posts",
                      label: "Publicaciones",
                      icon: FileText,
                      color: "orange",
                      tab: "posts",
                    },
                    ...(isAdmin
                      ? [
                          {
                            key: "reports",
                            label: "Reportes pendientes",
                            icon: Flag,
                            color: "pink",
                            tab: "reports",
                          },
                        ]
                      : [
                          {
                            key: "pending",
                            label: "Pendientes de aprobación",
                            icon: Shield,
                            color: "pink",
                            tab: "businesses",
                          },
                        ]),
                  ].map((s) => (
                    <button
                      className="stat-card card"
                      key={s.key}
                      onClick={() => go("admin/" + s.tab)}
                    >
                      <span className={"stat-icon " + s.color}>
                        <s.icon size={25} />
                      </span>
                      <span>{s.label}</span>
                      <strong>{stats[s.key] ?? 0}</strong>
                      <small>
                        Ver detalle <ArrowUpRight size={13} />
                      </small>
                    </button>
                  ))}
                </div>
                <div className="dashboard-columns">
                  <section className="card">
                    <SectionTitle
                      title="Comercios recientes"
                      action="Ver todos"
                      onAction={() => go("admin/businesses")}
                    />
                    {manage.businesses.slice(0, 5).map((b) => (
                      <div className="activity-row" key={b.id}>
                        <Picture src={b.image} alt={b.name} />
                        <div>
                          <strong>{b.name}</strong>
                          <small>{b.category}</small>
                        </div>
                        <Status value={b.status} />
                      </div>
                    ))}
                  </section>
                  <section className="card">
                    <SectionTitle title="Tu plataforma, en números" />
                    <div className="distribution">
                      {catalog.categories.map((c, i) => {
                        const count = manage.businesses.filter(
                          (b) => Number(b.category_id) === Number(c.id),
                        ).length;
                        return (
                          <div key={c.id}>
                            <div>
                              <span>{c.name}</span>
                              <strong>{count}</strong>
                            </div>
                            <div className="bar-track">
                              <i
                                style={{
                                  width: `${manage.businesses.length ? (count / manage.businesses.length) * 100 : 0}%`,
                                  background: [
                                    "#7750ed",
                                    "#b59afa",
                                    "#43c5a6",
                                    "#f1b258",
                                    "#68b9ed",
                                    "#e69ec7",
                                  ][i % 6],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <small className="muted">
                      Distribución de los comercios registrados por categoría.
                    </small>
                  </section>
                </div>
                <section className="card quick-actions">
                  <SectionTitle title="Un paso adelante" />
                  <div>
                    <button onClick={() => businessEditor()}>
                      <Store />
                      <strong>Agregar comercio</strong>
                      <span>Dale un lugar a un negocio</span>
                    </button>
                    <button
                      onClick={() =>
                        manage.businesses.length
                          ? postEditor()
                          : notify("Primero registrá un comercio")
                      }
                    >
                      <Tags />
                      <strong>Crear publicación</strong>
                      <span>Compartí una novedad</span>
                    </button>
                    <button onClick={() => go("map")}>
                      <Map />
                      <strong>Explorar los planos</strong>
                      <span>Probá los recorridos</span>
                    </button>
                    {isAdmin && (
                      <button onClick={() => go("admin/reports")}>
                        <Flag />
                        <strong>Revisar reportes</strong>
                        <span>Cuidá la comunidad</span>
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}
            {tab === "businesses" && (
              <>
                <SectionTitle
                  eyebrow="GESTIÓN COMERCIAL"
                  title={isAdmin ? "Todos los comercios" : "Mis comercios"}
                  action="Agregar comercio"
                  onAction={() => businessEditor()}
                />
                <div className="search-box compact">
                  <Search size={18} />
                  <input
                    aria-label="Buscar en comercios"
                    placeholder="Buscar comercio…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {!isAdmin && (
                  <p className="notice">
                    Los nuevos comercios y sus cambios se revisan antes de
                    aparecer en el directorio público.
                  </p>
                )}
                <div className="table-wrap card">
                  <table>
                    <thead>
                      <tr>
                        <th>Comercio</th>
                        <th>Categoría</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <div className="table-business">
                              <Picture src={b.image} alt={b.name} />
                              <div>
                                <strong>{b.name}</strong>
                                <small>{b.address}</small>
                              </div>
                            </div>
                          </td>
                          <td>{b.category}</td>
                          <td>
                            <Status value={b.status} />
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                aria-label={"Editar " + b.name}
                                onClick={() => businessEditor(b)}
                              >
                                <Pencil size={16} />
                              </button>
                              {b.status === "approved" && (
                                <button
                                  aria-label="Ver comercio"
                                  onClick={() => go("business/" + b.id)}
                                >
                                  <ExternalLink size={16} />
                                </button>
                              )}
                              {isAdmin && (
                                <select
                                  aria-label={"Estado de " + b.name}
                                  value={b.status}
                                  onChange={(e) =>
                                    run("business.status", {
                                      id: b.id,
                                      status: e.target.value,
                                    })
                                  }
                                >
                                  <option value="approved">Aprobado</option>
                                  <option value="pending">Pendiente</option>
                                  <option value="rejected">Rechazado</option>
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <Empty title="Todavía no hay comercios">
                      <button
                        className="primary"
                        onClick={() => businessEditor()}
                      >
                        Registrar comercio
                      </button>
                    </Empty>
                  )}
                </div>
              </>
            )}
            {tab === "posts" && (
              <>
                <SectionTitle
                  eyebrow="HACÉ CIRCULAR LAS NOVEDADES"
                  title="Publicaciones y promociones"
                  action="Crear publicación"
                  onAction={() =>
                    manage.businesses.length
                      ? postEditor()
                      : notify("Primero registrá un comercio")
                  }
                />
                <div className="table-wrap card">
                  <table>
                    <thead>
                      <tr>
                        <th>Publicación</th>
                        <th>Tipo</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manage.posts.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.title}</strong>
                            <small>{p.business_name}</small>
                          </td>
                          <td>
                            {
                              {
                                promotion: "Promoción",
                                news: "Novedad",
                                product: "Producto",
                              }[p.type]
                            }
                          </td>
                          <td>{p.price === null ? "—" : money(p.price)}</td>
                          <td>
                            <Status value={p.status} />
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                aria-label="Editar publicación"
                                onClick={() => postEditor(p)}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                aria-label="Eliminar publicación"
                                onClick={() =>
                                  setConfirm({
                                    title: "Eliminar “" + p.title + "”",
                                    action: "post.delete",
                                    data: { id: p.id },
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!manage.posts.length && (
                    <Empty title="Tu próxima novedad empieza acá" />
                  )}
                </div>
              </>
            )}
            {isAdmin && tab === "users" && (
              <>
                <SectionTitle title="Usuarios de la comunidad" />
                <div className="table-wrap card">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminData.users.map((u: any) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                            <small>{u.email}</small>
                          </td>
                          <td>
                            {
                              {
                                admin: "Administrador",
                                merchant: "Comercio",
                                visitor: "Visitante",
                              }[u.role as string]
                            }
                          </td>
                          <td>
                            <Status
                              value={Number(u.active) ? "active" : "inactive"}
                            />
                          </td>
                          <td>
                            {Number(u.id) !== Number(user.id) && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  setEdit({
                                    title: "Editar usuario",
                                    action: "user.update",
                                    initial: u,
                                    fields: [
                                      {
                                        name: "role",
                                        label: "Rol",
                                        options: [
                                          {
                                            value: "visitor",
                                            label: "Visitante",
                                          },
                                          {
                                            value: "merchant",
                                            label: "Comercio",
                                          },
                                          {
                                            value: "admin",
                                            label: "Administrador",
                                          },
                                        ],
                                      },
                                      {
                                        name: "active",
                                        label: "Cuenta habilitada",
                                        type: "checkbox",
                                      },
                                    ],
                                  })
                                }
                              >
                                <Pencil size={15} /> Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {isAdmin && tab === "categories" && (
              <>
                <SectionTitle
                  title="Categorías"
                  action="Nueva categoría"
                  onAction={() =>
                    setEdit({
                      title: "Crear categoría",
                      action: "category.save",
                      fields: [{ name: "name", label: "Nombre", max: 80 }],
                    })
                  }
                />
                <div className="category-admin-grid">
                  {catalog.categories.map((c) => (
                    <div className="card category-admin" key={c.id}>
                      <Tags />
                      <strong>{c.name}</strong>
                      <button
                        className="icon-button"
                        aria-label="Editar categoría"
                        onClick={() =>
                          setEdit({
                            title: "Editar categoría",
                            action: "category.save",
                            initial: c,
                            fields: [
                              { name: "name", label: "Nombre", max: 80 },
                            ],
                          })
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Eliminar categoría"
                        onClick={() =>
                          setConfirm({
                            title: "Eliminar categoría " + c.name,
                            action: "category.delete",
                            data: { id: c.id },
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {isAdmin && tab === "reports" && (
              <>
                <SectionTitle title="Reportes de la comunidad" />
                <div className="report-list">
                  {adminData.reports.map((r: any) => (
                    <article className="card report" key={r.id}>
                      <span className="stat-icon pink">
                        <Flag />
                      </span>
                      <div>
                        <h3>
                          {r.business_name}
                          {r.review_id ? " · Reseña #" + r.review_id : ""}
                        </h3>
                        <p>{r.reason}</p>
                        <small>
                          Enviado por {r.user_name} · {r.created_at}
                        </small>
                      </div>
                      <Status value={r.status} />
                      {r.status === "pending" && (
                        <button
                          className="outline"
                          onClick={() => run("report.resolve", { id: r.id })}
                        >
                          <Check size={16} /> Resolver
                        </button>
                      )}
                    </article>
                  ))}
                </div>
                {!adminData.reports.length && (
                  <Empty title="No hay reportes para revisar" />
                )}
              </>
            )}
            {isAdmin && tab === "reviews" && (
              <>
                <SectionTitle title="Moderación de reseñas" />
                {adminData.reviews.map((r: any) => (
                  <article className="card report" key={r.id}>
                    <MessageCircle />
                    <div>
                      <h3>
                        {r.business_name} · {r.rating} estrellas
                      </h3>
                      <p>{r.comment}</p>
                      <small>{r.name}</small>
                    </div>
                    <Status value={r.status} />
                    <button
                      className="outline"
                      onClick={() =>
                        run("review.moderate", {
                          id: r.id,
                          status:
                            r.status === "published" ? "hidden" : "published",
                        })
                      }
                    >
                      {r.status === "published" ? "Ocultar" : "Restaurar"}
                    </button>
                  </article>
                ))}
              </>
            )}
            {isAdmin && tab === "galleries" && (
              <>
                <SectionTitle
                  title="Galerías comerciales"
                  action="Nueva galería"
                  onAction={() => galleryEditor()}
                />
                {map.galleries.map((g) => (
                  <div className="card report" key={g.id}>
                    <Map />
                    <div>
                      <h3>{g.name}</h3>
                      <p>{g.description}</p>
                      <small>
                        {g.address} ·{" "}
                        {Number(g.simulated) ? "Simulada" : "Real"}
                      </small>
                    </div>
                    <button
                      className="outline"
                      onClick={() => galleryEditor(g)}
                    >
                      <Pencil size={16} /> Editar
                    </button>
                  </div>
                ))}
              </>
            )}
            {isAdmin && tab === "floors" && (
              <>
                <SectionTitle
                  title="Pisos de las galerías"
                  action="Agregar piso"
                  onAction={() => floorEditor()}
                />
                {map.floors.map((f) => (
                  <div className="card report" key={f.id}>
                    <Layers />
                    <div>
                      <h3>{f.name}</h3>
                      <p>
                        {
                          map.galleries.find(
                            (g) => Number(g.id) === Number(f.gallery_id),
                          )?.name
                        }{" "}
                        · Nivel {f.level}
                      </p>
                    </div>
                    <button className="outline" onClick={() => floorEditor(f)}>
                      <Pencil size={16} /> Editar
                    </button>
                  </div>
                ))}
              </>
            )}
            {isAdmin && tab === "nodes" && (
              <>
                <SectionTitle
                  title="Puntos, locales y referencias QR"
                  action="Agregar punto"
                  onAction={() => nodeEditor()}
                />
                <p className="notice">
                  Cada punto se coloca sobre un plano de 900 × 560 unidades.
                  Conectalo en “Conexiones del plano” para que forme parte de
                  los recorridos. El botón QR abre su punto de origen para
                  descargar el código.
                </p>
                <div className="table-wrap card">
                  <table>
                    <thead>
                      <tr>
                        <th>Punto</th>
                        <th>Piso</th>
                        <th>Tipo</th>
                        <th>Posición</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {map.nodes.map((n) => (
                        <tr key={n.id}>
                          <td>
                            <strong>{n.label}</strong>
                          </td>
                          <td>
                            {
                              map.floors.find(
                                (f) => Number(f.id) === Number(n.floor_id),
                              )?.name
                            }
                          </td>
                          <td>
                            {
                              {
                                shop: "Local",
                                entry: "Entrada",
                                hall: "Pasillo",
                                stairs: "Escalera",
                                elevator: "Ascensor",
                                reference: "Referencia",
                              }[n.kind]
                            }
                          </td>
                          <td>
                            {n.x}, {n.y}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                aria-label="Editar punto"
                                onClick={() => nodeEditor(n)}
                              >
                                <Pencil size={16} />
                              </button>
                              <button onClick={() => go("map?from=" + n.id)}>
                                QR
                              </button>
                              <button
                                aria-label="Eliminar punto"
                                onClick={() =>
                                  setConfirm({
                                    title:
                                      "Eliminar punto y sus conexiones: " +
                                      n.label,
                                    action: "node.delete",
                                    data: { id: n.id },
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {isAdmin && tab === "edges" && (
              <>
                <SectionTitle
                  title="Conexiones transitables"
                  action="Conectar puntos"
                  onAction={() => edgeEditor()}
                />
                <p className="notice">
                  Las conexiones son bidireccionales. Deshabilitá un tramo para
                  simular un pasillo cerrado; los recorridos se recalculan sin
                  usarlo.
                </p>
                <div className="table-wrap card">
                  <table>
                    <thead>
                      <tr>
                        <th>Desde → Hasta</th>
                        <th>Distancia</th>
                        <th>Accesible</th>
                        <th>Habilitada</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {map.edges.map((e) => (
                        <tr key={e.id}>
                          <td>
                            {
                              map.nodes.find(
                                (n) => Number(n.id) === Number(e.from_id),
                              )?.label
                            }
                            <small>
                              →{" "}
                              {
                                map.nodes.find(
                                  (n) => Number(n.id) === Number(e.to_id),
                                )?.label
                              }
                            </small>
                          </td>
                          <td>{e.distance} m</td>
                          <td>{Number(e.accessible) ? "Sí" : "No"}</td>
                          <td>{Number(e.active) ? "Sí" : "No"}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                aria-label="Editar conexión"
                                onClick={() => edgeEditor(e)}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                aria-label="Eliminar conexión"
                                onClick={() =>
                                  setConfirm({
                                    title: "Eliminar esta conexión",
                                    action: "edge.delete",
                                    data: { id: e.id },
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {isAdmin && tab === "notifications" && (
              <>
                <SectionTitle title="Enviar notificación" />
                <div className="card notification-editor">
                  <p>
                    El mensaje aparecerá dentro de LocalConnect para los
                    destinatarios seleccionados.
                  </p>
                  <Editor
                    fields={[
                      {
                        name: "user_id",
                        label: "Destinatario",
                        options: [
                          { value: "", label: "Todos los usuarios activos" },
                          ...adminData.users.map((u: any) => ({
                            value: u.id,
                            label: u.name + " · " + u.email,
                          })),
                        ],
                        required: false,
                      },
                      {
                        name: "message",
                        label: "Mensaje",
                        type: "textarea",
                        max: 500,
                      },
                    ]}
                    onSave={async (d) => {
                      await mutate("notifications.send", d);
                    }}
                    submit="Enviar notificación"
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>
      {edit && (
        <Modal title={edit.title} onClose={() => setEdit(null)}>
          <Editor
            fields={edit.fields}
            initial={edit.initial}
            onSave={async (d) => {
              await mutate(edit.action, d);
              setEdit(null);
            }}
          />
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p>Esta operación elimina el registro. Confirmá para continuar.</p>
          <Editor
            fields={[]}
            submit="Confirmar eliminación"
            onSave={async () => {
              await mutate(confirm.action, confirm.data);
              setConfirm(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={"status " + value}>
      {{
        approved: "Aprobado",
        pending: "Pendiente",
        rejected: "Rechazado",
        published: "Publicada",
        hidden: "Oculta",
        active: "Activa",
        inactive: "Desactivada",
        resolved: "Resuelto",
      }[value] ?? value}
    </span>
  );
}
