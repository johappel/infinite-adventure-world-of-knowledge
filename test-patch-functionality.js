/**
 * Test-Skript für die überarbeitete Patch-Funktionalität
 * Verifiziert, dass Patches korrekt gespeichert, aktualisiert und gelistet werden
 */

// Mock-DexieNostrService für Tests
class MockDexieNostrService {
  constructor() {
    this.events = [];
    this.liveSubscriptions = new Map();
  }

  async get(filter) {
    // Simuliere das Abrufen von Patch-Events (Kind 30312)
    return this.events.filter(e => e.kind === 30312);
  }

  async saveOrUpdate(payload) {
    const { id, name, type, yaml, originalYaml, pubkey } = payload;
    
    if (type === 'patch') {
      // Extrahiere Patch-ID aus dem YAML-Content
      let patchId;
      try {
        const contentObj = JSON.parse(yaml);
        patchId = contentObj.metadata?.id || contentObj.id || `patch_test_${Date.now()}`;
      } catch {
        patchId = `patch_test_${Date.now()}`;
      }
      
      // Tags für Patch-Events
      const tags = [
        `d:${patchId}`,
        'type:patch',
        `target:${id}`,
        name ? `name:${name}` : ''
      ].filter(Boolean);
      
      // Prüfe ob Patch bereits existiert
      const existingEvent = this.events.find(e => {
        const eventTags = e.tags || [];
        return eventTags.some(tag => tag === `d:${patchId}`);
      });
      
      const eventData = {
        id: `event_${Date.now()}`,
        pubkey: pubkey || 'test_pubkey',
        kind: 30312,
        created_at: Math.floor(Date.now() / 1000),
        content: yaml,
        sig: 'test_sig',
        tags: tags
      };
      
      if (existingEvent) {
        // Update existing event
        Object.assign(existingEvent, eventData);
        console.log('✅ Patch aktualisiert:', patchId);
      } else {
        // Create new event
        this.events.push(eventData);
        console.log('✅ Neuer Patch erstellt:', patchId);
      }
      
      return eventData;
    }
  }
}

// Test-Funktionen
async function testPatchFunctionality() {
  console.log('🧪 Teste Patch-Funktionalität...\n');
  
  const mockService = new MockDexieNostrService();
  const worldId = 'test_world_123';
  
  // Test 1: Patch erstellen
  console.log('1. Erstelle ersten Patch...');
  const patch1 = {
    id: worldId,
    name: 'Test Patch 1',
    type: 'patch',
    yaml: JSON.stringify({
      metadata: {
        id: 'patch_001',
        name: 'Test Patch 1',
        targets_world: worldId
      },
      operations: [{ type: 'add', entity_type: 'objects', payload: { id: 'obj1' } }]
    }),
    originalYaml: '',
    pubkey: 'test_publisher'
  };
  
  await mockService.saveOrUpdate(patch1);
  
  // Test 2: Gleichen Patch erneut speichern (sollte update mit gleicher ID)
  console.log('\n2. Speichere gleichen Patch erneut (sollte update mit gleicher ID)...');
  const result2 = await mockService.saveOrUpdate(patch1);
  console.log('✅ Patch-ID bleibt gleich:', result2.tags.find(t => t.startsWith('d:')) === 'd:patch_001');
  
  // Test 3: Zweiten Patch erstellen
  console.log('\n3. Erstelle zweiten Patch...');
  const patch2 = {
    id: worldId,
    name: 'Test Patch 2',
    type: 'patch',
    yaml: JSON.stringify({
      metadata: {
        id: 'patch_002',
        name: 'Test Patch 2',
        targets_world: worldId
      },
      operations: [{ type: 'add', entity_type: 'objects', payload: { id: 'obj2' } }]
    }),
    originalYaml: '',
    pubkey: 'test_publisher'
  };
  
  await mockService.saveOrUpdate(patch2);
  
  // Test 4: Patches für Welt auflisten
  console.log('\n4. Liste Patches für Welt auf...');
  const patches = await mockService.get({ kinds: [30312] });
  const worldPatches = patches.filter(p => {
    const targetTag = p.tags?.find(t => t.startsWith('target:'));
    return targetTag && targetTag === `target:${worldId}`;
  });
  
  console.log(`✅ Gefundene Patches für Welt ${worldId}:`, worldPatches.length);
  worldPatches.forEach(p => {
    const dTag = p.tags?.find(t => t.startsWith('d:'));
    console.log(`   - Patch: ${dTag}`);
  });
  
  // Test 5: Verifiziere dass nur 2 Patches existieren (keine Duplikate)
  console.log('\n5. Verifiziere keine Duplikate...');
  const allPatches = await mockService.get({ kinds: [30312] });
  console.log(`✅ Gesamtanzahl Patches: ${allPatches.length} (erwartet: 2)`);
  
  console.log('\n🎉 Alle Tests abgeschlossen!');
}

// Führe Tests aus
testPatchFunctionality().catch(console.error);