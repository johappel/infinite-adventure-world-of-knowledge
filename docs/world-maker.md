# YAML World Maker - Dokumentation

## Überblick

Das YAML World System erweitert die Wissens-Entdeckungswelt um die Möglichkeit, Welten aus YAML-Konfigurationsdateien zu erstellen, anstatt sie zufällig zu generieren. Dies ermöglicht handgefertigte, präzise gestaltete Welten mit spezifischen NPCs, Objekten, Portalen und Umgebungseinstellungen.

## YAML-Format Spezifikation

### Grundstruktur

```yaml
# Basis-Metadaten
name: "Weltname"                 # Anzeigename der Welt
description: "Beschreibung..."   # Beschreibung für UI und Logs  
id: "zone-id"                   # Eindeutige Zone-ID

# Umgebung
environment:
  skybox: "clear_day"           # Himmel-Typ
  time_of_day: 0.5             # 0.0-1.0 (Mitternacht bis Mitternacht)
  ambient_light: 0.6           # Umgebungslicht-Stärke  
  sun_intensity: 0.8           # Sonnen-Stärke
  fog_distance: 100            # Sichtweite
  ambient_sound: "birds"       # Hintergrundgeräusche

# Terrain/Boden  
terrain:
  type: "flat"                 # flat, hills, mountains
  size: [50, 50]              # [Breite, Tiefe] in Einheiten
  color: "#4a7c1e"            # Farbe des Bodens
  texture: "grass"            # Textur-Hint

# Objekte, NPCs, Portale...
```

### Umgebungseinstellungen (`environment`)

| Feld | Typ | Beschreibung | Beispielwerte |
|------|-----|-------------|---------------|
| `skybox` | String | Himmel-Typ | `"clear_day"`, `"sunset"`, `"night"`, `"storm"`, `"mystery_dark"`, `"skyline"`, `"ocean"`, `"bay"` |
| `time_of_day` | Float | Tageszeit (0.0=Mitternacht, 0.5=Mittag) | `0.0` - `1.0` |
| `ambient_light` | Float | Umgebungslicht-Stärke | `0.0` - `1.0` |
| `sun_intensity` | Float | Direktes Sonnenlicht | `0.0` - `1.0` |
| `fog_distance` | Number | Sichtweite (optional) | `30` - `200` oder `null` |
| `skybox_mode` | String | Skybox-Modus (optional) | `"cube"` für prozedurale Skybox |

### Terrain (`terrain`)

| Feld | Typ | Beschreibung | Beispielwerte |
|------|-----|-------------|---------------|
| `type` | String | Terrain-Typ | `"flat"`, `"hills"`, `"mountains"` |
| `size` | Array | [Breite, Tiefe] in Einheiten | `[50, 50]`, `[80, 60]` |
| `color` | String | Hex-Farbe des Bodens | `"#4a7c1e"`, `"#2d4a22"` |
| `texture` | String | Textur-Hint (zukünftig) | `"grass"`, `"stone"`, `"sand"` |

### Objekte (`objects`)

```yaml
objects:
  - type: "rock"                 # Objekt-Typ
    position: [5, 0, 3]         # [x, y, z] Position
    scale: [1.2, 0.8, 1.1]      # [x, y, z] Skalierung  
    color: "#8b7355"            # Hex-Farbe
    interactive: true           # Kann man interagieren?
    script: |                   # JavaScript für Interaktion/Animation
      console.log("Stein berührt!");
```

#### Verfügbare Objekt-Typen

| Typ | Beschreibung | 3D-Form |
|-----|-------------|---------|
| `rock` | Stein/Felsen | Dodecahedron |
| `tree` | Baum | Zylinder |
| `crystal` | Kristall | Octahedron |
| `mushroom` | Pilz | Zylinder (umgekehrt) |
| `bookshelf` | Bücherregal | Box |
| `reading_table` | Lesetisch | Flache Box |
| `globe` | Globus | Kugel |
| `stone_circle` | Steinkreis | Torus |
| `crystal_knowledge` | Wissenskristall | Großer Octahedron |

### Portale (`portals`)

```yaml
portals:
  - id: "to-forest"             # Portal-ID
    name: "Zum Mystischen Wald" # Anzeigename
    position: [-10, 1, 0]       # [x, y, z] Position
    size: [2, 3, 0.5]           # [Breite, Höhe, Tiefe]
    destination: "zone-forest"   # Ziel-Zone ID
    color: "#9370db"            # Hex-Farbe
```

### NPCs/Personas (`personas`)

```yaml
personas:
  - name: "Lehrmeister Aelion"  # NPC-Name (wird angezeigt)
    position: [0, 0, 5]         # [x, y, z] Position
    appearance:
      color: "#ff6b6b"          # Farbe der Figur
      height: 1.8               # Höhe in Einheiten
      type: "humanoid"          # Typ-Hint
    behavior:
      greeting: "Willkommen..."  # Begrüßungstext
      idle_animation: "breathe"  # Animation (zukünftig)
    dialogue:
      opening: "Ich bin..."      # Dialog-Eröffnung
      topics:                    # Gesprächsthemen
        - question: "Wie..."     # Frage
          answer: "Das ist..."   # Antwort
```

### Erweiterte Features (`extensions`)

```yaml
extensions:
  weather: "sunny"              # Wetter-Effekte
  season: "spring"              # Jahreszeit
  scripts_enabled: true         # Erlaube benutzerdefinierte Skripte
  ambient_particles: "fireflies" # Partikel-Effekte
  special_lighting: "warm"      # Spezial-Beleuchtung
  multiplayer_spawn: [0, 0, 0]  # Spawn für Multiplayer
```

## API-Referenz

### Konsolen-Befehle

Das System stellt globale Funktionen zur Verfügung:

```javascript
// YAML-Zone laden
yamlHelpers.loadZone('worlds/zone-start.yaml')

// Alle Beispielwelten laden
yamlHelpers.loadExamples()

// Geladene Welten auflisten
yamlHelpers.listWorlds()

// Weltdaten abrufen
yamlHelpers.getWorldDoc('zone-start')

// Zu Zone wechseln
yamlHelpers.switchToZone('zone-forest')
```

### Programmier-API

```javascript
// WisdomWorld-Instanz erweitern
const app = new WisdomWorld();

// YAML-Zone laden
await app.loadZoneFromYaml('worlds/my-world.yaml');

// Zu YAML-Zone wechseln
app.switchToYamlZone('my-zone-id');

// Alle Beispielwelten laden
await app.zoneManager.loadExampleWorlds();

// WorldDoc-Cache zugreifen
const worldDoc = app.zoneManager.loadedWorldDocs.get('zone-id');
```

## Interaktivität & Skripte

### Interaktive Objekte

Objekte können mit `interactive: true` markiert werden. Spieler können dann mit E oder Linksklick interagieren.

```yaml
objects:
  - type: "crystal"
    position: [0, 0, -8]
    interactive: true
    script: |
      // Wird bei Interaktion ausgeführt
      console.log("Kristall aktiviert!");
      this.material.emissive.setHex(0x00ff00);
```

### Animation-Skripte

Skripte können auch für kontinuierliche Animationen verwendet werden:

```yaml
objects:
  - type: "globe"
    script: |
      // Wird jeden Frame ausgeführt
      this.rotation.y += 0.01;
```

### Verfügbare Kontext-Variablen

In Skripten stehen zur Verfügung:
- `this` - Das THREE.js Mesh-Objekt
- `Date.now()` - Aktuelle Zeit
- `Math.*` - Alle Math-Funktionen
- `console.*` - Console-Ausgabe

## Erweiterbarkeit

### Neue Objekt-Typen hinzufügen

In `js/core/world-loader.js`, Methode `createObjectMesh()`:

```javascript
case 'my_new_type':
  geometry = new THREE.MyGeometry(1, 2, 3);
  break;
```

### Neue Umgebungseffekte

In `js/core/world-loader.js`, Methode `applyEnvironment()`:

```javascript
if (envData.my_effect) {
  // Implementiere Effekt
}
```

### Custom Shader/Materialien

Objekte können in Skripten erweiterte Materialien erhalten:

```yaml
objects:
  - type: "crystal"
    script: |
      this.material = new THREE.ShaderMaterial({
        // Custom Shader
      });
```

## Datei-Organisation

```
worlds/
├── zone-start.yaml      # Startzone
├── zone-forest.yaml     # Wald
├── zone-archive.yaml    # Bibliothek
└── custom/              # Eigene Welten
    ├── my-world.yaml
    └── ...
```

## Best Practices

### Performance

- Begrenzen Sie Objekt-Anzahl pro Zone (< 100 für gute Performance)
- Verwenden Sie angemessene Terrain-Größen (50x50 für normale Zonen)
- Komplexe Skripte sollten Zeitprüfungen haben

### Design

- Verwenden Sie konsistente Farbpaletten pro Zone
- Gruppieren Sie ähnliche Objekte
- Portale sollten klar sichtbar und erreichbar sein
- NPCs brauchen genug Platz um sie herum

### Wartbarkeit

- Verwenden Sie aussagekräftige IDs und Namen
- Kommentieren Sie komplexe YAML-Abschnitte
- Versionieren Sie YAML-Dateien bei größeren Änderungen
- Testen Sie Portale zwischen Zonen

## Fehlerbehebung

### Häufige Probleme

**Zone lädt nicht:**
- Prüfen Sie YAML-Syntax mit einem YAML-Validator
- Kontrollieren Sie Dateipfade (relativ zum HTML)
- Öffnen Sie Browser-Konsole für Fehlermeldungen

**Objekte nicht sichtbar:**
- Prüfen Sie Position-Werte (y=0 für Bodenhöhe)
- Kontrollieren Sie Farben (zu dunkel?)
- Überprüfen Sie Skalierung (zu klein?)

**Interaktion funktioniert nicht:**
- `interactive: true` gesetzt?
- Player in Reichweite (< 3 Einheiten)?
- Skript-Fehler in Browser-Konsole?

**Performance-Probleme:**
- Reduzieren Sie Objekt-Anzahl
- Vereinfachen Sie komplexe Skripte
- Kleinere Terrain-Größen verwenden

### Debug-Befehle

```javascript
// Zone-Info anzeigen
console.log(app.zoneManager.zoneMeshes[app.zoneManager.currentZoneId]);

// Alle geladenen Welten
console.log(app.zoneManager.loadedWorldDocs);

// Aktuelles WorldDoc
console.log(app.zoneManager.getCurrentWorldDoc());
```
