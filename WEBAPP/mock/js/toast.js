/* ================================================================
   TOAST + HELP
================================================================ */
function showToast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 3000); }
function showHelp() { showToast('ℹ️ Scegli Sostituzione o Spostamento, segui i passi, poi salva in Risultato Simulazione.'); }


/* ================================================================
   RIGHT PANEL VISIBILITY
================================================================ */
function toggleRightPanelVisibility(){
  // Show the right panel only from step 2 onward (mode chosen + program set)
  // Right panel removed from simulation flow — always hidden
  var show = false;
  var rp = document.querySelector('.r-panel');
  var split = document.querySelector('.split');
  if (rp) {
    if (show) { rp.classList.remove('hidden'); rp.style.display = ''; }
    else { rp.classList.add('hidden'); rp.style.display = 'none'; }
  }
  if (split) {
    if (show) split.classList.add('has-panel'); else split.classList.remove('has-panel');
  }
}
