from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
BASE = "https://midnightmidnightfil-tech.github.io/novae-store/"

# --- JavaScript storefront fixes ---
app = root / "assets" / "app.js"
s = app.read_text(encoding="utf-8")

if "function rootPath()" not in s:
    s = s.replace(
        "function productCard(p){return ",
        "function rootPath(){return $('[data-header]')?.dataset.root||''}\nfunction productCard(p){const root=rootPath();return "
    )
s = s.replace('href="products/${p.slug}.html"', 'href="${root}products/${p.slug}.html"')

s = s.replace(
    "Livraison suivie · Retours selon la politique · Aucun faux avis ni fausse promotion",
    "Boutique en préparation · Paiement non activé · Prix en CAD"
)
s = s.replace(
    '<a href="${header.dataset.root||\'\'}shop.html?sort=new">Nouveautés</a><a href="${header.dataset.root||\'\'}shop.html?sort=popular">Meilleures ventes</a>',
    '<a href="${header.dataset.root||\'\'}shop.html?sort=selection">Sélection NOVAÉ</a>'
)
s = s.replace(
    '<div class="nav-actions"><a class="icon-btn account-link" href="${header.dataset.root||\'\'}account.html">Compte</a><a class="icon-btn" href="${header.dataset.root||\'\'}shop.html" aria-label="Rechercher">⌕</a>',
    '<div class="nav-actions"><a class="icon-btn" href="${header.dataset.root||\'\'}shop.html" aria-label="Rechercher">⌕</a>'
)
s = s.replace(
    "© 2026 NOVAÉ — identité provisoire à vérifier avant usage commercial. Les pages juridiques sont des modèles à faire valider et adapter aux lois applicables avant lancement.",
    "© 2026 NOVAÉ — boutique en préparation. Les commandes ne sont pas encore ouvertes. Les politiques et informations commerciales doivent être finalisées avant le lancement."
)

s = re.sub(
    r"function shop\(\)\{.*?\nfunction productPage\(\)",
    """function shop(){const grid=$('#shop-grid'); if(!grid)return; const q=$('#q'),cat=$('#category'),sort=$('#sort'),count=$('#results-count'); const params=new URLSearchParams(location.search); if(params.get('category'))cat.value=params.get('category'); const requestedSort=params.get('sort'); if(requestedSort&&[...sort.options].some(o=>o.value===requestedSort))sort.value=requestedSort; function render(){let arr=[...PRODUCTS];const term=q.value.toLowerCase().trim();if(term)arr=arr.filter(p=>(p.name+' '+p.category+' '+p.short).toLowerCase().includes(term));if(cat.value)arr=arr.filter(p=>p.category===cat.value);if(sort.value==='price-asc')arr.sort((a,b)=>a.price-b.price);if(sort.value==='price-desc')arr.sort((a,b)=>b.price-a.price);if(sort.value==='name-asc')arr.sort((a,b)=>a.name.localeCompare(b.name,'fr'));grid.innerHTML=arr.map(productCard).join('')||'<div class=\"empty\">Aucun produit trouvé.</div>';count.textContent=`${arr.length} produit${arr.length>1?'s':''}`;wireAdds()}[q,cat,sort].forEach(x=>x.addEventListener('input',render));render()}
function productPage()""",
    s,
    flags=re.S,
)

s = s.replace(
    "Les taxes et frais de livraison définitifs doivent être calculés par la plateforme de paiement/commerce connectée.",
    "Les commandes ne sont pas encore ouvertes. Les taxes, la livraison et le paiement seront activés après connexion de la plateforme commerciale."
)
s = s.replace("Passer au paiement</a>", "Voir le récapitulatif</a>")
s = s.replace(
    "Formulaire prêt. Connectez un service d’envoi (Shopify, Formspree, backend ou CRM) avant la mise en ligne.",
    "Ce formulaire n’est pas encore connecté : aucun message n’a été envoyé. Le support sera activé avant l’ouverture des commandes."
)
# --- Live CJ availability on product pages (supplier IDs stay server-side) ---
live_product_js = r'''const CJ_AVAILABILITY_API='https://novae-cj-api.midnightmidnightfil.workers.dev';
async function loadLiveProductData(p){
  const stockBox=$('#live-stock'),shippingBox=$('#live-shipping');
  if(stockBox){
    try{
      const r=await fetch(`${CJ_AVAILABILITY_API}/availability?slug=${encodeURIComponent(p.slug)}`,{headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('availability');
      const data=await r.json();
      const when=data.checkedAt?new Date(data.checkedAt).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'}):'';
      if(data.productFound&&data.inStock){
        stockBox.innerHTML=`<strong>Disponibilité vérifiée</strong><br>Article disponible au moment de la vérification${when?` (${when})`:''}. Le stock peut changer avant la commande.`;
      }else if(data.productFound){
        stockBox.innerHTML='<strong>Disponibilité à confirmer</strong><br>Aucun stock fournisseur n’a été confirmé pour le moment.';
      }else{
        stockBox.innerHTML='<strong>Disponibilité à confirmer</strong><br>La référence doit être revérifiée avant l’ouverture des commandes.';
      }
    }catch(e){
      stockBox.innerHTML='<strong>Disponibilité à confirmer</strong><br>La vérification en direct est momentanément indisponible.';
    }
  }
  if(shippingBox){
    try{
      const r=await fetch(`${CJ_AVAILABILITY_API}/shipping?slug=${encodeURIComponent(p.slug)}&quantity=1`,{headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('shipping');
      const data=await r.json();
      const cheapest=Array.isArray(data.options)&&data.options.length?data.options[0]:null;
      if(cheapest){
        const usd=new Intl.NumberFormat('fr-CA',{style:'currency',currency:'USD'}).format(cheapest.priceUsd);
        shippingBox.innerHTML=`<strong>Estimation de livraison au Canada</strong><br>Pour 1 article : dès ${usd} · ${cheapest.estimatedDays||'délai à confirmer'} jours avec ${cheapest.name}. Estimation CJ sans code postal précis; le prix et le délai finaux peuvent varier.`;
      }else{
        shippingBox.innerHTML='<strong>Livraison au Canada</strong><br>Aucune estimation automatique n’est disponible pour le moment.';
      }
    }catch(e){
      shippingBox.innerHTML='<strong>Livraison au Canada</strong><br>Estimation momentanément indisponible.';
    }
  }
}
function productPage(){const host=$('#product-host');if(!host)return;const id=host.dataset.id;const p=PRODUCTS.find(x=>x.id===id);if(!p){host.innerHTML='<div class="empty">Produit introuvable.</div>';return}document.title=`${p.name} | NOVAÉ`;const d=$('meta[name=description]');if(d)d.content=p.short;host.innerHTML=`<div class="product-detail"><div class="gallery">${imgHTML(p)}</div><div><div class="product-meta">${p.category}</div><h1>${p.name}</h1><div class="price" style="font-size:26px">${fmt.format(p.price)}</div><div id="live-stock" class="notice" style="margin:14px 0">Vérification de la disponibilité…</div><div id="live-shipping" class="notice" style="margin:14px 0">Calcul de la livraison vers le Canada…</div><p>${p.short}</p><ul class="feature-list">${p.highlights.map(x=>`<li>${x}</li>`).join('')}</ul><div class="field"><label for="variant">Variante</label><select id="variant">${p.variants.map(v=>`<option>${v}</option>`).join('')}</select></div><div class="filter-row"><div class="field"><label for="qty">Quantité</label><input id="qty" class="qty" type="number" min="1" value="1"></div><button class="btn" id="add-product">Ajouter au panier</button></div><div class="specs"><div class="spec"><small>Matériaux</small>${p.materials}</div><div class="spec"><small>Dimensions</small>${p.dimensions}</div><div class="spec"><small>Poids</small>${p.weight}</div><div class="spec"><small>Livraison</small>${p.shipping}</div></div><h2 style="font-family:Georgia,serif;font-weight:500">Pensé pour le quotidien</h2><p>${p.description}</p><details><summary>Retours</summary><p>Retour selon notre politique publiée, après vérification de l’éligibilité de l’article. Les conditions finales doivent être adaptées à votre juridiction.</p></details><details><summary>Quand ma commande sera-t-elle livrée ?</summary><p>Le délai dépend de la destination, du traitement et du transporteur. Nous communiquons une estimation et un suivi dès qu’ils sont disponibles, sans promettre une date précise dépendante du fournisseur.</p></details></div></div><section class="section"><div class="section-head"><h2>Vous aimerez aussi</h2></div><div class="product-grid" id="related"></div></section>`;$('#add-product').addEventListener('click',()=>addToCart(p.id,Math.max(1,parseInt($('#qty').value)||1)));const rel=PRODUCTS.filter(x=>x.id!==p.id&&(x.category===p.category)).slice(0,4);$('#related').innerHTML=rel.map(productCard).join('');wireAdds();loadLiveProductData(p)}
function cartPage()'''
s = re.sub(
    r"function productPage\(\)\{.*?\nfunction cartPage\(\)",
    live_product_js,
    s,
    flags=re.S,
)

app.write_text(s, encoding="utf-8")

# --- Catalog wording ---
shop = root / "shop.html"
s = shop.read_text(encoding="utf-8")
s = s.replace(
    '<option value="popular">Popularité</option><option value="new">Nouveautés</option>',
    '<option value="selection">Sélection NOVAÉ</option><option value="name-asc">Nom A–Z</option>'
)
shop.write_text(s, encoding="utf-8")

home = root / "index.html"
s = home.read_text(encoding="utf-8")
s = s.replace("<h2>Nos produits populaires</h2>", "<h2>La sélection NOVAÉ</h2>")
s = s.replace(
    '<span class="badge">01</span><h3>Paiement sécurisé</h3><p>Le checkout est préparé pour être relié à un prestataire de paiement reconnu.</p>',
    '<span class="badge">01</span><h3>Paiement à connecter</h3><p>Les commandes ne sont pas encore ouvertes. Un prestataire de paiement reconnu sera relié avant le lancement.</p>'
)
s = s.replace(
    '<form data-demo-form><label class="sr-only" for="news-email">Votre courriel</label><input id="news-email" type="email" required placeholder="votre@email.com"><button class="btn light">S’inscrire</button><p data-form-message hidden></p></form>',
    '<div class="notice" style="max-width:620px;margin-top:20px">Inscription à l’infolettre bientôt disponible.</div>'
)
home.write_text(s, encoding="utf-8")

# --- Checkout: no personal data collection until payments are connected ---
checkout = root / "checkout.html"
s = checkout.read_text(encoding="utf-8")
s = s.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">')
s = s.replace(
    '<span class="eyebrow">Pré-lancement</span><h1>Checkout</h1><p>Le parcours client est prêt jusqu’à l’étape de paiement. Un compte marchand réel doit être connecté pour encaisser.</p>',
    '<span class="eyebrow">Boutique en préparation</span><h1>Paiement bientôt disponible</h1><p>Le catalogue et le panier sont actifs pour les tests. Les commandes ne sont pas encore ouvertes.</p>'
)
start = s.index('<section class="section"><div class="container checkout-grid">')
end = s.index('</section></main>')
section = '''<section class="section"><div class="container checkout-grid"><div class="checkout-box"><h2>Commandes non ouvertes</h2><div class="notice warning"><strong>NOVAÉ est encore en préparation.</strong> Aucun paiement ni commande réelle n’est accepté pour le moment.</div><p>Avant l’ouverture, nous connecterons un prestataire de paiement, le calcul des taxes, les frais de livraison et le traitement fournisseur.</p><a class="btn secondary" href="shop.html">Retour à la boutique</a></div><aside class="checkout-box"><h2>Votre panier</h2><div id="checkout-summary"></div><p class="notice">Ce récapitulatif est affiché uniquement pour tester le parcours de la boutique.</p></aside></div></section>'''
s = s[:start] + section + s[end + len("</section>"):]
checkout.write_text(s, encoding="utf-8")

account = root / "account.html"
s = account.read_text(encoding="utf-8")
s = s.replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">')
s = s.replace(
    '<span class="eyebrow">Compte client</span><h1>Connexion</h1><p>L’interface est réservée, mais l’authentification nécessite votre plateforme e-commerce ou un service de comptes clients.</p>',
    '<span class="eyebrow">Bientôt disponible</span><h1>Espace client</h1><p>La connexion client sera activée lorsque la plateforme de commandes sera reliée.</p>'
)
account.write_text(s, encoding="utf-8")

contact = root / "contact.html"
s = contact.read_text(encoding="utf-8")
s = s.replace(
    "Le formulaire est prêt côté interface. Connectez votre adresse de support et un service d’envoi avant la publication.",
    "Le support par formulaire sera activé avant l’ouverture des commandes."
)
s = s.replace('<form class="checkout-box" data-demo-form>', '<form class="checkout-box" data-demo-form onsubmit="return false">')
s = s.replace(
    '<button class="btn">Envoyer</button>',
    '<div class="notice warning">Ce formulaire n’envoie pas encore de message.</div><button class="btn" disabled>Envoi bientôt disponible</button>'
)
contact.write_text(s, encoding="utf-8")

# --- Use supplier-hosted CJ images rather than unrelated third-party retailers ---
products = root / "assets" / "products.js"
s = products.read_text(encoding="utf-8")
s = s.replace(
    "https://www.gifttree.co.nz/media/commerce_products/8441/ec1cbbb8-589c-462d-876d-3e576871c8e1.webp",
    "https://cf.cjdropshipping.com/quick/product/ec1cbbb8-589c-462d-876d-3e576871c8e1.jpg"
)
s = s.replace(
    "https://image.rakuten.co.jp/plusnao/cabinet/itempic2824/kom-77329_1.jpg",
    "https://cf.cjdropshipping.com/quick/product/5aaf2512-caa6-48f1-9a77-b653f497fca3.jpg"
)
s = s.replace(
    "https://media.adeo.com/mkp/4f68388d54d3efe5d69b944d4608e601/media.jpg",
    "https://cf.cjdropshipping.com/quick/product/82a8d525-9fec-4fca-aa06-2639d05c9cee.jpg"
)
products.write_text(s, encoding="utf-8")

# --- SEO for the actual GitHub Pages URL ---
(root / "robots.txt").write_text(
    f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n",
    encoding="utf-8"
)

sitemap = root / "sitemap.xml"
s = sitemap.read_text(encoding="utf-8").replace("https://YOUR-DOMAIN.example/", BASE)
sitemap.write_text(s, encoding="utf-8")

for page in (root / "products").glob("*.html"):
    s = page.read_text(encoding="utf-8")
    url = f"{BASE}products/{page.name}"
    s = re.sub(r'<link rel="canonical" href="[^"]+">', f'<link rel="canonical" href="{url}">', s)
    if 'property="og:url"' not in s:
        s = s.replace("</head>", f'<meta property="og:url" content="{url}"></head>')
    page.write_text(s, encoding="utf-8")

for name in [
    "index.html", "shop.html", "about.html", "faq.html", "contact.html",
    "privacy.html", "terms.html", "returns.html", "refunds.html", "shipping.html"
]:
    page = root / name
    s = page.read_text(encoding="utf-8")
    url = BASE if name == "index.html" else BASE + name
    if 'rel="canonical"' not in s:
        s = s.replace("</head>", f'<link rel="canonical" href="{url}"></head>')
    page.write_text(s, encoding="utf-8")
