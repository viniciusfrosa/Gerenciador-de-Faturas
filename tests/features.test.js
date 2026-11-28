const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, categoryFor, occurrenceDate, validIsoDate } = require('../features-core.js');

test('provides the supported expense categories and safe fallback', () => {
  assert.ok(CATEGORIES.includes('Alimentação'));
  assert.equal(categoryFor('Transporte'), 'Transporte');
  assert.equal(categoryFor('HTML inesperado'), 'Outros');
});

test('validates calendar dates, including month lengths and leap years', () => {
  assert.equal(validIsoDate('2024-02-29'), true);
  assert.equal(validIsoDate('2025-02-29'), false);
  assert.equal(validIsoDate('2025-13-01'), false);
});

test('keeps monthly recurring date anchored to the original day', () => {
  assert.equal(occurrenceDate('2025-01-31', 'monthly', 1), '2025-02-28');
  assert.equal(occurrenceDate('2025-01-31', 'monthly', 2), '2025-03-31');
});

test('calculates weekly and annual occurrences', () => {
  assert.equal(occurrenceDate('2025-01-01', 'weekly', 2), '2025-01-15');
  assert.equal(occurrenceDate('2024-02-29', 'yearly', 1), '2025-02-28');
});
