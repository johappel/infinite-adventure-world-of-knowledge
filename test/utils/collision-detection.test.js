const assert = require('assert');
const { checkCollision } = require('../../js/utils/collision-detection');

describe('Kollisionsprüfung', () => {
    it('sollte keine Kollision zwischen Collections und NPCs erlauben', () => {
        const collections = [{ x: 1, y: 1, radius: 1 }];
        const npcs = [{ x: 3, y: 3, radius: 1 }];
        const result = checkCollision(collections, npcs);
        assert.strictEqual(result, false);
    });

    it('sollte Kollision zwischen Collections und Collections erkennen', () => {
        const collections1 = [{ x: 1, y: 1, radius: 1 }];
        const collections2 = [{ x: 1.5, y: 1.5, radius: 1 }];
        const result = checkCollision(collections1, collections2);
        assert.strictEqual(result, true);
    });

    it('sollte Kollision zwischen NPCs erkennen', () => {
        const npcs1 = [{ x: 1, y: 1, radius: 1 }];
        const npcs2 = [{ x: 1.5, y: 1.5, radius: 1 }];
        const result = checkCollision(npcs1, npcs2);
        assert.strictEqual(result, true);
    });

    it('sollte Collections mit ausreichendem Abstand zu NPCs erlauben', () => {
        const collections = [{ x: 5, y: 5, radius: 1 }];
        const npcs = [{ x: 7, y: 7, radius: 1 }];
        const result = checkCollision(collections, npcs);
        assert.strictEqual(result, false);
    });
});