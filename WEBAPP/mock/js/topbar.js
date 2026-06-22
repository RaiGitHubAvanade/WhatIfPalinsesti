/* ================================================================
   CONTEXT BAR
================================================================ */
function updateCtxBar() {
  var eCh = document.getElementById('ctx-ch');
  var eDt = document.getElementById('ctx-dt');
  var ePr = document.getElementById('ctx-pr');
  if (eCh) { eCh.textContent = '🖥️ ' + (S.ch || 'Canale'); eCh.classList.toggle('on', !!S.ch); }
  if (eDt) {
    // choose which date to show depending on active mode:
    // - for spostamento, prefer source date, then dest date
    // - otherwise show S.date
    var dtToShow = S.date;
    if (S.mode === 'spostamento') dtToShow = S.spSrcDay || S.spDestDay || S.date;
    try {
      var parsed = parseISODateLocal(dtToShow);
      if (!dtToShow || !parsed || isNaN(parsed.getTime())) dtToShow = formatDateToISOLocal(new Date());
    } catch(e) { dtToShow = formatDateToISOLocal(new Date()); }
    eDt.textContent = '📆 ' + fmtDate(dtToShow);
    eDt.classList.toggle('on', !!(S.mode === 'spostamento' ? (S.spSrcDay || S.spDestDay) : S.date));
  }
  if (ePr) { var t = (S.prog && S.prog.title) ? S.prog.title : 'Programma'; ePr.textContent = '🎞️ ' + t; ePr.classList.toggle('on', !!S.prog); }
}
