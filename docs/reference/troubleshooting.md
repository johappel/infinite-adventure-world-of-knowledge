# Troubleshooting – Häufige Fehler und Lösungen

Ziel: Schnelle Hilfe bei typischen Problemen mit UI, three.js, Import Maps und Nostr.

Inhaltsverzeichnis
- Anzeigeprobleme (weiß/schwarz)
- Module/Import Maps
- Interaktion/Raycasting
- Performance
- Nostr/Relays

Anzeigeprobleme (weiß/schwarz)
- Konsole prüfen: Syntaxfehler, 404 auf Module.
- Reihenfolge im HTML: es-module-shims vor Import Map und vor erstem Module-Import. Siehe [module-shims.md](docs/features/module-shims.md).
- Kamera/Objekte: Kamera blickt am Objekt vorbei; nutze `camera.lookAt` und sinnvolle Start-Positionen.
- Licht: PBR-Materialien brauchen Licht. Teste mit [three.MeshBasicMaterial()](docs/features/scene-basics.md:1).

Module/Import Maps
- 404 bei Addons: "three/addons/" korrekt auf JSM-Pfad gemappt?
- Cache: DevTools → Disable cache aktivieren.
- Pfade konsistent halten (ein CDN, feste Versionen). Siehe [module-shims.md](docs/features/module-shims.md).

Interaktion/Raycasting
- NDC falsch: Verwende aktuelle Canvas-Größe und Device-Pixel-Ratio.
- Kein Treffer: `intersectObjects(objs, true)` rekursiv setzen.
- Event-Bubbling: UI-Overlays blockieren Klicks – Pointer-Events gezielt (de-)aktivieren.

Performance
- Render-Loop: Unnötige State-/Scene-Updates vermeiden.
- Materialien/Geometrien wiederverwenden, Texturgrößen moderat halten.
- Profiling: DevTools Performance/Mem, drei.js Inspector/Stats.
- Sichtbereich: Frustum-Culling nutzen; weite Clip-Planes vermeiden.

Nostr/Relays
- Verbindung: Mehrere Relays, Reconnect mit Backoff.
- Rate-Limits: Events drosseln, Queue bei Offline.
- Sicherheit: Schlüssel niemals im Repo; nur temporär im Speicher.
- Filter: Enge Filter verwenden, um Spam zu reduzieren.

Weiterführend
- Architektur: [architecture.md](docs/reference/architecture.md)
- Glossar: [glossary.md](docs/reference/glossary.md)