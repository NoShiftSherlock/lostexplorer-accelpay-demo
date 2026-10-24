/* The Lost Explorer catalog.
 * Names, sizes, GTINs, copy and imagery are taken from thelostexplorer.com on
 * 2026-10-24 (the /shop/ page and each product page).
 * `sitePrice` is what the current store showed that day, kept for
 * reference only. Prices on this demo come from the retailer that fulfils the
 * order (see data.js), because the licensed retailer sets the final price.
 */
window.LE_CATALOG = {
  'espadin-750': {
    sku: 'espadin-750', family: 'espadin', line: 'Mezcal', name: 'Espadín', size: '750ml',
    upc: '05391537970023', sitePrice: 4999, img: 'assets/espadin-750.webp', hero: 'assets/hero-espadin.jpg',
    rollover: 'assets/rollover-espadin.jpg', teaser: '(Agave Angustifolia)', age: 8,
    desc: 'A sweet and herbaceous expression, well-balanced with hints of red apple, ripe fruits and a mild smoky layer to finish.',
    origin: 'San Pablo Huixtepec, Oaxaca', distillation: 'Double',
    aroma: 'Fresh herbs with hints of wood from the fire pit',
    palate: 'Chopped agave, mesquite, sweet red apple and ripe fruits',
    finish: 'Smooth and fruity, with a slight smoked wood finish on the palate',
    sip: 'The approachable, welcoming aroma of Espadín will instantly transport you to the arid valleys of San Pablo Huixtepec where our Espadín grows. The sweet smoke rests gently on the roof of your mouth before giving way to a gentle, lingering finish that caresses the mouth in an even warmth.',
    pairings: ['Red apple & chicatana ant salt', 'Tangerine & Tajín', 'Pear, vinegar & salt']
  },
  'tobala-750': {
    sku: 'tobala-750', family: 'tobala', line: 'Mezcal', name: 'Tobalá', size: '750ml',
    upc: '05391537970061', sitePrice: 10472, img: 'assets/tobala-750.webp', hero: 'assets/hero-tobala.jpg',
    rollover: 'assets/rollover-tobala.jpg', teaser: '(Agave Potatorum)', age: 10,
    desc: 'An earthy expression with hints of tobacco, cocoa, vanilla and leather, offering a unique balance between wood aromas and umami flavors.',
    origin: 'San Pablo Huixtepec, Oaxaca', distillation: 'Double',
    aroma: 'Dry tobacco, wood and cocoa',
    palate: 'Vanilla, with notes of leather and clay',
    finish: 'Smooth and earthy finish, with hints of citrus and fresh grass',
    sip: 'A cozy aroma of dry tobacco, wood and cocoa gives way to subtle vanilla notes on the palate, ultimately with leather and clay notes being reminiscent of characteristics found in a fine scotch. A smooth and earthy finish carries hints of citrus and fresh spring grass.',
    pairings: ['Chocolate with caramel sea salt', 'Pickled mushroom & lemon peel']
  },
  'salmiana-750': {
    sku: 'salmiana-750', family: 'salmiana', line: 'Mezcal', name: 'Salmiana', size: '750ml',
    upc: '05391537970092', sitePrice: 15999, img: 'assets/salmiana-750.webp', hero: 'assets/hero-salmiana.jpg',
    rollover: 'assets/rollover-salmiana.jpg', teaser: '(Agave Salmiana)', age: 12,
    desc: 'The most herbaceous expression of all, offering a sweet and spicy profile with hints of green chili, grapefruit and fresh agave.',
    origin: 'San Pablo Huixtepec, Oaxaca', distillation: 'Double',
    aroma: 'Green chili, grapefruit peel, fresh agave after rainfall',
    palate: 'Sweet, with fresh citrus and dried herbs',
    finish: 'Spicy, with earthy and mineral notes',
    sip: 'On the nose, Salmiana expresses fresh green chili, vibrant grapefruit peel and agave after a rainfall. The citrus notes carry onto the palate with a sweet tint of dried herbs that lead to a spicy finish with even minerality.',
    pairings: ['Olives & demerara', 'Semi-pickled celery & worm salt']
  },
  'madre-cuishe-750': {
    sku: 'madre-cuishe-750', family: 'madre-cuishe', line: 'Mezcal', name: 'Madre Cuishe', size: '750ml',
    kicker: 'Reserva del Maestro',
    upc: '00840202272184', sitePrice: 9999, img: 'assets/madre-cuishe-750.webp', hero: 'assets/banner-reserva.jpg',
    rollover: 'assets/rollover-madre-cuishe.jpg', teaser: '(Agave Karwinskii)', age: 12,
    desc: 'Take an earthy journey with our limited edition expression where fresh herbal aromas and crisp fruit notes lead into a creamy, buttery texture.',
    origin: 'San Pablo Huixtepec, Oaxaca', distillation: 'Double',
    aroma: 'Notes of fresh herbs, pine nut, peach and apple',
    palate: 'Creamy layers of butter, peanut, and almond, with hints of orange peel and a subtle mineral essence',
    finish: 'A refined, long-lasting finish with sweet, earthy notes of yam and caramel',
    sip: 'Madre Cuishe is a wild-harvested agave, carefully selected for our exclusive small-batch limited edition release of Reserva del Maestro. Its fibrous, elongated structure requires great skill from our maestro mezcalero, Fortino Ramos.',
    pairings: ['Fresh Mexican cheeses with salsa verde', 'Fresh ceviche', 'Churros with caramel']
  },
  'blanco-750': {
    sku: 'blanco-750', family: 'blanco', line: 'Tequila', name: 'Blanco', size: '750ml',
    upc: '00840202272146', sitePrice: 5510, img: 'assets/blanco-750.webp', hero: 'assets/hero-blanco.jpg',
    rollover: 'assets/rollover-blanco.jpg', teaser: '100% de agave',
    desc: 'Bright and vibrant notes of citrus, herbs, and cinnamon. A smooth agave forward Tequila with subtle notes of minerality.',
    origin: 'Amatitán, Jalisco', distillation: 'Double, Small Batch',
    aroma: 'Fresh herbal aroma of agave with hints of citrus and pineapple, subtle buttery notes with a touch of cinnamon',
    palate: 'Full bodied and well balanced, featuring herbal notes with vibrant mineral undertones',
    finish: 'Long, rich and elegant, with lingering notes of cinnamon and spice',
    sip: 'Crafted to be sipped slowly, herbaceous and earthy notes transport you to the sun-soaked lowlands of Amatitán, Jalisco. Bright citrus on the palate transitions into spiced cinnamon and vegetal undertones.',
    pairings: ['Mild cheese, such as Mexican panela', 'Earthy pistachios or light citrus', 'Fresh ceviche or salsa']
  },
  'reposado-750': {
    sku: 'reposado-750', family: 'reposado', line: 'Tequila', name: 'Reposado', size: '750ml',
    upc: '00840202272153', sitePrice: 5999, img: 'assets/reposado-750.webp', hero: 'assets/hero-blanco.jpg',
    rollover: 'assets/rollover-reposado.webp', teaser: '100% de agave',
    desc: 'A layered, agave-forward tequila with added depth from time, where warm oak and soft vanilla frame subtle dried-fruit notes with a long, lingering finish.',
    origin: 'Amatitán, Jalisco', distillation: 'Sauternes, Pedro Ximénez and bourbon casks',
    aroma: 'Soft, rounded aromatic lift with subtle sweetness of raisin and fig, gentle vanilla and light smoke',
    palate: 'Velvety mouthfeel. Rich notes of toasted oak and vanilla alongside delicate dried fruit sweetness',
    finish: 'Extended finish with lingering impressions of smoke, toasted oak, and warm vanilla',
    sip: 'Crafted from our award-winning Tequila Blanco, The Lost Explorer Tequila Reposado is shaped through a blended resting process across Sauternes wine, Pedro Ximénez sherry, and bourbon barrels.',
    pairings: []
  },
  'espadin-200': {
    sku: 'espadin-200', family: 'espadin', line: 'Mezcal', name: 'Espadín', size: '200ml',
    upc: '05391537970269', sitePrice: 1923, img: 'assets/espadin-200.webp', parent: 'espadin-750'
  },
  'tobala-200': {
    sku: 'tobala-200', family: 'tobala', line: 'Mezcal', name: 'Tobalá', size: '200ml',
    upc: '05391537970252', sitePrice: 3499, img: 'assets/tobala-200.webp', parent: 'tobala-750'
  },
  'salmiana-200': {
    sku: 'salmiana-200', family: 'salmiana', line: 'Mezcal', name: 'Salmiana', size: '200ml',
    upc: '05391537970245', sitePrice: 4499, img: 'assets/salmiana-200.webp', parent: 'salmiana-750'
  }
};
