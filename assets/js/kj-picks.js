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
    ],
    mb: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    ram: [
      // { id: '', name: '', tags: ['recommended', 'tested'], note: '' },
    ],
    cooler: [
      // { id: '', name: '', tags: ['top'], note: '' },
    ],
    ssd: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    gpu: [
      // { id: '', name: '', tags: ['top', 'tested'], note: '' },
    ],
    case: [
      // { id: '', name: '', tags: ['recommended'], note: '' },
    ],
    psu: [
      // { id: '', name: '', tags: ['top', 'tested'], note: '' },
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
