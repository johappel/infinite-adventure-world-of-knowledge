# Dateien-Aufräumliste - August 2025

## 🗑️ Kandidaten für Löschung

### Test-Dateien (bereits bereinigt laut docs)
- Laut `docs/reference/project-cleanup.md` wurden bereits veraltete Test-Dateien entfernt
- Aktuelle Test-Tools sind:
  - `preset-editor.html` ✅ (aktiv benötigt)
  - `preset-tester.html` ✅ (aktiv benötigt)

### Potentiell obsolete Dateien
- `YAML-PLAYER-*.md` Dateien im Root:
  - `YAML-PLAYER-FIXES-COMPLETE.md` - Entwicklungsnotizen
  - `YAML-PLAYER-IMPLEMENTATION-COMPLETE.md` - Entwicklungsnotizen  
  - `YAML-PLAYER-MOVEMENT-FIX.md` - Entwicklungsnotizen
  - ➡️ **Empfehlung**: In `/docs/development/` verschieben oder löschen

### Backup-/Entwicklungsdateien
- `test/` Verzeichnis prüfen:
  - Inhalt unbekannt, könnte veraltete Tests enthalten

### Veraltete Dokumentation
- `THE_IDEA.md` - Ursprüngliche Projektidee
  - ➡️ **Empfehlung**: In `/docs/development/project-history.md` umbenennen

## ✅ Behalten (wichtige Dateien)

### Core Application
- `index.html` ✅ - Haupt-App
- `js/` ✅ - Komplettes JS-System
- `styles/` ✅ - CSS
- `worlds/` ✅ - YAML-Welten

### Documentation
- `docs/` ✅ - Vollständige Dokumentation
- `README.md` ✅ - Projekt-Übersicht

### Development Tools  
- `preset-editor.html` ✅ - Aktiv für Preset-Entwicklung
- `preset-tester.html` ✅ - Aktiv für Preset-Testing

## 🔄 Zu verschiebende Dateien

### Development Documentation
```
YAML-PLAYER-*.md → docs/development/
THE_IDEA.md → docs/development/project-history.md
```

### Archivierte Assets
```
image.png → docs/assets/ (falls noch relevant)
```

## 🧹 Cleanup-Aktionen

### 1. Entwicklungsnotizen archivieren
- Alle `YAML-PLAYER-*.md` nach `/docs/development/` verschieben
- `THE_IDEA.md` nach `/docs/development/project-history.md` umbenennen

### 2. Test-Verzeichnis überprüfen
- Inhalt von `/test/` analysieren
- Veraltete Tests entfernen, wichtige behalten

### 3. Asset-Optimierung
- `image.png` prüfen - ist es noch relevant?
- Große Assets komprimieren falls nötig

### 4. Code-Cleanup
- Console.log Statements in production code entfernen
- Auskommentierte Code-Blöcke entfernen
- TODO-Kommentare aktualisieren

## 📊 Projekt-Struktur nach Cleanup

```
/
├── index.html              # Haupt-App
├── preset-editor.html      # Preset-Entwicklung  
├── preset-tester.html      # Preset-Testing
├── README.md               # Projekt-Übersicht
├── js/                     # Core JavaScript
├── styles/                 # CSS
├── worlds/                 # YAML-Welten
└── docs/                   # Dokumentation
    ├── features/           # Feature-Guides
    ├── guides/            # Benutzer-Anleitungen
    ├── presets/           # Preset-Dokumentation
    ├── reference/         # API-Referenz
    └── development/       # Entwicklungsnotizen
        ├── project-history.md
        └── yaml-player-notes/
```

## ⚠️ Vorsicht bei Löschung

Vor dem Löschen von Dateien:
1. Git-Commit mit aktuellem Stand
2. Backup erstellen
3. Funktionstest der Hauptanwendung
4. Preset-Editor und -Tester testen
