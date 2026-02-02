const tiasKey = 'tiasList'

function $(id){return document.getElementById(id)}

function loadTias(){
  try{ return JSON.parse(localStorage.getItem(tiasKey))||[] }catch(e){return[]}
}
function saveTias(list){localStorage.setItem(tiasKey,JSON.stringify(list))}

function loadAssignments(monthKey){
  const raw = localStorage.getItem('escala-'+monthKey)
  return raw?JSON.parse(raw):{}
}
function saveAssignments(monthKey,obj){localStorage.setItem('escala-'+monthKey,JSON.stringify(obj))}

function pad(n){return n.toString().padStart(2,'0')}

function monthKeyFromDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}`}

function getSelectedMonthValue(){
  const monthSelect = $('monthSelect'), yearSelect = $('yearSelect')
  if(!monthSelect || !yearSelect) return ''
  const m = Number(monthSelect.value)
  const y = Number(yearSelect.value)
  if(!m || !y) return ''
  return `${y}-${pad(m)}`
}

function formatDateKey(year,month,day){return `${year}-${pad(month)}-${pad(day)}`}

function renderTias(){
  const list = loadTias()
  const ul = $('tiasList'); ul.innerHTML=''
  list.forEach((t,idx)=>{
    const li=document.createElement('li')
    const nameSpan=document.createElement('span'); nameSpan.className='tia-name'; nameSpan.textContent=t
    li.appendChild(nameSpan)
    const btn=document.createElement('button'); btn.textContent='Remover'; btn.type='button'
    btn.onclick=()=>{ removeTia(idx) }
    li.appendChild(btn)
    ul.appendChild(li)
  })
}

function addTia(name){
  const list = loadTias(); list.push(name); saveTias(list); renderTias(); renderCalendar()
}

function removeTia(idx){
  const list = loadTias(); const name = list[idx]
  if(!confirm(`Remover ${name}?`))return
  list.splice(idx,1); saveTias(list);

  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i)
    if(k && k.startsWith('escala-')){
      const obj = JSON.parse(localStorage.getItem(k)||'{}')
      let changed=false
      for(const a in obj) if(obj[a]===name){ delete obj[a]; changed=true }
      if(changed) localStorage.setItem(k,JSON.stringify(obj))
    }
  }
  renderTias(); renderCalendar()
}

function init(){
  const form = $('tiaForm'), input=$('tiaName')
  form.addEventListener('submit',e=>{e.preventDefault(); if(input.value.trim()){addTia(input.value.trim()); input.value=''}})

  const yearSelect = $('yearSelect')
  if(yearSelect){
    const currentYear = new Date().getFullYear()
    for(let y = currentYear - 1; y <= currentYear + 10; y++){
      const opt = document.createElement('option'); opt.value = y; opt.textContent = y; yearSelect.appendChild(opt)
    }
    yearSelect.value = currentYear
  }
  const monthSelect = $('monthSelect')
  if(monthSelect) monthSelect.value = new Date().getMonth() + 1
  monthSelect?.addEventListener('change', renderCalendar)
  yearSelect?.addEventListener('change', renderCalendar)

  $('saveAssign').addEventListener('click', saveAssign)
  $('cancelAssign').addEventListener('click', closeModal)
  $('clearAssign').addEventListener('click', clearAssign)

  const exportBtn = document.getElementById('exportPdf')
  if(exportBtn) exportBtn.addEventListener('click', exportPdf)

  const btnMenu = document.getElementById('btnMenu')
  const sidebar = document.getElementById('sidebar')
  const sidebarOverlay = document.getElementById('sidebarOverlay')
  function closeSidebar(){
    if(!sidebar) return
    sidebar.classList.remove('is-open')
    if(sidebarOverlay) sidebarOverlay.classList.remove('is-visible')
    if(btnMenu){ btnMenu.setAttribute('aria-expanded', 'false'); btnMenu.setAttribute('aria-label', 'Abrir menu') }
  }
  function openSidebar(){
    sidebar.classList.add('is-open')
    if(sidebarOverlay) sidebarOverlay.classList.add('is-visible')
    if(btnMenu){ btnMenu.setAttribute('aria-expanded', 'true'); btnMenu.setAttribute('aria-label', 'Fechar menu') }
  }
  if(btnMenu && sidebar){
    btnMenu.addEventListener('click', ()=>{
      if(sidebar.classList.contains('is-open')) closeSidebar()
      else openSidebar()
    })
  }
  if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar)


  const modalBackdrop = document.getElementById('modalBackdrop')
  if(modalBackdrop) modalBackdrop.addEventListener('click', closeModal)

  renderTias(); renderCalendar()
}

function renderCalendar(){
  const value = getSelectedMonthValue()
  if(!value) return
  const [y,m] = value.split('-').map(Number)
  const calendar = $('calendar'); calendar.innerHTML=''
  const label = new Date(y,m-1,1).toLocaleString('pt-BR',{month:'long',year:'numeric'})
  $('currentMonthLabel').textContent = label.charAt(0).toUpperCase()+label.slice(1)

  const first = new Date(y,m-1,1)
  const lastDay = new Date(y,m,0).getDate()
  const monthKey = `${y}-${pad(m)}`
  const assignments = loadAssignments(monthKey)

  for(let day=1; day<=lastDay; day++){
    const d = new Date(y,m-1,day)
    const weekday = d.getDay()
    if(![0,1,3,5].includes(weekday)) continue

    const card = document.createElement('div'); card.className='day-card'
    const header = document.createElement('div'); header.className='day-header'
    const dn = document.createElement('div'); dn.className='day-number'; dn.textContent = day
    const wd = document.createElement('div'); wd.className='day-week'; wd.textContent = d.toLocaleDateString('pt-BR',{weekday:'long'}).replace(/^\w/, c => c.toUpperCase())
    header.appendChild(dn); header.appendChild(wd)
    card.appendChild(header)

    const slots = document.createElement('div'); slots.className='slots' + (weekday===0 ? ' slots-domingo' : '')
    const times = (weekday===0)?['08:00','18:00']:['20:00']
    times.forEach(time=>{
      const key = `${formatDateKey(y,m,day)}|${time}`
      const btn = document.createElement('button'); btn.className='slot' + (weekday===0 ? ' slot-domingo' : '')
      const ass = assignments[key]
      const label = (weekday===0 && time==='18:00') ? '18h' : (weekday===0 ? '8h' : time)
      btn.innerHTML = `<span class="time">${label}</span> <span class="name">${ass?ass:'—'}</span>`
      if(!ass) btn.classList.add('empty')
      btn.onclick = ()=> openModal(key, y, m, day, time)
      slots.appendChild(btn)
    })

    card.appendChild(slots)
    calendar.appendChild(card)
  }
}

let currentAssignKey = null, currentMonthKey = null

function openModal(key, year, month, day, time){
  currentAssignKey = key
  currentMonthKey = `${year}-${pad(month)}`
  const modal = $('assignModal'); modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false')
  const dayStr = new Date(year, month - 1, day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  $('modalTitle').textContent = `${dayStr} — ${time}`
  const select = $('tiaSelect'); select.innerHTML=''
  const tias = loadTias()
  const emptyOpt = document.createElement('option'); emptyOpt.value=''; emptyOpt.textContent='— Selecione uma tia —'; select.appendChild(emptyOpt)
  tias.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; select.appendChild(o) })
  const assignments = loadAssignments(currentMonthKey)
  const cur = assignments[key]
  if(cur) select.value = cur
  select.focus()
}

function closeModal(){ const m = $('assignModal'); m.classList.add('hidden'); m.setAttribute('aria-hidden', 'true'); currentAssignKey=null }

function saveAssign(){
  const sel = $('tiaSelect').value
  if(!currentAssignKey) return closeModal()
  const obj = loadAssignments(currentMonthKey)
  if(sel) obj[currentAssignKey]=sel
  else delete obj[currentAssignKey]
  saveAssignments(currentMonthKey,obj)
  closeModal(); renderCalendar()
}

function clearAssign(){
  if(!currentAssignKey) return closeModal()
  const obj = loadAssignments(currentMonthKey)
  delete obj[currentAssignKey]
  saveAssignments(currentMonthKey,obj)
  closeModal(); renderCalendar()
}

function exportPdf(){
  const value = getSelectedMonthValue()
  if(!value){ alert('Selecione um mês primeiro.'); return }
  const [y,m] = value.split('-').map(Number)
  const monthKey = `${y}-${pad(m)}`
  const assignments = loadAssignments(monthKey)
  const monthName = new Date(y,m-1,1).toLocaleString('pt-BR',{month:'long',year:'numeric'})
  const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  if(typeof window.jspdf === 'undefined'){ fallbackPrintPdf(monthNameCap, y, m, assignments); return }

  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15
  let yPos = 14

  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('Escala Mensal — EBI', margin, yPos)
  yPos += 8
  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.text(monthNameCap, margin, yPos)
  yPos += 10

  const tableData = []
  for(let day=1; day<=new Date(y,m,0).getDate(); day++){
    const d = new Date(y,m-1,day)
    const weekday = d.getDay()
    if(![0,1,3,5].includes(weekday)) continue
    const dayStr = d.toLocaleDateString('pt-BR',{weekday:'long'})
    if(weekday === 0){
      const name8 = assignments[`${formatDateKey(y,m,day)}|08:00`] || '—'
      const name18 = assignments[`${formatDateKey(y,m,day)}|18:00`] || '—'
      tableData.push([ `${pad(day)}/${pad(m)}`, dayStr, '08:00 e 18:00', `8h: ${name8} — 18h: ${name18}` ])
    } else {
      const time = '20:00'
      const key = `${formatDateKey(y,m,day)}|${time}`
      const name = assignments[key] || '—'
      tableData.push([ `${pad(day)}/${pad(m)}`, dayStr, time, name ])
    }
  }

  const colData = 24
  const colDia = 44
  const colHora = 20
  const colResp = pageW - margin * 2 - colData - colDia - colHora
  doc.autoTable({
    head: [['Data', 'Dia', 'Horário', 'Responsável']],
    body: tableData,
    startY: yPos,
    margin: { left: margin, right: margin },
    tableWidth: pageW - margin * 2,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 11 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: colData },
      1: { cellWidth: colDia, fontStyle: 'bold', fontSize: 10 },
      2: { cellWidth: colHora },
      3: { cellWidth: colResp, fontStyle: 'bold', fontSize: 10 }
    }
  })

  const fileName = `Escala-EBI-${y}-${pad(m)}.pdf`
  doc.save(fileName)
}

function fallbackPrintPdf(monthNameCap, y, m, assignments){
  let rows = ''
  for(let day=1; day<=new Date(y,m,0).getDate(); day++){
    const d = new Date(y,m-1,day)
    const weekday = d.getDay()
    if(![0,1,3,5].includes(weekday)) continue
    const dayStr = d.toLocaleDateString('pt-BR',{weekday:'long'})
    if(weekday === 0){
      const name8 = assignments[`${formatDateKey(y,m,day)}|08:00`] || '—'
      const name18 = assignments[`${formatDateKey(y,m,day)}|18:00`] || '—'
      rows += `<tr><td>${day}/${pad(m)}/${y}</td><td>${dayStr}</td><td>08:00 e 18:00</td><td>8h: ${name8} — 18h: ${name18}</td></tr>`
    } else {
      const name = assignments[`${formatDateKey(y,m,day)}|20:00`] || ''
      rows += `<tr><td>${day}/${pad(m)}/${y}</td><td>${dayStr}</td><td>20:00</td><td>${name}</td></tr>`
    }
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Escala - ${monthNameCap}</title><style>body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#111}h1{font-size:22px;margin:0 0 8px}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{padding:10px 12px;border:1px solid #ddd;text-align:left}th{background:#2563eb;color:#fff}</style></head><body><h1>Escala Mensal — EBI</h1><p><strong>${monthNameCap}</strong></p><table><thead><tr><th>Data</th><th>Dia</th><th>Horário</th><th>Responsável</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
  const win = window.open('','_blank')
  if(!win){ alert('Não foi possível abrir a janela. Verifique bloqueadores de pop-up.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(()=>{ win.print() }, 500)
}

document.addEventListener('DOMContentLoaded', init)
