/* ================================================================
   NAV
================================================================ */
function setActiveNav(id) {
  document.querySelectorAll('.sb-item').forEach(function(el){ el.classList.remove('active'); });
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function navSim() {
  S.mode = null; S.step = 0; S.prog = null; S.cand = null; S._viewSim = false; S._simResult = null;
  S.showComp = false; S._srcLoaded = false; S._destLoaded = false; S._spSimulated = false;
  
  // Check if we need to restore state after reset (coming from scenarios)
  var restoreState = S._restoreAfterNav;
  if (restoreState) {
    S.step = restoreState.step;
    S.prog = restoreState.prog;
    S.cand = restoreState.cand;
    S.mode = restoreState.mode;
    S.date = restoreState.date;
    S.ch = restoreState.ch;
    S.slot = restoreState.slot;
    if (restoreState.simSaved !== undefined) S._simSaved = restoreState.simSaved;
    if (restoreState.simResult) S._simResult = restoreState.simResult;
    // Ripristina variabili spostamento
    if (restoreState.spDestCh !== undefined) S.spDestCh = restoreState.spDestCh;
    if (restoreState.spDestDay !== undefined) S.spDestDay = restoreState.spDestDay;
    if (restoreState.spDestTime !== undefined) S.spDestTime = restoreState.spDestTime;
    if (restoreState.spDestTimeEnd !== undefined) S.spDestTimeEnd = restoreState.spDestTimeEnd;
    if (restoreState.spDestTimeFrom !== undefined) S.spDestTimeFrom = restoreState.spDestTimeFrom;
    if (restoreState.spDestTimeTo !== undefined) S.spDestTimeTo = restoreState.spDestTimeTo;
    if (restoreState._spSimulated !== undefined) S._spSimulated = restoreState._spSimulated;
    S._restoreAfterNav = null;
  }
  
  forceShowSection('sec-sim','Simulazione');
  setActiveNav('nav-sim');
  // go directly to the unified flow at step 0 (no landing page)
  try { document.getElementById('sim-landing').style.display = 'none'; document.getElementById('sim-flow').style.display = 'block'; } catch(e){}
  setTimeout(function(){ try{ render(); } catch(e){ console.error('navSim render failed', e); try{ showToast('Errore caricamento Simulazione (vedi console)'); }catch(_){} } }, 0);
}

function showProgLanding() {
  // Lightweight show to avoid blank screens
  forceShowSection('sec-prog','Palinsesti');
  setActiveNav('nav-prog');
  try { document.getElementById('tb-ctx').style.display = 'none'; } catch(e){}
  try { document.getElementById('prog-landing').style.display = 'block'; document.getElementById('prog-flow').style.display = 'none'; } catch(e){}
  // initialize controls so the UI is immediately interactive after switching
  try { initWeeklyControls(); } catch(e) { setTimeout(initWeeklyControls, 80); }
  updateProgLoadBtn();
  // defer heavy render to avoid blocking the UI
  setTimeout(function(){ try { try { renderWeeklySchedule(); } catch(e) { debouncedRenderWeeklySchedule(); } console.log('showProgLanding()'); } catch(e) { console.error('showProgLanding render failed', e); try{ showToast('Errore caricamento Programmazione (vedi console)'); } catch(_){} } }, 0);
}

/* ================================================================
   PROGRAMMAZIONE SETTIMANALE (nuova UI)
================================================================ */
function showWeekly() {
  // show weekly section
  // make the section visible and hide others (more robust fallback)
  try { document.getElementById('sec-sim').classList.remove('active'); } catch(e){}
  try { document.getElementById('sec-prog').classList.add('active'); } catch(e){}
  try { document.getElementById('sec-scen').classList.remove('active'); } catch(e){}
  try { document.getElementById('tb-title').textContent = 'Programmazione settimanale'; } catch(e){}
  try { document.getElementById('tb-ctx').style.display = 'none'; } catch(e){}
  setActiveNav('nav-prog');
  // lightweight show first
  forceShowSection('sec-prog','Programmazione settimanale');
  // ensure controls exist and initialize immediately and also as fallback
  try { initWeeklyControls(); } catch(e) { setTimeout(initWeeklyControls, 80); }
  // defer rendering the weekly table to avoid blocking
  setTimeout(function(){ try { try { renderWeeklySchedule(); } catch(e) { debouncedRenderWeeklySchedule(); } console.log('showWeekly()'); } catch(e) { console.error('showWeekly render failed', e); try{ showToast('Errore caricamento Programmazione (vedi console)'); }catch(_){} } }, 0);
  try { var sp = document.getElementById('sec-prog'); if (sp) { sp.style.display = ''; } } catch(e){}
  try { var ss = document.getElementById('sec-sim'); if (ss) { ss.style.display = 'none'; } } catch(e){}
  try { var ssc = document.getElementById('sec-scen'); if (ssc) { ssc.style.display = 'none'; } } catch(e){}
}

// state: per tenere override manuali dei valori Previsto per giorno
S.weekManuals = {}; // key: ISO date (YYYY-MM-DD) -> numeric value

function initWeeklyControls() {
  var ch = document.getElementById('pw-channel');
  var dateInp = document.getElementById('pw-week-date');
  var prevBtn = document.getElementById('pw-prev');
  var nextBtn = document.getElementById('pw-next');
  var loadPalBtn = document.getElementById('pw-load-pal');
  var resetBtn = document.getElementById('pw-reset');
  var fascia = document.getElementById('pw-fascia');
  // ensure essential controls exist; avoid referencing undefined variables
  if (!ch || !dateInp) return;

  // default channel
  ch.value = S.wCh || '';
  ch.onchange = function(){ S.wCh = ch.value; if (S._wkExplicit) setWeekDisplayFromISO(S.weekStartISO); updateProgLoadBtn(); setSelectableWeeksUI(); if (S.wLoaded && S._wkExplicit) debouncedRenderWeeklySchedule(); };

  // constrain selectable dates: weeks run Wed→Tue. Allow any past week up to the current week.
  var today = new Date();
  var thisMon = getWeekMonday(formatDateToISOLocal(today)); // current week's Monday (on or before today)
  // No hard lower bound: user can navigate all previous weeks
  dateInp.min = '';
  // Maximum is computed from horizon (today + 6 days) — prevent selecting beyond maxWeekStart
  dateInp.max = maxSelectableWeekStart(new Date());
  // restore previously selected week if any, but do NOT auto-fill
  dateInp.value = S._wkExplicit ? (S.weekStartISO || '') : '';
  if (!S._wkExplicit) { S.weekStartISO = null; }
  // wire a visible week-display button to open the custom week picker
  var weekDisplay = document.getElementById('pw-week-display');

  function isoWeekNum(d) {
    var dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    var ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    return Math.ceil((((dt - ys) / 86400000) + 1) / 7);
  }

  function getOrCreateWeekPicker() {
    var pop = document.getElementById('wkp-popup');
    if (pop && pop._renderMonth) return pop;
    if (!pop) { pop = document.createElement('div'); pop.id = 'wkp-popup'; document.body.appendChild(pop); }
    pop.innerHTML =
      '<div class="wkp-header"><span class="wkp-month-lbl" id="wkp-month-lbl"></span>' +
      '<button class="wkp-nav-btn" id="wkp-prev-m">↑</button><button class="wkp-nav-btn" id="wkp-next-m">↓</button></div>' +
      '<table class="wkp-table"><thead><tr><th>Settimana</th><th>lu</th><th>ma</th><th>me</th><th>gi</th><th>ve</th><th>sa</th><th>do</th></tr></thead>' +
      '<tbody id="wkp-tbody"></tbody></table>' +
      '<div class="wkp-footer"><button class="wkp-footer-btn" id="wkp-cancel">Cancella</button><button class="wkp-footer-btn" id="wkp-this-week">Questa settimana</button></div>';
    var _yr, _mo;
    function renderMonth(year, month) {
      _yr = year; _mo = month;
      document.getElementById('wkp-month-lbl').textContent =
        new Date(year, month, 1).toLocaleDateString('it-IT', {month:'long', year:'numeric'});
      var firstDay = new Date(year, month, 1);
      var dow = firstDay.getDay() || 7;
      var cur = new Date(firstDay); cur.setDate(1 - (dow - 1));
      var today = new Date(); today.setHours(0,0,0,0);
      var curMon = new Date(getWeekMonday(formatDateToISOLocal(today))); curMon.setHours(0,0,0,0);
      var selMon = S._wkExplicit && S.weekStartISO ? (function(){ var d = new Date(S.weekStartISO + 'T00:00:00'); d.setHours(0,0,0,0); return d; })() : null;
      var html = '';
      for (var row = 0; row < 6; row++) {
        var mon = new Date(cur); mon.setHours(0,0,0,0);
        var isDisabled = mon > curMon;
        var isSelected = selMon && mon.getTime() === selMon.getTime();
        var rc = 'wkp-week-row' + (isDisabled ? ' wkp-disabled' : '') + (isSelected ? ' wkp-selected' : '');
        html += '<tr class="' + rc + '" data-iso="' + formatDateToISOLocal(mon) + '">';
        html += '<td class="wkp-week-num">' + isoWeekNum(mon) + '</td>';
        for (var di = 0; di < 7; di++) {
          var cell = new Date(cur); cell.setHours(0,0,0,0);
          var cls = 'wkp-day' + (cell.getMonth() !== month ? ' wkp-other-month' : '') + (cell.getTime() === today.getTime() ? ' wkp-today' : '');
          html += '<td class="' + cls + '">' + cell.getDate() + '</td>';
          cur.setDate(cur.getDate() + 1);
        }
        html += '</tr>';
      }
      var tbody = document.getElementById('wkp-tbody');
      tbody.innerHTML = html;
      tbody.querySelectorAll('.wkp-week-row:not(.wkp-disabled)').forEach(function(tr) {
        tr.addEventListener('click', function() {
          var iso = tr.getAttribute('data-iso');
          S.weekStartISO = iso; S._wkExplicit = true; S.wLoaded = false;
          dateInp.value = iso; setWeekDisplayFromISO(iso); updateProgLoadBtn(); setSelectableWeeksUI();
          if (S.wLoaded && S._wkExplicit) debouncedRenderWeeklySchedule();
          renderMonth(_yr, _mo);
          setTimeout(function(){ pop.style.display = 'none'; }, 100);
        });
      });
    }
    pop._renderMonth = renderMonth;
    document.getElementById('wkp-prev-m').onclick = function(){ var d = new Date(_yr, _mo - 1, 1); renderMonth(d.getFullYear(), d.getMonth()); };
    document.getElementById('wkp-next-m').onclick = function(){ var d = new Date(_yr, _mo + 1, 1); renderMonth(d.getFullYear(), d.getMonth()); };
    document.getElementById('wkp-cancel').onclick = function(){ pop.style.display = 'none'; };
    document.getElementById('wkp-this-week').onclick = function(){
      var t = new Date(); var mon = getWeekMonday(formatDateToISOLocal(t)); var iso = formatDateToISOLocal(mon);
      S.weekStartISO = iso; S._wkExplicit = true; S.wLoaded = false;
      dateInp.value = iso; setWeekDisplayFromISO(iso); updateProgLoadBtn(); setSelectableWeeksUI();
      if (S.wLoaded && S._wkExplicit) debouncedRenderWeeklySchedule();
      pop.style.display = 'none';
    };
    document.addEventListener('mousedown', function(e){
      if (pop.style.display !== 'none' && !pop.contains(e.target) && e.target !== weekDisplay && !weekDisplay.contains(e.target)) pop.style.display = 'none';
    });
    return pop;
  }

  if (weekDisplay) {
    weekDisplay.setAttribute('tabindex','0');
    weekDisplay.style.cursor = 'pointer';
    weekDisplay.onclick = function(){
      var pop = getOrCreateWeekPicker();
      if (pop.style.display !== 'none'){ pop.style.display = 'none'; return; }
      var rect = weekDisplay.getBoundingClientRect();
      pop.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
      pop.style.top = (rect.bottom + window.scrollY + 6) + 'px';
      pop.style.display = 'block';
      var d = S._wkExplicit && S.weekStartISO ? new Date(S.weekStartISO + 'T00:00:00') : new Date();
      pop._renderMonth(d.getFullYear(), d.getMonth());
    };
    weekDisplay.onkeypress = function(e){ if (e.key==='Enter'||e.key===' ') weekDisplay.click(); };
  }
  setWeekDisplayFromISO(S._wkExplicit ? S.weekStartISO : null);

  

  dateInp.onchange = function(){
    // snap selected to nearest Monday on/before selection
    var iso = dateInp.value; if (!iso) return;
    var w = getWeekMonday(iso);
    S.weekStartISO = formatDateToISOLocal(w); S._wkExplicit = true; S.wLoaded = false;
    // clamp to horizon-based max
    try { var maxIso = dateInp.max || maxSelectableWeekStart(new Date()); if (maxIso && S.weekStartISO > maxIso) { S.weekStartISO = maxIso; } } catch(e){}
    dateInp.value = S.weekStartISO;
    setWeekDisplayFromISO(S.weekStartISO);
    updateProgLoadBtn();
    setSelectableWeeksUI();
    if (S.wLoaded && S._wkExplicit) debouncedRenderWeeklySchedule();
  };

  // prev/next week handlers (limit to min/max)
  if (prevBtn) prevBtn.onclick = function(){
    // If no week selected, ask user to pick one instead of navigating (prevents Invalid Date)
    var curIsoVal = S.weekStartISO || (dateInp && dateInp.value) || '';
    if (!curIsoVal || String(curIsoVal).trim() === '') { showToast('Seleziona prima la settimana'); return; }
    var cur = new Date((S.weekStartISO || dateInp.value) + 'T00:00:00'); cur.setDate(cur.getDate() - 7);
    // allow navigating to any previous week (no lower bound)
    S.weekStartISO = formatDateToISOLocal(cur); S._wkExplicit = true; S.wLoaded = false;
    dateInp.value = S.weekStartISO;
    setWeekDisplayFromISO(S.weekStartISO);
    updateWeekNavButtons();
    updateProgLoadBtn();
    setSelectableWeeksUI();
    if (S.wLoaded && S._wkExplicit) debouncedRenderWeeklySchedule();
  };
  if (nextBtn) nextBtn.onclick = function(){
    // prevent action if disabled (visual safeguard) — also enforce horizon check
    if (nextBtn.disabled) { showToast('Non è possibile selezionare oltre la settimana corrente'); return; }
    var cur = new Date((S.weekStartISO || dateInp.value) + 'T00:00:00'); cur.setDate(cur.getDate() + 7);
    var maxIso = dateInp.max || '';
    if (maxIso && formatDateToISOLocal(cur) > maxIso) { showToast('Non è possibile selezionare oltre la settimana corrente'); return; }
    S.weekStartISO = formatDateToISOLocal(cur); S._wkExplicit = true; S.wLoaded = false;
    dateInp.value = S.weekStartISO;
    setWeekDisplayFromISO(S.weekStartISO);
    updateWeekNavButtons();
    updateProgLoadBtn();
    setSelectableWeeksUI();
    if (S.wLoaded && S._wkExplicit) debouncedRenderWeeklySchedule();
  };

  // only render schedule when user explicitly clicks — make this a toggle and require channel+week
  if (loadPalBtn) loadPalBtn.onclick = function(){
    if (!S.wCh) { showToast('Seleziona prima un canale'); return; }
    if (!S._wkExplicit || !S.weekStartISO) { showToast('Seleziona prima una settimana'); return; }
    S.wLoaded = !S.wLoaded;
    if (S.wLoaded) { try { renderWeeklySchedule(); } catch(e) {} }
    else { try { renderWeeklyEmptyState(); } catch(e) { var wr = document.getElementById('weekly-wrap'); if (wr) wr.innerHTML = ''; } }
    updateProgLoadBtn();
  };
  // ensure the button is enabled and clickable even if DOM wiring missed earlier
  if (loadPalBtn) loadPalBtn.disabled = false;
  // (removed redundant delegated listener for #pw-controls)
  resetBtn.onclick = function(){
    // reset manual overrides, week selection and channel filters; hide table
    S.weekManuals = {}; S.weekStartISO = null; S.wCh = ''; S.wLoaded = false; S._wkExplicit = false;
    if (document.getElementById('pw-week-date')) document.getElementById('pw-week-date').value = '';
    if (document.getElementById('pw-channel')) document.getElementById('pw-channel').value = '';
    // reset week display
    setWeekDisplayFromISO(null);
    var wrap = document.getElementById('weekly-wrap'); if (wrap) wrap.innerHTML = '';
    updateProgLoadBtn();
    showToast('Filtri resettati');
  };

  // initial render: do NOT auto-render weekly table; wait for explicit user click
  // normalize empty week value to null to avoid empty-string state bugs
  if (!S.weekStartISO) S.weekStartISO = (dateInp.value && String(dateInp.value).trim()) ? dateInp.value : null;
  // wire fascia change to update summary and optionally re-render
  if (fascia) {
    fascia.value = S.wFascia || fascia.value;
    fascia.onchange = function(){ S.wFascia = fascia.value; setWeekDisplayFromISO(S.weekStartISO); updateProgLoadBtn(); if (S.wLoaded && S._wkExplicit) debouncedRenderWeeklySchedule(); };
  }
  // ensure buttons reflect current state on init
  updateProgLoadBtn();
  // apply week-selectability constraints (horizon) and update nav UI
  setSelectableWeeksUI(); updateWeekNavButtons();
}

// Backwards-compat wrapper: previous code used a Wednesday anchor. For the new behavior
// keep a wrapper but return the Monday of the same week so the UI treats weeks Mon->Sun.
function getWeekWednesday(iso) {
  return getWeekMonday(iso);
}

// return true if the given ISO date belongs to the current week (Wed->Tue)
function isCurrentWeek(iso) {
  if (!iso) return false;
  try {
    var mon = getWeekMonday(iso);
    var curMon = getWeekMonday(formatDateToISOLocal(new Date()));
    return mon.getTime() === curMon.getTime();
  } catch(e){ return false; }
}

function weekNumberFromISO(iso){
  try{
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    // ISO week number algorithm
    var target = new Date(d.valueOf());
    target.setHours(0,0,0,0);
    // Thursday in current week decides the year
    target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
    var firstThursday = new Date(target.getFullYear(),0,4);
    var weekNo = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + (firstThursday.getDay() + 6) % 7) / 7);
    return weekNo;
  } catch(e){ return ''; }
}

function formatWeekPickerLabel(iso){
  if (!iso) return 'Settimana —';
  var d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Settimana —';
  var wk = weekNumberFromISO(iso);
  var y = d.getFullYear();
  return (wk ? ('Settimana ' + wk + ', ' + y) : 'Settimana —');
}

function setWeekDisplayFromISO(iso){
  var btn = document.getElementById('pw-week-display');
  if (!btn) return;
  btn.textContent = formatWeekPickerLabel(iso);
  // keep the visible date input in sync (if present)
  try {
    var dateInpVis = document.getElementById('pw-week-date');
    if (dateInpVis && dateInpVis.tagName === 'INPUT') {
      if (!iso) {
        dateInpVis.value = '';
      } else if (iso instanceof Date) {
        try { dateInpVis.value = formatDateToISOLocal(iso); } catch(e) { dateInpVis.value = String(iso); }
      } else {
        // assume ISO string (YYYY-MM-DD) — set directly but guard against invalid values
        dateInpVis.value = (typeof iso === 'string') ? iso : String(iso);
      }
    }
  } catch(e){}
  var ref = document.getElementById('pw-week-ref');
  if (ref) {
    var range = getWeekRangeLabel(iso);
    var ch = S.wCh || (document.getElementById('pw-channel')||{}).value || 'Rai 1';
    var fas = S.wFascia || (document.getElementById('pw-fascia')||{}).value || '';
    var left = (range && range !== 'Invalid Date - Invalid Date') ? range : '';
    var pieces = [];
    if (left) pieces.push(left);
    if (ch) pieces.push(ch);
    if (fas) pieces.push(fas);
    ref.textContent = pieces.join(' · ');
    // indicate clearly when the selected week is the current week
    try {
      var todayMonIso = formatDateToISOLocal(getWeekMonday(formatDateToISOLocal(new Date())));
      if (iso && iso === todayMonIso) { if (btn) btn.classList.add('on'); }
      else if (btn) btn.classList.remove('on');
    } catch(e){}
  }
}

// Ensure S.weekStartISO is valid; if missing/invalid, set to current week's Monday and update UI
function ensureValidWeekStartISO(){
  try{
    var dateInp = document.getElementById('pw-week-date');
    var today = new Date();
    var thisMon = getWeekMonday(formatDateToISOLocal(today));
    var fallback = formatDateToISOLocal(thisMon);
    var val = (dateInp && dateInp.value) ? dateInp.value : (S.weekStartISO || '');
    if (!val || String(val).trim() === '') {
      S.weekStartISO = fallback;
      if (dateInp) dateInp.value = S.weekStartISO;
      setWeekDisplayFromISO(S.weekStartISO);
      return S.weekStartISO;
    }
    try { var w = getWeekMonday(val); S.weekStartISO = formatDateToISOLocal(w); if (dateInp) dateInp.value = S.weekStartISO; setWeekDisplayFromISO(S.weekStartISO); return S.weekStartISO; } catch(e){ S.weekStartISO = fallback; if (dateInp) dateInp.value = S.weekStartISO; setWeekDisplayFromISO(S.weekStartISO); return S.weekStartISO; }
  }catch(e){ try{ S.weekStartISO = formatDateToISOLocal(getWeekMonday(formatDateToISOLocal(new Date()))); setWeekDisplayFromISO(S.weekStartISO); }catch(_){} }
}

function getNthWeekdayFrom(fromDate, weekdayTarget, direction) {
  // weekdayTarget: 0..6 (Sun..Sat). direction not used now; returns nearest on/before
  var d = new Date(fromDate);
  var day = d.getDay();
  var diff = (day - weekdayTarget + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function renderWeeklySchedule() {
  var wrap = document.getElementById('weekly-wrap');
  if (!wrap) return;
  // Se la settimana non è stata selezionata esplicitamente, mostra lo stato vuoto
  if (!S._wkExplicit) {
    try { renderWeeklyEmptyState(); } catch(e){ wrap.innerHTML = ''; }
    return;
  }
  // Autoload mode: programmazione renders immediately when week/channel selected.
  if (!S.wCh || !S.weekStartISO) {
    wrap.innerHTML = '';
    return;
  }
  var ch = (document.getElementById('pw-channel') || {}).value || S.wCh || 'Rai 1';
  var isoStart = S.weekStartISO || formatDateToISOLocal(new Date());
  var start = new Date(isoStart + 'T00:00:00');
  // ensure it's Monday
  start = getWeekMonday(formatDateToISOLocal(start));
  S.wCh = ch; S.weekStartISO = formatDateToISOLocal(start);

  var days = [];
  for (var i=0;i<7;i++) { var d = new Date(start); d.setDate(start.getDate()+i); days.push(d); }
  // keep track of titles used this week for this channel to avoid repeats
  var weeklyUsed = [];

  var legend = '<div class="pw-legend"><span><strong>Previsto</strong> = stima WhatIF</span><span><strong>Manuale</strong> = valore inserito dall\'utente</span><span><strong>Auditel</strong> = valore osservato</span><span><strong>Scostamento</strong> = Auditel − (Manuale o Previsto)</span></div>';
  var html = legend + '<table id="pw-table" role="table" aria-label="Tabella palinsesto settimanale">'
    + '<caption style="text-align:left;padding:6px 0 10px;font-size:13px;font-weight:800;color:var(--rai-dark);">Palinsesto: ' + ch + ' · ' + getWeekRangeLabel(S.weekStartISO) + '</caption><thead><tr><th class="col-day">Giorno</th><th class="col-time">Orario</th><th class="col-prog">Programma</th><th class="col-prev">Previsto</th><th class="col-manuale">Manuale</th><th class="col-real" title="Valore Auditel osservato">Auditel</th><th class="col-scost" title="Differenza tra Auditel e Previsto">Scostamento</th><th class="col-actions"></th></tr></thead><tbody>';
  days.forEach(function(d, idx){
    var iso = formatDateToISOLocal(d);
    var label = d.toLocaleDateString('it-IT', {weekday:'long'});
    // Usa DAY_SCHED per programmazione reale per canale e giorno della settimana
    var dayOfWeek = d.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab
    var useDaySched = !!(DAY_SCHED[ch] && DAY_SCHED[ch][dayOfWeek] && DAY_SCHED[ch][dayOfWeek].length > 0);
    var toShow;
    if (useDaySched) {
      toShow = DAY_SCHED[ch][dayOfWeek].map(function(p){ return Object.assign({ch: ch}, p); });
    } else {
      // fallback: rotazione generica da PROGS
      var slotFrom = 20*60 + 30; var slotTo = 22*60 + 30; var slotLen = slotTo - slotFrom;
      // build a pool of realistic prime-time candidates (exclude daytime shows)
      var channelCandidates = PROGS.filter(function(p){
        if (p.ch !== ch) return false;
        var accept = false;
        if (p.slot === 'prime') accept = true;
        if (p.time) {
          try {
            var toMins = function(hm){ var a=String(hm).split(':'); return Number(a[0]||0)*60 + Number(a[1]||0); };
            var s = toMins(p.time), e = toMins(p.end||p.time);
            if (e <= s && p.dur) e = s + Number(p.dur);
            var slotFrom = 20*60+30, slotTo = 22*60+30;
            if (s < slotTo && e > slotFrom) accept = true;
            // exclude obvious daytime starters (before 19:00)
            var startHour = Number(String(p.time||'00:00').split(':')[0]);
            if (!isNaN(startHour) && startHour < 19) return false;
          } catch(e){}
        }
        return accept;
      });
      // unique by title
      var seenTitles = {}; var uniq = [];
      channelCandidates.forEach(function(p){ if (p && p.title && !seenTitles[p.title]) { seenTitles[p.title]=true; uniq.push(p); } });
      if (!uniq.length) uniq = [{ id: ch.replace(/\s+/g,'').toLowerCase() + '_fallback_' + idx, title: ch + ' Programma', share: null, ch: ch }];
      // If the user has marked this day/week for manual previso insertion, prefer prime-vision candidates
      var isManualDay = (S.weekManuals && Object.prototype.hasOwnProperty.call(S.weekManuals, iso));
      if (isManualDay) {
        // build first-air pool: prefer PROGS with firstAir flag or types that make sense for prime visions
        var firstPool = PROGS.filter(function(p){
          if (p.ch !== ch) return false;
          if (p.firstAir) return true;
          if (p.slot === 'prime') return true;
          if (p.tipo && (p.tipo.toLowerCase().indexOf('show')!==-1 || p.tipo.toLowerCase().indexOf('sport')!==-1 || p.tipo.toLowerCase().indexOf('serie')!==-1)) return true;
          return false;
        });
        // unique by title
        var seenFA = {}; var uniqFA = [];
        firstPool.forEach(function(p){ if (p && p.title && !seenFA[p.title]) { seenFA[p.title]=true; uniqFA.push(p); } });
        // if still empty, synthesize a few realistic prime-time first-air examples
        if (!uniqFA.length) {
          uniqFA = [
            { id: ch.replace(/\s+/g,'').toLowerCase() + '_fa_show', title: 'Show musicale (prima TV)', tipo: 'Show', firstAir: true, ch: ch },
            { id: ch.replace(/\s+/g,'').toLowerCase() + '_fa_volley', title: 'Partita di pallavolo (diretta)', tipo: 'Sport', firstAir: true, ch: ch },
            { id: ch.replace(/\s+/g,'').toLowerCase() + '_fa_tennis', title: 'Torneo di tennis (diretta)', tipo: 'Sport', firstAir: true, ch: ch }
          ];
        }
        // prefer using uniqFA as source for manual days
        uniq = uniqFA;
      }
      // rotation to vary selection across days and channels
      var chHash = 0; try{ for (var _i=0; _i<ch.length; _i++) chHash += ch.charCodeAt(_i); } catch(e){ chHash = idx; }
      var startIndex = (idx + chHash) % Math.max(1, uniq.length);
      var maxEntries = 2;
      var selected = [];
      // pick up to maxEntries distinct titles not used earlier in the week
      var pickPos = startIndex; var attempts = 0;
      while (selected.length < Math.min(maxEntries, Math.max(1, uniq.length)) && attempts < uniq.length*2) {
        var candidate = uniq[pickPos % uniq.length];
        if (weeklyUsed.indexOf(candidate.title) === -1) {
          selected.push(candidate);
          weeklyUsed.push(candidate.title);
        }
        pickPos++; attempts++;
      }
      // if we couldn't fill distinct titles (pool too small), fill remaining slots by rotating from startIndex
      pickPos = startIndex;
      while (selected.length < Math.min(maxEntries, Math.max(1, uniq.length))) {
        selected.push(uniq[pickPos % uniq.length]); pickPos++;
      }
      // assign contiguous times within the slot
      toShow = [];
      if (selected.length === 1) {
        var s0 = slotFrom; var e0 = slotTo;
        var base0 = selected[0]; var copy0 = Object.assign({}, base0);
        copy0.time = (function(m){ var hh=Math.floor(m/60); var mm=m%60; return (hh<10?'0'+hh:hh)+':'+(mm<10?'0'+mm:mm); })(s0);
        copy0.end = (function(m){ var hh=Math.floor(m/60); var mm=m%60; return (hh<10?'0'+hh:hh)+':'+(mm<10?'0'+mm:mm); })(e0);
        copy0.dur = e0 - s0; copy0.id = copy0.id || (copy0.title.replace(/\s+/g,'').toLowerCase() + '_' + idx);
        toShow.push(copy0);
      } else {
        // choose a realistic split that can vary by day: cycle through 60/60,50/70,70/50
        var splits = [60,50,70]; var firstDur = splits[idx % splits.length]; if (firstDur <=0 || firstDur >= slotLen) firstDur = 60;
        var secondDur = slotLen - firstDur;
        var s = slotFrom;
        for (var si=0; si<selected.length; si++) {
          var dur = (si===0) ? firstDur : secondDur;
          var e = s + dur;
          var base = selected[si]; var copy = Object.assign({}, base);
          copy.time = (function(m){ var hh=Math.floor(m/60); var mm=m%60; return (hh<10?'0'+hh:hh)+':'+(mm<10?'0'+mm:mm); })(s);
          copy.end = (function(m){ var hh=Math.floor(m/60); var mm=m%60; return (hh<10?'0'+hh:hh)+':'+(mm<10?'0'+mm:mm); })(e);
          copy.dur = dur; copy.id = copy.id || (copy.title.replace(/\s+/g,'').toLowerCase() + '_' + idx + '_' + si);
          toShow.push(copy);
          s = e;
        }
      }
    }
    // ensure ordered by start time
    toShow.sort(function(a,b){ var ta = (a.time||'20:30').split(':'); var tb = (b.time||'20:30').split(':'); return (Number(ta[0])*60+Number(ta[1])) - (Number(tb[0])*60+Number(tb[1])); });
    toShow.forEach(function(prog, pIdx){
      var pid = prog.id || (prog.title + '_' + idx + '_' + pIdx);
      // orario: per DAY_SCHED usa orari reali, altrimenti clamp sulla fascia 20:30–23:30
      var timeLabel = (prog && prog.time && prog.end) ? prog.time + '–' + prog.end : '20:30–23:30';
      if (!useDaySched) {
        try {
          var slotFrom = 20*60 + 30; var slotTo = 22*60 + 30;
          var toMins = function(hm){ var a = String(hm||'00:00').split(':'); return Number(a[0]||0)*60 + Number(a[1]||0); };
          var minsToHM = function(m){ var hh = Math.floor(m/60); var mm = m % 60; hh = (hh<10? '0'+hh : ''+hh); mm = (mm<10? '0'+mm : ''+mm); return hh + ':' + mm; };
          if (prog && prog.time) {
            var s = toMins(prog.time || '00:00');
            var e = toMins(prog.end || prog.time || '00:00');
            if (e <= s && prog.dur) e = s + Number(prog.dur);
            var cs = Math.max(s, slotFrom);
            var ce = Math.min(e, slotTo);
            if (ce > cs) timeLabel = minsToHM(cs) + '–' + minsToHM(ce);
            else timeLabel = '20:30–23:30';
          }
        } catch (ex) { timeLabel = (prog && prog.time) ? (prog.time + (prog.end ? '–' + prog.end : '')) : '20:30–23:30'; }
      }
      var isFirstAir = useDaySched ? !!(prog.firstAir) : (!!(prog.firstAir || /prima/i.test(prog.title || '')) || pIdx === 0);
      
      // Previsto: solo dati dal modello WhatIF
      var previstoVal = (prog && typeof prog.share === 'number' && !prog.noWhatIF) ? prog.share : null;
      var previstoDisplay = (typeof previstoVal === 'number') ? previstoVal.toFixed(1) + '%' : '—';
      
      // Manuale: solo dati inseriti dall'utente
      var manualVal = (S.weekManuals && Object.prototype.hasOwnProperty.call(S.weekManuals, iso)) ? S.weekManuals[iso] : null;
      var manualDisplay = (typeof manualVal === 'number') ? manualVal.toFixed(1) + '%' : '—';
      
      // Check if current week is editable (only current week)
      var isCurWeek = (typeof isCurrentWeek === 'function') ? isCurrentWeek(S.weekStartISO) : false;
      
      var pencilSvg = '<svg class="icon-pencil" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
                    + '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>'
                    + '<path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>'
                    + '</svg>';
      var dayCellHtml = (pIdx === 0)
        ? '<td class="day-cell"><div class="day-label">' + label + '</div><div class="day-date">' + fmtDate(iso) + '</div></td>'
        : '<td class="day-cell sub-row"></td>';
      
      // Previsto cell: solo display, NON modificabile
      var prevHtml = '<td>' + previstoDisplay + '</td>';
      
      // Manuale cell: modificabile solo per settimana corrente
      var isExample = !(typeof manualVal === 'number');
      var hasManualValue = (typeof manualVal === 'number');
      var exampleNum = (Math.round((Math.random()*4.5 + 0.5)*10)/10).toFixed(1); // 0.5 - 5.0
       var exampleAttr = isExample ? ' data-example="1" data-example-val="'+exampleNum+'"' : ' data-example="0"';
       var exampleClass = isExample ? ' example' : '';
       var placeholderText = isExample ? ('es. ' + exampleNum + ' %') : '';
       var valueAttr = (!isExample && typeof manualVal === 'number') ? (' value="' + String(manualVal) + '"') : ' value=""';
       var manualCellClass = hasManualValue ? 'manual-cell has-value' : 'manual-cell';
       var manualHtml = '<td class="' + manualCellClass + '">'
         + (isCurWeek ? '<div class="prev-edit">' + pencilSvg
         + '<input type="number" step="0.1" min="0" max="100" class="prev-input'+exampleClass+'"' + valueAttr + ' placeholder="'+placeholderText+'"'+exampleAttr+' />'
         + '<span class="prev-suffix">%</span>'
         + '</div>' : (hasManualValue ? '<span class="prev-val">' + manualDisplay + '</span>' : '—')) + '</td>';

      html += '<tr data-iso="'+iso+'" data-pid="'+pid+'"'+(isFirstAir? ' data-first="1"':'')+(pIdx===0? ' data-first-prog="1"':'')+'>' + dayCellHtml
        + '<td class="time-cell">'+timeLabel+'</td>'
        + '<td><div class="p-title">'+(prog.title||'Programma')+(isFirstAir ? '<span class="p-badge-prima">1ª TV</span>' : '')+'</div></td>'
        + prevHtml
        + manualHtml
        + '<td class="real-cell">—</td><td class="scost-cell">—</td>'
        + '<td class="actions-cell"><button class="btn-altri" data-iso="'+iso+'" data-ch="'+ch+'" data-time="'+(prog.time||'20:30')+'" data-end="'+(prog.end||'23:30')+'" title="Vedi altri canali">Altri canali</button></td>'
        + '</tr>';
    });
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  // Robust normalization: rebuild each row's tds from the data model (PROGS + S.weekManuals)
  try{
    Array.from(document.querySelectorAll('#pw-table tbody tr')).forEach(function(origTr){
      try{
        var iso = origTr.getAttribute('data-iso') || '';
        var pid = origTr.getAttribute('data-pid') || '';
        var isFirstProg = origTr.getAttribute('data-first-prog') === '1';
        // lookup program object by pid; fallback to title text if not found
        var prog = PROGS.find(function(p){ return p && p.id === pid; }) || null;
        var titleText = prog ? prog.title : ((origTr.querySelector('.p-title')||{}).textContent || 'Programma');
        var timeText = (origTr.querySelector('.time-cell')||{}).textContent || '20:30–23:30';

        // Previsto: solo dati dal modello
        var previstoVal = (prog && typeof prog.share === 'number' && !prog.noWhatIF) ? Number(prog.share) : null;
        var previstoDisplay = (typeof previstoVal === 'number') ? previstoVal.toFixed(1) + '%' : '—';
        
        // Manuale: solo dati da S.weekManuals
        var manualVal = (S.weekManuals && Object.prototype.hasOwnProperty.call(S.weekManuals, iso)) ? S.weekManuals[iso] : null;
        
        // Check if current week is editable (only current week)
        var isCurWeek = (typeof isCurrentWeek === 'function') ? isCurrentWeek(S.weekStartISO) : false;
        
        var isExample = !(typeof manualVal === 'number');
        var exampleNum = (Math.round((Math.random()*4.5 + 0.5)*10)/10).toFixed(1);
        var placeholderText = isExample ? ('es. ' + exampleNum + ' %') : '';
        var valueAttr = (!isExample && typeof manualVal === 'number') ? (' value="' + String(manualVal) + '"') : ' value=""';
        var exampleAttr = isExample ? ' data-example="1" data-example-val="'+exampleNum+'"' : ' data-example="0"';

        var pencilSvg = '<svg class="icon-pencil" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>';

        // Previsto cell: solo display
        var prevHtml = previstoDisplay;
        
        // Manuale cell: con edit button solo per settimana corrente
        var hasManualValue = (typeof manualVal === 'number');
        var manualCellClass = hasManualValue ? 'manual-cell has-value' : 'manual-cell';
        var manualHtml = '';
        if (isCurWeek) {
          if (!isExample) {
            // show only the value and an edit button when a manual value exists
            manualHtml = '<div class="prev-edit">'
              + '<span class="prev-val">' + (Number(manualVal).toFixed(1)) + '%</span>'
              + '<button class="btn-edit-prev" title="Modifica Manuale">'+pencilSvg+'</button>'
              + '</div>';
          } else {
            // show grey placeholder text and edit button for uncompiled values
            manualHtml = '<div class="prev-edit">'
              + '<span class="prev-val prev-placeholder">' + placeholderText + '</span>'
              + '<button class="btn-edit-prev" title="Modifica Manuale">'+pencilSvg+'</button>'
              + '</div>';
          }
        } else {
          // Settimana passata: solo display, nessun edit button
          if (!isExample) {
            manualHtml = '<span class="prev-val">' + (Number(manualVal).toFixed(1)) + '%</span>';
          } else {
            // Per settimane passate senza valore: mostra solo '—'
            manualHtml = '—';
          }
        }

        // actions: always regenerate button with current time data (don't preserve old HTML)
        var progTime = prog ? (prog.time || '20:30') : '20:30';
        var progEnd = prog ? (prog.end || '23:30') : '23:30';
        var actionsHtml = '<button class="btn-altri" data-iso="'+iso+'" data-ch="'+(S.wCh||'')+'" data-time="'+progTime+'" data-end="'+progEnd+'" title="Vedi altri canali">Altri canali</button>';

        var dayHtml = (origTr.querySelector('.day-cell')||{}).innerHTML || ('<div>'+fmtDate(iso)+'</div>');
        var isSubRow = origTr.querySelector('.day-cell.sub-row') !== null;

        // assemble canonical tds
        var newInner = '';
        newInner += '<td class="day-cell' + (isSubRow ? ' sub-row' : '') + '">' + (isSubRow ? '' : dayHtml) + '</td>';
        newInner += '<td class="time-cell">' + timeText + '</td>';
        newInner += '<td><div class="p-title">' + escapeHtml(titleText) + '</div></td>';
        newInner += '<td>' + prevHtml + '</td>';
        newInner += '<td class="' + manualCellClass + '">' + manualHtml + '</td>';
        newInner += '<td class="real-cell">—</td>';
        newInner += '<td class="scost-cell">—</td>';
        newInner += '<td class="actions-cell">' + actionsHtml + '</td>';

        origTr.innerHTML = newInner;
        // restore attributes
        if (iso) origTr.setAttribute('data-iso', iso);
        if (pid) origTr.setAttribute('data-pid', pid);
        if (isFirstProg) origTr.setAttribute('data-first-prog', '1'); else origTr.removeAttribute('data-first-prog');
        // data-fonte attribute for Auditel fallback logic
        try{ var df = (String(fonte||'').toLowerCase().indexOf('whatif')!==-1) ? 'whatif' : (String(fonte||'').toLowerCase().indexOf('manuale')!==-1 ? (typeof previstoVal==='number' ? 'manual-inserted' : 'manual') : ''); if (df) origTr.setAttribute('data-fonte', df); else origTr.removeAttribute('data-fonte'); } catch(e){}
      }catch(e){ if (DEBUG) console.error('normalize row err', e); }
    });
  }catch(e){ if (DEBUG) console.error('normalize rows failed', e); }

  // After rows are canonical, populate Auditel values (Reale/Scostamento)
  try{ if (typeof loadAuditelForWeekly === 'function') loadAuditelForWeekly(); } catch(e){ if (DEBUG) console.error('call loadAuditelForWeekly failed', e); }

  try{ console.log('renderWeeklySchedule: rendered table, btn-altri count=', (document.querySelectorAll('#pw-table .btn-altri')||[]).length); }catch(e){}

  // Attach click handlers to 'Altri Canali' buttons: open modal fallback to avoid inline panel insertion issues
  try{
    document.querySelectorAll('#pw-table .btn-altri').forEach(function(b){
      b.addEventListener('click', function(ev){ ev.stopPropagation();
        try{
          var iso = this.getAttribute('data-iso');
          var ch = this.getAttribute('data-ch') || (S.wCh || 'Rai 1');
          var progTime = this.getAttribute('data-time') || '20:30';
          var progEnd = this.getAttribute('data-end') || '23:30';
          // Extra validation: ensure values are valid time strings
          if (!progTime || progTime.indexOf(':') < 0) progTime = '20:30';
          if (!progEnd || progEnd.indexOf(':') < 0) progEnd = '23:30';
          console.log('btn-altri click - time slot:', progTime, '-', progEnd);
          var tr = this.closest && this.closest('tr');
          var dayIndex = computeDayIndexFromISO(iso);
          var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
          showToast('Apro Altri Canali...');
          // prefer inline panel when served over http(s) and we have an anchor row
          if (tr) {
            try { renderT4ChannelPanel(iso, dayIndex, ch, hasActuals, tr, progTime, progEnd); }
            catch(err){ console.error('renderT4ChannelPanel failed; falling back to modal', err); openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd); }
          } else {
            openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd);
          }
        }catch(e){ console.error('btn-altri handler error', e); showToast('Errore apertura Altri Canali (vedi console)'); }
      });
    });
  }catch(e){ console.error('attach btn-altri listeners failed', e); }

  // attach input handlers: keep a prefilling example that the user overwrites
  document.querySelectorAll('#pw-table .prev-input').forEach(function(inp){
    // focus: if example, clear to let user type
    inp.addEventListener('focus', function(){
      try{
        // Check if current week is editable (only current week)
        var isCurWeek = (typeof isCurrentWeek === 'function') ? isCurrentWeek(S.weekStartISO) : false;
        if (!isCurWeek) { 
          showToast('Modifica permessa solo per la settimana corrente');
          this.blur();
          return; 
        }
        
        if (this.getAttribute('data-example') === '1'){
          // placeholder will hide on focus; mark input as user-editing
          this.classList.remove('example');
          this.setAttribute('data-example','0');
        }
      }catch(e){}
    });
    // blur/change: save or restore example
    var saveHandler = function(){
      // Check if current week is editable (only current week)
      var isCurWeek = (typeof isCurrentWeek === 'function') ? isCurrentWeek(S.weekStartISO) : false;
      if (!isCurWeek) { 
        showToast('Modifica permessa solo per la settimana corrente');
        // Restore original value
        inp.blur();
        return; 
      }
      
      var tr = inp.closest('tr'); if (!tr) return; var iso = tr.getAttribute('data-iso');
      var raw = inp.value === undefined || inp.value === null ? '' : String(inp.value).trim();
      var fonteCell = tr.querySelector('td:nth-child(5)'); // Colonna Fonte
      if (raw === ''){
        // check if an original WhatIF value exists for this program
        var pid2 = tr.getAttribute('data-pid') || '';
        var origProg2 = null;
        try { origProg2 = PROGS.filter(function(p){ return p && p.id === pid2; })[0] || null; } catch(e){}
        var origShare = (origProg2 && typeof origProg2.share === 'number' && !origProg2.noWhatIF) ? origProg2.share : null;
        S.weekManuals = S.weekManuals || {};
        if (origShare !== null) {
          // restore WhatIF: remove manual override
          delete S.weekManuals[iso];
          try{ tr.setAttribute('data-fonte','whatif'); } catch(e){}
          if (fonteCell) fonteCell.innerHTML = '<span class="badge-fonte whatif">WhatIF</span>';
          inp.value = String(origShare);
          inp.setAttribute('placeholder','');
          inp.classList.remove('example'); inp.setAttribute('data-example','0');
        } else {
          // no WhatIF baseline — restore Da compilare
          S.weekManuals[iso] = null;
          try{ tr.setAttribute('data-fonte','manual'); } catch(e){}
          if (fonteCell) fonteCell.innerHTML = '<span class="badge-fonte manual">Da compilare</span>';
          var exampleNum = inp.getAttribute('data-example-val') || (Math.round((Math.random()*4.5 + 0.5)*10)/10).toFixed(1);
          inp.value = '';
          inp.setAttribute('placeholder','es. ' + exampleNum + ' %');
          inp.classList.add('example'); inp.setAttribute('data-example','1'); inp.setAttribute('data-example-val', exampleNum);
        }
      } else {
        var v = parseFloat(raw);
        if (!isNaN(v)) { S.weekManuals = S.weekManuals || {}; S.weekManuals[iso] = v; try{ tr.setAttribute('data-fonte','manual-inserted'); } catch(e){} if (fonteCell) fonteCell.innerHTML = '<span class="badge-fonte manual-ok">Inserito Manualmente</span>'; inp.classList.remove('example'); inp.setAttribute('data-example','0'); }
        else { showToast('Valore non valido'); }
      }
    };
    inp.addEventListener('blur', saveHandler);
    inp.addEventListener('change', saveHandler);
    // ensure numeric input shows muted color when example
    try{ if (inp.getAttribute('data-example') === '1') inp.classList.add('example'); }catch(e){}
  });

  // removed edit-pencil and span editors: single input box handles edit/save directly

  // After rendering the table, attempt to populate Auditel automatically
  try { setTimeout(function(){ try { loadAuditelForWeekly(); } catch(e){ if (DEBUG) console.error('auto-loadAuditel failed', e); } }, 140); } catch(e) {}

  // Delegate edit interactions: click pencil to edit Manuale; support saving on blur or Enter
  try{
    var tableEl = document.querySelector('#pw-table');
    if (tableEl) {
      tableEl.addEventListener('click', function(ev){
        var btn = ev.target.closest && (ev.target.closest('.btn-edit-prev') || ev.target.closest('.icon-pencil')?.closest('.btn-edit-prev'));
        if (!btn) return;
        ev.preventDefault(); ev.stopPropagation();
        
        // Check if current week is editable (only current week)
        var isCurWeek = (typeof isCurrentWeek === 'function') ? isCurrentWeek(S.weekStartISO) : false;
        if (!isCurWeek) { 
          showToast('Modifica permessa solo per la settimana corrente'); 
          return; 
        }
        
        var tr = btn.closest('tr'); if (!tr) return;
        var iso = tr.getAttribute('data-iso');

        // Valore correntemente mostrato nella colonna Manuale (per precompilare l'input)
        var manualCell = tr.querySelector('.manual-cell');
        if (!manualCell) return;
        var span = manualCell.querySelector('.prev-val');
        var isPlaceholder = span && span.classList.contains('prev-placeholder');
        var current = '';
        if (span && !isPlaceholder && span.textContent) {
          var m = span.textContent.match(/(\d+(?:\.\d+)?)/);
          if (m) current = m[1];
        }

        // build input HTML and replace manual-cell content
        var exampleNum = (Math.round((Math.random()*4.5 + 0.5)*10)/10).toFixed(1);
        var inputHtml = '<div class="prev-edit">'
          + '<input type="number" step="0.1" min="0" max="100" class="prev-input" value="'+(current||'')+'" placeholder="" data-example="'+(current?0:1)+'" data-example-val="'+exampleNum+'" />'
          + '<span class="prev-suffix">%</span>'
          + '</div>';
        manualCell.innerHTML = inputHtml;
        var inp = manualCell.querySelector('.prev-input'); if (!inp) return;
        // focus and select
        try{ inp.focus(); inp.select(); } catch(e){}

        var pencilSvg = '<svg class="icon-pencil" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>';

        // attach save handler
        var save = function(){
          var raw = inp.value === undefined || inp.value === null ? '' : String(inp.value).trim();
          if (raw === '') {
            // L'utente ha cancellato il valore → rimuove override manuale
            S.weekManuals = S.weekManuals || {};
            delete S.weekManuals[iso];
            // Ripristina placeholder nella cella Manuale e rimuovi classe has-value
            manualCell.classList.remove('has-value');
            var exNum = (Math.round((Math.random()*4.5 + 0.5)*10)/10).toFixed(1);
            manualCell.innerHTML = '<div class="prev-edit">'
              + '<span class="prev-val prev-placeholder">es. ' + exNum + ' %</span>'
              + '<button class="btn-edit-prev" title="Modifica Manuale">' + pencilSvg + '</button>'
              + '</div>';
          } else {
            var v = parseFloat(raw);
            if (!isNaN(v)) {
              S.weekManuals = S.weekManuals || {}; 
              S.weekManuals[iso] = v;
              // Mostra il valore inserito nella cella Manuale e aggiungi classe has-value
              manualCell.classList.add('has-value');
              manualCell.innerHTML = '<div class="prev-edit">'
                + '<span class="prev-val">' + v.toFixed(1) + '%</span>'
                + '<button class="btn-edit-prev" title="Modifica Manuale">' + pencilSvg + '</button>'
                + '</div>';
            } else {
              showToast('Valore non valido');
            }
          }
          // Ricalcola Auditel e Scostamento dopo modifica
          try { if (typeof loadAuditelForWeekly === 'function') loadAuditelForWeekly(); } catch(e) {}
        };
        inp.addEventListener('blur', save);
        inp.addEventListener('keydown', function(ke){
          if (ke.key === 'Enter') {
            ke.preventDefault();
            inp.removeEventListener('blur', save);
            save();
            try { inp.blur(); } catch(_) {}
          }
        });
      });
    }
  }catch(e){ if (DEBUG) console.error('attach edit delegation failed', e); }
}

// Debug helper: open the panel for the first weekly row (call from console)
window.debugOpenFirstPanel = function(){
  try{
    var tr = document.querySelector('#pw-table tbody tr');
    if (!tr) return console.error('debugOpenFirstPanel: no weekly rows found');
    var b = tr.querySelector('.btn-altri');
    var iso = tr.getAttribute('data-iso') || (b && b.getAttribute('data-iso'));
    var ch = (b && b.getAttribute('data-ch')) || (S.wCh || 'Rai 1');
    var progTime = (b && b.getAttribute('data-time')) || '20:30';
    var progEnd = (b && b.getAttribute('data-end')) || '23:30';
    var dayIndex = computeDayIndexFromISO(iso);
    console.log('debugOpenFirstPanel calling renderT4ChannelPanel', iso, dayIndex, ch, tr);
    renderT4ChannelPanel(iso, dayIndex, ch, false, tr, progTime, progEnd);
  }catch(e){ console.error('debugOpenFirstPanel error', e); }
};

// Simple debounce helper and debounced wrapper for weekly render
function debounce(fn, wait){
  var t = null;
  return function(){
    var ctx = this; var args = arguments;
    clearTimeout(t);
    t = setTimeout(function(){ try{ fn.apply(ctx, args); }catch(e){ console.error('debounced fn error', e); } }, wait || 80);
  };
}
var debouncedRenderWeeklySchedule = debounce(function(){ try{ renderWeeklySchedule(); }catch(e){ console.error('debouncedRenderWeeklySchedule error', e); } }, 120);

function launchProgMode(mode) {
  S.wMode = mode;
  S.wLoaded = false; // wait for explicit 'Carica Palinsesto' click
  // If we're in 'futura' mode, force the displayed week to the current week
  // and hide week navigation controls (no week selection allowed).
  try {
    var pwPrevBtn = document.getElementById('pw-prev');
    var pwNextBtn = document.getElementById('pw-next');
    var pwWeekRef = document.getElementById('pw-week-ref');
    if (mode === 'futura') {
      // set S.date to current week's Monday
      var currentMon = getWeekMonday(new Date());
      S.date = formatDateToISOLocal(currentMon);
      if (pwPrevBtn) pwPrevBtn.style.display = 'none';
      if (pwNextBtn) pwNextBtn.style.display = 'none';
      if (pwWeekRef) pwWeekRef.textContent = getWeekRangeLabel(S.date) + ' · ' + (S.wCh || 'Rai 1');
    } else {
      // for 'passata' mode, default to last completed week's Monday
      if (mode === 'passata') {
        var lastMon = getLastCompletedWeekMonday();
        S.date = formatDateToISOLocal(lastMon);
      }
      if (pwPrevBtn) pwPrevBtn.style.display = '';
      if (pwNextBtn) pwNextBtn.style.display = '';
      updateWeekNavButtons();
    }
  } catch(e) { /* ignore DOM access errors during init */ }
  document.getElementById('sec-sim').classList.remove('active');
  document.getElementById('sec-prog').classList.add('active');
  document.getElementById('sec-scen').classList.remove('active');
  document.getElementById('tb-title').textContent = 'Palinsesti';
  setActiveNav(mode === 'futura' ? 'nav-prog-fut' : 'nav-prog-past');
  document.getElementById('prog-landing').style.display = 'none';
  document.getElementById('prog-flow').style.display = 'block';
  var pft = document.getElementById('prog-flow-title');
  if (pft) pft.innerHTML = (mode === 'futura' ? 'Palinsesto Futuro' : 'Archivio') + ' <span class="badge b-primary" style="margin-left:10px;">Prima Serata</span>';
  // renderWeekly will be invoked only when the user clicks 'Carica Palinsesto'
  updateProgLoadBtn();
}

function showProg() {
  document.getElementById('sec-prog').classList.add('active');
  document.getElementById('sec-sim').classList.remove('active');
  document.getElementById('sec-scen').classList.remove('active');
  document.getElementById('tb-title').textContent = 'Palinsesti';
  setActiveNav('nav-prog');
  // ensure weekly controls are initialized and re-render schedule if already loaded
  try { initWeeklyControls(); } catch(e) { setTimeout(initWeeklyControls, 80); }
  try {
    try { renderWeeklySchedule(); } catch(e) { debouncedRenderWeeklySchedule(); }
    console.log('showProg()');
  } catch(e) {
    console.error('showProg render failed', e);
    try { document.getElementById('prog-landing').style.display = 'block'; document.getElementById('prog-flow').style.display = 'none'; } catch(_){}
    try { showToast('Errore caricamento Programmazione (vedi console)'); } catch(_){}
  }
}

function navScen() {
  // If not coming from simulation result, clear the flag
  // (it will be set to true before calling this function from result page)
  if (!S._fromSimResult) {
    S._fromSimResult = false;
    S._savedSimState = null;
  }
  // lightweight show first
  forceShowSection('sec-scen','Scenari Salvati');
  setActiveNav('nav-scen');
  setTimeout(function(){ try { renderScenariView(); } catch(e) { console.error('renderScenariView failed', e); try{ showToast('Errore caricamento Scenari (vedi console)'); }catch(_){} } }, 0);
}

// Ensure sidebar nav items always have working click handlers (robustness against inline handler scope issues)
function attachNavHandlers() {
  try {
    var el;
    el = document.getElementById('nav-sim'); if (el && !el._attached) { el.addEventListener('click', navSim); el._attached = true; }
    el = document.getElementById('nav-prog'); if (el && !el._attached) { el.addEventListener('click', showWeekly); el._attached = true; }
    el = document.getElementById('nav-scen'); if (el && !el._attached) { el.addEventListener('click', navScen); el._attached = true; }
    el = document.getElementById('nav-sost'); if (el && !el._attached) { el.addEventListener('click', function(){ launchMode('sostituzione'); }); el._attached = true; }
    el = document.getElementById('nav-sposta'); if (el && !el._attached) { el.addEventListener('click', function(){ launchMode('spostamento'); }); el._attached = true; }
    // defensive: also attach to prog landing/fow toggles
    var pLanding = document.getElementById('prog-weekly'); if (pLanding && !pLanding._navAttached) { pLanding._navAttached = true; }
  } catch(e) { console.warn('attachNavHandlers failed', e); }
}

    // call attachNavHandlers after DOM is ready
try { attachNavHandlers(); } catch(e) { setTimeout(attachNavHandlers, 80); }

// Delegated global handler as robust fallback for dynamically generated '.btn-altri' buttons
try{
  document.body.addEventListener('click', function(ev){
    try{
      var b = ev.target && ev.target.closest ? ev.target.closest('.btn-altri') : null;
      if (!b) return;
      ev.preventDefault(); ev.stopPropagation();
      var iso = b.getAttribute('data-iso');
      var ch = b.getAttribute('data-ch') || (S.wCh || 'Rai 1');
      var progTime = b.getAttribute('data-time') || '20:30';
      var progEnd = b.getAttribute('data-end') || '23:30';
      var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
      console.log('delegated .btn-altri click', iso, ch, hasActuals);
      openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd);
    }catch(e){ console.error('delegated .btn-altri handler error', e); }
  }, true);
}catch(e){ console.error('attach delegated btn-altri listener failed', e); }

// Force-show a main section and hide others (lightweight, resilient to render errors)
function forceShowSection(sectionId, title) {
  try {
    document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); s.style.display = 'none'; });
    var sec = document.getElementById(sectionId);
    if (sec) { sec.classList.add('active'); sec.style.display = ''; }
    if (typeof title !== 'undefined') {
      try { document.getElementById('tb-title').textContent = title; } catch(e){}
    }
  } catch(e) { console.warn('forceShowSection failed', e); }
}

function showHome() {
  S.mode = null; S.step = 0; S.prog = null; S.cand = null; S._viewSim = false; S._simResult = null;
  S.showComp = false; S._srcLoaded = false; S._destLoaded = false; S._spSimulated = false;
  forceShowSection('sec-home', 'Home');
  try { document.querySelectorAll('.sb-item').forEach(function(el){ el.classList.remove('active'); }); } catch(e){}
  try { document.getElementById('nav-home').classList.add('active'); } catch(e){}
}

function backToLanding() {
  showHome();
}

function launchMode(mode) {
  S.mode = mode; S.step = 0; S.prog = null; S.cand = null;
  S._viewSim = false; S._simResult = null; S.showComp = false; S._strongEvents = [];
  if (mode === 'spostamento') { S._srcLoaded = false; S._destLoaded = false; S._spSimulated = false; }
  // immediate, lightweight show to avoid blank screens
  var titleText = mode === 'sostituzione' ? '🔄 Sostituzione' : (mode === 'spostamento' ? '🕐 Spostamento' : 'Simulazione Palinsesto');
  forceShowSection('sec-sim', titleText);
  try { document.getElementById('sim-landing').style.display = 'none'; document.getElementById('sim-flow').style.display = 'block'; } catch(e){}
  try { document.getElementById('sec-sim').classList.add('active'); document.getElementById('sec-prog').classList.remove('active'); document.getElementById('sec-scen').classList.remove('active'); } catch(e){}
  try { 
    document.getElementById('flow-title').textContent = titleText;
  } catch(e){}
  setActiveNav(mode === 'sostituzione' ? 'nav-sost' : 'nav-sposta');
  // start at step 0 (select program) for both modes
  setTimeout(function(){ try { render(); } catch(e) { console.error('launchMode render failed', e); try{ showToast('Errore caricamento Simulazione (vedi console)'); }catch(_){} } }, 0);
}
