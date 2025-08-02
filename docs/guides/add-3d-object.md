# 3D-Objekt hinzufügen – Schritt für Schritt

Ziel: Ein einfaches 3D-Objekt (z. B. Würfel) zur Szene hinzufügen, im Render-Loop sichtbar machen und erste Interaktionen ermöglichen. Du benötigst nur Grundkenntnisse aus [three.Scene](../features/scene-basics.md) und dem UI-/State-Flow aus [State & Events](../features/state-and-events.md).

## Voraussetzungen
- Projekt lokal gestartet nach [setup-local.md](./setup-local.md).
- Scene/Renderer/Kamera sind initialisiert, siehe [three.js Grundlagen](../features/scene-basics.md).

## Objekt erstellen
1) Geometrie/Material/Mesh vorbereiten
   - geometry = new [three.BoxGeometry](../features/scene-basics.md)(1,1,1)
   - material = new [three.MeshStandardMaterial](../features/scene-basics.md)({ color: "#4da3ff" })
   - cube = new [three.Mesh](../features/scene-basics.md)(geometry, material)

2) Licht hinzufügen
   - light = new [three.DirectionalLight](../features/scene-basics.md)(0xffffff, 1)

3) Zur Scene hinzufügen und in Render-Loop drehen

## Materialien variieren
- Beispielhafte Materialtypen:
  - [three.MeshPhongMaterial](../features/scene-basics.md) (glänzend, simpel)
  - [three.MeshBasicMaterial](../features/scene-basics.md) (ohne Licht)
  - [three.MeshPhysicalMaterial](../features/scene-basics.md) (PBR, realistischer)

## Nächste Schritte
- Baue ein Panel, um Objekteigenschaften live zu ändern: [add-ui-panel.md](./add-ui-panel.md)
- Veröffentliche die Aktion als Event über Nostr: [integrate-nostr.md](./integrate-nostr.md)
- Mehr Performance-/Architektur-Details: [scene-basics.md](../features/scene-basics.md), [architecture.md](../reference/architecture.md)