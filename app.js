const STORAGE_KEY = "rutaRentableSessionsV1";

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
function dateOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function timeNow() {
  return new Date().toTimeString().slice(0, 5);
}
function localDateTime(date, time) {
  return new Date(`${date}T${time || "00:00"}:00`);
}
function money(value) {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(Number(value || 0));
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function formatDate(value) {
  return new Intl.DateTimeFormat("es-PA",{day:"2-digit",month:"short",year:"numeric"})
    .format(new Date(`${value}T12:00:00`));
}
function hoursBetween(session) {
  if (!session.endDate || !session.endTime) return 0;
  return Math.max((localDateTime(session.endDate, session.endTime) - localDateTime(session.startDate, session.startTime)) / 3600000, 0);
}
function currentElapsedHours(session) {
  return Math.max((new Date() - localDateTime(session.startDate, session.startTime)) / 3600000, 0);
}
function sessionIncome(session) {
  return Number(session.uberEarnings || 0) + Number(session.indriveEarnings || 0) + Number(session.outsideEarnings || 0);
}
function sessionExpenses(session) {
  return Number(session.startFuel || 0) + Number(session.extraFuel || 0) + Number(session.tolls || 0) + Number(session.otherExpenses || 0);
}
function sessionKm(session) {
  if (session.status !== "closed") return 0;
  return Math.max(Number(session.endKm || 0) - Number(session.startKm || 0), 0);
}
function sessionNet(session) {
  return sessionIncome(session) - sessionExpenses(session);
}
function sessionTrips(session) {
  return Number(session.uberTrips || 0) + Number(session.indriveTrips || 0) + Number(session.outsideTrips || 0);
}

const DEFAULT_STATE = {
  profile: {
    name: "Javier Bonilla",
    minimumHourly: 6,
    minimumPerKm: 0.25
  },
  vehicles: [
    { id: "car-1", name: "Corolla Cross", plate: "Principal", brand: "Toyota", model: "Corolla Cross 2022", currentKm: 111000 }
  ],
  sessions: [
    {
      id: id(), status: "closed", vehicleId: "car-1",
      startDate: dateOffset(-2), startTime: "07:00", endDate: dateOffset(-2), endTime: "14:30",
      startKm: 110820, endKm: 110970, startFuel: 18, extraFuel: 0, dayGoal: 60,
      uberEarnings: 46, uberTrips: 7, indriveEarnings: 28, indriveTrips: 5,
      outsideEarnings: 15, outsideTrips: 1, tolls: 4, otherExpenses: 3,
      startNote: "Turno de la mañana", finishNote: "Buen movimiento"
    },
    {
      id: id(), status: "closed", vehicleId: "car-1",
      startDate: dateOffset(-1), startTime: "08:00", endDate: dateOffset(-1), endTime: "13:45",
      startKm: 110970, endKm: 111000, startFuel: 10, extraFuel: 0, dayGoal: 50,
      uberEarnings: 22, uberTrips: 4, indriveEarnings: 18, indriveTrips: 3,
      outsideEarnings: 0, outsideTrips: 0, tolls: 0, otherExpenses: 2,
      startNote: "Jornada corta", finishNote: ""
    }
  ]
};

let state = loadState();

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}
function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data && Array.isArray(data.sessions) && Array.isArray(data.vehicles) ? data : cloneDefault();
  } catch {
    return cloneDefault();
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function getVehicle(vehicleId) {
  return state.vehicles.find(v => v.id === vehicleId);
}
function getVehicleName(vehicleId) {
  return getVehicle(vehicleId)?.name || "Sin vehículo";
}
function activeSession() {
  return state.sessions.find(s => s.status === "active");
}
function closedSessions() {
  return state.sessions.filter(s => s.status === "closed");
}
function getRange(period) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start = new Date(2000,0,1);
  if (period === "week") {
    const day = end.getDay() || 7;
    start = new Date(end);
    start.setDate(end.getDate() - day + 1);
  } else if (period === "month") {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (period === "year") {
    start = new Date(end.getFullYear(), 0, 1);
  }
  return { start, end };
}
function filteredClosedSessions() {
  const { start, end } = getRange(document.getElementById("periodFilter").value);
  return closedSessions().filter(session => {
    const d = localDateTime(session.endDate || session.startDate, session.endTime || session.startTime);
    return d >= start && d <= new Date(end.getTime() + 86399999);
  });
}
function summary(sessions) {
  return sessions.reduce((a,s) => {
    a.income += sessionIncome(s);
    a.expenses += sessionExpenses(s);
    a.net += sessionNet(s);
    a.km += sessionKm(s);
    a.hours += hoursBetween(s);
    a.trips += sessionTrips(s);
    a.fuel += Number(s.startFuel || 0) + Number(s.extraFuel || 0);
    a.uber += Number(s.uberEarnings || 0);
    a.indrive += Number(s.indriveEarnings || 0);
    a.outside += Number(s.outsideEarnings || 0);
    return a;
  }, { income:0, expenses:0, net:0, km:0, hours:0, trips:0, fuel:0, uber:0, indrive:0, outside:0 });
}
function evaluate(netPerHour, netPerKm, net) {
  const h = Number(state.profile.minimumHourly || 0);
  const k = Number(state.profile.minimumPerKm || 0);
  if (net < 0) return { key:"loss", label:"Pérdida", message:"Los gastos superaron los ingresos. Conviene revisar horarios, distancia y consumo." };
  if (netPerHour >= h * 1.25 && netPerKm >= k * 1.25) return { key:"excellent", label:"Muy rentable", message:"El rendimiento supera ampliamente tus mínimos. Este patrón de trabajo parece conveniente." };
  if (netPerHour >= h && netPerKm >= k) return { key:"good", label:"Rentable", message:"La jornada alcanza tus objetivos mínimos por hora y por kilómetro." };
  return { key:"low", label:"Rentabilidad baja", message:"Hubo ganancia, pero está por debajo de uno o ambos objetivos configurados." };
}

function renderAll() {
  populateVehicles();
  renderProfile();
  renderActiveSession();
  renderDashboard();
  renderSessionsTable();
  renderVehicles();
  renderReports();
  renderSettings();
}
function populateVehicles() {
  const options = state.vehicles.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)}</option>`).join("");
  ["startVehicle"].forEach(id => document.getElementById(id).innerHTML = options || `<option value="">Agrega un vehículo</option>`);
}
function renderProfile() {
  const name = state.profile.name || "Conductor";
  document.getElementById("profileName").textContent = name;
  document.getElementById("avatar").textContent = name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase() || "RR";
}
function renderActiveSession() {
  const panel = document.getElementById("activeSessionPanel");
  const active = activeSession();
  const buttons = [document.getElementById("mainActionButton"), document.getElementById("sessionsActionButton")];

  if (!active) {
    panel.className = "active-session panel empty-state";
    panel.innerHTML = `<div><h2>No hay una jornada activa</h2><p class="muted">Inicia una jornada para registrar kilometraje inicial y gasolina.</p></div>
      <button class="button primary" data-start-session>▶ Iniciar jornada</button>`;
    buttons.forEach(b => b.textContent = "▶ Iniciar jornada");
    return;
  }

  const vehicle = getVehicleName(active.vehicleId);
  const elapsed = currentElapsedHours(active);
  panel.className = "active-session panel running";
  panel.innerHTML = `<div class="active-session-content">
    <div class="active-info"><span class="pulse"></span><div><h2>Jornada en curso</h2><p class="muted">${escapeHtml(vehicle)} · Inició ${formatDate(active.startDate)} a las ${escapeHtml(active.startTime)}</p></div></div>
    <div class="active-metrics">
      <div class="active-metric"><span>Kilometraje inicial</span><strong>${Number(active.startKm).toLocaleString("es-PA")} km</strong></div>
      <div class="active-metric"><span>Gasolina invertida</span><strong>${money(active.startFuel)}</strong></div>
      <div class="active-metric"><span>Tiempo transcurrido</span><strong>${elapsed.toFixed(1)} h</strong></div>
      <button class="button primary" data-finish-session>■ Finalizar jornada</button>
    </div>
  </div>`;
  buttons.forEach(b => b.textContent = "■ Finalizar jornada");
}
function renderDashboard() {
  const sessions = filteredClosedSessions();
  const s = summary(sessions);
  const perKm = s.km ? s.net / s.km : 0;
  const perHour = s.hours ? s.net / s.hours : 0;
  document.getElementById("kpiNet").textContent = money(s.net);
  document.getElementById("kpiIncome").textContent = money(s.income);
  document.getElementById("kpiFuel").textContent = money(s.fuel);
  document.getElementById("kpiKm").textContent = `${s.km.toLocaleString("es-PA")} km`;
  document.getElementById("kpiHours").textContent = `${s.hours.toFixed(1)} h`;
  document.getElementById("kpiPerKm").textContent = money(perKm);
  document.getElementById("kpiPerHour").textContent = `Por hora: ${money(perHour)}`;

  const evaluation = evaluate(perHour, perKm, s.net);
  document.getElementById("profitabilityCard").innerHTML = `<div class="profitability-content">
    <div><h2>¿Vale la pena continuar?</h2><p class="muted">${evaluation.message}</p>
    <p class="muted">Referencia configurada: ${money(state.profile.minimumHourly)}/hora y ${money(state.profile.minimumPerKm)}/km.</p></div>
    <span class="profitability-badge ${evaluation.key}">${evaluation.label}</span>
  </div>`;

  renderSources(s);
  renderChart(sessions);
  renderRecent(sessions);
}
function renderSources(s) {
  const total = s.uber + s.indrive + s.outside;
  const rows = [
    ["Uber", s.uber, "#171717"],
    ["InDrive", s.indrive, "#8bd72e"],
    ["Fuera de aplicaciones", s.outside, "#397cff"]
  ];
  document.getElementById("sourceSummary").innerHTML = rows.map(([name,value,color]) => {
    const pct = total ? Math.round(value/total*100) : 0;
    return `<div class="summary-row"><div class="summary-name"><span class="summary-dot" style="background:${color}"></span>${name}</div>
      <strong>${money(value)} · ${pct}%</strong><div class="summary-bar"><div style="width:${pct}%;background:${color}"></div></div></div>`;
  }).join("");
}
function renderChart(sessions) {
  const rows = [...sessions].sort((a,b) => new Date(a.endDate) - new Date(b.endDate)).slice(-7);
  const max = Math.max(...rows.map(x => Math.abs(sessionNet(x))), 1);
  const chart = document.getElementById("sessionChart");
  if (!rows.length) { chart.innerHTML = `<div class="empty">No hay jornadas cerradas en este periodo.</div>`; return; }
  chart.innerHTML = rows.map(s => {
    const net = sessionNet(s);
    const height = Math.max(Math.abs(net)/max*205,3);
    return `<div class="bar-item"><div class="bar-value">${money(net)}</div><div class="bar ${net<0?"negative":""}" style="height:${height}px"></div>
      <div class="bar-label">${formatDate(s.endDate).slice(0,6)}</div></div>`;
  }).join("");
}
function renderRecent(sessions) {
  const rows = [...sessions].sort((a,b) => new Date(b.endDate) - new Date(a.endDate)).slice(0,5);
  const container = document.getElementById("recentSessions");
  if (!rows.length) { container.innerHTML = `<div class="empty">No hay jornadas finalizadas.</div>`; return; }
  container.innerHTML = rows.map(s => {
    const net = sessionNet(s);
    return `<div class="recent-item"><div class="recent-icon">✓</div>
      <div><strong>${formatDate(s.endDate)} · ${escapeHtml(getVehicleName(s.vehicleId))}</strong>
      <small>${sessionKm(s)} km · ${hoursBetween(s).toFixed(1)} h · ${sessionTrips(s)} viajes</small></div>
      <div class="${net>=0?"positive":"negative"}">${money(net)}</div></div>`;
  }).join("");
}
function renderSessionsTable() {
  const query = (document.getElementById("sessionSearch").value || "").trim().toLowerCase();
  const status = document.getElementById("sessionStatusFilter").value;
  const rows = [...state.sessions]
    .filter(s => status === "all" || s.status === status)
    .filter(s => !query || [getVehicleName(s.vehicleId), s.startNote, s.finishNote, s.startDate].join(" ").toLowerCase().includes(query))
    .sort((a,b) => new Date(`${b.startDate}T${b.startTime}`) - new Date(`${a.startDate}T${a.startTime}`));
  const tbody = document.getElementById("sessionsTable");
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="11" class="empty">No se encontraron jornadas.</td></tr>`; return; }
  tbody.innerHTML = rows.map(s => {
    const closed = s.status === "closed";
    const net = closed ? sessionNet(s) : 0;
    const evalResult = closed ? evaluate(hoursBetween(s)?net/hoursBetween(s):0, sessionKm(s)?net/sessionKm(s):0, net) : null;
    return `<tr>
      <td>${formatDate(s.startDate)}</td>
      <td><span class="badge ${s.status}">${closed?"Finalizada":"Activa"}</span></td>
      <td>${escapeHtml(getVehicleName(s.vehicleId))}</td>
      <td>${Number(s.startKm).toLocaleString("es-PA")}</td>
      <td>${closed?Number(s.endKm).toLocaleString("es-PA"):"—"}</td>
      <td>${closed?sessionKm(s)+" km":"—"}</td>
      <td>${closed?money(sessionIncome(s)):"—"}</td>
      <td>${closed?money(sessionExpenses(s)):money(s.startFuel)}</td>
      <td class="${net>=0?"positive":"negative"}">${closed?money(net):"—"}</td>
      <td>${closed?evalResult.label:"En curso"}</td>
      <td>${closed?`<button class="delete-button" data-delete-session="${s.id}">🗑</button>`:`<button class="text-button" data-finish-session>Finalizar</button>`}</td>
    </tr>`;
  }).join("");
}
function renderVehicles() {
  const grid = document.getElementById("vehicleGrid");
  if (!state.vehicles.length) { grid.innerHTML = `<article class="panel empty">Agrega tu primer vehículo.</article>`; return; }
  grid.innerHTML = state.vehicles.map(v => {
    const sessions = closedSessions().filter(s => s.vehicleId === v.id);
    const s = summary(sessions);
    return `<article class="panel vehicle-card">
      <div class="vehicle-card-header">
        <div>
          <h3>${escapeHtml(v.name)}</h3>
          <p class="vehicle-meta">${escapeHtml([v.brand,v.model,v.plate].filter(Boolean).join(" · "))}</p>
        </div>
        <button class="vehicle-delete-button" data-delete-vehicle="${v.id}" title="Eliminar vehículo" aria-label="Eliminar ${escapeHtml(v.name)}">🗑</button>
      </div>
      <div class="vehicle-stats">
        <div class="vehicle-stat"><span>Kilometraje actual</span><strong>${Number(v.currentKm||0).toLocaleString("es-PA")} km</strong></div>
        <div class="vehicle-stat"><span>Ganancia acumulada</span><strong>${money(s.net)}</strong></div>
        <div class="vehicle-stat"><span>Km trabajados</span><strong>${s.km.toLocaleString("es-PA")} km</strong></div>
        <div class="vehicle-stat"><span>Jornadas</span><strong>${sessions.length}</strong></div>
      </div>
      <div class="vehicle-card-footer">
        <small>${sessions.length ? `${sessions.length} jornada(s) asociada(s)` : "Sin jornadas asociadas"}</small>
      </div>
    </article>`;
  }).join("");
}
function renderReports() {
  const sessions = filteredClosedSessions();
  const s = summary(sessions);
  const labels = { week:"Esta semana", month:"Este mes", year:"Este año", all:"Todo el historial" };
  document.getElementById("reportPeriod").textContent = labels[document.getElementById("periodFilter").value];
  const perHour = s.hours ? s.net/s.hours : 0;
  const perKm = s.km ? s.net/s.km : 0;
  const kpis = [["Ingresos",s.income],["Gastos",s.expenses],["Ganancia neta",s.net],["Por hora",perHour],["Por km",perKm]];
  document.getElementById("reportKpis").innerHTML = kpis.map(([n,v]) => `<div class="report-kpi"><span>${n}</span><strong>${money(v)}</strong></div>`).join("");
  const total = s.income;
  document.getElementById("reportSources").innerHTML = [
    ["Uber",s.uber,sessions.reduce((a,x)=>a+Number(x.uberTrips||0),0)],
    ["InDrive",s.indrive,sessions.reduce((a,x)=>a+Number(x.indriveTrips||0),0)],
    ["Fuera de aplicaciones",s.outside,sessions.reduce((a,x)=>a+Number(x.outsideTrips||0),0)]
  ].map(([n,v,t]) => `<tr><td>${n}</td><td>${t}</td><td>${money(v)}</td><td>${total?Math.round(v/total*100):0}%</td></tr>`).join("");
  document.getElementById("reportSessions").innerHTML = [...sessions].sort((a,b)=>new Date(b.endDate)-new Date(a.endDate)).map(x => {
    const h=hoursBetween(x), km=sessionKm(x), net=sessionNet(x);
    return `<tr><td>${formatDate(x.endDate)}</td><td>${escapeHtml(getVehicleName(x.vehicleId))}</td><td>${h.toFixed(1)}</td><td>${km}</td>
      <td>${money(sessionIncome(x))}</td><td>${money(sessionExpenses(x))}</td><td>${money(net)}</td><td>${money(h?net/h:0)}</td><td>${money(km?net/km:0)}</td></tr>`;
  }).join("");
}
function renderSettings() {
  document.getElementById("nameInput").value = state.profile.name || "";
  document.getElementById("minimumHourlyInput").value = Number(state.profile.minimumHourly || 0);
  document.getElementById("minimumKmInput").value = Number(state.profile.minimumPerKm || 0);
}
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav-button").forEach(b => b.classList.toggle("active",b.dataset.view===id));
  const headings = {
    dashboard:["Panel principal","Mide la rentabilidad real de cada jornada."],
    sessions:["Jornadas","Inicia, finaliza y compara cada día de trabajo."],
    vehicles:["Vehículos","El kilometraje se actualiza al cerrar cada jornada."],
    reports:["Reportes","Compara ingresos, horas y kilómetros."],
    settings:["Configuración","Define tus mínimos de rentabilidad."]
  };
  document.getElementById("pageTitle").textContent = headings[id][0];
  document.getElementById("pageSubtitle").textContent = headings[id][1];
  document.getElementById("sidebar").classList.remove("open");
}
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }
function toast(message) {
  const t=document.getElementById("toast"); t.textContent=message; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2300);
}
function startAction() {
  if (activeSession()) openFinishModal();
  else openStartModal();
}
function openStartModal() {
  if (!state.vehicles.length) { openModal("vehicleModal"); toast("Primero agrega un vehículo."); return; }
  document.getElementById("startForm").reset();
  document.getElementById("startDate").value = dateOffset(0);
  document.getElementById("startTime").value = timeNow();
  const vehicle = getVehicle(document.getElementById("startVehicle").value);
  document.getElementById("startKm").value = Number(vehicle?.currentKm || 0);
  openModal("startModal");
}
function openFinishModal() {
  const active = activeSession();
  if (!active) { toast("No hay una jornada activa."); return; }
  document.getElementById("finishForm").reset();
  document.getElementById("finishDate").value = dateOffset(0);
  document.getElementById("finishTime").value = timeNow();
  document.getElementById("finishKm").value = Number(active.startKm);
  document.getElementById("finishStartSummary").innerHTML = `<div class="finish-summary-grid">
    <div><span>Vehículo</span><strong>${escapeHtml(getVehicleName(active.vehicleId))}</strong></div>
    <div><span>Km inicial</span><strong>${Number(active.startKm).toLocaleString("es-PA")} km</strong></div>
    <div><span>Gasolina inicial</span><strong>${money(active.startFuel)}</strong></div>
    <div><span>Inicio</span><strong>${formatDate(active.startDate)} ${escapeHtml(active.startTime)}</strong></div></div>`;
  calculateFinishPreview();
  openModal("finishModal");
}
function calculateFinishPreview() {
  const active = activeSession();
  if (!active) return;
  const endKm = Number(document.getElementById("finishKm").value || 0);
  const km = Math.max(endKm - Number(active.startKm || 0),0);
  const income = Number(document.getElementById("uberEarnings").value||0)+Number(document.getElementById("indriveEarnings").value||0)+Number(document.getElementById("outsideEarnings").value||0);
  const expenses = Number(active.startFuel||0)+Number(document.getElementById("finishExtraFuel").value||0)+Number(document.getElementById("finishTolls").value||0)+Number(document.getElementById("finishOtherExpenses").value||0);
  document.getElementById("liveKm").textContent = `${km} km`;
  document.getElementById("liveIncome").textContent = money(income);
  document.getElementById("liveExpenses").textContent = money(expenses);
  document.getElementById("liveNet").textContent = money(income-expenses);
}
function csvCell(value){return `"${String(value??"").replaceAll('"','""')}"`}
function download(filename, content, type) {
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
function exportSessionsCsv() {
  const headers=["Fecha inicio","Hora inicio","Fecha final","Hora final","Vehículo","Km inicio","Km final","Km recorridos","Gasolina","Uber","Viajes Uber","InDrive","Viajes InDrive","Fuera apps","Viajes fuera apps","Peajes","Otros gastos","Ingresos","Gastos","Ganancia neta","Horas","Ganancia por hora","Ganancia por km"];
  const rows=state.sessions.map(s=>[s.startDate,s.startTime,s.endDate||"",s.endTime||"",getVehicleName(s.vehicleId),s.startKm,s.endKm||"",sessionKm(s),Number(s.startFuel||0)+Number(s.extraFuel||0),s.uberEarnings||0,s.uberTrips||0,s.indriveEarnings||0,s.indriveTrips||0,s.outsideEarnings||0,s.outsideTrips||0,s.tolls||0,s.otherExpenses||0,sessionIncome(s),sessionExpenses(s),s.status==="closed"?sessionNet(s):"",s.status==="closed"?hoursBetween(s).toFixed(2):"",s.status==="closed"&&hoursBetween(s)?(sessionNet(s)/hoursBetween(s)).toFixed(2):"",s.status==="closed"&&sessionKm(s)?(sessionNet(s)/sessionKm(s)).toFixed(2):""]);
  download("RutaRentable_Jornadas.csv","\ufeff"+[headers,...rows].map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8");
}

document.querySelectorAll(".nav-button").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
document.getElementById("menuButton").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("periodFilter").addEventListener("change",()=>{renderDashboard();renderReports()});
document.getElementById("mainActionButton").addEventListener("click",startAction);
document.getElementById("sessionsActionButton").addEventListener("click",startAction);
document.addEventListener("click",e=>{
  if(e.target.closest("[data-start-session]")) openStartModal();
  if(e.target.closest("[data-finish-session]")) openFinishModal();
  const close=e.target.closest("[data-close]"); if(close) closeModal(close.dataset.close);
  const del=e.target.closest("[data-delete-session]");
  if(del){
    state.sessions=state.sessions.filter(s=>s.id!==del.dataset.deleteSession);
    saveState();
    renderAll();
    toast("Jornada eliminada.");
  }

  const deleteVehicleButton=e.target.closest("[data-delete-vehicle]");
  if(deleteVehicleButton){
    const vehicleId=deleteVehicleButton.dataset.deleteVehicle;
    const vehicle=getVehicle(vehicleId);
    if(!vehicle)return;

    const active=activeSession();
    if(active && active.vehicleId===vehicleId){
      toast("No puedes eliminar el vehículo mientras tiene una jornada activa.");
      return;
    }

    const associatedSessions=state.sessions.filter(s=>s.vehicleId===vehicleId);
    const warning=associatedSessions.length
      ? `El vehículo "${vehicle.name}" tiene ${associatedSessions.length} jornada(s). Si continúas, también se eliminarán esas jornadas. ¿Deseas eliminarlo?`
      : `¿Deseas eliminar el vehículo "${vehicle.name}"?`;

    if(!window.confirm(warning))return;

    state.sessions=state.sessions.filter(s=>s.vehicleId!==vehicleId);
    state.vehicles=state.vehicles.filter(v=>v.id!==vehicleId);
    saveState();
    renderAll();
    toast("Vehículo eliminado.");
  }
});
document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
document.getElementById("startVehicle").addEventListener("change",e=>{
  const v=getVehicle(e.target.value); document.getElementById("startKm").value=Number(v?.currentKm||0);
});
document.getElementById("startForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(activeSession()){toast("Ya existe una jornada activa.");return;}
  const startKm=Number(document.getElementById("startKm").value||0);
  state.sessions.push({
    id:id(),status:"active",vehicleId:document.getElementById("startVehicle").value,
    startDate:document.getElementById("startDate").value,startTime:document.getElementById("startTime").value,
    startKm,startFuel:Number(document.getElementById("startFuel").value||0),
    dayGoal:Number(document.getElementById("dayGoal").value||0),startNote:document.getElementById("startNote").value.trim()
  });
  const v=getVehicle(document.getElementById("startVehicle").value); if(v&&startKm>v.currentKm)v.currentKm=startKm;
  saveState();closeModal("startModal");renderAll();toast("Jornada iniciada.");
});
["finishKm","finishExtraFuel","uberEarnings","indriveEarnings","outsideEarnings","finishTolls","finishOtherExpenses"].forEach(x=>document.getElementById(x).addEventListener("input",calculateFinishPreview));
document.getElementById("finishForm").addEventListener("submit",e=>{
  e.preventDefault();
  const active=activeSession(); if(!active){toast("No hay jornada activa.");return;}
  const endKm=Number(document.getElementById("finishKm").value||0);
  if(endKm<Number(active.startKm)){toast("El kilometraje final no puede ser menor que el inicial.");return;}
  const endDate=document.getElementById("finishDate").value,endTime=document.getElementById("finishTime").value;
  if(localDateTime(endDate,endTime)<localDateTime(active.startDate,active.startTime)){toast("La fecha y hora final no pueden ser anteriores al inicio.");return;}
  Object.assign(active,{
    status:"closed",endDate,endTime,endKm,
    extraFuel:Number(document.getElementById("finishExtraFuel").value||0),
    uberEarnings:Number(document.getElementById("uberEarnings").value||0),uberTrips:Number(document.getElementById("uberTrips").value||0),
    indriveEarnings:Number(document.getElementById("indriveEarnings").value||0),indriveTrips:Number(document.getElementById("indriveTrips").value||0),
    outsideEarnings:Number(document.getElementById("outsideEarnings").value||0),outsideTrips:Number(document.getElementById("outsideTrips").value||0),
    tolls:Number(document.getElementById("finishTolls").value||0),otherExpenses:Number(document.getElementById("finishOtherExpenses").value||0),
    finishNote:document.getElementById("finishNote").value.trim()
  });
  const vehicle=getVehicle(active.vehicleId); if(vehicle)vehicle.currentKm=endKm;
  saveState();closeModal("finishModal");renderAll();toast("Jornada finalizada y rendimiento calculado.");
});
document.getElementById("sessionSearch").addEventListener("input",renderSessionsTable);
document.getElementById("sessionStatusFilter").addEventListener("change",renderSessionsTable);
document.getElementById("exportCsv").addEventListener("click",exportSessionsCsv);
document.getElementById("addVehicleButton").addEventListener("click",()=>{document.getElementById("vehicleForm").reset();openModal("vehicleModal")});
document.getElementById("vehicleForm").addEventListener("submit",e=>{
  e.preventDefault();state.vehicles.push({id:id(),name:document.getElementById("vehicleName").value.trim(),plate:document.getElementById("vehiclePlate").value.trim(),brand:document.getElementById("vehicleBrand").value.trim(),model:document.getElementById("vehicleModel").value.trim(),currentKm:Number(document.getElementById("vehicleKm").value||0)});
  saveState();closeModal("vehicleModal");renderAll();toast("Vehículo agregado.");
});
document.getElementById("saveSettings").addEventListener("click",()=>{
  state.profile.name=document.getElementById("nameInput").value.trim()||"Conductor";
  state.profile.minimumHourly=Number(document.getElementById("minimumHourlyInput").value||0);
  state.profile.minimumPerKm=Number(document.getElementById("minimumKmInput").value||0);
  saveState();renderAll();toast("Configuración guardada.");
});
document.getElementById("backupJson").addEventListener("click",()=>download(`RutaRentable_Respaldo_${dateOffset(0)}.json`,JSON.stringify(state,null,2),"application/json"));
document.getElementById("restoreJson").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const data=JSON.parse(await file.text());if(!Array.isArray(data.sessions)||!Array.isArray(data.vehicles))throw new Error("Respaldo inválido.");state=data;saveState();renderAll();toast("Respaldo importado.");}catch(err){toast(err.message||"No se pudo importar.");}e.target.value="";
});
document.getElementById("printReport").addEventListener("click",()=>window.print());
document.getElementById("exportReport").addEventListener("click",exportSessionsCsv);
document.getElementById("resetDemo").addEventListener("click",()=>{state=cloneDefault();saveState();renderAll();showView("dashboard");toast("Demostración reiniciada.");});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal-backdrop.open").forEach(m=>closeModal(m.id))});
setInterval(()=>{if(activeSession())renderActiveSession()},60000);

renderAll();
