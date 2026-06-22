function addToScenario(res) {
  if (!S.prog || !S.cand) return;
  // pick proper scenario for this target program — prefer existing matching anchor, then empty slot
  var targetSc = pickScenarioForProgram(S.prog, 'sostituzione');
  var sc = S.scenarios[targetSc];
  var scenarioName = (sc.customName || (sc.anchor ? sc.anchor.title : null) || ('Scenario ' + targetSc));
  if (sc.items.length >= 3) return showToast('⚠️ ' + scenarioName + ' ha già 3 sostituzioni (massimo).');
  var exists = sc.items.find(function(i){ return i.orig.id === S.prog.id && i.cand.id === S.cand.id; });
  if (exists) return showToast('ℹ️ Combinazione già presente in ' + scenarioName + '.');
  sc.anchor = sc.anchor || S.prog;
  // mark scenario type (sostituzione / spostamento) for clarity
  sc.type = sc.type || S.mode || null;
  var itemDate = S.date || formatDateToISOLocal(new Date());
  sc.items.push({ orig: S.prog, cand: S.cand, date: itemDate, res: res });
  sc.createdAt = sc.createdAt || (new Date()).toISOString();
  var anchorName = sc.customName || (sc.anchor ? sc.anchor.title : ('Scenario ' + targetSc));
  showToast('\u2705 Aggiunto a \u2014 ' + anchorName + ' (' + sc.items.length + '/3)');
  // switch active scenario to the one we used
  S.activeScen = targetSc;
  render();
  // if the Scenari page is visible, re-render it so the list updates immediately
  try { if (document.getElementById('sec-scen').classList.contains('active')) renderScenariView(); } catch(e){}
}

// Find first free scenario: prefer completely empty, otherwise first with space (<3), else create new
function findFreeScenario() {
  var keys = Object.keys(S.scenarios).map(Number).filter(function(n){ return !isNaN(n) && n >= 1; });
  var maxIdx = keys.length ? Math.max.apply(null, keys) : 4;
  for (var k=1; k<=maxIdx; k++) { if (!S.scenarios[k] || !S.scenarios[k].items || S.scenarios[k].items.length === 0) return k; }
  for (var k2=1; k2<=maxIdx; k2++) { if (S.scenarios[k2] && S.scenarios[k2].items.length < 3) return k2; }
  // All full — create new scenario slot
  var newIdx = maxIdx + 1;
  S.scenarios[newIdx] = { items: [], anchor: null, type: null };
  return newIdx;
}

// Save a spostamento simulation into a scenario (creates a candidate-like entry)
function addMoveToScenario(res) {
  if (!S.prog) return showToast('Nessun programma selezionato da salvare.');
  // choose scenario respecting anchor/type and capacity
  var idx = pickScenarioForProgram(S.prog, 'spostamento');
  var sc = S.scenarios[idx];
  sc.anchor = sc.anchor || S.prog;
  sc.type = sc.type || S.mode || 'spostamento';
  var scenarioName = sc.customName || (sc.anchor ? sc.anchor.title : null) || ('Scenario ' + idx);
  if (sc.items.length >= 3) return showToast('⚠️ ' + scenarioName + ' è pieno.');
  // avoid duplicate identical move
  var exists = sc.items.find(function(i){ return i.orig && i.orig.id === S.prog.id && i.cand && i.cand.id === 'move' && i.date === (S.spDestDay || S.date) && (i.destTime || '') === (S.spDestTime || ''); });
  if (exists) return showToast('ℹ️ Spostamento già presente per ' + S.prog.title + '.');
  var cand = { id: 'move', title: 'Spostamento', tipo: S.prog.tipo };
  sc.items.push({ orig: S.prog, cand: cand, date: S.spDestDay || S.date, destTime: S.spDestTime || null, res: res });
  sc.createdAt = sc.createdAt || (new Date()).toISOString();
  showToast('✅ Aggiunto a — ' + S.prog.title + ' (' + sc.items.length + '/3)');
  S.activeScen = idx;
  // record last saved move key to keep the UI in sync
  try {
    var key = (S.prog && S.prog.id ? S.prog.id : '') + '|' + (S.spDestDay || S.date || '') + '|' + (S.spDestTime || '');
    S._lastSavedKey = key; S._lastSavedIdx = idx;
  } catch(e) {}
  render();
  try { if (document.getElementById('sec-scen').classList.contains('active')) renderScenariView(); } catch(e){}
}

// Remove an item from a scenario by index. If scenario becomes empty, clear anchor/type.
function removeFromScenario(sIdx, itemIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc || !sc.items || sc.items.length === 0) return showToast('Nessun elemento da rimuovere.');
  if (itemIdx < 0 || itemIdx >= sc.items.length) return showToast('Indice non valido.');
  sc.items.splice(itemIdx,1);
  if (sc.items.length === 0) { sc.anchor = null; sc.type = null; sc.createdAt = null; }
  showToast('Elemento rimosso da Scenario ' + sIdx + '.');
  render();
  try { if (document.getElementById('sec-scen').classList.contains('active')) renderScenariView(); } catch(e){}
}

function addSimToScenario(sIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc || !sc.anchor) return showToast('Scenario senza programma target.');
  if (sc.items.length >= 3) return showToast('Scenario pieno (3/3).');
  var mode = sc.type || 'sostituzione';
  S.mode = mode;
  
  // Reset filtri
  S.cand = null;
  S.ch = null;
  S.date = null;
  S.slot = null;
  S._search = '';
  S._candCh = null;
  S._candSlot = null;
  S._candSearch = '';
  S._candGenere = null;
  S._candEta = null;
  S._candShare = null;
  S._viewSim = false;
  S._simResult = null;
  S._simSaved = false;
  S.showComp = false;
  S.activeScen = sIdx;
  
  if (mode === 'spostamento') {
    // Per spostamento: vai allo step 3 (Destinazione) con il programma già impostato
    S.prog = sc.anchor;
    S.step = 2; // step 2 = Destinazione (terzo step: 0,1,2,3)
    S.spDestCh = null;
    S.spDestDay = null;
    S.spDestTime = null;
    S.spDestTimeEnd = null;
    S._srcLoaded = false;
    S._destLoaded = false;
    S._spSimulated = false;
  } else {
    // Per sostituzione: ricomincia da step 0
    S.prog = null;
    S.step = 0;
  }
  
  forceShowSection('sec-sim', 'Simulazione');
  try { document.getElementById('sim-landing').style.display = 'none'; document.getElementById('sim-flow').style.display = 'block'; } catch(e){}
  try {
    document.getElementById('sec-sim').classList.add('active');
    document.getElementById('sec-prog').classList.remove('active');
    document.getElementById('sec-scen').classList.remove('active');
  } catch(e){}
  setActiveNav(mode === 'sostituzione' ? 'nav-sost' : 'nav-sposta');
  render();
}

function editScenarioItem(sIdx, itemIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc || !sc.items || !sc.items[itemIdx]) return showToast('Elemento non trovato.');
  var it = sc.items[itemIdx];
  // determine mode
  var mode = (it.cand && it.cand.id === 'move') ? 'spostamento' : 'sostituzione';
  // open the simulation flow first (this resets S.step to 0 internally)
  launchMode(mode);
  // then restore state for editing
  S.mode = mode;
  S.activeScen = sIdx;
  S.prog = it.orig || null;
  S.cand = (mode === 'sostituzione') ? it.cand || null : null;
  if (mode === 'spostamento') {
    S.spDestDay = it.date || formatDateToISOLocal(new Date());
    S.spDestTime = it.destTime || null;
    S._spSimulated = !!it.res;
    if (it.res) {
      S._simResult = { items: [{ orig: it.orig, cand: it.cand, date: it.date, destTime: it.destTime, res: it.res }] };
      S._viewSim = true;
    }
    // go to destination step so user can re-run or edit
    S.step = 2;
  } else {
    // substitution: S.prog + S.cand + step=3 is enough — buildScenari() sostituzione block recalculates automatically
    S._viewSim = false;
    S._simResult = null;
    S.step = 3;
  }
  render();
}

function emptyScenario(sIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc) return showToast('Scenario non trovato.');
  if (!sc.items || !sc.items.length) return showToast('Lo scenario è già vuoto.');
  sc.items = [];
  sc.createdAt = null;
  if (typeof saveState === 'function') saveState();
  render();
  showToast('Scenario svuotato.');
}


function createScenarioReportHtml(sIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc) return '<p>Scenario non trovato.</p>';
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>Report Scenario ' + sIdx + '</title>' +
    '<style>body{font-family:Segoe UI,system-ui; padding:20px;color:#111} h1{font-size:18px} table{width:100%;border-collapse:collapse;margin-top:12px} td,th{border:1px solid #ddd;padding:8px;text-align:left} .muted{color:#666;font-size:13px}</style></head><body>';
  html += '<h1>Report — Scenario ' + sIdx + '</h1>';
  var scName = sc.title || (sc.anchor ? sc.anchor.title : 'Libero');
  html += '<div class="muted">Nome: ' + scName + ' · Tipo: ' + (sc.type || 'N/A') + ' · Elementi: ' + (sc.items.length||0) + '</div>';
  html += '<table><thead><tr><th>Origine</th><th>Destinazione</th><th>Data</th><th>Orario</th><th>Previsto</th><th>Delta</th></tr></thead><tbody>';
  (sc.items||[]).forEach(function(it){
    var dest = (it.cand && it.cand.id === 'move') ? (it.destTime||it.date||'Spostamento') : (it.cand && it.cand.title ? it.cand.title : '—');
    var pred = (it.res && typeof it.res.pred === 'number') ? it.res.pred.toFixed(1) + '%' : '—';
    var delta = (it.res && typeof it.res.pred === 'number') ? ((it.res.pred - (it.orig.share||0))>=0? '+' : '') + (it.res.pred - (it.orig.share||0)).toFixed(1) + ' pp' : '—';
    html += '<tr><td>' + (it.orig.title||'') + '</td><td>' + dest + '</td><td>' + (it.date||'—') + '</td><td>' + (it.destTime||'—') + '</td><td>' + pred + '</td><td>' + delta + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '</body></html>';
  return html;
}

function editScenarioTitle(sIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc) return showToast('Scenario non trovato.');
  var cur = sc.title || (sc.anchor ? sc.anchor.title : 'Libero');
  var v = prompt('Nuovo nome scenario', cur);
  if (v === null) return; // cancelled
  v = v.trim();
  if (!v) return showToast('Nome non valido.');
  sc.title = v;
  if (typeof saveState === 'function') saveState();
  render();
  showToast('Nome scenario aggiornato.');
}

function startEditScenarioTitle(sIdx) {
  S._editingScenarioTitle = sIdx;
  render();
  // focus input after render
  setTimeout(function(){ var el = document.getElementById('sc-title-input-' + sIdx); if (el) { el.focus(); el.select(); } }, 60);
}

function saveScenarioTitle(sIdx) {
  var el = document.getElementById('sc-title-input-' + sIdx);
  if (!el) return showToast('Input non trovato.');
  var v = el.value.trim();
  if (!v) return showToast('Nome non valido.');
  var sc = S.scenarios[sIdx]; if (!sc) return showToast('Scenario non trovato.');
  sc.title = v;
  S._editingScenarioTitle = null;
  if (typeof saveState === 'function') saveState();
  render();
  showToast('Nome scenario aggiornato.');
}

function cancelScenarioTitle(sIdx) {
  S._editingScenarioTitle = null;
  render();
}

function printScenarioReport(sIdx) {
  var h = createScenarioReportHtml(sIdx);
  // Use data URL to avoid file:// origin restrictions when opened from local file
  try {
    var dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(h);
    var w = window.open(dataUrl, '_blank');
    if (!w) return showToast('Impossibile aprire la finestra di stampa (popup bloccato).');
    setTimeout(function(){ try { w.print(); } catch(e){} }, 500);
  } catch(e) { showToast('Errore apertura finestra di stampa'); }
}

function mailScenarioReport(sIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc) return showToast('Scenario non trovato.');
  var subject = encodeURIComponent('Report Scenario ' + sIdx);
  var bodyLines = [];
  bodyLines.push('Scenario ' + sIdx + ' — ' + (sc.anchor ? sc.anchor.title : 'Libero'));
  bodyLines.push('Tipo: ' + (sc.type || 'N/A') + ' · Elementi: ' + (sc.items.length||0));
  bodyLines.push('');
  (sc.items||[]).forEach(function(it,idx){
    var dest = (it.cand && it.cand.id === 'move') ? (it.destTime||it.date||'Spostamento') : (it.cand && it.cand.title ? it.cand.title : '—');
    var pred = (it.res && typeof it.res.pred === 'number') ? it.res.pred.toFixed(1)+'%' : '—';
    var delta = (it.res && typeof it.res.pred === 'number') ? ((it.res.pred - (it.orig.share||0))>=0? '+' : '') + (it.res.pred - (it.orig.share||0)).toFixed(1) + ' pp' : '—';
    bodyLines.push((idx+1) + '. ' + it.orig.title + ' → ' + dest + ' · ' + pred + ' · ' + delta);
  });
  var body = encodeURIComponent(bodyLines.join('\n'));
  window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
}

// Cancella completamente uno scenario: svuota elementi, rimuove anchor e metadata
function clearScenario(sIdx) {
  var sc = S.scenarios[sIdx];
  if (!sc) return showToast('Scenario non trovato.');
  if (!sc.items || sc.items.length === 0) {
    // nothing to clear, but still reset metadata
    sc.items = [];
    sc.anchor = null; sc.type = null; sc.createdAt = null;
    showToast('Scenario ' + sIdx + ' ripristinato.');
    render();
    return;
  }
  if (!confirm('Eliminare completamente lo Scenario ' + sIdx + '? Questa operazione rimuoverà tutti gli elementi salvati.')) return;
  sc.items = [];
  sc.anchor = null;
  sc.type = null;
  sc.createdAt = null;
  showToast('Scenario ' + sIdx + ' eliminato.');
  render();
}

// Choose a scenario slot for a given target program.
function pickScenarioForProgram(prog, mode) {
  mode = mode || S.mode;
  if (!prog) return S.activeScen || 1;
  var keys = Object.keys(S.scenarios).map(Number).filter(function(n){ return !isNaN(n) && n >= 1; });
  var maxIdx = keys.length ? Math.max.apply(null, keys) : 4;
  // 1) prefer scenario already anchored to this exact program AND with the same type
  for (var k=1; k<=maxIdx; k++) {
    var s = S.scenarios[k];
    if (s && s.anchor && s.anchor.id === prog.id && s.type === mode) return k;
  }
  // 2) prefer the first completely empty scenario (lowest index)
  for (var i=1; i<=maxIdx; i++) {
    var si = S.scenarios[i];
    if (si && !si.anchor && (!si.items || si.items.length === 0)) return i;
  }
  // 3) if no empty scenario, try to find a scenario with same type that has space (<3)
  for (var j=1; j<=maxIdx; j++) {
    var sj = S.scenarios[j];
    if (sj && sj.type === mode && sj.items.length < 3) return j;
  }
  // 4) try any scenario with space
  for (var m=1; m<=maxIdx; m++) { if (S.scenarios[m] && S.scenarios[m].items.length < 3) return m; }
  // 5) all full — create a new scenario slot automatically
  var newIdx = maxIdx + 1;
  S.scenarios[newIdx] = { items: [], anchor: null, type: null };
  showToast('ℹ️ Creato automaticamente Scenario ' + newIdx + '.');
  return newIdx;
}

function simulateThis() {
  if (!S.prog || !S.cand) return showToast('Seleziona prima il programma e il candidato.');
  // check target scenario capacity before running simulation
  var targetSc = pickScenarioForProgram(S.prog, S.mode);
  try {
    var scObj = S.scenarios[targetSc];
    if (scObj && scObj.items && scObj.items.length >= 3) {
      var scenarioName = scObj.customName || (scObj.anchor ? scObj.anchor.title : null) || ('Scenario ' + targetSc);
      return showToast('⚠️ ' + scenarioName + ' ha già 3 elementi: non è possibile simulare ulteriormente per questo scenario.');
    }
  } catch(e) { /* ignore */ }
  var res = predictShare(S.prog, S.cand);
  S._simResult = { items: [{ orig: S.prog, cand: S.cand, date: S.date, res: res }] };
  S._viewSim = true;
  S.step = getSteps().length - 1;
  render();
  // do not force the right panel visible here; allow final result to take full width
}
