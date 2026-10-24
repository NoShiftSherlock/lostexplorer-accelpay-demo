/* ============================================================================
 * THE SWITCH
 *
 * The only file to edit to turn on the real LiquidCommerce Elements SDK.
 * Everything else in this demo already speaks the SDK's lce:actions vocabulary
 * (see app.js), following the kendall-jackson-lc-demo pattern.
 *
 * STATUS (2026-10-24): OFF. The Lost Explorer has no LiquidCommerce partner
 * account yet, so there is no pk_ data-token or partner code to use.
 *
 * TO TURN IT ON
 *   1. Create the partner account and connect retailers to the 9 GTINs below.
 *   2. Run ~/.claude/skills/liquidcommerce-elements-demo/scripts/lc-preflight.sh
 *      and only continue on Elements 200.
 *   3. Paste the pk_ data-token (Partner App > Quick Start > Main Script) and
 *      partner code, set enabled: true, and swap #lce-product's data-sku for a
 *      data-lce-product="<UPC>" attribute. Then delete app.js.
 * ========================================================================== */
window.ELEMENTS = {
  enabled: false,
  token: '',            // pk_ data-token, publishable
  partnerCode: '',      // first path segment of the Partner App script src
  env: 'production',
  defaultUpc: '05391537970023',
  upcs: {
    espadin750: '05391537970023', tobala750: '05391537970061', salmiana750: '05391537970092',
    madreCuishe750: '00840202272184', blanco750: '00840202272146', reposado750: '00840202272153',
    espadin200: '05391537970269', tobala200: '05391537970252', salmiana200: '05391537970245'
  },
  // Matches styles.css so the SDK's components look like the page on first load.
  customTheme: { global: { theme: { primaryColor: '#b12028', accentColor: '#1f1f21', drawerBackgroundColor: '#faf7f0' } } }
};

(function () {
  var E = window.ELEMENTS;
  if (!E.enabled || !E.token) return;
  var s = document.createElement('script');
  s.defer = true;
  s.setAttribute('data-liquid-commerce-elements', '');
  s.setAttribute('data-token', E.token);
  s.setAttribute('data-env', E.env);
  s.setAttribute('data-checkout-url', location.origin + location.pathname.replace(/[^/]*$/, '') + 'checkout.html?lce_checkout={token}');
  s.setAttribute('data-checkout-param', 'lce_checkout');
  s.src = 'https://elements.reservebar-worker.workers.dev/' + E.partnerCode + '/all/elements.js';
  document.head.appendChild(s);
})();
