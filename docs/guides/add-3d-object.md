# 3D-Objekt hinzufügen – Schritt für Schritt

Ziel: Ein einfaches 3D-Objekt (z. B. Würfel) zur Szene hinzufügen, im Render-Loop sichtbar machen und erste Interaktionen ermöglichen. Du benötigst nur Grundkenntnisse aus [three.Scene()](docs/features/scene-basics.md:1) und dem UI-/State-Flow aus [State & Events](docs/features/state-and-events.md).

Inhaltsverzeichnis
- Voraussetzungen
- Objekt hinzufügen (Minimalweg)
- Position/Material konfigurieren
- Interaktion: Auswahl per Raycaster
- Häufige Fehler
- Nächste Schritte

Voraussetzungen
- Projekt lokal gestartet nach [setup-local.md](docs/guides/setup-local.md).
- Scene/Renderer/Kamera sind initialisiert, siehe [three.js Grundlagen](docs/features/scene-basics.md).

Objekt hinzufügen (Minimalweg)
1) Erzeuge eine Geometrie:
   - geometry = new [three.BoxGeometry()](docs/features/scene-basics.md:1)(1,1,1)
2) Erzeuge ein Material:
   - material = new [three.MeshStandardMaterial()](docs/features/scene-basics.md:1)({ color: "#4da3ff" })
3) Erzeuge das Mesh:
   - cube = new [three.Mesh()](docs/features/scene-basics.md:1)(geometry, material)
4) Füge es der Szene hinzu:
   - scene.add(cube)
5) Stelle sicher, dass Licht vorhanden ist:
   - light = new [three.DirectionalLight()](docs/features/scene-basics.md:1)(0xffffff, 1)
   - light.position.set(3,3,3)
   - scene.add(light)

Position/Material konfigurieren
- Position:
  - cube.position.set(x, y, z)
- Rotation:
  - cube.rotation.set(rx, ry, rz)
- Skalierung:
  - cube.scale.set(sx, sy, sz)
- Material-Varianten:
  - [three.MeshPhongMaterial()](docs/features/scene-basics.md:1) (glänzend, simpel)
  - [three.MeshBasicMaterial()](docs/features/scene-basics.md:1) (ohne Licht)
  - [three.MeshPhysicalMaterial()](docs/features/scene-basics.md:1) (PBR, realistischer)

Interaktion: Auswahl per Raycaster
- Ziel: Auf Klick soll das Objekt ausgewählt werden.
- Schritte:
  1) Mausposition in NDC umrechnen.
  2) raycaster.setFromCamera(mouse, camera)
  3) intersects = raycaster.intersectObjects(scene.children, true)
  4) Erstes Ergebnis auswerten → Action `selectObject({ id })` dispatchen.
- Bindung an State/UI:
  - Der ausgewählte Objekt-`id`-Wert wird im State gehalten.
  - UI-Panels zeigen Details (z. B. Position) an und erlauben Änderungen.
  - Scene reagiert auf State-Änderungen (z. B. hebt Auswahl hervor).

Häufige Fehler
- Objekt ist unsichtbar:
  - Kamera schaut nicht darauf: Position/LookAt prüfen.
  - Kein Licht: Bei PBR-Materialien ist Licht notwendig.
  - Objekt zu klein/groß: Skaliere passend oder passe Kamera-Clip-Planes an.
- Kein Klicktreffer:
  - Canvas/Viewport-Größe stimmt nicht: Verwende aktuelle Breite/Höhe bei NDC-Umrechnung.
  - Raycaster durchsucht nicht rekursiv: `intersectObjects(..., true)` setzen.

Nächste Schritte
- Baue ein Panel, um Objekteigenschaften live zu ändern: [add-ui-panel.md](docs/guides/add-ui-panel.md)
- Veröffentliche die Aktion als Event über Nostr: [integrate-nostr.md](docs/guides/integrate-nostr.md)
- Mehr Performance-/Architektur-Details: [scene-basics.md](docs/features/scene-basics.md), [architecture.md](docs/reference/architecture.md)