/* The Lost Explorer: Shopify store + AccelPay app (static sales demo).
 *
 * What this simulates
 *   The brand's own Shopify storefront with the native Shopify cart drawer and a
 *   Shopify-style one-page checkout. The AccelPay Shopify app sits inside that
 *   checkout: it handles payments and taxes and routes the order to a licensed
 *   retailer in the buyer's state (or Gopuff for instant delivery), picked by ZIP.
 *   No third-party cart. Card payments only: no express wallet buttons and no
 *   subscription options are shown.
 *
 * What is real vs illustrative
 *   Real:  products, copy, images, GTINs (thelostexplorer.com, 2026-10-24);
 *          which licensed retailers list each bottle, where, and at what price
 *          (ReserveBar / AccelPay retailer network, synced Sept to Oct 2026);
 *          Gopuff delivery ZIPs (live Gopuff check 2026-10-24) and Gopuff prices.
 *   Illustrative: shipping and delivery fees, tax rate, shipping times, card
 *          form, order confirmation. No order is ever placed.
 */
(function () {
  'use strict';

  const CATALOG = window.LE_CATALOG || {};
  const DATA = window.LE_DATA || { retailers: {}, variants: {}, gopuffZips: {}, gopuffPrices: {}, zipPrefixState: {} };

  const SHIP_FEE = 1499;      // illustrative
  const GOPUFF_FEE = 695;     // illustrative
  const TAX_RATE = 0.08;      // illustrative estimate
  const MAX_QTY = 12;
  const PROMOS = { SALUDOS: 'Free shipping' };   // live promo on thelostexplorer.com

  const STATE_NAMES = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',PR:'Puerto Rico' };

  // ---------------------------------------------------------------- state
  const LS = 'le-shopify-demo-v2';
  const state = load() || { zip: null, st: null, items: [], promo: null, method: null };
  function load() { try { return JSON.parse(localStorage.getItem(LS)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }

  const money = c => '$' + (c / 100).toFixed(2);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const stateName = st => STATE_NAMES[st] || st;
  const label = p => (p.kicker ? p.kicker + ' ' : '') + p.name;

  // ---------------------------------------------------------------- availability
  function gopuffOpt(sku) {
    const city = state.zip && DATA.gopuffZips[state.zip];
    const price = DATA.gopuffPrices[sku];
    return city && price ? { id: 'gopuff', type: 'onDemand', name: 'Gopuff', city: city, st: state.st, price: price } : null;
  }
  function shipOpts(sku) {
    if (!state.zip) return [];
    return (DATA.variants[sku] || [])
      .filter(v => DATA.retailers[v.r] && DATA.retailers[v.r].state === state.st)
      .map(v => { const r = DATA.retailers[v.r]; return { id: v.r, type: 'shipping', name: r.name, city: r.city, st: r.state, price: v.price, stock: v.stock }; })
      .sort((a, b) => a.price - b.price);
  }
  function fromPrice(sku) {
    const all = (DATA.variants[sku] || []).map(v => v.price);
    if (DATA.gopuffPrices[sku]) all.push(DATA.gopuffPrices[sku]);
    return all.length ? Math.min.apply(null, all) : null;
  }
  function bestPrice(sku) {   // lowest price reachable at the current ZIP
    const o = shipOpts(sku).concat(gopuffOpt(sku) || []);
    return o.length ? Math.min.apply(null, o.map(x => x.price)) : null;
  }
  function statesFor(sku) {
    const s = {}; (DATA.variants[sku] || []).forEach(v => { const r = DATA.retailers[v.r]; if (r) s[r.state] = 1; });
    if (DATA.gopuffPrices[sku]) { s.CA = 1; s.WA = 1; }
    return Object.keys(s).sort();
  }
  function stateForZip(zip) { return DATA.zipPrefixState[String(zip).slice(0, 3)] || null; }

  // Delivery methods for the whole cart: Gopuff if every bottle is at Gopuff, and
  // every in-state licensed retailer that lists every bottle.
  function methods() {
    if (!state.zip || !state.items.length) return [];
    const out = [];
    const gp = state.items.map(i => gopuffOpt(i.sku));
    if (gp.every(Boolean)) out.push({ id: 'gopuff', type: 'onDemand', name: 'Gopuff', city: gp[0].city, st: state.st,
      fee: GOPUFF_FEE, prices: Object.fromEntries(state.items.map((i, k) => [i.sku, gp[k].price])) });
    const per = state.items.map(i => shipOpts(i.sku));
    const ids = per.length ? per[0].map(o => o.id).filter(id => per.every(list => list.some(o => o.id === id))) : [];
    ids.forEach(function (id) {
      const r = DATA.retailers[id];
      out.push({ id: id, type: 'shipping', name: r.name, city: r.city, st: r.state, fee: SHIP_FEE,
        prices: Object.fromEntries(state.items.map((i, k) => [i.sku, per[k].filter(o => o.id === id)[0].price])) });
    });
    // order: Gopuff first, then retailers by basket cost
    const cost = m => state.items.reduce((s, i) => s + m.prices[i.sku] * i.qty, 0);
    return out.sort((a, b) => (a.type === 'onDemand' ? -1 : b.type === 'onDemand' ? 1 : cost(a) - cost(b)));
  }
  function currentMethod() {
    const ms = methods();
    const cost = m => state.items.reduce((s, i) => s + m.prices[i.sku] * i.qty, 0);
    // default to the lowest bottle cost so the checkout matches the cart estimate
    return ms.filter(m => m.id === state.method)[0] || ms.slice().sort((a, b) => cost(a) - cost(b))[0] || null;
  }
  function linePrice(sku) {
    const m = currentMethod();
    if (m && m.prices[sku] != null) return m.prices[sku];
    return bestPrice(sku) || fromPrice(sku) || CATALOG[sku].sitePrice;
  }
  function totals() {
    const m = currentMethod();
    let subtotal = 0, count = 0;
    state.items.forEach(i => { subtotal += linePrice(i.sku) * i.qty; count += i.qty; });
    let shipping = m ? m.fee : null;
    if (m && m.type === 'shipping' && state.promo) shipping = 0;
    const tax = Math.round(subtotal * TAX_RATE);
    return { subtotal, count, shipping, tax, total: subtotal + (shipping || 0) + tax, method: m };
  }

  // ---------------------------------------------------------------- ZIP
  function setZip(raw) {
    const zip = String(raw || '').replace(/\D/g, '').slice(0, 5);
    if (zip.length !== 5) { toast('Enter a 5-digit ZIP code'); return false; }
    const st = stateForZip(zip);
    if (!st) { toast('ZIP code not recognised'); return false; }
    state.zip = zip; state.st = st; state.method = null; save(); renderAll(); return true;
  }
  function clearZip() { state.zip = null; state.st = null; state.method = null; save(); renderAll(); }

  // ---------------------------------------------------------------- cart (native Shopify behaviour)
  function addToCart(sku, qty) {
    const ex = state.items.filter(i => i.sku === sku)[0];
    if (ex) ex.qty = Math.min(MAX_QTY, ex.qty + qty); else state.items.push({ sku: sku, qty: qty });
    state.method = null; save(); renderAll(); openDrawer();
  }
  function setQty(sku, d) {
    const it = state.items.filter(i => i.sku === sku)[0]; if (!it) return;
    it.qty = Math.min(MAX_QTY, it.qty + d);
    if (it.qty < 1) state.items = state.items.filter(i => i.sku !== sku);
    state.method = null; save(); renderAll();
  }
  function removeItem(sku) { state.items = state.items.filter(i => i.sku !== sku); state.method = null; save(); renderAll(); }

  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600);
  }

  // ---------------------------------------------------------------- product page
  const ps = { qty: 1 };
  function renderProduct() {
    const host = $('#product-form'); if (!host) return;
    const sku = host.getAttribute('data-sku'); const p = CATALOG[sku]; if (!p) return;
    const siblings = Object.keys(CATALOG).filter(k => CATALOG[k].family === p.family);
    const bp = state.zip ? bestPrice(sku) : null, fp = fromPrice(sku);
    const price = bp ? money(bp) + '<span class="per"> / bottle</span>'
      : (!state.zip && fp ? '<span class="from">from</span> ' + money(fp) + '<span class="per"> / bottle</span>'
      : '<span class="per">' + (state.zip ? 'Not available in ' + esc(stateName(state.st)) + ' yet' : 'Coming soon') + '</span>');
    host.innerHTML =
      '<div class="pf-field"><span class="pf-label">Size</span><div class="pf-variants">' +
        siblings.map(k => '<a class="pf-variant" aria-checked="' + (k === sku) + '" href="product.html?sku=' + k + '">' + esc(CATALOG[k].size) + '</a>').join('') +
      '</div></div>' +
      '<div class="pf-price">' + price + '</div>' +
      '<div class="pf-buy"><div class="qty"><button data-q="-1" aria-label="Decrease quantity">-</button><span>' + ps.qty + '</span><button data-q="1" aria-label="Increase quantity">+</button></div>' +
        '<button class="btn" id="addbtn"' + (state.zip && !bp ? ' disabled' : '') + '>' + (state.zip && !bp ? 'Unavailable here' : 'Add to cart') + '</button></div>' +
      deliveryBlock(sku);
    $$('[data-q]', host).forEach(b => b.addEventListener('click', () => { ps.qty = Math.max(1, Math.min(MAX_QTY, ps.qty + parseInt(b.getAttribute('data-q'), 10))); renderProduct(); }));
    const add = $('#addbtn', host); if (add) add.addEventListener('click', () => addToCart(sku, ps.qty));
    wireZip(host);
  }

  // AccelPay app block on the product page: who can deliver to this ZIP.
  function deliveryBlock(sku) {
    let body;
    if (!state.zip) {
      body = '<div class="zrow"><input class="zin" inputmode="numeric" maxlength="5" placeholder="Enter ZIP code" aria-label="ZIP code"><button class="btn ghost sm" data-zip-set>Check</button></div>' +
        '<div class="quick">Try: ' + [['90028','Los Angeles'],['10003','New York'],['78701','Austin'],['98109','Seattle'],['60601','Chicago']]
          .map(z => '<button data-zip-quick="' + z[0] + '">' + z[1] + '</button>').join('') + '</div>';
    } else {
      const g = gopuffOpt(sku), sh = shipOpts(sku);
      body = '<div class="zset">Delivering to <strong>' + esc(state.zip) + '</strong> · ' + esc(stateName(state.st)) + ' <button class="chg" data-zip-change>Change</button></div>' +
        '<ul class="avail">' +
        (g ? '<li><img src="assets/gopuff-icon.png" alt=""><span><strong>Instant delivery, about 30 minutes</strong><br>Gopuff ' + esc(g.city) + ' · ' + money(g.price) + '</span></li>' : '') +
        (sh.length ? '<li><span class="pin">' + esc(state.st) + '</span><span><strong>Ships from ' + sh.length + ' licensed ' + esc(stateName(state.st)) + ' retailer' + (sh.length === 1 ? '' : 's') + '</strong><br>' +
            sh.slice(0, 3).map(o => esc(o.name) + ' (' + esc(o.city) + ') ' + money(o.price)).join(' · ') + (sh.length > 3 ? ' · +' + (sh.length - 3) + ' more' : '') + '</span></li>' : '') +
        (!g && !sh.length ? '<li class="none">No licensed retailer in ' + esc(stateName(state.st)) + ' lists this bottle yet. Today it is listed in ' + statesFor(sku).map(stateName).join(', ') + '.</li>' : '') +
        '</ul><p class="fine">You pick delivery at checkout. Sold and fulfilled by a licensed retailer. 21+ only.</p>';
    }
    return '<div class="ap-block"><div class="ap-h"><span>Delivery near you</span><span class="ap-tag">AccelPay app</span></div>' + body + '</div>';
  }

  function wireZip(root) {
    $$('[data-zip-set]', root).forEach(b => b.addEventListener('click', () => { const i = b.parentElement.querySelector('input'); setZip(i && i.value); }));
    $$('.zin, .zipform input', root).forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setZip(i.value); } }));
    $$('[data-zip-quick]', root).forEach(b => b.addEventListener('click', () => setZip(b.getAttribute('data-zip-quick'))));
    $$('[data-zip-change]', root).forEach(b => b.addEventListener('click', clearZip));
  }

  // ---------------------------------------------------------------- home: delivery band + cards
  function renderBand() {
    const box = $('#band-result'); if (!box) return;
    if (!state.zip) { box.innerHTML = ''; return; }
    const skus = Object.keys(CATALOG);
    const gp = skus.filter(k => gopuffOpt(k)), sh = skus.filter(k => shipOpts(k).length);
    const n = {}; skus.forEach(k => shipOpts(k).forEach(o => { n[o.id] = 1; })); const nr = Object.keys(n).length;
    box.innerHTML = '<div class="band-res">' +
      '<div class="br-row"><img src="assets/gopuff-icon.png" alt="Gopuff"><div><strong>' + (gp.length ? 'Instant delivery in about 30 minutes' : 'No instant delivery at ' + esc(state.zip) + ' yet') + '</strong><br><span>' +
        (gp.length ? gp.length + ' expressions available from Gopuff ' + esc(DATA.gopuffZips[state.zip]) : 'Gopuff carries The Lost Explorer across California and Washington today.') + '</span></div></div>' +
      '<div class="br-row"><span class="pin">' + esc(state.st) + '</span><div><strong>' + (nr ? nr + ' licensed ' + esc(stateName(state.st)) + ' retailer' + (nr === 1 ? '' : 's') + ' can ship to you' : 'No ' + esc(stateName(state.st)) + ' retailer lists the range yet') + '</strong><br><span>' +
        (nr ? sh.length + ' expressions in stock in-state' : 'With AccelPay, orders route to licensed retailers across 40+ states.') + '</span></div></div>' +
      '<button class="chg" data-zip-change>Change ZIP</button></div>';
    wireZip(box);
  }
  function renderCards() {
    $$('[data-card-sku]').forEach(function (el) {
      const sku = el.getAttribute('data-card-sku');
      const bp = bestPrice(sku), fp = fromPrice(sku);
      const pr = el.querySelector('.price');
      if (pr) pr.innerHTML = state.zip ? (bp ? money(bp) : '<span class="na">Not listed in ' + esc(state.st) + '</span>') : (fp ? '<span class="from">from</span> ' + money(fp) : '<span class="na">Coming soon</span>');
      const tag = el.querySelector('.tag'); if (tag) tag.hidden = !(state.zip && gopuffOpt(sku));
      const b = el.querySelector('[data-add-sku]'); if (b) b.disabled = !!state.zip && !bp;
    });
  }

  // ---------------------------------------------------------------- cart drawer (Shopify Dawn style)
  function openDrawer() { const d = $('#drawer'); if (!d) return; d.classList.add('on'); $('#scrim').classList.add('on'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { const d = $('#drawer'); if (!d) return; d.classList.remove('on'); $('#scrim').classList.remove('on'); document.body.style.overflow = ''; }
  function renderDrawer() {
    const box = $('#drawer-items'); if (!box) return;
    box.innerHTML = state.items.length ? state.items.map(function (i) {
      const p = CATALOG[i.sku], u = linePrice(i.sku);
      return '<div class="line"><a class="thumb" href="product.html?sku=' + i.sku + '"><img src="' + p.img + '" alt=""></a><div class="info">' +
        '<span class="nm">' + esc(label(p)) + '</span><span class="sz">Size: ' + esc(p.size) + '</span><span class="sz">' + money(u) + '</span>' +
        '<div class="lfoot"><div class="qty"><button data-cq="-1" data-k="' + i.sku + '">-</button><span>' + i.qty + '</span><button data-cq="1" data-k="' + i.sku + '">+</button></div>' +
        '<button class="rm" data-rm="' + i.sku + '">Remove</button></div></div><span class="amt">' + money(u * i.qty) + '</span></div>';
    }).join('') : '<div class="empty"><p>Your cart is empty</p><a class="btn" href="index.html#shop">Continue shopping</a></div>';
    const t = totals(), foot = $('#drawer-foot');
    if (foot) foot.innerHTML = state.items.length
      ? '<div class="totals"><div class="r big"><span>Estimated total</span><span class="v">' + money(t.subtotal) + ' USD</span></div></div>' +
        '<p class="secure">Taxes, discounts and shipping calculated at checkout.</p>' +
        '<a class="btn block" href="checkout.html">Check out</a>' +
        '<div class="rb-note"><img src="assets/gift.svg" alt=""><span>Also on <strong>ReserveBar.com</strong>, for gifting.</span></div>'
      : '';
    $$('[data-cq]', box).forEach(b => b.addEventListener('click', () => setQty(b.getAttribute('data-k'), parseInt(b.getAttribute('data-cq'), 10))));
    $$('[data-rm]', box).forEach(b => b.addEventListener('click', () => removeItem(b.getAttribute('data-rm'))));
  }
  function renderHeader() {
    const t = totals();
    $$('[data-cart-count]').forEach(el => { el.textContent = t.count; el.hidden = t.count === 0; });
    $$('[data-zip-label]').forEach(el => { el.textContent = state.zip ? state.zip + ' · ' + state.st : 'Set ZIP'; });
  }

  // ---------------------------------------------------------------- checkout (Shopify one-page style)
  function renderCheckout() {
    const side = $('#os'); if (!side) return;
    const t = totals(), m = t.method;
    side.innerHTML = state.items.map(function (i) {
      const p = CATALOG[i.sku];
      return '<div class="os-item"><div class="im"><img src="' + p.img + '" alt=""><span class="q">' + i.qty + '</span></div>' +
        '<div class="nm"><div class="t">' + esc(label(p)) + '</div><div class="s">' + esc(p.size) + ' · ' + esc(p.line) + '</div></div><div class="pr">' + money(linePrice(i.sku) * i.qty) + '</div></div>';
    }).join('') || '<p class="muted">Your cart is empty.</p>';
    $('#os-sub').textContent = money(t.subtotal);
    $('#os-ship-l').textContent = m ? (m.type === 'onDemand' ? 'Instant delivery' : 'Shipping') : 'Shipping';
    $('#os-ship').textContent = !state.zip ? 'Enter ZIP' : (t.shipping == null ? '-' : (t.shipping ? money(t.shipping) : 'Free'));
    $('#os-tax').textContent = money(t.tax);
    $('#os-total').textContent = money(t.total);
    const disc = $('#os-disc'); if (disc) { disc.hidden = !state.promo; disc.querySelector('b').textContent = state.promo || ''; }
    const fr = $('#os-from');
    if (fr) fr.innerHTML = m ? (m.type === 'onDemand' ? '<img src="assets/gopuff-icon.png" alt=""> Delivered by Gopuff ' + esc(m.city) + ' in about 30 minutes'
      : '<span class="pin">' + esc(m.st) + '</span> Sold and shipped by ' + esc(m.name) + ', a licensed ' + esc(stateName(m.st)) + ' retailer') : '';

    // shipping methods
    const box = $('#methods');
    if (box) {
      const ms = methods();
      if (!state.zip) box.innerHTML = '<div class="co-empty">Enter your shipping address to view available delivery methods.</div>';
      else if (!ms.length) box.innerHTML = '<div class="co-empty">No single licensed retailer in ' + esc(stateName(state.st)) + ' lists every bottle in your cart. Try another ZIP, or remove a bottle.</div>';
      else box.innerHTML = ms.slice(0, 5).map(function (o) {
        const sel = m && o.id === m.id;
        const cost = state.items.reduce((s, i) => s + o.prices[i.sku] * i.qty, 0);
        const fee = o.type === 'shipping' && state.promo ? 0 : o.fee;
        return '<label class="co-opt' + (o.type === 'onDemand' ? ' onehr' : '') + (sel ? ' selected' : '') + '" data-method="' + o.id + '">' +
          '<span class="radio"></span>' +
          (o.type === 'onDemand' ? '<span class="ret"><img src="assets/gopuff-icon.png" alt="Gopuff"></span>' : '<span class="ret"><span class="pin">' + esc(o.st) + '</span></span>') +
          '<span class="body"><span class="n">' + (o.type === 'onDemand' ? 'Instant delivery by Gopuff <span class="badge-1hr">About 30 min</span>' : 'Ships from ' + esc(o.name)) + '</span>' +
          '<span class="d">' + (o.type === 'onDemand' ? 'From Gopuff ' + esc(o.city) + ', a licensed retailer near you' : esc(o.city) + ', ' + esc(o.st) + ' · licensed retailer · 2 to 4 business days') +
          ' · bottles ' + money(cost) + '</span></span>' +
          '<span class="amt' + (fee ? '' : ' free') + '">' + (fee ? money(fee) : 'FREE') + '</span></label>';
      }).join('') + (ms.length > 5 ? '<div class="co-more">+ ' + (ms.length - 5) + ' more licensed retailers</div>' : '');
      $$('[data-method]', box).forEach(l => l.addEventListener('click', () => { state.method = l.getAttribute('data-method'); save(); renderAll(); }));
    }
    const z = $('#co-zip'); if (z && state.zip && document.activeElement !== z) z.value = state.zip;
    const st = $('#co-state'); if (st) st.value = state.st ? stateName(state.st) : '';
    const pay = $('#pay'); if (pay) { pay.textContent = 'Pay now'; pay.disabled = !state.items.length || !m; }
  }

  function wireCheckout() {
    const form = $('#co-form'); if (!form) return;
    const z = $('#co-zip');
    if (z) z.addEventListener('change', () => setZip(z.value));
    const ap = $('#disc-go'); if (ap) ap.addEventListener('click', function () {
      const c = $('#disc').value.trim().toUpperCase();
      if (PROMOS[c]) { state.promo = c; save(); renderAll(); } else toast('Enter a valid discount code');
    });
    const same = $('#bill-same'); if (same) same.addEventListener('change', () => { $('#bill-fields').hidden = same.checked; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const t = totals(); if (!t.method) return;
      const num = '#TLE' + String(Math.floor(1000 + Math.random() * 8999));
      const m = t.method;
      try { sessionStorage.setItem('tle-order', JSON.stringify({ num: num, total: t.total, name: (form.firstName.value || 'explorer'),
        m: { type: m.type, name: m.name, city: m.city, st: m.st } })); } catch (err) {}
      state.items = []; state.promo = null; state.method = null; save();
      location.href = 'checkout.html?confirmed=1';
    });
  }

  // ---------------------------------------------------------------- boot
  function renderAll() { renderHeader(); renderProduct(); renderBand(); renderCards(); renderDrawer(); renderCheckout(); }

  function ageGate() {
    const g = $('#agegate'); if (!g) return;
    let ok = false; try { ok = sessionStorage.getItem('tle-age') === '1'; } catch (e) {}
    if (ok) { g.remove(); return; }
    g.hidden = false; document.body.style.overflow = 'hidden';
    $('#age-yes').addEventListener('click', () => { try { sessionStorage.setItem('tle-age', '1'); } catch (e) {} g.remove(); document.body.style.overflow = ''; });
    $('#age-no').addEventListener('click', () => { g.querySelector('.ag-q').textContent = 'Come back when you are of legal drinking age.'; });
  }
  function howPanel() {
    const open = () => { $('#how-panel').classList.add('on'); $('#how-scrim').classList.add('on'); };
    const close = () => { $('#how-panel').classList.remove('on'); $('#how-scrim').classList.remove('on'); };
    $$('#how-open, [data-how-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
    const c = $('#how-close'); if (c) c.addEventListener('click', close);
    const s = $('#how-scrim'); if (s) s.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const hs = $('#how-section'); if (hs && window.LE_HOW) hs.innerHTML = window.LE_HOW;
  }

  function boot() {
    ageGate(); howPanel();
    $$('[data-cart-toggle]').forEach(b => b.addEventListener('click', () => { const d = $('#drawer'); d && d.classList.contains('on') ? closeDrawer() : openDrawer(); }));
    const x = $('#drawer-close'); if (x) x.addEventListener('click', closeDrawer);
    const s = $('#scrim'); if (s) s.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    const burger = $('#burger'); if (burger) burger.addEventListener('click', () => $('nav.main').classList.toggle('open'));
    $$('[data-add-sku]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); addToCart(b.getAttribute('data-add-sku'), 1); }));
    wireZip(document.querySelector('.dband') || document.createElement('div'));
    wireCheckout();
    renderAll();
  }

  window.LEDemo = { catalog: CATALOG, data: DATA, setZip: setZip, addToCart: addToCart, methods: methods, totals: totals };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
