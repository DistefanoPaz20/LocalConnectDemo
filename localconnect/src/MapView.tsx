import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Layers,
  MapPin,
  Navigation,
  QrCode,
  Route as RouteIcon,
  Accessibility,
  ZoomIn,
  ZoomOut,
  Info,
} from "lucide-react";
import QRCode from "qrcode";
import { api } from "./api";
import type { Business, MapData, MapNode, Route } from "./types";
import { Empty, Modal } from "./ui";
export default function MapView({
  businesses,
  go,
}: {
  businesses: Business[];
  go: (p: string) => void;
}) {
  const params = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const [data, setData] = useState<MapData | null>(null),
    [gallery, setGallery] = useState(1),
    [floor, setFloor] = useState(1),
    [from, setFrom] = useState(Number(params.get("from")) || 1),
    [to, setTo] = useState(Number(params.get("to")) || 5),
    [accessible, setAccessible] = useState(false),
    [route, setRoute] = useState<Route | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [zoom, setZoom] = useState(1),
    [qr, setQr] = useState("");
  useEffect(() => {
    api<MapData>("map")
      .then((d) => {
        setData(d);
        // Los enlaces de un comercio y los QR pueden apuntar a cualquier galería.
        const requestedOrigin = params.has("from")
          ? d.nodes.find((n) => Number(n.id) === from)
          : undefined;
        const requestedDestination = params.has("to")
          ? d.nodes.find((n) => Number(n.id) === to)
          : undefined;
        const anchor = requestedOrigin ?? requestedDestination;
        const anchorFloor =
          d.floors.find((f) => Number(f.id) === Number(anchor?.floor_id)) ??
          d.floors[0];
        if (anchorFloor) {
          const galleryNodes = d.nodes.filter((n) =>
            d.floors.some(
              (f) =>
                Number(f.id) === Number(n.floor_id) &&
                Number(f.gallery_id) === Number(anchorFloor.gallery_id),
            ),
          );
          const origin =
            galleryNodes.find(
              (n) => Number(n.id) === Number(requestedOrigin?.id),
            ) ??
            galleryNodes.find((n) => n.kind === "entry") ??
            galleryNodes[0];
          const destination =
            galleryNodes.find(
              (n) => Number(n.id) === Number(requestedDestination?.id),
            ) ??
            galleryNodes.find((n) => n.kind === "shop") ??
            galleryNodes[0];
          setGallery(Number(anchorFloor.gallery_id));
          setFloor(Number(origin?.floor_id ?? anchorFloor.id));
          setFrom(Number(origin?.id ?? 0));
          setTo(Number(destination?.id ?? 0));
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setRoute(null);
    setError("");
  }, [from, to, accessible, gallery]);
  const calculate = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await api<Route>(
        `route&from=${from}&to=${to}&accessible=${accessible ? 1 : 0}`,
      );
      setRoute(result);
      setFloor(Number(result.nodes[0].floor_id));
    } catch (e) {
      setRoute(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const generateQR = async () => {
    try {
      const url = new URL(location.href);
      url.hash = `map?from=${from}`;
      setQr(
        await QRCode.toDataURL(url.href, {
          width: 600,
          margin: 3,
          color: { dark: "#26114fff", light: "#ffffffff" },
        }),
      );
    } catch {
      setError("No se pudo generar el QR.");
    }
  };
  if (!data) return <Empty title={error || "Preparando el plano…"} />;
  const floors = data.floors.filter((f) => Number(f.gallery_id) === gallery),
    nodes = data.nodes.filter((n) =>
      floors.some((f) => Number(f.id) === Number(n.floor_id)),
    ),
    visible = nodes.filter((n) => Number(n.floor_id) === floor),
    selected = data.galleries.find((g) => Number(g.id) === gallery),
    node = (id: number) => data.nodes.find((n) => Number(n.id) === Number(id));
  const destination = businesses.find((b) => Number(b.node_id) === to);
  return (
    <>
      <div className="page-heading map-heading">
        <div>
          <span className="eyebrow">DE LA ENTRADA A TU PRÓXIMO HALLAZGO</span>
          <h1>
            Un lugar. El camino claro<span className="purple">.</span>
          </h1>
          <p>
            Elegí dónde estás y a dónde querés ir. Nosotros conectamos los
            puntos.
          </p>
        </div>
        <span className="badge">
          <Navigation size={14} /> Navegación interior
        </span>
      </div>
      <div className="map-layout">
        <aside className="map-sidebar card">
          <span className="eyebrow">PLANIFICÁ TU RECORRIDO</span>
          <label>
            Galería
            <select
              value={gallery}
              onChange={(e) => {
                const id = Number(e.target.value);
                setGallery(id);
                const firstFloor = data.floors.find(
                  (f) => Number(f.gallery_id) === id,
                );
                setFloor(Number(firstFloor?.id ?? 0));
                const ns = data.nodes.filter((n) =>
                  data.floors.some(
                    (f) =>
                      Number(f.gallery_id) === id &&
                      Number(f.id) === Number(n.floor_id),
                  ),
                );
                setFrom(Number(ns.find((n) => n.kind === "entry")?.id ?? 0));
                setTo(Number(ns.find((n) => n.kind === "shop")?.id ?? 0));
              }}
            >
              {data.galleries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <div className="route-fields">
            <label>
              <span>
                <i className="origin-dot" /> Tu punto de partida
              </span>
              <select
                value={from}
                onChange={(e) => setFrom(Number(e.target.value))}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="route-field-line" />
            <label>
              <span>
                <MapPin size={15} /> ¿A dónde vamos?
              </span>
              <select
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
              >
                {nodes
                  .filter(
                    (n) =>
                      n.kind === "shop" ||
                      n.kind === "entry" ||
                      n.kind === "reference",
                  )
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="accessible-toggle">
            <span>
              <Accessibility size={20} />
              <span>
                Recorrido accesible<small>Evita tramos con escaleras</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={accessible}
              onChange={(e) => setAccessible(e.target.checked)}
            />
          </label>
          <button
            className="primary full"
            disabled={busy || !from || !to}
            onClick={calculate}
          >
            <RouteIcon size={18} />
            {busy ? "Calculando…" : "Mostrar recorrido"}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="outline full"
            onClick={generateQR}
            disabled={!from}
          >
            <QrCode size={18} /> QR de este punto
          </button>
          <p className="map-help">
            <Info size={16} />
            <span>
              Escaneá un QR con la cámara de tu celular para abrir el plano
              desde ese punto. No usamos GPS interior.
            </span>
          </p>
          {route && (
            <div className="route-summary">
              <span className="eyebrow">TU RECORRIDO</span>
              <h2>
                {route.distance} <small>metros aprox.</small>
              </h2>
              <span className="badge">
                <Check size={13} />
                {route.accessible ? "Sin escaleras" : "Ruta más corta"}
              </span>
              <ol>
                {route.nodes.map((n, i) => (
                  <li key={n.id}>
                    <span>{i + 1}</span>
                    <button onClick={() => setFloor(Number(n.floor_id))}>
                      {n.label}
                      <small>
                        {
                          data.floors.find(
                            (f) => Number(f.id) === Number(n.floor_id),
                          )?.name
                        }
                      </small>
                    </button>
                  </li>
                ))}
              </ol>
              {destination && (
                <button
                  className="text-button"
                  onClick={() => go("business/" + destination.id)}
                >
                  Ver comercio <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </aside>
        <section className="map-main card">
          <div className="map-toolbar">
            <div>
              <h2>{selected?.name}</h2>
              <span className="muted">{selected?.address}</span>
            </div>
            <div className="floor-tabs">
              {floors.map((f) => (
                <button
                  key={f.id}
                  className={floor === Number(f.id) ? "active" : ""}
                  onClick={() => setFloor(Number(f.id))}
                >
                  <Layers size={14} />
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          {!visible.length ? (
            <Empty title="Este piso todavía no tiene puntos cargados" />
          ) : (
            <div className="map-canvas">
              <div className="zoom-tools">
                <button
                  aria-label="Acercar plano"
                  onClick={() => setZoom(Math.min(1.8, zoom + 0.2))}
                >
                  <ZoomIn size={19} />
                </button>
                <button
                  aria-label="Alejar plano"
                  onClick={() => setZoom(Math.max(0.7, zoom - 0.2))}
                >
                  <ZoomOut size={19} />
                </button>
              </div>
              <div className="svg-scroll">
                <svg
                  viewBox="0 0 900 560"
                  role="group"
                  aria-label={
                    "Plano interactivo de " +
                    floors.find((f) => Number(f.id) === floor)?.name
                  }
                  style={{ width: `${zoom * 100}%`, minWidth: 520 * zoom }}
                >
                  <defs>
                    <pattern
                      id="grid"
                      width="24"
                      height="24"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1" cy="1" r="1" fill="#dedae9" />
                    </pattern>
                    <filter id="shadow">
                      <feDropShadow
                        dx="0"
                        dy="4"
                        stdDeviation="5"
                        floodOpacity=".06"
                      />
                    </filter>
                  </defs>
                  <rect width="900" height="560" fill="url(#grid)" />
                  <rect
                    x="35"
                    y="45"
                    width="830"
                    height="450"
                    rx="30"
                    fill="#f4f2f8"
                    stroke="#dfdbe8"
                    strokeWidth="2"
                  />
                  <text
                    x="450"
                    y="75"
                    textAnchor="middle"
                    className="svg-heading"
                  >
                    {selected?.name.replace(" · Demo", "").toUpperCase()}
                  </text>
                  {data.edges
                    .filter((e) => Number(e.active))
                    .map((e) => {
                      const a = node(Number(e.from_id)),
                        b = node(Number(e.to_id));
                      return a &&
                        b &&
                        Number(a.floor_id) === floor &&
                        Number(b.floor_id) === floor ? (
                        <line
                          key={e.id}
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="white"
                          strokeWidth="30"
                          strokeLinecap="round"
                        />
                      ) : null;
                    })}
                  {visible
                    .filter((n) => n.kind === "shop")
                    .map((n) => (
                      <g key={"room" + n.id} filter="url(#shadow)">
                        <rect
                          x={Number(n.x) - 78}
                          y={Number(n.y) - 52}
                          width="156"
                          height="104"
                          rx="12"
                          fill={Number(n.id) === to ? "#ece4ff" : "#fff"}
                          stroke={Number(n.id) === to ? "#7c45ed" : "#e2ddeb"}
                          strokeWidth="2"
                        />
                      </g>
                    ))}
                  {route?.nodes.slice(1).map((b, i) => {
                    const a = route.nodes[i];
                    return Number(a.floor_id) === floor &&
                      Number(b.floor_id) === floor ? (
                      <line
                        key={"path" + i}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="#7545e8"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="9 8"
                        className="route-line"
                      />
                    ) : null;
                  })}
                  {visible.map((n) => (
                    <g
                      key={n.id}
                      className="map-node"
                      role="button"
                      tabIndex={0}
                      aria-label={"Seleccionar " + n.label}
                      onClick={() =>
                        n.kind === "shop"
                          ? setTo(Number(n.id))
                          : setFrom(Number(n.id))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          n.kind === "shop"
                            ? setTo(Number(n.id))
                            : setFrom(Number(n.id));
                        }
                      }}
                    >
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={
                          Number(n.id) === from || Number(n.id) === to ? 16 : 10
                        }
                        fill={
                          Number(n.id) === from
                            ? "#14a586"
                            : Number(n.id) === to
                              ? "#7545e8"
                              : n.kind === "stairs"
                                ? "#edb35a"
                                : n.kind === "elevator"
                                  ? "#4c93d2"
                                  : "#c1b4d7"
                        }
                        stroke="white"
                        strokeWidth="3"
                      />
                      {(Number(n.id) === to || Number(n.id) === from) && (
                        <circle cx={n.x} cy={n.y} r="4" fill="white" />
                      )}
                      <text
                        x={n.x}
                        y={Number(n.y) + (n.kind === "shop" ? 30 : -20)}
                        textAnchor="middle"
                        className="svg-label"
                      >
                        {n.label.split(" · ").at(-1)}
                      </text>
                      {n.kind === "shop" && (
                        <text
                          x={n.x}
                          y={Number(n.y) - 25}
                          textAnchor="middle"
                          className="svg-small"
                        >
                          {n.label.split(" · ")[0]}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}
          <div className="map-legend">
            <span>
              <i style={{ background: "#14a586" }} />
              Origen
            </span>
            <span>
              <i style={{ background: "#7545e8" }} />
              Destino / recorrido
            </span>
            <span>
              <i style={{ background: "#4c93d2" }} />
              Ascensor
            </span>
            <span>
              <i style={{ background: "#edb35a" }} />
              Escalera
            </span>
          </div>
          <div className="map-disclaimer">
            <Info size={18} />
            <p>
              {Number(selected?.simulated)
                ? "Plano simulado para la demostración académica. No utilizar para orientación en un edificio real."
                : "Recorrido orientativo según las conexiones cargadas. Verificá las condiciones del lugar."}{" "}
              {selected?.description}
            </p>
          </div>
        </section>
      </div>
      {qr && (
        <Modal title="Tu punto de orientación" onClose={() => setQr("")}>
          <div className="qr-content">
            <img src={qr} alt={"Código QR para " + node(from)?.label} />
            <h3>{node(from)?.label}</h3>
            <p>Escanealo para establecer este punto como origen.</p>
            <p className="muted">
              El QR usa el dominio actual. Generá los códigos definitivos
              después de publicar el sitio.
            </p>
            <a
              className="primary"
              href={qr}
              download={"localconnect-punto-" + from + ".png"}
            >
              <Download size={18} /> Descargar QR
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
