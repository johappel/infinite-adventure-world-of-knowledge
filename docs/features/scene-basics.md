# three.js Grundlagen – Scene, Camera, Renderer

Ziel: Ein schnelles, verständliches Fundament für three.js legen, damit du die 3D-Szene sicher lesen, debuggen und erweitern kannst. Nach dieser Seite solltest du in der Lage sein, ein Objekt hinzuzufügen, die Kamera zu bewegen und den Render-Loop zu verstehen.

Inhaltsverzeichnis
- Kernkonzepte
- Minimalaufbau einer Szene
- Render-Loop und Resize
- Objekte, Materialien, Licht
- Interaktion (Raycasting)
- Performance-Hinweise
- Nächste Schritte

Kernkonzepte
- Szene: [three.Scene](./scene-basics.md) ist der logische Container für alle 3D-Objekte (Meshes, Lights, Gruppen).
- Kamera: Perspektivische Kamera via [three.PerspectiveCamera](./scene-basics.md) definiert, was und wie gesehen wird.
- Renderer: [three.WebGLRenderer](./scene-basics.md) zeichnet die Szene mit der Kamera in ein Canvas.
- Geometrie/Material: [three.BoxGeometry](./scene-basics.md) + [three.MeshStandardMaterial](./scene-basics.md) ergeben zusammen ein sichtbares Objekt.
- Licht: Ohne Licht wirken physikalisch basierte Materialien dunkel; nutze z. B. [three.DirectionalLight](./scene-basics.md).

Minimalaufbau einer Szene
1) Canvas aus HTML selektieren (oder Renderer erzeugt eigenes).
2) Szene, Kamera, Renderer initialisieren.
3) Ein erstes Objekt hinzufügen.
4) Render-Loop starten.

Beispiel (pseudocode-orientiert):
- HTML: ein Canvas-Element (oder Container-DIV).
- JS-Setup:
  - scene = new [three.Scene](./scene-basics.md)
  - camera = new [three.PerspectiveCamera](./scene-basics.md)(fov, aspect, near, far)
  - renderer = new [three.WebGLRenderer](./scene-basics.md)({ antialias: true })
  - cube = new [three.Mesh](./scene-basics.md)(new [three.BoxGeometry](./scene-basics.md)(1,1,1), new [three.MeshStandardMaterial](./scene-basics.md)())
  - light = new [three.DirectionalLight](./scene-basics.md)(0xffffff, 1)
  - light.position.set(3,3,3)
  - scene.add(light)

Render-Loop und Resize
- Animationsschleife:
  - requestAnimationFrame(tick)
  - Updates (z. B. cube.rotation.y += 0.01)
  - renderer.render(scene, camera)
- Resize-Handling:
  - camera.aspect = width/height; camera.updateProjectionMatrix()
  - renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio)

Objekte, Materialien, Licht
- Geometrien: Box, Sphere, Plane, Torus, BufferGeometry für Custom-Formen.
- Materialien: Standard/Physical (PBR), Lambert/Phong (einfacher), Basic (ohne Licht).
- Lichter: AmbientLight (Grundhelligkeit), Directional/Point/Spot (gerichtet/Position), Hemisphere (Umgebungslicht).

Interaktion (Raycasting)
- Raycaster prüft, welches Objekt unter dem Mauszeiger liegt.
- Ablauf:
  - Mausposition in Normalized Device Coordinates (NDC) umrechnen.
  - raycaster.setFromCamera(mouse, camera)
  - intersects = raycaster.intersectObjects(scene.children, true)
  - Treffer auswerten und State/Selektion aktualisieren.
- Dieser Flow wird im UI-Kontext in [State & Events](./state-and-events.md) weiter beschrieben.

Performance-Hinweise
- Vermeide unnötige Material-/Geometrie-Instanzen (reuse).
- Nutze frustumCulled für Objekte außerhalb des Sichtkegels.
- Verwende Texturen/Geometrien in moderater Auflösung.
- Reduziere overdraw (weniger transparente Flächen).

Nächste Schritte
- Ein erstes Objekt hinzufügen: [add-3d-object.md](../guides/add-3d-object.md)
- Event-/State-Fluss verstehen: [state-and-events.md](./state-and-events.md)
- Architekturdiagramme: [architecture.md](../reference/architecture.md)