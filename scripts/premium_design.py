from pathlib import Path
import re
import sys

root = Path(sys.argv[1])

# Premium vintage visual layer.
styles = root / "assets" / "styles.css"
css = styles.read_text(encoding="utf-8")
premium_css = r'''
/* === NOVAÉ PREMIUM VINTAGE REDESIGN === */
:root{
  --bg:#ece4d8;--paper:#f6f0e7;--paper-2:#fffaf1;--ink:#17201b;
  --forest:#17251f;--forest-2:#22342b;--moss:#667a68;--sage:#9aa68f;
  --sand:#d8c4a7;--copper:#a86f4b;--copper-deep:#7f4f35;--line:#d6cab9;
  --muted:#6d6a62;--shadow:0 22px 70px rgba(24,31,27,.12);
  --shadow-strong:0 28px 80px rgba(15,24,19,.22);--r:24px
}
::selection{background:var(--copper);color:#fff}
html{background:var(--forest)}
body{
  background:radial-gradient(circle at 12% 3%,rgba(168,111,75,.06),transparent 24rem),
  linear-gradient(180deg,var(--paper-2),var(--paper));
  color:var(--ink);letter-spacing:-.008em;overflow-x:hidden
}
body:before{
  content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:.22;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.07'/%3E%3C/svg%3E");
  mix-blend-mode:multiply
}
.container{width:min(1240px,92%)}
.announce{
  background:linear-gradient(90deg,#101813,var(--forest-2),#101813);color:#dfd6c8;
  border-bottom:1px solid rgba(255,255,255,.08);letter-spacing:.11em;text-transform:uppercase;
  font-size:10px;padding:10px 16px
}
.site-header{
  background:rgba(248,243,234,.82);border-bottom:1px solid rgba(126,103,78,.16);
  backdrop-filter:blur(18px) saturate(120%);
  transition:background .3s ease,box-shadow .3s ease
}
.site-header.is-scrolled{background:rgba(248,243,234,.94);box-shadow:0 12px 32px rgba(27,33,29,.08)}
.nav{min-height:82px}.brand img{width:158px}
.nav-links a{position:relative;color:#27312b;font-size:13px;letter-spacing:.035em}
.nav-links a:after{content:"";position:absolute;left:0;right:100%;bottom:-7px;height:1px;background:var(--copper);transition:right .3s ease}
.nav-links a:hover:after{right:0}
.icon-btn{background:rgba(255,251,244,.8);border-color:rgba(86,72,54,.18);transition:transform .22s ease,border-color .22s ease,background .22s ease}
.icon-btn:hover{transform:translateY(-2px);border-color:var(--copper);background:#fffaf3}
.cart-count{background:var(--copper-deep)}
.btn{
  position:relative;overflow:hidden;background:var(--forest);border:1px solid var(--forest);
  color:#fff;min-height:48px;padding:13px 22px;letter-spacing:.015em;
  box-shadow:0 10px 28px rgba(23,37,31,.12);
  transition:transform .25s ease,box-shadow .25s ease,background .25s ease,border-color .25s ease
}
.btn:before{content:"";position:absolute;inset:0;transform:translateX(-110%);background:linear-gradient(110deg,transparent,rgba(255,255,255,.16),transparent);transition:transform .55s ease}
.btn:hover{transform:translateY(-2px);background:#24362d;border-color:#24362d;box-shadow:0 16px 36px rgba(23,37,31,.18)}
.btn:hover:before{transform:translateX(110%)}
.btn.secondary{background:transparent;color:var(--ink);border-color:rgba(31,43,36,.28);box-shadow:none}
.btn.secondary:hover{background:rgba(255,255,255,.55);border-color:var(--copper)}
.eyebrow{color:var(--copper-deep);font-size:10px;letter-spacing:.22em}
.section{padding:76px 0}
.section h2,.page-hero h1,.product-detail h1,.newsletter h2{font-family:Georgia,"Times New Roman",serif;letter-spacing:-.035em}
.section h2{font-size:clamp(34px,4.3vw,54px);line-height:1.02}
.section-head{margin-bottom:34px}
.section-head>a{font-size:13px;border-bottom:1px solid rgba(23,32,27,.35);padding-bottom:3px}
.section.soft{background:rgba(220,207,188,.32);border-block:1px solid rgba(126,103,78,.1)}

/* Hero editorial */
.hero.hero-premium{
  position:relative;padding:34px 0 52px;overflow:hidden;color:#f9f1e6;
  background:radial-gradient(circle at 82% 22%,rgba(188,150,109,.18),transparent 30rem),
  linear-gradient(145deg,#14221c 0%,#1d3027 54%,#16251e 100%)
}
.hero.hero-premium:before{
  content:"N";position:absolute;right:-.02em;bottom:-.25em;pointer-events:none;
  font:400 clamp(340px,45vw,690px)/.8 Georgia,serif;color:rgba(255,255,255,.018)
}
.hero-premium-grid{
  min-height:min(720px,76vh);display:grid;grid-template-columns:minmax(0,1.02fr) minmax(460px,.98fr);
  gap:64px;align-items:center;position:relative;z-index:1
}
.hero-copy-premium{padding:54px 0}.hero-copy-premium .eyebrow{color:#c9a883}
.hero-copy-premium h1{
  margin:18px 0 24px;font-family:Georgia,"Times New Roman",serif;
  font-size:clamp(58px,7.2vw,108px);line-height:.88;font-weight:400;letter-spacing:-.065em
}
.hero-copy-premium h1 em{display:block;color:#d7bea1;font-weight:400;font-style:italic;transform:translateX(.18em)}
.hero-copy-premium>p{color:#d8d5cd;font-size:17px;max-width:590px;line-height:1.72}
.hero-copy-premium .btn{background:#f2e8da;border-color:#f2e8da;color:var(--forest);box-shadow:none}
.hero-copy-premium .btn:hover{background:#fff8ed;border-color:#fff8ed}
.hero-copy-premium .btn.secondary{background:transparent;color:#f5ede2;border-color:rgba(245,237,226,.3)}
.hero-copy-premium .btn.secondary:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.55)}
.hero-proof{margin-top:44px;padding-top:24px;border-top:1px solid rgba(255,255,255,.13);display:flex;gap:34px;flex-wrap:wrap}
.hero-proof span{display:grid;gap:2px;color:#aaafa9;font-size:11px;text-transform:uppercase;letter-spacing:.12em}
.hero-proof strong{font:400 23px Georgia,serif;color:#f8efe2;text-transform:none;letter-spacing:0}
.hero-showcase{position:relative;min-height:590px;isolation:isolate}
.hero-frame{position:absolute;overflow:hidden;background:#ded2c1;border:1px solid rgba(255,255,255,.14);box-shadow:var(--shadow-strong)}
.hero-frame .product-media,.hero-frame>div{width:100%;height:100%;aspect-ratio:auto;background:#ded2c1}
.hero-frame img{width:100%;height:100%;object-fit:cover;transition:transform 1s cubic-bezier(.2,.7,.2,1)}
.hero-frame:hover img{transform:scale(1.045)}
.hero-frame-main{width:64%;height:74%;right:4%;top:7%;border-radius:46% 46% 18px 18px}
.hero-frame-small{width:39%;height:43%;left:1%;bottom:2%;border-radius:18px}
.hero-frame-detail{width:31%;height:31%;left:3%;top:6%;border-radius:999px;z-index:-1;opacity:.86}
.hero-stamp{
  position:absolute;right:-2%;bottom:8%;width:132px;height:132px;border-radius:50%;
  display:grid;place-items:center;text-align:center;padding:18px;background:#b07953;color:#fff7ed;
  border:1px solid rgba(255,255,255,.35);box-shadow:0 15px 40px rgba(9,15,12,.25);transform:rotate(7deg)
}
.hero-stamp strong{font:400 35px Georgia,serif;line-height:1}
.hero-stamp small{font-size:8px;letter-spacing:.16em;text-transform:uppercase}
.hero-caption{
  position:absolute;right:11%;bottom:2%;z-index:3;background:rgba(248,239,226,.93);color:#253128;
  padding:11px 16px;border-radius:999px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;
  box-shadow:0 10px 30px rgba(0,0,0,.14)
}
.editorial-ticker{overflow:hidden;background:#b47a52;color:#fff8ef;border-block:1px solid rgba(255,255,255,.18)}
.editorial-ticker-track{
  display:flex;width:max-content;gap:34px;padding:12px 0;font:400 13px Georgia,serif;
  letter-spacing:.13em;text-transform:uppercase;animation:novaeTicker 28s linear infinite
}
.editorial-ticker-track span:after{content:"✦";margin-left:34px;font-size:8px;vertical-align:2px}
@keyframes novaeTicker{to{transform:translateX(-50%)}}

/* Products */
.featured-section{position:relative}.product-grid{gap:22px}
.product-card{
  position:relative;border:1px solid rgba(97,79,59,.14);border-radius:26px;
  background:rgba(255,252,247,.78);box-shadow:0 12px 35px rgba(40,37,32,.04);
  transition:transform .36s cubic-bezier(.2,.7,.2,1),box-shadow .36s ease,border-color .36s ease;
  backdrop-filter:blur(3px)
}
.product-card:hover{transform:translateY(-8px);box-shadow:0 28px 60px rgba(40,37,32,.13);border-color:rgba(168,111,75,.35)}
.product-media{background:#e9e0d3;position:relative}
.product-media:after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);pointer-events:none}
.product-media img{transition:transform .7s cubic-bezier(.2,.7,.2,1),filter .5s ease}
.product-card:hover img{transform:scale(1.055);filter:saturate(.92) contrast(1.02)}
.product-body{padding:20px 20px 22px;gap:9px}.product-meta{color:#8b684f;font-size:10px;letter-spacing:.14em}
.product-card h3{font-family:Georgia,serif;font-size:19px;font-weight:500;line-height:1.18}
.price{font-size:15px;color:#27352d}.quick{margin-top:8px}

/* Categories */
.categories-section{background:#e8dfd2!important}.category-grid{gap:16px}
.category-card{
  min-height:250px;padding:30px;border:1px solid rgba(83,68,50,.13);background:#f8f1e7!important;
  border-radius:28px;position:relative;overflow:hidden;
  transition:transform .35s ease,box-shadow .35s ease,background .35s ease,color .35s ease
}
.category-card:before{
  content:"";position:absolute;width:180px;height:180px;border-radius:50%;right:-90px;top:-90px;
  border:1px solid rgba(168,111,75,.22);transition:transform .5s ease
}
.category-card:nth-child(2),.category-card:nth-child(4){background:#d7d8c9!important}
.category-card:nth-child(3){background:#24352c!important;color:#f5ede1}
.category-card:nth-child(3) .eyebrow{color:#cda886}
.category-card:hover{transform:translateY(-7px);box-shadow:0 24px 55px rgba(40,37,32,.12)}
.category-card:hover:before{transform:scale(1.28)}
.category-card h3{font:400 27px Georgia,serif;margin:10px 0 4px}
.category-card p{font-size:13px;opacity:.72;max-width:220px}

/* Philosophy */
.philosophy-section{background:linear-gradient(145deg,#17251f,#21362b);color:#f8f0e4;position:relative;overflow:hidden}
.philosophy-section:after{content:"NOVAÉ";position:absolute;right:-45px;bottom:-65px;font:400 160px Georgia,serif;letter-spacing:-.08em;color:rgba(255,255,255,.025)}
.philosophy-section .eyebrow{color:#cda886}.philosophy-section .section-head{position:relative;z-index:1}
.trust-grid{position:relative;z-index:1;gap:14px}
.philosophy-section .trust-card{
  min-height:220px;border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:25px;
  background:rgba(255,255,255,.035);transition:background .3s ease,transform .3s ease,border-color .3s ease
}
.philosophy-section .trust-card:hover{background:rgba(255,255,255,.065);transform:translateY(-5px);border-color:rgba(205,168,134,.28)}
.philosophy-section .trust-card p{color:#bbc3bd;font-size:13px}
.philosophy-section .badge{background:#b07953;color:#fff7ed}
.philosophy-section .trust-card h3{font:400 21px Georgia,serif}

/* FAQ and newsletter */
.faq details{padding:22px 4px;border-color:rgba(88,70,50,.18)}
.faq summary{font-family:Georgia,serif;font-size:18px;font-weight:500}
.faq details p{color:var(--muted);max-width:760px}
.newsletter{
  position:relative;overflow:hidden;background:linear-gradient(135deg,#1b2d25,#101914);
  border:1px solid rgba(255,255,255,.08);box-shadow:var(--shadow-strong);padding:58px;border-radius:32px
}
.newsletter:after{content:"";position:absolute;width:320px;height:320px;border-radius:50%;border:1px solid rgba(205,168,134,.14);right:-80px;top:-120px}
.newsletter h2{font-size:clamp(38px,5vw,62px);max-width:700px}.newsletter p{color:#c2c7c2;max-width:650px}

/* Interior pages */
.page-hero{
  padding:76px 0 48px;background:radial-gradient(circle at 78% 20%,rgba(176,121,83,.11),transparent 25rem),
  linear-gradient(180deg,#ebe1d3,#f5eee5);border-bottom:1px solid rgba(86,67,48,.1)
}
.page-hero h1{font-size:clamp(50px,6vw,78px)}.page-hero p{font-size:16px;line-height:1.7}
.filters,.checkout-box,.cart-total,.spec{background:rgba(255,252,247,.76);border-color:rgba(86,67,48,.16);box-shadow:0 10px 35px rgba(35,31,27,.04)}
.filters{backdrop-filter:blur(7px)}
.field input,.field select,.field textarea{background:#fffaf2;border-color:rgba(86,67,48,.18);transition:border-color .2s ease,box-shadow .2s ease}
.field input:focus,.field select:focus,.field textarea:focus{outline:none;border-color:var(--copper);box-shadow:0 0 0 3px rgba(168,111,75,.11)}
.product-detail{gap:58px}
.product-detail .gallery{border-radius:32px;background:#e9dfd1;box-shadow:0 24px 60px rgba(35,31,27,.08)}
.product-detail h1{font-size:clamp(42px,5vw,62px)}.spec{border-radius:16px}
.notice{background:#eee5d9;border-color:#ddcdb9;color:#574f45}.warning{background:#fbf0cf;border-color:#dec77c}
.cart-line{border-color:rgba(86,67,48,.14)}.cart-thumb{border-radius:17px}
.checkout-box,.cart-total{border-radius:26px}.legal{font-size:15px}.legal h2{font-size:30px}
.empty{border-color:rgba(86,67,48,.22);background:rgba(255,252,247,.5)}

/* Footer */
.site-footer{background:#0f1713;color:#e6dfd5;padding-top:64px;border-top:1px solid rgba(255,255,255,.06)}
.footer-grid a{color:#aeb6af;transition:color .2s ease,transform .2s ease}
.footer-grid a:hover{color:#fff;transform:translateX(3px)}.fineprint{border-color:#29322d}

/* Motion */
.reveal{opacity:1;transform:none}
.motion-ready .reveal{
  opacity:0;transform:translateY(22px);
  transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1)
}
.motion-ready .reveal.is-visible{opacity:1;transform:none}
.motion-ready .reveal-delay-1{transition-delay:.08s}.motion-ready .reveal-delay-2{transition-delay:.16s}.motion-ready .reveal-delay-3{transition-delay:.24s}
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  .motion-ready .reveal{opacity:1;transform:none}
}
@media(max-width:1050px){
  .hero-premium-grid{grid-template-columns:1fr .9fr;gap:34px}
  .hero-copy-premium h1{font-size:clamp(58px,8vw,86px)}.hero-showcase{min-height:520px}
}
@media(max-width:820px){
  .hero.hero-premium{padding-top:10px}.hero-premium-grid{grid-template-columns:1fr;min-height:auto;gap:0}
  .hero-copy-premium{padding:58px 0 28px}.hero-copy-premium h1{font-size:clamp(58px,14vw,92px)}
  .hero-showcase{min-height:520px;margin-bottom:20px}.hero-frame-main{right:3%}.hero-frame-small{left:4%}.hero-stamp{right:1%}
  .section{padding:62px 0}.philosophy-section .trust-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:640px){
  .nav{min-height:70px}.brand img{width:126px}.hero-copy-premium{padding-top:45px}
  .hero-copy-premium h1{font-size:clamp(52px,15vw,74px);line-height:.91}.hero-copy-premium>p{font-size:15px}
  .hero-proof{gap:22px;margin-top:30px}.hero-showcase{min-height:410px}
  .hero-frame-main{width:70%;height:72%;right:0}.hero-frame-small{width:42%;height:40%;left:0}.hero-frame-detail{width:30%;height:30%}
  .hero-stamp{width:100px;height:100px;right:-2%;bottom:7%}.hero-stamp strong{font-size:27px}.hero-caption{display:none}
  .section{padding:52px 0}.section h2{font-size:36px}.section-head{align-items:start}.product-grid{gap:12px}
  .product-card{border-radius:18px}.product-body{padding:14px}.product-card h3{font-size:16px}
  .category-card{min-height:210px;border-radius:22px;padding:22px}.philosophy-section .trust-grid{grid-template-columns:1fr}
  .philosophy-section .trust-card{min-height:auto}.newsletter{padding:32px 24px;border-radius:24px}
  .page-hero{padding:56px 0 34px}.page-hero h1{font-size:48px}.product-detail{gap:30px}
}
'''
if "NOVAÉ PREMIUM VINTAGE REDESIGN" not in css:
    css += "\n" + premium_css
styles.write_text(css, encoding="utf-8")

# Home page editorial hero and section treatments.
home = root / "index.html"
s = home.read_text(encoding="utf-8")
premium_hero = r'''<section class="hero hero-premium"><div class="container hero-premium-grid"><div class="hero-copy-premium reveal"><span class="eyebrow">Maison · objets choisis · Canada</span><h1>L’essentiel,<em>bien pensé.</em></h1><p>NOVAÉ réunit des objets utiles et beaux, choisis pour rendre le quotidien plus simple. Une sélection calme, chaleureuse et pensée pour durer dans votre intérieur.</p><div class="actions"><a class="btn" href="shop.html">Explorer la collection <span aria-hidden="true">→</span></a><a class="btn secondary" href="#why">Découvrir NOVAÉ</a></div><div class="hero-proof"><span><strong>16</strong> objets sélectionnés</span><span><strong>CAD</strong> prix transparents</span><span><strong>CA</strong> livraison vérifiée</span></div></div><div class="hero-showcase reveal reveal-delay-1" aria-label="Sélection de produits NOVAÉ"><div class="hero-frame hero-frame-detail" id="hero-feature-detail"></div><div class="hero-frame hero-frame-main" id="hero-feature-main"></div><div class="hero-frame hero-frame-small" id="hero-feature-small"></div><div class="hero-stamp"><div><strong>N</strong><br><small>Objets du quotidien<br>choisis avec soin</small></div></div><div class="hero-caption">Collection maison · 2026</div></div></div></section><div class="editorial-ticker" aria-hidden="true"><div class="editorial-ticker-track"><span>Maison</span><span>Cuisine</span><span>Organisation</span><span>Quotidien</span><span>NOVAÉ</span><span>Maison</span><span>Cuisine</span><span>Organisation</span><span>Quotidien</span><span>NOVAÉ</span></div></div>'''
s = re.sub(r'<section class="hero">.*?</section>', premium_hero, s, count=1, flags=re.S)
s = s.replace('<section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Sélection</span>', '<section class="section featured-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Sélection</span>', 1)
s = s.replace('<span class="eyebrow">Par univers</span><h2>Une boutique cohérente</h2>', '<span class="eyebrow">Par univers</span><h2>Des essentiels, pièce par pièce</h2>')
s = s.replace('<section class="section soft"><div class="container"><div class="section-head"><div><span class="eyebrow">Par univers</span>', '<section class="section soft categories-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Par univers</span>')
s = s.replace('<section id="why" class="section">', '<section id="why" class="section philosophy-section">')
s = s.replace('<span class="eyebrow">Notre approche</span><h2>Acheter en toute clarté</h2>', '<span class="eyebrow">Notre approche</span><h2>Beau, utile, sans superflu.</h2>')
s = s.replace('<section class="section soft faq">', '<section class="section soft faq reveal">')
s = s.replace('<div class="container newsletter">', '<div class="container newsletter reveal">')
home.write_text(s, encoding="utf-8")

# Subtle motion, premium hover behavior, and hero product collage.
app = root / "assets" / "app.js"
js = app.read_text(encoding="utf-8")
premium_js = r'''
// NOVAÉ premium visual interactions
(function initNovaePremium(){
  const setHeroProduct=(selector,slug)=>{
    const slot=document.querySelector(selector);
    const p=typeof PRODUCTS!=="undefined"?PRODUCTS.find(x=>x.slug===slug):null;
    if(slot&&p&&typeof imgHTML==="function") slot.innerHTML=imgHTML(p);
  };
  setHeroProduct("#hero-feature-main","silicone-kitchen-set");
  setHeroProduct("#hero-feature-small","travel-jewelry-box");
  setHeroProduct("#hero-feature-detail","ceramic-tea-mug");

  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!reduceMotion){
    document.body.classList.add("motion-ready");
    const revealNodes=[...document.querySelectorAll(".reveal, .product-card, .category-card, .trust-card")];
    revealNodes.forEach((el,i)=>{
      el.classList.add("reveal");
      if(!el.classList.contains("reveal-delay-1")&&!el.classList.contains("reveal-delay-2")&&!el.classList.contains("reveal-delay-3")){
        el.classList.add("reveal-delay-"+Math.min((i%4),3));
      }
    });
    if("IntersectionObserver" in window){
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },{threshold:.08,rootMargin:"0px 0px -35px"});
      revealNodes.forEach(el=>observer.observe(el));
    }else{
      revealNodes.forEach(el=>el.classList.add("is-visible"));
    }

    const showcase=document.querySelector(".hero-showcase");
    if(showcase&&window.matchMedia("(pointer:fine)").matches){
      showcase.addEventListener("pointermove",e=>{
        const r=showcase.getBoundingClientRect();
        const x=(e.clientX-r.left)/r.width-.5;
        const y=(e.clientY-r.top)/r.height-.5;
        showcase.style.transform="perspective(900px) rotateY("+(x*2.2)+"deg) rotateX("+(-y*1.8)+"deg)";
      });
      showcase.addEventListener("pointerleave",()=>showcase.style.transform="");
      showcase.style.transition="transform .45s ease";
    }
  }

  const header=document.querySelector(".site-header");
  if(header){
    const syncHeader=()=>header.classList.toggle("is-scrolled",window.scrollY>18);
    syncHeader();
    window.addEventListener("scroll",syncHeader,{passive:true});
  }
})();
'''
if "initNovaePremium" not in js:
    js += "\n" + premium_js
app.write_text(js, encoding="utf-8")
