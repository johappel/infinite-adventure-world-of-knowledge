# UI-Panel hinzufügen – Schritt für Schritt

Ziel: Ein neues UI-Panel hinzufügen, das mit dem State verbunden ist, Actions dispatcht und Änderungen in der 3D-Szene sichtbar macht. Dieses Guide verknüpft UI, [State & Events](docs/features/state-and-events.md) und [three.Scene()](docs/features/scene-basics.md:1).

Inhaltsverzeichnis
- Voraussetzungen
- Panel-Ziele definieren
- Panel-Template anlegen
- State-Bindings (Selectoren) herstellen
- Actions dispatchen
- Styling, A11y und Responsiveness
- Tests/Checks
- Nächste Schritte

Voraussetzungen
- Lokales Setup läuft: [setup-local.md](docs/guides/setup-local.md)
- Grundverständnis: [ui-overview.md](docs/ui-overview.md), [state-and-events.md](docs/features/state-and-events.md), [scene-basics.md](docs/features/scene-basics.md)

Panel-Ziele definieren
- Beispiel: „Selection Panel“
  - Anzeigen: aktuell selektiertes Objekt (ID, Position/Rotation/Scale).
  - Aktionen: Position inkrementieren, Objekt löschen, Materialfarbe ändern.
  - Optional: Publiziere Änderungen als Nostr-Events (siehe [integrate-nostr.md](docs/guides/integrate-nostr.md)).

Panel-Template anlegen
- HTML-Struktur (schematisch in deiner App-HTML, z. B. [client_ux_boilerplate.html](client_ux_boilerplate.html)):
  - <aside class="panel panel--selection" aria-label="Selection Panel">
    <header><h2>Selection</h2></header>
    <div class="panel__content">
      <div class="row">ID: <span id="sel-id">-</span></div>
      <div class="row">Position: 
        X <input id="pos-x" type="number" step="0.1"/>
        Y <input id="pos-y" type="number" step="0.1"/>
        Z <input id="pos-z" type="number" step="0.1"/>
      </div>
      <div class="row">
        <button id="btn-apply">Übernehmen</button>
        <button id="btn-delete">Löschen</button>
      </div>
    </div>
  </aside>
- JavaScript-Initialisierung (Entry-Module via Import Map/Shim, siehe [module-shims.md](docs/features/module-shims.md)):
  - Selektiere die Elemente (sel-id, pos-x, pos-y, pos-z, Buttons).
  - Binde Event-Listener an Buttons/Inputs.

State-Bindings (Selectoren) herstellen
- Definiere Selector-Funktionen:
  - selectCurrentSelection(state) → { id, position, rotation, scale }
- Beim State-Update:
  - UI-Felder mit den Werten füllen.
  - Falls kein Objekt selektiert: Felder deaktivieren und „-” anzeigen.
- Ein einfaches Muster:
  - subscribeToState((state) => {
      const sel = selectCurrentSelection(state);
      renderSelectionPanel(sel);
    });

Actions dispatchen
- Übernehmen-Button:
  - Liest Werte aus Inputs, dispatcht `updateTransform({ id, position })`.
- Löschen-Button:
  - dispatcht `removeObject({ id })`.
- Optional: Farbwahl (Farbfeld-Input) → `updateMaterial({ id, color })`.
- Eventfluss:
  - UI → [State](docs/features/state-and-events.md) → Scene-Effect → [three.Mesh()](docs/features/scene-basics.md:1) aktualisieren.
  - Optional: Nostr-Effect → [nostr.publish()](docs/features/nostr-basics.md:1).

Styling, A11y und Responsiveness
- CSS:
  - `.panel` Grundlayout, `.panel__content` für Zeilen/Grids.
  - Medienabfragen für schmale Viewports (Panel einklappbar machen).
- A11y:
  - aria-label/aria-controls verwenden.
  - Fokus-Reihenfolge beachten, sichtbare Fokusrahmen.
  - Buttons mit eindeutigen Beschriftungen.
- Tastatur:
  - Enter auf Inputs löst Übernehmen aus.
  - Escape schließt das Panel, falls modal.

Tests/Checks
- Sichtbarkeit:
  - Panel zeigt korrekte Werte bei Auswahl.
- Actions:
  - updateTransform ändert die Position in State, Scene zieht nach.
  - removeObject entfernt das Objekt sichtbar in der 3D-Szene.
- Edge Cases:
  - Kein Objekt selektiert: Buttons/Inputs disabled.
  - Ungültige Werte: Eingaben validieren (min/max/step).

Nächste Schritte
- Nostr-Anbindung für Änderungsereignisse: [integrate-nostr.md](docs/guides/integrate-nostr.md)
- Weiterführende Muster: [extensibility.md](docs/features/extensibility.md)
- Architektur verstehen: [architecture.md](docs/reference/architecture.md)