'use strict';
const KEY = 'confere.v1';
const units = {un: 0, cx: 0, kg: 3, g: 3, L: 3, m: 3};
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const iconPaths = {
  box: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z"/><path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  list: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.box}</svg>`;
let db = {version: 1, counts: [], activeId: null};
let page = 'counts', selected = null, query = '', filter = 'all', saveOK = true, toastTimer, completedDetails = false;
try {
  const saved = localStorage.getItem(KEY);
  if (saved) { const value = JSON.parse(saved); validateBackup(value); db = value; }
} catch (error) {
  saveOK = false;
  setTimeout(() => toast('Não foi possível carregar os dados. Importe um backup ou verifique o armazenamento.'), 100);
}
function current() { return db.counts.find(count => count.id === db.activeId); }
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4200);
}
function saveIndicator() { return `<span id="save-state" class="save ${saveOK ? 'ok' : 'error'}">${icon(saveOK ? 'check' : 'alert')}${saveOK ? 'Tudo salvo' : 'Falha ao salvar'}</span>`; }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); saveOK = true; }
  catch (error) { saveOK = false; toast('Não foi possível salvar. Exporte um backup e tente novamente.'); }
  const indicator = $('#save-state');
  if (indicator) { indicator.className = `save ${saveOK ? 'ok' : 'error'}`; indicator.innerHTML = `${icon(saveOK ? 'check' : 'alert')}${saveOK ? 'Tudo salvo' : 'Falha ao salvar'}`; }
  return saveOK;
}
function saveChange(change) { const previous = structuredClone(db); change(); if (persist()) return true; db = previous; render(); return false; }
function quantity(raw, unit) {
  if (raw === '') return null;
  if (typeof raw !== 'string' || !Object.hasOwn(units, unit) || !/^\d+([.,]\d+)?$/.test(raw)) return undefined;
  const [whole, fraction = ''] = raw.replace(',', '.').split('.');
  if (fraction.length > units[unit]) return undefined;
  const scaled = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return Number.isSafeInteger(scaled) && scaled <= 1000000000000 ? scaled : undefined;
}
function format(number) { return new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 3}).format(number / 1000); }
function diff(item) { const a = quantity(item.system, item.unit), b = quantity(item.physical, item.unit); return a == null || b == null ? null : b - a; }
function valid(item) { return item.name.trim() && quantity(item.system, item.unit) != null && quantity(item.physical, item.unit) != null; }
function stats(count) {
  return {equal: count.items.filter(item => valid(item) && diff(item) === 0).length, divergent: count.items.filter(item => diff(item) !== null && diff(item) !== 0).length, pending: count.items.filter(item => !valid(item)).length};
}
function status(count) { return count.status === 'done' ? 'Concluída' : count.status === 'review' ? 'Em revisão' : 'Em contagem'; }
function dateLabel(date) { return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric'}); }
function differenceHTML(item) {
  const d = diff(item), state = d === null ? 'pending' : d === 0 ? 'equal' : d > 0 ? 'positive' : 'negative';
  return `<span class="difference ${state}">${d === null ? 'Pendente' : d === 0 ? 'Conferem' : (d > 0 ? '+' : '−') + format(Math.abs(d))}</span>`;
}
function differenceText(item) { const d = diff(item); return d === null ? 'Preencha os dois valores' : d === 0 ? 'Os saldos conferem' : `${format(Math.abs(d))} ${item.unit} ${d > 0 ? 'a mais no físico' : 'a menos no físico'}`; }
function steps(count) {
  const active = count.status === 'done' ? 2 : count.status === 'review' ? 1 : 0;
  return `<ol class="steps" aria-label="Etapas da conferência">${['Contagem', 'Revisão', 'Finalização'].map((label, index) => `<li class="step ${index === active ? 'active' : index < active ? 'complete' : ''}" ${index === active ? 'aria-current="step"' : ''}><span>${index < active ? icon('check') : index + 1}</span><div>${label}<small>${['Registre os itens', 'Confira um por vez', 'Tudo revisado'][index]}</small></div></li>`).join('')}</ol>`;
}
function leaveCount() {
  if (!saveChange(() => { db.activeId = null; })) return;
  page = 'counts'; completedDetails = false; render();
}
function render() {
  const count = current();
  $('#nav-counts').classList.toggle('active', page === 'counts'); $('#nav-history').classList.toggle('active', page === 'history');
  $('#app').className = count && page === 'counts' && count.status === 'review' ? 'review-page' : '';
  if (page === 'history' || !count) { renderList(); return; }
  if (!count.items.some(item => item.id === selected)) selected = count.items[count.cursor || 0]?.id || count.items[0]?.id;
  if (count.status === 'review') { selected = count.items[count.cursor].id; renderReview(); return; }
  if (count.status === 'done' && !completedDetails) { renderDone(); return; }
  renderCount();
}
function countHeading(count) {
  return `<div class="page-top"><button class="back-link" id="back-counts">${icon('back')}Todas as contagens</button>${saveIndicator()}</div><div class="title-row count-title"><div><span class="eyebrow">CONFERÊNCIA DE ESTOQUE</span>${count.status === 'counting' ? `<input class="title-input" id="count-name" aria-label="Nome da contagem" maxlength="100" value="${escapeHTML(count.name)}">` : `<h1>${escapeHTML(count.name)}</h1>`}<div class="count-meta">${icon('clock')}${count.status === 'counting' ? `<input class="date-input" id="count-date" type="date" aria-label="Data da contagem" value="${escapeHTML(count.date)}">` : dateLabel(count.date)}<span class="meta-divider"></span><span class="status-tag ${count.status}">${status(count)}</span></div></div>${count.status === 'done' ? '<button class="button" id="show-completion">Ver resumo</button>' : ''}</div>${steps(count)}`;
}
function renderCount() {
  const count = current(), editable = count.status === 'counting';
  $('#app').innerHTML = `${countHeading(count)}<div class="workspace"><section class="card table-card" aria-label="Itens da contagem"><div class="table-head"><div class="table-heading"><div><h2>Itens da contagem <span class="item-total">${count.items.length}</span></h2><p>${editable ? 'Preencha o saldo do sistema e a quantidade que você contou.' : 'Registro dos itens desta conferência.'}</p></div>${editable ? `<button class="button secondary small" id="add-item">${icon('plus')}Adicionar item</button>` : ''}</div><div class="tools"><div class="search">${icon('search')}<input id="search" aria-label="Buscar item ou código" placeholder="Buscar item ou código" value="${escapeHTML(query)}"></div><div class="filters" aria-label="Filtrar itens">${[['all', 'Todos'], ['divergent', 'Divergentes'], ['pending', 'Pendentes']].map(([value, label]) => `<button class="filter ${filter === value ? 'active' : ''}" data-filter="${value}" aria-pressed="${filter === value}">${label}<span class="count"></span></button>`).join('')}</div></div></div><div class="table-scroll" tabindex="0" aria-label="Itens da contagem"><table role="table"><thead role="rowgroup"><tr role="row"><th scope="col">#</th><th scope="col">Item / código</th><th scope="col">Un.</th><th scope="col">Sistema</th><th scope="col">Físico</th><th scope="col">Diferença</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody id="items-body" role="rowgroup"></tbody></table></div>${editable ? `<button class="add-line" id="add-line">${icon('plus')}Adicionar outro item</button>` : ''}<div class="summary"><span id="summary" aria-live="polite"></span><span class="keyboard-hint"><kbd>Tab</kbd> próximo campo</span></div></section><aside class="card preview" id="preview" aria-label="Resumo do item selecionado"></aside></div><footer class="entry-footer"><span class="footer-note">${icon('shield')}Salvo automaticamente neste navegador</span><div class="footer-actions"><button class="button quiet" id="leave">Salvar e sair</button>${editable ? `<button class="button primary" id="start-review">Ir para revisão${icon('arrow')}</button>` : `<button class="button" id="reopen">${icon('edit')}Reabrir para editar</button>`}</div></footer>`;
  renderRows(); renderPreview(); bindCount();
}
function visibleItems(count) {
  return count.items.filter(item => (item.name + ' ' + item.code).toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === 'all' || filter === 'pending' && !valid(item) || filter === 'divergent' && diff(item) !== null && diff(item) !== 0));
}
function renderRows() {
  const count = current(), editable = count.status === 'counting';
  $('#items-body').innerHTML = visibleItems(count).map(item => {
    const n = count.items.indexOf(item) + 1;
    return `<tr role="row" data-id="${item.id}" class="${item.id === selected ? 'selected' : ''}">
      <td role="cell" class="item-number">${String(n).padStart(2, '0')}</td>
      <td role="cell" class="item-name-cell" data-label="Item / código">${editable ? `
        <input class="item-name" data-field="name" aria-label="Nome do item ${n}" maxlength="200" placeholder="Nome do item" value="${escapeHTML(item.name)}">
        <input class="item-code" data-field="code" aria-label="Código do item ${n}" maxlength="100" placeholder="Código (opcional)" value="${escapeHTML(item.code)}">` : `
        <strong>${escapeHTML(item.name)}</strong><span class="item-code">${escapeHTML(item.code || 'Sem código')}</span>`}</td>
      <td role="cell" class="item-unit-cell" data-label="Unidade">${editable ? `
        <select data-field="unit" aria-label="Unidade do item ${n}">${Object.keys(units).map(unit => `<option ${unit === item.unit ? 'selected' : ''}>${unit}</option>`).join('')}</select>` : escapeHTML(item.unit)}</td>
      ${['system', 'physical'].map(field => {
        const label = field === 'system' ? 'Saldo do sistema' : 'Quantidade física';
        return `<td role="cell" class="quantity-cell" data-label="${label}">${editable ? `
          <input class="quantity-input" data-field="${field}" inputmode="decimal" autocomplete="off" aria-label="${label} do item ${n}" value="${escapeHTML(item[field])}" placeholder="—" aria-invalid="${item[field] !== '' && quantity(item[field], item.unit) === undefined}" title="${units[item.unit] ? 'Até ' + units[item.unit] + ' casas decimais' : 'Somente números inteiros'}; sem valores negativos">` : `
          <span class="table-quantity">${format(quantity(item[field], item.unit))}</span>`}</td>`;
      }).join('')}
      <td role="cell" class="diff-cell" data-label="Diferença">${differenceHTML(item)}</td>
      <td role="cell" class="item-actions">${editable ? `<button class="delete icon-button" data-delete="${item.id}" aria-label="Remover item ${n}">${icon('close')}</button>` : ''}</td>
    </tr>`;
  }).join('');
  if (!visibleItems(count).length) $('#items-body').innerHTML = `<tr><td colspan="7" class="no-results">${query || filter !== 'all' ? 'Nenhum item corresponde a este filtro.' : 'Adicione o primeiro item para começar.'}</td></tr>`;
  updateSummary();
}
function updateSummary() {
  const count = current(), summary = stats(count);
  $('#summary').textContent = `${count.items.length} ${count.items.length === 1 ? 'item' : 'itens'} · ${summary.equal} conferem · ${summary.divergent} divergentes${summary.pending ? ' · ' + summary.pending + ' pendentes' : ''}`;
  for (const [key, value] of [['all', count.items.length], ['divergent', summary.divergent], ['pending', summary.pending]]) $(`[data-filter="${key}"] .count`).textContent = value;
}
function renderPreview() {
  const count = current(), item = count.items.find(row => row.id === selected);
  if (!item) { $('#preview').innerHTML = `<div class="preview-label">${icon('box')}ITEM EM FOCO</div><div class="preview-empty">${icon('list')}<h2>Um item por vez.</h2><p>Selecione uma linha para ver os valores com mais clareza.</p></div>`; return; }
  $('#preview').innerHTML = `<div class="preview-label">${icon('box')}ITEM EM FOCO</div><div class="position">ITEM ${String(count.items.indexOf(item) + 1).padStart(2, '0')} DE ${String(count.items.length).padStart(2, '0')}</div><h2>${escapeHTML(item.name || 'Novo item')}</h2><div class="preview-meta">${escapeHTML(item.code || 'Sem código')}<span>·</span>${escapeHTML(item.unit)}</div><div class="preview-values"><div><span>Saldo do sistema</span><strong>${quantity(item.system, item.unit) == null ? '—' : format(quantity(item.system, item.unit))}<small>${item.unit}</small></strong></div><div class="physical"><span>Quantidade física</span><strong>${quantity(item.physical, item.unit) == null ? '—' : format(quantity(item.physical, item.unit))}<small>${item.unit}</small></strong></div></div><div class="preview-diff">${differenceHTML(item)}<p>${escapeHTML(differenceText(item))}</p></div><div class="preview-tip">${icon('shield')}<p>${count.status === 'done' ? 'Este item já passou pela revisão.' : 'Terminou de preencher? A próxima etapa é revisar cada item com atenção.'}</p></div>`;
}
function bindCount() {
  const count = current();
  $('#back-counts').onclick = leaveCount; $('#leave').onclick = leaveCount;
  $('#show-completion')?.addEventListener('click', () => { completedDetails = false; render(); });
  $('#count-name')?.addEventListener('input', e => { if (e.target.value.trim()) { count.name = e.target.value; persist(); } });
  $('#count-name')?.addEventListener('blur', e => { e.target.value = count.name; });
  $('#count-date')?.addEventListener('change', e => { if (e.target.value) { count.date = e.target.value; persist(); } else e.target.value = count.date; });
  $('#search').addEventListener('input', e => { query = e.target.value; renderRows(); });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(control => { control.classList.toggle('active', control === button); control.setAttribute('aria-pressed', String(control === button)); });
    renderRows();
  }));
  $('#add-item')?.addEventListener('click', addItem); $('#add-line')?.addEventListener('click', addItem);
  $('#items-body').addEventListener('focusin', e => {
    const row = e.target.closest('[data-id]');
    if (row && selected !== row.dataset.id) { selected = row.dataset.id; document.querySelectorAll('tr[data-id]').forEach(element => element.classList.toggle('selected', element.dataset.id === selected)); renderPreview(); }
  });
  $('#items-body').addEventListener('input', e => {
    const field = e.target.dataset.field; if (!field) return;
    const row = e.target.closest('[data-id]'), item = count.items.find(item => item.id === row.dataset.id);
    item[field] = e.target.value;
    ['system', 'physical'].forEach(name => row.querySelector(`[data-field="${name}"]`).setAttribute('aria-invalid', String(item[name] !== '' && quantity(item[name], item.unit) === undefined)));
    row.querySelector('.diff-cell').innerHTML = differenceHTML(item); updateSummary(); renderPreview(); persist();
  });
  $('#items-body').addEventListener('click', e => {
    const remove = e.target.closest('[data-delete]');
    if (remove) { if (confirm('Remover este item da contagem?') && saveChange(() => { count.items = count.items.filter(item => item.id !== remove.dataset.delete); })) render(); return; }
    const row = e.target.closest('[data-id]');
    if (row && count.status === 'done') { selected = row.dataset.id; renderRows(); renderPreview(); }
  });
  $('#start-review')?.addEventListener('click', startReview); $('#reopen')?.addEventListener('click', reopenCount);
}
function addItem() {
  const count = current(), item = {id: uid(), name: '', code: '', unit: 'un', system: '', physical: ''};
  if (!saveChange(() => { count.items.push(item); })) return;
  selected = item.id; query = ''; filter = 'all'; render();
  document.querySelector(`tr[data-id="${item.id}"] .item-name`)?.focus();
}
function startReview() {
  const count = current();
  if (!count.items.length) { toast('Adicione pelo menos um item para revisar.'); return; }
  const invalid = count.items.find(item => !valid(item));
  if (invalid) {
    query = ''; filter = 'all'; selected = invalid.id; render(); toast('Preencha o nome e as duas quantidades de cada item. Zero é permitido.');
    const field = !invalid.name.trim() ? 'name' : quantity(invalid.system, invalid.unit) == null ? 'system' : 'physical';
    document.querySelector(`tr[data-id="${invalid.id}"] [data-field="${field}"]`)?.focus(); return;
  }
  if (!saveChange(() => { count.snapshot = {items: structuredClone(count.items), reviewedAt: new Date().toISOString()}; count.status = 'review'; count.copied = []; count.cursor = 0; })) return;
  selected = count.items[0].id; query = ''; filter = 'all'; render(); $('#review-item-title').focus();
}
// A revisão usa uma tela própria: a tabela só existe na contagem ou consulta.
function renderReview() {
  const count = current(), index = count.cursor, item = count.items[index], reviewed = count.copied.includes(item.id);
  const d = diff(item), state = d === 0 ? 'equal' : d > 0 ? 'positive' : 'negative', percent = Math.round(count.copied.length / count.items.length * 100);
  $('#app').innerHTML = `<div class="page-top"><button class="back-link" id="pause-review">${icon('back')}Pausar e sair</button>${saveIndicator()}</div><div class="review-page-heading"><div><span class="eyebrow">MENOS DISTRAÇÕES, MAIS ATENÇÃO</span><h1>Hora de conferir.</h1><p>${escapeHTML(count.name)}<span class="meta-divider"></span>${dateLabel(count.date)}</p></div><span class="focus-tag">${icon('shield')}Revisão item a item</span></div>${steps(count)}<section class="review-shell" aria-label="Revisão da contagem"><div class="review-progress"><div><span>Seu progresso</span><strong>${count.copied.length} de ${count.items.length} ${count.items.length === 1 ? 'item revisado' : 'itens revisados'}</strong></div><span class="progress-percent">${percent}%</span><div class="progress" role="progressbar" aria-label="Itens revisados" aria-valuemin="0" aria-valuemax="${count.items.length}" aria-valuenow="${count.copied.length}"><span style="width:${percent}%"></span></div></div><article class="review-card"><div class="review-item-top"><span class="position">ITEM ${String(index + 1).padStart(2, '0')} <span>/ ${String(count.items.length).padStart(2, '0')}</span></span><span class="review-state ${reviewed ? 'is-reviewed' : ''}">${icon(reviewed ? 'check' : 'clock')}${reviewed ? 'Já revisado' : 'Aguardando sua revisão'}</span></div><h2 id="review-item-title" tabindex="-1">${escapeHTML(item.name)}</h2><div class="review-item-meta"><span class="code-chip">${item.code ? 'Cód. ' + escapeHTML(item.code) : 'Sem código'}</span><span>Unidade: <strong>${escapeHTML(item.unit)}</strong></span></div><div class="comparison-grid">${[['system', 'monitor', 'Saldo do sistema'], ['physical', 'box', 'Quantidade física']].map(([field, symbol, label]) => `<div class="comparison-value ${field}"><div class="comparison-label">${icon(symbol)}<span>${label}</span><button class="icon-button copy-value" data-copy="${field}" aria-label="Copiar ${label.toLocaleLowerCase()}" title="Copiar valor">${icon('copy')}</button></div><div class="review-number"><span>${format(quantity(item[field], item.unit))}</span><small>${escapeHTML(item.unit)}</small></div><span class="value-caption">${field === 'system' ? 'Registrado no sistema' : 'Contado por você'}</span></div>`).join('')}</div><div class="difference-banner ${state}"><span class="delta-icon">${icon(d === 0 ? 'check' : 'alert')}</span><div><strong>${escapeHTML(differenceText(item))}</strong><span>${d === 0 ? 'Valores iguais. Confirme que você revisou este item.' : 'Diferença entre a quantidade física e o saldo do sistema.'}</span></div><span class="delta-value">${d === 0 ? '=' : (d > 0 ? '+' : '−') + format(Math.abs(d))}</span></div><div class="review-actions"><button class="button" id="previous" ${index === 0 ? 'disabled' : ''}>${icon('back')}Anterior</button><button class="button primary" id="next">${index === count.items.length - 1 ? 'Confirmar e finalizar' : 'Confirmar e próximo'}${icon(index === count.items.length - 1 ? 'check' : 'arrow')}</button></div><p class="review-hint">Ao confirmar, você registra que conferiu os valores deste item.</p></article><div class="review-bottom"><button class="text-button" id="reopen">${icon('edit')}Preciso corrigir a contagem</button>${reviewed ? '<button class="text-button muted" id="unmark">Desmarcar revisão deste item</button>' : `<span>${icon('shield')}Seu progresso é salvo automaticamente.</span>`}</div></section>`;
  $('#pause-review').onclick = leaveCount; $('#previous').onclick = () => moveReview(index - 1); $('#next').onclick = confirmReview; $('#reopen').onclick = reopenCount;
  $('#unmark')?.addEventListener('click', () => { if (saveChange(() => { count.copied = count.copied.filter(id => id !== item.id); })) render(); });
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(format(quantity(item[button.dataset.copy], item.unit))); toast('Valor copiado.'); }
    catch (error) { toast('Não foi possível copiar. Selecione o número e copie manualmente.'); }
  }));
}
function moveReview(index) {
  const count = current();
  if (count.status !== 'review' || index < 0 || index >= count.items.length) return;
  if (!saveChange(() => { count.cursor = index; })) return;
  selected = count.items[index].id; render(); $('#review-item-title').focus();
}
function confirmReview() {
  const count = current(); if (count.status !== 'review') return;
  let redirected = false;
  if (!saveChange(() => {
    const item = count.items[count.cursor]; if (!count.copied.includes(item.id)) count.copied.push(item.id);
    if (count.cursor === count.items.length - 1) {
      const pending = count.items.findIndex(item => !count.copied.includes(item.id));
      if (pending >= 0) { count.cursor = pending; redirected = true; } else count.status = 'done';
    } else count.cursor += 1;
  })) return;
  selected = count.items[count.cursor].id; render(); $(count.status === 'done' ? '#completion-title' : '#review-item-title').focus();
  if (redirected) toast('Ainda há itens para conferir. Voltamos ao primeiro pendente.');
}
function reopenCount() {
  const count = current();
  if (!confirm('Reabrir para editar? As marcações de revisão serão reiniciadas. A versão anterior será preservada no backup.')) return;
  if (!saveChange(() => { count.versions ??= []; count.versions.push({items: structuredClone(count.items), copied: [...count.copied], status: count.status, at: new Date().toISOString()}); count.status = 'counting'; count.copied = []; count.cursor = 0; })) return;
  completedDetails = false; query = ''; filter = 'all'; render(); $('#count-name').focus();
}
function renderDone() {
  const count = current(), summary = stats(count);
  $('#app').innerHTML = `<div class="page-top"><button class="back-link" id="back-counts">${icon('back')}Todas as contagens</button>${saveIndicator()}</div>${steps(count)}<section class="completion-card card"><div class="completion-icon">${icon('check')}</div><span class="eyebrow">TUDO CONFERIDO</span><h1 id="completion-title" tabindex="-1">Conferência concluída.</h1><p>Você revisou todos os itens de <strong>${escapeHTML(count.name)}</strong>.</p><div class="completion-meta">${dateLabel(count.date)}<span>·</span>Seu registro está salvo neste navegador</div><div class="completion-stats"><div><strong>${count.items.length}</strong><span>Itens revisados</span></div><div><strong>${summary.equal}</strong><span>Saldos iguais</span></div><div><strong>${summary.divergent}</strong><span>Divergências</span></div></div><div class="completion-actions"><button class="button" id="view-items">${icon('list')}Consultar itens</button><button class="button primary" id="finish-exit">Voltar às contagens${icon('arrow')}</button></div><button class="text-button muted" id="reopen">${icon('edit')}Reabrir para editar</button></section>`;
  $('#back-counts').onclick = leaveCount; $('#finish-exit').onclick = leaveCount; $('#view-items').onclick = () => { completedDetails = true; render(); }; $('#reopen').onclick = reopenCount;
}
function renderList() {
  const history = page === 'history', counts = history ? db.counts : db.counts.filter(count => count.status !== 'done');
  $('#app').innerHTML = `<div class="title-row dashboard-title"><div><span class="eyebrow">SEU ESPAÇO DE CONFERÊNCIA</span><h1>${history ? 'Histórico' : 'Suas contagens'}</h1><p>${history ? 'Cada conferência, guardada para quando você precisar.' : 'Entre o sistema e a prateleira, a certeza de conferir.'}</p></div><button class="button primary" id="new-count">${icon('plus')}Nova contagem</button></div>${counts.length ? `<section class="card listing"><div class="list-heading"><h2>${history ? 'Todas as contagens' : 'Em andamento'}</h2><span>${counts.length} ${counts.length === 1 ? 'contagem' : 'contagens'}</span></div>${counts.slice().reverse().map(count => `<article class="list-row"><div class="list-icon ${count.status}">${icon(count.status === 'done' ? 'check' : count.status === 'review' ? 'shield' : 'list')}</div><div class="list-info"><h2>${escapeHTML(count.name)}</h2><p>${dateLabel(count.date)}<span>·</span>${count.items.length} ${count.items.length === 1 ? 'item' : 'itens'}<span>·</span>${stats(count).divergent} ${stats(count).divergent === 1 ? 'divergência' : 'divergências'}</p></div><span class="status-tag ${count.status}">${status(count)}</span><button class="button ${count.status === 'review' ? 'secondary' : ''}" data-open="${count.id}">${count.status === 'done' ? 'Consultar' : count.status === 'review' ? 'Retomar revisão' : 'Continuar'}${icon('arrow')}</button></article>`).join('')}</section>` : `<section class="empty-dashboard card"><div class="empty-content"><span class="intro-badge">${icon('box')}CADA ITEM CONTA</span><h2>${history ? 'Sua história começa<br>na primeira contagem.' : 'Tudo no lugar.<br>Comece pela contagem.'}</h2><p>Registre o que está no sistema, conte o estoque físico e revise cada item com tranquilidade.</p><button class="button primary" id="empty-new">Criar primeira contagem${icon('arrow')}</button><span class="empty-footnote">Simples de usar. Fácil de conferir.</span></div><div class="inventory-art" aria-hidden="true"><div class="art-grid"></div><div class="art-sheet"><div class="art-sheet-head"><span class="art-logo">✓</span><span></span><i></i></div><div class="art-line"><b>01</b><div><span></span><small></small></div><i>✓</i></div><div class="art-line"><b>02</b><div><span></span><small></small></div><i>✓</i></div><div class="art-line"><b>03</b><div><span></span><small></small></div><i>✓</i></div><div class="art-sheet-bottom"><span></span><span></span></div></div><div class="art-check">${icon('check')}</div><div class="art-box">${icon('box')}</div><span class="art-caption">Um item por vez. Tudo conferido.</span></div></section>`}<div class="how-it-works" aria-label="Como funciona">${[['01', 'list', 'Registre os itens', 'Nome, unidade e saldo do sistema.'], ['02', 'box', 'Conte o estoque físico', 'Anote a quantidade que está nas suas mãos.'], ['03', 'check', 'Revise com atenção', 'Um item por tela, até estar tudo conferido.']].map(([number, symbol, title, description]) => `<div class="how-step"><span class="how-icon">${icon(symbol)}</span><div><h3><small>${number}</small>${title}</h3><p>${description}</p></div></div>`).join('')}</div><section class="backup-panel" aria-label="Backup dos dados"><span class="backup-icon">${icon('shield')}</span><div><h2>Uma cópia a mais, uma preocupação a menos.</h2><p>Seus dados ficam neste navegador. Exporte um backup para guardar uma cópia com você.</p></div><div class="backup-actions"><button class="button small" id="export">${icon('download')}Exportar backup</button><button class="button quiet small" id="import">${icon('upload')}Importar</button></div></section><div class="app-footnote"><span class="tiny-dot"></span>Feito para conferir com calma e seguir com confiança.</div>`;
  $('#new-count').onclick = openNew; $('#empty-new')?.addEventListener('click', openNew);
  document.querySelectorAll('[data-open]').forEach(button => button.onclick = () => {
    if (!saveChange(() => { db.activeId = button.dataset.open; })) return;
    page = 'counts'; query = ''; filter = 'all'; completedDetails = false; selected = current().items[current().cursor || 0]?.id; render();
  });
  $('#export').onclick = exportBackup; $('#import').onclick = () => $('#import-file').click();
}
function openNew() { $('#new-form').reset(); $('#new-form').elements.date.value = today(); $('#new-dialog').showModal(); }

$('#new-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.target, name = form.elements.name.value.trim(); if (!name) return;
  const firstItem = {id: uid(), name: '', code: '', unit: 'un', system: '', physical: ''};
  const count = {id: uid(), name, date: form.elements.date.value, status: 'counting', items: [firstItem], copied: [], cursor: 0, versions: []};
  if (!saveChange(() => { db.counts.push(count); db.activeId = count.id; })) return;
  page = 'counts'; selected = firstItem.id; query = ''; filter = 'all'; completedDetails = false;
  $('#new-dialog').close(); render(); document.querySelector(`tr[data-id="${firstItem.id}"] .item-name`)?.focus();
});
$('#cancel-new').onclick = () => $('#new-dialog').close();
$('#nav-counts').onclick = leaveCount;
$('#nav-history').onclick = () => { if (persist()) { page = 'history'; render(); } };
$('#help').onclick = () => alert('Confere — contagem de estoque.\n\n1. Registre o saldo do sistema e a quantidade física. Vazio significa pendente; zero é válido.\n2. Vá para revisão: cada item aparece em uma tela dedicada, sem a tabela.\n3. Confirme os itens para finalizar. Você pode pausar e continuar depois.\n\nun e cx aceitam inteiros. kg, g, L e m aceitam até 3 casas decimais.\n\nOs dados são salvos apenas neste navegador. Exporte backups regularmente. Use uma aba por vez.');
function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], {type: 'application/json'}), url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = `confere-backup-${today()}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function validateBackup(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.counts) || value.counts.length > 10000) throw Error('Formato de backup inválido');
  const ids = new Set();
  for (const c of value.counts) {
    if (!c || typeof c.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(c.id) || ids.has(c.id) || typeof c.name !== 'string' || !c.name.trim() || typeof c.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.date) || !Number.isFinite(Date.parse(c.date)) || !['counting', 'review', 'done'].includes(c.status) || !Array.isArray(c.items) || !Array.isArray(c.copied) || !Number.isInteger(c.cursor) || c.cursor < 0 || c.cursor >= Math.max(c.items.length, 1)) throw Error('Contagem inválida');
    ids.add(c.id); const rows = new Set();
    for (const i of c.items) {
      if (!i || typeof i.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(i.id) || rows.has(i.id) || !Object.hasOwn(units, i.unit) || !['name', 'code', 'system', 'physical'].every(key => typeof i[key] === 'string')) throw Error('Item inválido');
      rows.add(i.id);
    }
    if (c.copied.some(id => !rows.has(id)) || new Set(c.copied).size !== c.copied.length) throw Error('Progresso inválido');
    if (c.status !== 'counting' && (!c.items.length || c.items.some(i => !valid(i)))) throw Error('Revisão incompleta');
    if (c.status === 'done' && c.copied.length !== c.items.length) throw Error('Finalização inválida');
  }
  if (value.activeId !== null && !ids.has(value.activeId)) throw Error('Contagem ativa inválida');
}
$('#import-file').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 10000000) throw Error('Arquivo maior que 10 MB');
    const incoming = JSON.parse(await file.text()); validateBackup(incoming);
    if (!confirm(`Backup validado: ${incoming.counts.length} contagem(ns). Importar como cópias, sem substituir seus registros?`)) return;
    const copies = incoming.counts.map(count => { const copy = structuredClone(count); copy.id = uid(); return copy; });
    const next = {...db, counts: [...db.counts, ...copies]}; localStorage.setItem(KEY, JSON.stringify(next));
    db = next; saveOK = true; page = 'history'; render(); toast('Backup importado. Seus registros anteriores foram preservados.');
  } catch (error) { toast('Não foi possível importar: ' + error.message); }
  finally { event.target.value = ''; }
};
render();
