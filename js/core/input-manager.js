export class InputManager {
  constructor() {
    this.keys = new Set();
    this.isRightMouseDown = false;
    this.onInteract = null;
    this.onMouseInteract = null;
    this.onMouseMove = null;
  }

  // Prüfen ob gerade im Chat-Input getippt wird
  isTypingInChat() {
    const activeElement = document.activeElement;
    return activeElement && (activeElement.id === 'userInput' || activeElement.tagName === 'INPUT');
  }

  init(canvas) {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      if (!this.isTypingInChat()) {
        const key = e.key.toLowerCase();
        this.keys.add(key);
        if(key === 'e'){ 
          e.preventDefault();
          if(this.onInteract) this.onInteract();
        }
        // WASD Tasten verhindern Standard-Verhalten nur außerhalb Chat
        if(['w','a','s','d'].includes(key)) {
          e.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isTypingInChat()) {
        this.keys.delete(e.key.toLowerCase());
      }
    });

    // Mouse events
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Rechte Maustaste
        this.isRightMouseDown = true;
        canvas.requestPointerLock();
      } else if (e.button === 0) { // Linke Maustaste
        if(this.onMouseInteract) this.onMouseInteract(e);
      }
    });
    
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 2) { // Rechte Maustaste loslassen
        this.isRightMouseDown = false;
        document.exitPointerLock();
      }
    });
    
    canvas.addEventListener('mouseleave', () => {
      this.isRightMouseDown = false;
      document.exitPointerLock();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isRightMouseDown && document.pointerLockElement === canvas) {
        if(this.onMouseMove) {
          this.onMouseMove(e.movementX, e.movementY);
        }
      }
    });
  }

  setInteractCallback(callback) {
    this.onInteract = callback;
  }

  setMouseInteractCallback(callback) {
    this.onMouseInteract = callback;
  }

  setMouseMoveCallback(callback) {
    this.onMouseMove = callback;
  }
}
