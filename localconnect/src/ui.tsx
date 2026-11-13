import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  X,
  LoaderCircle,
  Store,
  Coffee,
  Shirt,
  Heart,
  House,
  Smartphone,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
export const icons: Record<string, typeof Store> = {
  coffee: Coffee,
  shirt: Shirt,
  heart: Heart,
  house: House,
  smartphone: Smartphone,
  book: BookOpen,
  store: Store,
};
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">LC</span>
      <span>
        LocalConnect<span className="logo-dot">.</span>
      </span>
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Store size={36} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  hint?: string;
};
export function Editor({
  fields,
  initial = {},
  onSave,
  submit = "Guardar cambios",
}: {
  fields: Field[];
  initial?: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  submit?: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const form = e.currentTarget;
        const data: Record<string, any> = {
          ...initial,
          ...Object.fromEntries(new FormData(form)),
        };
        fields
          .filter((f) => f.type === "checkbox")
          .forEach(
            (f) =>
              (data[f.name] = (
                form.elements.namedItem(f.name) as HTMLInputElement
              ).checked
                ? 1
                : 0),
          );
        try {
          await onSave(data);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((f) => (
        <label
          key={f.name}
          className={f.type === "checkbox" ? "check-field" : ""}
        >
          <span>
            {f.label}
            {f.required !== false && f.type !== "checkbox" ? " *" : ""}
          </span>
          {f.options ? (
            <select
              name={f.name}
              defaultValue={initial[f.name] ?? ""}
              required={f.required !== false}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              name={f.name}
              defaultValue={initial[f.name] ?? ""}
              required={f.required !== false}
              maxLength={f.max ?? 5000}
              rows={4}
            />
          ) : f.type === "checkbox" ? (
            <input
              name={f.name}
              type="checkbox"
              defaultChecked={!!Number(initial[f.name])}
            />
          ) : (
            <input
              name={f.name}
              type={f.type ?? "text"}
              defaultValue={initial[f.name] ?? ""}
              required={f.required !== false}
              min={f.min}
              max={f.type === "number" ? f.max : undefined}
              maxLength={f.type !== "number" ? f.max : undefined}
              step={f.type === "number" ? "any" : undefined}
            />
          )}{" "}
          {f.hint && <small>{f.hint}</small>}
        </label>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={18} /> : null}
        {busy ? "Guardando…" : submit}
      </button>
    </form>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowUpRight size={17} />
        </button>
      )}
    </div>
  );
}
export function money(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value));
}
export function Picture({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return src && !broken ? (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  ) : (
    <div className={"picture-fallback " + className}>
      <Store size={44} />
      <span>{alt}</span>
    </div>
  );
}
