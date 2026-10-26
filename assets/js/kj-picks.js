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
            { id: 'https://www.idealo.fr/prix/204581800/amd-ryzen-9-9900x.html', name: 'AMD Ryzen 9 9900X', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/205072280/amd-ryzen-7-9800x3d-boxed.html', name: 'AMD Ryzen 7 9800X3D', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/202115887/amd-ryzen-7-5800x3d.html', name: 'AMD Ryzen 7 5800X3D', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/204581803/amd-ryzen-7-9700x.html', name: 'AMD Ryzen 7 9700X', tags: ['tested', 'recommended'], note: '' },
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
            { id: 'https://www.idealo.fr/prix/203971798/arctic-freezer-36-black.html', name: 'ARCTIC Freezer 36 Black', tags: ['tested', 'recommended'], note: '' },
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
            { id: 'https://www.idealo.fr/prix/6296290/crucial-bx500-2-5.html', name: 'Crucial BX500 2.5', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/204799650/crucial-p310-2280.html#datasheet', name: 'Crucial P310 2280', tags: ['avoid'], note: '' },
            { id: 'https://www.idealo.fr/prix/202893404/lexar-nm790.html', name: 'Lexar NM790', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/205152501/western-digital-black-sn7100.html#reviews', name: 'Western Digital Black SN7100', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/202052930/crucial-p3-plus.html', name: 'Crucial P3 Plus', tags: ['avoid'], note: '' },
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
            { id: 'https://www.idealo.fr/prix/204372808/antec-c5-argb.html', name: 'Antec C5 ARGB', tags: ['top', 'tested'], note: '' },
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
            { id: 'https://www.idealo.fr/prix/202285093/seagate-barracuda-3-5.html', name: 'Seagate BarraCuda 3.5"', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/202284569/seagate-ironwolf-pro.html', name: 'Seagate IronWolf Pro', tags: ['recommended'], note: '' },
        ],
        fans: [
            // { id: '', name: '', tags: ['recommended', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/6552437/arctic-p12-120-mm.html', name: 'ARCTIC P12 120 mm', tags: ['recommended', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/207232547/arctic-p12-pro-a-rgb.html', name: 'ARCTIC P12 Pro A-RGB', tags: ['recommended', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/210584954/arctic-p12-pro-pst-ln.html', name: 'ARCTIC P12 Pro PST LN', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/207231145/arctic-p12-pro-pst.html', name: 'ARCTIC P12 Pro PST', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/207231134/arctic-p14-pro-pst.html', name: 'ARCTIC P14 Pro PST', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/208708415/arctic-p12-pro-reverse-120mm-3-pack.html', name: 'ARCTIC P12 Pro Reverse 120mm 3-pack', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/203639067/be-quiet-pure-wings-3-pwm-120mm.html', name: 'be quiet! Pure Wings 3 PWM 120mm', tags: ['recommended', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/203710067/thermalright-tl-c12c-s-argb-120mm.html', name: 'Thermalright TL-C12C-S ARGB 120mm', tags: ['recommended'], note: '' },
        ],
        psucables: [
            // { id: '', name: '', tags: ['recommended'], note: '' },
        ],
        soft: [
            // { id: '', name: '', tags: ['recommended'], note: '' },
        ],
        netcard: [
            // { id: '', name: '', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/6940427/asus-xg-c100f.html', name: 'ASUS XG-C100F', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/204062999/gigabyte-gc-wifi7.html', name: 'GigaByte GC-WIFI7', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/201106624/tp-link-tx401.html', name: 'TP-Link TX401', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/5663019/asus-xg-c100c-10gbase-t-pcie.html', name: 'ASUS XG-C100C 10GBase-T PCIe', tags: ['recommended'], note: '' },
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
            { id: 'https://www.idealo.fr/prix/209328358/aoc-24g4zre.html', name: 'AOC 24G4ZRE', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/208072165/iiyama-g-master-g2471hs-b1.html', name: 'iiyama G-Master G2471HS-B1', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/213322068/aoc-24g50f.html', name: 'AOC 24G50F', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/206509453/aoc-q24g4re.html', name: 'AOC Q24G4RE', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/204856817/aoc-q27g4xf.html', name: 'AOC Q27G4XF', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/206552324/aoc-q27g42ze.html', name: 'AOC Q27G42ZE', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/208471328/aoc-q27g4zdr.html', name: 'AOC Q27G4ZDR', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/210663567/gigabyte-go27q24a.html', name: 'GigaByte GO27Q24A', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/209710295/msi-mag-274qp-qd-oled-x24.html', name: 'MSI MAG 274QP QD-OLED X24', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/206313361/aoc-q27g42xe.html', name: 'AOC Q27G42XE', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/206572621/aoc-u27g4r.html', name: 'AOC U27G4R', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/208530191/iiyama-g-master-gb2771uhsu-b1.html', name: 'iiyama G-Master GB2771UHSU-B1', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/207766465/msi-mag-275upd-e14.html', name: 'MSI MAG 275UPD E14', tags: ['recommended'], note: '' },
        ],
        keyboard: [
            // { id: '', name: '', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/202066944/logitech-g413-tkl-se-fr.html', name: 'Logitech G413 TKL SE FR', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/202842126/logitech-mx-keys-s-combo-fr.html', name: 'Logitech MX Keys S Combo FR', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/202836425/logitech-mx-keys-s-fr-graphite.html', name: 'Logitech MX Keys S (FR) Graphite', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/203114382/logitech-mx-keys-s-fr-gris.html', name: 'Logitech MX Keys S (FR) gris', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/202032048/logitech-mx-mechanical-tactile-fr.html', name: 'Logitech MX Mechanical Tactile (FR)', tags: ['top', 'tested'], note: '' },
        ],
        mouse: [
            // { id: '', name: '', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/202169870/cooler-master-mm712.html', name: 'Cooler Master MM712', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/202837258/logitech-mx-anywhere-3s.html', name: 'Logitech MX Anywhere 3S', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/6283221/logitech-mx-vertical.html', name: 'Logitech MX Vertical', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/5674914/logitech-g903-lightspeed.html', name: 'Logitech G903 Lightspeed', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/206571373/corsair-scimitar-elite-wireless-se-mmo.html', name: 'Corsair Scimitar Elite Wireless SE MMO', tags: ['tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/3693148/razer-deathadder.html', name: 'Razer DeathAdder', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/201800817/logitech-signature-m650.html', name: 'https://www.idealo.fr/prix/201800817/logitech-signature-m650.html', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/201926593/logitech-lift.html', name: 'Logitech Lift', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/209226770/logitech-g-pro-x2-superstrike.html', name: 'Logitech G PRO X2 SUPERSTRIKE', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/201968116/logitech-mx-master-3s.html', name: 'Logitech MX Master 3S ', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/201428890/logitech-g502-hero.html', name: 'Logitech G502 Hero', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/202107846/logitech-g502-x-lightspeed.html', name: 'Logitech G502 X Lightspeed', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/203223403/logitech-g-pro-x-superlight-2.html', name: 'Logitech G Pro X Superlight 2', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/207889207/logitech-mx-master-4.html', name: 'Logitech MX Master 4', tags: ['top'], note: '' },
            { id: 'https://www.idealo.fr/prix/201784639/steelseries-aerox-3-wireless-2022-edition.html', name: 'SteelSeries Aerox 3 Wireless (2022 Edition)', tags: ['tested'], note: '' },
        ],
        pad: [
            // { id: '', name: '', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/200777484/corsair-mm350-pro-extended-xl-grey-black.html', name: 'Corsair MM350 PRO Extended XL Grey/Black', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/201768216/logitech-desk-mat-studio.html', name: 'Logitech Desk Mat Studio', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/4479520/steelseries-qck-edition.html', name: 'SteelSeries QCK Edition', tags: ['recommended'], note: '' },
        ],
        headset: [
            // { id: '', name: '', tags: ['recommended', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/203079997/corsair-hs80-max-wireless.html', name: 'Corsair HS80 Max Wireless', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/201546949/corsair-hs80-rgb-sans-fil.html', name: 'Corsair HS80 RGB sans fil', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/202328730/corsair-hs55-wireless.html', name: 'Corsair HS55 Wireless', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/202904702/hyperx-cloud-iii.html', name: 'HyperX Cloud III', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/208027877/logitech-g-g321-lightspeed.html', name: 'Logitech G G321 LIGHTSPEED', tags: ['avoid'], note: '' },
            { id: 'https://www.idealo.fr/prix/204888529/steelseries-arctis-nova-5-wireless-noir.html', name: 'SteelSeries Arctis Nova 5 Wireless noir', tags: ['top', 'tested'], note: '' },
        ],
        gamepad: [
            // { id: '', name: '', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/204413140/x-8bitdo-ultimate-3-mode.html', name: '8bitdo Ultimate 3-mode', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/209452610/flydigi-vader-5-pro-noir.html', name: 'Flydigi Vader 5 Pro noir', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/207078074/gamesir-g7-pro.html', name: 'GameSir G7 PRO', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/206076079/x-8bitdo-ultimate-2-wireless-controller.html', name: '8bitdo Ultimate 2 Wireless Controller', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/200584946/sony-manette-sans-fil-dualsense.html', name: 'Sony Manette sans fil DualSense', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/200682391/microsoft-manette-sans-fil-xbox-2020.html', name: 'Microsoft Manette sans fil Xbox (2020)', tags: ['tested', 'recommended'], note: '' },
        ],
        ups: [
            // { id: '', name: '', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/4548749/eaton-ellipse-pro-1600-fr.html', name: 'Eaton Ellipse PRO 1600 FR', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/4941129/eaton-ellipse-pro-650-iec.html', name: 'Eaton Ellipse PRO 650 IEC', tags: ['tested', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/203977109/cyberpower-cp1350epfclcd.html', name: 'CyberPower CP1350EPFCLCD', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/204280576/cyberpower-cp1600epfclcd.html', name: 'CyberPower CP1600EPFCLCD', tags: ['recommended'], note: '' },
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
            { id: 'https://www.idealo.fr/prix/206591793/logitech-brio-4k-2025.html', name: 'Logitech Brio 4K (2025)', tags: ['top', 'recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/203498450/logitech-brio-100.html', name: 'Logitech Brio 100', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/204170783/elgato-facecam-neo.html', name: 'Elgato Facecam Neo', tags: ['recommended'], note: '' },
            { id: 'https://www.idealo.fr/prix/201814076/lenovo-performance-fhd.html', name: 'Lenovo Performance FHD', tags: ['top', 'tested'], note: '' },
            { id: 'https://www.idealo.fr/prix/5722628/logitech-meetup.html', name: 'Logitech MeetUp', tags: ['tested', 'recommended'], note: '' },
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
