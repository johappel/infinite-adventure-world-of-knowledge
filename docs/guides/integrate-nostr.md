# Nostr integrieren – Schritt für Schritt

Ziel: Einen minimalen Publish/Subscribe-Flow mit Nostr in die App integrieren, um UI-/Scene-Ereignisse optional über Relays zu teilen. Nach diesem Guide kannst du Events signieren, publizieren, filtern und abonnieren.

Inhaltsverzeichnis
- Voraussetzungen
- Schlüssel erzeugen/verwenden
- Relay-Verbindungen aufbauen
- Events definieren (Kinds, Content, Tags)
- Publish: UI/State-Änderungen senden
- Subscribe: Eingehende Events verarbeiten
- Robustheit und Sicherheit
- Nächste Schritte

Voraussetzungen
- Lokales Setup läuft: [setup-local.md](./setup-local.md)
- Grundverständnis Nostr: [nostr-basics.md](features/nostr-basics.md)
- State/Actions bekannt: [state-and-events.md](features/state-and-events.md)

Schlüssel erzeugen/verwenden
- Für Demos: Erzeuge testweise ein Schlüsselpaar im Client (Web Crypto) und speichere den privaten Schlüssel NICHT dauerhaft.
- Alternative: Nutze Browser-Wallets/Extensions, die Nostr-Signaturen bereitstellen.
- API-Design:
  - nostr.keys.generate() → { sk, pk }
  - nostr.keys.fromHex(skHex) → Keypair
  - Sicher speichern? Wenn überhaupt, nur verschlüsselt und mit Nutzerzustimmung.

Relay-Verbindungen aufbauen
- Relays sind WebSockets, z. B. wss://relay.example.
- API-Design:
  - nostr.connect(relays: string[]) → connectionHandle
  - nostr.disconnect(handle)
  - nostr.status(handle) → { connected: number, failed: number }
- Best Practices:
  - Mehrere Relays parallel für Redundanz.
  - Reconnect mit Backoff.
  - Health-Check/Statusanzeige im UI (z. B. „3/4 Relays verbunden“).

Events definieren (Kinds, Content, Tags)
- Festlege ein App-spezifisches Kind (z. B. 30001).
- Content: Serialisiertes JSON mit Eventtyp/Nutzlast, z. B. { "type": "cube_added", "id": "...", "position": [x,y,z] }.
- Tags:
  - ["t","scene"] zur thematischen Gruppierung
  - ["type","cube_added"] für Filterung
- Dokumentiere das Schema in der Repo-Doku, damit andere Clients kompatibel sind.

Publish: UI/State-Änderungen senden
- Mapping Beispiel:
  - Action addCube → Event:
    - kind: 30001
    - content: JSON.stringify({ type: "cube_added", id, position })
    - tags: [["t","scene"], ["type","cube_added"]]
- API-Design:
  - nostr.publish(handle, eventDraft, sk) → Promise<ok>
  - EventDraft = { kind, content, tags, created_at }
  - Die Funktion berechnet id/sig und verschickt an alle Relays.
- UI-Anbindung:
  - Beim erfolgreichen Publish Status im State notieren (OK/ERROR)
  - Optional: Button-Feedback (z. B. „gesendet“)

Subscribe: Eingehende Events verarbeiten
- Filter definieren:
  - kinds: [30001]
  - tags: [["t","scene"]]
- API-Design:
  - nostr.subscribe(handle, filter, onEvent)
  - onEvent(evt): Validieren → Mapper → Action dispatchen (z. B. addCubeFromRemote)
- Duplikate:
  - Event-IDs im State zwischenspeichern, doppelte ignorieren.

Robustheit und Sicherheit
- Schlüssel:
  - Niemals sk ins Repo legen.
  - Nutzung über sichere Eingabe (z. B. Dialog), im Speicher halten, bei Tab-Schließen verwerfen.
- Rate-Limits:
  - Publish-Events limitieren (z. B. pro Sekunde).
  - Backoff bei Relay-Fehlern.
- Offline/Retry:
  - Event-Queue puffern und später senden.
  - UI-Status „Offline“ anzeigen.
- Threads:
  - Signatur/Hashing in Worker auslagern, um UI ruckelfrei zu halten.

Nächste Schritte
- Ein UI-Panel für Nostr-Status/Relays bauen: [add-ui-panel.md](./add-ui-panel.md)
- Event-Schema in Referenz ergänzen: [architecture.md](reference/architecture.md)
- Vollständigen Flow testen mit lokalem/öffentlichem Relay.