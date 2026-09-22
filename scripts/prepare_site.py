from pathlib import Path
import base64
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
        shippingBox.innerHTML=`<strong>Estimation de livraison au Canada</strong><br>${cheapest.estimatedDays||'Délai à confirmer'} jours avec ${cheapest.name}. Le prix affiché est calculé avec une provision de livraison standard; le montant final dépendra de l’adresse et sera confirmé au paiement.`;
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

# --- Stripe test checkout button in cart ---
stripe_cart_js = r'''async function startStripeTestCheckout(button){
  const cart=getCart();
  if(!cart.length)return;
  const items=cart.map(it=>{
    const p=PRODUCTS.find(x=>x.id===it.id);
    return p?{slug:p.slug,quantity:Math.min(5,Math.max(1,it.qty||1))}:null;
  }).filter(Boolean);
  if(!items.length)return;

  const cartSignature=JSON.stringify(items.map(x=>[x.slug,x.quantity]).sort((a,b)=>a[0].localeCompare(b[0])));
  let requestId=sessionStorage.getItem('novae_checkout_request_id');
  const previousSignature=sessionStorage.getItem('novae_checkout_cart_signature');
  if(!requestId||previousSignature!==cartSignature){
    requestId=(crypto.randomUUID?crypto.randomUUID():('req_'+Date.now()+'_'+Math.random().toString(36).slice(2)));
    sessionStorage.setItem('novae_checkout_request_id',requestId);
    sessionStorage.setItem('novae_checkout_cart_signature',cartSignature);
  }

  const oldText=button.textContent;
  button.disabled=true;
  button.textContent='Vérification du stock…';

  try{
    const r=await fetch('https://novae-cj-api.midnightmidnightfil.workers.dev/stripe/create-checkout-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({items,requestId})
    });
    const data=await r.json();
    if(!r.ok||!data.url){
      const detail=String(data.detail||data.error||'checkout');
      const err=new Error(detail);
      err.detail=detail;
      throw err;
    }
    if(data.orderRef)sessionStorage.setItem('novae_order_ref',data.orderRef);
    window.location.assign(data.url);
  }catch(e){
    button.disabled=false;
    button.textContent=oldText;
    const msg=$('#stripe-test-message');
    if(msg){
      const detail=String(e?.detail||e?.message||'');
      let friendly='Le paiement test est momentanément indisponible. Réessayez dans quelques instants.';
      if(detail.includes('out_of_stock')) friendly='Ce produit est actuellement indiqué hors stock chez le fournisseur.';
      else if(detail.includes('variant_unavailable')) friendly='La variante sélectionnée n’est plus disponible chez le fournisseur.';
      else if(detail.includes('invalid_quantity')) friendly='La quantité demandée n’est pas valide.';
      msg.hidden=false;
      msg.textContent=friendly;
    }
    console.error('NOVAÉ Stripe test checkout:',e);
  }
}

function cartPage(){
  const host=$('#cart-host');
  if(!host)return;
  const cartParams=new URLSearchParams(location.search);
  if(cartParams.get('stripe')==='cancelled'){
    sessionStorage.removeItem('novae_checkout_request_id');
    sessionStorage.removeItem('novae_checkout_cart_signature');
    sessionStorage.removeItem('novae_order_ref');
    history.replaceState({},'',location.pathname);
  }

  function render(){
    const c=getCart();

    if(!c.length){
      host.innerHTML='<div class="empty"><h2>Votre panier est vide</h2><p>Découvrez notre sélection d’objets utiles pour la maison et le quotidien.</p><a class="btn" href="shop.html">Voir la boutique</a></div>';
      return;
    }

    let subtotal=0;
    const lines=c.map(it=>{
      const p=PRODUCTS.find(x=>x.id===it.id);
      if(!p)return'';
      const qty=Math.min(5,Math.max(1,Number(it.qty)||1));
      subtotal+=p.price*qty;
      return `<div class="cart-line">
        <div class="cart-thumb">${imgHTML(p)}</div>
        <div><strong>${p.name}</strong><div class="product-meta">${p.category}</div></div>
        <div><input class="qty" data-qty="${p.id}" type="number" min="1" max="5" value="${qty}"></div>
        <div class="line-price">${fmt.format(p.price*qty)}</div>
        <button type="button" class="icon-btn remove" data-remove="${p.id}" aria-label="Supprimer">×</button>
      </div>`;
    }).join('');

    host.innerHTML=lines+`<div class="cart-total">
      <div class="line"><span>Sous-total</span><strong>${fmt.format(subtotal)}</strong></div>
      <div class="line"><span>Livraison</span><span>Provision incluse dans les prix; adresse confirmée dans Stripe</span></div>
      <div class="line total"><span>Total test</span><span>${fmt.format(subtotal)}</span></div>
      <p class="notice warning"><strong>Mode test Stripe.</strong> Aucun argent réel ne sera prélevé. Les commandes commerciales ne sont pas encore ouvertes.</p>
      <button type="button" class="btn" id="stripe-test-checkout" style="width:100%">Paiement test Stripe</button>
      <p id="stripe-test-message" class="notice warning" hidden></p>
    </div>`;
  }

  host.addEventListener('click',async(e)=>{
    const remove=e.target.closest('[data-remove]');
    if(remove){
      e.preventDefault();
      saveCart(getCart().filter(x=>x.id!==remove.dataset.remove));
      render();
      return;
    }

    const checkoutBtn=e.target.closest('#stripe-test-checkout');
    if(checkoutBtn){
      e.preventDefault();
      await startStripeTestCheckout(checkoutBtn);
    }
  });

  host.addEventListener('change',(e)=>{
    const input=e.target.closest('[data-qty]');
    if(!input)return;
    const c=getCart();
    const x=c.find(y=>y.id===input.dataset.qty);
    if(x){
      x.qty=Math.min(5,Math.max(1,parseInt(input.value,10)||1));
      saveCart(c);
      render();
    }
  });

  render();
}
function checkout()'''
s = re.sub(
    r"function cartPage\(\)\{.*?\nfunction checkout\(\)",
    stripe_cart_js,
    s,
    flags=re.S,
)

s = s.replace(
    "Boutique en préparation · Paiement non activé · Prix en CAD",
    "Boutique en préparation · Stripe en mode test · Aucun paiement réel"
)

# --- Verify Stripe test payment on return page ---
stripe_checkout_js = r'''async function checkout(){
  const summary=$('#checkout-summary');
  if(!summary)return;

  const params=new URLSearchParams(location.search);
  const stripeState=params.get('stripe');
  const sessionId=params.get('session_id');

  function renderCartSummary(){
    const c=getCart();
    let subtotal=0;
    summary.innerHTML=c.map(it=>{
      const p=PRODUCTS.find(x=>x.id===it.id);
      if(!p)return'';
      subtotal+=p.price*it.qty;
      return `<div class="line"><span>${p.name} × ${it.qty}</span><strong>${fmt.format(p.price*it.qty)}</strong></div>`;
    }).join('')+`<div class="line total"><span>Sous-total</span><span>${fmt.format(subtotal)}</span></div><div class="line"><span>Livraison</span><span>Provision incluse</span></div>`;
  }

  renderCartSummary();

  if(stripeState!=='success'){
    if(stripeState==='cancelled'){
      const grid=$('.checkout-grid');
      const left=grid?.firstElementChild;
      if(left){
        left.innerHTML='<h2>Paiement test annulé</h2><div class="notice warning"><strong>Aucun paiement n’a été effectué.</strong> Votre panier a été conservé.</div><p>Vous pouvez retourner au panier et réessayer quand vous voulez.</p><a class="btn secondary" href="cart.html">Retour au panier</a>';
      }
    }
    return;
  }

  const grid=$('.checkout-grid');
  const left=grid?.firstElementChild;
  if(left){
    left.innerHTML='<h2>Vérification Stripe…</h2><div class="notice">Nous confirmons le paiement test directement auprès de Stripe.</div>';
  }

  if(!sessionId){
    if(left){
      left.innerHTML='<h2>Retour Stripe reçu</h2><div class="notice warning"><strong>Impossible de confirmer cette ancienne session.</strong> Aucun traitement fournisseur n’a été lancé.</div><p>Refaites un paiement test après cette mise à jour pour voir la confirmation complète.</p><a class="btn secondary" href="cart.html">Retour au panier</a>';
    }
    return;
  }

  try{
    const r=await fetch(`https://novae-cj-api.midnightmidnightfil.workers.dev/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`,{
      headers:{Accept:'application/json'}
    });
    const data=await r.json();
    if(!r.ok)throw new Error(data.detail||'verification');

    if(data.paid&&data.testMode){
      const amount=new Intl.NumberFormat('fr-CA',{style:'currency',currency:(data.currency||'cad').toUpperCase()}).format((data.amountTotal||0)/100);
      saveCart([]);
      renderCartSummary();
      if(left){
        const cj=data.cjDryRun;
        const orderRef=data.orderRef||sessionStorage.getItem('novae_order_ref')||'Référence indisponible';
        const integrityBlock=data.integrityVerified
          ? '<div class="notice" style="margin-top:14px"><strong>Intégrité du montant vérifiée ✓</strong><br>Le total Stripe correspond exactement aux prix NOVAÉ calculés côté serveur.</div>'
          : '<div class="notice warning" style="margin-top:14px"><strong>Intégrité à vérifier</strong><br>Le total Stripe ne correspond pas au montant attendu.</div>';
        const cjBlock=cj?.readyForCJ
          ? `<div class="notice" style="margin-top:14px"><strong>Dry-run CJ prêt ✓</strong><br>${cj.itemCount} article${cj.itemCount>1?'s':''} validé${cj.itemCount>1?'s':''} : produit, variante, stock et informations de livraison nécessaires confirmés pour le Canada.</div>`
          : `<div class="notice warning" style="margin-top:14px"><strong>Dry-run CJ à vérifier</strong><br>Le paiement test est confirmé, mais la préparation fournisseur n’est pas encore entièrement validée.</div>`;
        left.innerHTML=`<h2>Paiement test confirmé ✓</h2><div class="notice"><strong>Stripe a confirmé le paiement test.</strong><br>Montant confirmé : ${amount}.<br>Référence test : <strong>${orderRef}</strong></div>${integrityBlock}${cjBlock}<div id="d1-order-status" class="notice" style="margin-top:14px"><strong>Enregistrement D1…</strong><br>Nous attendons la confirmation persistante du webhook Stripe.</div><p>Aucun argent réel n’a été prélevé et aucune commande CJ réelle n’a été créée.</p><a class="btn secondary" href="shop.html">Retour à la boutique</a>`;

        const d1Box=$('#d1-order-status');
        for(let attempt=0;attempt<8;attempt++){
          try{
            const sr=await fetch(`https://novae-cj-api.midnightmidnightfil.workers.dev/test-order/status?order_ref=${encodeURIComponent(orderRef)}`,{headers:{Accept:'application/json'}});
            if(sr.ok){
              const sd=await sr.json();
              if(d1Box){
                d1Box.innerHTML=`<strong>Commande test enregistrée dans D1 ✓</strong><br>Statut : ${sd.paymentStatus} · intégrité : ${sd.integrityVerified?'vérifiée':'à vérifier'} · CJ dry-run : ${sd.cjReady?'prêt':'à vérifier'}.`;
              }
              break;
            }
          }catch(e){}
          await new Promise(resolve=>setTimeout(resolve,750));
        }
        if(d1Box&&d1Box.textContent.includes('Enregistrement D1')){
          d1Box.classList.add('warning');
          d1Box.innerHTML='<strong>Enregistrement D1 en attente</strong><br>Le paiement est confirmé, mais le webhook n’a pas encore été retrouvé dans la base. Aucun fulfillment réel n’est lancé.';
        }
      }
      const h1=$('main h1');
      if(h1)h1.textContent='Paiement test confirmé';
      const intro=$('main .hero p');
      if(intro)intro.textContent='Le flux Stripe fonctionne correctement en environnement de test.';
      sessionStorage.removeItem('novae_checkout_request_id');
      sessionStorage.removeItem('novae_checkout_cart_signature');
      sessionStorage.removeItem('novae_order_ref');
      history.replaceState({},'',location.pathname+'?stripe=verified');
    }else{
      if(left){
        left.innerHTML='<h2>Paiement non confirmé</h2><div class="notice warning"><strong>Stripe n’indique pas un paiement terminé.</strong> Le panier a été conservé.</div><a class="btn secondary" href="cart.html">Retour au panier</a>';
      }
    }
  }catch(e){
    if(left){
      left.innerHTML='<h2>Vérification indisponible</h2><div class="notice warning"><strong>Le paiement test n’a pas pu être vérifié.</strong> Le panier a été conservé et aucune commande fournisseur n’a été lancée.</div><a class="btn secondary" href="cart.html">Retour au panier</a>';
    }
    console.error('NOVAÉ Stripe verification:',e);
  }
}
function formDemo()'''
s = re.sub(
    r"function checkout\(\)\{.*?\nfunction formDemo\(\)",
    stripe_checkout_js,
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

# --- Missing / improved product images ---
repo_root = Path(__file__).resolve().parent.parent
sink_b64 = repo_root / "assets" / "sink-storage-rack.b64"
sink_out = root / "assets" / "sink-storage-rack.jpg"
if sink_b64.exists():
    sink_out.write_bytes(base64.b64decode(sink_b64.read_text(encoding="utf-8").strip()))

image_overrides = {
    "magnetic-cable-clips": "https://cf.cjdropshipping.com/17174592/2406040438510321900.jpg",
    "sink-storage-rack": "https://midnightmidnightfil-tech.github.io/novae-store/assets/sink-storage-rack.jpg?v=3",
}
for slug, image_url in image_overrides.items():
    pattern = rf'("slug": "{re.escape(slug)}"[\s\S]*?"image": )"[^"]*"'
    s, n = re.subn(pattern, rf'\g<1>"{image_url}"', s, count=1)
    if n != 1:
        raise RuntimeError(f"Could not update product image for {slug}")

# --- Retail prices based on live CJ variant + Canada freight audits ---
# Conservative planning model: supplier + standard Canada freight, FX buffer,
# estimated payment fee, and target gross margin. Existing higher prices are kept.
price_overrides = {
    "silicone-kitchen-set": 64.90,
    "iced-coffee-cup": 24.90,
    "expandable-dish-rack": 29.90,
    "wooden-lunch-box": 54.90,
    "magnetic-cable-clips": 18.90,
    "travel-jewelry-box": 44.90,
    "stackable-drawer": 24.90,
    "foldable-coffee-cup": 19.90,
    "ceramic-tea-mug": 44.90,
    "japanese-tableware-set": 34.90,
    "cotton-table-mat": 21.90,
    "fruit-drain-basket": 24.90,
    "sink-storage-rack": 29.90,
    "woven-storage-basket": 59.90,
    "desktop-water-dispenser": 49.90,
    "wall-spice-rack": 34.90,
}
for slug, price in price_overrides.items():
    pattern = rf'("slug": "{re.escape(slug)}"[\s\S]*?"price": )\d+(?:\.\d+)?'
    s, n = re.subn(pattern, rf'\g<1>{price:.2f}', s, count=1)
    if n != 1:
        raise RuntimeError(f"Could not update retail price for {slug}")

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


# --- Cache bust storefront assets ---
asset_version = "20260922-3"
for html_file in root.rglob("*.html"):
    html = html_file.read_text(encoding="utf-8")
    html = re.sub(r'(assets/products\.js)(?:\?v=[^"]*)?', rf'\1?v={asset_version}', html)
    html = re.sub(r'(assets/app\.js)(?:\?v=[^"]*)?', rf'\1?v={asset_version}', html)
    html = re.sub(r'(assets/styles\.css)(?:\?v=[^"]*)?', rf'\1?v={asset_version}', html)
    html_file.write_text(html, encoding="utf-8")
