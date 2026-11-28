(() => {
  'use strict';

  function atualizarRenderizacaoDaAbaPropria() {
    const abaPropria = document.getElementById('tabProprias');
    if (abaPropria && !abaPropria.classList.contains('hidden') && typeof window.renderizarProprias === 'function') {
      window.renderizarProprias();
    }
  }

  function valorMoedaBrasileira(texto) {
    const numero = texto
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3}(?:,|$))/g, '')
      .replace(',', '.');
    return Number(numero);
  }

  function adicionarDividaAnteriorAoDetalhe(pessoaId) {
    const detalhes = document.getElementById(`detalhes-${pessoaId}`);
    if (!detalhes) return;

    detalhes.querySelectorAll('[data-divida-anterior]').forEach((el) => el.remove());
    if (detalhes.classList.contains('hidden')) return;

    const resumo = detalhes.parentElement?.querySelector('.cursor-pointer p');
    const textoResumo = resumo?.textContent || '';
    const correspondencia = textoResumo.match(/Anterior:\s*(R\$\s*[\d.]+,\d{2})/);
    if (!correspondencia || valorMoedaBrasileira(correspondencia[1]) <= 0) return;

    const linha = document.createElement('p');
    linha.dataset.dividaAnterior = 'true';
    linha.className = 'mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800';
    linha.textContent = `Dívida anterior: ${correspondencia[1]}`;
    detalhes.prepend(linha);
  }

  function instalarCorrecoes() {
    const filtroMes = document.getElementById('filtroMesFatura');
    if (filtroMes) filtroMes.addEventListener('change', atualizarRenderizacaoDaAbaPropria);

    const mudarMesOriginal = window.mudarMes;
    if (typeof mudarMesOriginal === 'function') {
      window.mudarMes = function (...args) {
        const resultado = mudarMesOriginal.apply(this, args);
        atualizarRenderizacaoDaAbaPropria();
        return resultado;
      };
    }

    const toggleOriginal = window.toggleDetalhesDevedor;
    if (typeof toggleOriginal === 'function') {
      window.toggleDetalhesDevedor = function (pessoaId, ...args) {
        const resultado = toggleOriginal.call(this, pessoaId, ...args);
        adicionarDividaAnteriorAoDetalhe(pessoaId);
        return resultado;
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalarCorrecoes, { once: true });
  } else {
    instalarCorrecoes();
  }
})();
