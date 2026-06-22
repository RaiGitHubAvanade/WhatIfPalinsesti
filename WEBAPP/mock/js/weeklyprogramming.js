/* ================================================================
   PROGRAMMAZIONE
================================================================ */
function renderWeekly() {
  var wrap = document.getElementById('weekly-wrap');
  var flowTitle = document.getElementById('prog-flow-title');
  if (!wrap) return;
  if (flowTitle) flowTitle.innerHTML = (S.wMode === 'futura' ? 'Palinsesto Futuro' : 'Archivio') + ' <span class="badge b-primary" style="margin-left:10px;">Prima Serata</span>';
  if (!S.wLoaded) { wrap.innerHTML = ''; return; }
  var data = (WEEKLY[S.wWk] || []);
  // If WEEKLY contains channel-specific rows (has 'ch' field), use only rows matching S.wCh.
  // If WEEKLY rows are generic (no 'ch'), treat them as Rai 1 only; for other channels synthesize from PROGS.
  var rowsForCh = [];
  var hasChField = data.some(function(r){ return typeof r.ch !== 'undefined'; });
  if (hasChField) {
    rowsForCh = data.filter(function(row){ return row.ch === S.wCh; });
  } else {
    if (S.wCh === 'Rai 1') rowsForCh = data.slice();
    else rowsForCh = [];
  }
  if (!rowsForCh || rowsForCh.length === 0) {
    var days = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    var progs = PROGS.filter(function(p){ return p.ch === S.wCh; });
    rowsForCh = progs.slice(0,7).map(function(p,i){ return { day: days[i] + ' ' + getWeekRangeLabel(S.date).split(' - ')[0], prog: p.title, prev: (p.share||0), real: null, delta: null, comp: '', compShare: null } });
  }
  var h = '<table class="weekly-table"><thead><tr><th>Giorno</th><th>Programma RAI</th><th>Previsto</th><th>Manuale</th><th>Competitor</th><th>Share comp.</th>';
  if (S.wMode === 'passata') h += '<th>Auditel</th><th>Scostamento</th>';
  h += '</tr></thead><tbody>';
  var mon = getWeekMonday(S.date);
  var weekdays = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  rowsForCh.forEach(function(row, idx){
    // compute display day as weekday + DD/MM based on the selected week's Monday
    var dayDate = new Date(mon); dayDate.setDate(mon.getDate() + idx);
    var dd = String(dayDate.getDate()).padStart(2,'0');
    var mm = String(dayDate.getMonth()+1).padStart(2,'0');
    var displayDay = (weekdays[dayDate.getDay()] || 'Giorno') + ' ' + dd + '/' + mm;
    // No background color classes applied for Archivio — keep rows neutral
    var cls = '';
    var sco = '—';
    if (S.wMode === 'passata' && row.delta !== null) {
      var sign = row.delta > 0 ? '+' : '';
      var scoCls = row.delta > 0 ? 'p' : (row.delta < 0 ? 'n' : '');
      sco = '<span class="sco ' + scoCls + '">' + sign + row.delta.toFixed(1) + '%</span>';
    }
        h += '<tr class="' + cls + '">' +
          '<td style="font-weight:700;">' + displayDay + '</td>' +
         '<td style="font-weight:800;">' + row.prog + '</td>' +
         // Previsto cell: solo dati dal modello, NON modificabile
         (function(){
           var prevModelVal = row.prev;
           var prevDisp = (prevModelVal !== null && typeof prevModelVal === 'number') ? prevModelVal.toFixed(1) + '%' : '—';
           return '<td>' + prevDisp + '</td>';
         })() +
         // Manuale cell: solo dati override utente, modificabile solo per settimana corrente
         (function(){
           var key = 'wk' + S.wWk + '|' + (S.wCh||'') + '|' + idx;
           var manualVal = (S.wOverrides && typeof S.wOverrides[key] !== 'undefined') ? S.wOverrides[key] : null;
           var manualDisp = (manualVal !== null && typeof manualVal === 'number') ? manualVal.toFixed(1) + '%' : '—';
           // Check if current week is editable (only current week)
           var isCurWeek = (typeof isCurrentWeek === 'function') ? isCurrentWeek(S.weekStartISO) : false;
           // use inline SVG icon for edit button
           var pencilSvg = '<svg class="icon-pencil" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
                           '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>' +
                           '<path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>' +
                           '</svg>';
           // Show edit button only for current week
           var editBtn = isCurWeek ? '<button class="edit-manual" data-key="' + key + '" data-idx="' + idx + '">' + pencilSvg + '</button>' : '';
           return '<td class="manual-cell"><span class="manual-val" data-idx="' + idx + '" data-key="' + key + '">' + manualDisp + '</span>' + editBtn + '</td>';
         })() +
         '<td><span class="badge b-muted">WhatIF</span></td>' +
         '<td style="font-weight:800;">' + (row.comp || '—') + '</td>' +
         '<td>' + (row.compShare ? row.compShare.toFixed(1) + '%' : '—') + '</td>';
    if (S.wMode === 'passata') h += '<td>' + (row.real !== null ? row.real.toFixed(1) + '%' : '<span style="color:var(--muted)">—</span>') + '</td><td>' + sco + '</td>';
    h += '</tr>';
  });
  h += '</tbody></table>';
  wrap.innerHTML = h;
  // attach handlers for edit buttons (data-driven) for Manuale column
  setTimeout(function(){
    document.querySelectorAll('.edit-manual').forEach(function(b){
      b.removeEventListener('click', b._edList||function(){});
      var fn = function(e){ var k = this.getAttribute('data-key'); var i = parseInt(this.getAttribute('data-idx')); startEditManual(k,i); };
      b.addEventListener('click', fn);
      b._edList = fn;
    });
  },20);
}

function updateProgLoadBtn() {
  var pwLoad = document.getElementById('pw-load') || document.getElementById('pw-load-pal');
  
  var wrap = document.getElementById('weekly-wrap');
  if (!pwLoad) return;
  // enable Carica Palinsesto only when both Canale and Settimana are selected
  var chVal = (document.getElementById('pw-channel') || {}).value || '';
  var weekVal = ((document.getElementById('pw-week-date') || {}).value || S.weekStartISO || '');
  weekVal = (typeof weekVal === 'string') ? weekVal.trim() : weekVal;
  var canLoad = !!chVal && !!weekVal;
  // Do not set the native `disabled` attribute so click handlers always run (we validate inside handlers).
  // Use ARIA + a visual class to indicate disabled state.
  pwLoad.classList.toggle('disabled', !canLoad);
  pwLoad.setAttribute('aria-disabled', (!canLoad).toString());
  // (Carica Auditel button removed) Auditel viene popolato automaticamente dopo il render
  // update label and clear table only when palinsesto not active
  pwLoad.textContent = (S.wLoaded && S._wkExplicit) ? 'Nascondi Palinsesto' : 'Carica Palinsesto';
  if ((!S.wLoaded || !S._wkExplicit) && wrap) {
    // show a clear empty state with instructions instead of blank
    try { renderWeeklyEmptyState(); } catch(e){ wrap.innerHTML = ''; }
  }
  var pwWeekRef = document.getElementById('pw-week-ref'); if (pwWeekRef) pwWeekRef.textContent = (S.wLoaded && S._wkExplicit) ? getWeekRangeLabel(S.weekStartISO || S.date || weekVal) + ' · ' + (S.wCh || chVal || 'Rai 1') : '';
}

function renderWeeklyEmptyState(){
  var wrap = document.getElementById('weekly-wrap'); if (!wrap) return;
  var chVal = (document.getElementById('pw-channel')||{}).value || (S.wCh||'');
  var wkLabel = (S._wkExplicit && S.weekStartISO) ? getWeekRangeLabel(S.weekStartISO) : null;
  var selRow = '';
  if (chVal || wkLabel) {
    selRow = '<div style="margin-top:8px;color:var(--muted);font-weight:600;">Selezione: '
      + (chVal || '—') + (wkLabel ? ' · ' + wkLabel : '') + '</div>';
  }
  var html = '<div class="card" style="padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px;">'
    + '<div><div style="font-weight:700;font-size:15px;margin-bottom:6px;">Nessun palinsesto caricato</div>'
    + '<div style="color:var(--muted);">Seleziona un canale e una settimana, poi clicca <strong>Carica Palinsesto</strong> nella barra superiore per visualizzare la tabella.</div>'
    + selRow + '</div>'
    + '</div>';
  wrap.innerHTML = html;
}

function getWeekRangeLabel(baseDate) {
  // normalize to local-date to avoid timezone issues
  var d = baseDate ? parseISODateLocal(baseDate) : null;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
  var day = d.getDay();
  var diffToMon = (day === 0) ? -6 : (1 - day);
  var mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
  var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  var opts = { day: 'numeric', month: 'short' };
  // return a concise range label (no literal "Settimana") e.g. "09 mar - 15 mar"
  return mon.toLocaleDateString('it-IT', opts) + ' - ' + sun.toLocaleDateString('it-IT', opts);
}

function getLastCompletedWeekMonday() {
  var d = new Date(); var day = d.getDay(); var diffToMon = (day === 0) ? -6 : (1 - day);
  var mon = new Date(d); mon.setDate(d.getDate() + diffToMon); mon.setDate(mon.getDate() - 7); mon.setHours(0,0,0,0); return mon;
}

function changeWeek(deltaWeeks) {
  var mon = getWeekMonday(S.date);
  mon.setDate(mon.getDate() + (deltaWeeks * 7));
  var last = getLastCompletedWeekMonday();
  if (mon > last) mon = last;
  S.date = formatDateToISOLocal(mon);
  updateProgLoadBtn();
  try { renderWeeklySchedule(); } catch(e) { debouncedRenderWeeklySchedule(); }
  updateWeekNavButtons();
}

function updateWeekNavButtons() {
  try {
    var nextBtn = document.getElementById('pw-next');
    // disable 'next' when the currently selected week is beyond the allowed horizon
    var maxIso = maxSelectableWeekStart(new Date());
    var curIso = S.weekStartISO || (document.getElementById('pw-week-date')||{}).value || '';
    if (nextBtn) {
      var disabled = (!curIso) || (curIso >= maxIso);
      nextBtn.disabled = disabled;
      nextBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (disabled) nextBtn.classList.add('disabled'); else nextBtn.classList.remove('disabled');
    }
    // disable preset week buttons (#pw-wk) if they map beyond maxIso
    try {
      var pwWk = document.getElementById('pw-wk');
      if (pwWk) {
        document.querySelectorAll('#pw-wk [data-wk]').forEach(function(b){
          var wk = b.getAttribute('data-wk'); if (!wk) return;
          var wkIso = (WEEK_STARTS && WEEK_STARTS[wk]) ? WEEK_STARTS[wk] : null;
          var disabled = (!wkIso) ? false : (wkIso > maxIso);
          b.classList.toggle('disabled', disabled);
          if (disabled) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
        });
      }
    } catch(e){}
  } catch(e){}
}

function getWeekMonday(baseDate) {
  // ensure we construct date in local timezone from ISO-like string to avoid UTC shifts
  var d = baseDate ? parseISODateLocal(baseDate) : new Date();
  var day = d.getDay();
  var diffToMon = (day === 0) ? -6 : (1 - day);
  var mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
  // normalize time
  mon.setHours(0,0,0,0);
  return mon;
}

// Helper: start of week (Monday) for a given date object or ISO string
function startOfWeekMonday(date) {
  try {
    if (!date) date = new Date();
    var d = (date instanceof Date) ? new Date(date) : parseISODateLocal(date);
    return getWeekMonday(d);
  } catch(e) { return getWeekMonday(date); }
}

// Helper: compute max selectable weekStart (Monday) - only current week and past weeks allowed
function maxSelectableWeekStart(today) {
  var t = today ? (today instanceof Date ? new Date(today) : new Date(today)) : new Date();
  return formatDateToISOLocal(getWeekMonday(t));
}

// Helper: return true if given weekStart ISO is selectable (<= maxWeekStart)
function isWeekSelectable(weekStartISO, today) {
  try {
    var maxIso = maxSelectableWeekStart(today);
    if (!weekStartISO) return false;
    return (weekStartISO <= maxIso);
  } catch(e){ return false; }
}

// Update UI for week navigation controls (disable next beyond max)
function setSelectableWeeksUI() {
  try {
    var dateInp = document.getElementById('pw-week-date'); if (!dateInp) return;
    var prevBtn = document.getElementById('pw-prev'); var nextBtn = document.getElementById('pw-next');
    var maxIso = maxSelectableWeekStart(new Date());
    dateInp.max = maxIso;
    var curIso = S.weekStartISO || dateInp.value || '';
    if (nextBtn) {
      // simple, deterministic check: next allowed only if current week exists and is <= maxIso
      var disabled = (!curIso) || (curIso >= maxIso);
      nextBtn.disabled = disabled;
      nextBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (disabled) nextBtn.classList.add('disabled'); else nextBtn.classList.remove('disabled');
    }
    if (prevBtn) {
      // prev always enabled (past weeks allowed)
      prevBtn.disabled = false; prevBtn.classList.remove('disabled');
    }
  } catch(e){}
}

// Parse an ISO 'YYYY-MM-DD' date string into a local Date (no timezone offset)
function parseISODateLocal(iso) {
  if (!iso) return new Date();
  if (iso instanceof Date) return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
  var parts = String(iso).split('-');
  if (parts.length >= 3) {
    var y = parseInt(parts[0],10); var m = parseInt(parts[1],10) - 1; var d = parseInt(parts[2],10);
    return new Date(y, m, d);
  }
  // fallback
  return new Date(iso);
}

// Format a Date object to local YYYY-MM-DD
function formatDateToISOLocal(dt) {
  var y = dt.getFullYear(); var m = String(dt.getMonth() + 1).padStart(2,'0'); var d = String(dt.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + d;
}

// Friendly formatted date for UI (e.g., "17 mag 2026")
function fmtDate(isoOrDate) {
  if (!isoOrDate) return '';
  try {
    var d = (typeof isoOrDate === 'string') ? new Date(isoOrDate + 'T00:00:00') : new Date(isoOrDate);
    if (isNaN(d.getTime())) return '';
    // Format as d/mm/yyyy (Italian numeric format)
    var day = d.getDate();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    return day + '/' + month + '/' + year;
  } catch(e) { return '';} 
}

// Deterministic hash: convert a string to a pseudo-random number in [0,1).
function hashToNumber(s) {
  try {
    if (!s) return 0;
    var str = String(s);
    // djb2
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h = h & 0xFFFFFFFF;
    }
    // normalize to [0,1)
    return (h >>> 0) / 4294967296;
  } catch (e) { return 0; }
}

// Lightweight deterministic prediction engine used by the mockup to estimate share
// Inputs:
// - orig: original program object (may contain .share)
// - cand: candidate object or {id:'move', ...} for spostamento
// Returns: { pred: <number>, reason: <string> }
function predictShare(orig, cand) {
  try {
    var base = (orig && typeof orig.share === 'number') ? orig.share : 6.0;
    var factor = 0;
    // candidate-based substitution
    if (cand && cand.id && cand.id === 'move') {
      // move: adjust by time/channel/day desirability for realistic variation
      var destTime = S.spDestTime || (orig && orig.time) || '21:00';
      var destDay = S.spDestDay || S.date || '';
      var destCh = S.spDestCh || (orig && orig.ch) || 'Rai 1';
      
      // Calculate time slot factor (-3 to +5 pp based on destination time)
      var timeHour = parseInt(destTime.split(':')[0], 10);
      var timeMin = parseInt(destTime.split(':')[1] || '0', 10);
      var timeFactor = 0;
      if (timeHour >= 20 && timeHour <= 22) {
        // Prime time: bonus +2 to +5 pp
        timeFactor = 2 + (hashToNumber(destTime + '|prime') * 3);
      } else if (timeHour >= 6 && timeHour < 12) {
        // Morning: penalty -2 to 0 pp
        timeFactor = -2 + (hashToNumber(destTime + '|morning') * 2);
      } else if (timeHour >= 12 && timeHour < 14) {
        // Lunch: slight penalty -1 to +1 pp
        timeFactor = -1 + (hashToNumber(destTime + '|lunch') * 2);
      } else if (timeHour >= 14 && timeHour < 18) {
        // Afternoon: penalty -1.5 to +0.5 pp
        timeFactor = -1.5 + (hashToNumber(destTime + '|afternoon') * 2);
      } else if (timeHour >= 18 && timeHour < 20) {
        // Access: slight bonus 0 to +2 pp
        timeFactor = 0 + (hashToNumber(destTime + '|access') * 2);
      } else if (timeHour >= 23 || timeHour < 2) {
        // Late night: penalty -3 to -1 pp
        timeFactor = -3 + (hashToNumber(destTime + '|latenight') * 2);
      } else {
        // Other times (2-6): strong penalty -4 to -2 pp
        timeFactor = -4 + (hashToNumber(destTime + '|night') * 2);
      }
      
      // Calculate day of week factor (-1 to +2 pp)
      var dayFactor = 0;
      if (destDay) {
        var dayOfWeek = new Date(destDay).getDay(); // 0=Sun, 6=Sat
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend: slight bonus
          dayFactor = 0.5 + (hashToNumber(destDay + '|weekend') * 1.5);
        } else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
          // Mon-Thu: neutral to slight bonus
          dayFactor = -0.5 + (hashToNumber(destDay + '|weekday') * 1.5);
        } else {
          // Friday: bonus
          dayFactor = 0 + (hashToNumber(destDay + '|friday') * 2);
        }
      }
      
      // Calculate channel factor (-1 to +1 pp)
      var channelFactor = 0;
      if (destCh === 'Rai 1') {
        channelFactor = 0.5 + (hashToNumber(destCh + '|' + destTime) * 0.5);
      } else if (destCh === 'Rai 2') {
        channelFactor = -0.5 + (hashToNumber(destCh + '|' + destTime) * 1);
      } else {
        channelFactor = -0.3 + (hashToNumber(destCh + '|' + destTime) * 0.8);
      }
      
      // Competition factor: check for strong events
      var compFactor = 0;
      if (S._strongEvents && S._strongEvents.length > 0) {
        // Each strong event reduces share by 0.5-1.5 pp
        compFactor = -0.5 * S._strongEvents.length - (hashToNumber(destTime + '|comp') * S._strongEvents.length);
      }
      
      // Program type stability factor (some types perform better when moved)
      var typeFactor = 0;
      var progType = cand.tipo || (orig && orig.tipo) || '';
      if (progType === 'News') {
        typeFactor = -0.5; // News less flexible
      } else if (progType === 'Show' || progType === 'Game') {
        typeFactor = 0.5; // Entertainment more flexible
      } else if (progType === 'Serie' || progType === 'Film') {
        typeFactor = 0.2; // Fiction moderately flexible
      }
      
      // Combine all factors
      factor = timeFactor + dayFactor + channelFactor + compFactor + typeFactor;
      
      // Add small random variation based on program ID to maintain some consistency
      var progVariation = (hashToNumber((orig && orig.id ? orig.id : '') + '|variation') - 0.5) * 1.5;
      factor += progVariation;
      
    } else if (cand) {
      // substitution: candidate title and tipo influence prediction
      var k = (cand.title || cand.id || '') + '|' + (cand.tipo || '');
      var r2 = hashToNumber(k);
      // prefer candidate if its tipo differs positively
      factor = (r2 - 0.45) * 6; // range approx [-2.7, +3.3]
      // also small penalty/bonus if original and candidate share widely differ
      if (orig && typeof orig.share === 'number' && cand.share && typeof cand.share === 'number') {
        factor += (cand.share - orig.share) * 0.1;
      }
    }
    // clamp and compute predicted
    var pred = base + factor;
    if (pred < 0.5) pred = 0.5;
    if (pred > 100) pred = 100;
    return { pred: Number(pred.toFixed(1)), reason: 'mocked-predict' };
  } catch (e) { console.error('predictShare error', e); return { pred: (orig && orig.share) || 6.0, reason: 'error' }; }
}

// Inline editing for 'Previsto' in Palinsesto Futuro
function startEditManual(key, idx) {
  if (S.wMode === 'passata') { showToast('Modifica non permessa in Archivio'); return; }
  // Check if current week is editable (only current week)
  var isCurWeek = (typeof isCurrentWeek === 'function') ? isCurrentWeek(S.weekStartISO) : false;
  if (!isCurWeek) { showToast('Modifica permessa solo per la settimana corrente'); return; }
  var span = document.querySelector('[data-key="' + key + '"]');
  if (!span) return;
  var parent = span.parentElement;
  var current = span.textContent.replace('%','').trim();
  var input = document.createElement('input');
  input.type = 'number';
  input.step = '0.1';
  input.min = '0';
  input.style.width = '80px';
  input.value = current === '—' ? '' : current;
  var save = document.createElement('button');
  save.className = 'btn-inline';
  save.textContent = '✓';
  save.onclick = function(){ saveEditManual(key, idx, input.value); };
  var canc = document.createElement('button');
  canc.className = 'btn-inline';
  canc.textContent = '✕';
  canc.onclick = function(){ cancelEditManual(key, idx); };
  // preserve original html in case of cancel
  parent._origInner = parent.innerHTML;
  parent.innerHTML = '';
  parent.appendChild(input);
  parent.appendChild(save);
  parent.appendChild(canc);
  input.focus();
}

function saveEditManual(key, idx, value) {
  var raw = value === undefined || value === null ? '' : String(value).trim();
  S.wOverrides = S.wOverrides || {};
  if (raw === '') {
    // explicit deletion
    S.wOverrides[key] = null;
    renderWeeklySchedule();
    showToast('Valore rimosso');
    return;
  }
  var num = parseFloat(raw);
  if (isNaN(num)) { showToast('Valore non valido'); return; }
  S.wOverrides[key] = num;
  renderWeeklySchedule();
  showToast('Valore salvato');
}

function cancelEditManual(key, idx) {
  var span = document.querySelector('[data-key="' + key + '"]');
  if (!span) {
    renderWeeklySchedule(); return;
  }
  var parent = span.parentElement;
  if (parent && parent._origInner) parent.innerHTML = parent._origInner;
  else renderWeeklySchedule();
}

// removed progMainTabs - now using launchProgMode instead

var pwCh = document.getElementById('pw-ch');
if (pwCh) pwCh.addEventListener('click', function(e){
  var btn = e.target.closest('[data-ch]');
  if (!btn) return;
  var ch = btn.getAttribute('data-ch');
  S.wCh = (S.wCh === ch) ? 'Rai 1' : ch;
  document.querySelectorAll('#pw-ch [data-ch]').forEach(function(b){ b.classList.remove('on'); });
  document.querySelector('#pw-ch [data-ch="' + S.wCh + '"]').classList.add('on');
  renderWeeklySchedule(); updateProgLoadBtn();
});

var pwWk = document.getElementById('pw-wk');
if (pwWk) pwWk.addEventListener('click', function(e){
  var btn = e.target.closest('[data-wk]');
  if (!btn) return;
  if (btn.classList.contains('disabled') || btn.getAttribute('aria-disabled') === 'true') { showToast('Settimana non selezionabile'); return; }
  var wk = btn.getAttribute('data-wk');
  S.wWk = parseInt(wk);
  // if we have a canonical week-start date for this demo week, align S.date to it
  if (typeof WEEK_STARTS !== 'undefined' && WEEK_STARTS[S.wWk]) {
    S.date = WEEK_STARTS[S.wWk];
  }
  document.querySelectorAll('#pw-wk [data-wk]').forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  renderWeeklySchedule(); updateProgLoadBtn();
});

var pwLoad = document.getElementById('pw-load') || document.getElementById('pw-load-pal');
  if (pwLoad) pwLoad.addEventListener('click', function(){
  // legacy/global handler — skip if initWeeklyControls onclick already validated/handled
  if (!S._wkExplicit || !S.wCh) return;
  if (!S.wLoaded) { ensureValidWeekStartISO(); }
  S.wLoaded = !S.wLoaded; // toggle visibility
  updateProgLoadBtn();
  if (S.wLoaded) { renderWeeklySchedule(); }
  else { var wrap = document.getElementById('weekly-wrap'); if (wrap) wrap.innerHTML = ''; }
});

// ensure the button text is correct on load
updateProgLoadBtn();

// initialize weekly controls on DOM ready so UI is reactive even if user didn't navigate via tabs
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', function(){
    try{ initWeeklyControls(); }catch(e){}
    try{ setActiveNav('nav-home'); }catch(e){}
  });
} else {
  try{ initWeeklyControls(); }catch(e){}
}

// update week ref label when rendering weekly
var pwWeekRef = document.getElementById('pw-week-ref'); if (pwWeekRef) pwWeekRef.textContent = getWeekRangeLabel(S.weekStartISO || S.date) + ' · ' + (S.wCh || 'Rai 1');
// attach prev/next handlers for week navigation
var pwPrev = document.getElementById('pw-prev'); if (pwPrev) pwPrev.addEventListener('click', function(){ changeWeek(-1); });
var pwNext = document.getElementById('pw-next'); if (pwNext) pwNext.addEventListener('click', function(){ changeWeek(1); });
// initialize nav button state
updateWeekNavButtons();

// Defensive: ensure weekly control buttons have handlers (fallback if init missed binding)
try {
  var _pwLoadBtn = document.getElementById('pw-load-pal');
  if (_pwLoadBtn && !_pwLoadBtn._attached) {
    _pwLoadBtn.addEventListener('click', function(ev){ ev.preventDefault(); if (!S.wLoaded) { ensureValidWeekStartISO(); } S.wLoaded = !S.wLoaded; updateProgLoadBtn(); if (S.wLoaded) { try{ renderWeeklySchedule(); }catch(e){} } else { var wrap=document.getElementById('weekly-wrap'); if (wrap) wrap.innerHTML = ''; } });
    _pwLoadBtn._attached = true;
  }
  
  var _pwReset = document.getElementById('pw-reset');
  if (_pwReset && !_pwReset._attached) {
    _pwReset.addEventListener('click', function(ev){ ev.preventDefault(); S.wLoaded = false; S.wOverrides = {}; updateProgLoadBtn(); var wrap=document.getElementById('weekly-wrap'); if (wrap) wrap.innerHTML = ''; showToast('Reset eseguito'); });
    _pwReset._attached = true;
  }
} catch (_) {}

// Robust handler: assicurarsi che il pulsante Carica Palinsesto esegua sempre la validazione
try {
  var _robustLoad = document.getElementById('pw-load-pal');
  if (_robustLoad && !_robustLoad._robustAttached) {
    _robustLoad.addEventListener('click', function(ev){
      ev.preventDefault();
      var ch = (document.getElementById('pw-channel')||{}).value || S.wCh || 'Rai 1';
      var dateVal = (document.getElementById('pw-week-date')||{}).value || S.weekStartISO || '';
      if (!ch) ch = S.wCh || 'Rai 1';
      if (!dateVal || String(dateVal).trim() === '') { ensureValidWeekStartISO(); dateVal = S.weekStartISO; try{ showToast('Nessuna settimana selezionata: uso settimana corrente'); }catch(_){} }
      // snap to nearest Monday and clamp to max
      try {
        var w = getWeekMonday(dateVal);
        var iso = formatDateToISOLocal(w);
        // ensure not beyond max
        var maxIso = (document.getElementById('pw-week-date')||{}).max || '';
        if (maxIso && iso > maxIso) { iso = maxIso; showToast('Non è possibile selezionare oltre la settimana corrente'); }
        S.weekStartISO = iso;
      } catch(e) { S.weekStartISO = dateVal; }
      S.wCh = ch; S.wLoaded = !S.wLoaded;
      updateProgLoadBtn();
      if (S.wLoaded) {
        try { renderWeeklySchedule(); } catch(e){ console.error(e); showToast('Errore nel render settimanale'); }
      } else {
        var wrap = document.getElementById('weekly-wrap'); if (wrap) wrap.innerHTML = '';
      }
    });
    _robustLoad._robustAttached = true;
  }
} catch(e) { console.warn('attach robust pw-load-pal failed', e); }

/* ================================================================
   SCENARI VIEW
   Global delegated handlers as a last-resort fallback for missing bindings
*/
try{
  document.addEventListener('click', function(ev){
    try{
      var b = ev.target.closest && ev.target.closest('.btn-altri');
      if (b) {
        ev.preventDefault(); ev.stopPropagation();
        var iso = b.getAttribute('data-iso');
        var ch = b.getAttribute('data-ch') || (S.wCh || 'Rai 1');
        var progTime = b.getAttribute('data-time') || '20:30';
        var progEnd = b.getAttribute('data-end') || '23:30';
        var tr = b.closest && b.closest('tr') || document.querySelector('#pw-table tbody tr');
        var dayIndex = computeDayIndexFromISO(iso);
        var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
        try {
          if (tr) {
            renderT4ChannelPanel(iso, dayIndex, ch, hasActuals, tr, progTime, progEnd);
          } else {
            openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd);
          }
        } catch(err){ console.error('delegated btn-altri error', err); try { openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd); } catch(e){ console.error(e); } }
      }
    }catch(e){}
  }, true);
}catch(e){ console.warn('delegated btn-altri attach failed', e); }

// (removed temporary force-open block to avoid unintended modal openings)

// Ensure critical weekly handlers are attached (called once at load)
function ensureWeeklyHandlers(){
  try{
    var loadPal = document.getElementById('pw-load-pal');
    if (loadPal && !loadPal._fixed) {
      loadPal.addEventListener('click', function(ev){ ev.preventDefault();
        var ch = (document.getElementById('pw-channel')||{}).value || S.wCh || 'Rai 1';
        var dateVal = (document.getElementById('pw-week-date')||{}).value || S.weekStartISO || '';
        if (!ch) ch = S.wCh || 'Rai 1';
        if (!dateVal || String(dateVal).trim() === '') { ensureValidWeekStartISO(); dateVal = S.weekStartISO; try{ showToast('Nessuna settimana selezionata: uso settimana corrente'); }catch(_){} }
        try{ var w = getWeekMonday(dateVal); S.weekStartISO = formatDateToISOLocal(w); } catch(e){ S.weekStartISO = dateVal; }
        S.wCh = ch;
        // toggle palinsesto visibility
        S.wLoaded = !S.wLoaded;
        updateProgLoadBtn();
        if (S.wLoaded) {
          try{ renderWeeklySchedule(); } catch(e){ debouncedRenderWeeklySchedule(); }
          try{ if (typeof showToast === 'function') showToast('Palinsesto caricato'); }catch(e){}
        } else {
          var wrap = document.getElementById('weekly-wrap'); if (wrap) renderWeeklyEmptyState();
        }
      });
      loadPal._fixed = true;
    }

    

    // delegate .btn-altri clicks to showOtherChannels (robust)
    if (!document._btnAltriFixed) {
      document.addEventListener('click', function(ev){
        try{
          var b = ev.target.closest && ev.target.closest('.btn-altri');
              if (!b) return;
                ev.preventDefault(); ev.stopPropagation();
                var iso = b.getAttribute('data-iso');
                var ch = b.getAttribute('data-ch') || (S.wCh || 'Rai 1');
                var progTime = b.getAttribute('data-time') || '20:30';
                var progEnd = b.getAttribute('data-end') || '23:30';
                var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
                
                try { openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd); } catch(e){ console.error('openAltriCanaliModal failed', e); }
        }catch(e){ console.error('btn-altri delegated error', e); }
      }, true);
      document._btnAltriFixed = true;
    }

    // modal close fallback
    var modalClose = document.getElementById('modal-close');
    var modal = document.getElementById('modal-altri');
    var backdrop = document.getElementById('modal-backdrop');
    if (modalClose && !modalClose._fixed) { modalClose.addEventListener('click', function(){ if (modal) modal.style.display='none'; if (backdrop) backdrop.style.display='none'; }); modalClose._fixed = true; }
    if (backdrop && !backdrop._fixed) { backdrop.addEventListener('click', function(){ if (modal) modal.style.display='none'; backdrop.style.display='none'; }); backdrop._fixed = true; }
  }catch(e){ console.error('ensureWeeklyHandlers error', e); }
}

// Run init now to ensure bindings
try{ ensureWeeklyHandlers(); } catch(e){ console.error('init ensureWeeklyHandlers failed', e); }

// Diagnostic: always log clicks on Carica Palinsesto to trace handler flow
try{
  var __dbgPal = document.getElementById('pw-load-pal');
  if (__dbgPal && !__dbgPal._dbgAttached) {
    __dbgPal.addEventListener('click', function(ev){
      try{
        console.log('DBG PW-LOAD-CLICK', {evtTarget: ev.target && ev.target.id, S_wLoaded: S.wLoaded, uiChannel: (document.getElementById('pw-channel')||{}).value, uiWeek: (document.getElementById('pw-week-date')||{}).value, S_weekStartISO: S.weekStartISO});
      }catch(e){ console.log('DBG PW-LOAD-CLICK error', e); }
    }, true);
    __dbgPal._dbgAttached = true;
  }
}catch(e){ console.warn('attach dbg pw-load-pal failed', e); }

// Intercept clicks on Carica Palinsesto at document-capture level and perform a single, authoritative toggle.
try{
  document.addEventListener('click', function(ev){
    try{
      var btn = ev.target && ev.target.closest && ev.target.closest('#pw-load-pal');
      if (!btn) return;
      // prevent other handlers from toggling multiple times
      ev.preventDefault(); ev.stopImmediatePropagation();
      var ch = (document.getElementById('pw-channel')||{}).value || S.wCh || 'Rai 1';
      var dateVal = (document.getElementById('pw-week-date')||{}).value || S.weekStartISO || '';
      if (!ch) ch = S.wCh || 'Rai 1';
      if (!dateVal || String(dateVal).trim() === '') { ensureValidWeekStartISO(); dateVal = S.weekStartISO; try{ showToast('Nessuna settimana selezionata: uso settimana corrente'); }catch(_){} }
      try { var w = getWeekMonday(dateVal); var iso = formatDateToISOLocal(w); var maxIso = (document.getElementById('pw-week-date')||{}).max || ''; if (maxIso && iso > maxIso) { iso = maxIso; showToast('Non è possibile selezionare oltre la settimana corrente'); } S.weekStartISO = iso; } catch(e){ S.weekStartISO = dateVal; }
      S.wCh = ch;
      // toggle palinsesto visibility once
      if (!document._palToggleLock || (Date.now() - document._palToggleLock) > 400) {
        document._palToggleLock = Date.now();
        S.wLoaded = !S.wLoaded;
        updateProgLoadBtn();
        if (S.wLoaded) {
          try{ renderWeeklySchedule(); } catch(e){ debouncedRenderWeeklySchedule(); }
        } else { var wrap = document.getElementById('weekly-wrap'); if (wrap) renderWeeklyEmptyState(); }
      }
    }catch(e){ console.error('doc-capture pw-load-pal handler failed', e); }
  }, true);
}catch(e){ console.warn('attach doc-capture pw-load-pal failed', e); }

// Extra strong handler: intercepta il click in capture per garantire che "Carica Palinsesto" funzioni
try{
  var _forcePal = document.getElementById('pw-load-pal');
  if (_forcePal && !_forcePal._forceAttached) {
    _forcePal.addEventListener('click', function(ev){
      // Toggle palinsesto visibility robustly; do not force-open unconditionally
      try{
        ev.preventDefault();
        var ch = (document.getElementById('pw-channel')||{}).value || S.wCh || 'Rai 1';
        var dateVal = (document.getElementById('pw-week-date')||{}).value || S.weekStartISO || '';
        if (!ch) ch = S.wCh || 'Rai 1';
        if (!dateVal || String(dateVal).trim() === '') { ensureValidWeekStartISO(); dateVal = S.weekStartISO; try{ showToast('Nessuna settimana selezionata: uso settimana corrente'); }catch(_){} }
        var w = getWeekMonday(dateVal);
        var iso = formatDateToISOLocal(w);
        var maxIso = (document.getElementById('pw-week-date')||{}).max || '';
        if (maxIso && iso > maxIso) { iso = maxIso; showToast('Non è possibile selezionare oltre la settimana corrente'); }
        S.weekStartISO = iso;
        S.wCh = ch;
        // toggle rather than forcing true
        S.wLoaded = !S.wLoaded;
        updateProgLoadBtn();
        if (S.wLoaded) {
          try{ renderWeeklySchedule(); } catch(e){ debouncedRenderWeeklySchedule(); }
        } else {
          var wrap = document.getElementById('weekly-wrap'); if (wrap) renderWeeklyEmptyState();
        }
      }catch(e){ console.error('force pw-load-pal handler error', e); }
    }, true);
    _forcePal._forceAttached = true;
  }
}catch(e){ console.warn('attach force pw-load-pal failed', e); }

// Extra defensive global listener: final fallback to open modal when any 'Altri Canali' UI is clicked
try{
  document.addEventListener('click', function(ev){
    try{
      var t = ev.target;
      var btn = t && t.closest ? t.closest('.btn-altri, [data-altri="1"], [title="Altri Canali"]') : null;
      if (!btn) return;
      ev.preventDefault(); ev.stopPropagation();
      var iso = btn.getAttribute('data-iso') || S.weekStartISO;
      var ch = btn.getAttribute('data-ch') || (S.wCh || 'Rai 1');
      var progTime = btn.getAttribute('data-time') || '20:30';
      var progEnd = btn.getAttribute('data-end') || '23:30';
      var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
      console.log('fallback delegated openAltriCanaliModal', iso, ch, hasActuals);
      var tr = btn.closest && btn.closest('tr');
      var dayIndex = computeDayIndexFromISO(iso);
      try {
        if (tr) {
          renderT4ChannelPanel(iso, dayIndex, ch, hasActuals, tr, progTime, progEnd);
        } else {
          openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd);
        }
      } catch(e){ console.error('fallback openAltriCanaliModal failed', e); }
    }catch(e){ console.error('fallback btn-altri listener error', e); }
  }, true);
}catch(e){ console.error('attach fallback btn-altri listener failed', e); }

// pw-load-aud removed: Auditel population runs automatically after render

// Defensive startup: ensure modal/backdrop are hidden (avoid blocking overlays)
try{
  var _md = document.getElementById('modal-altri');
  var _bd = document.getElementById('modal-backdrop');
  if (_md) { _md.style.display = 'none'; }
  if (_bd) { _bd.style.display = 'none'; }
  try{ console.log('startup: modal/backdrop hidden', {modalDisplay: _md? _md.style.display : 'missing', backdropDisplay: _bd? _bd.style.display : 'missing'}); } catch(e){}
}catch(e){}

// Extra robust non-capture delegated listener: ensures .btn-altri always responds
try{
  document.addEventListener('click', function(ev){
    try{
      var b = ev.target.closest && ev.target.closest('.btn-altri');
      if (b) {
        ev.preventDefault(); ev.stopPropagation();
        console.log('robust handler: .btn-altri clicked', b.getAttribute('data-iso'), b.getAttribute('data-ch'));
        var iso = b.getAttribute('data-iso');
        var ch = b.getAttribute('data-ch') || (S.wCh || 'Rai 1');
        var progTime = b.getAttribute('data-time') || '20:30';
        var progEnd = b.getAttribute('data-end') || '23:30';
        var tr = b.closest && b.closest('tr') || document.querySelector('#pw-table tbody tr');
        var dayIndex = computeDayIndexFromISO(iso);
        var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
        try {
          // Prefer the table-panel insertion; if it fails try modal fallback explicitly
          renderT4ChannelPanel(iso, dayIndex, ch, hasActuals, tr, progTime, progEnd);
        } catch(e){
          console.error('robust btn-altri render failed', e);
          try{ openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd); }catch(err){ console.error('modal fallback failed', err); }
        }
        return;
      }
      
    }catch(e){ console.error('robust delegated listener error', e); }
  }, false);
}catch(e){ console.warn('attach robust non-capture listener failed', e); }

// Extra explicit global handler that calls the public wrapper to maximize compatibility
try{
  if (!document._btnAltriExplicit) {
    document.addEventListener('click', function(ev){
      try{
        var t = ev.target;
        var b = t.closest && t.closest('.btn-altri');
        if (!b) return;
        // If the inline onclick exists, call it; otherwise call the wrapper
        if (b.getAttribute('onclick')) {
          try { b.click(); return; } catch(e) { /* continue to wrapper */ }
        }
        var iso = b.getAttribute('data-iso');
        var ch = b.getAttribute('data-ch') || (S.wCh || 'Rai 1');
        showOtherChannels(iso, ch, b);
      }catch(e){ console.error('explicit btn-altri handler error', e); }
    }, true);
    document._btnAltriExplicit = true;
  }
}catch(e){ console.warn('attach explicit btn-altri handler failed', e); }

    // TEMP DEBUG: global click logger to inspect why .btn-altri clicks aren't caught
    try{
      document.addEventListener('click', function(ev){
        try{
          var t = ev.target;
          var tag = t && t.tagName;
          var cls = (t && t.className) || '';
          var closestAltri = t && t.closest && t.closest('.btn-altri');
          console.log('GLOBAL CLICK LOG:', {tag: tag, class: cls, text: (t && t.textContent||'').trim().slice(0,40), closestAltri: !!closestAltri});
        }catch(e){}
      }, true);
    }catch(e){}
