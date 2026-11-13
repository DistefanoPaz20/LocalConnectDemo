import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const php = process.env.PHP_BIN || resolve(root, "../.tools/php/php.exe");
const port = 18081;
let server;
function client() {
  let cookie = "",
    csrf = "";
  return async (action, data, expected = 200, token = true) => {
    const r = await fetch(
      `http://127.0.0.1:${port}/api/index.php?action=${action}`,
      {
        method: data === undefined ? "GET" : "POST",
        headers: {
          Cookie: cookie,
          ...(data === undefined
            ? {}
            : {
                "Content-Type": "application/json",
                "X-CSRF-Token": token ? csrf : "invalid",
              }),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      },
    );
    for (const c of r.headers.getSetCookie())
      if (c.startsWith("localconnect_session=")) cookie = c.split(";")[0];
    const json = await r.json();
    if (json.csrf) csrf = json.csrf;
    assert.equal(r.status, expected, `${action}: ${JSON.stringify(json)}`);
    return json;
  };
}
const admin = client(),
  visitor = client(),
  merchant = client(),
  anonymous = client(),
  other = client();
let businessId, reviewId, reportId, postId, otherUserId;
before(async () => {
  mkdirSync(resolve(root, "var"), { recursive: true });
  if (!process.env.LC_TEST_CONFIG)
    copyFileSync(
      resolve(root, "var/localconnect.sqlite"),
      resolve(root, "var/integration.sqlite"),
    );
  const config =
    process.env.LC_TEST_CONFIG || resolve(root, "var/test-config.php");
  if (!process.env.LC_TEST_CONFIG)
    writeFileSync(
      config,
      `<?php return ['driver'=>'sqlite','path'=>'${resolve(root, "var/integration.sqlite").replaceAll("\\", "/")}','secure_cookie'=>false];`,
    );
  server = spawn(
    php,
    ["-S", `127.0.0.1:${port}`, "-t", resolve(root, "public")],
    { env: { ...process.env, LC_CONFIG: config }, stdio: "ignore" },
  );
  for (let i = 0; i < 50; i++) {
    try {
      await anonymous("session");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await admin("session");
  await admin("login", {
    email: "admin@localconnect.test",
    password: "AdminLocal2026!",
  });
  await visitor("session");
  await visitor("login", {
    email: "visitante@localconnect.test",
    password: "VisitanteDemo2026!",
  });
  await merchant("session");
  await merchant("login", {
    email: "comercio@localconnect.test",
    password: "ComercioDemo2026!",
  });
});
after(() => server?.kill());
test("public catalog excludes private data and has seeded shops", async () => {
  const c = await anonymous("catalog");
  assert.equal(c.businesses.length, 6);
  assert.equal(c.favorites.length, 0);
  assert.ok(c.categories.length >= 6);
  assert.ok(!("password" in c.businesses[0]));
});
test("authorization and CSRF prevent protected writes", async () => {
  await anonymous("admin", undefined, 401);
  await visitor("admin", undefined, 403);
  await visitor("favorite", { business_id: 1 }, 419, false);
  await visitor("business.save", { name: "Invalid" }, 403);
});
test("registration cannot grant administrator role", async () => {
  await other("session");
  const r = await other(
    "register",
    {
      name: "Integration User",
      email: `test-${Date.now()}@example.test`,
      password: "TestPassword2026!",
      role: "admin",
    },
    201,
  );
  assert.equal(r.user.role, "visitor");
  otherUserId = r.user.id;
  await other("admin", undefined, 403);
});
test("login failures are rate limited", async () => {
  const c = client();
  await c("session");
  for (let i = 0; i < 8; i++)
    await c("login", { email: "missing@example.test", password: "wrong" }, 401);
  await c("login", { email: "missing@example.test", password: "wrong" }, 429);
});
test("favorites persist across separate sessions", async () => {
  await visitor("favorite", { business_id: 6 });
  const second = client();
  await second("session");
  await second("login", {
    email: "visitante@localconnect.test",
    password: "VisitanteDemo2026!",
  });
  assert.ok((await second("catalog")).favorites.map(Number).includes(6));
  await visitor("favorite", { business_id: 6 });
  assert.ok(!(await second("catalog")).favorites.map(Number).includes(6));
});
test("merchant creation waits for approval and rejects executable URLs", async () => {
  const data = {
    name: "Comercio integración",
    category_id: 1,
    node_id: 5,
    description: "Prueba de integración",
    address: "Dirección de prueba",
    phone: "+543811234567",
    hours: "9 a 18",
    image: "https://example.com/photo.jpg",
    price_level: "$$",
  };
  await merchant(
    "business.save",
    { ...data, website: "javascript:alert(1)" },
    400,
  );
  const r = await merchant("business.save", data);
  businessId = r.id;
  assert.equal(r.status, "pending");
  assert.ok(
    !(await anonymous("catalog")).businesses.some(
      (b) => Number(b.id) === Number(businessId),
    ),
  );
  await admin("business.status", { id: businessId, status: "approved" });
  assert.ok(
    (await anonymous("catalog")).businesses.some(
      (b) => Number(b.id) === Number(businessId),
    ),
  );
});
test("merchant cannot edit another owner’s business", async () => {
  await admin("user.update", { id: otherUserId, role: "merchant", active: 1 });
  await other("business.save", { id: businessId }, 403);
});
test("post publishing, expiration, editing and deletion", async () => {
  const d = {
    business_id: businessId,
    title: "Oferta de prueba",
    content: "Detalle de la oferta",
    type: "promotion",
    price: 200,
    expires_at: "2000-01-01",
  };
  await merchant("post.save", d);
  const m = await merchant("manage");
  postId = m.posts.find((p) => p.title === d.title).id;
  assert.ok(
    !(await anonymous("catalog")).posts.some(
      (p) => Number(p.id) === Number(postId),
    ),
  );
  await other("post.save", { ...d, id: postId, business_id: 1 }, 403);
  await merchant("post.save", { ...d, id: postId, expires_at: "" });
  assert.ok(
    (await anonymous("catalog")).posts.some(
      (p) => Number(p.id) === Number(postId),
    ),
  );
  await merchant("post.delete", { id: postId });
});
test("reviews upsert, reporting and moderation", async () => {
  await visitor(
    "review",
    { business_id: businessId, rating: 6, comment: "Invalid" },
    400,
  );
  await visitor("review", {
    business_id: businessId,
    rating: 4,
    comment: "Reseña de prueba",
  });
  await visitor("review", {
    business_id: businessId,
    rating: 5,
    comment: "Reseña actualizada",
  });
  let d = await anonymous("business&id=" + businessId);
  assert.equal(d.reviews.length, 1);
  assert.equal(Number(d.reviews[0].rating), 5);
  reviewId = d.reviews[0].id;
  await visitor(
    "report",
    {
      business_id: businessId,
      review_id: reviewId,
      reason: "Contenido de prueba",
    },
    201,
  );
  const a = await admin("admin");
  reportId = a.reports.find((r) => Number(r.review_id) === Number(reviewId)).id;
  await admin("review.moderate", { id: reviewId, status: "hidden" });
  assert.equal(
    (await anonymous("business&id=" + businessId)).reviews.length,
    0,
  );
  await admin("report.resolve", { id: reportId });
  assert.equal(
    (await admin("admin")).reports.find(
      (r) => Number(r.id) === Number(reportId),
    ).status,
    "resolved",
  );
});
test("routes cross floors; accessible route uses elevator, not stairs", async () => {
  const short = await anonymous("route&from=10&to=18");
  const accessible = await anonymous("route&from=10&to=18&accessible=1");
  assert.ok(short.nodes.some((n) => n.kind === "stairs"));
  assert.ok(accessible.nodes.some((n) => n.kind === "elevator"));
  assert.ok(!accessible.nodes.some((n) => n.kind === "stairs"));
  assert.ok(accessible.distance > short.distance);
  assert.equal(Number(accessible.nodes[0].id), 10);
  assert.equal(Number(accessible.nodes.at(-1).id), 18);
});
test("closed connections produce a no-route result, invalid origins fail", async () => {
  const map = await admin("map");
  const edge = map.edges.find(
    (e) => Number(e.from_id) === 1 && Number(e.to_id) === 2,
  );
  await admin("edge.save", { ...edge, active: 0 });
  await anonymous("route&from=1&to=5", undefined, 422);
  await admin("edge.save", { ...edge, active: 1 });
  await anonymous("route&from=9999&to=5", undefined, 400);
  const same = await anonymous("route&from=1&to=1");
  assert.equal(same.distance, 0);
});
test("map editing validates cross-floor connections and protects occupied nodes", async () => {
  await admin(
    "edge.save",
    { from_id: 5, to_id: 18, distance: 3, accessible: 1, active: 1 },
    400,
  );
  await admin("node.delete", { id: 5 }, 400);
  await visitor("node.save", {}, 403);
});
test("notifications are private, can be read and marked", async () => {
  await admin("notifications.send", {
    user_id: otherUserId,
    message: "Aviso exclusivo de prueba",
  });
  assert.ok(
    (await other("notifications")).some(
      (n) => n.message === "Aviso exclusivo de prueba",
    ),
  );
  assert.ok(
    !(await visitor("notifications")).some(
      (n) => n.message === "Aviso exclusivo de prueba",
    ),
  );
  await other("notifications.read", {});
  assert.ok(
    (await other("notifications")).every((n) => Number(n.is_read) === 1),
  );
});
test("account deactivation revokes existing authenticated access", async () => {
  await admin("user.update", { id: otherUserId, role: "merchant", active: 0 });
  await other("manage", undefined, 401);
  await other(
    "login",
    { email: "comercio@localconnect.test", password: "incorrect" },
    401,
  );
});
test("profile validation does not partially save a rejected password change", async () => {
  const old = (await visitor("session")).user.name;
  await visitor(
    "profile",
    {
      name: "No debe guardarse",
      current_password: "incorrecta",
      password: "NuevaClave2026!",
    },
    400,
  );
  assert.equal((await visitor("session")).user.name, old);
});
test("categories can be created and removed, but occupied categories are protected", async () => {
  const name = "Categoría integración";
  await admin("category.save", { name });
  const category = (await anonymous("catalog")).categories.find(
    (c) => c.name === name,
  );
  assert.ok(category);
  await admin("category.delete", { id: category.id });
  await admin("category.delete", { id: 1 }, 400);
});
test("new gallery, floor, nodes and connection are persisted and routable", async () => {
  await admin("gallery.save", {
    name: "Galería de integración",
    address: "Escenario simulado",
    description: "Prueba",
    simulated: 1,
  });
  let map = await anonymous("map");
  const gallery = map.galleries.find(
    (g) => g.name === "Galería de integración",
  );
  await admin("floor.save", {
    gallery_id: gallery.id,
    name: "Planta de integración",
    level: 0,
  });
  map = await anonymous("map");
  const floor = map.floors.find(
    (f) => Number(f.gallery_id) === Number(gallery.id),
  );
  await admin("node.save", {
    floor_id: floor.id,
    label: "Entrada de integración",
    kind: "entry",
    x: 450,
    y: 500,
  });
  await admin("node.save", {
    floor_id: floor.id,
    label: "Local de integración",
    kind: "shop",
    x: 450,
    y: 150,
  });
  map = await anonymous("map");
  const origin = map.nodes.find((n) => n.label === "Entrada de integración");
  const target = map.nodes.find((n) => n.label === "Local de integración");
  await admin("edge.save", {
    from_id: origin.id,
    to_id: target.id,
    distance: 35,
    accessible: 1,
    active: 1,
  });
  const result = await anonymous(
    `route&from=${origin.id}&to=${target.id}&accessible=1`,
  );
  assert.equal(result.distance, 35);
  await admin(
    "edge.save",
    { from_id: origin.id, to_id: 1, distance: 35, accessible: 1, active: 1 },
    400,
  );
  await admin("node.delete", { id: target.id });
  assert.ok(
    !(await anonymous("map")).edges.some(
      (e) => Number(e.to_id) === Number(target.id),
    ),
  );
});
test("logout revokes session", async () => {
  await merchant("logout", {});
  await merchant("manage", undefined, 401);
});
