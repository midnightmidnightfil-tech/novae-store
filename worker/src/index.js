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
    "Access-Control-Allow-Headers": "Content-Type,X-NOVAE-Test",
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



function normalizeCartItems(items) {
  const normalized = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const slug = String(item?.slug || "").trim();
    const product = PRODUCTS.get(slug);
    if (!product) continue;
    const qty = Math.min(5, Math.max(1, Number.parseInt(item?.quantity || "1", 10) || 1));
    normalized.set(slug, Math.min(5, (normalized.get(slug) || 0) + qty));
  }
  return [...normalized.entries()];
}

function expectedCartAmountCadCents(cart) {
  return cart.reduce((sum, [slug, quantity]) => {
    const product = PRODUCTS.get(slug);
    return sum + Math.round((product?.priceCad || 0) * 100) * quantity;
  }, 0);
}

function orderReferenceFromRequestId(requestId) {
  const compact = String(requestId || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase();
  return `NVT-${compact || crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

function sessionIntegrity(session) {
  const cartItems = parseStripeCartMetadata(session?.metadata?.cart);
  const cart = cartItems.map((item) => [item.slug, item.quantity]);
  const expectedAmount = expectedCartAmountCadCents(cart);
  const actualAmount = Number(session?.amount_total || 0);
  const currencyOk = String(session?.currency || "").toLowerCase() === "cad";
  const storeOk = session?.metadata?.store === "NOVAE_TEST";
  const amountOk = cart.length > 0 && expectedAmount === actualAmount;
  return {
    ok: session?.livemode === false && currencyOk && storeOk && amountOk,
    currencyOk,
    storeOk,
    amountOk,
    expectedAmount,
    actualAmount,
    cart
  };
}

async function validateCjCartForCheckout(env, cart) {
  if (!env.CJ_API_KEY) {
    return { ok: false, blocking: false, reason: "cj_not_configured" };
  }
  if (!cart.length || cart.length > 5) {
    throw new Error("Test checkout supports up to 5 unique products");
  }

  try {
    const token = await getAccessToken(env.CJ_API_KEY);
    for (const [slug, quantity] of cart) {
      const ref = PRODUCTS.get(slug);
      if (!ref) throw new Error("Unknown product");

      const variants = await cjGet(
        `/product/variant/query?pid=${encodeURIComponent(ref.pid)}`,
        token
      );
      const rows = Array.isArray(variants?.data) ? variants.data : [];
      const selected = rows.find((v) => v?.variantSku === ref.sku) || null;
      if (!selected?.vid) {
        return { ok: false, blocking: true, reason: "variant_unavailable", slug };
      }

      await sleep(1100);
      const stock = await cjGet(
        `/product/stock/queryByVid?vid=${encodeURIComponent(selected.vid)}`,
        token
      );
      const summary = summarizeStock(stock);
      if (!summary.inStock) {
        return { ok: false, blocking: true, reason: "out_of_stock", slug };
      }
      if (quantity < 1 || quantity > 5) {
        return { ok: false, blocking: true, reason: "invalid_quantity", slug };
      }
      await sleep(1100);
    }
    return { ok: true, blocking: false, reason: null };
  } catch (err) {
    console.warn("NOVAE_CJ_PREFLIGHT_DEGRADED", String(err?.message || err));
    return {
      ok: false,
      blocking: false,
      reason: "supplier_check_temporarily_unavailable"
    };
  }
}
async function createStripeCheckout(env, items, requestId) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe test secret is not configured");
  }

  const cart = normalizeCartItems(items);
  if (!cart.length || cart.length > 5) {
    throw new Error("Test cart is empty or has too many unique products");
  }

  // Preflight supplier validation before we even open Stripe.
  const preflight = await validateCjCartForCheckout(env, cart);
  if (preflight.blocking) {
    const e = new Error(preflight.reason);
    e.code = preflight.reason;
    e.slug = preflight.slug || null;
    throw e;
  }

  const safeRequestId = /^[A-Za-z0-9_-]{8,80}$/.test(String(requestId || ""))
    ? String(requestId)
    : crypto.randomUUID();
  const orderRef = orderReferenceFromRequestId(safeRequestId);

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", "https://midnightmidnightfil-tech.github.io/novae-store/checkout.html?stripe=success&session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url", "https://midnightmidnightfil-tech.github.io/novae-store/cart.html?stripe=cancelled");
  params.set("billing_address_collection", "auto");
  params.set("shipping_address_collection[allowed_countries][0]", "CA");
  params.set("phone_number_collection[enabled]", "true");
  params.set("locale", "fr-CA");
  params.set("client_reference_id", orderRef);
  params.set("payment_intent_data[metadata][store]", "NOVAE");
  params.set("payment_intent_data[metadata][order_ref]", orderRef);
  params.set("metadata[store]", "NOVAE_TEST");
  params.set("metadata[order_ref]", orderRef);
  params.set("metadata[cart]", cart.map(([slug, quantity]) => `${slug}:${quantity}`).join(","));
  params.set("metadata[cj_preflight]", preflight.ok ? "verified" : "degraded");

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
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `novae_test_${safeRequestId}`
    },
    body: params.toString()
  });
  const data = await res.json();
  if (!res.ok || !data?.url) {
    throw new Error(data?.error?.message || `Stripe HTTP ${res.status}`);
  }
  return { url: data.url, id: data.id, orderRef };
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
  const integrity = sessionIntegrity(session);
  const cartItems = parseStripeCartMetadata(session?.metadata?.cart);
  const shipping =
    session?.shipping_details ||
    session?.collected_information?.shipping_details ||
    null;
  const address = shipping?.address || session?.customer_details?.address || null;
  const destinationCountry = address?.country || null;
  const emailReady = Boolean(session?.customer_details?.email);
  const phoneReady = Boolean(session?.customer_details?.phone);
  const addressReady = Boolean(
    address?.line1 &&
    address?.city &&
    address?.postal_code &&
    destinationCountry === "CA"
  );

  if (
    session?.livemode !== false ||
    session?.payment_status !== "paid" ||
    !integrity.ok
  ) {
    return {
      dryRun: true,
      readyForCJ: false,
      integrityVerified: integrity.ok,
      destinationCountry,
      itemCount: cartItems.length,
      contactReady: emailReady && phoneReady && addressReady,
      reason: !integrity.ok ? "payment_integrity_failed" : "payment_not_confirmed",
      items: []
    };
  }

  if (!env.CJ_API_KEY) {
    return {
      dryRun: true,
      readyForCJ: false,
      integrityVerified: true,
      destinationCountry,
      itemCount: cartItems.length,
      contactReady: emailReady && phoneReady && addressReady,
      reason: "cj_not_configured",
      items: []
    };
  }

  if (!cartItems.length || cartItems.length > 5) {
    return {
      dryRun: true,
      readyForCJ: false,
      integrityVerified: true,
      destinationCountry,
      itemCount: cartItems.length,
      contactReady: emailReady && phoneReady && addressReady,
      reason: "dry_run_item_limit",
      items: []
    };
  }

  const token = await getAccessToken(env.CJ_API_KEY);
  const items = [];

  for (const item of cartItems) {
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

  const contactReady = emailReady && phoneReady && addressReady;
  return {
    dryRun: true,
    readyForCJ:
      integrity.ok &&
      contactReady &&
      destinationCountry === "CA" &&
      items.length === cartItems.length &&
      items.every((x) => x.variantFound && x.inStock),
    integrityVerified: integrity.ok,
    destinationCountry,
    itemCount: cartItems.length,
    contactReady,
    reason: contactReady ? null : "missing_shipping_contact",
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

  const integrity = sessionIntegrity(data);
  return {
    paid,
    paymentStatus: data.payment_status || null,
    status: data.status || null,
    currency: data.currency || null,
    amountTotal: Number(data.amount_total || 0),
    expectedAmountTotal: integrity.expectedAmount,
    integrityVerified: integrity.ok,
    orderRef: data.metadata?.order_ref || data.client_reference_id || null,
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



async function ensureDbSchema(env) {
  if (!env.DB) return false;

  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS stripe_events (
        event_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS test_orders (
        order_ref TEXT PRIMARY KEY,
        stripe_session_id TEXT UNIQUE NOT NULL,
        payment_status TEXT NOT NULL,
        amount_total INTEGER NOT NULL,
        currency TEXT NOT NULL,
        integrity_verified INTEGER NOT NULL DEFAULT 0,
        cj_ready INTEGER NOT NULL DEFAULT 0,
        destination_country TEXT,
        item_count INTEGER NOT NULL DEFAULT 0,
        cart_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  ]);

  return true;
}

async function claimWebhookEvent(env, eventId) {
  if (!env.DB || !eventId) return null;
  await ensureDbSchema(env);
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO stripe_events (event_id) VALUES (?)"
  ).bind(eventId).run();
  return Number(result?.meta?.changes || 0) > 0;
}

async function upsertTestOrder(env, session, cjDryRun) {
  if (!env.DB) return false;
  await ensureDbSchema(env);

  const orderRef =
    session?.metadata?.order_ref ||
    session?.client_reference_id ||
    null;
  if (!orderRef || !session?.id) return false;

  const cart = parseStripeCartMetadata(session?.metadata?.cart);
  const cartJson = JSON.stringify(
    cart.map((item) => ({ slug: item.slug, quantity: item.quantity }))
  );

  await env.DB.prepare(`
    INSERT INTO test_orders (
      order_ref,
      stripe_session_id,
      payment_status,
      amount_total,
      currency,
      integrity_verified,
      cj_ready,
      destination_country,
      item_count,
      cart_json,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(order_ref) DO UPDATE SET
      stripe_session_id = excluded.stripe_session_id,
      payment_status = excluded.payment_status,
      amount_total = excluded.amount_total,
      currency = excluded.currency,
      integrity_verified = excluded.integrity_verified,
      cj_ready = excluded.cj_ready,
      destination_country = excluded.destination_country,
      item_count = excluded.item_count,
      cart_json = excluded.cart_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    orderRef,
    session.id,
    session.payment_status || "unknown",
    Number(session.amount_total || 0),
    String(session.currency || "").toLowerCase(),
    sessionIntegrity(session).ok ? 1 : 0,
    cjDryRun?.readyForCJ ? 1 : 0,
    cjDryRun?.destinationCountry || null,
    Number(cjDryRun?.itemCount || cart.length || 0),
    cartJson
  ).run();

  return true;
}

async function getTestOrder(env, orderRef) {
  if (!env.DB || !orderRef) return null;
  await ensureDbSchema(env);
  return env.DB.prepare(`
    SELECT
      order_ref,
      stripe_session_id,
      payment_status,
      amount_total,
      currency,
      integrity_verified,
      cj_ready,
      destination_country,
      item_count,
      created_at,
      updated_at
    FROM test_orders
    WHERE order_ref = ?
    LIMIT 1
  `).bind(orderRef).first();
}


async function runDbSelfTest(env) {
  if (!env.DB) {
    return { ok: false, reason: "db_not_bound" };
  }

  await ensureDbSchema(env);

  const eventId = "evt_novae_d1_self_test";
  const orderRef = "NVT-D1SELFTEST";
  const sessionId = "cs_test_novae_d1_self_test";

  // Start from a clean deterministic state.
  await env.DB.batch([
    env.DB.prepare("DELETE FROM test_orders WHERE order_ref = ?").bind(orderRef),
    env.DB.prepare("DELETE FROM stripe_events WHERE event_id = ?").bind(eventId)
  ]);

  const firstClaim = await claimWebhookEvent(env, eventId);
  const secondClaim = await claimWebhookEvent(env, eventId);

  await env.DB.prepare(`
    INSERT OR REPLACE INTO test_orders (
      order_ref,
      stripe_session_id,
      payment_status,
      amount_total,
      currency,
      integrity_verified,
      cj_ready,
      destination_country,
      item_count,
      cart_json,
      updated_at
    )
    VALUES (?, ?, 'paid', 100, 'cad', 1, 1, 'CA', 1, '[]', CURRENT_TIMESTAMP)
  `).bind(orderRef, sessionId).run();

  const row = await env.DB.prepare(
    "SELECT order_ref, payment_status, integrity_verified, cj_ready FROM test_orders WHERE order_ref = ?"
  ).bind(orderRef).first();

  const ok = Boolean(
    firstClaim === true &&
    secondClaim === false &&
    row &&
    row.order_ref === orderRef &&
    row.payment_status === "paid" &&
    Number(row.integrity_verified) === 1 &&
    Number(row.cj_ready) === 1
  );

  await env.DB.batch([
    env.DB.prepare("DELETE FROM test_orders WHERE order_ref = ?").bind(orderRef),
    env.DB.prepare("DELETE FROM stripe_events WHERE event_id = ?").bind(eventId)
  ]);

  return {
    ok,
    writeReadDelete: Boolean(row),
    persistentDedupe: firstClaim === true && secondClaim === false
  };
}
async function webhookEventProcessed(eventId) {
  if (!eventId) return false;
  const key = new Request(`https://novae.internal/stripe-events/${encodeURIComponent(eventId)}`);
  return Boolean(await caches.default.match(key));
}

async function markWebhookEventProcessed(eventId) {
  if (!eventId) return;
  const key = new Request(`https://novae.internal/stripe-events/${encodeURIComponent(eventId)}`);
  await caches.default.put(
    key,
    new Response("processed", {
      headers: { "Cache-Control": "public, max-age=86400" }
    })
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(origin) });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/test/d1-self-test") {
      if (!ALLOWED_ORIGINS.has(origin) || request.headers.get("X-NOVAE-Test") !== "d1-smoke") {
        return json({ error: "Not allowed" }, 403, origin, { "Cache-Control": "no-store" });
      }
      try {
        const result = await runDbSelfTest(env);
        return json(result, result.ok ? 200 : 503, origin, { "Cache-Control": "no-store" });
      } catch (err) {
        return json(
          { ok: false, error: "D1 self-test failed" },
          500,
          origin,
          { "Cache-Control": "no-store" }
        );
      }
    }

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

        let claimedInDb = null;
        if (env.DB) {
          claimedInDb = await claimWebhookEvent(env, event?.id);
          if (claimedInDb === false) {
            return json({ received: true, duplicate: true, persistence: "d1" }, 200, "", { "Cache-Control": "no-store" });
          }
        } else if (await webhookEventProcessed(event?.id)) {
          return json({ received: true, duplicate: true, persistence: "cache-fallback" }, 200, "", { "Cache-Control": "no-store" });
        }

        if (
          event?.type === "checkout.session.completed" &&
          session?.livemode === false &&
          session?.payment_status === "paid" &&
          session?.metadata?.store === "NOVAE_TEST"
        ) {
          const integrity = sessionIntegrity(session);
          if (!integrity.ok) {
            console.error("NOVAE_TEST_PAYMENT_INTEGRITY_FAILED", {
              eventId: event.id,
              sessionId: session.id,
              amountTotal: session.amount_total,
              expectedAmount: integrity.expectedAmount
            });
            await markWebhookEventProcessed(event.id);
            return json({ received: true, accepted: false }, 200, "", { "Cache-Control": "no-store" });
          }

          const cjDryRun = await buildCjDryRun(env, session);
          if (env.DB) {
            await upsertTestOrder(env, session, cjDryRun);
          }
          console.log("NOVAE_TEST_PAYMENT_CONFIRMED", {
            eventId: event.id,
            sessionId: session.id,
            orderRef: session.metadata?.order_ref || session.client_reference_id || null,
            amountTotal: session.amount_total,
            currency: session.currency,
            cjDryRun: {
              readyForCJ: cjDryRun.readyForCJ,
              integrityVerified: cjDryRun.integrityVerified,
              contactReady: cjDryRun.contactReady,
              destinationCountry: cjDryRun.destinationCountry,
              itemCount: cjDryRun.itemCount,
              reason: cjDryRun.reason
            }
          });
        }

        if (!env.DB) {
          await markWebhookEventProcessed(event?.id);
        }
        return json({
          received: true,
          duplicate: false,
          persistence: env.DB ? "d1" : "cache-fallback"
        }, 200, "", { "Cache-Control": "no-store" });
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
        const session = await createStripeCheckout(env, body?.items, body?.requestId);
        return json({ url: session.url, orderRef: session.orderRef }, 200, origin, { "Cache-Control": "no-store" });
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

    if (url.pathname === "/test-order/status") {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return json({ error: "Origin not allowed" }, 403, origin);
      }
      if (!env.DB) {
        return json({ error: "Persistent order storage not configured" }, 503, origin);
      }
      try {
        const orderRef = (url.searchParams.get("order_ref") || "").trim();
        if (!/^NVT-[A-Z0-9]+$/.test(orderRef)) {
          return json({ error: "Invalid order reference" }, 400, origin);
        }
        const row = await getTestOrder(env, orderRef);
        if (!row) {
          return json({ error: "Order not found" }, 404, origin);
        }
        return json({
          orderRef: row.order_ref,
          paymentStatus: row.payment_status,
          amountTotal: row.amount_total,
          currency: row.currency,
          integrityVerified: Boolean(row.integrity_verified),
          cjReady: Boolean(row.cj_ready),
          destinationCountry: row.destination_country,
          itemCount: row.item_count,
          updatedAt: row.updated_at,
          testMode: true
        }, 200, origin, { "Cache-Control": "no-store" });
      } catch (err) {
        return json({ error: "Order lookup failed" }, 500, origin);
      }
    }

    if (url.pathname === "/health") {
      return json(
        {
          ok: true,
          service: "NOVAE CJ bridge",
          secretConfigured: Boolean(env.CJ_API_KEY),
          stripeTestConfigured: Boolean(env.STRIPE_SECRET_KEY),
          stripeWebhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
          fulfillmentMode: "dry-run",
          d1Configured: Boolean(env.DB)
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
