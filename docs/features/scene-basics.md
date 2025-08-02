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
- Szene: [three.Scene()](docs/features/scene-basics.md:1) ist der logische Container für alle 3D-Objekte (Meshes, Lights, Gruppen).
- Kamera: Perspektivische Kamera via [three.PerspectiveCamera()](docs/features/scene-basics.md:1) definiert, was und wie gesehen wird.
- Renderer: [three.WebGLRenderer()](docs/features/scene-basics.md:1) zeichnet die Szene mit der Kamera in ein Canvas.
- Geometrie/Material: [three.BoxGeometry()](docs/features/scene-basics.md:1) + [three.MeshStandardMaterial()](docs/features/scene-basics.md:1) ergeben zusammen ein sichtbares Objekt.
- Licht: Ohne Licht wirken physikalisch basierte Materialien dunkel; nutze z. B. [three.DirectionalLight()](docs/features/scene-basics.md:1).

Minimalaufbau einer Szene
1) Canvas aus HTML selektieren (oder Renderer erzeugt eigenes).
2) Szene, Kamera, Renderer initialisieren.
3) Ein erstes Objekt hinzufügen.
4) Render-Loop starten.

Beispiel (pseudocode-orientiert):
- HTML: ein Canvas-Element (oder Container-DIV).
- JS-Setup:
  - scene = new [three.Scene()](docs/features/scene-basics.md:1)
  - camera = new [three.PerspectiveCamera()](docs/features/scene-basics.md:1)(fov, aspect, near, far)
  - renderer = new [three.WebGLRenderer()](docs/features/scene-basics.md:1)({ antialias: true })
  - renderer.setSize(width, height)
  - container.appendChild(renderer.domElement)
  - cube = new [three.Mesh()](docs/features/scene-basics.md:1)(new [three.BoxGeometry()](docs/features/scene-basics.md:1)(1,1,1), new [three.MeshStandardMaterial()](docs/features/scene-basics.md:1)())
  - scene.add(cube)
  - light = new [three.DirectionalLight()](docs/features/scene-basics.md:1)(0xffffff, 1)
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
- Dieser Flow wird im UI-Kontext in [State & Events](docs/features/state-and-events.md) weiter beschrieben.

Performance-Hinweise
- Vermeide unnötige Material-/Geometrie-Instanzen (reuse).
- Nutze frustumCulled für Objekte außerhalb des Sichtkegels.
- Verwende Texturen/Geometrien in moderater Auflösung.
- Reduziere overdraw (weniger transparente Flächen).

Nächste Schritte
- Ein erstes Objekt hinzufügen: [add-3d-object.md](docs/guides/add-3d-object.md)
- Event-/State-Fluss verstehen: [state-and-events.md](docs/features/state-and-events.md)
- Architekturdiagramme: [architecture.md](docs/reference/architecture.md)