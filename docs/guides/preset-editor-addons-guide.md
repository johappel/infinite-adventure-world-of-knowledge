# PresetEditor Addons – Anleitung

## Übersicht

Der PresetEditor bietet drei leistungsstarke Addons, die die Interaktion mit Ihren Welten revolutionieren. Diese Addons ermöglichen es Ihnen, direkt in der 3D-Vorschau zu arbeiten, anstatt manuell YAML zu schreiben.

## Verfügbare Addons

### 1. TerrainClickAddon – Direkte Objekt-Platzierung

**Perfekt für**: Schnelle Landschaftsgestaltung und Pfad-Erstellung

#### Funktionen
- **Objekt-Platzierung**: Klicken Sie auf das Terrain, um Objekte zu platzieren
- **Pfad-Erstellung**: Sammeln Sie Punkte für automatische Pfad-Generierung
- **Objekttypen**: Bäume, Felsen, Büsche, Blumen, Pilze, Kristalle

#### Verwendung
1. Aktivieren Sie das Addon im Dropdown-Menü
2. Wählen Sie den Modus "Objekt platzieren" oder "Pfad hinzufügen"
3. Bei "Objekt platzieren": Wählen Sie den gewünschten Objekttyp
4. Klicken Sie auf das Terrain, um Objekte/Pfad-Punkte zu platzieren
5. Bei Pfaden: Verwenden Sie "Pfad abschließen" um den Pfad zu generieren

#### Beispiel
```yaml
# Automatisch generiertes YAML
objects:
  - preset: tree_simple
    position: [5.2, 0.0, 3.7]
  - preset: rock_small
    position: [-2.1, 0.0, 4.5]

terrain:
  paths:
    - points: [[0,0,0], [5,0,5], [10,0,10]]
      smooth: true
```

### 2. EntityInteractionAddon – Entity-Bearbeitung

**Perfekt für**: Feinabstimmung vorhandener Entities

#### Funktionen
- **Mouseover-Erkennung**: Bewegen Sie die Maus über Entities für Hervorhebung
- **Klick-Bearbeitung**: Klicken Sie auf Entities, um einen Bearbeitungs-Dialog zu öffnen
- **Echtzeit-Vorschau**: Änderungen werden sofort in der 3D-Vorschau angezeigt
- **Dialog-Formular**: Benutzerfreundliche Eingabefelder für alle Entity-Eigenschaften

#### Verwendung
1. Aktivieren Sie das Addon im Dropdown-Menü
2. Bewegen Sie die Maus über Entities (sie werden hervorgehoben)
3. Klicken Sie auf eine Entity, um den Bearbeitungs-Dialog zu öffnen
4. Ändern Sie Eigenschaften wie Position, Skalierung, Farbe, etc.
5. Schließen Sie den Dialog, um die Änderungen zu übernehmen

#### Unterstützte Eigenschaften
- **Position**: X, Y, Z Koordinaten
- **Skalierung**: Individuelle Skalierung pro Achse
- **Farbe**: Farbauswahl mit ColorPicker
- **Rotation**: Drehung um alle Achsen
- **Entity-spezifische Eigenschaften**: Abhängig vom Entity-Typ

### 3. MaterialEditorAddon – Material-Bearbeitung

**Perfekt für**: Erweiterte visuelle Gestaltung

#### Funktionen
- **Material-Hinzufügung**: Fügen Sie Materialien zu Entities hinzu
- **PBR-Eigenschaften**: Kontrolle über Metalness, Roughness, Emissive
- **ColorPicker**: Intuitive Farbauswahl
- **Material-Vorlagen**: Vorgefertigte Materialien (Metallic, Plastic, Wood, etc.)
- **Live-Vorschau**: Sofortige Visualisierung von Änderungen

#### Verwendung
1. Aktivieren Sie das Addon im Dropdown-Menü
2. Bewegen Sie die Maus über Entities (sie werden hervorgehoben)
3. Klicken Sie auf eine Entity, um das Material-Bearbeitungs-Panel zu öffnen
4. Wählen Sie eine Material-Vorlage oder passen Sie Eigenschaften an
5. Verwenden Sie die ColorPicker und Slider für Feinabstimmung

#### Verfügbare Material-Vorlagen
- **Standard**: Basis-Material mit einstellbarer Farbe
- **Metallic**: Metallisches Material mit hoher Reflektion
- **Plastic**: Kunststoff-ähnliches Material
- **Wood**: Holz-Textur mit entsprechender Rauheit
- **Grass**: Gras-ähnliches Material
- **Stone**: Stein-Textur mit hoher Rauheit
- **Roof**: Dach-Material
- **Glass**: Transparentes Glas-Material
- **Emissive**: Selbstleuchtendes Material
- **Light**: Stark leuchtendes Material

#### PBR-Eigenschaften
- **Color**: Grundfarbe des Materials
- **Metalness**: Metallischer Glanz (0 = nicht metallisch, 1 = vollständig metallisch)
- **Roughness**: Rauheit der Oberfläche (0 = glatt, 1 = rau)
- **Emissive**: Selbstleuchtende Farbe
- **EmissiveIntensity**: Stärke der Selbstleuchtung

## Best Practices

### Workflow-Empfehlungen

1. **Terrain zuerst**: Verwenden Sie TerrainClickAddon für grundlegende Landschaft
2. **Dann Entities**: Platzieren Sie wichtige Entities mit TerrainClickAddon
3. **Feinabstimmung**: Verwenden Sie EntityInteractionAddon für präzise Positionierung
4. **Visuelle Gestaltung**: Wenden Sie MaterialEditorAddon für das finale Aussehen an

### Performance-Tipps

- Deaktivieren Sie Addons, wenn Sie sie nicht benötigen
- Verwenden Sie "Reaktiviere Entity Auswahl" Buttons bei Bedarf
- Schließen Sie Dialoge, um Event-Konflikte zu vermeiden

### Kombination mit YAML-Bearbeitung

Die Addons generieren standardkonformes YAML, das Sie weiter bearbeiten können:

```yaml
# Von TerrainClickAddon generiert
objects:
  - preset: tree_simple
    position: [5.2, 0.0, 3.7]

# Erweitert mit MaterialEditorAddon
objects:
  - preset: tree_simple
    position: [5.2, 0.0, 3.7]
    material:
      color: "#8B4513"
      metalness: 0.1
      roughness: 0.8
```

## Fehlerbehebung

### Addon reagiert nicht
- Überprüfen Sie, ob das Addon aktiviert ist
- Verwenden Sie den "Reaktiviere Entity Auswahl" Button
- Schließen Sie alle offenen Dialoge

### Entities werden nicht erkannt
- Stellen Sie sicher, dass die 3D-Vorschau vollständig geladen ist
- Überprüfen Sie, dass die Entities korrektes YAML haben
- Verwenden Sie den Browser-Entwicklertools für Debug-Informationen

### Material-Änderungen werden nicht angezeigt
- Überprüfen Sie, dass die Entity ausgewählt wurde
- Stellen Sie sicher, dass das Material korrekt angewendet wurde
- Aktualisieren Sie die 3D-Vorschau manuell

## Erweiterte Features

### Zustands-Persistenz
Addon-Zustände werden automatisch gespeichert und wiederhergestellt, wenn Sie zwischen Sessions wechseln.

### Event-Delegation
Alle Addons verwenden das gleiche Event-System, sodass nur ein Addon gleichzeitig aktiv sein kann.

### UI-Integration
Addons integrieren sich nahtlos in die bestehende UI und verwenden konsistente Styling-Richtlinien.
