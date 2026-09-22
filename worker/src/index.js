const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const ALLOWED_ORIGINS = new Set([
  "https://midnightmidnightfil-tech.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

const PRODUCTS = new Map([
  ["silicone-kitchen-set", { name: "Ensemble cuisine silicone 11 pièces", priceCad: 64.90, sku: "CJYD206907601AZ", pid: "2406260541431612500" }],
  ["iced-coffee-cup", { name: "Gobelet café glacé 500 ml avec bac à glaçons", priceCad: 24.90, sku: "CJYD236964001AZ", pid: "2505060802541627800" }],
  ["expandable-dish-rack", { name: "Organisateur extensible pour vaisselle", priceCad: 29.90, sku: "CJYD242026701AZ", pid: "2507040555101620400" }],
  ["wooden-lunch-box", { name: "Boîte repas en bois", priceCad: 54.90, sku: "CJCJ136715001AZ", pid: "1465556675883831296" }],
  ["magnetic-cable-clips", { name: "Clips magnétiques pour câbles", priceCad: 18.90, sku: "CJYD197888501AZ", pid: "1763402968205897728" }],
  ["travel-jewelry-box", { name: "Coffret bijoux de voyage", priceCad: 44.90, sku: "CJYD228090802BY", pid: "2501290753441625000" }],
  ["stackable-drawer", { name: "Tiroir de rangement empilable", priceCad: 24.90, sku: "CJJT110132001AZ", pid: "1386883997170274304" }],
  ["foldable-coffee-cup", { name: "Gobelet silicone pliable", priceCad: 19.90, sku: "CJHS115718201AZ", pid: "1400300694791131136" }],
  ["ceramic-tea-mug", { name: "Mug céramique filtre/couvercle", priceCad: 44.90, sku: "CJHS113613801AZ", pid: "1395197760894013440" }],
  ["japanese-tableware-set", { name: "Service céramique style japonais", priceCad: 34.90, sku: "CJCJ113478501AZ", pid: "1394840032447172608" }],
  ["cotton-table-mat", { name: "Set de table rond à franges", priceCad: 21.90, sku: "CJCJ177046101AZ", pid: "1664950078802505728" }],
  ["fruit-drain-basket", { name: "Boîte égouttoir avec couvercle", priceCad: 24.90, sku: "CJYD208536601AZ", pid: "2407160828401622500" }],
  ["sink-storage-rack", { name: "Rangement compact pour évier", priceCad: 29.90, sku: "CJYD207339601AZ", pid: "2407020239431617500" }],
  ["woven-storage-basket", { name: "Panier rangement tressé", priceCad: 59.90, sku: "CJYD204791101AZ", pid: "1795379973377765376" }],
  ["desktop-water-dispenser", { name: "Distributeur d’eau rechargeable de bureau", priceCad: 49.90, sku: "CJHS167415802BY", pid: "1621032671155597312" }],
  ["wall-spice-rack", { name: "Étagère murale condiments", priceCad: 34.90, sku: "CJYD206141801AZ", pid: "2406160346461601500" }]
]);

let tokenCache = { token: null, expiresAt: 0 };

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://midnightmidnightfil-tech.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(res, data) {
  const msg = String(data?.message || "");
  return res.status === 429 || res.status === 406 || /too many requests|qps limit|request too frequent/i.test(msg);
}

async function cjRequest(path, token, init = {}) {
  let lastMessage = "CJ request failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1200 * attempt);
    const res = await fetch(`${CJ_BASE}${path}`, {
      ...init,
      headers: {
        "CJ-Access-Token": token,
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
    const data = await res.json();
    if (isRateLimited(res, data)) {
      lastMessage = data?.message || `CJ HTTP ${res.status}`;
      continue;
    }
    if (!res.ok || data?.result === false) {
      throw new Error(data?.message || `CJ HTTP ${res.status}`);
    }
    return data;
  }
  throw new Error(lastMessage);
}

async function cjGet(path, token) {
  return cjRequest(path, token);
}

async function cjPost(path, token, body) {
  await sleep(1100);
  return cjRequest(path, token, {
    method: "POST",
    body: JSON.stringify(body)
  });
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


async function createStripeCheckout(env, items) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe test secret is not configured");
  }

  const normalized = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const slug = String(item?.slug || "").trim();
    const product = PRODUCTS.get(slug);
    if (!product) continue;
    const qty = Math.min(5, Math.max(1, Number.parseInt(item?.quantity || "1", 10) || 1));
    normalized.set(slug, Math.min(5, (normalized.get(slug) || 0) + qty));
  }

  const cart = [...normalized.entries()];
  if (!cart.length || cart.length > 16) {
    throw new Error("Cart is empty or invalid");
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", "https://midnightmidnightfil-tech.github.io/novae-store/checkout.html?stripe=success&session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url", "https://midnightmidnightfil-tech.github.io/novae-store/cart.html?stripe=cancelled");
  params.set("billing_address_collection", "auto");
  params.set("shipping_address_collection[allowed_countries][0]", "CA");
  params.set("phone_number_collection[enabled]", "true");
  params.set("locale", "fr-CA");
  params.set("payment_intent_data[metadata][store]", "NOVAE");
  params.set("metadata[store]", "NOVAE_TEST");
  params.set("metadata[cart]", cart.map(([slug, quantity]) => `${slug}:${quantity}`).join(","));

  cart.forEach(([slug, quantity], index) => {
    const product = PRODUCTS.get(slug);
    params.set(`line_items[${index}][quantity]`, String(quantity));
    params.set(`line_items[${index}][price_data][currency]`, "cad");
    params.set(`line_items[${index}][price_data][unit_amount]`, String(Math.round(product.priceCad * 100)));
    params.set(`line_items[${index}][price_data][product_data][name]`, product.name);
    params.set(`line_items[${index}][price_data][product_data][metadata][slug]`, slug);
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  const data = await res.json();
  if (!res.ok || !data?.url) {
    throw new Error(data?.error?.message || `Stripe HTTP ${res.status}`);
  }
  return { url: data.url, id: data.id };
}



function parseStripeCartMetadata(value) {
  const out = [];
  for (const part of String(value || "").split(",")) {
    if (!part) continue;
    const idx = part.lastIndexOf(":");
    if (idx <= 0) continue;
    const slug = part.slice(0, idx);
    const quantity = Math.min(5, Math.max(1, Number.parseInt(part.slice(idx + 1), 10) || 1));
    if (PRODUCTS.has(slug)) out.push({ slug, quantity });
  }
  return out;
}

async function buildCjDryRun(env, session) {
  const cart = parseStripeCartMetadata(session?.metadata?.cart);
  const shipping =
    session?.shipping_details ||
    session?.collected_information?.shipping_details ||
    null;
  const destinationCountry =
    shipping?.address?.country ||
    session?.customer_details?.address?.country ||
    null;

  if (
    session?.livemode !== false ||
    session?.payment_status !== "paid" ||
    !cart.length
  ) {
    return {
      dryRun: true,
      readyForCJ: false,
      destinationCountry,
      itemCount: cart.length,
      reason: !cart.length ? "missing_cart_metadata" : "payment_not_confirmed",
      items: []
    };
  }

  if (!env.CJ_API_KEY) {
    return {
      dryRun: true,
      readyForCJ: false,
      destinationCountry,
      itemCount: cart.length,
      reason: "cj_not_configured",
      items: []
    };
  }

  // Test-mode safety: validate at most 5 unique products and never create an order.
  if (cart.length > 5) {
    return {
      dryRun: true,
      readyForCJ: false,
      destinationCountry,
      itemCount: cart.length,
      reason: "dry_run_item_limit",
      items: []
    };
  }

  const token = await getAccessToken(env.CJ_API_KEY);
  const items = [];

  for (const item of cart) {
    const ref = PRODUCTS.get(item.slug);
    if (!ref) continue;

    const variants = await cjGet(
      `/product/variant/query?pid=${encodeURIComponent(ref.pid)}`,
      token
    );
    const rows = Array.isArray(variants?.data) ? variants.data : [];
    const selected = rows.find((v) => v?.variantSku === ref.sku) || null;

    if (!selected?.vid) {
      items.push({
        slug: item.slug,
        name: ref.name,
        quantity: item.quantity,
        variantFound: false,
        inStock: false
      });
      await sleep(1100);
      continue;
    }

    await sleep(1100);
    const stock = await cjGet(
      `/product/stock/queryByVid?vid=${encodeURIComponent(selected.vid)}`,
      token
    );
    const summary = summarizeStock(stock);

    items.push({
      slug: item.slug,
      name: ref.name,
      quantity: item.quantity,
      variantFound: true,
      inStock: summary.inStock
    });

    await sleep(1100);
  }

  return {
    dryRun: true,
    readyForCJ:
      destinationCountry === "CA" &&
      items.length === cart.length &&
      items.every((x) => x.variantFound && x.inStock),
    destinationCountry,
    itemCount: cart.length,
    reason: null,
    items
  };
}

async function verifyStripeSession(env, sessionId) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe test secret is not configured");
  }
  if (!/^cs_test_[A-Za-z0-9_]+$/.test(sessionId || "")) {
    throw new Error("Invalid Stripe test session");
  }

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe HTTP ${res.status}`);
  }

  const paid = data.payment_status === "paid";
  let cjDryRun = null;
  if (paid && data.livemode === false) {
    try {
      cjDryRun = await buildCjDryRun(env, data);
    } catch (err) {
      cjDryRun = {
        dryRun: true,
        readyForCJ: false,
        destinationCountry: null,
        itemCount: 0,
        reason: "cj_check_failed",
        items: []
      };
    }
  }

  return {
    paid,
    paymentStatus: data.payment_status || null,
    status: data.status || null,
    currency: data.currency || null,
    amountTotal: Number(data.amount_total || 0),
    testMode: data.livemode === false,
    cjDryRun
  };
}


function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeWebhookSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",").map((x) => x.trim());
  const timestamp = parts.find((x) => x.startsWith("t="))?.slice(2);
  const signatures = parts.filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));

  if (!timestamp || !signatures.length) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = bytesToHex(digest);

  return signatures.some((sig) => timingSafeEqualHex(sig, expected));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(origin) });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/stripe/webhook") {
      try {
        const rawBody = await request.text();
        const signature = request.headers.get("Stripe-Signature") || "";
        const valid = await verifyStripeWebhookSignature(
          rawBody,
          signature,
          env.STRIPE_WEBHOOK_SECRET
        );

        if (!valid) {
          return json({ error: "Invalid Stripe signature" }, 400, "", { "Cache-Control": "no-store" });
        }

        const event = JSON.parse(rawBody);
        const session = event?.data?.object;

        if (
          event?.type === "checkout.session.completed" &&
          session?.livemode === false &&
          session?.payment_status === "paid"
        ) {
          const cjDryRun = await buildCjDryRun(env, session);
          console.log("NOVAE_TEST_PAYMENT_CONFIRMED", {
            eventId: event.id,
            sessionId: session.id,
            amountTotal: session.amount_total,
            currency: session.currency,
            cjDryRun: {
              readyForCJ: cjDryRun.readyForCJ,
              destinationCountry: cjDryRun.destinationCountry,
              itemCount: cjDryRun.itemCount,
              reason: cjDryRun.reason
            }
          });
        }

        return json({ received: true }, 200, "", { "Cache-Control": "no-store" });
      } catch (err) {
        return json(
          { error: "Webhook processing failed" },
          400,
          "",
          { "Cache-Control": "no-store" }
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/stripe/create-checkout-session") {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return json({ error: "Origin not allowed" }, 403, origin);
      }
      try {
        const body = await request.json();
        const session = await createStripeCheckout(env, body?.items);
        return json({ url: session.url }, 200, origin, { "Cache-Control": "no-store" });
      } catch (err) {
        return json(
          { error: "Checkout unavailable", detail: String(err?.message || err) },
          502,
          origin,
          { "Cache-Control": "no-store" }
        );
      }
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    if (url.pathname === "/stripe/verify-session") {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return json({ error: "Origin not allowed" }, 403, origin);
      }
      try {
        const sessionId = (url.searchParams.get("session_id") || "").trim();
        const result = await verifyStripeSession(env, sessionId);
        return json(result, 200, origin, { "Cache-Control": "no-store" });
      } catch (err) {
        return json(
          { error: "Stripe verification failed", detail: String(err?.message || err) },
          400,
          origin,
          { "Cache-Control": "no-store" }
        );
      }
    }

    if (url.pathname === "/health") {
      return json(
        {
          ok: true,
          service: "NOVAE CJ bridge",
          secretConfigured: Boolean(env.CJ_API_KEY),
          stripeTestConfigured: Boolean(env.STRIPE_SECRET_KEY),
          stripeWebhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET)
        },
        200,
        origin,
        { "Cache-Control": "no-store" }
      );
    }

    if (!env.CJ_API_KEY) {
      return json({ error: "Service temporarily unavailable" }, 503, origin);
    }

    if (!["/availability", "/shipping", "/pricing"].includes(url.pathname)) {
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

        const quantity = Math.min(5, Math.max(1, Number.parseInt(url.searchParams.get("quantity") || "1", 10) || 1));

        async function shippingOptions() {
          const freight = await cjPost("/logistic/freightCalculate", token, {
            startCountryCode: "CN",
            endCountryCode: "CA",
            products: [{ quantity, vid: selected.vid }]
          });

          return (Array.isArray(freight?.data) ? freight.data : [])
            .map((row) => ({
              name: row?.logisticName || null,
              estimatedDays: row?.logisticAging || null,
              priceUsd: Number(row?.totalPostageFee ?? row?.logisticPrice ?? 0) || 0
            }))
            .filter((row) => row.name && row.priceUsd > 0)
            .sort((a, b) => a.priceUsd - b.priceUsd)
            .slice(0, 8);
        }

        if (url.pathname === "/shipping") {
          const options = await shippingOptions();
          return {
            available: options.length > 0,
            destinationCountry: "CA",
            quantity,
            options: options.map((row) => ({
              name: row.name,
              estimatedDays: row.estimatedDays
            })),
            checkedAt: new Date().toISOString()
          };
        }

        if (url.pathname === "/pricing") {
          const options = await shippingOptions();
          const cheapest = options[0] || null;
          const supplierUsd = Number(selected.variantSellPrice || 0) || 0;
          const fxCadPerUsd = 1.45;
          const paymentFeeRate = 0.03;
          const targetMarginRate = 0.35;

          if (!cheapest || supplierUsd <= 0) {
            return {
              available: false,
              recommendedPriceCad: null,
              shippingMethod: cheapest?.name || null,
              estimatedDays: cheapest?.estimatedDays || null,
              checkedAt: new Date().toISOString()
            };
          }

          const landedCad = (supplierUsd + cheapest.priceUsd) * fxCadPerUsd;
          const rawPrice = landedCad / (1 - paymentFeeRate - targetMarginRate);
          const recommendedPriceCad = Math.ceil((rawPrice + 0.10) / 5) * 5 - 0.10;

          return {
            available: true,
            recommendedPriceCad: Number(recommendedPriceCad.toFixed(2)),
            shippingMethod: cheapest.name,
            estimatedDays: cheapest.estimatedDays || null,
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
