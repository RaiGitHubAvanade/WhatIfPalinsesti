/* ================================================================
   INIT
================================================================ */
// Global error handlers to surface uncaught errors and promise rejections
window.addEventListener('error', function(ev){
  try { console.error('Uncaught error:', ev.error || ev.message || ev); showToast('Errore JS: ' + (ev.message || 'vedi console')); } catch(e){}
});
window.addEventListener('unhandledrejection', function(ev){
  try { console.error('Unhandled rejection:', ev.reason); showToast('Promise rejection: vedi console'); } catch(e){}
});

updateCtxBar();
toggleRightPanelVisibility();
// Delegated handler for "Altri Canali" buttons
document.addEventListener('click', function(ev){
  try {
    var btn = ev.target.closest && ev.target.closest('.btn-altri');
    if (btn) {
      try{
        console.log('ALTRI CANALI click', btn);
        var iso = btn.getAttribute('data-iso');
        var baseCh = btn.getAttribute('data-ch') || (S.wCh || 'Rai 1');
        var progTime = btn.getAttribute('data-time') || '20:30';
        var progEnd = btn.getAttribute('data-end') || '23:30';
        // Extra validation
        if (!progTime || progTime.indexOf(':') < 0) progTime = '20:30';
        if (!progEnd || progEnd.indexOf(':') < 0) progEnd = '23:30';
        console.log('Time slot:', progTime, '-', progEnd);
        var tr = btn.closest('tr');
        var dayIndex = computeDayIndexFromISO(iso);
        var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
        renderT4ChannelPanel(iso, dayIndex, baseCh, hasActuals, tr, progTime, progEnd);
      }catch(e){ console.error('Errore show altri canali', e); }
      return;
    }
  } catch(e) { console.error(e); }
});

// close modal on Escape
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { var tr = document.getElementById('t4-panel-tr'); if (tr) { tr.remove(); t4OpenPanelId = null; document.querySelectorAll('.btn-altri, .btnChannels').forEach(b => b.classList.remove('active')); } } });


renderWeeklySchedule();