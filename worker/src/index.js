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

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://midnightmidnightfil-tech.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) }
  });
}

async function getAccessToken(apiKey) {
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey })
  });
  const data = await res.json();
  if (!res.ok || !data?.result || !data?.data?.accessToken) {
    throw new Error(data?.message || "CJ authentication failed");
  }
  return data.data.accessToken;
}

async function cjGet(path, token) {
  const res = await fetch(`${CJ_BASE}${path}`, {
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`CJ HTTP ${res.status}`);
  return data;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, origin);

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "NOVAÉ CJ bridge" }, 200, origin);
    }

    if (!env.CJ_API_KEY) {
      return json({ error: "CJ_API_KEY secret is not configured" }, 503, origin);
    }

    const sku = (url.searchParams.get("sku") || "").trim();
    if (!ALLOWED_SKUS.has(sku)) {
      return json({ error: "SKU not allowed" }, 400, origin);
    }

    try {
      const token = await getAccessToken(env.CJ_API_KEY);

      if (url.pathname === "/product") {
        const data = await cjGet(`/product/query?productSku=${encodeURIComponent(sku)}`, token);
        return json(data, 200, origin);
      }

      if (url.pathname === "/variants") {
        const data = await cjGet(`/product/variant/query?productSku=${encodeURIComponent(sku)}&countryCode=CA`, token);
        return json(data, 200, origin);
      }

      if (url.pathname === "/stock") {
        const data = await cjGet(`/product/stock/queryBySku?sku=${encodeURIComponent(sku)}`, token);
        return json(data, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      return json({ error: "CJ request failed", detail: String(err?.message || err) }, 502, origin);
    }
  }
};
