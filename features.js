(() => {
  'use strict';

  const CORE = window.FaturaCore;
  if (!CORE) return;

  const DATA_KEY = 'cartao_dados';
  const RECURRING_KEY = 'cartao_recorrencias';
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  let pendingCategory = null;
  let activeFilters = { personId: '', category: '' };

  const getData = () => {
    try {
      const value = JSON.parse(originalGetItem.call(window.localStorage, DATA_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  };

  const getRecurring = () => {
    try {
      const value = JSON.parse(originalGetItem.call(window.localStorage, RECURRING_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  function saveRecurring(records) {
    originalSetItem.call(window.localStorage, RECURRING_KEY, JSON.stringify(records));
  }

  function generateDuePurchases() {
    const data = getData();
    if (!Array.isArray(data.pessoas) || !Array.isArray(data.compras)) return false;
    const recurring = getRecurring();
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let changed = false;

    for (const record of recurring) {
      if (!record || record.active === false || !CORE.validIsoDate(record.startDate)) continue;
      if (!data.pessoas.some((person) => String(person.id) === String(record.personId))) continue;
      let index = Number.isInteger(record.nextIndex) && record.nextIndex >= 0 ? record.nextIndex : 0;
      let dueDate = CORE.occurrenceDate(record.startDate, record.frequency, index);
      while (dueDate && dueDate <= todayIso && (!record.endDate || dueDate <= record.endDate)) {
        const id = `rec-${record.id}-${dueDate}`;
        if (!data.compras.some((purchase) => String(purchase.id) === id)) {
          data.compras.push({
            id,
            pessoaId: String(record.personId),
            descricao: record.description,
            valorTotal: Number(record.amount),
            data: dueDate,
            parcelas: 1,
            categoria: CORE.categoryFor(record.category),
            recorrenciaId: String(record.id)
          });
          changed = true;
        }
        index += 1;
        dueDate = CORE.occurrenceDate(record.startDate, record.frequency, index);
      }
      if (record.nextIndex !== index) {
        record.nextIndex = index;
        changed = true;
      }
      if (record.endDate && dueDate && dueDate > record.endDate) {
        record.active = false;
        changed = true;
      }
    }

    if (changed) {
      originalSetItem.call(window.localStorage, DATA_KEY, JSON.stringify(data));
      saveRecurring(recurring);
    }
    return changed;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function appendCategorySelect(form, id, labelText) {
    if (!form || form.querySelector(`#${id}`)) return;
    const description = form.querySelector('#compraDesc, #conjuntaDesc');
    const group = createElement('div');
    const label = createElement('label', 'block text-xs font-bold text-slate-600 uppercase mb-1', labelText);
    label.htmlFor = id;
    const select = createElement('select', 'dynamic-ring w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 outline-none bg-slate-50 font-medium');
    select.id = id;
    for (const category of CORE.CATEGORIES) {
      const option = createElement('option', '', category);
      option.value = category;
      select.appendChild(option);
    }
    group.append(label, select);
    if (description?.parentElement) description.parentElement.insertAdjacentElement('afterend', group);
  }

  function addFilterControls() {
    const section = document.getElementById('tabFaturas');
    const summary = document.getElementById('resumoFaturaCards');
    if (!section || !summary || document.getElementById('faturaFilters')) return;

    const wrapper = createElement('div', 'bg-white p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2');
    wrapper.id = 'faturaFilters';
    const person = createElement('select', 'dynamic-ring w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-slate-50');
    person.id = 'filtroPessoaCategoria';
    person.appendChild(new Option('Todas as pessoas', ''));
    for (const item of getData().pessoas || []) {
      const option = createElement('option', '', item.nome || 'Pessoa');
      option.value = String(item.id);
      person.appendChild(option);
    }
    const category = createElement('select', 'dynamic-ring w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-slate-50');
    category.id = 'filtroCategoria';
    category.appendChild(new Option('Todas as categorias', ''));
    for (const item of CORE.CATEGORIES) category.appendChild(new Option(item, item));
    person.addEventListener('change', () => { activeFilters.personId = person.value; applyFilters(); });
    category.addEventListener('change', () => { activeFilters.category = category.value; applyFilters(); });
    wrapper.append(person, category);
    section.insertBefore(wrapper, summary);
  }

  function addRecurringPanel() {
    const section = document.getElementById('tabFaturas');
    const summary = document.getElementById('resumoFaturaCards');
    if (!section || !summary || document.getElementById('recurringPanel')) return;

    const panel = createElement('details', 'bg-white rounded-2xl border border-slate-200 p-3 sm:p-4');
    panel.id = 'recurringPanel';
    const heading = createElement('summary', 'cursor-pointer font-bold text-xs sm:text-sm text-slate-700', 'Compras recorrentes');
    const description = createElement('p', 'text-[11px] text-slate-500 mt-1', 'Crie lançamentos automáticos mensais, semanais ou anuais neste navegador.');
    const form = createElement('form', 'mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2');
    form.id = 'recurringForm';

    const field = (labelText, control) => {
      const group = createElement('div');
      const label = createElement('label', 'block text-xs font-semibold text-slate-600 mb-1', labelText);
      label.htmlFor = control.id;
      group.append(label, control);
      return group;
    };
    const inputClass = 'w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50';
    const descriptionInput = createElement('input', inputClass);
    descriptionInput.id = 'recurringDescription'; descriptionInput.required = true; descriptionInput.maxLength = 200; descriptionInput.placeholder = 'Ex.: Internet';
    const amountInput = createElement('input', inputClass);
    amountInput.id = 'recurringAmount'; amountInput.type = 'number'; amountInput.step = '0.01'; amountInput.min = '0.01'; amountInput.required = true;
    const personSelect = createElement('select', inputClass);
    personSelect.id = 'recurringPerson'; personSelect.required = true;
    for (const item of getData().pessoas || []) {
      const option = createElement('option', '', `${item.nome || 'Pessoa'}${item.titular ? ' (titular)' : ''}`);
      option.value = String(item.id);
      personSelect.appendChild(option);
    }
    const categorySelect = createElement('select', inputClass);
    categorySelect.id = 'recurringCategory';
    for (const item of CORE.CATEGORIES) categorySelect.appendChild(new Option(item, item));
    const startDate = createElement('input', inputClass);
    startDate.id = 'recurringStartDate'; startDate.type = 'date'; startDate.required = true;
    const endDate = createElement('input', inputClass);
    endDate.id = 'recurringEndDate'; endDate.type = 'date';
    const frequency = createElement('select', inputClass);
    frequency.id = 'recurringFrequency';
    frequency.append(new Option('Mensal', 'monthly'), new Option('Semanal', 'weekly'), new Option('Anual', 'yearly'));
    const today = new Date();
    startDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const save = createElement('button', 'dynamic-bg text-white rounded-xl px-3 py-2 text-xs font-bold sm:col-span-2', 'Adicionar recorrência');
    save.type = 'submit';
    form.append(
      field('Descrição', descriptionInput), field('Valor (R$)', amountInput),
      field('Pessoa', personSelect), field('Categoria', categorySelect),
      field('Repetir', frequency), field('Primeiro lançamento', startDate),
      field('Último lançamento (opcional)', endDate), save
    );
    const list = createElement('div', 'mt-3 space-y-2');
    list.id = 'recurringList';
    panel.append(heading, description, form, list);
    section.insertBefore(panel, summary);
    form.addEventListener('submit', saveRecurringForm);
    renderRecurringList();
  }

  function renderRecurringList() {
    const list = document.getElementById('recurringList');
    if (!list) return;
    list.replaceChildren();
    const records = getRecurring();
    if (!records.length) {
      list.appendChild(createElement('p', 'text-xs text-slate-400', 'Nenhuma recorrência cadastrada.'));
      return;
    }
    for (const record of records) {
      const row = createElement('div', 'flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs');
      const text = createElement('span', 'text-slate-600', `${record.description} — ${record.category} — ${record.frequency === 'weekly' ? 'semanal' : record.frequency === 'yearly' ? 'anual' : 'mensal'}${record.active === false ? ' (pausada/concluída)' : ''}`);
      const button = createElement('button', 'text-rose-600 font-semibold shrink-0', record.active === false ? 'Remover' : 'Pausar');
      button.type = 'button';
      button.addEventListener('click', () => {
        const current = getRecurring();
        if (record.active === false) {
          saveRecurring(current.filter((item) => item.id !== record.id));
        } else {
          const target = current.find((item) => item.id === record.id);
          if (target) target.active = false;
          saveRecurring(current);
        }
        renderRecurringList();
      });
      row.append(text, button);
      list.appendChild(row);
    }
  }

  function saveRecurringForm(event) {
    event.preventDefault();
    const description = document.getElementById('recurringDescription').value.trim();
    const amount = Number(document.getElementById('recurringAmount').value);
    const personId = document.getElementById('recurringPerson').value;
    const startDate = document.getElementById('recurringStartDate').value;
    const endDate = document.getElementById('recurringEndDate').value;
    if (!description || !Number.isFinite(amount) || amount <= 0 || !CORE.validIsoDate(startDate) || (endDate && (!CORE.validIsoDate(endDate) || endDate < startDate))) {
      window.mostrarMensagem?.('Confira a descrição, o valor e o período da recorrência.', 'Dados inválidos');
      return;
    }
    const records = getRecurring();
    records.push({
      id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      description,
      amount: Math.round(amount * 100) / 100,
      personId,
      category: CORE.categoryFor(document.getElementById('recurringCategory').value),
      frequency: document.getElementById('recurringFrequency').value,
      startDate,
      endDate,
      nextIndex: 0,
      active: true
    });
    saveRecurring(records);
    generateDuePurchases();
    window.location.reload();
  }

  function purchaseMatchesMonth(purchase, personId, month, category) {
    if (String(purchase.pessoaId) !== String(personId)) return false;
    if (category && CORE.categoryFor(purchase.categoria) !== category) return false;
    const cutoff = Number(getData().config?.virada) || 10;
    const date = new Date(`${purchase.data}T00:00:00`);
    if (!Number.isFinite(date.getTime())) return false;
    let firstMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (date.getDate() >= cutoff) firstMonth = CORE.occurrenceDate(`${firstMonth}-01`, 'monthly', 1).slice(0, 7);
    const [firstYear, firstMonthNumber] = firstMonth.split('-').map(Number);
    const [targetYear, targetMonth] = month.split('-').map(Number);
    const offset = (targetYear - firstYear) * 12 + targetMonth - firstMonthNumber;
    return offset >= 0 && offset < Math.max(1, Number(purchase.parcelas) || 1);
  }

  function applyFilters() {
    const month = document.getElementById('filtroMesFatura')?.value || '';
    const data = getData();
    const root = document.getElementById('listaDevedoresFatura');
    if (root) {
      for (const row of root.children) {
        const details = row.querySelector('[id^="detalhes-"]');
        if (!details) continue;
        const personId = details.id.slice('detalhes-'.length);
        const personMatches = !activeFilters.personId || String(personId) === String(activeFilters.personId);
        const categoryMatches = !activeFilters.category || (data.compras || []).some((purchase) =>
          purchaseMatchesMonth(purchase, personId, month, activeFilters.category)
        );
        row.hidden = !(personMatches && categoryMatches);
      }
    }
    const personalRoot = document.getElementById('listaComprasProprias');
    if (personalRoot && activeFilters.category) {
      const titular = (data.pessoas || []).find((person) => person.titular);
      const purchases = (data.compras || []).filter((purchase) => titular &&
        purchaseMatchesMonth(purchase, titular.id, month, activeFilters.category));
      const descriptions = new Set(purchases.map((purchase) => purchase.descricao));
      for (const row of personalRoot.children) {
        row.hidden = ![...descriptions].some((description) => row.textContent.includes(description));
      }
    } else if (personalRoot) {
      for (const row of personalRoot.children) row.hidden = false;
    }
  }

  function addCategoryControls(formId, selectId, labelText) {
    const form = document.getElementById(formId);
    if (!form || form.querySelector(`#${selectId}`)) return;
    const description = form.querySelector('#compraDesc, #conjuntaDesc');
    if (!description?.parentElement) return;
    const wrapper = createElement('div');
    const label = createElement('label', 'block text-xs font-bold text-slate-600 uppercase mb-1', labelText);
    label.htmlFor = selectId;
    const select = createElement('select', 'dynamic-ring w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 outline-none bg-slate-50 font-medium');
    select.id = selectId;
    for (const item of CORE.CATEGORIES) select.appendChild(new Option(item, item));
    wrapper.append(label, select);
    description.parentElement.insertAdjacentElement('afterend', wrapper);
  }

  function installStorageCategorySupport() {
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage && key === DATA_KEY) {
        try {
          const next = JSON.parse(value);
          const previousRaw = originalGetItem.call(this, DATA_KEY);
          const previous = previousRaw ? JSON.parse(previousRaw) : { compras: [] };
          const oldPurchases = new Map((previous.compras || []).map((purchase) => [String(purchase.id), purchase]));
          const selectedCategory = pendingCategory || document.getElementById('categoriaCompra')?.value || 'Outros';
          for (const purchase of next.compras || []) {
            const old = oldPurchases.get(String(purchase.id));
            if (!old || !purchase.categoria || pendingCategory !== null) purchase.categoria = CORE.categoryFor(selectedCategory);
            else purchase.categoria = CORE.categoryFor(purchase.categoria);
          }
          pendingCategory = null;
          value = JSON.stringify(next);
        } catch {
          pendingCategory = null;
        }
      }
      return originalSetItem.call(this, key, value);
    };
  }

  function install() {
    addCategoryControls('formCompra', 'categoriaCompra', 'Categoria do gasto');
    addCategoryControls('formCompraConjunta', 'categoriaCompraConjunta', 'Categoria do gasto');
    addFilterControls();
    addRecurringPanel();

    document.addEventListener('submit', (event) => {
      if (event.target?.id === 'formCompra') pendingCategory = document.getElementById('categoriaCompra')?.value || 'Outros';
      else if (event.target?.querySelector('#conjuntaValorTotal')) pendingCategory = document.getElementById('categoriaCompraConjunta')?.value || 'Outros';
    }, true);

    const renderOriginal = window.renderizarFaturas;
    if (typeof renderOriginal === 'function') {
      window.renderizarFaturas = function (...args) {
        const result = renderOriginal.apply(this, args);
        applyFilters();
        return result;
      };
    }
    const ownRenderOriginal = window.renderizarProprias;
    if (typeof ownRenderOriginal === 'function') {
      window.renderizarProprias = function (...args) {
        const result = ownRenderOriginal.apply(this, args);
        applyFilters();
        return result;
      };
    }
    document.getElementById('filtroMesFatura')?.addEventListener('change', applyFilters);
    applyFilters();
    renderRecurringList();
  }

  installStorageCategorySupport();
  generateDuePurchases();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  window.setInterval(() => {
    if (generateDuePurchases()) window.location.reload();
  }, 60 * 1000);
})();
