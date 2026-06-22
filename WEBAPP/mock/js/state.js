
/* ================================================================
   STATE
================================================================ */
var S = {
  mode: null,
  step: 0,
  ch: null,
  // default: no date selected on initial home view (placeholder shown)
  date: '',
  slot: null,
  eta: null,
  sesso: null,
  tipo: null,
  share: null,
  _search: '',
  dur: null,

  prog: null,
  cand: null,

  activeScen: 1,
  scenarios: { 1:{items:[],anchor:null}, 2:{items:[],anchor:null}, 3:{items:[],anchor:null}, 4:{items:[],anchor:null} },

  showComp: false,
  _showCompRes: false,
  
  // Strong events storage: persistent by date+time+channel+title
  _strongEventsStore: {},

  _srcLoaded: false,
  _destLoaded: false,
  _spSimulated: false,
  spDestDay: '',
  spSrcDay: '',
  spDestTime: null,

  wCh: '',
  wWk: 10,
  wMode: 'futura',
  // Always render weekly programmazione automatically when week/channel selected
  wLoaded: false,
  _wkExplicit: false,

  _viewSim: false,
  _simResult: null,

  // Candidate filter state (sostituzione step 2 — independent from main filters)
  _candCh: null,
  _candSlot: null,
  _candSearch: '',

  // Result step: tracks whether current simulation has been saved
  _simSaved: false,

  // Scenari tab: filter state & pagination
  _scenFilter: { search: '', type: '', date: '' },
  _scenPage: 1,
  _editingScenarioTitle: null
};

// Debug flag to avoid noisy console logs in production
var DEBUG = false;

function applyFilters(list, txt) {
  var t = (txt||'').toLowerCase();
  return list.filter(function(p){
    if (t && (p.title + ' ' + p.genre + ' ' + p.tipo).toLowerCase().indexOf(t) === -1) return false;
    if (S.ch && p.ch !== S.ch) return false;
    if (S.slot) {
      var s = S.slot;
      // If slot is a single start time (HH:MM), match program start time
      if (/^\d{1,2}:\d{2}$/.test(s)) {
        try {
          var fmt = s.split(':');
          var sh = String(fmt[0]).padStart(2,'0'); var sm = fmt[1]; var sval = sh + ':' + sm;
          if (!p.time || p.time.indexOf(sval) !== 0) return false;
        } catch(e) { /* fallback */ }
      } else if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(s)) {
        try {
          var parts = s.split('-');
          var from = parts[0]; var to = parts[1];
          var pt = p.time || '00:00';
          var num = function(hm){ var a = hm.split(':'); return Number(a[0])*60 + Number(a[1]); };
          var npt = num(pt); var nfrom = num(from); var nto = num(to);
          var npe = p.end ? num(p.end) : null;
          // Handle programs that cross midnight (end < start)
          if (npe !== null && npe < npt) npe += 1440;
          // Overlap: program must be airing during at least part of [from, to]
          // condition: prog_start < range_end AND prog_end > range_start
          if (npe !== null) {
            if (npt >= nto || npe <= nfrom) return false;
          } else {
            // No end time available: generous check — start within or before range end
            if (npt >= nto || npt < nfrom) return false;
          }
        } catch(e){ /* fallback */ }
      } else if (/^\d{2}:\d{2}-$/.test(s)) {
        // From-only: programs starting at or after 'from', or still airing at 'from'
        try {
          var numF = function(hm){ var a=hm.split(':'); return Number(a[0])*60+Number(a[1]); };
          var nfromF = numF(s.slice(0,5));
          var nptF = numF(p.time||'00:00');
          var npeF = p.end ? numF(p.end) : null;
          if (npeF !== null && npeF < nptF) npeF += 1440;
          if (npeF !== null) { if (npeF <= nfromF) return false; }
          else { if (nptF < nfromF) return false; }
        } catch(e){}
      } else if (/^-\d{2}:\d{2}$/.test(s)) {
        // To-only: programs that start before 'to'
        try {
          var numT = function(hm){ var a=hm.split(':'); return Number(a[0])*60+Number(a[1]); };
          if (numT(p.time||'00:00') >= numT(s.slice(1))) return false;
        } catch(e){}
      } else {
        if (p.slot !== S.slot) return false;
      }
    }
    if (S.tipo && p.tipo !== S.tipo) return false;
    if (S.eta && !(p.eta === S.eta || p.eta === 'Tutti' || S.eta === 'Tutti')) return false;
    if (S.sesso && !(p.sesso === S.sesso || p.sesso === 'Tutti' || S.sesso === 'Tutti')) return false;
    if (S.dur && Number(p.dur) !== Number(S.dur)) return false;
        return true;
  });
}

// Populate the 'Reale' and 'Scostamento' columns using WEEKLY data when available
function loadAuditelForWeekly() {
  var table = document.querySelector('#pw-table tbody');
  if (!table) return showToast('Nessuna tabella settimanale trovata.');
  // Determine if selected week is current or beyond selectable horizon
  var maxIso = maxSelectableWeekStart(new Date());
  var isCur = isCurrentWeek(S.weekStartISO);
  var isBeyond = (S.weekStartISO && maxIso && S.weekStartISO > maxIso);
  if (isCur || isBeyond) {
    // For the current week and any future weeks, Reale and Scostamento are 'Non disponibile'
    table.querySelectorAll('tr').forEach(function(tr){
      var realCell = tr.querySelector('.real-cell'); if (realCell) realCell.textContent = 'Non disponibile';
      var scostCell = tr.querySelector('.scost-cell'); if (scostCell) scostCell.textContent = 'Non disponibile';
    });
    console.warn('Dati Auditel non disponibili per la settimana corrente/futura (suppressed toast)');
    return;
  }
  // try to find week number by matching S.weekStartISO in WEEK_STARTS
  var weekNum = null;
  for (var k in WEEK_STARTS) { if (WEEK_STARTS[k] === S.weekStartISO) { weekNum = k; break; } }
  // If no matching week found in demo data, fallback to latest available demo week
  if (!weekNum) {
    try {
      var keys = Object.keys(WEEK_STARTS || {}).sort(function(a,b){ return Number(a) - Number(b); });
      if (keys && keys.length) {
        weekNum = keys[keys.length-1];
        console.warn('loadAuditelForWeekly: week not found, falling back to demo week', weekNum, WEEK_STARTS[weekNum]);
      } else {
        // Nessun dato Auditel disponibile - carica comunque i dati demo silenziosamente
      }
    } catch(e){ console.error('week fallback failed', e); }
  }
  var rows = Array.from(table.querySelectorAll('tr'));
  // group rows by ISO day
  var rowsByIso = {};
  rows.forEach(function(tr){ var iso = tr.getAttribute('data-iso') || ''; rowsByIso[iso] = rowsByIso[iso] || []; rowsByIso[iso].push(tr); });

  Object.keys(rowsByIso).forEach(function(iso){
    var group = rowsByIso[iso];
    // compute day index relative to selected week start
    var dayIndex = null;
    try {
      if (S.weekStartISO) {
        // compute day index relative to the Monday used by WEEKLY data
        var weekMon = (function(){ try { var w = getWeekMonday(S.weekStartISO); return formatDateToISOLocal(w); } catch(e){ return S.weekStartISO; } })();
        var dIso = new Date(iso + 'T00:00:00');
        var dMon = new Date(weekMon + 'T00:00:00');
        dayIndex = Math.round((dIso.getTime() - dMon.getTime()) / 86400000);
      }
    } catch(e){ dayIndex = null; }

    var dailyReal = null;
    try { if (weekNum && typeof dayIndex === 'number' && WEEKLY[weekNum] && WEEKLY[weekNum][dayIndex]) dailyReal = WEEKLY[weekNum][dayIndex].real; } catch(e){ dailyReal = null; }

    group.forEach(function(tr){
      if (typeof DEBUG !== 'undefined' && DEBUG) {
        try {
          var dbgTitle = (tr.querySelector('.p-title')||{}).textContent || '(no title)';
          console.log('[AUDITEL DEBUG] row:init', {iso: iso, title: dbgTitle, pid: tr.getAttribute('data-pid'), dayIndex: dayIndex});
        } catch(e){}
      }
      
      // Leggi Previsto dalla colonna Previsto (solo testo, non input)
      var prevVal = null;
      var prevCells = tr.querySelectorAll('td');
      // La colonna Previsto è la 4a (<td> dopo giorno, orario, programma)
      if (prevCells && prevCells.length >= 4) {
        var prevCell = prevCells[3]; // 0-based: giorno(0), orario(1), programma(2), previsto(3)
        if (prevCell && prevCell.textContent && prevCell.textContent.trim() !== '—') {
          var m = prevCell.textContent.match(/(\d+(?:\.\d+)?)/);
          if (m) prevVal = parseFloat(m[1]);
        }
      }
      
      // Leggi Manuale dalla colonna Manuale (input nella .manual-cell)
      var manualVal = null;
      var manualInput = tr.querySelector('.manual-cell .prev-input');
      if (manualInput && manualInput.value !== '' && manualInput.getAttribute('data-example') !== '1') {
        manualVal = parseFloat(manualInput.value);
      }
      // Se non c'è input valorizzato, prova a leggere da .prev-val nella manual-cell
      if ((manualVal === null || isNaN(manualVal))) {
        var manualSpan = tr.querySelector('.manual-cell .prev-val');
        if (manualSpan && !manualSpan.classList.contains('prev-placeholder') && manualSpan.textContent) {
          var m2 = manualSpan.textContent.match(/(\d+(?:\.\d+)?)/);
          if (m2) manualVal = parseFloat(m2[1]);
        }
      }

      var realCell = tr.querySelector('.real-cell');
      var scostCell = tr.querySelector('.scost-cell');

      // Per calcolare Auditel/Scostamento serve almeno uno tra Previsto e Manuale
      var hasBaseValue = !((prevVal === null || isNaN(prevVal)) && (manualVal === null || isNaN(manualVal)));
      if (typeof DEBUG !== 'undefined' && DEBUG && !hasBaseValue) console.log('[AUDITEL DEBUG] no-prev-or-manual', {iso: iso, pid: tr.getAttribute('data-pid')});

      // Né Previsto né Manuale disponibili su settimana PASSATA: Reale esiste (generato), Scostamento non calcolabile
      if (!hasBaseValue) {
        var _pid2 = tr.getAttribute('data-pid') || '';
        var _prog2 = PROGS.filter(function(p){ return p.id === _pid2; })[0] || null;
        var _base2 = (_prog2 && typeof _prog2.share === 'number') ? _prog2.share : 8.0;
        var _realNoPrev;
        if (typeof dailyReal === 'number') {
          _realNoPrev = dailyReal;
        } else {
          // valore deterministico ma realistico: variazione ±3 pp basata su hash iso+pid
          var _hk2 = (iso || '') + '|' + _pid2 + '|rnp';
          var _hv2 = hashToNumber(_hk2);
          _realNoPrev = Math.max(0.1, Math.round((_base2 + (_hv2 - 0.5) * 6) * 10) / 10);
        }
        if (realCell) realCell.textContent = _realNoPrev.toFixed(1) + '%';
        if (scostCell) scostCell.textContent = 'Non disponibile';
        if (typeof DEBUG !== 'undefined' && DEBUG) console.log('[AUDITEL DEBUG] prev-missing -> real-generated, scost-unavail', {iso: iso, pid: _pid2, realNoPrev: _realNoPrev});
        return;
      }

      // find a matching real value in WEEKLY for this specific program if possible
      var matchedReal = null;
      try {
        var pid = tr.getAttribute('data-pid');
        var titleCell = tr.querySelector('.p-title');
        var pTitle = titleCell ? titleCell.textContent.trim() : '';
        if (weekNum && WEEKLY[weekNum]) {
          // try match by program title (case-insensitive, partial match)
          for (var wi=0; wi<WEEKLY[weekNum].length; wi++) {
            var entry = WEEKLY[weekNum][wi];
            if (!entry) continue;
            var entryProg = (entry.prog || '').toLowerCase();
            if (pTitle && entryProg && (entryProg === pTitle.toLowerCase() || entryProg.indexOf(pTitle.toLowerCase()) !== -1 || pTitle.toLowerCase().indexOf(entryProg) !== -1)) {
              if (typeof entry.real === 'number') { matchedReal = entry.real; break; }
            }
          }
        }
      } catch(e){ matchedReal = null; }

      // Determine realVal with priority: matchedReal -> dailyReal -> baseVal (manualVal ?? prevVal)
      var realVal = null;
      var realSource = null;
      if (typeof matchedReal === 'number') { realVal = matchedReal; realSource = 'prog-match'; }
      else if (typeof dailyReal === 'number') { realVal = dailyReal; realSource = 'daily-fallback'; }
      else {
        // fallback: usa Manuale se disponibile, altrimenti Previsto, per generare un valore Auditel realistico
        var baseForReal = null;
        if (typeof manualVal === 'number' && !isNaN(manualVal)) {
          baseForReal = manualVal;
        } else if (typeof prevVal === 'number' && !isNaN(prevVal)) {
          baseForReal = prevVal;
        }
        
        if (baseForReal !== null) {
          // genera Reale realistico vicino al baseForReal (variazione ±5 pp) per avere sia valori positivi che negativi
          var _hkFb = (iso || '') + '|' + (tr.getAttribute('data-pid') || '') + '|fb';
          var _hvFb = hashToNumber(_hkFb);
          // usa una curva che distribuisce su +/- 5pp, centrata su 0 (non su baseForReal)
          var _signFb = (_hvFb > 0.5) ? 1 : -1;
          var _magFb = Math.round((_hvFb % 0.5) * 10 * 10) / 10; // 0.0 – 5.0
          realVal = Math.max(0.1, Math.round((baseForReal + _signFb * _magFb) * 10) / 10);
          realSource = 'base-fallback-var';
        }
      }

      if (typeof DEBUG !== 'undefined' && DEBUG) {
        try { console.log('[AUDITEL DEBUG] match-eval', JSON.stringify({iso: iso, pid: tr.getAttribute('data-pid'), prevVal: prevVal, manualVal: manualVal, matchedReal: matchedReal, dailyReal: dailyReal, realVal: realVal, source: realSource})); } catch(e) { console.log('[AUDITEL DEBUG] match-eval', {iso: iso, pid: tr.getAttribute('data-pid'), prevVal: prevVal, manualVal: manualVal, matchedReal: matchedReal, dailyReal: dailyReal, realVal: realVal, source: realSource}); }
      }

      if (typeof realVal === 'number') {
        if (realCell) realCell.textContent = realVal.toFixed(1) + '%';
        if (scostCell) {
          // Scostamento = Auditel - (Manuale ?? Previsto)
          // Se l'utente ha inserito un valore Manuale, usa quello; altrimenti usa Previsto
          var baseVal = null;
          if (typeof manualVal === 'number' && !isNaN(manualVal)) {
            baseVal = manualVal;
          } else if (typeof prevVal === 'number' && !isNaN(prevVal)) {
            baseVal = prevVal;
          }
          
          if (baseVal !== null) {
            var scost = realVal - baseVal;
            var cls = scost < -10 ? 'scost-pill scost-neg' : 'scost-pill scost-pos';
            scostCell.innerHTML = '<span class="' + cls + '">' + (scost>0?'+':'') + scost.toFixed(1) + '%</span>';
          } else {
            scostCell.textContent = 'Non disponibile';
          }
        }
      } else {
        // Past week but no real data for this program/day -> show clear 'Non disponibile'
        if (realCell) realCell.textContent = 'Non disponibile';
        if (scostCell) scostCell.textContent = 'Non disponibile';
      }
    });
  });
}

