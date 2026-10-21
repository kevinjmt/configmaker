/* ConfigMaker — KJ picks / recommendations.
 *
 * SINGLE SOURCE OF TRUTH for the KJ labels shown in the component picker.
 * Edit only this file when adding, removing or re-tagging a curated component.
 *
 * MATCHING
 *   - `id` is the numeric Idealo listing ID from:
 *       https://www.idealo.fr/prix/213581487/apple-mac-mini-m6-2026.html
 *                              ^^^^^^^^^
 *   - Exact listing only: variants (different storage, colour, etc.) are
 *     separate listings and need their own entry.
 *   - `url` is optional. If present it is used as the Idealo link when the
 *     product is not already loaded in the picker; `id` still drives matching.
 *   - `name` is for readability and for lightweight KJ-only result cards.
 *     It does not affect matching.
 *
 * TAGS (combine freely; all pills are displayed)
 *   'top'          → tournament cup, gold:  KJ top choice
 *   'recommended'  → thumbs up, blue:       KJ recommendation
 *   'avoid'        → cross, red:            KJ not recommended
 *   'tested'       → check, green:          KJ tested
 *
 * NOTE
 *   `note` is optional free text displayed in the component detail, e.g.
 *   note: 'Excellent rapport qualité/prix, mais ventirad bruyant.'
 *
 * TEMPLATE
 *   { id: '213581487', name: 'Apple Mac mini M6 2026', tags: ['top', 'tested'], note: '...' },
 *
 * Keep one product per line for quick scanning. Empty categories are kept
 * intentionally so the document stays a complete, readable catalogue.
 */
window.KJ_PICKS = {
  version: 1,
  updated: '2026-10-21',
  categories: {
    /* ── PC components ─────────────────────────────────────────────────── */
    cpu: [
      // { id: '', name: '', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/204581800/amd-ryzen-9-9900x.html', name: 'AMD Ryzen 9 9900X', tags: ['tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/205072280/amd-ryzen-7-9800x3d-boxed.html', name: 'AMD Ryzen 7 9800X3D', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/202115887/amd-ryzen-7-5800x3d.html', name: 'AMD Ryzen 7 5800X3D', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/204581803/amd-ryzen-7-9700x.html', name: 'AMD Ryzen 7 9700X', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/201899387/amd-ryzen-5-5600.html', name: 'AMD Ryzen 5 5600', tags: ['tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/202722732/amd-ryzen-7-7800x3d.html', name: 'AMD Ryzen 7 7800X3D', tags: ['tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/202275796/amd-ryzen-7-7700.html', name: 'AMD Ryzen 7 7700', tags: ['top', 'tested'], note: '' },
    ],
    mb: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/207881498/gigabyte-x870m-aorus-elite-wifi7.html', name: 'GigaByte X870M Aorus Elite WIFI7', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/202916064/msi-b650-gaming-plus-wifi.html', name: 'MSI B650 Gaming Plus WiFi', tags: ['tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/202814595/asrock-b650m-pro-rs.html', name: 'ASRock B650M Pro RS', tags: ['tested'], note: '' },
    ],
    ram: [
      // { id: '', name: '', tags: ['recommended', 'tested'], note: '' },
    ],
    cooler: [
      // { id: '', name: '', tags: ['top'], note: '' },
      { id: 'https://www.idealo.fr/prix/204189704/thermalright-frozen-notte-240.html', name: 'Thermalright Frozen Notte 240', tags: ['recommended', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/201181946/be-quiet-pure-rock-slim-2.html', name: 'be quiet! Pure Rock Slim 2', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/203971798/arctic-freezer-36-black.html', name: 'ARCTIC Freezer 36 Black', tags: ['tested','recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/203808838/thermalright-assassin-x-120-refined-se-argb.html', name: 'Thermalright Assassin X 120 Refined SE ARGB ', tags: ['top'], note: '' },
      { id: 'https://www.idealo.fr/prix/206576839/arctic-liquid-freezer-iii-pro-240.html', name: 'ARCTIC Liquid Freezer III Pro 240', tags: ['top'], note: '' },
      { id: 'https://www.idealo.fr/prix/206182027/arctic-liquid-freezer-iii-pro-360.html', name: 'ARCTIC Liquid Freezer III Pro 360', tags: ['top'], note: '' },
      { id: 'https://www.idealo.fr/prix/202870980/thermalright-peerless-assassin-120-se.html', name: 'Thermalright Peerless Assassin 120 SE', tags: ['top'], note: '' },
    ],
    ssd: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/203495992/kioxia-exceria-plus-g3.html', name: 'Kioxia Exceria Plus G3', tags: ['recommended', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/204050131/lexar-nq790.html', name: 'Lexar NQ790', tags: ['top', 'recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/205152504/western-digital-black-sn7100.html', name: 'Western Digital Black SN7100', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/204850860/samsung-990-evo-plus.html', name: 'Samsung 990 Evo Plus', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/202070636/western-digital-black-sn850x.html', name: 'Western Digital Black SN850X', tags: ['tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/6296290/crucial-bx500-2-5.html', name: 'Crucial BX500 2.5', tags: ['tested','recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/204799650/crucial-p310-2280.html#datasheet', name: 'Crucial P310 2280', tags: ['avoid'], note: '' },
      { id: 'https://www.idealo.fr/prix/202893404/lexar-nm790.html', name: 'Lexar NM790', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/205152501/western-digital-black-sn7100.html#reviews', name: 'Western Digital Black SN7100', tags: ['recommended'], note: '' },
    ],
    gpu: [
      // { id: '', name: '', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/206022058/xfx-radeon-rx-9070-xt.html', name: 'XFX Radeon RX 9070 XT', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/205618015/powercolor-radeon-rx-9070-xt.html', name: 'Powercolor Radeon RX 9070 XT', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/206008953/sapphire-radeon-rx-9070-xt.html', name: 'Sapphire Radeon RX 9070 XT', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/206591123/powercolor-radeon-rx-9060-xt.html', name: 'Powercolor Radeon RX 9060 XT', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/206008953/sapphire-radeon-rx-9070-xt.html', name: 'Sapphire Radeon RX 9070 XT', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/206038559/asus-radeon-rx-9070-xt.html', name: 'ASUS Radeon RX 9070 XT', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/206012229/asrock-radeon-rx-9070.html', name: 'ASRock Radeon RX 9070', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/206044278/gigabyte-radeon-rx-9070-xt.html', name: 'GigaByte Radeon RX 9070 XT', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/206564100/gigabyte-radeon-rx-9060-xt.html', name: 'GigaByte Radeon RX 9060 XT', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/206515105/msi-geforce-rtx-5060.html', name: 'MSI GeForce RTX 5060', tags: ['recommended'], note: '' },
    ],
    case: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/203457339/enermax-marbleshell-ms21-argb.html', name: 'Enermax MarbleShell MS21 ARGB', tags: ['tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/203457339/enermax-marbleshell-ms31-argb.html', name: 'Enermax MarbleShell MS31 ARGB', tags: ['tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/204372808/antec-c5-argb.html', name: 'Antec C5 ARGB', tags: ['top','tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/203859843/msi-mag-pano-m100r-pz.html', name: 'MSI MAG PANO M100R PZ', tags: ['tested'], note: '' },
    ],
    psu: [
      // { id: '', name: '', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/205116932/thermaltake-toughpower-gt.html', name: 'Thermaltake Toughpower GT', tags: ['top', 'tested'], note: '' },
      { id: 'https://www.idealo.fr/prix/203040908/msi-mag-gl.html', name: 'MSI MAG GL', tags: ['recommended'], note: '' },
      { id: 'https://www.idealo.fr/prix/206743433/cooler-master-mwe-gold-v3-atx-3-1.html', name: 'Cooler Master MWE Gold V3 ATX 3.1', tags: ['recommended', 'tested'], note: '' },
    ],
    os: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    thermal: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    hdd: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    fans: [
      // { id: '', name: '', tags: ['recommended', 'tested'], note: '' },
    ],
    psucables: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    soft: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    netcard: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],

    /* ── Setup ─────────────────────────────────────────────────────────── */
    desk: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    chair: [
      // { id: '', name: '', tags: ['recommended', 'tested'], note: '' },
    ],
    screen: [
      // { id: '', name: '', tags: ['top', 'tested'], note: '' },
    ],
    keyboard: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    mouse: [
      // { id: '', name: '', tags: ['top'], note: '' },
    ],
    pad: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    headset: [
      // { id: '', name: '', tags: ['recommended', 'tested'], note: '' },
    ],
    gamepad: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    ups: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    multiprise: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    switch: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    router: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    nas: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    graphictab: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    usbstick: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    memcard: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    dock: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    printer: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    extstorage: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    extssd: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    speakers: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    webcam: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    soundcard: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    capture: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    monitorarm: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
  },
};
