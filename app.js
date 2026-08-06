const STORAGE_KEY = "rutaRentableSessionsV1";
const ACTIVE_BACKUP_KEY = "rutaRentableActiveSessionBackupV1";
const FINISH_DRAFT_KEY = "rutaRentableFinishDraftV1";
let finishDraftTimer = null;

const MANUAL_EXPENSE_LABELS = {
  indrive_recharge: "Recarga InDrive",
  car_wash: "Lavado de carro",
  fuel: "Gasolina",
  maintenance: "Mantenimiento",
  repair: "Reparación",
  parking: "Estacionamiento",
  food: "Comida",
  insurance: "Seguro",
  other: "Otros"
};

function manualExpenseLabel(category) {
  return MANUAL_EXPENSE_LABELS[category] || "Otros";
}
function isRechargeExpense(expense) {
  return expense.category === "indrive_recharge";
}
function isDeductibleManualExpense(expense) {
  return !isRechargeExpense(expense);
}
function manualExpenseAmount(expense) {
  return Number(expense.amount || 0);
}

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
function getInDriveRate(session) {
  return Number(session.indriveRate ?? state.profile.indriveRate ?? 13.69);
}
function getInDriveGross(session) {
  return Number(session.indriveGross ?? session.indriveEarnings ?? 0);
}
function shouldApplyInDriveCommission(session) {
  if (session.applyIndriveCommission !== undefined) return Boolean(session.applyIndriveCommission);
  return Number(session.indriveCommission || 0) > 0;
}
function getInDriveCommission(session) {
  if (!shouldApplyInDriveCommission(session)) return 0;
  if (session.indriveCommission !== undefined && session.indriveCommission !== null) {
    return Number(session.indriveCommission || 0);
  }
  return getInDriveGross(session) * getInDriveRate(session) / 100;
}
function getInDriveNet(session) {
  return Math.max(getInDriveGross(session) - getInDriveCommission(session), 0);
}
function getInDriveRecharge(session) {
  return Number(session.indriveRecharge || 0);
}
function getRechargePending(session) {
  return Math.max(getInDriveCommission(session) - getInDriveRecharge(session), 0);
}
function sessionIncome(session) {
  return Number(session.uberEarnings || 0) + getInDriveGross(session) + Number(session.outsideEarnings || 0);
}
function getReimbursedTolls(session) {
  return Number(session.tolls || 0);
}
function sessionExpenses(session) {
  return Number(session.startFuel || 0)
    + Number(session.extraFuel || 0)
    + Number(session.appExpenses || 0)
    + Number(session.otherExpenses || 0)
    + getInDriveCommission(session);
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
    minimumPerKm: 0.25,
    indriveRate: 13.69,
    keepScreenAwake: true
  },
  vehicles: [
    {
      id: "car-1", name: "Corolla Cross", plate: "Principal", brand: "Toyota",
      model: "Corolla Cross 2022", currentKm: 111000,
      maintenanceEnabled: false, maintenanceIntervalKm: 5000,
      lastMaintenanceKm: 111000, lastMaintenanceDate: "", maintenanceNote: ""
    }
  ],
  expenses: [],
  sessions: [
    {
      id: id(), status: "closed", vehicleId: "car-1",
      startDate: dateOffset(-2), startTime: "07:00", endDate: dateOffset(-2), endTime: "14:30",
      startKm: 110820, endKm: 110970, startFuel: 18, extraFuel: 0, dayGoal: 60,
      uberEarnings: 46, uberTrips: 7, indriveGross: 28, applyIndriveCommission: true, indriveRate: 13.69,
      indriveCommission: 3.83, indriveRecharge: 2, indriveTrips: 5,
      outsideEarnings: 15, outsideTrips: 1, tolls: 4, appExpenses: 1.50, otherExpenses: 3,
      startNote: "Turno de la mañana", finishNote: "Buen movimiento"
    },
    {
      id: id(), status: "closed", vehicleId: "car-1",
      startDate: dateOffset(-1), startTime: "08:00", endDate: dateOffset(-1), endTime: "13:45",
      startKm: 110970, endKm: 111000, startFuel: 10, extraFuel: 0, dayGoal: 50,
      uberEarnings: 22, uberTrips: 4, indriveGross: 18, applyIndriveCommission: true, indriveRate: 13.69,
      indriveCommission: 2.46, indriveRecharge: 2.46, indriveTrips: 3,
      outsideEarnings: 0, outsideTrips: 0, tolls: 0, appExpenses: 0, otherExpenses: 2,
      startNote: "Jornada corta", finishNote: ""
    }
  ]
};

let state = loadState();
let deferredInstallPrompt = null;
let screenWakeLock = null;

function isInstalledApp() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function requestScreenWakeLock(showMessage = false) {
  const enabled = state.profile.keepScreenAwake !== false;
  if (!enabled || !activeSession() || document.visibilityState !== 'visible') {
    updateDeviceStatus();
    return;
  }
  if (!('wakeLock' in navigator)) {
    if (showMessage) toast('Este navegador no permite mantener la pantalla encendida.');
    updateDeviceStatus('unsupported');
    return;
  }
  try {
    if (!screenWakeLock || screenWakeLock.released) {
      screenWakeLock = await navigator.wakeLock.request('screen');
      screenWakeLock.addEventListener('release', () => updateDeviceStatus());
    }
    if (showMessage) toast('La pantalla permanecerá encendida durante la jornada.');
  } catch (error) {
    console.warn('No se pudo activar Screen Wake Lock:', error);
    if (showMessage) toast('No se pudo mantener la pantalla encendida. Revisa el ahorro de batería.');
  }
  updateDeviceStatus();
}

async function releaseScreenWakeLock() {
  if (screenWakeLock && !screenWakeLock.released) {
    try { await screenWakeLock.release(); } catch (error) { console.warn(error); }
  }
  screenWakeLock = null;
  updateDeviceStatus();
}

function updateDeviceStatus(forced = '') {
  const installButton = document.getElementById('installAppButton');
  const installStatus = document.getElementById('installStatus');
  const wakeStatus = document.getElementById('wakeStatus');
  const toggle = document.getElementById('keepScreenAwakeInput');
  if (toggle) toggle.checked = state.profile.keepScreenAwake !== false;

  if (installButton && installStatus) {
    if (isInstalledApp()) {
      installButton.textContent = 'Aplicación instalada';
      installButton.disabled = true;
      installStatus.textContent = 'RutaRentable está instalada y se abre como una aplicación.';
    } else {
      installButton.disabled = false;
      installButton.textContent = deferredInstallPrompt ? 'Instalar en el celular' : 'Cómo instalar en el celular';
      installStatus.textContent = deferredInstallPrompt
        ? 'Lista para instalar desde este botón.'
        : 'También puedes usar el menú de Chrome y elegir “Instalar aplicación”.';
    }
  }

  if (wakeStatus) {
    if (forced === 'unsupported' || !('wakeLock' in navigator)) {
      wakeStatus.textContent = 'Pantalla activa: no compatible con este navegador.';
    } else if (screenWakeLock && !screenWakeLock.released) {
      wakeStatus.textContent = 'Pantalla activa: encendida durante la jornada.';
    } else if (state.profile.keepScreenAwake === false) {
      wakeStatus.textContent = 'Pantalla activa: desactivada en configuración.';
    } else if (!activeSession()) {
      wakeStatus.textContent = 'Pantalla activa: se encenderá al iniciar una jornada.';
    } else {
      wakeStatus.textContent = 'Pantalla activa: toca el botón de la jornada para activarla.';
    }
  }
}

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}
function migrateState(data) {
  data.profile = data.profile || {};
  if (data.profile.indriveRate === undefined) data.profile.indriveRate = 13.69;
  if (data.profile.keepScreenAwake === undefined) data.profile.keepScreenAwake = true;

  data.expenses = Array.isArray(data.expenses) ? data.expenses : [];
  data.vehicles = (data.vehicles || []).map(vehicle => {
    if (vehicle.maintenanceEnabled === undefined) vehicle.maintenanceEnabled = false;
    if (vehicle.maintenanceIntervalKm === undefined) vehicle.maintenanceIntervalKm = 5000;
    if (vehicle.lastMaintenanceKm === undefined) vehicle.lastMaintenanceKm = Number(vehicle.currentKm || 0);
    if (vehicle.lastMaintenanceDate === undefined) vehicle.lastMaintenanceDate = "";
    if (vehicle.maintenanceNote === undefined) vehicle.maintenanceNote = "";
    return vehicle;
  });

  data.sessions = (data.sessions || []).map(session => {
    if (session.indriveGross === undefined) {
      session.indriveGross = Number(session.indriveEarnings || 0);
    }
    if (session.indriveRate === undefined) {
      session.indriveRate = Number(data.profile.indriveRate || 13.69);
    }
    if (session.applyIndriveCommission === undefined) {
      session.applyIndriveCommission = Number(session.indriveCommission || 0) > 0;
    }
    if (session.indriveCommission === undefined) {
      session.indriveCommission = session.applyIndriveCommission
        ? session.indriveGross * session.indriveRate / 100
        : 0;
    }
    if (session.indriveRecharge === undefined) session.indriveRecharge = 0;
    if (session.appExpenses === undefined) session.appExpenses = 0;
    return session;
  });
  return data;
}
function readJsonStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const loaded = data && Array.isArray(data.sessions) && Array.isArray(data.vehicles)
      ? migrateState(data)
      : cloneDefault();
    const backup = readJsonStorage(ACTIVE_BACKUP_KEY);
    if (backup && backup.status === "active" && !loaded.sessions.some(session => session.id === backup.id)) {
      loaded.sessions.push(backup);
    }
    return loaded;
  } catch {
    return cloneDefault();
  }
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const active = activeSession();
    if (active) localStorage.setItem(ACTIVE_BACKUP_KEY, JSON.stringify(active));
    else localStorage.removeItem(ACTIVE_BACKUP_KEY);
  } catch (error) {
    console.warn("No se pudo guardar la información:", error);
  }
}
async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch (error) {
    console.warn("Almacenamiento persistente no disponible:", error);
  }
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
function filteredManualExpenses() {
  const { start, end } = getRange(document.getElementById("periodFilter").value);
  return state.expenses.filter(expense => {
    const d = localDateTime(expense.date, "12:00");
    return d >= start && d <= new Date(end.getTime() + 86399999);
  });
}
function expensesForVehicle(vehicleId, expenses = state.expenses) {
  return expenses.filter(expense => expense.vehicleId === vehicleId);
}
function summary(sessions, manualExpenses = []) {
  const result = sessions.reduce((a,s) => {
    a.income += sessionIncome(s);
    a.expenses += sessionExpenses(s);
    a.net += sessionNet(s);
    a.km += sessionKm(s);
    a.hours += hoursBetween(s);
    a.trips += sessionTrips(s);
    a.fuel += Number(s.startFuel || 0) + Number(s.extraFuel || 0);
    a.uber += Number(s.uberEarnings || 0);
    a.indrive += getInDriveGross(s);
    a.outside += Number(s.outsideEarnings || 0);
    a.indriveCommission += getInDriveCommission(s);
    a.indriveRecharge += getInDriveRecharge(s);
    a.appExpenses += Number(s.appExpenses || 0);
    a.reimbursedTolls += getReimbursedTolls(s);
    return a;
  }, {
    income:0, expenses:0, net:0, km:0, hours:0, trips:0, fuel:0,
    uber:0, indrive:0, outside:0, indriveCommission:0,
    indriveRecharge:0, rechargePending:0, appExpenses:0, reimbursedTolls:0,
    manualExpenses:0, manualRecharge:0, carWash:0, otherManualExpenses:0
  });

  manualExpenses.forEach(expense => {
    const amount = manualExpenseAmount(expense);
    if (isRechargeExpense(expense)) {
      result.manualRecharge += amount;
      result.indriveRecharge += amount;
      return;
    }

    result.manualExpenses += amount;
    result.expenses += amount;
    result.net -= amount;
    if (expense.category === "car_wash") result.carWash += amount;
    else result.otherManualExpenses += amount;
  });

  result.rechargePending = Math.max(result.indriveCommission - result.indriveRecharge, 0);
  return result;
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
  renderExpenses();
  renderMaintenance();
  renderReports();
  renderSettings();
  renderMobileWorkBar();
  updateDeviceStatus();
}
function populateVehicles() {
  const options = state.vehicles.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)}</option>`).join("");
  ["startVehicle", "manualExpenseVehicle"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = options || `<option value="">Agrega un vehículo</option>`;
  });
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
    renderMobileWorkBar();
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
  renderMobileWorkBar();
}
function renderMobileWorkBar() {
  const bar = document.getElementById('mobileWorkBar');
  if (!bar) return;
  const active = activeSession();
  if (!active) {
    bar.classList.remove('visible');
    bar.innerHTML = '';
    document.body.classList.remove('has-mobile-work-bar');
    return;
  }

  const elapsed = currentElapsedHours(active);
  const wakeActive = screenWakeLock && !screenWakeLock.released;
  bar.innerHTML = `
    <div class="mobile-work-info">
      <span class="mobile-live-dot"></span>
      <div>
        <strong>Jornada activa · ${elapsed.toFixed(1)} h</strong>
        <small>${escapeHtml(getVehicleName(active.vehicleId))} · Inicio ${Number(active.startKm).toLocaleString('es-PA')} km</small>
      </div>
    </div>
    <div class="mobile-work-actions">
      <button class="mobile-wake-button ${wakeActive ? 'active' : ''}" data-toggle-wake-lock aria-label="Mantener pantalla encendida">${wakeActive ? '☀ Activa' : '☀ Pantalla'}</button>
      <button class="mobile-finish-button" data-finish-session>Finalizar</button>
    </div>`;
  bar.classList.add('visible');
  document.body.classList.add('has-mobile-work-bar');
}

function renderDashboard() {
  const sessions = filteredClosedSessions();
  const expenses = filteredManualExpenses();
  const s = summary(sessions, expenses);
  const perKm = s.km ? s.net / s.km : 0;
  const perHour = s.hours ? s.net / s.hours : 0;
  document.getElementById("kpiNet").textContent = money(s.net);
  document.getElementById("kpiIncome").textContent = money(s.income);
  document.getElementById("kpiExpenses").textContent = money(s.expenses);
  document.getElementById("kpiIndriveCommission").textContent = money(s.indriveCommission);
  document.getElementById("kpiRechargePending").textContent = money(s.rechargePending);
  document.getElementById("kpiReimbursedTolls").textContent = money(s.reimbursedTolls);
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
      <td title="Incluye comisión InDrive: ${money(getInDriveCommission(s))}">${closed?money(sessionExpenses(s)):money(s.startFuel)}</td>
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
    const vehicleExpenses = expensesForVehicle(v.id);
    const s = summary(sessions, vehicleExpenses);
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
function renderExpenses() {
  const query = (document.getElementById("expenseSearch")?.value || "").trim().toLowerCase();
  const category = document.getElementById("expenseCategoryFilter")?.value || "all";
  const periodExpenses = filteredManualExpenses();
  const filtered = [...periodExpenses]
    .filter(expense => category === "all" || expense.category === category)
    .filter(expense => {
      const text = [
        manualExpenseLabel(expense.category),
        getVehicleName(expense.vehicleId),
        expense.note || "",
        expense.date
      ].join(" ").toLowerCase();
      return !query || text.includes(query);
    })
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const periodSummary = summary([], periodExpenses);
  document.getElementById("manualExpenseDeductibleTotal").textContent = money(periodSummary.manualExpenses);
  document.getElementById("manualRechargeTotal").textContent = money(periodSummary.manualRecharge);
  document.getElementById("manualWashTotal").textContent = money(periodSummary.carWash);
  document.getElementById("manualOtherTotal").textContent = money(periodSummary.otherManualExpenses);

  const tbody = document.getElementById("expensesTable");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No hay gastos manuales en este periodo.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(expense => {
    const recharge = isRechargeExpense(expense);
    return `<tr>
      <td>${formatDate(expense.date)}</td>
      <td>${escapeHtml(getVehicleName(expense.vehicleId))}</td>
      <td>${escapeHtml(manualExpenseLabel(expense.category))}</td>
      <td><span class="expense-treatment ${recharge ? "settlement" : "deductible"}">${recharge ? "Reduce saldo pendiente" : "Descuenta ganancia"}</span></td>
      <td class="${recharge ? "recharge-amount" : "negative"}">${money(expense.amount)}</td>
      <td>${escapeHtml(expense.note || "—")}</td>
      <td><button class="delete-button" data-delete-expense="${expense.id}" title="Eliminar gasto">🗑</button></td>
    </tr>`;
  }).join("");
}

function maintenanceNextKm(vehicle) {
  return Number(vehicle.lastMaintenanceKm || 0) + Number(vehicle.maintenanceIntervalKm || 0);
}
function maintenanceRemainingKm(vehicle) {
  return maintenanceNextKm(vehicle) - Number(vehicle.currentKm || 0);
}
function maintenanceStatus(vehicle) {
  if (!vehicle.maintenanceEnabled) {
    return { key: "disabled", label: "Recordatorio desactivado", message: "Actívalo cuando quieras controlar el mantenimiento por kilometraje." };
  }
  const remaining = maintenanceRemainingKm(vehicle);
  if (remaining <= 0) {
    return { key: "due", label: "Mantenimiento vencido", message: `Se excedió por ${Math.abs(remaining).toLocaleString("es-PA")} km.` };
  }
  if (remaining <= 500) {
    return { key: "soon", label: "Próximo mantenimiento", message: `Faltan ${remaining.toLocaleString("es-PA")} km.` };
  }
  return { key: "ok", label: "Mantenimiento al día", message: `Faltan ${remaining.toLocaleString("es-PA")} km.` };
}
function renderMaintenance() {
  const container = document.getElementById("maintenanceList");
  if (!state.vehicles.length) {
    container.innerHTML = `<article class="panel empty">Agrega un vehículo para configurar recordatorios.</article>`;
    return;
  }

  container.innerHTML = state.vehicles.map(vehicle => {
    const status = maintenanceStatus(vehicle);
    const nextKm = maintenanceNextKm(vehicle);
    return `<article class="panel maintenance-card">
      <div class="maintenance-overview ${status.key}">
        <div class="maintenance-title-row">
          <div>
            <h3>${escapeHtml(vehicle.name)}</h3>
            <p class="vehicle-meta">${escapeHtml([vehicle.brand, vehicle.model, vehicle.plate].filter(Boolean).join(" · "))}</p>
          </div>
          <span class="maintenance-status ${status.key}">${status.label}</span>
        </div>
        <div class="maintenance-numbers">
          <div><span>Kilometraje actual</span><strong>${Number(vehicle.currentKm || 0).toLocaleString("es-PA")} km</strong></div>
          <div><span>Próximo mantenimiento</span><strong>${vehicle.maintenanceEnabled ? `${nextKm.toLocaleString("es-PA")} km` : "Opcional"}</strong></div>
        </div>
        <p class="muted">${status.message}</p>
        ${vehicle.lastMaintenanceDate ? `<p class="muted">Último mantenimiento registrado: ${formatDate(vehicle.lastMaintenanceDate)}</p>` : ""}
      </div>

      <form class="maintenance-form" data-maintenance-form="${vehicle.id}">
        <label class="maintenance-toggle">
          <span>
            <strong>Activar recordatorio</strong>
            <small>Puedes desactivarlo cuando no quieras usarlo.</small>
          </span>
          <input name="maintenanceEnabled" type="checkbox" ${vehicle.maintenanceEnabled ? "checked" : ""}>
        </label>
        <label>
          Intervalo en kilómetros
          <input name="maintenanceIntervalKm" type="number" min="1" step="1" list="maintenanceIntervals" value="${Number(vehicle.maintenanceIntervalKm || 5000)}">
          <small>Ejemplos: 5,000 o 7,000 km.</small>
        </label>
        <label>
          Kilometraje del último mantenimiento
          <input name="lastMaintenanceKm" type="number" min="0" step="1" value="${Number(vehicle.lastMaintenanceKm || vehicle.currentKm || 0)}">
        </label>
        <label>
          Nota
          <input name="maintenanceNote" type="text" maxlength="140" value="${escapeHtml(vehicle.maintenanceNote || "")}" placeholder="Ejemplo: aceite y filtro">
        </label>
        <div class="maintenance-actions">
          <button class="button primary" type="submit">Guardar recordatorio</button>
          <button class="button secondary" type="button" data-maintenance-done="${vehicle.id}">Mantenimiento realizado hoy</button>
          <button class="button secondary" type="button" data-add-maintenance-expense="${vehicle.id}">Agregar gasto</button>
        </div>
      </form>
    </article>`;
  }).join("") + `<datalist id="maintenanceIntervals"><option value="5000"><option value="7000"><option value="10000"></datalist>`;
}

function renderReports() {
  const sessions = filteredClosedSessions();
  const expenses = filteredManualExpenses();
  const s = summary(sessions, expenses);
  const labels = { week:"Esta semana", month:"Este mes", year:"Este año", all:"Todo el historial" };
  document.getElementById("reportPeriod").textContent = labels[document.getElementById("periodFilter").value];
  const perHour = s.hours ? s.net/s.hours : 0;
  const perKm = s.km ? s.net/s.km : 0;
  const kpis = [
    ["Total cobrado",s.income],
    ["Total gastos",s.expenses],
    ["Comisión InDrive",s.indriveCommission],
    ["Corredores reembolsados",s.reimbursedTolls],
    ["Pendiente recarga",s.rechargePending],
    ["Ganancia neta",s.net],
    ["Por hora",perHour],
    ["Por km",perKm]
  ];
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
      <td>${money(sessionIncome(x))}</td><td>${money(getInDriveCommission(x))}</td>
      <td>${money(getReimbursedTolls(x))}</td><td>${money(sessionExpenses(x))}</td>
      <td>${money(getRechargePending(x))}</td><td>${money(net)}</td><td>${money(h?net/h:0)}</td><td>${money(km?net/km:0)}</td></tr>`;
  }).join("");

  const reportExpenses = document.getElementById("reportExpenses");
  reportExpenses.innerHTML = expenses.length
    ? [...expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(expense => `<tr>
        <td>${formatDate(expense.date)}</td>
        <td>${escapeHtml(getVehicleName(expense.vehicleId))}</td>
        <td>${escapeHtml(manualExpenseLabel(expense.category))}</td>
        <td>${money(expense.amount)}</td>
        <td>${isRechargeExpense(expense) ? "Reduce pendiente de InDrive" : "Descuenta ganancia"}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty">No hay gastos manuales en este periodo.</td></tr>`;
}
function renderSettings() {
  document.getElementById("nameInput").value = state.profile.name || "";
  document.getElementById("minimumHourlyInput").value = Number(state.profile.minimumHourly || 0);
  document.getElementById("minimumKmInput").value = Number(state.profile.minimumPerKm || 0);
  document.getElementById("indriveRateInput").value = Number(state.profile.indriveRate || 13.69);
  document.getElementById("keepScreenAwakeInput").checked = state.profile.keepScreenAwake !== false;
  updateDeviceStatus();
}
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav-button").forEach(b => b.classList.toggle("active",b.dataset.view===id));
  const headings = {
    dashboard:["Panel principal","Mide la rentabilidad real de cada jornada."],
    sessions:["Jornadas","Inicia, finaliza y compara cada día de trabajo."],
    vehicles:["Vehículos","El kilometraje se actualiza al cerrar cada jornada."],
    expenses:["Gastos","Registra recargas, lavado y otros gastos manuales."],
    maintenance:["Mantenimiento","Configura recordatorios opcionales por kilometraje."],
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
function updateExpenseEffectNote() {
  const category = document.getElementById("manualExpenseCategory").value;
  const note = document.getElementById("expenseEffectNote");
  if (category === "indrive_recharge") {
    note.className = "expense-effect-note settlement";
    note.innerHTML = `<strong>Recarga InDrive:</strong> se registra como pago de la comisión pendiente. No vuelve a reducir la ganancia, porque la comisión ya fue descontada cuando la activaste.`;
  } else {
    note.className = "expense-effect-note deductible";
    note.innerHTML = `<strong>Gasto descontable:</strong> este monto se sumará a los gastos y reducirá la ganancia neta del periodo.`;
  }
}
function openExpenseModal(category = "indrive_recharge", vehicleId = "") {
  if (!state.vehicles.length) {
    toast("Primero agrega un vehículo.");
    openModal("vehicleModal");
    return;
  }
  document.getElementById("expenseForm").reset();
  document.getElementById("manualExpenseDate").value = dateOffset(0);
  document.getElementById("manualExpenseCategory").value = category;
  if (vehicleId && state.vehicles.some(vehicle => vehicle.id === vehicleId)) {
    document.getElementById("manualExpenseVehicle").value = vehicleId;
  }
  updateExpenseEffectNote();
  openModal("expenseModal");
}
function exportManualExpensesCsv() {
  const headers = ["Fecha","Vehículo","Categoría","Tratamiento","Monto","Nota"];
  const rows = state.expenses.map(expense => [
    expense.date,
    getVehicleName(expense.vehicleId),
    manualExpenseLabel(expense.category),
    isRechargeExpense(expense) ? "Reduce pendiente de InDrive" : "Descuenta ganancia",
    Number(expense.amount || 0).toFixed(2),
    expense.note || ""
  ]);
  download(
    "RutaRentable_Gastos.csv",
    "\ufeff" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n"),
    "text/csv;charset=utf-8"
  );
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
const FINISH_DRAFT_FIELDS = [
  "finishDate","finishTime","finishKm","finishExtraFuel","uberEarnings","uberTrips",
  "applyIndriveCommission","finishIndriveRate","indriveGross","indriveTrips","indriveRecharge",
  "outsideEarnings","outsideTrips","finishTolls","finishAppExpenses","finishOtherExpenses","finishNote"
];
function collectFinishDraft() {
  const active = activeSession();
  if (!active) return null;
  const values = {};
  FINISH_DRAFT_FIELDS.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (!element) return;
    values[fieldId] = element.type === "checkbox" ? element.checked : element.value;
  });
  return { sessionId: active.id, values, savedAt: new Date().toISOString() };
}
function saveFinishDraft(showStatus = true) {
  const draft = collectFinishDraft();
  if (!draft) return;
  try {
    localStorage.setItem(FINISH_DRAFT_KEY, JSON.stringify(draft));
    if (showStatus) {
      const status = document.getElementById("finishDraftStatus");
      if (status) status.textContent = `Borrador guardado automáticamente a las ${new Date().toLocaleTimeString("es-PA", {hour:"2-digit",minute:"2-digit"})}.`;
    }
  } catch (error) {
    console.warn("No se pudo guardar el borrador:", error);
  }
}
function restoreFinishDraft(active) {
  const draft = readJsonStorage(FINISH_DRAFT_KEY);
  if (!draft || draft.sessionId !== active.id || !draft.values) return false;
  Object.entries(draft.values).forEach(([fieldId, value]) => {
    const element = document.getElementById(fieldId);
    if (!element) return;
    if (element.type === "checkbox") element.checked = Boolean(value);
    else element.value = value;
  });
  const status = document.getElementById("finishDraftStatus");
  if (status) status.textContent = "Borrador anterior recuperado automáticamente.";
  return true;
}
function clearFinishDraft() {
  try { localStorage.removeItem(FINISH_DRAFT_KEY); } catch {}
}
function updateInDriveCommissionControls() {
  const enabled = document.getElementById("applyIndriveCommission").checked;
  const rateInput = document.getElementById("finishIndriveRate");
  const rechargeInput = document.getElementById("indriveRecharge");
  rateInput.disabled = !enabled;
  rechargeInput.disabled = !enabled;
  document.querySelectorAll(".commission-dependent").forEach(element => element.classList.toggle("disabled-field", !enabled));
  document.getElementById("indriveRateLabel").textContent = enabled
    ? `${Number(rateInput.value || state.profile.indriveRate || 13.69).toFixed(2)}%`
    : "no aplicada";
  if (!enabled) rechargeInput.value = "0";
}
function openFinishModal() {
  const active = activeSession();
  if (!active) { toast("No hay una jornada activa."); return; }
  document.getElementById("finishForm").reset();
  document.getElementById("finishDate").value = dateOffset(0);
  document.getElementById("finishTime").value = timeNow();
  document.getElementById("finishKm").value = Number(active.startKm);
  document.getElementById("applyIndriveCommission").checked = false;
  document.getElementById("finishIndriveRate").value = Number(state.profile.indriveRate || 13.69);
  document.getElementById("indriveRateLabel").textContent = "no aplicada";
  document.getElementById("finishStartSummary").innerHTML = `<div class="finish-summary-grid">
    <div><span>Vehículo</span><strong>${escapeHtml(getVehicleName(active.vehicleId))}</strong></div>
    <div><span>Km inicial</span><strong>${Number(active.startKm).toLocaleString("es-PA")} km</strong></div>
    <div><span>Gasolina inicial</span><strong>${money(active.startFuel)}</strong></div>
    <div><span>Inicio</span><strong>${formatDate(active.startDate)} ${escapeHtml(active.startTime)}</strong></div></div>`;
  restoreFinishDraft(active);
  updateInDriveCommissionControls();
  calculateFinishPreview();
  openModal("finishModal");
  saveFinishDraft(false);
}
function calculateFinishPreview() {
  const active = activeSession();
  if (!active) return;
  const endKm = Number(document.getElementById("finishKm").value || 0);
  const km = Math.max(endKm - Number(active.startKm || 0),0);
  const indriveGross = Number(document.getElementById("indriveGross").value || 0);
  const applyCommission = document.getElementById("applyIndriveCommission").checked;
  const indriveRate = Number(document.getElementById("finishIndriveRate").value || state.profile.indriveRate || 13.69);
  const indriveCommission = applyCommission ? indriveGross * indriveRate / 100 : 0;
  const indriveNet = Math.max(indriveGross - indriveCommission, 0);
  const rechargeMade = applyCommission ? Number(document.getElementById("indriveRecharge").value || 0) : 0;
  const pendingRecharge = applyCommission ? Math.max(indriveCommission - rechargeMade, 0) : 0;
  const income = Number(document.getElementById("uberEarnings").value||0)
    + indriveGross
    + Number(document.getElementById("outsideEarnings").value||0);
  const reimbursedTolls = Number(document.getElementById("finishTolls").value||0);
  const expenses = Number(active.startFuel||0)
    + Number(document.getElementById("finishExtraFuel").value||0)
    + Number(document.getElementById("finishAppExpenses").value||0)
    + Number(document.getElementById("finishOtherExpenses").value||0)
    + indriveCommission;

  document.getElementById("liveIndriveCommission").textContent = money(indriveCommission);
  document.getElementById("liveIndriveNet").textContent = money(indriveNet);
  document.getElementById("liveRechargePending").textContent = money(pendingRecharge);
  document.getElementById("liveKm").textContent = `${km} km`;
  document.getElementById("liveIncome").textContent = money(income);
  document.getElementById("livePlatformExpense").textContent = money(indriveCommission);
  document.getElementById("liveReimbursedTolls").textContent = money(reimbursedTolls);
  document.getElementById("liveExpenses").textContent = money(expenses);
  document.getElementById("livePendingRechargeTotal").textContent = money(pendingRecharge);
  document.getElementById("liveNet").textContent = money(income-expenses);
}
function csvCell(value){return `"${String(value??"").replaceAll('"','""')}"`}
function download(filename, content, type) {
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
function exportSessionsCsv() {
  const headers=[
    "Fecha inicio","Hora inicio","Fecha final","Hora final","Vehículo","Km inicio","Km final","Km recorridos",
    "Gasolina","Uber","Viajes Uber","InDrive bruto","Aplicar comisión InDrive","Porcentaje InDrive","Comisión InDrive","InDrive neto",
    "Recarga InDrive realizada","Pendiente de recarga","Viajes InDrive","Fuera apps","Viajes fuera apps",
    "Corredores y peajes reembolsados (no descontados)","Otros gastos de aplicaciones","Otros gastos generales",
    "Total cobrado","Total gastos descontados","Ganancia neta","Horas","Ganancia por hora","Ganancia por km"
  ];
  const rows=state.sessions.map(s=>[
    s.startDate,s.startTime,s.endDate||"",s.endTime||"",getVehicleName(s.vehicleId),s.startKm,s.endKm||"",sessionKm(s),
    Number(s.startFuel||0)+Number(s.extraFuel||0),s.uberEarnings||0,s.uberTrips||0,
    getInDriveGross(s),shouldApplyInDriveCommission(s)?"Sí":"No",getInDriveRate(s),getInDriveCommission(s),getInDriveNet(s),getInDriveRecharge(s),getRechargePending(s),s.indriveTrips||0,
    s.outsideEarnings||0,s.outsideTrips||0,s.tolls||0,s.appExpenses||0,s.otherExpenses||0,
    sessionIncome(s),sessionExpenses(s),s.status==="closed"?sessionNet(s):"",
    s.status==="closed"?hoursBetween(s).toFixed(2):"",
    s.status==="closed"&&hoursBetween(s)?(sessionNet(s)/hoursBetween(s)).toFixed(2):"",
    s.status==="closed"&&sessionKm(s)?(sessionNet(s)/sessionKm(s)).toFixed(2):""
  ]);
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

  const wakeButton=e.target.closest("[data-toggle-wake-lock]");
  if(wakeButton){
    if(screenWakeLock && !screenWakeLock.released){
      releaseScreenWakeLock();
      toast("Pantalla activa desactivada para esta jornada.");
    } else {
      requestScreenWakeLock(true);
    }
  }

  const deleteExpenseButton=e.target.closest("[data-delete-expense]");
  if(deleteExpenseButton){
    state.expenses=state.expenses.filter(expense=>expense.id!==deleteExpenseButton.dataset.deleteExpense);
    saveState();
    renderAll();
    toast("Gasto eliminado.");
  }

  const maintenanceDoneButton=e.target.closest("[data-maintenance-done]");
  if(maintenanceDoneButton){
    const vehicle=getVehicle(maintenanceDoneButton.dataset.maintenanceDone);
    if(vehicle){
      vehicle.lastMaintenanceKm=Number(vehicle.currentKm||0);
      vehicle.lastMaintenanceDate=dateOffset(0);
      saveState();
      renderAll();
      toast("Mantenimiento registrado con el kilometraje actual.");
    }
  }

  const maintenanceExpenseButton=e.target.closest("[data-add-maintenance-expense]");
  if(maintenanceExpenseButton){
    openExpenseModal("maintenance", maintenanceExpenseButton.dataset.addMaintenanceExpense);
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
    const associatedExpenses=state.expenses.filter(expense=>expense.vehicleId===vehicleId);
    const associatedTotal=associatedSessions.length+associatedExpenses.length;
    const warning=associatedTotal
      ? `El vehículo "${vehicle.name}" tiene ${associatedSessions.length} jornada(s) y ${associatedExpenses.length} gasto(s). Si continúas, también se eliminarán esos registros. ¿Deseas eliminarlo?`
      : `¿Deseas eliminar el vehículo "${vehicle.name}"?`;

    if(!window.confirm(warning))return;

    state.sessions=state.sessions.filter(s=>s.vehicleId!==vehicleId);
    state.expenses=state.expenses.filter(expense=>expense.vehicleId!==vehicleId);
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
  clearFinishDraft();saveState();closeModal("startModal");renderAll();toast("Jornada iniciada.");
  requestScreenWakeLock();
});
FINISH_DRAFT_FIELDS.forEach(fieldId => {
  const element = document.getElementById(fieldId);
  if (!element) return;
  const eventName = element.type === "checkbox" || element.tagName === "SELECT" ? "change" : "input";
  element.addEventListener(eventName, () => {
    if (fieldId === "applyIndriveCommission" || fieldId === "finishIndriveRate") updateInDriveCommissionControls();
    calculateFinishPreview();
    clearTimeout(finishDraftTimer);
    finishDraftTimer = setTimeout(() => saveFinishDraft(true), 250);
  });
});
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
    indriveGross:Number(document.getElementById("indriveGross").value||0),
    applyIndriveCommission:document.getElementById("applyIndriveCommission").checked,
    indriveRate:Number(document.getElementById("finishIndriveRate").value||state.profile.indriveRate||13.69),
    indriveCommission:document.getElementById("applyIndriveCommission").checked
      ? Number(document.getElementById("indriveGross").value||0)*Number(document.getElementById("finishIndriveRate").value||state.profile.indriveRate||13.69)/100
      : 0,
    indriveRecharge:document.getElementById("applyIndriveCommission").checked
      ? Number(document.getElementById("indriveRecharge").value||0)
      : 0,
    indriveTrips:Number(document.getElementById("indriveTrips").value||0),
    outsideEarnings:Number(document.getElementById("outsideEarnings").value||0),outsideTrips:Number(document.getElementById("outsideTrips").value||0),
    tolls:Number(document.getElementById("finishTolls").value||0),
    appExpenses:Number(document.getElementById("finishAppExpenses").value||0),
    otherExpenses:Number(document.getElementById("finishOtherExpenses").value||0),
    finishNote:document.getElementById("finishNote").value.trim()
  });
  const vehicle=getVehicle(active.vehicleId); if(vehicle)vehicle.currentKm=endKm;
  saveState();clearFinishDraft();closeModal("finishModal");renderAll();toast("Jornada finalizada y rendimiento calculado.");
  releaseScreenWakeLock();
});
document.getElementById("sessionSearch").addEventListener("input",renderSessionsTable);
document.getElementById("sessionStatusFilter").addEventListener("change",renderSessionsTable);
document.getElementById("exportCsv").addEventListener("click",exportSessionsCsv);
document.getElementById("addVehicleButton").addEventListener("click",()=>{document.getElementById("vehicleForm").reset();openModal("vehicleModal")});
document.getElementById("vehicleForm").addEventListener("submit",e=>{
  e.preventDefault();
  const currentKm=Number(document.getElementById("vehicleKm").value||0);
  state.vehicles.push({
    id:id(),
    name:document.getElementById("vehicleName").value.trim(),
    plate:document.getElementById("vehiclePlate").value.trim(),
    brand:document.getElementById("vehicleBrand").value.trim(),
    model:document.getElementById("vehicleModel").value.trim(),
    currentKm,
    maintenanceEnabled:false,
    maintenanceIntervalKm:5000,
    lastMaintenanceKm:currentKm,
    lastMaintenanceDate:"",
    maintenanceNote:""
  });
  saveState();closeModal("vehicleModal");renderAll();toast("Vehículo agregado.");
});
document.getElementById("addExpenseButton").addEventListener("click",()=>openExpenseModal());
document.getElementById("manualExpenseCategory").addEventListener("change",updateExpenseEffectNote);
document.getElementById("expenseForm").addEventListener("submit",event=>{
  event.preventDefault();
  const amount=Number(document.getElementById("manualExpenseAmount").value||0);
  if(amount<=0){
    toast("El monto debe ser mayor que cero.");
    return;
  }
  state.expenses.push({
    id:id(),
    date:document.getElementById("manualExpenseDate").value,
    vehicleId:document.getElementById("manualExpenseVehicle").value,
    category:document.getElementById("manualExpenseCategory").value,
    amount,
    note:document.getElementById("manualExpenseNote").value.trim()
  });
  saveState();
  closeModal("expenseModal");
  renderAll();
  toast("Gasto guardado.");
});
document.getElementById("expenseSearch").addEventListener("input",renderExpenses);
document.getElementById("expenseCategoryFilter").addEventListener("change",renderExpenses);
document.getElementById("exportExpensesCsv").addEventListener("click",exportManualExpensesCsv);

document.getElementById("maintenanceList").addEventListener("submit",event=>{
  const form=event.target.closest("[data-maintenance-form]");
  if(!form)return;
  event.preventDefault();
  const vehicle=getVehicle(form.dataset.maintenanceForm);
  if(!vehicle)return;
  const data=new FormData(form);
  vehicle.maintenanceEnabled=data.get("maintenanceEnabled")==="on";
  vehicle.maintenanceIntervalKm=Math.max(Number(data.get("maintenanceIntervalKm")||5000),1);
  vehicle.lastMaintenanceKm=Math.max(Number(data.get("lastMaintenanceKm")||0),0);
  vehicle.maintenanceNote=String(data.get("maintenanceNote")||"").trim();
  saveState();
  renderAll();
  toast("Recordatorio de mantenimiento guardado.");
});

document.getElementById("saveSettings").addEventListener("click",()=>{
  state.profile.name=document.getElementById("nameInput").value.trim()||"Conductor";
  state.profile.minimumHourly=Number(document.getElementById("minimumHourlyInput").value||0);
  state.profile.minimumPerKm=Number(document.getElementById("minimumKmInput").value||0);
  state.profile.indriveRate=Number(document.getElementById("indriveRateInput").value||13.69);
  state.profile.keepScreenAwake=document.getElementById("keepScreenAwakeInput").checked;
  saveState();renderAll();toast("Configuración guardada.");
  if(state.profile.keepScreenAwake) requestScreenWakeLock(); else releaseScreenWakeLock();
});
document.getElementById("backupJson").addEventListener("click",()=>download(`RutaRentable_Respaldo_${dateOffset(0)}.json`,JSON.stringify(state,null,2),"application/json"));
document.getElementById("restoreJson").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const data=JSON.parse(await file.text());if(!Array.isArray(data.sessions)||!Array.isArray(data.vehicles))throw new Error("Respaldo inválido.");state=migrateState(data);saveState();renderAll();toast("Respaldo importado.");}catch(err){toast(err.message||"No se pudo importar.");}e.target.value="";
});
document.getElementById("printReport").addEventListener("click",()=>window.print());
document.getElementById("exportReport").addEventListener("click",exportSessionsCsv);
document.getElementById("keepScreenAwakeInput").addEventListener("change",e=>{
  state.profile.keepScreenAwake=e.target.checked;
  saveState();
  if(e.target.checked) requestScreenWakeLock(true); else releaseScreenWakeLock();
});

document.getElementById("installAppButton").addEventListener("click",async()=>{
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    updateDeviceStatus();
    return;
  }
  const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  toast(isiOS
    ? "En Safari: Compartir → Añadir a pantalla de inicio."
    : "En Chrome: menú ⋮ → Instalar aplicación o Agregar a pantalla principal.");
});

window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  updateDeviceStatus();
});
window.addEventListener("appinstalled",()=>{
  deferredInstallPrompt=null;
  toast("RutaRentable quedó instalada en el celular.");
  updateDeviceStatus();
});

document.addEventListener("visibilitychange",()=>{
  saveState();
  if (document.getElementById("finishModal")?.classList.contains("open")) saveFinishDraft(false);
  if(document.visibilityState==="visible" && activeSession() && state.profile.keepScreenAwake!==false){
    requestScreenWakeLock();
  }
});
window.addEventListener("pagehide",()=>{
  saveState();
  if (document.getElementById("finishModal")?.classList.contains("open")) saveFinishDraft(false);
});
window.addEventListener("beforeunload",()=>{
  saveState();
  if (document.getElementById("finishModal")?.classList.contains("open")) saveFinishDraft(false);
});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./service-worker.js").catch(error=>console.warn("Service Worker:",error));
  });
}

document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal-backdrop.open").forEach(m=>closeModal(m.id))});
setInterval(()=>{
  if(activeSession()){
    saveState();
    if (document.getElementById("finishModal")?.classList.contains("open")) saveFinishDraft(false);
    renderActiveSession();
    renderMobileWorkBar();
    updateDeviceStatus();
  }
},30000);

requestPersistentStorage();
renderAll();
