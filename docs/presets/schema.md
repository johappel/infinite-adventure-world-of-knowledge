# YAML Schema – Kurzreferenz

Terrain
- type: flat|hills|mountains
- size: [w,d]
- color: hex
- amplitude: number (nur hills/mountains)
- y: number (Höhenoffset)
- preset: string (optional)

Object
- type: tree|rock|mushroom|stone_circle|...
- position: [x,y,z]
- scale: [x,y,z]
- color: hex
- interactive: bool
- preset: string (optional)

Persona
- name: string
- position: [x,y,z]
- appearance:
  - color: hex
  - height: number (1.1–2.2 empfohlen)
  - type: string
- behavior: {}
- preset: string (optional)

Hinweise
- Defaults & Sanitizer füllen fehlende Felder auf und normalisieren Vektoren.
- Presets können Felder vorbelegen; explizite YAML-Werte überschreiben immer.
