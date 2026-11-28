/* Pure helpers shared by the browser app and the Node test suite. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FaturaCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CATEGORIES = [
    'Alimentação', 'Transporte', 'Casa', 'Saúde', 'Lazer',
    'Assinaturas', 'Educação', 'Compras', 'Outros'
  ];

  function validIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function formatIsoDate(year, monthIndex, day) {
    const date = new Date(Date.UTC(year, monthIndex, day));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function occurrenceDate(startDate, frequency, index) {
    if (!validIsoDate(startDate) || !Number.isInteger(index) || index < 0) return null;
    const [year, month, day] = startDate.split('-').map(Number);

    if (frequency === 'weekly') {
      const date = new Date(Date.UTC(year, month - 1, day + index * 7));
      return formatIsoDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }

    const monthsToAdd = frequency === 'yearly' ? index * 12 : index;
    const targetMonthIndex = month - 1 + monthsToAdd;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return formatIsoDate(targetYear, normalizedMonth, Math.min(day, lastDay));
  }

  function categoryFor(value) {
    return CATEGORIES.includes(value) ? value : 'Outros';
  }

  return { CATEGORIES, validIsoDate, occurrenceDate, categoryFor };
});
