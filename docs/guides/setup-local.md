# Lokale Einrichtung und Start

Ziel: Das Projekt lokal öffnen, die HTML über einen lokalen Server ausliefern, [es-module-shims.importMap()](features/module-shims.md:1) korrekt laden und typische Setup-Probleme lösen.

Inhaltsverzeichnis
- Voraussetzungen
- Projekt öffnen
- Lokalen Server starten
- Browser-Konfiguration
- Import Maps prüfen
- Troubleshooting

Voraussetzungen
- Editor: VS Code (empfohlen) oder ein anderer Editor.
- Node.js (für einfache statische Server wie `npx serve`) – optional, wenn du VS Code Live Server verwendest.
- Moderner Browser (Chromium/Firefox/Safari).

Projekt öffnen
1) Klone oder öffne das Repository im Editor.
2) Prüfe die Startdatei [client_ux_boilerplate.html](client_ux_boilerplate.html) – hier wird die Import Map und der App-Entry definiert.
3) Lies kurz [README.md](README.md), um den Überblick zu bekommen.

Lokalen Server starten
Option A: VS Code Live Server
- Erweiterung „Live Server“ installieren.
- Rechtsklick auf [client_ux_boilerplate.html](client_ux_boilerplate.html) → „Open with Live Server“.
- Browser öffnet die Seite unter http://localhost:PORT/.

Option B: npx serve
- Terminal im Projektordner öffnen.
- `npx serve .` ausführen.
- Im Browser `http://localhost:3000` (oder angezeigte URL) öffnen.

Warum Server?
- Direktes Öffnen als file:// blockiert oft Module/CORS.
- Ein lokaler HTTP-Server stellt korrekte Pfade, CORS und Caching bereit.

Browser-Konfiguration
- Leere den Browser-Cache beim Debuggen (DevTools → Network → Disable cache).
- Aktiviere „Preserve log“, um Ladefehler zu sehen.

Import Maps prüfen
- In [client_ux_boilerplate.html](client_ux_boilerplate.html): 
  - Wird der Shim früh geladen? (head-Bereich)
  - Existiert der Block `type="importmap-shim"` und enthält er die Mappings (z. B. "three", "three/addons/")?
  - Nutzt der App-Entry `type="module-shim"`?
- Falls du native Import Maps nutzen willst:
  - Verwende `type="importmap"` und `type="module"`, beachte jedoch Browser-Support.

Troubleshooting
- Weißer/Schwarzer Bildschirm:
  - DevTools → Console öffnen: Syntaxfehler oder 404 auf Module?
  - Prüfe die Reihenfolge: es-module-shims muss vor der Import Map und vor dem ersten Module-Import geladen werden.
- 404 bei three/addons:
  - Stelle sicher, dass "three/addons/" in der Import Map auf die korrekte JSM-Ordner-URL zeigt.
- CORS/Integrity:
  - Bei CDN-Imports `crossorigin`-Attribute setzen; SRI nur mit passenden Hashes.
- Performance langsam:
  - DevTools Performance/Memory nutzen.
  - Siehe [three.js Grundlagen](features/scene-basics.md) für Render-Loop-Optimierungen.

Nächste Schritte
- Lies [ui-overview.md](ui-overview.md).
- Füge ein Objekt hinzu über [add-3d-object.md](guides/add-3d-object.md).
- Erzeuge ein UI-Panel über [add-ui-panel.md](guides/add-ui-panel.md).