# es-module-shims & Import Maps

Ziel: Verstehen, warum [es-module-shims.importMap](./module-shims.md) nützlich ist, wie Import Maps funktionieren und wie du Module (z. B. three.js) sauber referenzierst – lokal und via CDN.

## Motivation
- Import Maps erlauben dir, Modulnamen auf URLs zu mappen.
- Browser ohne native Import-Map-Unterstützung nutzen es-module-shims als Polyfill.

## Beispiel
- In deiner HTML (z. B. [client_ux_boilerplate.html](../../client_ux_boilerplate.html)):

...

## Tipps
- Siehe [three.js Grundlagen](./scene-basics.md), um die imports direkt zu nutzen.
- Gehe zu [setup-local.md](../guides/setup-local.md), um das Projekt mit Import Map lokal zu starten.