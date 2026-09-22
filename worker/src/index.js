const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const ALLOWED_ORIGINS = new Set([
  "https://midnightmidnightfil-tech.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

const PRODUCTS = new Map([
  ["silicone-kitchen-set", { sku: "CJYD206907601AZ", pid: "2406260541431612500" }],
  ["iced-coffee-cup", { sku: "CJYD236964001AZ", pid: "2505060802541627800" }],
  ["expandable-dish-rack", { sku: "CJYD242026701AZ", pid: "2507040555101620400" }],
  ["wooden-lunch-box", { sku: "CJCJ136715001AZ", pid: "1465556675883831296" }],
  ["magnetic-cable-clips", { sku: "CJYD197888501AZ", pid: "1763402968205897728" }],
  ["travel-jewelry-box", { sku: "CJYD228090802BY", pid: "2501290753441625000" }],
  ["stackable-drawer", { sku: "CJJT110132001AZ", pid: "1386883997170274304" }],
  ["foldable-coffee-cup", { sku: "CJHS115718201AZ", pid: "1400300694791131136" }],
  ["ceramic-tea-mug", { sku: "CJHS113613801AZ", pid: "1395197760894013440" }],
  ["japanese-tableware-set", { sku: "CJCJ113478501AZ", pid: "1394840032447172608" }],
  ["cotton-table-mat", { sku: "CJCJ177046101AZ", pid: "1664950078802505728" }],
  ["fruit-drain-basket", { sku: "CJYD208536601AZ", pid: "2407160828401622500" }],
  ["sink-storage-rack", { sku: "CJYD207339601AZ", pid: "2407020239431617500" }],
  ["woven-storage-basket", { sku: "CJYD204791101AZ", pid: "1795379973377765376" }],
  ["desktop-water-dispenser", { sku: "CJHS167415802BY", pid: "1621032671155597312" }],
  ["wall-spice-rack", { sku: "CJYD206141801AZ", pid: "2406160346461601500" }]
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

async function cjPost(path, token, body) {
  const res = await fetch(`${CJ_BASE}${path}`, {
    method: "POST",
    headers: {
      "CJ-Access-Token": token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok || data?.result === false) {
    throw new Error(data?.message || `CJ HTTP ${res.status}`);
  }
  return data;
}

function summarizeStock(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const countries = [];
  let inStock = false;

  for (const row of rows) {
    const quantity = Number(
      row?.totalInventoryNum ??
      row?.storageNum ??
      row?.cjInventoryNum ??
      0
    ) || 0;
    if (quantity > 0) {
      inStock = true;
      if (row?.countryCode && !countries.includes(row.countryCode)) {
        countries.push(row.countryCode);
      }
    }
  }

  return { inStock, warehouseCountries: countries };
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
        {
          ok: true,
          service: "NOVAE CJ bridge",
          secretConfigured: Boolean(env.CJ_API_KEY)
        },
        200,
        origin,
        { "Cache-Control": "no-store" }
      );
    }

    if (!env.CJ_API_KEY) {
      return json({ error: "Service temporarily unavailable" }, 503, origin);
    }

    if (!["/availability", "/shipping"].includes(url.pathname)) {
      return json({ error: "Not found" }, 404, origin);
    }

    const slug = (url.searchParams.get("slug") || "").trim();
    const ref = PRODUCTS.get(slug);
    if (!ref) {
      return json({ error: "Unknown product" }, 400, origin);
    }

    try {
      return await cachedJson(request, origin, async () => {
        const token = await getAccessToken(env.CJ_API_KEY);

        const variants = await cjGet(
          `/product/variant/query?pid=${encodeURIComponent(ref.pid)}`,
          token
        );

        const rows = Array.isArray(variants?.data) ? variants.data : [];
        const selected = rows.find((v) => v?.variantSku === ref.sku) || null;

        if (!selected?.vid) {
          return url.pathname === "/shipping"
            ? { available: false, destinationCountry: "CA", options: [], checkedAt: new Date().toISOString() }
            : {
                productFound: false,
                inStock: false,
                warehouseCountries: [],
                variantLabel: null,
                checkedAt: new Date().toISOString()
              };
        }

        if (url.pathname === "/shipping") {
          const quantity = Math.min(5, Math.max(1, Number.parseInt(url.searchParams.get("quantity") || "1", 10) || 1));
          const freight = await cjPost("/logistic/freightCalculate", token, {
            startCountryCode: "CN",
            endCountryCode: "CA",
            products: [{ quantity, vid: selected.vid }]
          });

          const options = (Array.isArray(freight?.data) ? freight.data : [])
            .map((row) => ({
              name: row?.logisticName || null,
              estimatedDays: row?.logisticAging || null,
              priceUsd: Number(row?.totalPostageFee ?? row?.logisticPrice ?? 0) || 0
            }))
            .filter((row) => row.name && row.priceUsd > 0)
            .sort((a, b) => a.priceUsd - b.priceUsd)
            .slice(0, 8);

          return {
            available: options.length > 0,
            destinationCountry: "CA",
            quantity,
            currency: "USD",
            options,
            checkedAt: new Date().toISOString()
          };
        }

        const stock = await cjGet(
          `/product/stock/queryByVid?vid=${encodeURIComponent(selected.vid)}`,
          token
        );
        const summary = summarizeStock(stock);

        return {
          productFound: true,
          inStock: summary.inStock,
          warehouseCountries: summary.warehouseCountries,
          variantLabel: selected.variantKey || null,
          checkedAt: new Date().toISOString()
        };
      });
    } catch (err) {
      return json(
        {
          error: "Availability check failed",
          detail: String(err?.message || err)
        },
        502,
        origin,
        { "Cache-Control": "no-store" }
      );
    }
  }
};
