/* ================================================================
   RIGHT PANEL
================================================================ */
function renderRightPanel() {
  var body = document.getElementById('r-panel-body');
  if (!body) return;
  // Do not render the right summary panel for 'sostituzione' or 'spostamento' mode
  if (S.mode === 'sostituzione' || S.mode === 'spostamento') {
    body.innerHTML = '';
    return;
  }

  // Serve il programma da sostituire (se non c'è, mostro placeholder)
  var prog = S.prog;
  var ch = (S.ch || (prog ? prog.ch : null) || '—');
  var dt = (S.date || '—');

  if (!prog) {
    body.innerHTML = '<div class="rp-empty">Seleziona un programma da sostituire per vedere il riepilogo.</div>';
    return;
  }

  var pTitle = prog.title;
  var pMeta  = (prog.time ? (prog.time + '–' + prog.end) : '—') + ' · ' + (prog.genre || '—');
  var pShare = (typeof prog.share === 'number') ? prog.share.toFixed(1) + '%' : '—';

  var comps = (getCompetitors(prog.slot) || []).slice().sort(function(a,b){return (b.share||0)-(a.share||0);}).slice(0,3);
  var topC = comps[0];

  var riskHigh = false;
  if (typeof prog.share === 'number' && prog.share < 12) riskHigh = true;
  if (topC && typeof topC.share === 'number' && typeof prog.share === 'number' && topC.share > prog.share) riskHigh = true;

  var hasCand = !!S.cand;
  var candTitle = hasCand ? S.cand.title : '—';
  var pred = null;
  var delta = null;
  if (hasCand) {
    var res = predictShare(prog, S.cand);
    pred = res.pred;
    delta = (pred - prog.share);
  }

  var impactText = '—';
  if (hasCand) {
    var ad = Math.abs(delta);
    impactText = ad < 0.8 ? 'Impatto contenuto' : (ad < 1.8 ? 'Impatto medio' : 'Impatto elevato');
  }

  var h = '';
  h += '<div class="rp-h2">' + (S.mode === 'spostamento' ? 'DESTINAZIONE' : 'CONFRONTO') + '</div>';
    // color the lower value red and the higher green for quick compare
    try {
      var origNum = (typeof prog.share === 'number') ? prog.share : parseFloat(('' + prog.share).replace('%','')) || NaN;
      var predNum = (hasCand && typeof pred === 'number') ? pred : NaN;
      var colOrig = 'var(--muted)';
      var colPred = 'var(--muted)';
      if (!isNaN(origNum) && !isNaN(predNum)) { if (origNum > predNum) { colOrig = 'var(--success)'; colPred = 'var(--danger)'; } else if (origNum < predNum) { colOrig = 'var(--danger)'; colPred = 'var(--success)'; } }
      var destSlotLabel = (S.mode === 'spostamento') ? ((S.spDestTime || '—') + (S.spDestTimeEnd ? '–'+S.spDestTimeEnd : '')) : '—';
      var destShareLabel = (S.mode === 'spostamento' && S._spSimulated) ? (function(){ try { return predictShare(prog,{id:'move',tipo:prog.tipo,eta:prog.eta,sesso:prog.sesso}).pred.toFixed(1)+'%'; } catch(e){ return '—'; } })() : (hasCand ? pred.toFixed(1)+'%' : '—');
      var lbl2 = (S.mode === 'spostamento') ? 'Destinazione' : 'Sostitutivo';
      var nm2  = (S.mode === 'spostamento') ? ((S.spDestDay ? S.spDestDay.split('-').reverse().join('/') : '—') + (S.spDestTime ? ' · ' + S.spDestTime : '') + (S.spDestTimeEnd ? '–'+S.spDestTimeEnd : '')) : candTitle;
      h += '<div class="rp-compare">'
        +  '<div class="rp-mini">'
        +    '<div class="lbl">Origine</div>'
        +    '<div class="nm">' + pTitle + '</div>'
        +    '<div class="val" style="color:' + colOrig + '">' + pShare + '</div>'
        +  '</div>'
        +  '<div class="rp-mini">'
        +    '<div class="lbl">' + lbl2 + '</div>'
        +    '<div class="nm">' + nm2 + '</div>'
        +    '<div class="val" style="color:' + colPred + '">' + destShareLabel + '</div>'
        +  '</div>'
        + '</div>';
    } catch(e) { h += '<div class="rp-compare"><div class="rp-mini"><div class="lbl">Origine</div><div class="nm">' + pTitle + '</div><div class="val">' + pShare + '</div></div><div class="rp-mini"><div class="lbl">' + (S.mode === 'spostamento' ? 'Destinazione' : 'Sostitutivo') + '</div><div class="nm">—</div><div class="val">—</div></div></div>'; }

  if (hasCand || (S.mode === 'spostamento' && S._spSimulated)) {
    var sign = delta !== null && delta >= 0 ? '+' : '';
    var deltaDisp = delta !== null ? sign + delta.toFixed(1) + ' pp' : '—';
    h += '<div class="rp-impact">'
      +  '<div class="d">' + deltaDisp + '</div>'
      +  '<div class="t">' + impactText + '</div>'
      + '</div>';
  } else {
    h += '<div class="rp-impact"><div class="t">' + (S.mode === 'spostamento' ? 'Seleziona giorno e slot di destinazione' : 'Seleziona un sostitutivo per calcolare l\u2019impatto') + '</div></div>';
  }

  // center the summary panel and constrain width for better responsiveness
  var outer = '<div style="display:flex;justify-content:center;padding:8px 12px;">' +
        '<div style="width:100%;max-width:420px;">' + h + '</div></div>';
  body.innerHTML = outer;
}

// Ensure the results panel is visible and scrolled into view
function ensureResultVisible(){
  var rp = document.querySelector('.r-panel');
  if (!rp) return;
  try {
    rp.classList.remove('hidden'); rp.style.display = '';
    var split = document.querySelector('.split'); if (split) { if (S.mode === 'sostituzione') split.classList.remove('has-panel'); else split.classList.add('has-panel'); }
    // bring the panel to viewport center and reset internal scroll
    rp.scrollIntoView({behavior: 'smooth', block: 'center'});
    var body = rp.querySelector('#r-panel-body'); if (body) body.scrollTop = 0;
  } catch(e) { console.warn('ensureResultVisible failed', e); }
}

