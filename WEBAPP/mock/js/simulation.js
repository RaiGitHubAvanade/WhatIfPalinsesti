/* ================================================================
   STEPS
================================================================ */
console.log('✅ simulation.js caricato!');

function getSteps() {
  var s3 = S.mode === 'sostituzione' ? 'Programmi Sostitutivi' : (S.mode === 'spostamento' ? 'Destinazione' : 'Configura');
  return ['Seleziona Programma', 'Tipo di Simulazione', s3, 'Risultato Simulazione'];
}
function nextStep() { var steps = getSteps(); if (S.step < steps.length - 1) { S.step++; S._showCompRes = false; render(); } }
function prevStep() { if (S.step > 0) { S.step--; S._showCompRes = false; render(); } }

/* ================================================================
   HELPER FUNCTIONS
================================================================ */
// Map età field to age range
function mapEtaToRange(eta) {
  if (!eta || eta === 'Tutti') return 'Tutti';
  // Map existing eta values to new ranges
  if (eta.indexOf('15') === 0 || eta === '18-24' || eta === '15-34') return '15-24';
  if (eta.indexOf('25') === 0 || eta === '18-44' || eta === '25-54' || eta === '35-54') return '25-44';
  if (eta.indexOf('45') === 0 || eta === '35-64' || eta === '45-64') return '45-64';
  if (eta.indexOf('55') === 0 || eta.indexOf('65') === 0) return '65+';
  return 'Tutti';
}

/* ================================================================
   RENDER
================================================================ */
function render() { updateFlowTitle(); renderProgBar(); renderStepArea(); renderRightPanel(); updateCtxBar(); toggleRightPanelVisibility();
  }

function updateFlowTitle() {
  if (!S.mode) return;
  var titleText = S.mode === 'sostituzione' ? '🔄 Sostituzione' : (S.mode === 'spostamento' ? '🕐 Spostamento' : 'Simulazione');
  try { 
    var tbTitle = document.getElementById('tb-title');
    if (tbTitle) {
      tbTitle.textContent = titleText;
    }
  } catch(e) {
    console.warn('updateFlowTitle failed', e);
  }
}

function renderProgBar() {
  var steps = getSteps();
  var html = '';
  steps.forEach(function(lbl, i) {
    var cls = i < S.step ? 'done' : i === S.step ? 'active' : 'future';
    html += '<div class="prog-step ' + cls + '"><div class="prog-circ ' + cls + '">' + (cls === 'done' ? '✓' : (i + 1)) + '</div><span class="prog-lbl">' + lbl + '</span></div>';
    if (i < steps.length - 1) html += '<div class="prog-line' + (i < S.step ? ' done' : '') + '"></div>';
  });
  document.getElementById('prog-bar').innerHTML = html;
}

function renderStepArea() {
  try {
    if (DEBUG) console.log('renderStepArea: mode=', S.mode, 'step=', S.step);
    var el = document.getElementById('step-area');
    if (!el) throw new Error('Elemento #step-area non trovato nel DOM');
    // Unified 4-step flow: step 0 = Seleziona Programma, step 1 = Tipo di Simulazione, step 2 = Configura, step 3 = Risultato
    if (S.step === 0) {
      el.innerHTML = buildSelectProgram();
    } else if (S.step === 1) {
      el.innerHTML = buildModeChoice();
    } else if (S.step === 2) {
      if (S.mode === 'sostituzione') el.innerHTML = buildCandidates();
      else el.innerHTML = buildSpostaDestinazione();
    } else {
      el.innerHTML = buildScenari();
    }
    attachStepEvents();
  } catch (err) {
    console.error('Errore in renderStepArea:', err);
    var el = document.getElementById('step-area');
    if (el) el.innerHTML = '<div class="card"><div class="sect-label">Errore</div><div style="color:var(--danger);padding:12px;white-space:pre-wrap;">' + (err && err.stack ? err.stack : String(err)) + '</div></div>';
    try { showToast('Errore render: vedi console per dettagli'); } catch(e){}
  }
}

/* ================================================================
   FILTRI (deselezionabili) + LIVE SEARCH RESULTS
================================================================ */
function buildFilterChips() {
  var chips = [];
  if (S.ch) chips.push({k:'ch', label:'Canale', val:S.ch});
  if (S.date) chips.push({k:'date', label:'Data', val:fmtDate(S.date)});
  if (S.slot) {
    var _sv;
    if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(S.slot)) _sv = S.slot.split('-')[0] + ' – ' + S.slot.split('-')[1];
    else if (/^\d{2}:\d{2}-$/.test(S.slot)) _sv = 'dalle ' + S.slot.slice(0,5);
    else if (/^-\d{2}:\d{2}$/.test(S.slot)) _sv = 'alle ' + S.slot.slice(1);
    else _sv = S.slot;
    chips.push({k:'slot', label:'Orario', val:_sv});
  }
  
  if (S._search) chips.push({k:'search', label:'Ricerca', val:'"' + S._search + '"'});
  if (!chips.length) return '';
  var h = '<div class="filter-chips">';
  chips.forEach(function(c){
    h += '<span class="chip"><span>' + c.label + ': <strong>' + c.val + '</strong></span><span class="x" role="button" tabindex="0" data-clear="' + c.k + '">×</span></span>';
  });
  h += '</div>';
  return h;
}

function buildFilters() {
  var slots = ['06:00','08:00','12:00','14:00','18:00','20:30','23:00','01:00'];
  var tipos = ['News','Show','Serie','Film','Doc','Talk','Reality','Game','Sport','Inchiesta','Soap'];
  var eta = ['Tutti','15-34','25-54','55+'];
  var sesso = ['Tutti','Uomo','Donna'];
  var shares = ['10-15%','15-20%','20%+'];

  var h = '<div class="card" style="margin-top:-10px">';
  h += '<div class="sect-label">Filtri Palinsesto</div>';
  // active filter chips
  h += buildFilterChips();
  h += '<div class="body-scroll">';

  // compact filters layout
  h += '<div class="filters-compact">';
  h += '<div class="filters-row"><div class="filters-label">Canale</div><div id="ch-grp" class="filters-row">';
  ['Rai 1','Rai 2','Rai 3'].forEach(function(c){ h += '<button class="btn-filter' + (S.ch === c ? ' on' : '') + ' tgl" data-ch="' + c + '">' + c + '</button>'; });
  h += '</div></div>';

  h += '<div class="f-row"><span class="f-label">Giorno</span><input type="date" id="date-inp" min="' + formatDateToISOLocal(new Date()) + '" value="' + (S.date || formatDateToISOLocal(new Date())) + '"></div>';

  var _tFrom1='', _tTo1='';
  if (S.slot && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(S.slot)){ _tFrom1=S.slot.split('-')[0]; _tTo1=S.slot.split('-')[1]; }
  else if (S.slot && /^\d{2}:\d{2}-$/.test(S.slot)){ _tFrom1=S.slot.slice(0,5); }
  else if (S.slot && /^-\d{2}:\d{2}$/.test(S.slot)){ _tTo1=S.slot.slice(1); }
  else if (S.slot && /^\d{2}:\d{2}$/.test(S.slot)){ _tFrom1=S.slot; }
  var _hoursOpts1 = function(sel){ var o='<option value="">--</option>'; for(var i=0;i<24;i++){var hh=String(i).padStart(2,'0')+':00'; o+='<option value="'+hh+'"'+(sel===hh?' selected':'')+'>'+hh+'</option>';} return o; };
  h += '<div class="f-row time-range-row"><span class="f-label">&#128336; Orario</span>';
  h += '<div class="time-range-wrap">';
  h += '<span class="time-range-lbl">dalle</span>';
  h += '<select id="time-from" class="time-select">' + _hoursOpts1(_tFrom1) + '</select>';
  h += '<span class="time-sep">–</span>';
  h += '<span class="time-range-lbl">alle</span>';
  h += '<select id="time-to" class="time-select">' + _hoursOpts1(_tTo1) + '</select>';
  if (S.slot) h += '<button class="time-clear-btn" id="time-clear-btn" title="Rimuovi filtro orario">×</button>';
  h += '</div></div>';

  // removed: Tipologia, Età, Genere, Durata, Share as per new simplified filter requirements

  h += '<div class="f-row"><span class="f-label">Cerca</span>';
  h += '<input type="search" id="prog-search" value="' + (S._search||'') + '" placeholder="Scrivi un titolo (es. Report)" style="flex:1;border:1.5px solid var(--border);border-radius:8px;padding:8px;font-size:13px;">';
  h += '</div>';

  h += '</div>'; // close filters-compact

  h += '<div id="quick-results" class="prog-list" style="margin-top:10px;"></div>';

  h += '</div>'; // close body-scroll

  h += '<div class="step-nav">';
  h += '<div></div>';
  // Auditel auto-popola i dati; il pulsante Carica Auditel è stato rimosso
  h += '<button class="btn-next" id="btn-next-0">Carica Palinsesto →</button>';
  h += '</div></div>';
  return h;
}

/* Combined view: Seleziona Programma */
function buildSelectProgram() {
  var PAGE_SIZE = 8;
  var _tFrom2='', _tTo2='';
  if (S.slot && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(S.slot)){ _tFrom2=S.slot.split('-')[0]; _tTo2=S.slot.split('-')[1]; }
  else if (S.slot && /^\d{2}:\d{2}-$/.test(S.slot)){ _tFrom2=S.slot.slice(0,5); }
  else if (S.slot && /^-\d{2}:\d{2}$/.test(S.slot)){ _tTo2=S.slot.slice(1); }
  else if (S.slot && /^\d{2}:\d{2}$/.test(S.slot)){ _tFrom2=S.slot; }
  var _ho=function(sel){var o='<option value="">--</option>';for(var i=0;i<24;i++){var hh=String(i).padStart(2,'0')+':00';o+='<option value="'+hh+'"'+(sel===hh?' selected':'')+'>'+hh+'</option>';}return o;};

  // Auto-reset paginazione quando i filtri cambiano
  var _fk0 = (S.ch||'')+'|'+(S.date||'')+'|'+(S.slot||'')+'|'+(S._search||'');
  if (_fk0 !== S._lastFilterKey0) { S._progPage = 1; S._lastFilterKey0 = _fk0; }
  if (!S._progPage || S._progPage < 1) S._progPage = 1;

  var h = '<div class="card psel-card">';

  // ── FILTER BAR (sempre visibile) ─────────────────────────────────────────
  h += '<div class="psel-filter-bar">';
  h += '<div class="psel-fg psel-fg-search"><span class="psel-fg-lbl">Cerca</span>';
  h += '<div class="psel-search-filter"><span class="psel-ico">\ud83d\udd0d</span>';
  h += '<input type="search" id="prog-search" autocomplete="off" value="' + (S._search||'').replace(/"/g,'&quot;') + '" placeholder="Titolo\u2026">';
  if (S._search) h += '<button class="psel-clear-x" id="btn-clear-search">\u00d7</button>';
  h += '</div></div>';
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Canale</span>';
  h += '<div class="psel-ch-grp" id="ch-grp">';
  ['Rai 1','Rai 2','Rai 3'].forEach(function(c){ h += '<button class="psel-ch-pill tgl' + (S.ch===c?' on':'') + '" data-ch="' + c + '">' + c + '</button>'; });
  h += '</div></div>';
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Data</span>';
  h += '<div class="psel-date-wrap">';
  h += '<input type="date" id="date-inp" class="psel-date-inp-hidden" min="' + formatDateToISOLocal(new Date()) + '" value="' + (S.date||formatDateToISOLocal(new Date())) + '">';
  h += '<button type="button" class="psel-date-display-btn" id="date-display-btn">' + fmtDate(S.date||formatDateToISOLocal(new Date())) + '</button>';
  h += '</div></div>';
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Orario</span>';
  h += '<div class="psel-time-inline">';
  h += '<span class="psel-time-lbl">Da</span>';
  h += '<select id="time-from" class="time-select">' + _ho(_tFrom2) + '</select>';
  h += '<span class="psel-time-lbl">A</span>';
  h += '<select id="time-to" class="time-select">' + _ho(_tTo2) + '</select>';
  if (S.slot) h += '<button class="time-clear-btn psel-time-clear" id="time-clear-btn">\u00d7</button>';
  h += '</div></div>';
  h += '</div>'; // psel-filter-bar

  // ── LISTA PROGRAMMI (sempre visibile, selezionato evidenziato) ────────────
  var filtered = applyFilters(PROGS, S._search);
  filtered.sort(function(a,b){var m=function(t){if(!t)return 0;var x=t.split(':');return Number(x[0])*60+Number(x[1]);};return m(a.time)-m(b.time);});
  var totalItems = filtered.length;
  var totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (S._progPage > totalPages) S._progPage = totalPages;
  var pageStart = (S._progPage - 1) * PAGE_SIZE;
  var pageEnd = Math.min(pageStart + PAGE_SIZE, totalItems);
  var pageItems = filtered.slice(pageStart, pageEnd);
  var lbl = S.ch ? (S.ch + ' \u00b7 ' + fmtDate(S.date)) : 'Tutti i canali';
  h += '<div class="psel-list-hdr psel-list-hdr-pad"><span class="psel-list-lbl">' + lbl + '</span><span class="psel-list-cnt">' + totalItems + ' programm' + (totalItems===1?'a':'i') + '</span></div>';
  if (!totalItems) {
    h += '<p class="psel-empty">Nessun programma trovato. Prova a modificare i filtri.</p>';
  } else {
    var _chCls={'Rai 1':'prow-r1','Rai 2':'prow-r2','Rai 3':'prow-r3'};
    h += '<div class="psel-list-body" id="prog-list-items">';
    pageItems.forEach(function(p){
      var sel = S.prog && S.prog.id === p.id;
      var sv = typeof p.share==='number' ? p.share.toFixed(1)+'%' : '\u2013';
      var sc = typeof p.share==='number' ? (p.share<10?' prow-low':(p.share>18?' prow-high':'')) : '';
      var cc = _chCls[p.ch]||'';
      h += '<div class="prow' + (cc?' '+cc:'') + (sel?' sel':'') + '" data-pid="' + p.id + '" tabindex="0">';
      h += '<span class="prow-time">' + p.time + (p.end?'<span class="prow-end">\u2013'+p.end+'</span>':'') + '</span>';
      h += '<div class="prow-body"><span class="prow-title">' + p.title + '</span>';
      var sub=[]; if(!S.ch)sub.push(p.ch); if(p.genre)sub.push(p.genre); if(p.dur)sub.push(p.dur+' min'); if(p.eta)sub.push(p.eta); if(p.sesso&&p.sesso!=='Tutti')sub.push(p.sesso);
      if(sub.length) h += '<span class="prow-sub">' + sub.join(' \u00b7 ') + '</span>';
      h += '</div><span class="prow-share' + sc + '">' + sv + '</span></div>';
    });
    h += '</div>'; // psel-list-body
    if (totalPages > 1) {
      h += '<div class="psel-pager" id="psel-pager-0">';
      h += '<button class="psel-pager-nav" data-page="prev"' + (S._progPage<=1?' disabled':'') + '>&#8592;</button>';
      var _pS=Math.max(1,S._progPage-2), _pE=Math.min(totalPages,S._progPage+2);
      if (_pS > 1) { h += '<button class="psel-pager-num" data-page="1">1</button>'; if (_pS > 2) h += '<span class="psel-pager-ell">&hellip;</span>'; }
      for (var _pi=_pS; _pi<=_pE; _pi++) h += '<button class="psel-pager-num' + (_pi===S._progPage?' active':'') + '" data-page="' + _pi + '">' + _pi + '</button>';
      if (_pE < totalPages) { if (_pE < totalPages-1) h += '<span class="psel-pager-ell">&hellip;</span>'; h += '<button class="psel-pager-num" data-page="' + totalPages + '">' + totalPages + '</button>'; }
      h += '<button class="psel-pager-nav" data-page="next"' + (S._progPage>=totalPages?' disabled':'') + '>&#8594;</button>';
      h += '<span class="psel-pager-info">' + (pageStart+1) + '\u2013' + pageEnd + ' di ' + totalItems + '</span>';
      h += '</div>';
    }
  }

  // ── ACTION BAR ──────────────────────────────────────────────────────────
  h += '<div class="psel-action-bar" id="psel-sel-bar">';
  if (S.prog) {
    var sv0 = typeof S.prog.share==='number' ? S.prog.share.toFixed(1)+'%' : null;
    h += '<div class="psel-sel-info psel-sel-active">';
    h += '<span class="psel-sel-tick">\u2713</span>';
    h += '<div class="psel-sel-prog-details">';
    h += '<span class="psel-sel-prog-name">' + S.prog.title + '</span>';
    
    // Tags: canale, genere, età (no share per il programma da sostituire)
    var progTags = [];
    progTags.push(S.prog.ch || 'N/A');
    var progGenereLabel = S.prog.sesso || 'Tutti';
    progTags.push('Genere: ' + progGenereLabel);
    var progEtaRange = mapEtaToRange(S.prog.eta);
    progTags.push('Età: ' + progEtaRange);
    h += '<span class="psel-sel-prog-tags">' + progTags.join(' · ') + '</span>';
    h += '</div>';
    if (sv0) h += '<span class="psel-sel-prog-share">' + sv0 + '</span>';
    h += '<button class="psel-deselect-btn" id="btn-deselect-prog" title="Deseleziona programma">\u00d7</button>';
    h += '</div>';
    h += '<button class="btn-next" id="btn-next-0">Tipo di Simulazione \u2192</button>';
  } else {
    h += '<div class="psel-sel-info psel-sel-empty">Nessun programma selezionato</div>';
    h += '<button class="btn-next" id="btn-next-0" disabled>Tipo di Simulazione \u2192</button>';
  }
  h += '</div>'; // psel-action-bar

  h += '</div>'; // card
  return h;
}
function renderQuickResults() {
  var box = document.getElementById('quick-results');
  if (!box) return;
  var q = (S._search||'').trim();
  if (!q) { box.innerHTML = '<div class="hint">Inizia a digitare per vedere i risultati.</div>'; return; }
  var list = applyFilters(PROGS, q).slice(0, 10);
  if (!list.length) { box.innerHTML = '<div class="hint">Nessun risultato: prova a togliere qualche filtro (cliccando sul filtro attivo).</div>'; return; }
  var h = '';
  list.forEach(function(p){
    h += '<div class="prog-card" data-qpid="' + p.id + '">' +
         '<div class="p-time">' + p.time + '–' + p.end + '</div>' +
         '<div class="p-info"><div class="p-title">' + p.title + '</div>' +
         '<div class="c-badges">' +
         '<span class="badge b-muted">' + p.ch + ' · ' + p.genre + '</span>' +
         '<span class="badge b-muted">Età: ' + p.eta + '</span>' +
         (p.sesso !== 'Tutti' ? '<span class="badge b-muted">' + p.sesso + '</span>' : '') +
         '</div></div>' +
         '<div class="p-share">' + (typeof p.share === 'number' ? p.share.toFixed(1) + '%' : '—') + '</div>' +
         '</div>';
  });
  box.innerHTML = h;
}

/* ================================================================
   STEP 1 — MODE CHOICE (Sostituzione vs Spostamento)
================================================================ */
function setSimMode(mode) {
  S.mode = mode;
  S._spSimulated = false;
  S.cand = null;
  S._simSaved = false;
  S._candCh = null; S._candSlot = null; S._candSearch = '';
  if (mode === 'spostamento') { S._srcLoaded = false; S._destLoaded = false; }
  S.step = 2;
  render();
}

function buildModeChoice() {
  var prog = S.prog;
  var h = '<div class="card">';
  // Compact program info bar (same style as step 2)
  h += '<div class="prog-recap-bar">';
  h += '<span class="prog-recap-lbl">Programma selezionato</span>';
  h += '<div class="prog-recap-info">';
  h += '<span class="prog-recap-tick">📌</span>';
  h += '<span class="prog-recap-name">' + prog.title + '</span>';
  h += '</div>';
  
  // Tags: Canale, Genere, Età (no share per il programma da sostituire)
  var metaItems = [];
  if (prog.ch) metaItems.push(prog.ch);
  var genereLabel = prog.sesso || 'Tutti';
  metaItems.push('Genere: ' + genereLabel);
  var etaRange = mapEtaToRange(prog.eta);
  metaItems.push('Età: ' + etaRange);
  
  h += '<div class="prog-recap-meta">' + metaItems.join(' · ') + '</div>';
  h += '</div>';
  h += '<div class="sect-label">Tipo di Simulazione</div>';
  h += '<div class="hint" style="margin-bottom:16px;">Scegli il tipo di operazione da effettuare sul programma selezionato.</div>';
  h += '<div class="mode-grid">';
  h += '<div class="mode-card mode-card-sost" id="mode-card-sost" onclick="setSimMode(\'sostituzione\')">';
  h += '<div class="mode-ico">🔄</div>';
  h += '<div class="mode-title">Sostituzione</div>';
  h += '<div class="mode-desc">Sostituisci questo programma con un&apos;alternativa editoriale nello stesso slot. Analizza l&apos;impatto sullo share.</div>';
  h += '</div>';
  h += '<div class="mode-card mode-card-sposta" id="mode-card-sposta" onclick="setSimMode(\'spostamento\')">';
  h += '<div class="mode-ico">🕐</div>';
  h += '<div class="mode-title">Spostamento</div>';
  h += '<div class="mode-desc">Sposta questo programma in un altro orario o giorno. Il sistema calcola l&apos;impatto sulla nuova collocazione.</div>';
  h += '</div>';
  h += '</div>';
  h += '<div class="step-nav">';
  h += '<button type="button" class="btn-back" id="btn-back-mode">← Seleziona Programma</button>';
  h += '</div></div>';
  return h;
}

/* ================================================================
   STEP 2 — CANDIDATES
================================================================ */
function buildCandidates() {
  var prog = S.prog;
  if (!prog) { S.step = 0; render(); return ''; }
  var PAGE_SIZE = 8;

  // Auto-reset paginazione quando i filtri cambiano
  var _fk2 = (S._candCh||'')+'|'+(S._candSearch||'')+'|'+(S._candGenere||'')+'|'+(S._candEta||'')+'|'+(S._candShare||'');
  if (_fk2 !== S._lastFilterKey2) { S._candPage = 1; S._lastFilterKey2 = _fk2; }
  if (!S._candPage || S._candPage < 1) S._candPage = 1;

  var h = '<div class="card psel-card">';

  // ── Target recap (minimal, uniformato con step 0 e 1) ───────────────────────────────
  h += '<div class="psel-recap-bar">';
  h += '<span class="psel-recap-lbl">Programma da sostituire</span>';
  h += '<div class="psel-recap-info">';
  h += '<span class="psel-recap-tick">📌</span>';
  h += '<span class="psel-recap-name">' + prog.title + '</span>';
  h += '</div>';
  h += '<div class="psel-recap-meta">';
  
  // Tags: Canale, Genere, Età (no share per il programma da sostituire)
  var metaPills = [];
  if(prog.ch) metaPills.push(prog.ch);
  var genereLabel = prog.sesso || 'Tutti';
  metaPills.push('Genere: ' + genereLabel);
  var etaRange = mapEtaToRange(prog.eta);
  metaPills.push('Età: ' + etaRange);
  
  h += metaPills.join(' · ');
  h += '</div>';
  h += '</div>';

  // ── FILTER BAR (top, bloccata) ────────────────────────────────────────────
  h += '<div class="psel-filter-bar">';

  // Cerca
  h += '<div class="psel-fg psel-fg-search"><span class="psel-fg-lbl">Cerca</span>';
  h += '<div class="psel-search-filter"><span class="psel-ico">\ud83d\udd0d</span>';
  h += '<input type="search" id="prog-search" autocomplete="off" value="' + (S._candSearch||'').replace(/"/g,'&quot;') + '" placeholder="Titolo\u2026">';
  if (S._candSearch) h += '<button class="psel-clear-x" id="btn-clear-cand-search">\u00d7</button>';
  h += '</div></div>';

  // Canale (dropdown)
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Canale</span>';
  h += '<select id="cand-ch-select" class="psel-select">';
  h += '<option value="">—</option>';
  ['Rai 1','Rai 2','Rai 3'].forEach(function(c){ 
    h += '<option value="' + c + '"' + (S._candCh===c?' selected':'') + '>' + c + '</option>'; 
  });
  h += '</select></div>';

  // Genere (dropdown)
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Genere</span>';
  h += '<select id="cand-genere-select" class="psel-select">';
  h += '<option value="">—</option>';
  ['Uomo','Donna','Tutti'].forEach(function(g){ 
    h += '<option value="' + g + '"' + (S._candGenere===g?' selected':'') + '>' + g + '</option>'; 
  });
  h += '</select></div>';

  // Fascia d'età (dropdown)
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Fascia d\'età</span>';
  h += '<select id="cand-eta-select" class="psel-select">';
  h += '<option value="">—</option>';
  ['Tutti','15-24','25-44','45-64','65+'].forEach(function(e){ 
    h += '<option value="' + e + '"' + (S._candEta===e?' selected':'') + '>' + e + '</option>'; 
  });
  h += '</select></div>';

  // Fascia di share minima (dropdown)
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Fascia di share minima</span>';
  h += '<select id="cand-share-select" class="psel-select">';
  h += '<option value="">—</option>';
  ['10','20','30','40','50','60','70','80'].forEach(function(s){ 
    h += '<option value="' + s + '"' + (S._candShare===s?' selected':'') + '>' + s + '%</option>'; 
  });
  h += '</select></div>';

  h += '</div>'; // psel-filter-bar

  // Check if any filter is active
  var hasActiveFilter = !!(S._candCh || S._candSearch || S._candGenere || S._candEta || S._candShare);

  // ── LISTA CANDIDATI (paginata) ────────────────────────────────────────────
  if (!hasActiveFilter) {
    // No filters active: show empty state with instructions
    h += '<div class="psel-empty-state">';
    h += '<div class="psel-empty-icon">🔍</div>';
    h += '<div class="psel-empty-title">Seleziona i filtri per cercare programmi sostitutivi</div>';
    h += '<div class="psel-empty-desc">Utilizza i filtri sopra per trovare programmi compatibili con il programma da sostituire.</div>';
    h += '</div>';
  } else {
  var toMin = function(t){ if(!t)return 0; var x=t.split(':'); return Number(x[0])*60+Number(x[1]); };
  
  // Calculate target program duration
  var targetDuration = null;
  if (prog.time && prog.end) {
    var targetStart = toMin(prog.time);
    var targetEnd = toMin(prog.end);
    if (targetEnd < targetStart) targetEnd += 1440; // handle midnight crossing
    targetDuration = targetEnd - targetStart;
  }
  
  var candidates = PROGS.filter(function(p){
    if (p.id === prog.id) return false;
    if (S._candCh && p.ch !== S._candCh) return false;
    if (S._candSearch) { var q=S._candSearch.toLowerCase(); if ((p.title+' '+(p.genre||'')+' '+(p.tipo||'')).toLowerCase().indexOf(q)===-1) return false; }
    
    // Filter by genere (sesso) - allow "Tutti" to match everything
    if (S._candGenere) {
      if (S._candGenere !== 'Tutti' && p.sesso !== 'Tutti' && p.sesso !== S._candGenere) return false;
    }
    
    // Filter by età - allow "Tutti" to match everything
    if (S._candEta) {
      var pEtaRange = mapEtaToRange(p.eta);
      if (S._candEta !== 'Tutti' && pEtaRange !== 'Tutti' && pEtaRange !== S._candEta) return false;
    }
    
    // Filter by share minima - mostra programmi con share >= valore selezionato
    if (S._candShare && typeof p.share === 'number') {
      var minShare = parseInt(S._candShare, 10);
      if (!isNaN(minShare) && p.share < minShare) return false;
    }
    
    // Filter by duration: candidates must have similar duration to target (±60 minutes tolerance, flexible)
    if (targetDuration && p.time && p.end) {
      var candStart = toMin(p.time);
      var candEnd = toMin(p.end);
      if (candEnd < candStart) candEnd += 1440;
      var candDuration = candEnd - candStart;
      var durationDiff = Math.abs(candDuration - targetDuration);
      if (durationDiff > 60) return false; // Exclude if duration differs by more than 60 minutes (more flexible)
    }
    
    // Don't filter by share automatically - let users find alternatives regardless of share
    // This makes the filter more useful for exploration
    
    return true;
  });
  candidates.sort(function(a,b){ 
    // Sort by share descending
    return (b.share || 0) - (a.share || 0);
  });

  {
    var totalCand = candidates.length;
    var totalPages2 = Math.max(1, Math.ceil(totalCand / PAGE_SIZE));
    if (S._candPage > totalPages2) S._candPage = totalPages2;
    var cPageStart = (S._candPage - 1) * PAGE_SIZE;
    var cPageEnd = Math.min(cPageStart + PAGE_SIZE, totalCand);
    var cPageItems = candidates.slice(cPageStart, cPageEnd);
    
    h += '<div class="psel-list-hdr psel-list-hdr-pad"><span class="psel-list-lbl">Programmi trovati</span><span class="psel-list-cnt">' + totalCand + ' programm' + (totalCand===1?'a':'i') + '</span></div>';
    
    if (!totalCand) {
      h += '<p class="psel-empty">Nessun programma trovato con questi filtri. Prova a selezionare altri criteri o rimuovere alcuni filtri.</p>';
    } else {
      var _chCls2={'Rai 1':'prow-r1','Rai 2':'prow-r2','Rai 3':'prow-r3'};
      h += '<div class="psel-list-body" id="cand-list-items">';
      cPageItems.forEach(function(p){
        var sel=S.cand&&S.cand.id===p.id;
        var sv=typeof p.share==='number'?p.share.toFixed(1)+'%':'–';
        var cc=_chCls2[p.ch]||'';
        h += '<div class="prow' + (cc?' '+cc:'') + (sel?' sel':'') + '" data-cid="' + p.id + '" tabindex="0">';
        // No time display
        h += '<div class="prow-body"><span class="prow-title">' + p.title + '</span>';
        
        // Tags: SEMPRE mostrare canale, genere, età, fascia share
        var tags = [];
        
        // 1. Canale (sempre)
        tags.push(p.ch || 'N/A');
        
        // 2. Genere (sempre con label)
        var genereLabel = p.sesso || 'Tutti';
        tags.push('Genere: ' + genereLabel);
        
        // 3. Fascia d'età (sempre con label)
        var etaRange = mapEtaToRange(p.eta);
        tags.push('Età: ' + etaRange);
        
        h += '<span class="prow-sub">' + tags.join(' · ') + '</span>';
        h += '</div><span class="prow-share">' + sv + '</span></div>';
      });
      h += '</div>'; // psel-list-body
      if (totalPages2 > 1) {
        h += '<div class="psel-pager" id="psel-pager-2">';
        h += '<button class="psel-pager-nav" data-page="prev"' + (S._candPage<=1?' disabled':'') + '>&#8592;</button>';
        var _pS2=Math.max(1,S._candPage-2), _pE2=Math.min(totalPages2,S._candPage+2);
        if (_pS2 > 1) { h += '<button class="psel-pager-num" data-page="1">1</button>'; if (_pS2 > 2) h += '<span class="psel-pager-ell">&hellip;</span>'; }
        for (var _pi2=_pS2; _pi2<=_pE2; _pi2++) h += '<button class="psel-pager-num' + (_pi2===S._candPage?' active':'') + '" data-page="' + _pi2 + '">' + _pi2 + '</button>';
        if (_pE2 < totalPages2) { if (_pE2 < totalPages2-1) h += '<span class="psel-pager-ell">&hellip;</span>'; h += '<button class="psel-pager-num" data-page="' + totalPages2 + '">' + totalPages2 + '</button>'; }
        h += '<button class="psel-pager-nav" data-page="next"' + (S._candPage>=totalPages2?' disabled':'') + '>&#8594;</button>';
        h += '<span class="psel-pager-info">' + (cPageStart+1) + '\u2013' + cPageEnd + ' di ' + totalCand + '</span>';
        h += '</div>';
      }
    }
  }
  } // end else (hasActiveFilter)

  // ── ACTION BAR (bottom, bloccata) ─────────────────────────────────────────
  h += '<div class="psel-action-bar psel-simple-bar" id="cand-sel-bar">';
  h += '<button class="btn-back" id="btn-back-2">← Tipo di Simulazione</button>';
  if (S.cand) {
    h += '<button class="btn-next" id="btn-next-2">Risultato →</button>';
  } else {
    h += '<button class="btn-next" id="btn-next-2" disabled>Risultato →</button>';
  }
  h += '</div></div>';

  h += '</div>'; // card
  return h;
}

/* ================================================================
   SCENARI & COMPETITOR
================================================================ */

// Helper function to create persistent key for strong events
function getStrongEventKey(date, time, ch, title) {
  var d = date || S.date || '';
  var t = time || '';
  return (d + '|' + t + '|' + ch + '|' + title).toLowerCase();
}

// Helper function to load strong events for current context
function loadStrongEventsForContext(date, time) {
  if (!S._strongEventsStore) S._strongEventsStore = {};
  var contextKey = (date || S.date || '') + '|' + (time || '');
  var events = [];
  for (var key in S._strongEventsStore) {
    if (key.indexOf(contextKey) === 0 && S._strongEventsStore[key]) {
      events.push(key);
    }
  }
  return events;
}

function buildCompetitorBlock(forceExternal) {
  // Load strong events for current context
  var currentTime = S.prog ? S.prog.time : '';
  var strongEvents = loadStrongEventsForContext(S.date, currentTime);
  
  var list = getCompetitors(S.slot || (S.prog ? S.prog.slot : null), forceExternal);
  if (!S.showComp) return '<button class="btn-inline" id="btn-toggle-comp">Vedi Competitor</button>';
  
  // Check if there are any strong events
  var hasStrongEvents = strongEvents && strongEvents.length > 0;
  
  var h = '<div class="comp-panel"><div class="comp-head"><div class="ttl">Competitor nello slot</div><button class="btn-inline" id="btn-toggle-comp" style="padding:6px 10px;">Nascondi</button></div>';
  
  // Strong events warning
  if (hasStrongEvents) {
    h += '<div class="strong-event-warning">';
    h += '<span class="strong-event-icon">⚠️</span>';
    h += '<span class="strong-event-text">Rischio Competitor Alto</span>';
    h += '<span class="strong-event-count">' + strongEvents.length + (strongEvents.length === 1 ? ' evento forte' : ' eventi forti') + '</span>';
    h += '</div>';
  }
  
  if (!list.length) h += '<div class="hint">Nessun competitor disponibile per lo slot selezionato.</div>';
  else {
    h += '<div class="comp-cards-grid">';
    list.forEach(function(co, idx){
      var eventKey = getStrongEventKey(S.date, S.prog ? S.prog.time : '', co.ch, co.title);
      var isStrong = S._strongEventsStore && S._strongEventsStore[eventKey];
      h += '<div class="comp-card-item' + (isStrong ? ' comp-card-strong' : '') + '">' +
        '<div class="comp-card-top">' +
          '<span class="comp-share-pill">' + (typeof co.share === 'number' ? co.share + '%' : '—') + '</span>' +
        '</div>' +
        '<div class="comp-card-title">' + co.title + '</div>' +
        '<div class="comp-card-labels">' +
          '<span class="comp-label-pill comp-label-ch">' + co.ch + '</span>' +
          '<span class="comp-label-pill comp-label-tipo">' + co.tipo + '</span>' +
        '</div>' +
        '<button class="btn-strong-event' + (isStrong ? ' active' : '') + '" data-comp-key="' + eventKey + '" data-comp-ch="' + co.ch + '" data-comp-title="' + co.title + '" title="' + (isStrong ? 'Rimuovi evento forte' : 'Segna come evento forte') + '">' +
          (isStrong ? '✓ Evento Forte' : 'Segna come evento forte') +
        '</button>' +
      '</div>';
    });
    h += '</div>';
  }
  h += '</div>';
  return h;
}

// Return a list of competitor program summaries for a given logical slot id
function getCompetitors(slot, forceExternal) {
  try {
    // Try to use COMPS data first if available
    if (typeof COMPS !== 'undefined' && Array.isArray(COMPS) && COMPS.length > 0) {
      var compSlot = slot || 'prime';
      var filtered = COMPS.filter(function(c){ return c.slot === compSlot; });
      if (filtered.length > 0) {
        // Add small variation to shares to make them more realistic
        return filtered.slice(0,6).map(function(c, idx){ 
          var variance = (Math.sin(idx * 123.456) * 2.5); // -2.5 to +2.5
          var adjustedShare = Math.max(1, c.share + variance);
          return { 
            title: c.title, 
            ch: c.ch, 
            tipo: c.tipo, 
            share: Math.round(adjustedShare * 10) / 10, 
            evento: c.evento || false 
          }; 
        });
      }
    }
    
    if (typeof PROGS === 'undefined' || !Array.isArray(PROGS)) forceExternal = true;
    // prefer other-channel programs in the same slot, unless forceExternal is set
    var matches = (!forceExternal && slot) ? PROGS.filter(function(p){ return p.slot === slot && p.ch && !/^Rai/i.test(p.ch); }) : [];
    if (!matches || matches.length === 0) {
      // generate realistic synthetic competitors with varied shares
      var competitorData = [
        { ch: 'Canale 5', programs: [
          { title: 'Grande Fratello', tipo: 'Reality', share: 16.4 },
          { title: 'Striscia la Notizia', tipo: 'Satira', share: 15.6 },
          { title: 'Uomini e Donne', tipo: 'Talk Show', share: 18.2 },
          { title: 'Avanti un Altro!', tipo: 'Game Show', share: 14.5 }
        ]},
        { ch: 'Italia 1', programs: [
          { title: 'Le Iene', tipo: 'Informazione', share: 12.9 },
          { title: 'Chicago Fire', tipo: 'Serie TV', share: 8.4 },
          { title: 'NCIS', tipo: 'Serie TV', share: 7.8 },
          { title: 'Dragon Ball Super', tipo: 'Animazione', share: 5.2 }
        ]},
        { ch: 'Rete 4', programs: [
          { title: 'Quarta Repubblica', tipo: 'Talk Politico', share: 6.9 },
          { title: 'Dritto e Rovescio', tipo: 'Talk Politico', share: 7.3 },
          { title: 'Stasera Italia', tipo: 'Informazione', share: 5.8 },
          { title: 'Zona Bianca', tipo: 'Talk Show', share: 6.2 }
        ]},
        { ch: 'La7', programs: [
          { title: 'Otto e Mezzo', tipo: 'Informazione', share: 6.8 },
          { title: 'Piazzapulita', tipo: 'Talk Politico', share: 7.1 },
          { title: 'Di Martedì', tipo: 'Talk Politico', share: 6.5 },
          { title: 'In Onda', tipo: 'Informazione', share: 5.4 }
        ]},
        { ch: 'NOVE', programs: [
          { title: 'Che Tempo Che Fa', tipo: 'Talk Show', share: 8.9 },
          { title: 'Fratelli di Crozza', tipo: 'Satira', share: 7.6 },
          { title: 'Cash or Trash', tipo: 'Game Show', share: 3.2 },
          { title: 'Only Fun', tipo: 'Intrattenimento', share: 4.1 }
        ]},
        { ch: 'TV8', programs: [
          { title: 'X Factor', tipo: 'Talent Show', share: 5.8 },
          { title: '4 Ristoranti', tipo: 'Reality', share: 4.2 },
          { title: 'Italia\'s Got Talent', tipo: 'Talent Show', share: 6.3 },
          { title: 'Guess My Age', tipo: 'Game Show', share: 3.9 }
        ]}
      ];
      var out = [];
      for (var i = 0; i < competitorData.length; i++) {
        var r = hashToNumber((slot||'') + '|' + i);
        var progIdx = Math.floor(r * competitorData[i].programs.length);
        var prog = competitorData[i].programs[progIdx];
        // Add small random variation
        var variance = (Math.sin(i * 789.012) * 1.8); // -1.8 to +1.8
        var finalShare = Math.max(1, prog.share + variance);
        out.push({ title: prog.title, ch: competitorData[i].ch, tipo: prog.tipo, share: Math.round(finalShare * 10) / 10, evento: (r > 0.85) });
      }
      return out;
    }
    // map to normalized summary objects and cap to 6
    return matches.slice(0,6).map(function(p){ return { title: p.title || 'Programma', ch: p.ch || 'Altro', tipo: p.tipo || (p.genre||'—'), eta: p.eta || 'Tutti', sesso: p.sesso || 'Tutti', share: (typeof p.share === 'number' ? p.share : null), evento: p.evento || false }; });
  } catch(e) { console.error('getCompetitors error', e); return []; }
}

function buildScenari() {
  var h = '';
  // If we're in spostamento mode and a move simulation was just run, show its summary (not scenario target)
  if (S.mode === 'spostamento' && S._spSimulated) {
    var prog = S.prog;
    
    // Calcola share dello slot originale e destinazione
    var origSlotShare = prog.share; // default al programma
    var destSlotShare = prog.share; // default
    
    // Calcola share medio dello slot originale
    var origSlotProgs = PROGS.filter(function(p){ 
      return p.ch === prog.ch && p.time === prog.time && typeof p.share === 'number'; 
    });
    if (origSlotProgs.length > 0) {
      var sumOrig = origSlotProgs.reduce(function(acc, p){ return acc + p.share; }, 0);
      origSlotShare = sumOrig / origSlotProgs.length;
    }
    
    // Calcola share medio dello slot di destinazione
    if (S.spDestCh && S.spDestTime) {
      var destSlotProgs = PROGS.filter(function(p){ 
        return p.ch === S.spDestCh && p.time === S.spDestTime && typeof p.share === 'number';
      });
      if (destSlotProgs.length > 0) {
        var sumDest = destSlotProgs.reduce(function(acc, p){ return acc + p.share; }, 0);
        destSlotShare = sumDest / destSlotProgs.length;
      }
    }
    
    var delta = (destSlotShare - origSlotShare);
    var sign = delta>=0?'+':'';
    var isPos = delta > 0;
    var isNeg = delta < 0;
    var verdictCls = isPos ? 'pos' : (isNeg ? 'neg' : 'neu');
    var verdictIcon = isPos ? '✅' : (isNeg ? '⚠️' : '➡️');
    var verdictArrow = delta > 0 ? '↑ ' : (delta < 0 ? '↓ ' : '');
    var verdictDelta = sign + Math.abs(delta).toFixed(1) + ' pp';
    var verdictText = isPos ? 'Ottimo! Questo spostamento potrebbe migliorare gli ascolti' : (isNeg ? 'Attenzione: questo spostamento potrebbe ridurre gli ascolti' : 'Nessun impatto significativo previsto sugli ascolti');
    var _scIdx = pickScenarioForProgram(S.prog, 'spostamento');
    var _scFull = S.scenarios[_scIdx] && S.scenarios[_scIdx].items.length >= 3;

    h += '<div class="card res-card">';

    // ── Riepilogo Spostamento (chiaro e prominente) ───────────────────────────
    var origDate = S.spSrcDay || S.date || (prog.date || '');
    var destDate = S.spDestDay || '';
    var origDay = origDate ? fmtDate(origDate) : '—';
    var destDay = destDate ? fmtDate(destDate) : '—';
    
    h += '<div class="res-move-summary">';
    h += '<div class="res-move-header">';
    h += '<span class="res-move-icon">🕐</span>';
    h += '<span class="res-move-title">Riepilogo Spostamento</span>';
    h += '</div>';
    
    h += '<div class="res-move-body">';
    h += '<div class="res-move-program">';
    h += '<span class="res-move-prog-label">Programma:</span>';
    h += '<span class="res-move-prog-name">' + prog.title + '</span>';
    h += '</div>';
    
    h += '<div class="res-move-slots">';
    // Slot Originale
    h += '<div class="res-move-slot res-move-slot-orig">';
    h += '<div class="res-move-slot-label">Slot Originale</div>';
    h += '<div class="res-move-slot-content">';
    h += '<div class="res-move-slot-row"><span class="res-move-slot-key">Canale:</span><span class="res-move-slot-val">' + prog.ch + '</span></div>';
    h += '<div class="res-move-slot-row"><span class="res-move-slot-key">Data:</span><span class="res-move-slot-val">' + origDay + '</span></div>';
    h += '<div class="res-move-slot-row"><span class="res-move-slot-key">Orario:</span><span class="res-move-slot-val">' + prog.time + (prog.end ? ' – ' + prog.end : '') + '</span></div>';
    h += '</div>';
    h += '</div>';
    
    // Freccia
    h += '<div class="res-move-arrow">→</div>';
    
    // Slot Destinazione
    h += '<div class="res-move-slot res-move-slot-dest">';
    h += '<div class="res-move-slot-label">Slot Destinazione</div>';
    h += '<div class="res-move-slot-content">';
    h += '<div class="res-move-slot-row"><span class="res-move-slot-key">Canale:</span><span class="res-move-slot-val">' + (S.spDestCh || '—') + '</span></div>';
    h += '<div class="res-move-slot-row"><span class="res-move-slot-key">Data:</span><span class="res-move-slot-val">' + (destDay || '—') + '</span></div>';
    h += '<div class="res-move-slot-row"><span class="res-move-slot-key">Orario:</span><span class="res-move-slot-val">' + (S.spDestTime || '—') + (S.spDestTimeEnd ? ' – ' + S.spDestTimeEnd : '') + '</span></div>';
    h += '</div>';
    h += '</div>';
    h += '</div>'; // res-move-slots
    
    h += '</div>'; // res-move-body
    h += '</div>'; // res-move-summary

    // ── Risultato principale (share comparison) ───────────────────────────────
    h += '<div class="res-main-box">';
    h += '<div class="res-main-hdr">Confronto share degli slot</div>';
    h += '<div class="res-shares-row">';
    
    var origColorCls = '';
    var predColorCls = '';
    if (origSlotShare > destSlotShare) {
      origColorCls = ' res-share-high';
      predColorCls = ' res-share-low';
    } else if (destSlotShare > origSlotShare) {
      origColorCls = ' res-share-low';
      predColorCls = ' res-share-high';
    }
    
    h += '<div class="res-share-col">';
    h += '<span class="res-share-lbl">Share slot originale</span>';
    h += '<span class="res-share-val' + origColorCls + '">' + origSlotShare.toFixed(1) + '%</span>';
    h += '<span class="res-share-prog">' + prog.ch + ' · ' + prog.time + '</span>';
    h += '</div>';
    h += '<div class="res-share-divider">→</div>';
    h += '<div class="res-share-col">';
    h += '<span class="res-share-lbl">Share slot destinazione</span>';
    h += '<span class="res-share-val res-share-pred' + predColorCls + '">' + destSlotShare.toFixed(1) + '%</span>';
    h += '<span class="res-share-prog">' + (S.spDestCh || prog.ch) + ' · ' + (S.spDestTime || prog.time) + '</span>';
    h += '</div>';
    h += '</div>';
    h += '<div class="res-verdict-pill ' + verdictCls + '">';
    h += '<span class="res-verdict-icon">' + verdictIcon + '</span>';
    h += '<span class="res-verdict-delta">' + verdictArrow + verdictDelta + '</span>';
    h += '<span class="res-verdict-text">' + verdictText + '</span>';
    h += '</div>';
    h += '</div>';

    // ── Competitor (con pulsante singolo) ─────────────────────────────────────
    h += '<div class="res-comp-cta">';
    if (!S._showCompRes) {
      h += '<button class="btn-sec btn-comp-toggle" id="btn-toggle-comp-res">Vedi Competitor</button>';
    } else {
      h += '<button class="btn-sec btn-comp-toggle" id="btn-toggle-comp-res">Nascondi Competitor</button>';
    }
    h += '</div>';
    if (S._showCompRes) {
      h += '<div class="res-comp-section">';
      h += '<div class="res-comp-content">';
      
      // Load strong events for current context (spostamento)
      var destTime = S.spDestTime || (prog ? prog.time : '');
      var destDate = S.spDestDay || S.date;
      var strongEvents = loadStrongEventsForContext(destDate, destTime);
      
      var hasStrongEvents = strongEvents && strongEvents.length > 0;
      if (hasStrongEvents) {
        h += '<div class="strong-event-warning">';
        h += '<span class="strong-event-icon">⚠️</span>';
        h += '<span class="strong-event-text">Rischio Competitor Alto</span>';
        h += '<span class="strong-event-count">' + strongEvents.length + (strongEvents.length === 1 ? ' evento forte' : ' eventi forti') + '</span>';
        h += '</div>';
      }
      
      var destSlot = S.spDestTime ? S.spDestTime.slice(0,5) : null;
      var compList = getCompetitors(destSlot, true);
      if (!compList.length) {
        h += '<div class="hint">Nessun competitor disponibile per lo slot selezionato.</div>';
      } else {
        h += '<div class="comp-cards-grid">';
        compList.forEach(function(co){
          var eventKey = getStrongEventKey(destDate, destTime, co.ch, co.title);
          var isStrong = S._strongEventsStore && S._strongEventsStore[eventKey];
          h += '<div class="comp-card-item' + (isStrong ? ' comp-card-strong' : '') + '">' +
            '<div class="comp-card-top">' +
              '<span class="comp-share-pill">' + (typeof co.share === 'number' ? co.share + '%' : '—') + '</span>' +
            '</div>' +
            '<div class="comp-card-title">' + co.title + '</div>' +
            '<div class="comp-card-labels">' +
              '<span class="comp-label-pill comp-label-ch">' + co.ch + '</span>' +
              '<span class="comp-label-pill comp-label-tipo">' + co.tipo + '</span>' +
            '</div>' +
            '<button class="btn-strong-event' + (isStrong ? ' active' : '') + '" data-comp-key="' + eventKey + '" data-comp-ch="' + co.ch + '" data-comp-title="' + co.title + '" title="' + (isStrong ? 'Rimuovi evento forte' : 'Segna come evento forte') + '">' +
              (isStrong ? '✓ Evento Forte' : 'Segna come evento forte') +
            '</button>' +
          '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
      h += '</div>';
    }

    // ── Action bar (bottom) ────────────────────────────────────────────────────
    h += '<div class="psel-action-bar res-action-bar">';
    // Left: Back button
    h += '<div class="res-action-left">';
    h += '<button class="btn-back" id="btn-back-scen">🏠 Nuova Simulazione</button>';
    h += '</div>';
    // Right: Save + New simulation buttons (identico a sostituzione)
    h += '<div class="res-action-right">';
    if (!S._simSaved) {
      h += '<button class="btn-pri" id="btn-save-sim">Salva Simulazione</button>';
      h += '<button class="btn-sec" id="btn-new-sim" disabled style="opacity:0.5;cursor:not-allowed;">Aggiungi spostamento</button>';
    } else {
      h += '<button class="btn-sec" id="btn-go-scenarios">📂 Visualizza in Scenari</button>';
      if (!_scFull) {
        h += '<button class="btn-sec" id="btn-new-sim">Aggiungi spostamento</button>';
      } else {
        h += '<span class="res-full-badge">Scenario completo</span>';
      }
    }
    h += '</div>';
    h += '</div>';

    h += '</div>'; // card
    return h;
  }

  if (S._viewSim && S._simResult && S._simResult.items && S._simResult.items.length) {
    var viewLabel = S.mode === 'sostituzione' ? 'Programmi Sostitutivi' : 'Risultato Simulazione';
    h += '<div class="sect-label">' + viewLabel + '</div><div class="chart-box">';
    // compute predicted values to identify best/worst for coloring
    var _preds = S._simResult.items.map(function(i){ return (i.res && typeof i.res.pred === 'number') ? i.res.pred : NaN; });
    var _maxPred = Math.max.apply(null, _preds.filter(function(x){ return !isNaN(x); }));
    var _minPred = Math.min.apply(null, _preds.filter(function(x){ return !isNaN(x); }));
    S._simResult.items.forEach(function(item){
      var res = item.res;
      var maxV = Math.max(item.orig.share, res.pred, 25);
      var op = (item.orig.share / maxV * 100).toFixed(0);
      var pp = (res.pred / maxV * 100).toFixed(0);
      // determine delta, color, arrow and impact text
      var delta = (res && typeof res.pred === 'number') ? (res.pred - (item.orig.share||0)) : null;
      var predNumColor = (delta === null) ? 'var(--muted)' : (delta > 0 ? 'var(--success)' : (delta < 0 ? 'var(--danger)' : 'var(--muted)'));
      var arrow = (delta === null) ? '' : (delta > 0 ? '↑' : (delta < 0 ? '↓' : ''));
      var deltaLabel = (delta === null) ? '' : ( (delta>=0?'+':'') + delta.toFixed(1) + ' pp');
      var impactText = '';
      if (delta !== null) {
        if (delta > 0) impactText = 'Ottimo! Questa scelta potrebbe migliorare gli ascolti';
        else if (delta < 0) impactText = 'Attenzione: questa scelta potrebbe ridurre gli ascolti';
        else impactText = 'Nessun impatto significativo previsto sugli ascolti';
      }
      h += '<div style="margin-bottom:14px;">' +
        '<div style="font-size:13px;font-weight:800;margin-bottom:6px;color:var(--muted);">Simulazione: ' + item.orig.title + ' → ' + item.cand.title + '</div>' +
        '<div class="bar-row"><span class="bar-lbl">Attuale</span><div class="bar-track"><div class="bar-fill" style="width:' + op + '%;background:var(--danger)"></div></div><span class="bar-val">' + item.orig.share + '%</span></div>' +
       '<div class="bar-row"><span class="bar-lbl">Previsto</span><div class="bar-track"><div class="bar-fill" style="width:' + pp + '%;background:var(--success)"></div></div><span class="bar-val" style="color:' + predNumColor + '">' + res.pred.toFixed(1) + '%</span></div>' +
       '<div style="margin-top:6px;font-size:13px;font-weight:900;color:' + predNumColor + '">' + (arrow ? (arrow + ' ' + deltaLabel) : '') + '</div>' +
       (impactText ? ('<div style="font-size:12px;color:var(--muted);margin-top:6px">' + impactText + '</div>') : '') +
        '</div>';
    });
    h += '</div><div class="sect-label mt12">Competitor</div>' + buildCompetitorBlock();
    // Pulsante per aggiungere al scenario dalla vista risultato (solo per modalità sostituzione)
    if (S.mode === 'sostituzione') {
      var _vsPTitle = S.prog ? S.prog.title : 'Scenario ' + S.activeScen;
      h += '<div style="margin-top:12px;display:flex;gap:10px;align-items:center;">';
      h += '<button class="btn-pri" id="btn-add-scen-result">Aggiungi a \u2014 ' + _vsPTitle + '</button>';
      h += '<button class="btn-pri" id="btn-save-sim">Aggiungi a \u2014 ' + _vsPTitle + '</button>';
      h += '</div>';
    }
    var backLabel = S.mode === 'sostituzione' ? '🏠 Nuova Simulazione' : '← Slot di Destinazione';
    h += '<div class="step-nav"><button class="btn-back" id="btn-back-scen">' + backLabel + '</button><button class="btn-sec" id="btn-new-sim">Aggiungi sostituzione</button></div>';
    return h;
  }

  // For substitution mode, show a compact Result view (no scenarios grid)
  if (S.mode === 'sostituzione') {
    var prog = S.prog || null;
    var hasCand = !!S.cand;
    var pTitle = prog ? prog.title : '—';
    var pMeta = prog ? [prog.ch||'', prog.time ? prog.time+'\u2013'+(prog.end||'') : '', prog.genre||''].filter(Boolean).join(' \u00b7 ') : '—';
    var pShare = (prog && typeof prog.share === 'number') ? prog.share.toFixed(1) + '%' : '—';
    var candTitle = hasCand ? S.cand.title : '—';
    var candMeta = hasCand ? [S.cand.ch||'', S.cand.time ? S.cand.time+'\u2013'+(S.cand.end||'') : '', S.cand.genre||S.cand.tipo||''].filter(Boolean).join(' \u00b7 ') : '—';
    var pred = null; try { if (hasCand) pred = predictShare(prog, S.cand).pred; } catch(e) {}
    var origNum = (prog && typeof prog.share === 'number') ? prog.share : NaN;
    var predNum = typeof pred === 'number' ? pred : NaN;
    var deltaVal = (!isNaN(origNum) && !isNaN(predNum)) ? (predNum - origNum) : null;
    var isPos = deltaVal !== null && deltaVal > 0;
    var isNeg = deltaVal !== null && deltaVal < 0;
    var verdictCls = isPos ? 'pos' : (isNeg ? 'neg' : 'neu');
    var verdictIcon = isPos ? '\u2705' : (isNeg ? '\u26a0\ufe0f' : '\u27a1\ufe0f');
    var verdictDelta = deltaVal !== null ? ((deltaVal >= 0 ? '+' : '') + deltaVal.toFixed(1) + ' pp') : '\u2014';
    var verdictArrow = deltaVal === null ? '' : (deltaVal > 0 ? '\u2191 ' : (deltaVal < 0 ? '\u2193 ' : ''));
    var verdictText = deltaVal === null ? 'Dati insufficienti per la previsione' :
      (isPos ? 'Ottimo! Questa sostituzione potrebbe migliorare gli ascolti' :
      (isNeg ? 'Attenzione: questa sostituzione potrebbe ridurre gli ascolti' : 'Nessun impatto significativo previsto sugli ascolti'));
    var origCls = (!isNaN(origNum) && !isNaN(predNum)) ? (origNum < predNum ? 'danger' : (origNum > predNum ? 'success' : 'muted')) : 'muted';
    var predCls  = (!isNaN(origNum) && !isNaN(predNum)) ? (predNum > origNum ? 'success' : (predNum < origNum ? 'danger' : 'muted')) : 'muted';
    var _scIdx = pickScenarioForProgram(S.prog, 'sostituzione');
    var _scFull = S.scenarios[_scIdx] && S.scenarios[_scIdx].items.length >= 3;

    h += '<div class="card res-card">';

    // ── Recap inline compatto ──────────────────────────────────────────────────
    h += '<div class="res-recap-inline">';
    h += '<div class="res-recap-title">Sostituzione di <span class="res-prog-highlight">' + pTitle + '</span> con <span class="res-prog-highlight">' + candTitle + '</span></div>';
    // Recap: Data, Canale, Ora del programma originale
    var recapItems = [];
    if (prog && prog.ch) recapItems.push('<strong>Canale:</strong> ' + prog.ch);
    if (prog && prog.time) recapItems.push('<strong>Ora:</strong> ' + prog.time + (prog.end ? '–' + prog.end : ''));
    if (S.date) recapItems.push('<strong>Data:</strong> ' + fmtDate(S.date));
    if (recapItems.length > 0) {
      h += '<div class="res-recap-meta">' + recapItems.join(' · ') + '</div>';
    }
    h += '</div>';

    // ── Risultato principale (share comparison) ───────────────────────────────
    h += '<div class="res-main-box">';
    h += '<div class="res-main-hdr">Impatto previsto</div>';
    h += '<div class="res-shares-row">';
    
    // Determina colori basati su valori
    var origColorCls = '';
    var predColorCls = '';
    if (!isNaN(origNum) && !isNaN(predNum)) {
      if (origNum > predNum) {
        origColorCls = ' res-share-high';
        predColorCls = ' res-share-low';
      } else if (predNum > origNum) {
        origColorCls = ' res-share-low';
        predColorCls = ' res-share-high';
      }
    }
    
    h += '<div class="res-share-col">';
    h += '<span class="res-share-lbl">Share attuale</span>';
    h += '<span class="res-share-val' + origColorCls + '">' + pShare + '</span>';
    h += '<span class="res-share-prog">' + pTitle + '</span>';
    h += '</div>';
    h += '<div class="res-share-divider">→</div>';
    h += '<div class="res-share-col">';
    h += '<span class="res-share-lbl">Share previsto</span>';
    h += '<span class="res-share-val res-share-pred' + predColorCls + '">' + (!isNaN(predNum) ? predNum.toFixed(1) + '%' : '—') + '</span>';
    h += '<span class="res-share-prog">' + candTitle + '</span>';
    h += '</div>';
    h += '</div>';
    h += '<div class="res-verdict-pill ' + verdictCls + '">';
    h += '<span class="res-verdict-icon">' + verdictIcon + '</span>';
    h += '<span class="res-verdict-delta">' + verdictArrow + verdictDelta + '</span>';
    h += '<span class="res-verdict-text">' + verdictText + '</span>';
    h += '</div>';
    h += '</div>';

    // ── Competitor (con pulsante singolo) ─────────────────────────────────────
    h += '<div class="res-comp-cta">';
    if (!S._showCompRes) {
      h += '<button class="btn-sec btn-comp-toggle" id="btn-toggle-comp-res">Vedi Competitor</button>';
    } else {
      h += '<button class="btn-sec btn-comp-toggle" id="btn-toggle-comp-res">Nascondi Competitor</button>';
    }
    h += '</div>';
    if (S._showCompRes) {
      h += '<div class="res-comp-section">';
      h += '<div class="res-comp-content">';
      
      // Load strong events for current context (sostituzione)
      var progTime = prog ? prog.time : '';
      var strongEvents = loadStrongEventsForContext(S.date, progTime);
      
      // Strong events warning
      var hasStrongEvents = strongEvents && strongEvents.length > 0;
      if (hasStrongEvents) {
        h += '<div class="strong-event-warning">';
        h += '<span class="strong-event-icon">⚠️</span>';
        h += '<span class="strong-event-text">Rischio Competitor Alto</span>';
        h += '<span class="strong-event-count">' + strongEvents.length + (strongEvents.length === 1 ? ' evento forte' : ' eventi forti') + '</span>';
        h += '</div>';
      }
      
      // Genera competitor card direttamente
      var compList = getCompetitors(S.prog ? S.prog.slot : null, true);
      if (!compList.length) {
        h += '<div class="hint">Nessun competitor disponibile per lo slot selezionato.</div>';
      } else {
        h += '<div class="comp-cards-grid">';
        compList.forEach(function(co){
          var eventKey = getStrongEventKey(S.date, progTime, co.ch, co.title);
          var isStrong = S._strongEventsStore && S._strongEventsStore[eventKey];
          h += '<div class="comp-card-item' + (isStrong ? ' comp-card-strong' : '') + '">' +
            '<div class="comp-card-top">' +
              '<span class="comp-share-pill">' + (typeof co.share === 'number' ? co.share + '%' : '—') + '</span>' +
            '</div>' +
            '<div class="comp-card-title">' + co.title + '</div>' +
            '<div class="comp-card-labels">' +
              '<span class="comp-label-pill comp-label-ch">' + co.ch + '</span>' +
              '<span class="comp-label-pill comp-label-tipo">' + co.tipo + '</span>' +
            '</div>' +
            '<button class="btn-strong-event' + (isStrong ? ' active' : '') + '" data-comp-key="' + eventKey + '" data-comp-ch="' + co.ch + '" data-comp-title="' + co.title + '" title="' + (isStrong ? 'Rimuovi evento forte' : 'Segna come evento forte') + '">' +
              (isStrong ? '✓ Evento Forte' : 'Segna come evento forte') +
            '</button>' +
          '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
      h += '</div>';
    }

    // ── Action bar (bottom) ────────────────────────────────────────────────────
    h += '<div class="psel-action-bar res-action-bar">';
    // Left: Back button
    h += '<div class="res-action-left">';
    h += '<button class="btn-back" id="btn-back-scen">🏠 Nuova Simulazione</button>';
    h += '</div>';
    // Right: Save + New simulation buttons
    h += '<div class="res-action-right">';
    if (!S._simSaved) {
      h += '<button class="btn-pri" id="btn-save-sim">Salva Simulazione</button>';
      h += '<button class="btn-sec" id="btn-new-sim" disabled style="opacity:0.5;cursor:not-allowed;">Aggiungi sostituzione</button>';
    } else {
      h += '<button class="btn-sec" id="btn-go-scenarios">📂 Visualizza in Scenari</button>';
      if (!_scFull) {
        h += '<button class="btn-sec" id="btn-new-sim">Aggiungi sostituzione</button>';
      } else {
        h += '<span class="res-full-badge">Scenario completo</span>';
      }
    }
    h += '</div>';
    h += '</div>';

    h += '</div>'; // card
    return h;
  }
  h += '<div class="scen-grid">';
  [1,2,3,4].forEach(function(k){
    var sc = S.scenarios[k];
      var pct = (sc.items.length / 3 * 100).toFixed(0);
    var anch = sc.anchor ? sc.anchor.title : 'Libero';
    var typeLabel = sc.type ? (sc.type === 'spostamento' ? 'Spostamento' : (sc.type === 'sostituzione' ? 'Sostituzione' : sc.type)) : '';
    var typeCls = sc.type ? (sc.type === 'spostamento' ? 'b-success' : 'b-primary') : 'b-muted';
    var typeBadge = typeLabel ? '<span class="badge ' + typeCls + '" style="margin-left:8px;font-size:11px;vertical-align:middle;">' + typeLabel + '</span>' : '';
    var fullBadge = sc.items.length >= 3 ? '<span class="scen-full">Pieno</span>' : '';
    h += '<div class="scen-card' + (S.activeScen === k ? ' on' : '') + '" data-scen="' + k + '">' +
       '<div style="display:flex;align-items:center;width:100%;gap:8px;">' +
         '<div class="sc-num">Scenario ' + k + '</div>' +
         '<div style="margin-left:auto;display:flex;gap:6px;align-items:center;">' +
           '<button class="btn-clear-scn scen-clear-btn" data-scn="' + k + '">Elimina Scenario</button>' +
         '</div>' +
       '</div>' +
       '<div style="display:flex;align-items:center;gap:8px;flex-direction:column;align-items:flex-start;">' +
       '<div style="display:flex;align-items:center;gap:8px;width:100%;">' +
       '<div class="sc-anch" title="' + anch + '">' + anch + '</div>' + typeBadge + fullBadge + '</div>';
    // show up to 3 items inline with small delete buttons
    if (sc.items && sc.items.length) {
      h += '<div class="sc-items" style="margin-top:8px;width:100%;display:flex;flex-direction:column;gap:6px;">';
        sc.items.slice(0,3).forEach(function(itm,ii){
          var tit = (itm.orig && itm.orig.title) ? itm.orig.title : 'Elemento';
          var sub = '';
          if (itm.cand && itm.cand.id === 'move') {
            sub = itm.destTime || itm.date || 'Spostamento';
          } else {
            sub = (itm.cand && itm.cand.title) ? itm.cand.title : '';
          }
          var predText = itm.res && typeof itm.res.pred === 'number' ? itm.res.pred.toFixed(1) + '%' : '—';
          var deltaVal = (itm.res && typeof itm.res.pred === 'number') ? (itm.res.pred - (itm.orig.share || 0)) : null;
          var predColor = (deltaVal === null) ? 'var(--muted)' : (deltaVal > 0 ? 'var(--success)' : (deltaVal < 0 ? 'var(--danger)' : 'var(--muted)'));
          var deltaLabel = (deltaVal === null) ? '' : ((deltaVal >= 0 ? '+' : '') + deltaVal.toFixed(1) + ' pp');
          h += '<div class="sc-item" title="' + tit + ' → ' + sub + '">';
          h += '<div style="display:flex;flex-direction:column;min-width:0;flex:1;">';
          h += '<div class="sc-item-title">' + tit + ' → ' + sub + '</div>';
          h += '<div class="sc-item-meta">' + (itm.date || '') + ' · ' + (itm.destTime || '') + '</div>';
          h += '</div>';
          h += '<div style="display:flex;align-items:center;gap:8px;">';
          h += '<div class="sc-item-pred" style="color:' + predColor + ';">' + predText + '</div>';
          h += '<div class="sc-item-delta" style="color:' + predColor + ';">' + deltaLabel + '</div>';
          h += '<button class="btn-edit-scn" data-scn="' + k + '" data-idx="' + ii + '" title="Modifica elemento">✏️</button>';
          h += '<button class="btn-del-scn" data-scn="' + k + '" data-idx="' + ii + '" title="Rimuovi elemento">🗑️</button>';
          h += '</div>';
          h += '</div>';
        });
        h += '</div>';
    }
    h += '<div class="sc-bar"><div class="sc-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="sc-cnt">' + sc.items.length + '/3</div></div>';
  });
  h += '</div>';

  // show target summary for the active scenario to make comparison explicit
  var sc = S.scenarios[S.activeScen];
  if (sc && sc.anchor) {
    var a = sc.anchor;
    h += '<div class="card" style="margin-top:10px;">';
    h += '<div class="sect-label">Programma Target — Scenario ' + S.activeScen + '</div>';
    h += '<div class="prog-card sel" style="cursor:default;display:flex;align-items:center;gap:12px;">';
    h += '<div class="p-time">' + (a.time||'—') + '–' + (a.end||'—') + '</div>';
    h += '<div class="p-info"><div class="p-title">' + a.title + '</div><div class="p-meta">' + (a.ch||'—') + ' · ' + (a.genre||'—') + '</div></div>';
    h += '<div class="p-share">' + (a.share||'—') + '%</div></div>';
    h += '<div class="hint" style="margin-top:10px;">Il target è il programma che vuoi sostituire; il confronto mostra i candidati proposti e l’impatto previsto.</div>';
    h += '</div>';
  }

  h += '<div class="sect-label mt12">Competitor nello slot</div>' + buildCompetitorBlock();

  var sc = S.scenarios[S.activeScen];
  if (!sc.items.length) h += '<div class="alert-info" style="margin-top:12px;">Non sono ancora presenti sostituzioni o spostamenti per questo scenario.</div>';
  else {
    h += '<div class="chart-box"><div class="chart-title">Confronto Share — Scenario ' + S.activeScen + '</div>' +
         '<div class="legend"><span class="leg-item"><span class="leg-dot" style="background:var(--danger)"></span>Attuale</span>' +
         '<span class="leg-item"><span class="leg-dot" style="background:var(--success)"></span>Previsto</span></div>';
    sc.items.forEach(function(item, idx){
      var res = item.res;
      var maxV = Math.max(item.orig.share, res.pred, 25);
      var op = (item.orig.share / maxV * 100).toFixed(0);
      var pp = (res.pred / maxV * 100).toFixed(0);
      h += '<div style="margin-bottom:14px;display:flex;gap:8px;align-items:flex-start;">';
      h += '<div style="flex:1">';
       var leftTitle = '';
       if (item && item.cand && item.cand.id === 'move') {
         leftTitle = item.orig.title + ' → ' + (item.destTime || item.date || '—');
       } else {
         leftTitle = item.orig.title + ' → ' + (item.cand && item.cand.title ? item.cand.title : '—');
       }
       h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
       h += '<div style="font-size:12px;font-weight:800;color:var(--muted);">' + leftTitle + '</div>';
       h += '<div style="display:flex;gap:8px;align-items:center;">' +
         '<button class="btn-del-scn" data-scn="' + S.activeScen + '" data-idx="' + idx + '" title="Rimuovi elemento">🗑️</button>' +
         '</div>';
       h += '</div>';
       // determine colors for numeric labels (green if predicted is greater than original, red if lower)
       var delta = (res && typeof res.pred === 'number') ? (res.pred - (item.orig.share||0)) : null;
       var predNumColor = (delta === null) ? 'var(--muted)' : (delta > 0 ? 'var(--success)' : (delta < 0 ? 'var(--danger)' : 'var(--muted)'));
       var deltaLabel = (delta === null) ? '' : ((delta >= 0 ? '+' : '') + delta.toFixed(1) + ' pp');
       h += '<div class="bar-row"><span class="bar-lbl">Attuale</span><div class="bar-track"><div class="bar-fill" style="width:' + op + '%;background:var(--danger)"></div></div><span class="bar-val">' + item.orig.share + '%</span></div>' +
         '<div class="bar-row"><span class="bar-lbl">Previsto</span><div class="bar-track"><div class="bar-fill" style="width:' + pp + '%;background:var(--success)"></div></div><span class="bar-val" style="color:' + predNumColor + '">' + res.pred.toFixed(1) + '%</span></div>' +
         '<div style="margin-top:6px;font-size:12px;font-weight:900;color:' + predNumColor + '">' + deltaLabel + '</div>';
       h += '</div>';
      h += '</div>';
    });
    h += '</div>';
  }

  var backLbl = S.mode === 'sostituzione' ? '🏠 Nuova Simulazione' : '← Slot di Destinazione';
  h += '<div class="step-nav"><button class="btn-back" id="btn-back-scen">' + backLbl + '</button><button class="btn-sec" id="btn-new-sim">Aggiungi sostituzione</button></div>';
  return h;
}

/* ================================================================
   SPOSTAMENTO (kept minimal)
================================================================ */
function buildSpostaSorgente() {
  var h = '<div class="card"><div class="sect-label">Palinsesto Sorgente</div>';
    h += '<div class="f-row"><span class="f-label">Canale</span><div class="tgl-grp" id="ch-grp">';
    ['Rai 1','Rai 2','Rai 3'].forEach(function(c){ h += '<button class="tgl' + (S.ch === c ? ' on' : '') + '" data-ch="' + c + '">' + c + '</button>'; });
    h += '</div><span class="f-label" style="margin-left:12px;">Data</span><input type="text" id="date-inp" class="date-inp-txt" placeholder="Seleziona data..." style="width:130px;cursor:pointer;" readonly>' +
      '<button class="btn-inline" id="btn-load-src" style="margin-left:10px;">⬇️ Carica Palinsesto</button></div>';

  if (!S._srcLoaded) h += '<div class="hint">Seleziona canale e data, poi clicca <strong>Carica Palinsesto</strong>.</div>';
  else {
    // Filter by channel only — do NOT use applyFilters which applies stale slot/tipo state
    var filtered = PROGS.filter(function(p){ return !S.ch || p.ch === S.ch; }).slice(0, 40);
    // Synthesize demo programs if nothing found for the selected channel
    if ((!filtered || filtered.length === 0) && S.ch) {
      var chSel = S.ch;
      filtered = [];
      for (var si = 0; si < 8; si++) {
        var id = chSel.replace(/\s+/g,'').toLowerCase() + '_synth_' + si;
        var tHour = 9 + (si % 12);
        var tMin = (si % 2 === 0) ? '00' : '30';
        var time = (tHour < 10 ? '0' + tHour : tHour) + ':' + tMin;
        var durArr = [30,45,60,90];
        var dur = durArr[si % durArr.length];
        var tipoArr = ['Show','Talk','Doc','Serie','Film','Inchiesta','Game','Reality'];
        var tipo = tipoArr[si % tipoArr.length];
        var genre = (tipo === 'Doc' || tipo === 'Inchiesta') ? 'Documentario' : (tipo === 'Show' ? 'Intrattenimento' : (tipo==='Game'?'Gioco': 'Varietà'));
        var share = Math.round((6 + (si * 2 + hashToNumber(chSel) * 6)) * 10)/10;
        filtered.push({ id: id, title: chSel + ' ' + tipo + ' ' + (si+1), genre: genre, time: time, end: time, dur: dur, ch: chSel, share: share, eta: 'Tutti', sesso: 'Tutti', tipo: tipo, slot: (si%4===0?'prime':si%4===1?'mattina':si%4===2?'pomeriggio':'access') });
      }
    }
    h += '<div class="sect-label mt12">Seleziona il programma da spostare</div><div class="body-scroll"><div class="prog-list" id="prog-list-items">';
    filtered.forEach(function(p){
      var sel = S.prog && S.prog.id === p.id;
      h += '<div class="prog-card' + (sel ? ' sel' : '') + '" data-pid="' + p.id + '">' +
           '<div class="p-time">' + p.time + '–' + p.end + '</div>' +
           '<div class="p-info"><div class="p-title">' + p.title + '</div><div class="p-meta">' + p.ch + ' · ' + p.genre + ' · Tipologia: ' + p.tipo + '</div></div>' +
           '<div class="p-share">' + p.share + '%</div></div>';
    });
    h += '</div></div>';
  }

    h += '<div class="step-nav">' +
      '<div></div>' +
      '<button class="btn-next" id="btn-next-0"' + ((S.prog) ? '' : ' disabled') + '>Scegli Destinazione →</button></div></div>';
  return h;
}

function buildSpostaDestinazione() {
  var prog = S.prog;
  // Do NOT auto-fill spDestDay — user must select explicitly
  S._destLoaded = true;

  var h = '<div class="card psel-card">';

  // ── Target recap (uniforme allo step 2 sostituzione) ──────────────────────
  var tSv = typeof prog.share==='number' ? prog.share.toFixed(1)+'%' : null;
  h += '<div class="psel-recap-bar">';
  h += '<span class="psel-recap-lbl">Programma da spostare</span>';
  h += '<div class="psel-recap-info">';
  h += '<span class="psel-recap-tick">📌</span>';
  h += '<span class="psel-recap-name">' + prog.title + '</span>';
  if (tSv) h += '<span class="psel-recap-share">' + tSv + '</span>';
  h += '</div>';
  h += '<div class="psel-recap-meta">';
  var metaPills = [];
  if(prog.ch) metaPills.push(prog.ch);
  if(prog.time) metaPills.push(prog.time + (prog.end ? '–'+prog.end : ''));
  if(prog.genre) metaPills.push(prog.genre);
  h += metaPills.join(' · ');
  h += '</div>';
  h += '</div>';

  // === CONTESTO DESTINAZIONE: Canale + Giorno + Intervallo Orario ===
  h += '<div class="sect-label" style="margin-top:24px;">Configura contesto di destinazione</div>';
  
  // Filter bar uniformata allo step 0
  h += '<div class="psel-filter-bar">';
  
  // Canale
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Canale</span>';
  h += '<div class="psel-ch-grp" id="ch-grp-dest">';
  ['Rai 1','Rai 2','Rai 3'].forEach(function(c){
    h += '<button class="psel-ch-pill tgl' + (S.spDestCh === c ? ' on' : '') + '" data-dest-ch="' + c + '">' + c + '</button>';
  });
  h += '</div></div>';
  
  // Giorno
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Data</span>';
  h += '<div class="psel-date-wrap">';
  h += '<input type="date" id="sp-dest-day" class="psel-date-inp-hidden" min="' + formatDateToISOLocal(new Date()) + '" value="' + (S.spDestDay || '') + '">';
  h += '<button type="button" class="psel-date-display-btn" id="sp-dest-day-btn">' + (S.spDestDay ? fmtDate(S.spDestDay) : 'Seleziona data…') + '</button>';
  h += '</div></div>';
  
  // Orario
  h += '<div class="psel-fg"><span class="psel-fg-lbl">Orario</span>';
  var _hoursOpts = function(sel){ 
    var o='<option value="">Seleziona orario...</option>'; 
    var hours = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30','00:00','01:00','02:00'];
    hours.forEach(function(hh){ o+='<option value="'+hh+'"'+(sel===hh?' selected':'')+'>'+hh+'</option>'; });
    return o;
  };
  h += '<select id="sp-dest-time" class="psel-select" style="min-width:140px;">' + _hoursOpts(S.spDestTime) + '</select>';
  h += '</div>';
  
  h += '</div>'; // close psel-filter-bar
  
  // PALINSESTO - mostra se canale, giorno e orario sono selezionati
  if (S.spDestCh && S.spDestDay && S.spDestTime) {
    var PAGE_SIZE = 8;
    
    // Funzione helper per convertire orario in minuti
    var timeToMin = function(t){
      if(!t) return 0;
      var parts = t.split(':');
      return Number(parts[0]) * 60 + Number(parts[1]);
    };
    
    // Filtra programmi nell'intervallo di 4 ore (2 ore prima + 2 ore dopo l'orario selezionato)
    var selectedTimeMin = timeToMin(S.spDestTime);
    var rangeStartMin = selectedTimeMin - 120; // 2 ore prima
    var rangeEndMin = selectedTimeMin + 120;   // 2 ore dopo
    
    // Prendi tutti i programmi del canale selezionato
    var channelProgs = PROGS.filter(function(p){ return p.ch === S.spDestCh; });
    
    // Filtra programmi che si sovrappongono con il range di 4 ore
    var filteredProgs = channelProgs.filter(function(p){
      var progStartMin = timeToMin(p.time);
      var progEndMin = p.end ? timeToMin(p.end) : progStartMin + (p.dur || 0);
      
      // Gestisci programmi che attraversano la mezzanotte
      if (progEndMin < progStartMin) {
        progEndMin += 1440;
      }
      
      // Un programma è nel range se:
      // - inizia prima della fine del range E
      // - finisce dopo l'inizio del range
      // Questo cattura tutti i programmi che si sovrappongono in qualsiasi modo con il range
      return progStartMin < rangeEndMin && progEndMin > rangeStartMin;
    });
    
    // Ordina per ora di inizio
    filteredProgs.sort(function(a,b){
      return timeToMin(a.time) - timeToMin(b.time);
    });
    
    // Rimuovi sovrapposizioni: mantieni solo UN programma per slot temporale
    var cleanSchedule = [];
    var lastEndMin = -1;
    
    for (var i = 0; i < filteredProgs.length; i++) {
      var p = filteredProgs[i];
      var pStartMin = timeToMin(p.time);
      var pEndMin = p.end ? timeToMin(p.end) : pStartMin + (p.dur || 0);
      
      // Gestisci programmi che attraversano la mezzanotte
      if (pEndMin < pStartMin) {
        pEndMin += 1440;
      }
      
      // Aggiungi solo programmi che non si sovrappongono
      if (pStartMin >= lastEndMin) {
        cleanSchedule.push(p);
        lastEndMin = pEndMin;
      }
    }
    
    filteredProgs = cleanSchedule;
    var totalItems = filteredProgs.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (!S._spProgPage || S._spProgPage < 1) S._spProgPage = 1;
    if (S._spProgPage > totalPages) S._spProgPage = totalPages;
    var pageStart = (S._spProgPage - 1) * PAGE_SIZE;
    var pageEnd = Math.min(pageStart + PAGE_SIZE, totalItems);
    var pageItems = filteredProgs.slice(pageStart, pageEnd);
    
    h += '<div class="psel-list-hdr psel-list-hdr-pad" style="margin-top:16px;"><span class="psel-list-lbl">Palinsesto · ' + S.spDestCh + ' · ' + fmtDate(S.spDestDay) + '</span><span class="psel-list-cnt">' + totalItems + ' programm' + (totalItems===1?'a':'i') + '</span></div>';
    
    if (totalItems === 0) {
      h += '<p class="psel-empty">Nessun programma trovato in questo intervallo.</p>';
    } else {
      var _chCls={'Rai 1':'prow-r1','Rai 2':'prow-r2','Rai 3':'prow-r3'};
      h += '<div class="psel-list-body psel-list-readonly" id="sp-prog-list-items">';
      h += '<div class="psel-readonly-hint">ℹ️ Visualizzazione informativa del palinsesto per l\'intervallo selezionato</div>';
      pageItems.forEach(function(p){
        var sv = typeof p.share==='number' ? p.share.toFixed(1)+'%' : '–';
        var cc = _chCls[p.ch]||'';
        h += '<div class="prow prow-readonly' + (cc?' '+cc:'') + '">';
        h += '<span class="prow-time">' + p.time + (p.end?'<span class="prow-end">–'+p.end+'</span>':'') + '</span>';
        h += '<div class="prow-body"><span class="prow-title">' + p.title + '</span>';
        var sub=[]; 
        if(p.tipo)sub.push(p.tipo); 
        if(p.genre&&p.genre!==p.tipo)sub.push(p.genre);
        if(p.dur)sub.push(p.dur+' min');
        if(sub.length)h += '<span class="prow-sub">' + sub.join(' · ') + '</span>';
        h += '</div><span class="prow-share">' + sv + '</span>';
        h += '</div>';
      });
      h += '</div>';
      
      // Paginazione
      if (totalPages > 1) {
        h += '<div class="psel-pager" id="psel-pager-sp">';
        h += '<button class="psel-pager-nav" data-page="prev"' + (S._spProgPage<=1?' disabled':'') + '>&#8592;</button>';
        var _pS=Math.max(1,S._spProgPage-2), _pE=Math.min(totalPages,S._spProgPage+2);
        if (_pS > 1) { h += '<button class="psel-pager-num" data-page="1">1</button>'; if (_pS > 2) h += '<span class="psel-pager-ell">&hellip;</span>'; }
        for (var _pi=_pS; _pi<=_pE; _pi++) h += '<button class="psel-pager-num' + (_pi===S._spProgPage?' active':'') + '" data-page="' + _pi + '">' + _pi + '</button>';
        if (_pE < totalPages) { if (_pE < totalPages-1) h += '<span class="psel-pager-ell">&hellip;</span>'; h += '<button class="psel-pager-num" data-page="' + totalPages + '">' + totalPages + '</button>'; }
        h += '<button class="psel-pager-nav" data-page="next"' + (S._spProgPage>=totalPages?' disabled':'') + '>&#8594;</button>';
        h += '<span class="psel-pager-info">' + (pageStart+1) + '\u2013' + pageEnd + ' di ' + totalItems + '</span>';
        h += '</div>';
      }
    }
  } else if (!S.spDestCh || !S.spDestDay || !S.spDestTime) {
    h += '<div style="padding:32px 0;text-align:center;color:var(--muted);font-size:13px;">';
    h += 'Seleziona <strong>canale</strong>, <strong>data</strong> e <strong>orario</strong> per visualizzare il palinsesto.';
    h += '</div>';
  }

  var ready = !!(S.spDestCh && S.spDestDay && S.spDestTime);
  h += '<div class="step-nav">'
    + '<button class="btn-back" id="btn-back-1">&larr; Tipo di Simulazione</button>'
    + '<button class="btn-next" id="btn-next-1"' + (ready ? '' : ' disabled') + '>Risultato Simulazione &rarr;</button>'
    + '</div></div>';
  return h;
}

/* ================================================================
   EVENTS
================================================================ */
function clearFilter(key) {
  if (key === 'ch') { S.ch = null; S.prog = null; S.cand = null; }
  if (key === 'date') { S.date = null; S.prog = null; S.cand = null; }
  if (key === 'slot') { S.slot = null; S.prog = null; S.cand = null; }
  if (key === 'candCh') S._candCh = null;
  if (key === 'candSlot') S._candSlot = null;
  if (key === 'candSearch') S._candSearch = '';
  if (key === 'tipo') S.tipo = null;
  if (key === 'eta') S.eta = null;
  if (key === 'sesso') S.sesso = null;
  if (key === 'share') S.share = null;
  if (key === 'dur') S.dur = null;
  if (key === 'search') { S._search = ''; S.prog = null; S.cand = null; }
}

function attachStepEvents() {
  try {
    if (DEBUG) console.log('attachStepEvents running');
    document.querySelectorAll('[data-clear]').forEach(function(x){
      x.addEventListener('click', function(){ clearFilter(this.getAttribute('data-clear')); render(); });
      x.addEventListener('keydown', function(e){ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); this.click(); } });
    });

  function toggleSingle(stateKey, value) {
    if (S[stateKey] === value) S[stateKey] = null; else S[stateKey] = value;
    S.prog = null; S.cand = null;
  }

  var chGrp = document.getElementById('ch-grp');
  if (chGrp) chGrp.querySelectorAll('[data-ch]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var newCh = this.getAttribute('data-ch');
      // In sostituzione step 2, changing channel uses candidate-specific state
      if (S.mode === 'sostituzione' && S.step === 2) {
        S._candCh = (S._candCh === newCh) ? null : newCh;
        S.cand = null;
        render(); return;
      }
      toggleSingle('ch', newCh); render();
    });
  });

  var dateInp = document.getElementById('date-inp');
  var dateDisplayBtn = document.getElementById('date-display-btn');
  
  if (dateInp && dateDisplayBtn) {
    // Click on button opens the date picker
    dateDisplayBtn.addEventListener('click', function(){
      dateInp.showPicker ? dateInp.showPicker() : dateInp.focus();
    });
    
    dateInp.addEventListener('change', function(){
      // if we're on spostamento source step, keep source date separate
      if (S.mode === 'spostamento' && S.step === 0) {
        S.spSrcDay = this.value;
      } else {
        S.date = this.value;
        updateProgLoadBtn();
      }
      updateCtxBar();
      render();
    });
  }

  function updateSlotFromInputs() {
    var from = document.getElementById('time-from');
    var to   = document.getElementById('time-to');
    var fv = from ? from.value : '';
    var tv = to   ? to.value   : '';
    var slotVal = (fv && tv) ? fv+'-'+tv : (fv ? fv+'-' : (tv ? '-'+tv : null));
    if (S.mode === 'sostituzione' && S.step === 2) {
      S._candSlot = slotVal; S.cand = null;
    } else {
      S.slot = slotVal; S.prog = null; S.cand = null;
    }
  }
  var timeFrom = document.getElementById('time-from');
  var timeTo   = document.getElementById('time-to');
  if (timeFrom) timeFrom.addEventListener('change', function(){ updateSlotFromInputs(); render(); });
  if (timeTo)   timeTo.addEventListener('change',   function(){ updateSlotFromInputs(); render(); });
  var timeClearBtn = document.getElementById('time-clear-btn');
  if (timeClearBtn) timeClearBtn.addEventListener('click', function(){
    if (S.mode === 'sostituzione' && S.step === 2) { S._candSlot = null; S.cand = null; }
    else { S.slot = null; S.prog = null; S.cand = null; }
    render();
  });

  var tipoGrp = document.getElementById('tipo-grp');
  if (tipoGrp) tipoGrp.querySelectorAll('[data-tipo]').forEach(function(btn){
    btn.addEventListener('click', function(){ toggleSingle('tipo', this.getAttribute('data-tipo')); render(); });
  });

  var etaGrp = document.getElementById('eta-grp');
  if (etaGrp) etaGrp.querySelectorAll('[data-eta]').forEach(function(btn){
    btn.addEventListener('click', function(){ toggleSingle('eta', this.getAttribute('data-eta')); render(); });
  });

  var sexGrp = document.getElementById('sex-grp');
  if (sexGrp) sexGrp.querySelectorAll('[data-sesso]').forEach(function(btn){
    btn.addEventListener('click', function(){ toggleSingle('sesso', this.getAttribute('data-sesso')); render(); });
  });

  var durGrp = document.getElementById('dur-grp');
  if (durGrp) durGrp.querySelectorAll('[data-dur]').forEach(function(btn){
    btn.addEventListener('click', function(){ var v = this.getAttribute('data-dur'); toggleSingle('dur', Number(v)); render(); });
  });

  var shareGrp = document.getElementById('share-grp');
  if (shareGrp) shareGrp.querySelectorAll('[data-share]').forEach(function(btn){
    btn.addEventListener('click', function(){ toggleSingle('share', this.getAttribute('data-share')); render(); });
  });

  var progSearch = document.getElementById('prog-search');
  if (progSearch) {
    progSearch.addEventListener('input', function(){
      var val = this.value;
      var pos = this.selectionStart;
      if (S.mode === 'sostituzione' && S.step === 2) {
        S._candSearch = val; S.cand = null;
      } else {
        S._search = val;
      }
      render();
      var ns = document.getElementById('prog-search');
      if (ns) { ns.focus(); try{ ns.setSelectionRange(pos, pos); }catch(_){} }
    });
  }
  var quick = document.getElementById('quick-results');
  if (quick) quick.querySelectorAll('[data-qpid]').forEach(function(card){
    card.addEventListener('click', function(){
      var pid = this.getAttribute('data-qpid');
      S.prog = PROGS.find(function(p){ return p.id === pid; }) || null;
      // DON'T advance step or change filters - just select and stay on step 0
      render();
    });
  });

  var progSearch1 = document.getElementById('prog-search-1');
  if (progSearch1) progSearch1.addEventListener('input', function(){
    S._search = this.value; render();
    var ns = document.getElementById('prog-search-1') || document.getElementById('prog-search');
    if (ns) { ns.focus(); try{ var l=ns.value.length; ns.setSelectionRange(l,l); }catch(_){} }
  });
  var btnClearSearch = document.getElementById('btn-clear-search');
  if (btnClearSearch) btnClearSearch.addEventListener('click', function(){ S._search=''; render(); });
  var btnClearCandSearch = document.getElementById('btn-clear-cand-search');
  if (btnClearCandSearch) btnClearCandSearch.addEventListener('click', function(){ S._candSearch=''; render(); });

  // Candidate filter dropdowns
  var candChSelect = document.getElementById('cand-ch-select');
  if (candChSelect) candChSelect.addEventListener('change', function(){
    S._candCh = this.value || null;
    S.cand = null;
    render();
  });

  var candGenereSelect = document.getElementById('cand-genere-select');
  if (candGenereSelect) candGenereSelect.addEventListener('change', function(){
    S._candGenere = this.value || null;
    S.cand = null;
    render();
  });

  var candEtaSelect = document.getElementById('cand-eta-select');
  if (candEtaSelect) candEtaSelect.addEventListener('change', function(){
    S._candEta = this.value || null;
    S.cand = null;
    render();
  });

  var candShareSelect = document.getElementById('cand-share-select');
  if (candShareSelect) candShareSelect.addEventListener('change', function(){
    S._candShare = this.value || null;
    S.cand = null;
    render();
  });

  var progList = document.getElementById('prog-list-items');
  if (progList) progList.querySelectorAll('[data-pid]').forEach(function(card){
    card.addEventListener('click', function(){
      var pid = this.getAttribute('data-pid');
      var clickedProg = PROGS.find(function(p){ return p.id === pid; }) || null;
      // Toggle selection: if same program clicked, deselect it
      if (S.prog && S.prog.id === pid) {
        S.prog = null;
      } else {
        S.prog = clickedProg;
        if (S.prog) {
          // DON'T change filters - just select the program
          S.activeScen = pickScenarioForProgram(S.prog, S.mode);
          // Se la data non è impostata, usa la data corrente come default
          if (!S.date) {
            S.date = formatDateToISOLocal(new Date());
          }
          // Per spostamento, salva la data originale del programma
          if (S.mode === 'spostamento') {
            S.spSrcDay = S.date;
          }
        }
      }
      S.cand = null;
      updateCtxBar();
      // Stay on step 0 - don't advance, just re-render to show selection
      render();
    });
    card.addEventListener('keydown', function(e){ if (e.key==='Enter'||e.key===' '){e.preventDefault();this.click();} });
  });

  var candList = document.getElementById('cand-list-items');
  if (candList) candList.querySelectorAll('[data-cid]').forEach(function(el){
    el.addEventListener('click', function(){
      var cid = this.getAttribute('data-cid');
      S.cand = PROGS.find(function(p){ return p.id === cid; }) || null;
      render();
    });
    el.addEventListener('keydown', function(e){ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); this.click(); } });
  });

  var btnChangeCand = document.getElementById('btn-change-cand');
  if (btnChangeCand) btnChangeCand.addEventListener('click', function(){ S.cand = null; render(); });

  var btnT = document.getElementById('btn-toggle-comp');
  if (btnT) btnT.addEventListener('click', function(){ S.showComp = !S.showComp; render(); });

  var btnToggleCompRes = document.getElementById('btn-toggle-comp-res');
  if (btnToggleCompRes) btnToggleCompRes.addEventListener('click', function(){ S._showCompRes = !S._showCompRes; render(); });

  // Strong event buttons - now using persistent keys
  document.querySelectorAll('[data-comp-key]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var eventKey = this.getAttribute('data-comp-key');
      if (!S._strongEventsStore) S._strongEventsStore = {};
      
      if (S._strongEventsStore[eventKey]) {
        // Remove from strong events
        delete S._strongEventsStore[eventKey];
      } else {
        // Add to strong events
        S._strongEventsStore[eventKey] = true;
      }
      render();
    });
  });

  var btnSim = document.getElementById('btn-simulate');
  if (btnSim) btnSim.addEventListener('click', function(){ simulateThis(); });

  // inline result actions
  var btnAddInline = document.getElementById('btn-add-scen-inline');
  if (btnAddInline) btnAddInline.addEventListener('click', function(){ if (!S._simResult || !S._simResult.items) return showToast('Nessuna simulazione da salvare.'); addToScenario(S._simResult.items[0].res); });
  var btnGoFull = document.getElementById('btn-go-full-result');
  if (btnGoFull) btnGoFull.addEventListener('click', function(){ 
    // If a move simulation was run, materialize a _simResult so the full result view can show it
    if (S._spSimulated && (!S._simResult || !S._simResult.items)) {
      var res = predictShare(S.prog, {id:'move', tipo:S.prog.tipo, eta:S.prog.eta, sesso:S.prog.sesso});
      S._simResult = { items: [{ orig: S.prog, cand: { id: 'move', title: 'Spostamento', tipo: S.prog.tipo }, date: S.spDestDay || S.date, destTime: S.spDestTime || null, res: res }] };
      S._viewSim = true;
    }
    S._showInlineResult = false; S.step = getSteps().length - 1; render();
  });

  document.querySelectorAll('[data-scen]').forEach(function(card){
    card.addEventListener('click', function(){ S.activeScen = parseInt(this.getAttribute('data-scen')); render(); });
  });

  // Make the title edit pencil clickable in compact and detailed views
  document.querySelectorAll('.btn-edit-title-scn').forEach(function(b){ b.addEventListener('click', function(ev){ ev.stopPropagation(); var s = parseInt(this.getAttribute('data-scn'),10); if (isNaN(s)) return; startEditScenarioTitle(s); }); });
  // Save / Cancel handlers for inline editing (if present)
  document.querySelectorAll('.btn-save-title').forEach(function(b){ b.addEventListener('click', function(ev){ ev.stopPropagation(); var s = parseInt(this.getAttribute('data-scn'),10); if (isNaN(s)) return; saveScenarioTitle(s); }); });
  document.querySelectorAll('.btn-cancel-title').forEach(function(b){ b.addEventListener('click', function(ev){ ev.stopPropagation(); var s = parseInt(this.getAttribute('data-scn'),10); if (isNaN(s)) return; cancelScenarioTitle(s); }); });

  var btnLoadSrc = document.getElementById('btn-load-src');
  if (btnLoadSrc) btnLoadSrc.addEventListener('click', function(){ S._srcLoaded = true; render(); });

  // btn-load-auditel removed: Auditel population occurs automatically after table render
  
  // Canale destinazione
  var chGrpDest = document.getElementById('ch-grp-dest');
  if (chGrpDest) chGrpDest.querySelectorAll('[data-dest-ch]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var newCh = this.getAttribute('data-dest-ch');
      S.spDestCh = (S.spDestCh === newCh) ? null : newCh;
      // Mantieni i filtri orario From/To quando cambia canale
      S.spDestTime = null;
      S.spDestTimeEnd = null;
      S._spSimulated = false;
      render();
    });
  });
  
  // Orario destinazione
  var destTimeSelect = document.getElementById('sp-dest-time');
  if (destTimeSelect) {
    destTimeSelect.addEventListener('change', function(){
      S.spDestTime = this.value || null;
      // Calcola l'orario di fine basandosi sulla durata del programma originale
      if (S.spDestTime && S.prog && S.prog.time && S.prog.end) {
        var toMin = function(t){ if(!t)return 0; var x=t.split(':'); return Number(x[0])*60+Number(x[1]); };
        var toTime = function(m){ var h=Math.floor(m/60)%24; var min=m%60; return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0'); };
        var origStart = toMin(S.prog.time);
        var origEnd = toMin(S.prog.end);
        if (origEnd < origStart) origEnd += 1440; // handle midnight crossing
        var duration = origEnd - origStart;
        var destStart = toMin(S.spDestTime);
        var destEnd = destStart + duration;
        S.spDestTimeEnd = toTime(destEnd);
      } else {
        S.spDestTimeEnd = null;
      }
      S._spSimulated = false;
      render();
    });
  }
  
  // Il palinsesto in spostamento è solo informativo - nessun click handler necessario
  // La selezione dello slot avviene tramite i filtri (canale + data + orario)
  
  // Paginazione spostamento (stile uniforme a sostituzione)
  var spPager = document.getElementById('psel-pager-sp');
  if (spPager) {
    spPager.querySelectorAll('[data-page]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var pg = this.getAttribute('data-page');
        if (pg === 'prev' && S._spProgPage > 1) S._spProgPage--;
        else if (pg === 'next') S._spProgPage++;
        else S._spProgPage = parseInt(pg, 10);
        render();
      });
    });
  }

  // Data destinazione - pulsante display
  var spDay = document.getElementById('sp-dest-day');
  var spDayBtn = document.getElementById('sp-dest-day-btn');
  if (spDay && spDayBtn) {
    spDayBtn.addEventListener('click', function(){
      spDay.showPicker ? spDay.showPicker() : spDay.focus();
    });
    spDay.addEventListener('change', function(){
      S.spDestDay = this.value;
      S.spDestTime = null; // reset slot quando cambia data
      S.spDestTimeEnd = null;
      S._spSimulated = false;
      render();
    });
  }

  var btnBack0 = document.getElementById('btn-back-0');
  if (btnBack0) btnBack0.addEventListener('click', function(){ backToLanding(); });
  var btnBackMode = document.getElementById('btn-back-mode');
  if (btnBackMode) btnBackMode.addEventListener('click', function(){ S.step = 0; render(); });
  var btnNextMode = document.getElementById('btn-next-mode');
  if (btnNextMode) btnNextMode.addEventListener('click', function(){
    if (!S.mode) return showToast('Seleziona prima il tipo di simulazione.');
    S.step = 2; render();
  });
  // Mode choice cards in step 1: handled via inline onclick="setSimMode()", no listener needed here
  var btnBack1 = document.getElementById('btn-back-1'); if (btnBack1) btnBack1.addEventListener('click', prevStep);
  var btnBack2 = document.getElementById('btn-back-2'); if (btnBack2) btnBack2.addEventListener('click', function(){ S.step = 1; render(); });
  var btnBackScen = document.getElementById('btn-back-scen');
  if (btnBackScen) btnBackScen.addEventListener('click', function(){
    if (S.mode === 'sostituzione') {
      backToLanding();
    } else {
      S.step = 2; S._simSaved = false; render();
    }
  });

  // Home button in basso quando scenario è completo
  var btnHomeBottom = document.getElementById('btn-home-bottom');
  if (btnHomeBottom) {
    btnHomeBottom.addEventListener('click', function() {
      backToLanding();
    });
  }
  
  ['btn-next-0','btn-next-2'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function(){
      if (id === 'btn-next-2') S._simSaved = false;
      // Per spostamento, salva la data dello slot originale quando si passa da step 0 a step 1
      if (id === 'btn-next-0' && S.mode === 'spostamento' && S.step === 0) {
        // Se la data non è impostata, usa la data corrente
        if (!S.date) {
          S.date = formatDateToISOLocal(new Date());
        }
        S.spSrcDay = S.date;
      }
      nextStep();
    });
  });
  // Custom handler for destination->result in spostamento: auto-run simulation if not yet run
  var btnNext1 = document.getElementById('btn-next-1');
  if (btnNext1) {
    // ensure enabled state reflects the current mode
    try {
      if (S.mode === 'spostamento') btnNext1.disabled = !(S.spDestCh && S.spDestDay && S.spDestTime);
      else btnNext1.disabled = !(S.spDestDay && S.spDestTime);
    } catch(e){}
    btnNext1.addEventListener('click', function(e){
      e.preventDefault();
      if (S.mode === 'spostamento') {
        // if not ready, show a hint
        if (!(S.spDestCh && S.spDestDay && S.spDestTime)) return showToast('Seleziona canale, giorno e orario di destinazione');
        if (S.step === 2) {
          if (!S._spSimulated) {
            // capacity check before auto-running the move simulation
            try {
              var idx = pickScenarioForProgram(S.prog, 'spostamento');
              var sc = S.scenarios[idx];
              if (sc && sc.items && sc.items.length >= 3) {
                var scenarioName = sc.customName || (sc.anchor ? sc.anchor.title : null) || ('Scenario ' + idx);
                return showToast('⚠️ ' + scenarioName + ' ha già 3 elementi: non è possibile simulare ulteriormente per questo scenario.');
              }
            } catch(e) {}
            S._spSimulated = true; S._destLoaded = true;
          }
          S.step++; render();
        } else {
          nextStep();
        }
      } else {
        // substitution flow: simply advance to next step
        nextStep();
      }
    });
  }
  var btnNew = document.getElementById('btn-new-sim');
  if (btnNew) btnNew.addEventListener('click', function(){
    // Reset variables based on mode
    S.step = 2; S._simSaved = false;
    if (S.mode === 'sostituzione') {
      S.cand = null; S._candCh = null; S._candSlot = null; S._candSearch = '';
    } else if (S.mode === 'spostamento') {
      S.spDestCh = null; S.spDestDay = null; S.spDestTime = null; S.spDestTimeEnd = null; S._spSimulated = false;
    }
    render();
  });

  

  // Handler for the new 'Aggiungi a Scenario' button in the result view
  var btnAddResult = document.getElementById('btn-add-scen-result');
  if (btnAddResult) {
    btnAddResult.addEventListener('click', function(){
      // if there's no _simResult, try to synthesize one from S.prog and S.cand
      if (!S._simResult || !S._simResult.items || !S._simResult.items.length) {
        if (S.prog && S.cand) {
          try { var r = predictShare(S.prog, S.cand); S._simResult = { items: [{ orig: S.prog, cand: S.cand, date: S.date, res: r }] }; S._viewSim = true; } catch(e) { return showToast('Errore simulazione.'); }
        } else return showToast('Nessuna simulazione da salvare.');
      }
      var it = S._simResult.items[0];
      if (!S.prog && it.orig) S.prog = it.orig;
      if (!S.cand && it.cand) S.cand = it.cand;
      addToScenario(it.res);
    });
  }
  var btnSaveSim = document.getElementById('btn-save-sim');
  if (btnSaveSim) {
    btnSaveSim.addEventListener('click', function(){
      // Save current view state so we can stay on the result view after saving
      var prevStep = S.step; var prevView = S._viewSim; var prevActive = S.activeScen; var prevMode = S.mode;
      // prepare a result object if needed
      var resObj = null;
      if (!S._simResult || !S._simResult.items || !S._simResult.items.length) {
        // Handle spostamento mode
        if (S.mode === 'spostamento' && S.prog) {
          try {
            resObj = predictShare(S.prog, {id:'move', tipo:S.prog.tipo, eta:S.prog.eta, sesso:S.prog.sesso});
          } catch(e) {
            return showToast('Errore simulazione.');
          }
        }
        // Handle sostituzione mode
        else if (S.prog && S.cand) {
          try { resObj = predictShare(S.prog, S.cand); } catch(e) { return showToast('Errore simulazione.'); }
        } else return showToast('Nessuna simulazione da salvare.');
      } else {
        resObj = S._simResult.items[0].res;
      }
      // ensure S.prog and S.cand exist for addToScenario
      if (!S.prog && S._simResult && S._simResult.items && S._simResult.items[0].orig) S.prog = S._simResult.items[0].orig;
      if (!S.cand && S._simResult && S._simResult.items && S._simResult.items[0].cand) S.cand = S._simResult.items[0].cand;
      
      // Call appropriate save function based on mode
      if (S.mode === 'spostamento') {
        addMoveToScenario(resObj);
      } else {
        addToScenario(resObj);
      }
      
      // mark as saved and stay on result view
      S._simSaved = true;
      S.step = prevStep; S._viewSim = prevView; S.mode = prevMode;
      render();
    });
  }

  // Go to Scenarios button (save context to return)
  var btnGoScenarios = document.getElementById('btn-go-scenarios');
  if (btnGoScenarios) {
    btnGoScenarios.addEventListener('click', function(){
      // Save current simulation state to return later
      S._savedSimState = {
        step: S.step,
        prog: S.prog,
        cand: S.cand,
        mode: S.mode,
        date: S.date,
        ch: S.ch,
        slot: S.slot,
        simSaved: S._simSaved,
        simResult: S._simResult,
        // Variabili specifiche spostamento
        spDestCh: S.spDestCh,
        spDestDay: S.spDestDay,
        spDestTime: S.spDestTime,
        spDestTimeEnd: S.spDestTimeEnd,
        _spSimulated: S._spSimulated
      };
      S._fromSimResult = true;
      navScen();
    });
  }

  // Deselect program button
  var btnDeselectProg = document.getElementById('btn-deselect-prog');
  if (btnDeselectProg) {
    btnDeselectProg.addEventListener('click', function(){
      S.prog = null;
      S.cand = null;
      updateCtxBar();
      render();
    });
  }

  // Paginazione – step 0 (Seleziona Programma)
  var pager0 = document.getElementById('psel-pager-0');
  if (pager0) pager0.querySelectorAll('[data-page]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var p = this.getAttribute('data-page');
      if (p === 'prev') S._progPage = Math.max(1, (S._progPage||1) - 1);
      else if (p === 'next') S._progPage = (S._progPage||1) + 1;
      else S._progPage = parseInt(p, 10);
      render();
    });
  });
  // Paginazione – step 2 (Programmi Sostitutivi)
  var pager2el = document.getElementById('psel-pager-2');
  if (pager2el) pager2el.querySelectorAll('[data-page]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var p = this.getAttribute('data-page');
      if (p === 'prev') S._candPage = Math.max(1, (S._candPage||1) - 1);
      else if (p === 'next') S._candPage = (S._candPage||1) + 1;
      else S._candPage = parseInt(p, 10);
      render();
    });
  });

  } catch (err) {
    console.error('Errore in attachStepEvents:', err);
    try { showToast('Errore eventi: vedi console per dettagli'); } catch(e){}
  }
}
