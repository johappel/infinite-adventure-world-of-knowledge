# Tiefnebel (Height Fog) Konfiguration

## Aktivierung
Tiefnebel ist standardmäßig deaktiviert. Er kann in der YAML-Konfiguration eines Welt-Presets aktiviert werden:

```yaml
environment:
  height_fog:
    enabled: true           # Aktiviert den Tiefnebel
    y_start: 0              # Nebel beginnt ab y=0
    y_end: 10               # Nebel endet bei y=10 (darüber klar)
    density: 0.08           # Nebeldichte (Standard: 0.08)
    color: 0xcccccc         # Nebelfarbe (optional, Standard: Himmelsfarbe)
```

## Wirkung
- Der Nebel ist dicht bei y=y_start und wird nach oben (y=y_end) immer klarer.
- Die Werte können beliebig angepasst werden.
- Die Shader-Injektion sorgt für realistische Tiefnebel-Effekte in allen MeshStandardMaterial-Objekten.

## Standardwerte
Wenn kein Wert gesetzt ist, gelten:
- `enabled: false` (aus)
- `y_start: 0`
- `y_end: 10`
- `density: 0.08`
- `color: null` (Himmelsfarbe)

## Beispiel
```yaml
environment:
  height_fog:
    enabled: true
    y_start: 2
    y_end: 15
    density: 0.12
    color: 0xaaaaaa
```

## Hinweise
- Der Tiefnebel funktioniert nur mit MeshStandardMaterial.
- Standard-Fog (fog_distance) kann parallel verwendet werden.
- Änderungen werden beim Laden der Welt angewendet.
