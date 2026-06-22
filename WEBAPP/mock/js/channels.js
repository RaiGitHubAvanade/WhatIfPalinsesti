function isRaiChannel(ch) { return typeof ch === 'string' && ch.toLowerCase().indexOf('rai') === 0; }

/* --- Tab4: panel "Altri canali" (replica esatta del mockup) --- */
// Programmazione competitor per giorno settimana (0=Dom,1=Lun,...,6=Sab), fascia 20:30-23:30
const t4OtherChannels = {
  'Canale 5': { schedule: {
    0: [{title:'Paperissima Sprint',time:'20:40',end:'21:40'},{title:"C'è Posta per Te",time:'21:40',end:'01:00'}],
    1: [{title:'Striscia la Notizia',time:'20:35',end:'21:35'},{title:'Grande Fratello',time:'21:35',end:'00:30'}],
    2: [{title:'Striscia la Notizia',time:'20:35',end:'21:35'},{title:"L'Isola dei Famosi",time:'21:35',end:'00:45'}],
    3: [{title:'Striscia la Notizia',time:'20:35',end:'21:35'},{title:'Temptation Island',time:'21:35',end:'00:20'}],
    4: [{title:'Striscia la Notizia',time:'20:35',end:'21:35'},{title:'Grande Fratello',time:'21:35',end:'00:30'}],
    5: [{title:'Striscia la Notizia',time:'20:35',end:'21:35'},{title:'Amici – Serata',time:'21:35',end:'23:45'}],
    6: [{title:'Paperissima Sprint',time:'20:40',end:'21:40'},{title:"C'è Posta per Te",time:'21:40',end:'01:15'}]
  }},
  'Italia 1': { schedule: {
    0: [{title:'Dragon Ball Super',time:'20:30',end:'21:25'},{title:'Battiti Live',time:'21:25',end:'23:30'}],
    1: [{title:'TGCom 24',time:'20:30',end:'21:10'},{title:'Le Iene',time:'21:10',end:'00:00'}],
    2: [{title:'TGCom 24',time:'20:30',end:'21:10'},{title:'Le Iene',time:'21:10',end:'00:00'}],
    3: [{title:'TGCom 24',time:'20:30',end:'21:15'},{title:'Freedom – Oltre il confine',time:'21:15',end:'23:40'}],
    4: [{title:'TGCom 24',time:'20:30',end:'21:10'},{title:'Le Iene',time:'21:10',end:'00:00'}],
    5: [{title:'TGCom 24',time:'20:30',end:'21:15'},{title:'Film: Fast & Furious',time:'21:15',end:'23:50'}],
    6: [{title:'NCIS',time:'20:30',end:'21:25'},{title:'NCIS – 2ª puntata',time:'21:25',end:'23:15'}]
  }},
  'Rete 4': { schedule: {
    0: [{title:'TG 4',time:'20:30',end:'21:05'},{title:'Stasera Italia Speciale',time:'21:05',end:'23:15'}],
    1: [{title:'Stasera Italia',time:'20:30',end:'21:20'},{title:'Quarta Repubblica',time:'21:20',end:'23:45'}],
    2: [{title:'Stasera Italia',time:'20:30',end:'21:20'},{title:'Fuori dal Coro',time:'21:20',end:'23:50'}],
    3: [{title:'Stasera Italia',time:'20:30',end:'21:20'},{title:'Dritto e Rovescio',time:'21:20',end:'23:50'}],
    4: [{title:'Stasera Italia',time:'20:30',end:'21:20'},{title:'Quarta Repubblica',time:'21:20',end:'23:40'}],
    5: [{title:'Stasera Italia',time:'20:30',end:'21:15'},{title:'Quarto Grado',time:'21:15',end:'00:15'}],
    6: [{title:'TG 4',time:'20:30',end:'21:05'},{title:'Zona Bianca',time:'21:05',end:'23:30'}]
  }},
  'La7': { schedule: {
    0: [{title:'TG La7',time:'20:30',end:'21:00'},{title:'Speciale TG La7',time:'21:00',end:'23:00'}],
    1: [{title:'TG La7',time:'20:30',end:'21:00'},{title:"L'Aria che Tira – Sera",time:'21:00',end:'23:00'}],
    2: [{title:'TG La7',time:'20:30',end:'21:00'},{title:'DiMartedì',time:'21:00',end:'00:30'}],
    3: [{title:'TG La7',time:'20:30',end:'21:00'},{title:'Otto e Mezzo Speciale',time:'21:00',end:'23:00'}],
    4: [{title:'TG La7',time:'20:30',end:'21:00'},{title:'Piazzapulita',time:'21:00',end:'00:00'}],
    5: [{title:'TG La7',time:'20:30',end:'21:00'},{title:'Propaganda Live',time:'21:00',end:'01:00'}],
    6: [{title:'TG La7',time:'20:30',end:'21:00'},{title:'In Onda',time:'21:00',end:'23:00'}]
  }},
  'TV8': { schedule: {
    0: [{title:'Alessandro Borghese 4 Ristoranti',time:'21:15',end:'23:15'}],
    1: [{title:'Quattro Ristoranti',time:'21:15',end:'23:10'}],
    2: [{title:'Bruno Barbieri 4 Hotel',time:'21:20',end:'23:20'}],
    3: [{title:'Quattro Ristoranti',time:'21:15',end:'23:10'}],
    4: [{title:'Alessandro Borghese 4 Ristoranti',time:'21:15',end:'23:15'}],
    5: [{title:'MasterChef Replica',time:'21:15',end:'23:45'}],
    6: [{title:'Bruno Barbieri 4 Hotel',time:'21:20',end:'23:20'}]
  }},
  'Nove': { schedule: {
    0: [{title:'Little Big Italy',time:'21:30',end:'23:00'}],
    1: [{title:'Deal With It – Stai al gioco',time:'21:25',end:'23:10'}],
    2: [{title:'I Migliori Anni',time:'21:20',end:'23:30'}],
    3: [{title:'Camionisti in Trattoria',time:'21:30',end:'23:00'}],
    4: [{title:'Little Big Italy',time:'21:30',end:'23:00'}],
    5: [{title:'Che Tempo Che Fa',time:'20:00',end:'23:45'}],
    6: [{title:'I Migliori Anni',time:'21:20',end:'23:30'}]
  }}
};

const t4RaiChannels = ['Rai 1','Rai 2','Rai 3'];
const t4CompChannels = ['Canale 5','Italia 1','Rete 4','La7','TV8','Nove'];
let t4OpenPanelId = null;

// Restituisce array di {title,time,end} per un canale e una data ISO
function getT4ChannelPrograms(ch, iso){
  try{
    var dayOfWeek = iso ? new Date(iso + 'T00:00:00').getDay() : new Date().getDay();
    // Per i canali RAI usa DAY_SCHED
    if (typeof DAY_SCHED !== 'undefined' && DAY_SCHED[ch] && DAY_SCHED[ch][dayOfWeek] && DAY_SCHED[ch][dayOfWeek].length > 0) {
      return DAY_SCHED[ch][dayOfWeek].map(function(p){ return {title:p.title, time:p.time, end:p.end}; });
    }
    // Per i competitor usa t4OtherChannels.schedule
    var data = t4OtherChannels[ch];
    if (data && data.schedule && data.schedule[dayOfWeek] && data.schedule[dayOfWeek].length > 0) {
      return data.schedule[dayOfWeek];
    }
    // Fallback: titolo generico
    return [{title: ch + ' Programma', time:'20:30', end:'23:30'}];
  }catch(e){ return [{title: ch + ' Programma', time:'20:30', end:'23:30'}]; }
}

function computeDayIndexFromISO(iso){
  try{
    if (!iso) return 0;
    const start = new Date((S.weekStartISO || formatDateToISOLocal(new Date())) + 'T00:00:00');
    const d = new Date(iso + 'T00:00:00');
    const diff = Math.round((d - start) / (24*3600*1000));
    return (diff >=0 && diff < 7) ? diff : 0;
  }catch(e){return 0}
}

// deterministic hash -> integer
function hashCode(s){
  var h = 0; if (!s) return 0;
  for (var i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
  return h >>> 0;
}

// small deterministic PRNG from seed
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getT4ChannelData(channel, dayIndex, hasActuals){
  const data = t4OtherChannels[channel];
  if (!data) return null;
  const idx = ((dayIndex % data.titles.length) + data.titles.length) % data.titles.length;
  const rng = mulberry32(hashCode(`t4ch|${channel}|${dayIndex}`));
  const shareAvail = hasActuals && rng() > 0.25;
  const share = shareAvail ? Number((data.share[idx] + (rng()*2-1)).toFixed(1)) : null;
  return { title: data.titles[idx], share };
}

// escape HTML for safe insertion
function escapeHtml(str){
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Check if two time slots overlap with minimum threshold
function timeSlotsOverlap(start1, end1, start2, end2){
  try{
    // Validate inputs
    if (!start1 || !end1 || !start2 || !end2) return true; // show all if invalid
    if (String(start1).indexOf(':') < 0 || String(end1).indexOf(':') < 0 || 
        String(start2).indexOf(':') < 0 || String(end2).indexOf(':') < 0) return true;
    
    var toMins = function(hm){ 
      var a = String(hm||'00:00').split(':'); 
      var h = parseInt(a[0]||0, 10);
      var m = parseInt(a[1]||0, 10);
      return h*60 + m;
    };
    var s1 = toMins(start1); var e1 = toMins(end1);
    var s2 = toMins(start2); var e2 = toMins(end2);
    // handle midnight crossing (e.g., end time 01:00 means next day)
    if (e1 < s1) e1 += 24*60;
    if (e2 < s2) e2 += 24*60;
    
    // Calculate overlap duration
    var overlapStart = Math.max(s1, s2);
    var overlapEnd = Math.min(e1, e2);
    var overlapMins = Math.max(0, overlapEnd - overlapStart);
    
    // Require at least 30 minutes of overlap OR at least 50% of the shorter program
    var dur1 = e1 - s1;
    var dur2 = e2 - s2;
    var minDur = Math.min(dur1, dur2);
    var minOverlap = Math.max(30, minDur * 0.5); // at least 30 mins or 50% of shorter program
    
    var overlaps = overlapMins >= minOverlap;
    return overlaps;
  }catch(e){ 
    console.error('timeSlotsOverlap error:', e, {start1:start1, end1:end1, start2:start2, end2:end2});
    return true; // fallback: show all if error
  }
}

// Filter programs by time slot overlap
function filterProgramsByTimeSlot(programs, targetStart, targetEnd){
  if (!programs || !programs.length) return programs;
  // Use default prime time slot if times are missing or invalid
  var start = (targetStart && String(targetStart).indexOf(':') > 0) ? targetStart : '20:30';
  var end = (targetEnd && String(targetEnd).indexOf(':') > 0) ? targetEnd : '23:30';
  console.log('filterProgramsByTimeSlot', {targetStart: targetStart, targetEnd: targetEnd, start: start, end: end, programsCount: programs.length});
  var filtered = programs.filter(function(p){
    var overlaps = timeSlotsOverlap(start, end, p.time||'20:30', p.end||'23:30');
    var emoji = overlaps ? '✅ SHOW' : '❌ HIDE';
    console.log('  - ' + (p.title||'?') + ' ' + (p.time||'?') + '-' + (p.end||'?') + ': ' + emoji);
    return overlaps;
  });
  console.log('filterProgramsByTimeSlot result: ' + filtered.length + ' programs (from ' + programs.length + ')');
  return filtered;
}

function renderT4ChannelPanel(rowId, dayIndex, currentChannel, hasActuals, anchorTr, progTime, progEnd){
  try{
    // Ensure we have valid time values
    progTime = (progTime && String(progTime).indexOf(':') > 0) ? progTime : '20:30';
    progEnd = (progEnd && String(progEnd).indexOf(':') > 0) ? progEnd : '23:30';
    console.log('renderT4ChannelPanel called', {rowId: rowId, dayIndex: dayIndex, currentChannel: currentChannel, hasActuals: hasActuals, anchorExists: !!anchorTr, progTime: progTime, progEnd: progEnd});
    // remove existing panel
    const existing = document.getElementById('t4-panel-tr');
    if (!existing && t4OpenPanelId === rowId) {
      // stale state: panel was removed previously but id remained
      t4OpenPanelId = null;
    }
    if (existing) existing.remove();

    if (t4OpenPanelId === rowId){
      t4OpenPanelId = null;
      document.querySelectorAll('.btnChannels').forEach(b => b.classList.remove('active'));
      return;
    }
    t4OpenPanelId = rowId;
    document.querySelectorAll('.btnChannels, .btn-altri').forEach(b => b.classList.remove('active'));
    if (anchorTr) {
      anchorTr.querySelector('.btnChannels')?.classList.add('active');
      anchorTr.querySelector('.btn-altri')?.classList.add('active');
    }

    const allChannels = [
      ...t4RaiChannels.filter(c => c !== currentChannel).map(c => ({ ch:c, isRai:true })),
      ...t4CompChannels.map(c => ({ ch:c, isRai:false }))
    ];
    var _cwm = formatDateToISOLocal(getWeekMonday(new Date()));
    var isPastWeek = (S.weekStartISO && S.weekStartISO < _cwm);
    var _raiBase = {'Rai 1':20.5,'Rai 2':8.2,'Rai 3':9.4};

    const cards = allChannels.map(({ch, isRai}) => {
      var progs = getT4ChannelPrograms(ch, rowId);
      console.log('Channel ' + ch + ' before filter: ' + (progs ? progs.length : 0) + ' programs');
      // Filter by time slot overlap with selected program
      progs = filterProgramsByTimeSlot(progs, progTime, progEnd);
      console.log('Channel ' + ch + ' after filter: ' + (progs ? progs.length : 0) + ' programs');
      if (!progs || !progs.length) return '';
      var progsHtml = progs.map(function(p){
        var shareInline = '';
        if (isRai && isPastWeek) {
          var _b = _raiBase[ch] || 8.0;
          var _v = Number((_b + (mulberry32(hashCode('pp|' + ch + '|' + p.time))() * 3 - 1.5)).toFixed(1));
          shareInline = '<span class="t4InlineShare">' + _v + '%</span>';
        }
        return '<div class="t4ChProgram"><span class="t4ChTime">' + escapeHtml(p.time) + '\u2013' + escapeHtml(p.end) + '</span>' + escapeHtml(p.title) + shareInline + '</div>';
      }).join('');
      return '<div class="t4ChannelCard ' + (isRai ? 'isRai' : 'isComp') + '">'
        + '<div class="t4ChName">' + escapeHtml(ch) + (isRai ? ' · RAI' : ' · Competitor') + '</div>'
        + '<div class="t4ChPrograms">' + progsHtml + '</div>'
        + '</div>';
    }).join('');

    var slotLabel = (progTime && progEnd) ? (progTime + '–' + progEnd) : '20:30–23:30';
    const panelTr = document.createElement('tr');
    panelTr.className = 't4PanelRow';
    panelTr.id = 't4-panel-tr';
    panelTr.innerHTML = '<td colspan="8">'
      + '<div class="t4ChannelPanel" id="t4-channel-panel">'
      + '<h4>📺 Palinsesto altri canali – fascia oraria selezionata (' + slotLabel + ')'
      + '<button class="t4CloseBtn" id="t4PanelClose" type="button">×</button>'
      + '</h4>'
      + '<div style="font-size:11px;color:var(--muted);font-weight:800;margin-bottom:10px">'
      + (hasActuals ? 'Dati Auditel disponibili (alcuni potrebbero mancare)' : 'Dati Auditel non disponibili · Previsione non disponibile per altri canali')
      + '</div>'
      + '<div class="t4ChannelGrid">' + cards + '</div>'
      + '</div>'
      + '</td>';

    if (anchorTr) anchorTr.insertAdjacentElement('afterend', panelTr);
    else {
      // fallback: open modal when we cannot insert panel into table
      console.warn('renderT4ChannelPanel: anchorTr not provided, opening modal fallback');
      openAltriCanaliModal(rowId, currentChannel, hasActuals, progTime, progEnd);
      return;
    }

    panelTr.querySelector('#t4PanelClose')?.addEventListener('click', ()=>{
      panelTr.remove(); t4OpenPanelId = null; document.querySelectorAll('.btnChannels, .btn-altri').forEach(b => b.classList.remove('active'));
    });
  }catch(e){ console.error('renderT4ChannelPanel error', e); showToast('Errore render pannello (vedi console)'); }
}

// Backwards-compatible wrapper used by inline buttons
function showOtherChannels(iso, baseCh, el){
  try{
    console.log('showOtherChannels wrapper', iso, baseCh, el);
    var ch = baseCh || (S.wCh || 'Rai 1');
    var tr = el && el.closest ? el.closest('tr') : document.querySelector('tr[data-iso="'+iso+'"]') || document.querySelector('#pw-table tbody tr');
    var dayIndex = computeDayIndexFromISO(iso);
    var hasActuals = Array.from(document.querySelectorAll('#pw-table .real-cell')).some(function(td){ return td && td.textContent && td.textContent.trim() !== '—'; });
    // Try to get time slot from button or row
    var progTime = '20:30'; var progEnd = '23:30';
    try{
      var btn = (el && el.classList && el.classList.contains('btn-altri')) ? el : (tr ? tr.querySelector('.btn-altri') : null);
      if (btn) { progTime = btn.getAttribute('data-time') || '20:30'; progEnd = btn.getAttribute('data-end') || '23:30'; }
    }catch(e){}
    // Prefer inline panel when an anchor row exists; otherwise open modal
    try {
      if (tr) {
        renderT4ChannelPanel(iso, dayIndex, ch, hasActuals, tr, progTime, progEnd);
      } else {
        openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd);
      }
    } catch(e){ console.error('showOtherChannels open fallback failed', e); try{ openAltriCanaliModal(iso, ch, hasActuals, progTime, progEnd); }catch(_){} }
  }catch(e){ console.error('showOtherChannels error', e); }
}

// Open modal fallback for Altri Canali
function openAltriCanaliModal(iso, currentChannel, hasActuals, progTime, progEnd){
  try{
    // Ensure we have valid time values
    progTime = (progTime && String(progTime).indexOf(':') > 0) ? progTime : '20:30';
    progEnd = (progEnd && String(progEnd).indexOf(':') > 0) ? progEnd : '23:30';
    console.log('openAltriCanaliModal', {iso: iso, currentChannel: currentChannel, hasActuals: hasActuals, progTime: progTime, progEnd: progEnd});
    var modal = document.getElementById('modal-altri');
    var backdrop = document.getElementById('modal-backdrop');
    var body = document.getElementById('modal-body');
    var title = document.getElementById('modal-title');
    var dayEl = document.getElementById('modal-day');
    if (!modal || !body) return console.warn('openAltriCanaliModal: modal elements missing');
    // Ensure any inline panel is removed so we don't show both inline panel + modal
    try {
      var existing = document.getElementById('t4-panel-tr');
      if (existing) existing.remove();
      t4OpenPanelId = null;
      document.querySelectorAll('.btnChannels, .btn-altri').forEach(function(b){ b.classList.remove('active'); });
    } catch(e) { /* ignore */ }
    
    // Check if we're viewing a past week (to show share badges for RAI)
    var currentWeekMonday = formatDateToISOLocal(getWeekMonday(new Date()));
    var isPastWeek = (S.weekStartISO && S.weekStartISO < currentWeekMonday);
    
    // build cards similar to renderT4ChannelPanel
    var allChannels = [
      ...t4RaiChannels.filter(c => c !== currentChannel).map(c => ({ ch:c, isRai:true })),
      ...t4CompChannels.map(c => ({ ch:c, isRai:false }))
    ];
    var dayIndex = computeDayIndexFromISO(iso);
    var _raiBase = {'Rai 1':20.5,'Rai 2':8.2,'Rai 3':9.4};
    var cards = allChannels.map(function(obj){
      var ch = obj.ch; var isRai = obj.isRai;
      var progs = getT4ChannelPrograms(ch, iso);
      console.log('Modal - Channel ' + ch + ' before filter: ' + (progs ? progs.length : 0) + ' programs');
      // Filter by time slot overlap with selected program
      progs = filterProgramsByTimeSlot(progs, progTime, progEnd);
      console.log('Modal - Channel ' + ch + ' after filter: ' + (progs ? progs.length : 0) + ' programs');
      if (!progs || !progs.length) return '';
      var progsHtml = progs.map(function(p){
        var shareInline = '';
        if (isRai && isPastWeek) {
          var _b = _raiBase[ch] || 8.0;
          var _v = Number((_b + (mulberry32(hashCode('pp|' + ch + '|' + p.time))() * 3 - 1.5)).toFixed(1));
          shareInline = '<span class="t4InlineShare">' + _v + '%</span>';
        }
        return '<div class="t4ChProgram"><span class="t4ChTime">' + escapeHtml(p.time) + '\u2013' + escapeHtml(p.end) + '</span>' + escapeHtml(p.title) + shareInline + '</div>';
      }).join('');
      return '<div class="t4ChannelCard ' + (isRai? 'isRai':'isComp') + '"><div class="t4ChName">' + escapeHtml(ch) + (isRai? ' · RAI':' · Competitor') + '</div>' +
             '<div class="t4ChPrograms">' + progsHtml + '</div>' + '</div>';
    }).join('');
    var slotLabel = (progTime && progEnd) ? (progTime + '–' + progEnd) : '20:30–23:30';
    var chosenDate = fmtDate(iso || S.weekStartISO);
    body.innerHTML = '<div style="margin-bottom:8px;font-weight:600;color:var(--muted);">Canale: ' + escapeHtml(currentChannel) + ' · Fascia: ' + slotLabel + ' · Data: ' + escapeHtml(chosenDate) + '</div>' +
             '<div class="t4ChannelGrid">' + cards + '</div>';
    if (title) title.textContent = '📺 Programmazione Altri Canali';
    if (dayEl) dayEl.textContent = '';
    modal.style.display = 'block'; backdrop.style.display = 'block';
    // wire close: also clear inline panel state and remove any stray panel rows
    var closeBtn = document.getElementById('modal-close'); if (closeBtn) { closeBtn.onclick = function(){
      modal.style.display='none'; backdrop.style.display='none';
      try{ var t = document.getElementById('t4-panel-tr'); if (t) t.remove(); } catch(e){}
      try{ t4OpenPanelId = null; document.querySelectorAll('.btnChannels, .btn-altri').forEach(b => b.classList.remove('active')); } catch(e){}
    }; }
    backdrop.onclick = function(){ modal.style.display='none'; backdrop.style.display='none'; try{ var t = document.getElementById('t4-panel-tr'); if (t) t.remove(); }catch(e){} try{ t4OpenPanelId = null; document.querySelectorAll('.btnChannels, .btn-altri').forEach(b => b.classList.remove('active')); }catch(e){} };
  }catch(e){ console.error('openAltriCanaliModal error', e); }
}
