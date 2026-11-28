(() => {
  'use strict';

  const STORAGE_KEY = 'cartao_dados';
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const cents = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : value;

  function normalizeData(value) {
    if (!isPlainObject(value)) return value;

    const data = { ...value };
    data.config = isPlainObject(data.config) ? { ...data.config } : {};
    data.config.virada = Number.isInteger(Number(data.config.virada)) && Number(data.config.virada) >= 1 && Number(data.config.virada) <= 31
      ? Number(data.config.virada) : 10;
    data.config.vencimento = Number.isInteger(Number(data.config.vencimento)) && Number(data.config.vencimento) >= 1 && Number(data.config.vencimento) <= 31
      ? Number(data.config.vencimento) : 17;
    data.config.nomeTitular = typeof data.config.nomeTitular === 'string' && data.config.nomeTitular.trim()
      ? data.config.nomeTitular.trim() : 'Seu Nome';

    data.pessoas = Array.isArray(data.pessoas) ? data.pessoas.filter(isPlainObject) : [];
    if (!data.pessoas.some((person) => person.titular)) {
      data.pessoas.unshift({ id: 'titular', nome: `${data.config.nomeTitular} (Titular)`, titular: true });
    }
    data.compras = Array.isArray(data.compras) ? data.compras.filter(isPlainObject) : [];
    data.pagamentos = Array.isArray(data.pagamentos) ? data.pagamentos.filter(isPlainObject) : [];
    data.antecipacoes = Array.isArray(data.antecipacoes) ? data.antecipacoes.filter(isPlainObject) : [];

    data.compras.forEach((purchase) => {
      if (Number.isFinite(Number(purchase.valorTotal))) purchase.valorTotal = cents(purchase.valorTotal);
      if (Number.isFinite(Number(purchase.parcelas))) purchase.parcelas = Math.min(48, Math.max(1, Math.trunc(Number(purchase.parcelas))));
    });
    data.pagamentos.forEach((payment) => {
      if (Number.isFinite(Number(payment.valorPago))) payment.valorPago = cents(payment.valorPago);
    });
    data.antecipacoes.forEach((advance) => {
      if (Number.isFinite(Number(advance.desconto))) advance.desconto = cents(advance.desconto);
      if (Number.isFinite(Number(advance.qtd))) advance.qtd = Math.max(1, Math.trunc(Number(advance.qtd)));
    });
    return data;
  }

  // Keep the single-file app from crashing on malformed local data and preserve
  // the original value in a dated recovery key before starting with defaults.
  Storage.prototype.getItem = function (key) {
    const value = originalGetItem.call(this, key);
    if (this !== window.localStorage || key !== STORAGE_KEY || value === null) return value;
    try {
      return JSON.stringify(normalizeData(JSON.parse(value)));
    } catch (error) {
      try {
        originalSetItem.call(this, `${STORAGE_KEY}_recovery_${Date.now()}`, value);
      } catch (storageError) {
        console.error('Não foi possível arquivar os dados locais inválidos.', storageError);
      }
      console.error('Os dados locais estavam inválidos e foram arquivados para recuperação.', error);
      return null;
    }
  };

  Storage.prototype.setItem = function (key, value) {
    if (this === window.localStorage && key === STORAGE_KEY) {
      try {
        value = JSON.stringify(normalizeData(JSON.parse(value)));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('app-storage-error', { detail: error }));
        throw error;
      }
    }
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      if (this === window.localStorage && key === STORAGE_KEY) {
        window.dispatchEvent(new CustomEvent('app-storage-error', { detail: error }));
      }
      throw error;
    }
  };

  function localDateValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function moneyToCents(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) : NaN;
  }

  function rejectForm(event, message) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof window.mostrarMensagem === 'function') window.mostrarMensagem(message, 'Verifique os dados');
    else window.alert(message);
  }

  function validateForm(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === 'formCompra') {
      const amount = Number(document.getElementById('compraValor').value);
      const installments = Number(document.getElementById('compraParcelas').value);
      if (!Number.isFinite(amount) || moneyToCents(amount) <= 0) return rejectForm(event, 'Informe um valor maior que zero.');
      if (!Number.isInteger(installments) || installments < 1 || installments > 48) return rejectForm(event, 'A quantidade de parcelas deve estar entre 1 e 48.');
      const personSelect = document.getElementById('divSelectPessoaCompra');
      if (personSelect.style.display !== 'none' && !document.getElementById('compraPessoa').value) return rejectForm(event, 'Cadastre e selecione um devedor válido.');
    }

    if (form.id === 'formPagamento') {
      const amount = Number(document.getElementById('pagValor').value);
      if (!Number.isFinite(amount) || moneyToCents(amount) <= 0) return rejectForm(event, 'Informe um pagamento maior que zero.');
    }

    if (form.id === 'formAntecipacao') {
      const quantity = Number(document.getElementById('antQtdParcelas').value);
      const discount = Number(document.getElementById('antDescontoValor').value);
      if (!Number.isInteger(quantity) || quantity < 1) return rejectForm(event, 'A quantidade de parcelas deve ser um número inteiro positivo.');
      if (!Number.isFinite(discount) || moneyToCents(discount) < 0) return rejectForm(event, 'O desconto não pode ser negativo.');
    }

    if (form.id !== 'modalCompraConjunta' && form.querySelector('#conjuntaValorTotal')) {
      const total = moneyToCents(document.getElementById('conjuntaValorTotal').value);
      const fields = [...form.querySelectorAll('.input-conjunta')];
      const values = fields.map((input) => moneyToCents(input.value || 0));
      if (!Number.isFinite(total) || total <= 0) return rejectForm(event, 'Informe um valor total maior que zero.');
      if (values.some((value) => !Number.isFinite(value) || value < 0)) return rejectForm(event, 'Os valores atribuídos não podem ser negativos.');
      if (!values.some((value) => value > 0) || values.reduce((sum, value) => sum + value, 0) !== total) {
        return rejectForm(event, 'A soma dos valores atribuídos deve ser exatamente igual ao total.');
      }
    }
  }

  function installGlobalGuards() {
    document.addEventListener('submit', validateForm, true);

    // Correct date inputs after the existing UI functions populate them using UTC.
    ['abrirModalCompra', 'abrirModalCompraTitular', 'abrirModalCompraConjunta'].forEach((name) => {
      const original = window[name];
      if (typeof original !== 'function') return;
      window[name] = function (...args) {
        const result = original.apply(this, args);
        const field = document.getElementById(name === 'abrirModalCompraConjunta' ? 'conjuntaData' : 'compraData');
        if (field && !document.getElementById('editCompraId')?.value) field.value = localDateValue();
        return result;
      };
    });

    const paymentDate = document.getElementById('pagData');
    if (paymentDate && !paymentDate.value) paymentDate.value = localDateValue();

    document.querySelectorAll('input[type="number"][step="0.01"]').forEach((input) => {
      input.min = input.id === 'antDescontoValor' ? '0' : (input.id === 'pagValor' ? '0.01' : '0');
    });

    window.addEventListener('app-storage-error', () => {
      if (typeof window.mostrarMensagem === 'function') {
        window.mostrarMensagem('Não foi possível salvar os dados. Exporte um backup e verifique o espaço disponível no navegador.', 'Falha ao salvar');
      }
    });

    // Make modal keyboard behavior consistent without changing the existing UI.
    let lastFocused = null;
    const observer = new MutationObserver(() => {
      const visibleModal = [...document.querySelectorAll('.fixed.inset-0')]
        .find((modal) => !modal.classList.contains('hidden'));
      if (visibleModal) {
        if (!visibleModal.contains(document.activeElement)) lastFocused = document.activeElement;
        const focusable = visibleModal.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusable && document.activeElement === document.body) focusable.focus();
      } else if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus();
        lastFocused = null;
      }
    });
    document.querySelectorAll('.fixed.inset-0').forEach((modal) => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const visibleModal = [...document.querySelectorAll('.fixed.inset-0')]
        .reverse().find((modal) => !modal.classList.contains('hidden'));
      if (!visibleModal) return;
      const closeButton = visibleModal.querySelector('button[onclick^="fechar"]');
      if (closeButton) {
        event.preventDefault();
        closeButton.click();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGlobalGuards, { once: true });
  } else {
    installGlobalGuards();
  }
})();
