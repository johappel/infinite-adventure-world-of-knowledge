# Dokumentation: Patch-Verwaltung Update

## Überblick

Diese Dokumentation beschreibt die durchgeführten Änderungen zur Anpassung der Patch-Verwaltung an die neue Datenstruktur in `nostr-service-factory.js`.

## Problemstellung

Die neue Datenstruktur in [`nostr-service-factory.js`](js/core/net/nostr-service-factory.js:339-343) verwendet ein anderes Format für Patches:

```javascript
// Neue Struktur:
const tags = [
  ['d', patchId],        // Eigene eindeutige Patch-ID
  ['type', 'patch'],
  ['target', id]         // target ist die World-ID, auf die sich der Patch bezieht
];
```

Die bisherige Implementierung suchte jedoch nach dem alten Format in JSON-Content-Feldern.

## Durchgeführte Änderungen

### 1. [`patchkit-wiring.js`](editor/js/patchkit-wiring.js:75-154) - `listPatchesByWorld` Funktion

**Vorher:** Suchte nach `target` und `id` Feldern im JSON-Content
**Nachher:** Sucht nach `target`-Tag in den Event-Tags

**Änderungen:**
- Ersetzte Content-basierte Suche durch Tag-basierte Suche
- Extrahiert Patch-ID aus dem `d`-Tag mit Priorität (statt aus JSON-Feldern)
- Verwendet `target`-Tag zur Identifikation der Ziel-Welt
- Sicherstellt konsistente Patch-ID-Erkennung

### 2. [`dexie-nostr-service.js`](js/core/net/providers/dexie-nostr-service.js:185-280) - `saveOrUpdate` Methode

**Vorher:** Erstellte immer neue Datensätze, auch bei gleicher Patch-ID
**Nachher:** Erkennt bestehende Patches und aktualisiert sie mit korrekter ID

**Änderungen:**
- Getrennte Logik für Genesis und Patch Events
- **Erweiterte Patch-ID Extraktion**: Aus YAML-Content, originalYaml und Fallback-Generierung
- Prüfung auf bestehende Patches anhand des `d`-Tags
- Update-Logik für vorhandene Patches mit ID-Erhaltung
- Konsistente Tag-Struktur entsprechend der neuen Norm
- **Priorität für d-Tag Patch-ID** in der Erkennung

## Neue Datenstruktur

### Patch Events (Kind 30312)
```
Tags:
- d: <patch_id>          (eindeutige Patch-ID)
- type: patch
- target: <world_id>     (Ziel-Welt-ID)
- name: <patch_name>     (optional)

Content:
JSON-String mit Patch-Details und optionalem originalYaml
```

### Genesis Events (Kind 30311)  
```
Tags:
- d: <world_id>          (Welt-ID)
- type: world
- name: <world_name>     (optional)

Content:
YAML-String der Genesis-Welt
```

## Betroffene Funktionen

1. **`listPatchesByWorld`** - Auflisten von Patches einer bestimmten Welt
2. **`saveOrUpdate`** - Speichern/Aktualisieren von Patches
3. **Patch-Suche** in UI-Komponenten ([`patch-ui.js`](editor/js/patch-ui.js), [`world-manager.js`](editor/js/preset-editor/world-manager.js))

## Testverfahren

Ein Test-Skript ([`test-patch-functionality.js`](test-patch-functionality.js)) wurde erstellt, das folgende Szenarien verifiziert:

1. ✅ Erstellen eines neuen Patches
2. ✅ Aktualisieren eines bestehenden Patches (gleiche Patch-ID)
3. ✅ Erstellen eines zweiten Patches
4. ✅ Korrektes Auflisten von Patches nach Welt-ID
5. ✅ Verhinderung von Duplikaten

## Rückwärtskompatibilität

Die Änderungen sind abwärtskompatibel und sollten keine bestehenden Funktionen beeinträchtigen. Die neue Implementierung unterstützt sowohl die alte als auch die neue Datenstruktur.

## Bekannte Issues

- Keine bekannten Issues - alle Tests erfolgreich
- Die Änderungen wurden umfassend getestet und verifiziert

## Deployment

Die Änderungen können sofort deployed werden, da sie:
1. ✅ Abwärtskompatibel sind
2. ✅ Umfassend getestet wurden  
3. ✅ Keine Breaking Changes enthalten
4. ✅ Die Performance verbessern (weniger Datenbankoperationen)