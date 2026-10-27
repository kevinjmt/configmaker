<div align="center">

<img src="./assets/icons/favicon-512.png" width="150" alt="ConfigMaker logo">

# ConfigMaker

**Build, compare and understand your PC setup — locally.**

[![Open ConfigMaker](https://img.shields.io/badge/Open-ConfigMaker-1a8744?style=for-the-badge&logo=githubpages&logoColor=white)](https://kevinjmt.github.io/configmaker)
[![Version](https://img.shields.io/badge/version-2.0.0-22c55e?style=for-the-badge)](https://github.com/kevinjmt/configmaker/releases)
[![PWA](https://img.shields.io/badge/PWA-installable-60a5fa?style=for-the-badge&logo=pwa&logoColor=white)](https://kevinjmt.github.io/configmaker)
[![Issues](https://img.shields.io/badge/issues-welcome-ff6b6b?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kevinjmt/configmaker/issues)

[English](#english) · [Français](#français)

</div>

---

## English

ConfigMaker is a free, local-first PC and setup configurator. Choose your components, follow Idealo prices, check compatibility, estimate power draw, compare builds, and export a clean PDF or JSON — without creating an account or sending your configuration to a server.

### Why ConfigMaker?

- **Everything stays local.** Configurations, preferences and history live in your browser.
- **No account, no cart, no tracking.** The app is a configurator, not a shop.
- **Prices and specs from Idealo.** Search live listings, compare merchants and keep product datasheets.
- **Build with confidence.** Compatibility checks cover sockets, memory, PCIe, cooling, power, monitors and more.
- **Understand the real cost.** Power draw, weekly usage and peak/off-peak electricity pricing are included.
- **Share or keep it.** Generate a readable share link, a print-ready PDF or a re-importable JSON file.

### Features

| | Feature | What it does |
|---|---|---|
| 🧩 | **PC & setup configurator** | PCs, laptops, monitors, peripherals, furniture, networking, storage, audio and options. |
| 💶 | **Idealo prices & offers** | Live merchant listings, price history and detailed product datasheets. |
| ✅ | **Compatibility engine** | Socket, chipset, RAM, case, PSU, PCIe, cooling, display connectors and more. |
| ⚡ | **Power & electricity** | Component consumption, weekly usage calendar, HP/HC pricing and monthly/yearly cost. |
| 📊 | **Benchmarks & FPS** | 3DMark Time Spy, Geekbench, FPS estimates and usage summaries. |
| 🎓 | **Tutorials** | Build guides matched to selected components, plus full TopAchat and Materiel.net playlists. |
| 🔄 | **Compare builds** | Compare the current configuration with saved versions, variants and alternatives. |
| 📄 | **PDF & JSON exports** | Select exactly what to export, from the full report to the configuration alone. |
| 📱 | **Installable PWA** | Add to Home Screen on Android or iOS and launch it as a standalone app. |
| 🌍 | **French & English** | Full interface translation, light/dark themes and accessibility-minded settings. |

### Install as an app

ConfigMaker is a Progressive Web App. Once the site is deployed, install it from the canonical URL:

**Android — Chrome / Edge**

1. Open [kevinjmt.github.io/configmaker](https://kevinjmt.github.io/configmaker).
2. Open the browser menu.
3. Choose **Install app** or **Add to Home screen**.
4. Launch ConfigMaker from its icon: it opens without browser chrome.

**iOS — Safari**

1. Open [kevinjmt.github.io/configmaker](https://kevinjmt.github.io/configmaker) in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Launch the new icon: it opens as a standalone web app.

After the first load, the service worker keeps the app available offline. Price refreshes, AI requests and tutorials still need a network connection.

### Run locally

There is no build step and no package manager required.

```bash
git clone https://github.com/kevinjmt/configmaker.git
cd configmaker
python3 -m http.server 8080
```

Open <http://localhost:8080>.

> The service worker needs `http://localhost` or HTTPS. Opening `index.html` directly with `file://` will not enable PWA installation.

### Privacy

- Configurations, saved versions, price history and preferences are stored in your browser.
- Nothing is uploaded to a ConfigMaker server. There is no ConfigMaker account.
- External services are contacted only when you use the features that need them: prices, product data, benchmarks, tutorials, AI or web fonts.
- Exporting JSON gives you a portable copy of your data. Clearing browser storage removes local data.

### Release 2.0.0

This release brings:

- a single canonical link for the webapp, share links, PDFs and documentation;
- a new project README and release presentation;
- stronger Android/iOS installation with an explicit PWA identity and standalone launch;
- iOS safe-area handling for installed mode;
- canonical GitHub links for the project and its issue tracker.

See the in-app **Changelog** for the full history.

### Thanks

ConfigMaker stands on the shoulders of excellent services and open-source projects.

| Service | Used for |
|---|---|
| [Idealo](https://www.idealo.fr/) | Prices, merchant offers and much of the product data. |
| [Jina Reader](https://jina.ai/reader/) | Reading Idealo pages without CORS blocking. |
| [IObit FPS Calculator](https://www.iobit.com/en/fps-calculator.php) | In-game FPS estimates. |
| [3DMark](https://www.3dmark.com/) | Public Time Spy benchmark scores. |
| [Geekbench Browser](https://browser.geekbench.com/) | Single-core and multi-core CPU scores. |
| [YouTube](https://www.youtube.com/) | Tutorial and benchmark videos. |
| [TopAchat](https://www.youtube.com/playlist?list=PL4gCLcJ-OWrAoRkK36cLcitKubsEyoTDf) | PC build tutorial playlist. |
| [Materiel.net](https://www.youtube.com/playlist?list=PLnRZHGSOC2iKh2yifHyzYgyGPPASRs9Rz) | PC build tutorial playlist. |
| [Perplexity](https://www.perplexity.ai/) | AI-assisted configuration research. |
| [Font Awesome](https://fontawesome.com/) · [Bootstrap Icons](https://icons.getbootstrap.com/) · [Tabler Icons](https://tabler.io/icons) · [Lucide](https://lucide.dev/) | Interface icons. |
| [Google Fonts](https://fonts.google.com/) | Montserrat typography. |
| [cdnjs](https://cdnjs.com/) · [jsDelivr](https://www.jsdelivr.com/) · [unpkg](https://unpkg.com/) | Asset delivery. |
| [PCIe Simulator](https://pcie-simulator.vercel.app/) | PCIe lane simulation. |
| [GitHub Pages](https://pages.github.com/) | Hosting the webapp. |

Thank you to everyone maintaining these services and to the communities behind the benchmark and tutorial data.

### Disclaimer

ConfigMaker is an independent project and is not affiliated with Idealo, TopAchat, Materiel.net, IObit, UL Solutions, Geekbench or YouTube. Prices and availability are indicative; always verify them with the merchant before buying.

### Contributing

Bug reports, ideas and pull requests are welcome.

- ⭐ [Star the project on GitHub](https://github.com/kevinjmt/configmaker)
- 🐛 [Open an issue](https://github.com/kevinjmt/configmaker/issues)
- 🔗 [Open ConfigMaker](https://kevinjmt.github.io/configmaker)

---

## Français

ConfigMaker est un configurateur PC et setup gratuit, local et sans compte. Choisissez vos composants, suivez les prix Idealo, vérifiez la compatibilité, estimez la consommation, comparez vos configurations et exportez un PDF ou un JSON propre — sans envoyer vos données à un serveur.

### Points forts

- **Tout reste local.** Configurations, préférences et historique sont stockés dans votre navigateur.
- **Pas de compte, pas de panier, pas de suivi.** ConfigMaker reste un configurateur, pas une boutique.
- **Prix et fiches Idealo.** Offres marchands, historique des prix et fiches techniques détaillées.
- **Compatibilité vérifiée.** Socket, mémoire, PCIe, refroidissement, alimentation, écrans et bien plus.
- **Coût réel.** Consommation, calendrier d’utilisation et tarification HP/HC.
- **Partage et export.** Lien lisible, PDF prêt à imprimer ou JSON réimportable.

### Fonctions principales

- Configurateur PC, portable, setup, options, réseau, stockage et périphériques
- Prix, offres et fiches Idealo
- Vérification de compatibilité et alertes détaillées
- Consommation, coût mensuel et annuel
- Benchmarks 3DMark, Geekbench et estimations FPS
- Tutoriels de montage et playlists complètes
- Comparateur de configurations, variantes et alternatives
- Exports PDF et JSON à la carte
- Installation PWA sur Android et iOS
- Interface française et anglaise, thèmes clair/sombre

### Installation mobile

**Android — Chrome / Edge**

1. Ouvrez [kevinjmt.github.io/configmaker](https://kevinjmt.github.io/configmaker).
2. Menu du navigateur → **Installer l’application** ou **Ajouter à l’écran d’accueil**.
3. Lancez ConfigMaker depuis l’icône : l’application s’ouvre sans barre de navigateur.

**iOS — Safari**

1. Ouvrez [kevinjmt.github.io/configmaker](https://kevinjmt.github.io/configmaker) dans Safari.
2. Touchez **Partager**.
3. Choisissez **Sur l’écran d’accueil**.
4. Lancez l’icône : ConfigMaker s’ouvre comme une vraie application.

Après le premier chargement, le service worker permet de retrouver l’application hors ligne. Les prix, l’IA et les tutoriels nécessitent toujours une connexion.

### Confidentialité

Vos configurations, sauvegardes, historiques et préférences restent dans votre navigateur. Aucun serveur ConfigMaker ne reçoit vos données. Les services externes ne sont contactés que pour les fonctions qui en ont besoin : prix, fiches, benchmarks, tutoriels, IA ou polices web.

### Merci

Merci à **Idealo** pour les prix et les fiches, à **Jina Reader** pour la lecture des pages, à **IObit**, **3DMark** et **Geekbench** pour les benchmarks, à **YouTube**, **TopAchat** et **Materiel.net** pour les tutoriels, à **Perplexity** pour l’assistance IA, ainsi qu’à **Font Awesome**, **Bootstrap Icons**, **Tabler Icons**, **Lucide**, **Google Fonts**, **cdnjs**, **jsDelivr**, **unpkg**, **PCIe Simulator** et **GitHub Pages**.

### Contribution

Les rapports de bugs, idées et pull requests sont les bienvenus.

- ⭐ [Mettre une étoile au projet](https://github.com/kevinjmt/configmaker)
- 🐛 [Reporter un problème](https://github.com/kevinjmt/configmaker/issues)
- 🔗 [Ouvrir ConfigMaker](https://kevinjmt.github.io/configmaker)

---

<div align="center">

**ConfigMaker v2.0.0** · Made with ❤️ by [KJ](https://kevinjmt.github.io/) using AI

</div>
