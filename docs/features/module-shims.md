# es-module-shims und Import Maps – warum und wie

Ziel: Verstehen, warum [es-module-shims.importMap()](docs/features/module-shims.md:1) nützlich ist, wie Import Maps funktionieren und wie du Module (z. B. three.js) sauber referenzierst – lokal und via CDN.

Inhaltsverzeichnis
- Problemstellung
- Import Maps – Grundlagen
- es-module-shims – was es löst
- Beispiel: Import Map definieren
- Tipps für three.js und Co.
- Fallbacks & Troubleshooting
- Nächste Schritte

Problemstellung
- Moderne Browser verstehen ES-Module, aber:
  - Pfade sind oft lang/fragil (tiefe CDN-Pfade).
  - Bibliotheken liefern verschiedene Builds (module, legacy, extras).
  - Unterschiedliche Umgebungen (lokal, staging, prod) brauchen andere Pfadauflösungen.
- Ziel: Eine zentrale Stelle, um Modulnamen auf URLs zu mappen – ohne überall die Pfade anzupassen.

Import Maps – Grundlagen
- Eine Import Map ist ein JSON-ähnlicher Block, der Modul-Specifier auf URLs abbildet.
- Beispielidee:
  - "three": "https://cdn.example/three/0.158.0/build/three.module.js"
  - "three/addons/": "https://cdn.example/three/0.158.0/examples/jsm/"
- Vorteil: Im Code importierst du einfach `import { Scene } from "three";` statt einer langen URL.
- Einschränkung: Nicht alle Browser unterstützen Import Maps nativ – hier hilft es, [es-module-shims.importMap()](docs/features/module-shims.md:1) vorzuschalten.

es-module-shims – was es löst
- Polyfill/Shim, der Import Maps in mehr Browsern nutzbar macht.
- Verarbeitet die Import Map vor dem ersten Module-Import.
- Unterstützt Features wie `importmap-shim` Attribut.

Beispiel: Import Map definieren
- In deiner HTML (z. B. [client_ux_boilerplate.html](client_ux_boilerplate.html)):
  1) es-module-shims einbinden (früh im Head).
  2) Import Map per Script-Tag definieren.
  3) Dein Application-Entry als type="module" laden.

Struktur (schematisch):
- HTML Head:
  - <script async src="https://cdn.skypack.dev/es-module-shims@latest" crossorigin></script>
  - <script type="importmap-shim"> { "imports": { "three": "...", "three/addons/": "..." } } </script>
- Application Entry:
  - <script type="module-shim">
    import { Scene } from "three";
    // App-Start...
    </script>

Tipps für three.js und Co.
- Nutze einen konsistenten CDN (esm.sh, unpkg, jsDelivr, skypack) – mische nicht unnötig.
- Mapiere Präfixe wie "three/addons/" für JSM-Module (OrbitControls usw.).
- Versionen pinnen (z. B. 0.158.0), um reproduzierbare Builds zu haben.
- Für lokale Entwicklung: Auf lokale Pfade mappen (z. B. "/vendor/three/three.module.js").

Fallbacks & Troubleshooting
- Script-Reihenfolge: Der Shim muss vor Import Maps und vor dem ersten Modul-Import geladen sein.
- CORS: Achte auf `crossorigin` Attribute und CDN-Konfiguration.
- 404/Version: Prüfe die exakte Versions-URL und Pfadstruktur der Addons.
- Cache: CDN-Cache kann alte Dateien liefern; ggf. Cache-Buster oder feste Versionen nutzen.
- Wenn der Browser Import Maps nativ unterstützt:
  - Du kannst `type="importmap"` und `type="module"` verwenden.
  - Für breite Kompatibilität bleibe bei `importmap-shim` und `module-shim`.

Nächste Schritte
- Siehe [three.js Grundlagen](docs/features/scene-basics.md), um die imports direkt zu nutzen.
- Gehe zu [setup-local.md](docs/guides/setup-local.md), um das Projekt mit Import Map lokal zu starten.