let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T = any>(action: string, data?: unknown): Promise<T> {
  const r = await fetch("/api/index.php?action=" + action, {
    method: data === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers:
      data === undefined
        ? {}
        : { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const text = await r.text();
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "El servidor no devolvió una respuesta válida. Verificá la instalación de PHP.",
    );
  }
  if (!r.ok)
    throw new Error(value.error || "No se pudo completar la operación.");
  if (value.csrf) setCsrf(value.csrf);
  return value;
}
