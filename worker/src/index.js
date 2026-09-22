const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const ALLOWED_ORIGINS = new Set([
  "https://midnightmidnightfil-tech.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

const ALLOWED_SKUS = new Set([
  "CJYD206907601AZ",
  "CJYD236964001AZ",
  "CJYD242026701AZ",
  "CJCJ136715001AZ",
  "CJYD197888501AZ",
  "CJYD228090802BY",
  "CJJT110132001AZ",
  "CJHS115718201AZ",
  "CJHS113613801AZ",
  "CJCJ113478501AZ",
  "CJCJ177046101AZ",
  "CJYD208536601AZ",
  "CJYD207339601AZ",
  "CJYD204791101AZ",
  "CJHS167415802BY",
  "CJYD206141801AZ"
]);

const SKU_PID = new Map([
  ["CJYD206907601AZ", "2406260541431612500"],
  ["CJYD236964001AZ", "2505060802541627800"],
  ["CJYD242026701AZ", "2507040555101620400"],
  ["CJCJ136715001AZ", "1465556675883831296"],
  ["CJYD197888501AZ", "1763402968205897728"],
  ["CJYD228090802BY", "2501290753441625000"],
  ["CJJT110132001AZ", "1386883997170274304"],
  ["CJHS115718201AZ", "1400300694791131136"],
  ["CJHS113613801AZ", "1395197760894013440"],
  ["CJCJ113478501AZ", "1394840032447172608"],
  ["CJCJ177046101AZ", "1664950078802505728"],
  ["CJYD208536601AZ", "2407160828401622500"],
  ["CJYD207339601AZ", "2407020239431617500"],
  ["CJYD204791101AZ", "1795379973377765376"],
  ["CJHS167415802BY", "1621032671155597312"],
  ["CJYD206141801AZ", "2406160346461601500"]
]);

let tokenCache = { token: null, expiresAt: 0 };

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://midnightmidnightfil-tech.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status = 200, origin = "", extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...cors(origin),
      ...extraHeaders
    }
  });
}

async function getAccessToken(apiKey) {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey })
  });
  const data = await res.json();

  if (!res.ok || !data?.result || !data?.data?.accessToken) {
    throw new Error(data?.message || "CJ authentication failed");
  }

  const expiry = Date.parse(data.data.accessTokenExpiryDate || "");
  tokenCache = {
    token: data.data.accessToken,
    expiresAt: Number.isFinite(expiry) ? expiry : now + 23 * 60 * 60 * 1000
  };
  return tokenCache.token;
}

async function cjGet(path, token) {
  const res = await fetch(`${CJ_BASE}${path}`, {
    headers: {
      "CJ-Access-Token": token,
      "Content-Type": "application/json"
    }
  });
  const data = await res.json();
  if (!res.ok || data?.result === false) {
    throw new Error(data?.message || `CJ HTTP ${res.status}`);
  }
  return data;
}

function stockSummary(payload) {
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.content)
      ? payload.data.content
      : [];

  const locations = rows.map((row) => {
    const quantity = Number(
      row?.totalInventoryNum ??
      row?.storageNum ??
      row?.cjInventoryNum ??
      0
    ) || 0;

    return {
      countryCode: row?.countryCode || null,
      location: row?.areaEn || null,
      inStock: quantity > 0,
      quantity
    };
  });

  return {
    inStock: locations.some((x) => x.inStock),
    totalQuantity: locations.reduce((sum, x) => sum + x.quantity, 0),
    locations
  };
}

async function cachedJson(request, origin, producer) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const payload = await producer();
  const response = json(payload, 200, origin, {
    "Cache-Control": "public, max-age=300"
  });

  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(origin) });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json(
        { ok: true, service: "NOVAE CJ bridge", secretConfigured: Boolean(env.CJ_API_KEY) },
        200,
        origin,
        { "Cache-Control": "no-store" }
      );
    }

    if (!env.CJ_API_KEY) {
      return json({ error: "CJ_API_KEY secret is not configured" }, 503, origin);
    }

    const sku = (url.searchParams.get("sku") || "").trim();
    if (!ALLOWED_SKUS.has(sku)) {
      return json({ error: "SKU not allowed" }, 400, origin);
    }

    try {
      if (url.pathname === "/availability") {
        return await cachedJson(request, origin, async () => {
          const token = await getAccessToken(env.CJ_API_KEY);

          const pid = SKU_PID.get(sku);
          const variants = await cjGet(
            `/product/variant/query?pid=${encodeURIComponent(pid)}`,
            token
          );

          const variantRows = Array.isArray(variants?.data) ? variants.data : [];
          const selected = variantRows.find((v) => v?.variantSku === sku) || null;

          if (!selected?.vid) {
            return {
              sku,
              productFound: false,
              variant: null,
              stock: { inStock: false, totalQuantity: 0, locations: [] },
              checkedAt: new Date().toISOString()
            };
          }

          const stock = await cjGet(
            `/product/stock/queryByVid?vid=${encodeURIComponent(selected.vid)}`,
            token
          );

          return {
            sku,
            productFound: true,
            variant: {
              vid: selected.vid,
              pid: selected.pid || pid,
              key: selected.variantKey || null,
              weightG: Number(selected.variantWeight || 0) || null
            },
            stock: stockSummary(stock),
            checkedAt: new Date().toISOString()
          };
        });
      }

      if (url.pathname === "/stock") {
        return await cachedJson(request, origin, async () => {
          const token = await getAccessToken(env.CJ_API_KEY);
          const stock = await cjGet(
            `/product/stock/queryBySku?sku=${encodeURIComponent(sku)}`,
            token
          );
          return { sku, stock: stockSummary(stock), checkedAt: new Date().toISOString() };
        });
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      return json(
        { error: "CJ request failed", detail: String(err?.message || err) },
        502,
        origin,
        { "Cache-Control": "no-store" }
      );
    }
  }
};
