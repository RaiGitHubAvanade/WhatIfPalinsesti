var SCEN_PER_PAGE = 3;

function _getScenKeys() {
  return Object.keys(S.scenarios).map(Number).filter(function(n){ return !isNaN(n) && n >= 1; }).sort(function(a,b){ return a-b; });
}

function _filteredScenarios() {
  var f = S._scenFilter || { search: '', type: '', date: '' };
  var result = _getScenKeys()
    .filter(function(k){ var sc = S.scenarios[k]; return sc && sc.items && sc.items.length > 0; })
    .map(function(k){ return { idx: k, sc: S.scenarios[k] }; });
  if (f.search) {
    var q = f.search.toLowerCase();
    result = result.filter(function(r){
      var sc = r.sc;
      if ((sc.title||'').toLowerCase().indexOf(q) !== -1) return true;
      if (sc.anchor && sc.anchor.title && sc.anchor.title.toLowerCase().indexOf(q) !== -1) return true;
      return (sc.items||[]).some(function(it){
        if (it.orig && it.orig.title && it.orig.title.toLowerCase().indexOf(q) !== -1) return true;
        if (it.cand && it.cand.title && it.cand.title.toLowerCase().indexOf(q) !== -1) return true;
        return false;
      });
    });
  }
  if (f.type) { result = result.filter(function(r){ return r.sc.type === f.type; }); }
  if (f.date) { result = result.filter(function(r){ return r.sc.items && r.sc.items.some(function(it){ return it.date && it.date === f.date; }); }); }
  result.sort(function(a,b){ var ta = a.sc.createdAt ? new Date(a.sc.createdAt).getTime() : 0; var tb = b.sc.createdAt ? new Date(b.sc.createdAt).getTime() : 0; return tb - ta; });
  return result;
}

function renderScenariView() {
  var wrap = document.getElementById('scen-list-wrap');
  if (!wrap) return;

  if (!S._scenFilter) S._scenFilter = { search: '', type: '', date: '' };
  if (!S._scenPage) S._scenPage = 1;
  var f = S._scenFilter;

  var allItems = _filteredScenarios();
  var total = allItems.length;
  var totalPages = Math.max(1, Math.ceil(total / SCEN_PER_PAGE));
  if (S._scenPage > totalPages) S._scenPage = totalPages;
  var page = S._scenPage;
  var pageItems = allItems.slice((page-1)*SCEN_PER_PAGE, page*SCEN_PER_PAGE);

  var hasAnyScenario = _getScenKeys().some(function(k){ var sc = S.scenarios[k]; return sc && sc.items && sc.items.length > 0; });
  var html = '';

  // ── Back to Simulation banner (only if coming from result page) ──────────

  // ── Filter bar ────────────────────────────────────────────────────────────
  html += '<div class="scen-filter-bar">';
  html += '<div class="scen-filter-search"><span class="scen-filter-ico">🔍</span><input type="text" id="scen-search-inp" class="scen-search-inp" placeholder="Cerca scenario..." value="' + (f.search||'').replace(/"/g,'&quot;') + '"></div>';
  html += '<div class="scen-type-pills">';
  html += '<button class="scen-type-pill' + (!f.type?' active':'') + '" data-type="">Tutti</button>';
  html += '<button class="scen-type-pill' + (f.type==='sostituzione'?' active':'') + '" data-type="sostituzione">🔄 Sostituzione</button>';
  html += '<button class="scen-type-pill' + (f.type==='spostamento'?' active':'') + '" data-type="spostamento">🕐 Spostamento</button>';
  html += '</div>';
  html += '<div class="scen-filter-date-wrap">';
  html += '<label for="scen-date-inp" class="scen-filter-label">📅 Data messa in onda:</label>';
  html += '<input type="date" id="scen-date-inp" class="scen-filter-date" value="' + (f.date||'') + '" title="Filtra per data di messa in onda del programma">';
  html += '</div>';
  if (f.search || f.type || f.date) html += '<button id="scen-filter-reset" class="scen-filter-reset">✕ Azzera</button>';
  html += '<span class="scen-filter-count">' + total + (total===1?' scenario':' scenari') + '</span>';
  html += '</div>';

  // ── Empty state ───────────────────────────────────────────────────────────
  if (total === 0) {
    html += '<div class="scen-empty-state"><div class="scen-empty-ico">📋</div><div class="scen-empty-msg">' + (!hasAnyScenario ? 'Nessuno scenario salvato.' : 'Nessun risultato per i filtri selezionati.') + '</div></div>';
    wrap.innerHTML = html;
    _attachScenFilterEvents();
    return;
  }

  // ── Cards grid ────────────────────────────────────────────────────────────
  html += '<div class="scen-cards-grid">';
  pageItems.forEach(function(item){
    var k = item.idx; var s = item.sc;
    var ts = s.createdAt ? (new Date(s.createdAt)).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    var anchorDateTime = '—';
    if (s.anchor && s.anchor.time && s.items && s.items.length > 0 && s.items[0].date) {
      try {
        var anchorDateObj = new Date(s.items[0].date + 'T' + s.anchor.time + ':00');
        anchorDateTime = anchorDateObj.toLocaleString('it-IT', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
      } catch(e) { anchorDateTime = (s.items[0].date || '') + ' ' + (s.anchor.time || ''); }
    } else if (s.anchor && s.anchor.time) {
      anchorDateTime = s.anchor.time;
    }
    var labelText = s.title || (s.anchor ? s.anchor.title : ('Scenario ' + k));
    var typeLabel = s.type ? (s.type==='spostamento'?'Spostamento':'Sostituzione') : '';
    var typeCls = s.type==='spostamento'?'spostamento':'sostituzione';
    var isFull = s.items.length >= 3;

    html += '<div class="scen-hcard ' + typeCls + '">';

    // Head: title + badges
    html += '<div class="scen-hcard-head">';
    html += '<div class="scen-hcard-title"><span id="sc-title-label-' + k + '">' + labelText + '</span><button class="btn-edit-title-scn scen-icon-btn" data-scn="' + k + '" title="Rinomina scenario">✏️</button></div>';
    html += '<div class="scen-hcard-badges">';
    if (typeLabel) html += '<span class="sc-type-badge ' + typeCls + '">' + typeLabel + '</span>';
    html += '</div></div>';

    // Meta: anchor + date
    html += '<div class="scen-hcard-meta">';
    if (s.anchor) {
      var anchorShare = typeof s.anchor.share === 'number' ? ' <span class="scen-anchor-share">' + s.anchor.share.toFixed(1) + '%</span>' : '';
      html += '<div class="scen-hcard-anchor" title="' + s.anchor.title + '">🎯 ' + s.anchor.title + anchorShare + '</div>';
    }
    html += '<div class="scen-hcard-date">📅 ' + anchorDateTime + '</div>';
    html += '</div>';

    html += '<div class="scen-hcard-count">' + s.items.length + ' / 3 simulazioni</div>';

    // Items
    html += '<div class="scen-hcard-items">';
    s.items.forEach(function(it, idx){
      var dv = (it.res && typeof it.res.pred==='number') ? (it.res.pred-(it.orig.share||0)) : null;
      var pc = dv===null?'var(--muted)':(dv>0?'var(--success)':(dv<0?'var(--danger)':'var(--muted))'));
      var pt = (it.res && typeof it.res.pred==='number') ? it.res.pred.toFixed(1)+'%' : '';
      var dt = dv===null?'':((dv>=0?'+':'')+dv.toFixed(1)+' pp');
      var isMove = it.cand && it.cand.id === 'move';
      var emoji = isMove ? '🕐' : '🔄';
      var candName = '';
      if (isMove) {
        var destDate = it.date || '';
        var destTime = it.destTime || '';
        if (destDate && destTime) {
          candName = '→ ' + fmtDate(destDate) + ' · ' + destTime;
        } else if (destTime) {
          candName = '→ ' + destTime;
        } else if (destDate) {
          candName = '→ ' + fmtDate(destDate);
        } else {
          candName = '→ —';
        }
      } else {
        candName = (it.cand&&it.cand.title)||'—';
      }
      var candShare = (!isMove && it.cand && typeof it.cand.share === 'number') ? it.cand.share.toFixed(1)+'%' : '';
      html += '<div class="scen-hcard-item" data-scn="'+k+'" data-idx="'+idx+'">';
      html += '<div class="scen-item-sub">';
      html += '<span class="scen-item-emoji">' + emoji + '</span>';
      html += '<span class="scen-item-name">' + candName + '</span>';
      if (candShare) html += '<span class="scen-item-cursare">' + candShare + '</span>';
      html += '</div>';
      html += '<div class="scen-item-result">';
      if (pt) html += '<span class="scen-item-pred" style="color:'+pc+';">' + pt + (dt ? '&nbsp;<small>'+dt+'</small>' : '') + '</span>';
      else html += '<span></span>';
      html += '<div class="scen-item-actions">';
      html += '<button class="btn-del-scn scen-icon-btn" data-scn="'+k+'" data-idx="'+idx+'" title="Rimuovi">🗑️</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    if (s.items.length < 3) {
      html += '<button class="btn-add-sim-scn scen-add-sim-btn" data-scn="' + k + '">+ Aggiungi simulazione</button>';
    }

    // Creation date (small, secondary)
    html += '<div class="scen-hcard-created">Creato: ' + ts + '</div>';
    // Footer actions
    html += '<div class="scen-hcard-actions">';
    if (s.items.length) html += '<button class="btn-clear-scn scen-clear-btn" data-scn="' + k + '">Elimina Scenario</button>';
    html += '</div>';

    html += '</div>'; // scen-hcard
  });
  html += '</div>'; // scen-cards-grid

  // ── Pagination ────────────────────────────────────────────────────────────
  if (totalPages > 1) {
    html += '<div class="scen-pagination">';
    html += '<button class="scen-page-nav" id="scen-prev-btn"' + (page<=1?' disabled':'') + '>&#8592;</button>';
    var _pages = [];
    for (var _p = 1; _p <= totalPages; _p++) {
      if (_p === 1 || _p === totalPages || (_p >= page-2 && _p <= page+2)) _pages.push(_p);
    }
    var _prev = null;
    _pages.forEach(function(p) {
      if (_prev !== null && p - _prev > 1) html += '<span class="scen-page-ellipsis">&hellip;</span>';
      html += '<button class="scen-page-num' + (p===page?' active':'') + '" data-page="' + p + '">' + p + '</button>';
      _prev = p;
    });
    html += '<button class="scen-page-nav" id="scen-next-btn"' + (page>=totalPages?' disabled':'') + '>&#8594;</button>';
    html += '</div>';
  }

  wrap.innerHTML = html;
  _attachScenFilterEvents();
  _attachScenCardEvents();
}

function _attachScenFilterEvents() {
  var si = document.getElementById('scen-search-inp');
  if (si) si.addEventListener('input', function(){
    var val = this.value;
    var pos = this.selectionStart;
    S._scenFilter.search = val;
    S._scenPage = 1;
    renderScenariView();
    var newSi = document.getElementById('scen-search-inp');
    if (newSi) { newSi.focus(); newSi.setSelectionRange(pos, pos); }
  });
  document.querySelectorAll('#scen-list-wrap .scen-type-pill').forEach(function(btn){
    btn.addEventListener('click', function(){ S._scenFilter.type = this.getAttribute('data-type'); S._scenPage = 1; renderScenariView(); });
  });
  var sd = document.getElementById('scen-date-inp'); if (sd) sd.addEventListener('change', function(){ S._scenFilter.date=this.value; S._scenPage=1; renderScenariView(); });
  var sr = document.getElementById('scen-filter-reset'); if (sr) sr.addEventListener('click', function(){ S._scenFilter={search:'',type:'',date:''}; S._scenPage=1; renderScenariView(); });
  var sp = document.getElementById('scen-prev-btn'); if (sp) sp.addEventListener('click', function(){ if (S._scenPage>1){ S._scenPage--; renderScenariView(); } });
  var sn = document.getElementById('scen-next-btn'); if (sn) sn.addEventListener('click', function(){ S._scenPage++; renderScenariView(); });
  document.querySelectorAll('#scen-list-wrap .scen-page-num').forEach(function(btn){
    btn.addEventListener('click', function(){ S._scenPage = parseInt(this.getAttribute('data-page'),10); renderScenariView(); });
  });
}

function _attachScenCardEvents() {
  // Click on scenario item to view its result
  document.querySelectorAll('#scen-list-wrap .scen-hcard-item').forEach(function(item){
    item.addEventListener('click', function(ev){
      // Don't trigger if clicking on delete button
      if (ev.target.closest('.btn-del-scn')) return;
      var scenIdx = parseInt(this.getAttribute('data-scn'), 10);
      var itemIdx = parseInt(this.getAttribute('data-idx'), 10);
      if (isNaN(scenIdx) || isNaN(itemIdx)) return;
      var sc = S.scenarios[scenIdx];
      if (!sc || !sc.items || !sc.items[itemIdx]) return;
      var item = sc.items[itemIdx];
      
      // Prepare state restoration object (navSim will reset everything first)
      S._restoreAfterNav = {
        step: 3,
        prog: item.orig,
        cand: item.cand,
        mode: sc.type || 'sostituzione',
        date: item.date,
        ch: item.orig.ch,
        slot: item.orig.slot,
        simSaved: true,
        simResult: { items: [item] }
      };
      
      // For spostamento mode, add destination variables
      if ((sc.type || 'sostituzione') === 'spostamento' && item.destTime) {
        S._restoreAfterNav.spDestDay = item.date;
        S._restoreAfterNav.spDestTime = item.destTime;
        S._restoreAfterNav.spDestCh = item.orig.ch;
        S._restoreAfterNav._spSimulated = true;
      }
      
      S.activeScen = scenIdx;
      // Navigate to simulation view - it will restore the state
      navSim();
    });
  });
  
  document.querySelectorAll('#scen-list-wrap .btn-del-scn').forEach(function(b){ b.addEventListener('click', function(ev){ ev.stopPropagation(); var s=parseInt(this.getAttribute('data-scn'),10); var i=parseInt(this.getAttribute('data-idx'),10); if (isNaN(s)||isNaN(i)) return; if (confirm('Rimuovere questo elemento dallo Scenario '+s+'?')) removeFromScenario(s,i); }); });
  document.querySelectorAll('#scen-list-wrap .btn-add-sim-scn').forEach(function(b){ b.addEventListener('click', function(ev){ ev.stopPropagation(); var sIdx=parseInt(this.getAttribute('data-scn'),10); if (!isNaN(sIdx)) addSimToScenario(sIdx); }); });
  // Inline title editing — direct DOM, no full re-render
  document.querySelectorAll('#scen-list-wrap .btn-edit-title-scn').forEach(function(btn){
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      var k = parseInt(this.getAttribute('data-scn'), 10);
      if (isNaN(k)) return;
      var labelEl = document.getElementById('sc-title-label-' + k);
      if (!labelEl || labelEl.tagName === 'INPUT') return; // already editing
      var currentVal = labelEl.textContent;
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.value = currentVal;
      inp.className = 'scen-title-inp';
      var pencil = this;
      labelEl.parentNode.replaceChild(inp, labelEl);
      pencil.style.display = 'none';
      inp.focus(); inp.select();
      function commit() {
        var newVal = inp.value.trim() || ('Scenario ' + k);
        S.scenarios[k].title = newVal;
        labelEl.textContent = newVal;
        inp.parentNode.replaceChild(labelEl, inp);
        pencil.style.display = '';
      }
      inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { inp.blur(); }
        if (e.key === 'Escape') { inp.value = currentVal; inp.blur(); }
      });
    });
  });
  document.querySelectorAll('#scen-list-wrap .btn-clear-scn').forEach(function(b){ b.addEventListener('click', function(ev){ ev.stopPropagation(); var s=parseInt(this.getAttribute('data-scn'),10); if (!isNaN(s)) { var scName = (S.scenarios[s] && S.scenarios[s].anchor) ? S.scenarios[s].anchor.title : ('Scenario ' + s); if (confirm('Svuotare "' + scName + '"?')) { clearScenario(s); renderScenariView(); } } }); });
}

// ── Legacy stub kept for compatibility ────────────────────────────────────
function _legacyScenView() {
  // body intentionally empty — superseded by renderScenariView() above
}
