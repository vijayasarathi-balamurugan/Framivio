const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../src/js/fit-core.js');

test('exports the starter preset collection', () => {
  assert.ok(Array.isArray(core.PRESETS));
  assert.ok(core.PRESETS.length >= 10);
});

test('validates still-image output dimensions', () => {
  assert.deepEqual(core.size(1080, 1920), { w: 1080, h: 1920 });
  assert.throws(() => core.size(20, 1920));
});

test('validates video output dimensions', () => {
  assert.deepEqual(core.size(1920, 1080, true), { w: 1920, h: 1080 });
  assert.throws(() => core.size(1081, 1920, true));
});

test('calculates fit and crop placement', () => {
  const fit = core.placement(1920, 1080, 1080, 1080, 'fit');
  assert.equal(fit.w, 1080);
  assert.equal(fit.h, 607.5);
  const crop = core.placement(1920, 1080, 1080, 1080, 'crop');
  assert.equal(crop.w, 1920);
  assert.equal(crop.h, 1080);
});

test('clamps placement and zoom inputs', () => {
  const result = core.placement(100, 100, 200, 200, 'fit', 4, -1, 99);
  assert.equal(result.w, 600);
  assert.equal(result.h, 600);
  assert.equal(result.x, -400);
  assert.equal(result.y, 0);
});

test('rejects invalid placement modes and non-finite controls', () => {
  assert.throws(() => core.placement(100, 100, 200, 200, 'stretch'));
  assert.throws(() => core.placement(100, 100, 200, 200, 'fit', NaN, 0.5, 1));
});

test('cleans export file names', () => {
  assert.equal(core.cleanName('My photo!.jpg'), 'My_photo_');
  assert.equal(core.cleanName(''), 'framivio');
});

test('validates and converts trim ranges to milliseconds', () => {
  assert.deepEqual(core.trim(1.25, 4.5, 10), { startMs: 1250, endMs: 4500 });
  assert.deepEqual(core.trim(9.95, 10.05, 10), { startMs: 9950, endMs: 10000 });
  assert.throws(() => core.trim(5, 4, 10));
});

test('rejects invalid trim durations and ranges', () => {
  for (const args of [
    [0, 1, 0], [0, 1, -1], [0, 1, NaN], [0, 1, Infinity],
    [10.05, 10.1, 10], [0, 10.2, 10], [1, 1, 10], [0, 0.0001, 10]
  ]) assert.throws(() => core.trim(...args));
});

test('calculates supported watermark anchor positions', () => {
  assert.deepEqual(core.markCenter('center'), { x: 0.5, y: 0.5 });
  assert.deepEqual(core.markCenter('manual', 2, -1), { x: 1, y: 0 });
  assert.deepEqual(core.markCenter('top-left'), { x: 0.04, y: 0.04 });
  assert.deepEqual(core.markCenter('bottom-right'), { x: 0.96, y: 0.96 });
});

test('rejects unknown watermark positions and non-finite manual coordinates', () => {
  assert.throws(() => core.markCenter(null));
  assert.throws(() => core.markCenter('middle')); 
  assert.throws(() => core.markCenter('manual', Infinity, 0.5));
});
