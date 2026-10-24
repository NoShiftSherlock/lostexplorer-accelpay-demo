/* The Lost Explorer x AccelPay demo: static commerce layer.
 *
 * WHY THIS EXISTS
 * The Lost Explorer has no LiquidCommerce partner account yet, so the Elements
 * SDK cannot initialise. This file reproduces the Elements product element,
 * cart drawer and checkout closely enough to demo, using real retailer
 * availability (data.js), and is meant to be deleted once the SDK is switched on
 * (see elements-config.js).
 *
 * DESIGN RULE (copied from the kendall-jackson-lc-demo pattern)
 * Every state change publishes the SAME `lce:actions.*` CustomEvent the real SDK
 * publishes, with the same { data, metadata } envelope, so anything wired to
 * these events keeps working after the switchover.
 *
 * WHAT IS REAL vs ILLUSTRATIVE
 *   Real:  products, copy, images, GTINs (thelostexplorer.com, 2026-10-24);
 *          which licensed retailers list each bottle, in which state, at what
 *          price (ReserveBar / AccelPay retailer network, synced Sept to Oct 2026);
 *          Gopuff delivery ZIPs (live Gopuff check 2026-10-24) and Gopuff prices.
 *   Illustrative: shipping fee, Gopuff delivery fee, tax rate, shipping times,
 *          order confirmation. No order is ever placed.
 */
(function () {
  'use strict';

  const CATALOG = window.LE_CATALOG || {};
  const DATA = window.LE_DATA || { retailers: {}, variants: {}, gopuffZips: {}, gopuffPrices: {}, zipPrefixState: {} };

  const SHIP_FEE = 1499;        // illustrative, per retailer shipment
  const GOPUFF_FEE = 695;       // illustrative
  const TAX_RATE = 0.08;        // illustrative estimate
  const MAX_QTY = 12;
  const PROMOS = { SALUDOS: { freeShipping: true, label: 'Free shipping' } };   // live promo on thelostexplorer.com

  const STATE_NAMES = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',PR:'Puerto Rico' };

  // ---------------------------------------------------------------- state
  const LS = 'le-accelpay-demo-v1';
  const state = load() || { zip: null, st: null, items: [], promo: null,
                            cartId: 'cart_' + Math.random().toString(36).slice(2, 10) };
  function load() { try { return JSON.parse(localStorage.getItem(LS)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }

  // ---------------------------------------------------------------- events
  let evtSeq = 0;
  function publish(name, data, ns) {
    const detail = { data: data, metadata: {
      eventId: 'evt_' + (++evtSeq), namespace: 'actions', event: name, originalEvent: name,
      actionNamespace: ns || 'other', timestamp: Date.now(), sdkVersion: 'static-standin',
      env: 'demo', tenantName: 'The Lost Explorer', tenantCode: 'tle' } };
    window.dispatchEvent(new CustomEvent('lce:actions.' + name, { detail: detail }));
    window.dispatchEvent(new CustomEvent('lce:actions', { detail: detail }));
  }

  // ---------------------------------------------------------------- helpers
  const money = c => '$' + (c / 100).toFixed(2);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const stateName = st => STATE_NAMES[st] || st;
  const label = p => (p.kicker ? p.kicker + ' ' : '') + p.name + ' ' + p.size;

  function stateForZip(zip) { return DATA.zipPrefixState[String(zip).slice(0, 3)] || null; }

  // All purchasable options for a SKU at the current ZIP.
  function options(sku, type) {
    if (!state.zip) return [];
    if (type === 'onDemand') {
      const city = DATA.gopuffZips[state.zip];
      const price = DATA.gopuffPrices[sku];
      if (!city || !price) return [];
      return [{ retailerId: 'gopuff', type: 'onDemand', name: 'Gopuff', city: city, st: state.st,
                price: price, fee: GOPUFF_FEE, expectation: 'Delivered in about 30 minutes', stock: null }];
    }
    return (DATA.variants[sku] || [])
      .filter(v => DATA.retailers[v.r] && DATA.retailers[v.r].state === state.st)
      .map(v => { const r = DATA.retailers[v.r];
        return { retailerId: v.r, type: 'shipping', name: r.name, city: r.city, st: r.state,
                 price: v.price, fee: SHIP_FEE, expectation: 'Ships in 2 to 4 business days', stock: v.stock }; })
      .sort((a, b) => a.price - b.price);
  }
  function anyOption(sku) { return options(sku, 'onDemand').concat(options(sku, 'shipping')); }
  function retailersAnywhere(sku) { return (DATA.variants[sku] || []).length; }
  function statesFor(sku) {
    const s = {}; (DATA.variants[sku] || []).forEach(v => { const r = DATA.retailers[v.r]; if (r) s[r.state] = 1; });
    if (DATA.gopuffPrices[sku]) { s.CA = 1; s.WA = 1; }
    return Object.keys(s).sort();
  }
  function fromPrice(sku) {
    const all = (DATA.variants[sku] || []).map(v => v.price);
    if (DATA.gopuffPrices[sku]) all.push(DATA.gopuffPrices[sku]);
    return all.length ? Math.min.apply(null, all) : null;
  }
  function optionFor(item) {
    return options(item.sku, item.type).filter(o => o.retailerId === item.retailerId)[0] || null;
  }

  function groups() {
    const map = {};
    state.items.forEach(function (i) {
      const o = optionFor(i); if (!o) return;
      if (!map[i.retailerId]) map[i.retailerId] = { opt: o, items: [], subtotal: 0 };
      map[i.retailerId].items.push(i);
      map[i.retailerId].subtotal += o.price * i.qty;
    });
    return Object.keys(map).map(k => map[k]);
  }
  function totals() {
    let subtotal = 0, itemCount = 0, shipping = 0, delivery = 0;
    groups().forEach(function (g) {
      subtotal += g.subtotal;
      g.items.forEach(i => { itemCount += i.qty; });
      if (g.opt.type === 'onDemand') delivery += g.opt.fee; else shipping += g.opt.fee;
    });
    const promo = state.promo && PROMOS[state.promo];
    const shipDiscount = promo && promo.freeShipping ? shipping : 0;
    const tax = Math.round(subtotal * TAX_RATE);
    return { subtotal, shipping, shipDiscount, delivery, tax, itemCount,
             total: subtotal + shipping - shipDiscount + delivery + tax };
  }

  // ---------------------------------------------------------------- address (ZIP)
  function setZip(raw) {
    const zip = String(raw || '').replace(/\D/g, '').slice(0, 5);
    if (zip.length !== 5) { announce('Enter a 5-digit ZIP code'); return false; }
    const st = stateForZip(zip);
    if (!st) { announce('ZIP code not recognised'); return false; }
    const changed = state.zip && state.st !== st;
    state.zip = zip; state.st = st; ps.type = null; ps.retailerId = null;
    if (changed) { state.items = []; publish('cart_reset', true, 'cart'); }
    save();
    publish('address_updated', { googlePlacesId: 'demo', formattedAddress: zip + ', ' + st,
      address: { one: '', two: '', city: '', state: st, zip: zip, country: 'US' }, coordinates: null }, 'address');
    renderAll();
    return true;
  }
  function clearZip() {
    state.zip = null; state.st = null; state.items = []; save();
    publish('address_cleared', true, 'address'); publish('cart_reset', true, 'cart');
    renderAll();
  }

  // ---------------------------------------------------------------- cart ops
  let pendingAdd = null;
  function addProduct(params, openCart) {
    if (!state.zip) {
      pendingAdd = { params: params, openCart: openCart };
      const a = $('#lce-zip'); if (a) { a.focus(); a.closest('.lce-address').classList.add('needs'); }
      announce('Enter your ZIP code to see who can deliver');
      return false;
    }
    const key = [params.sku, params.type, params.retailerId].join('::');
    const ex = state.items.filter(i => i.key === key)[0];
    const q = params.quantity || 1;
    if (ex) ex.qty = Math.min(MAX_QTY, ex.qty + q);
    else state.items.push({ key: key, sku: params.sku, qty: q, type: params.type, retailerId: params.retailerId });
    save();
    const p = CATALOG[params.sku];
    publish('product_add_to_cart', { identifier: p.upc, fulfillmentId: params.retailerId, partNumber: p.upc, quantity: q, engravingLines: [] }, 'product');
    publish('cart_item_added', { cartId: state.cartId, itemId: key, fulfillmentId: params.retailerId, partNumber: p.upc, quantity: q, engravingLines: [] }, 'cart');
    publish('cart_updated', { current: snapshot() }, 'cart');
    renderAll();
    if (openCart !== false) openDrawer();
    return true;
  }
  function snapshot() { const t = totals(); return { cartId: state.cartId, subtotal: t.subtotal, itemCount: t.itemCount }; }
  function setQty(key, d) {
    const it = state.items.filter(i => i.key === key)[0]; if (!it) return;
    const prev = it.qty; it.qty = Math.min(MAX_QTY, it.qty + d);
    if (it.qty < 1) { state.items = state.items.filter(i => i.key !== key); publish('cart_item_removed', { cartId: state.cartId, itemId: key }, 'cart'); }
    else publish(d > 0 ? 'cart_item_quantity_increase' : 'cart_item_quantity_decrease', { cartId: state.cartId, itemId: key, quantity: it.qty, previousQuantity: prev }, 'cart');
    save(); renderAll();
  }
  function removeItem(key) {
    state.items = state.items.filter(i => i.key !== key); save();
    publish('cart_item_removed', { cartId: state.cartId, itemId: key }, 'cart'); renderAll();
  }
  function applyPromo(code) {
    const c = String(code || '').trim().toUpperCase();
    if (!PROMOS[c]) { publish('cart_promo_code_failed', { cartId: state.cartId, error: 'Promo code not valid' }, 'cart'); announce('Promo code not valid'); return; }
    state.promo = c; save();
    publish('cart_promo_code_applied', { cartId: state.cartId, discount: totals().shipDiscount, newSubtotal: totals().subtotal }, 'cart');
    renderAll();
  }
  function removePromo() { state.promo = null; save(); publish('cart_promo_code_removed', { cartId: state.cartId }, 'cart'); renderAll(); }
  function resetCart() { state.items = []; state.promo = null; save(); publish('cart_reset', true, 'cart'); renderAll(); }

  let live;
  function announce(msg) {
    if (!live) { live = document.createElement('div'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'; document.body.appendChild(live); }
    live.textContent = msg;
    const t = $('#toast'); if (t) { t.textContent = msg; t.classList.add('on'); clearTimeout(announce._t); announce._t = setTimeout(() => t.classList.remove('on'), 2600); }
  }

  // ---------------------------------------------------------------- product element
  const ps = { sku: null, type: null, retailerId: null, qty: 1 };

  function zipBlock() {
    if (state.zip) {
      return '<div class="lce-address set"><div class="cur"><span>Delivering to <strong>' + esc(state.zip) +
        '</strong> · ' + esc(stateName(state.st)) + '</span><button class="chg" data-zip-change>Change</button></div></div>';
    }
    return '<div class="lce-address"><span class="lce-label">Where should we send it?</span>' +
      '<div class="row"><input id="lce-zip" inputmode="numeric" maxlength="5" placeholder="ZIP code" autocomplete="postal-code">' +
      '<button class="btn ghost sm" data-zip-set>Check</button></div>' +
      '<div class="quick">Try: ' + [['90028','Los Angeles'],['10003','New York'],['78701','Austin'],['98109','Seattle'],['60601','Chicago']]
        .map(z => '<button data-zip-quick="' + z[0] + '">' + z[1] + '</button>').join('') + '</div></div>';
  }

  function renderProduct() {
    const host = $('#lce-product'); if (!host) return;
    const sku = host.getAttribute('data-sku');
    const p = CATALOG[sku]; if (!p) { host.innerHTML = '<p>Product not found.</p>'; return; }
    if (ps.sku !== sku) { ps.sku = sku; ps.qty = 1; ps.type = null; ps.retailerId = null; }

    const od = options(sku, 'onDemand'), sh = options(sku, 'shipping');
    if (!ps.type || !(ps.type === 'onDemand' ? od : sh).length) ps.type = od.length ? 'onDemand' : 'shipping';
    const rs = ps.type === 'onDemand' ? od : sh;
    if (!rs.filter(r => r.retailerId === ps.retailerId)[0]) ps.retailerId = rs[0] ? rs[0].retailerId : null;
    const sel = rs.filter(r => r.retailerId === ps.retailerId)[0] || null;
    const avail = od.length + sh.length > 0;
    const fp = fromPrice(sku);

    const siblings = Object.keys(CATALOG).filter(k => CATALOG[k].family === p.family);
    let priceHtml;
    if (sel) priceHtml = money(sel.price) + '<span class="per"> / bottle</span>';
    else if (fp && !state.zip) priceHtml = '<span class="from">from</span> ' + money(fp) + '<span class="per"> / bottle</span>';
    else priceHtml = '<span class="per">Price set by the retailer that fulfils your order</span>';

    host.innerHTML = [
      '<div class="lce-field"><span class="lce-label">Size</span><div class="lce-chips" role="radiogroup" aria-label="Size">',
        siblings.map(k => '<a class="lce-chip" role="radio" aria-checked="' + (k === sku) + '" href="product.html?sku=' + k + '">' + esc(CATALOG[k].size) + '</a>').join(''),
      '</div></div>',
      '<div class="lce-price">', priceHtml, '</div>',
      zipBlock(),
      state.zip ? [
        '<div class="lce-field"><span class="lce-label">How would you like it?</span><div class="lce-tabs" role="tablist">',
          '<button role="tab" data-ft="onDemand" aria-selected="', ps.type === 'onDemand', '"', od.length ? '' : ' disabled', '>',
            '<img src="assets/gopuff-icon.png" alt="" class="ico">Instant delivery<span class="sub">', od.length ? 'About 30 minutes via Gopuff' : 'Not available at this ZIP', '</span></button>',
          '<button role="tab" data-ft="shipping" aria-selected="', ps.type === 'shipping', '"', sh.length ? '' : ' disabled', '>',
            'Ship it<span class="sub">', sh.length ? 'From a licensed ' + esc(state.st) + ' retailer' : 'No ' + esc(state.st) + ' retailer yet', '</span></button>',
        '</div></div>'
      ].join('') : '',
      rs.length ? '<div class="lce-field"><span class="lce-label">' + (ps.type === 'onDemand' ? 'Delivering from' : 'Shipping from') +
        ' <em>' + rs.length + ' option' + (rs.length === 1 ? '' : 's') + '</em></span><div class="lce-retailers" role="radiogroup">' +
        rs.slice(0, 6).map(r => '<button class="lce-retailer" role="radio" data-rid="' + r.retailerId + '" aria-checked="' + (r.retailerId === ps.retailerId) + '">' +
          '<span class="lft">' + (r.retailerId === 'gopuff' ? '<img src="assets/gopuff-icon.png" alt="Gopuff" class="rlogo">' : '<span class="rlogo txt">' + esc(r.name.charAt(0)) + '</span>') +
          '<span><span class="nm">' + esc(r.name) + '</span><br><span class="meta">' + esc(r.city) + ', ' + esc(r.st) + ' · ' + esc(r.expectation) +
          (r.stock && r.stock <= 6 ? ' · only ' + r.stock + ' left' : '') + '</span></span></span>' +
          '<span class="fee">' + money(r.price) + '</span></button>').join('') +
        (rs.length > 6 ? '<div class="more">+ ' + (rs.length - 6) + ' more licensed ' + esc(state.st) + ' retailers</div>' : '') +
        '</div></div>' : '',
      state.zip && !avail ? '<div class="lce-alert">' + (retailersAnywhere(sku) || DATA.gopuffPrices[sku]
          ? 'No licensed retailer in ' + esc(stateName(state.st)) + ' lists this bottle yet. Today it is listed in ' + statesFor(sku).map(stateName).join(', ') + '.'
          : 'No network retailer lists this size yet.') +
        ' Once The Lost Explorer switches to AccelPay, orders route to licensed retailers across 40+ states.</div>' : '',
      '<div class="lce-buy">',
        '<div class="qty"><button data-q="-1" aria-label="Decrease quantity">-</button><span>', ps.qty, '</span><button data-q="1" aria-label="Increase quantity">+</button></div>',
        '<button class="btn" id="addbtn"', (state.zip && !sel) ? ' disabled' : '', '>',
          !state.zip ? 'Add to cart' : (sel ? 'Add to cart · ' + money(sel.price * ps.qty) : 'Unavailable here'),
        '</button>',
      '</div>',
      '<p class="lce-fine">Sold and fulfilled by a licensed retailer. 21+ only, adult signature required.</p>'
    ].join('');
    wireProduct(host);
    wireZipControls(host);
  }

  function wireProduct(host) {
    $$('[data-ft]', host).forEach(b => b.addEventListener('click', function () {
      if (b.disabled) return;
      const prev = ps.type; ps.type = b.getAttribute('data-ft'); ps.retailerId = null;
      publish('product_fulfillment_type_changed', { identifier: CATALOG[ps.sku].upc, selectedFulfillmentType: ps.type, previousFulfillmentType: prev, fulfillmentHasAvailability: true }, 'product');
      renderProduct();
    }));
    $$('.lce-retailer', host).forEach(b => b.addEventListener('click', function () {
      const prev = ps.retailerId; ps.retailerId = b.getAttribute('data-rid');
      publish('product_fulfillment_changed', { identifier: CATALOG[ps.sku].upc, selectedFulfillmentId: ps.retailerId, selectedFulfillmentType: ps.type, previousFulfillmentId: prev }, 'product');
      renderProduct();
    }));
    $$('[data-q]', host).forEach(b => b.addEventListener('click', function () {
      const d = parseInt(b.getAttribute('data-q'), 10);
      const prev = ps.qty; ps.qty = Math.max(1, Math.min(MAX_QTY, ps.qty + d));
      if (ps.qty !== prev) publish(d > 0 ? 'product_quantity_increase' : 'product_quantity_decrease', { identifier: CATALOG[ps.sku].upc, quantity: ps.qty, previousQuantity: prev }, 'product');
      renderProduct();
    }));
    const add = $('#addbtn', host);
    if (add) add.addEventListener('click', function () {
      addProduct({ sku: ps.sku, type: ps.type, retailerId: ps.retailerId, quantity: ps.qty }, true);
    });
  }

  // ZIP inputs anywhere on the page (product element, delivery band)
  function wireZipControls(root) {
    $$('[data-zip-set]', root).forEach(b => b.addEventListener('click', function () {
      const inp = b.parentElement.querySelector('input'); goZip(inp && inp.value);
    }));
    $$('.lce-address input, .zipform input', root).forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); goZip(inp.value); }
    }));
    $$('[data-zip-quick]', root).forEach(b => b.addEventListener('click', () => goZip(b.getAttribute('data-zip-quick'))));
    $$('[data-zip-change]', root).forEach(b => b.addEventListener('click', clearZip));
  }
  function goZip(v) {
    if (setZip(v) && pendingAdd) {
      const pa = pendingAdd; pendingAdd = null;
      const o = anyOption(pa.params.sku)[0];
      if (o) addProduct({ sku: pa.params.sku, type: o.type, retailerId: o.retailerId, quantity: pa.params.quantity }, pa.openCart);
    }
  }

  // ---------------------------------------------------------------- delivery band (home)
  function renderBand() {
    const box = $('#band-result'); if (!box) return;
    if (!state.zip) { box.innerHTML = ''; return; }
    const skus = Object.keys(CATALOG);
    const gp = skus.filter(k => options(k, 'onDemand').length);
    const sh = skus.filter(k => options(k, 'shipping').length);
    const nRet = {}; skus.forEach(k => options(k, 'shipping').forEach(o => { nRet[o.retailerId] = 1; }));
    box.innerHTML = '<div class="band-res">' +
      '<div class="br-row"><img src="assets/gopuff-icon.png" alt="Gopuff"><div><strong>' +
        (gp.length ? 'Instant delivery in about 30 minutes' : 'No instant delivery at ' + esc(state.zip) + ' yet') + '</strong><br><span>' +
        (gp.length ? gp.length + ' expressions available from Gopuff ' + esc(DATA.gopuffZips[state.zip] || '') : 'Gopuff carries The Lost Explorer across California and Washington today.') + '</span></div></div>' +
      '<div class="br-row"><span class="pin">' + esc(state.st) + '</span><div><strong>' +
        (sh.length ? Object.keys(nRet).length + ' licensed ' + esc(stateName(state.st)) + ' retailer' + (Object.keys(nRet).length === 1 ? '' : 's') + ' can ship to you' : 'No ' + esc(stateName(state.st)) + ' retailer lists the range yet') +
        '</strong><br><span>' + (sh.length ? sh.length + ' expressions in stock in-state' : 'After the switch, AccelPay routes orders to licensed retailers across 40+ states.') + '</span></div></div>' +
      '<button class="chg" data-zip-change>Change ZIP</button></div>';
    wireZipControls(box);
  }

  // ---------------------------------------------------------------- grid cards
  function renderCards() {
    $$('[data-card-sku]').forEach(function (el) {
      const sku = el.getAttribute('data-card-sku');
      const o = anyOption(sku);
      const fp = fromPrice(sku);
      const best = o.length ? Math.min.apply(null, o.map(x => x.price)) : null;
      const pr = el.querySelector('.price');
      if (pr) pr.innerHTML = state.zip ? (best ? money(best) : '<span class="na">Not listed in ' + esc(state.st) + '</span>') : (fp ? '<span class="from">from</span> ' + money(fp) : '<span class="na">Coming soon</span>');
      const tag = el.querySelector('.tag');
      if (tag) tag.hidden = !(state.zip && options(sku, 'onDemand').length);
      const btn = el.querySelector('[data-add-sku]');
      if (btn) btn.disabled = !!state.zip && !o.length;
    });
  }
  function quickAdd(sku) {
    if (!state.zip) { location.href = 'product.html?sku=' + sku; return; }
    const o = options(sku, 'onDemand')[0] || options(sku, 'shipping')[0];
    if (!o) { announce('Not available at ' + state.zip); return; }
    addProduct({ sku: sku, type: o.type, retailerId: o.retailerId, quantity: 1 }, true);
  }

  // ---------------------------------------------------------------- drawer
  function openDrawer() { const d = $('#drawer'); if (!d) return; d.classList.add('on'); $('#scrim').classList.add('on'); document.body.style.overflow = 'hidden'; publish('cart_opened', true, 'cart'); }
  function closeDrawer() { const d = $('#drawer'); if (!d || !d.classList.contains('on')) return; d.classList.remove('on'); $('#scrim').classList.remove('on'); document.body.style.overflow = ''; publish('cart_closed', true, 'cart'); }

  function lineHtml(i, o) {
    const p = CATALOG[i.sku];
    return '<div class="line"><div class="thumb"><img src="' + p.img + '" alt=""></div><div class="info">' +
      '<span class="nm">' + esc(label(p)) + '</span><span class="sz">' + esc(p.line) + ' · ' + money(o.price) + ' each</span>' +
      '<div class="lfoot"><div class="qty"><button data-cq="-1" data-k="' + i.key + '">-</button><span>' + i.qty + '</span><button data-cq="1" data-k="' + i.key + '">+</button></div>' +
      '<span class="amt">' + money(o.price * i.qty) + '</span></div><button class="rm" data-rm="' + i.key + '">Remove</button></div></div>';
  }

  function renderDrawer() {
    const box = $('#drawer-items'); if (!box) return;
    const gs = groups();
    box.innerHTML = gs.length ? gs.map(g => '<div class="retailer-group"><div class="rg-head">' +
        (g.opt.type === 'onDemand' ? '<img src="assets/gopuff-icon.png" alt="">' : '') +
        '<span><strong>' + esc(g.opt.name) + '</strong> · ' + esc(g.opt.city) + ', ' + esc(g.opt.st) + '</span><span class="exp">' + esc(g.opt.expectation) + '</span></div>' +
        g.items.map(i => lineHtml(i, g.opt)).join('') + '</div>').join('') +
      '<div class="rb-note"><img src="assets/gift.svg" alt=""><span>Also on <strong>ReserveBar.com</strong>, for gifting and nationwide delivery.</span></div>'
      : '<div class="empty"><p>Your cart is empty</p><a class="btn ghost" href="index.html#shop">Shop the range</a></div>';
    const t = totals();
    const foot = $('#drawer-foot');
    if (foot) {
      foot.innerHTML = '<div class="promo">' + (state.promo
          ? '<div class="applied">Code <strong>' + state.promo + '</strong> applied</div><button id="promo-rm">Remove</button>'
          : '<input id="promo-in" placeholder="Promo code"><button id="promo-go">Apply</button>') + '</div>' +
        '<div class="totals"><div class="r"><span>Subtotal</span><span class="v">' + money(t.subtotal) + '</span></div>' +
        (t.shipping ? '<div class="r"><span>Shipping</span><span class="v">' + money(t.shipping) + '</span></div>' : '') +
        (t.shipDiscount ? '<div class="r disc"><span>' + state.promo + '</span><span class="v">-' + money(t.shipDiscount) + '</span></div>' : '') +
        (t.delivery ? '<div class="r"><span>Gopuff delivery</span><span class="v">' + money(t.delivery) + '</span></div>' : '') +
        '<div class="r"><span>Estimated tax</span><span class="v">' + money(t.tax) + '</span></div>' +
        '<div class="r big"><span>Total</span><span class="v">' + money(t.total) + '</span></div></div>' +
        '<a class="btn block" id="co-btn" href="checkout.html"' + (state.items.length ? '' : ' aria-disabled="true" style="opacity:.45;pointer-events:none"') + '>Checkout · ' + money(t.total) + '</a>' +
        '<p class="secure">Secure checkout by AccelPay. Your order stays on thelostexplorer.com.</p>';
      const pg = $('#promo-go'), pi = $('#promo-in'), pr = $('#promo-rm');
      if (pg) pg.addEventListener('click', () => applyPromo(pi.value));
      if (pi) pi.addEventListener('keydown', e => { if (e.key === 'Enter') applyPromo(pi.value); });
      if (pr) pr.addEventListener('click', removePromo);
    }
    $$('[data-cq]', box).forEach(b => b.addEventListener('click', () => setQty(b.getAttribute('data-k'), parseInt(b.getAttribute('data-cq'), 10))));
    $$('[data-rm]', box).forEach(b => b.addEventListener('click', () => removeItem(b.getAttribute('data-rm'))));
  }

  function renderHeader() {
    const t = totals();
    $$('[data-lce-cart-items-count]').forEach(el => { el.textContent = t.itemCount; el.hidden = t.itemCount === 0; });
    $$('[data-zip-label]').forEach(el => { el.textContent = state.zip ? state.zip + ' · ' + state.st : 'Set ZIP'; });
  }

  // ---------------------------------------------------------------- checkout
  function renderCheckout() {
    const side = $('#co-summary'); if (!side) return;
    const t = totals(); const gs = groups();
    side.innerHTML = '<h3>Order summary</h3>' + (gs.length ? gs.map(g =>
        '<div class="co-ship"><div class="co-ship-h">' + (g.opt.type === 'onDemand' ? '<img src="assets/gopuff-icon.png" alt="">' : '<span class="pin">' + esc(g.opt.st) + '</span>') +
        '<div><strong>' + (g.opt.type === 'onDemand' ? 'Instant delivery by Gopuff' : 'Ships from ' + esc(g.opt.name)) + '</strong><br><span>' +
        esc(g.opt.city) + ', ' + esc(g.opt.st) + ' · ' + esc(g.opt.expectation) + '</span></div></div>' +
        g.items.map(i => { const p = CATALOG[i.sku]; return '<div class="line"><div class="thumb"><img src="' + p.img + '" alt=""></div><div class="info"><span class="nm">' +
          esc(label(p)) + '</span><span class="sz">Qty ' + i.qty + '</span></div><span class="amt">' + money(g.opt.price * i.qty) + '</span></div>'; }).join('') + '</div>').join('')
        : '<div class="empty">Your cart is empty.</div>') +
      '<div class="totals"><div class="r"><span>Subtotal</span><span class="v">' + money(t.subtotal) + '</span></div>' +
      (t.shipping ? '<div class="r"><span>Shipping</span><span class="v">' + money(t.shipping) + '</span></div>' : '') +
      (t.shipDiscount ? '<div class="r disc"><span>' + state.promo + '</span><span class="v">-' + money(t.shipDiscount) + '</span></div>' : '') +
      (t.delivery ? '<div class="r"><span>Gopuff delivery</span><span class="v">' + money(t.delivery) + '</span></div>' : '') +
      '<div class="r"><span>Tax</span><span class="v">' + money(t.tax) + '</span></div>' +
      '<div class="r big"><span>Total</span><span class="v">' + money(t.total) + '</span></div></div>' +
      '<div class="rb-note"><img src="assets/gift.svg" alt=""><span>Sending a gift? The Lost Explorer is also on <strong>ReserveBar.com</strong>.</span></div>';
    const place = $('#place-order');
    if (place) { place.textContent = 'Place order · ' + money(t.total); place.disabled = !state.items.length; }
    const zipIn = $('#co-zip'); if (zipIn && state.zip && !zipIn.value) zipIn.value = state.zip;
    const stIn = $('#co-state'); if (stIn && state.st) stIn.value = stateName(state.st);
    const how = $('#co-how');
    if (how) how.innerHTML = gs.map(g => '<div class="co-opt on">' + (g.opt.type === 'onDemand' ? '<img src="assets/gopuff-icon.png" alt="">' : '<span class="pin">' + esc(g.opt.st) + '</span>') +
      '<div><strong>' + (g.opt.type === 'onDemand' ? 'Gopuff, about 30 minutes' : 'Licensed ' + esc(stateName(g.opt.st)) + ' retailer: ' + esc(g.opt.name)) + '</strong><br><span>' + esc(g.opt.expectation) + '</span></div>' +
      '<span class="v">' + (g.opt.type === 'onDemand' ? money(g.opt.fee) : (state.promo ? 'Free' : money(g.opt.fee))) + '</span></div>').join('') || '<p class="muted">Add a bottle to see delivery options.</p>';
  }

  function wireCheckout() {
    const form = $('#co-form'); if (!form) return;
    publish('checkout_loaded', { token: 'demo', cartId: state.cartId, itemCount: totals().itemCount }, 'checkout');
    const gift = $('#is-gift');
    if (gift) gift.addEventListener('change', function () { $('#gift-fields').hidden = !gift.checked;
      publish('checkout_is_gift_toggled', { cartId: state.cartId, isActive: gift.checked, previousIsActive: !gift.checked }, 'checkout'); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const t = totals();
      publish('checkout_submit_started', { started: true }, 'checkout');
      const num = 'TLE-' + String(Math.floor(100000 + Math.random() * 899999));
      const gs = groups().map(g => ({ name: g.opt.name, city: g.opt.city, st: g.opt.st, type: g.opt.type, exp: g.opt.expectation }));
      setTimeout(function () {
        publish('checkout_submit_completed', { orderNumber: num, orderTotal: t.total }, 'checkout');
        try { sessionStorage.setItem('tle-order', JSON.stringify({ orderNumber: num, total: t.total, groups: gs })); } catch (err) {}
        resetCart();
        location.href = 'checkout.html?confirmed=1';
      }, 900);
    });
  }

  // ---------------------------------------------------------------- boot
  function renderAll() { renderHeader(); renderProduct(); renderBand(); renderCards(); renderDrawer(); renderCheckout(); }

  function ageGate() {
    const g = $('#agegate'); if (!g) return;
    let ok = false; try { ok = sessionStorage.getItem('tle-age') === '1'; } catch (e) {}
    if (ok) { g.remove(); return; }
    g.hidden = false; document.body.style.overflow = 'hidden';
    $('#age-yes').addEventListener('click', function () { try { sessionStorage.setItem('tle-age', '1'); } catch (e) {} g.remove(); document.body.style.overflow = ''; });
    $('#age-no').addEventListener('click', function () { g.querySelector('.ag-q').textContent = 'Come back when you are of legal drinking age.'; });
  }

  function boot() {
    ageGate();
    $$('[data-lce-cart-toggle-button]').forEach(b => b.addEventListener('click', () => { const d = $('#drawer'); d && d.classList.contains('on') ? closeDrawer() : openDrawer(); }));
    const x = $('#drawer-close'); if (x) x.addEventListener('click', closeDrawer);
    const s = $('#scrim'); if (s) s.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    const burger = $('#burger'); if (burger) burger.addEventListener('click', () => $('nav.main').classList.toggle('open'));
    $$('[data-add-sku]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); quickAdd(b.getAttribute('data-add-sku')); }));
    wireZipControls(document);
    wireCheckout();
    renderAll();
    publish('client_ready', { isReady: true, message: 'Static stand-in ready', timestamp: Date.now(), version: 'standin-1.0' }, 'other');
  }

  window.LEDemo = {
    actions: { cart: { openCart: openDrawer, closeCart: closeDrawer, addProduct: addProduct, applyPromoCode: applyPromo,
                       removePromoCode: removePromo, resetCart: resetCart, getDetails: snapshot },
               address: { getDetails: () => ({ zip: state.zip, state: state.st }), clear: clearZip, setZip: setZip },
               product: { getDetails: sku => CATALOG[sku] } },
    catalog: CATALOG, data: DATA, options: options, fromPrice: fromPrice, statesFor: statesFor, quickAdd: quickAdd
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
