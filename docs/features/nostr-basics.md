# Nostr – Grundlagen, Events, Relays

Ziel: Verstehen, was Nostr ist, wie Events aufgebaut sind, wie man Relays nutzt und wie UI/Scene-Änderungen darüber publiziert oder empfängt. Nach dieser Seite kannst du einfache Publish/Subscribe-Flows implementieren.

Inhaltsverzeichnis
- Was ist Nostr?
- Schlüssel & Identität
- Events: Aufbau und Signatur
- Relays: Verbinden, Publizieren, Abonnieren
- Sicherheitsaspekte
- Beispiel-Workflow
- Nächste Schritte

Was ist Nostr?
- Offenes Protokoll zum Verteilen signierter Nachrichten (Events) über Relays.
- Kein zentraler Server; Clients verbinden sich mit mehreren Relays.
- Ein Event ist unveränderlich; Korrekturen erfolgen über neue Events (Idempotenz durch Inhalte/Tags).

Schlüssel & Identität
- Jeder Client besitzt ein Schlüsselpaar: privater Schlüssel (sk), öffentlicher Schlüssel (pk).
- Der pk identifiziert dich gegenüber Relays/Empfängern.
- Private Schlüssel sind sensibel – niemals im Repo hardcoden. Für Demos nutze z. B. lokale Storage-Optionen.

Events: Aufbau und Signatur
- Felder (vereinfacht):
  - kind: Zahl, Event-Typ (z. B. 1 = Textnote; eigene Kinds für App-spezifische Events).
  - content: String (beliebige Nutzlast, z. B. JSON serialisiert).
  - tags: Array von Arrays, Metadaten (z. B. ["t","topic"], ["e","eventId"]).
  - created_at: Unix-Zeitstempel.
  - pubkey: Absender (wird aus Signatur abgeleitet).
  - id & sig: Hash/Signatur über kanonische Darstellung.
- Der Client erzeugt das Event, serialisiert, hasht und signiert es mit sk.

Relays: Verbinden, Publizieren, Abonnieren
- Relays sind WebSocket-Endpunkte.
- Client:
  1) Öffnet WebSocket-Verbindung(en).
  2) Sendet SUB (Filter) zum Abonnieren.
  3) Sendet EVENT zum Publizieren.
  4) Handhabt NOTICE/OK/EVENT-Nachrichten als Bestätigungen oder Inhalte.
- Robustheit:
  - Mehrere Relays parallel für Redundanz.
  - Reconnect-Strategien bei Verbindungsabbruch.
  - Rate-Limits respektieren, Exponential Backoff.

Sicherheitsaspekte
- Schlüsselverwaltung: sk nie im Klartext persistieren; ggf. WebCrypto/Hardware Wallets.
- Berechtigungen: Nur veröffentlichen, was notwendig ist; keine sensitiven Daten in content.
- Replay/Spam: Filter gezielt wählen; Whitelisting ausgewählter Relays.
- Signing im Worker auslagern, damit UI Haupt-Thread responsiv bleibt.

Beispiel-Workflow
- Use-Case: Ein UI-Button "Cube hinzugefügt" sendet ein App-Event.
  1) UI dispatcht Action addCube.
  2) State fügt Objekt der Scene hinzu.
  3) State erzeugt Nostr-Event:
     - kind: 30001 (Beispiel-App-Kind)
     - content: JSON.stringify({ type: "cube_added", id, position })
     - tags: [["t","scene"], ["type","cube_added"]]
  4) Event wird signiert und an Relays publiziert: [nostr.publish()](docs/features/nostr-basics.md:1)
  5) Subscription-Filter:
     - kinds: [30001]
     - tags: [["type","cube_added"]]
  6) Eingehende Events werden validiert, dann ggf. als State-Aktion angewendet.
- Mapping UI/Scene/Nostr ist im Detail unter [State & Events](docs/features/state-and-events.md) beschrieben.

Nächste Schritte
- Einrichtung/Testen lokaler Relays und Filter in [Nostr integrieren](docs/guides/integrate-nostr.md).
- UI-Eventfluss nachlesen in [State & Events](docs/features/state-and-events.md).
- Architekturdiagramme: [architecture.md](docs/reference/architecture.md).