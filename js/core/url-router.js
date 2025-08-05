// URL-based Zone Navigation
// Ermöglicht direkte Links zu Welten via URL-Hash

export class URLRouter {
  constructor(worldManager) {
    this.worldManager = worldManager;
    this.init();
  }

  init() {
    // URL bei App-Start auswerten - aber nur wenn Hash vorhanden
    window.addEventListener('load', () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        this.handleInitialURL();
      }
      // Wenn kein Hash, Standard-Initialisierung laufen lassen
    });
    
    // Hash-Änderungen überwachen
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  handleInitialURL() {
    const hash = window.location.hash.slice(1); // Entferne #
    if (hash) {
      this.loadZoneFromHash(hash);
    }
    // Kein else-Fall mehr - Standard-Initialisierung läuft separat
  }

  handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash) {
      this.loadZoneFromHash(hash);
    }
  }

  loadZoneFromHash(hash) {
    try {
      // Hash kann sein: zone-id oder base64-encoded YAML
      if (hash.startsWith('zone-')) {
        // Vordefinierte Zone
        this.worldManager.loadPredefinedZone(hash);
      } else if (hash.startsWith('yaml-')) {
        // Base64-encoded YAML
        const yamlData = atob(hash.slice(5));
        this.worldManager.loadYAMLFromString(yamlData);
      } else {
        // Fallback zu Standard-Zone
        console.warn('Unbekannter Hash-Format:', hash);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zone:', error);
    }
  }

  // Hilfsfunktionen für andere Komponenten
  setZoneHash(zoneId) {
    window.location.hash = zoneId;
  }

  setYAMLHash(yamlString) {
    const encoded = btoa(yamlString);
    window.location.hash = 'yaml-' + encoded;
  }

  getCurrentHash() {
    return window.location.hash.slice(1);
  }
}
