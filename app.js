/* =========================================================
   EXODUS ERP – Recepción de Mercancía
   Lógica principal – GitHub Pages
   ========================================================= */

// ─── ESTADO GLOBAL ────────────────────────────────────────
const state = {
  sessionId: 1,
  selectedRow: null,
  selectedIncIdx: null,   // índice en la lista de incidencias (no en productos)
  postIncidencias: false,
  kardex: [],

  // Catálogo de productos del pedido
  productos: [
    {
      no: 1,
      producto: "CINTA AISLANTE NEGRO 60 PIES PLASTICA VERZE 20 U/L",
      sku: "1394000",
      cantidadEscaneada: 50,
      cantidadEsperada: 50,
      tipoProd: "Mercancía",
      clavePosicion: "P1 T1 N1",
      barcode: "000000000001394000",
      descripcion: "CINTA AISLANTE NEGRO 60 PIES PLASTICA VERZE 20 U/L",
      localizacion: "AL1 / CEDIS / 14-03-2024 / 10:54:00 A.M.",
      ptn: "P1, T1, N1",
    },
    {
      no: 2,
      producto: "ABRAZADERA ACERO INOXIDABLE MINI PHIRA N°4",
      sku: "0001000",
      cantidadEscaneada: 0,
      cantidadEsperada: 30,
      tipoProd: "Mercancía",
      clavePosicion: "P1 T1 N2",
      barcode: "000000000000001000",
      descripcion: "ABRAZADERA ACERO INOXIDABLE MINI PHIRA N°4",
      localizacion: "AL1 / CEDIS / 14-03-2024 / 10:54:00 A.M.",
      ptn: "P1, T1, N2",
    },
    {
      no: 2,
      producto: "ABRAZADERA ACERO INOXIDABLE MINI PHIRA N°4",
      sku: "0001000",
      cantidadEscaneada: 0,
      cantidadEsperada: 20,
      tipoProd: "Mercancía",
      clavePosicion: "P1 T1 N3",
      barcode: "000000000000001000",
      descripcion: "ABRAZADERA ACERO INOXIDABLE MINI PHIRA N°4",
      localizacion: "AL1 / CEDIS / 14-03-2024 / 10:54:00 A.M.",
      ptn: "P1, T1, N3",
    },
  ],
};

// ─── INICIALIZACIÓN ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderTable();
  selectRow(0);
  focusBarcode();
  document.addEventListener("keydown", handleGlobalKey);
});

function focusBarcode() {
  const inp = document.getElementById("barcodeInput");
  if (inp) inp.focus();
}

// ─── TECLADO GLOBAL ───────────────────────────────────────
function handleGlobalKey(e) {
  const modalInc = document.getElementById("modalIncidencias");
  const incAbierto = modalInc && modalInc.style.display !== "none";

  switch (e.key) {
    case "F1":
      e.preventDefault();
      if (incAbierto) reiniciarConteoDesdeModal();
      else reiniciarConteo();
      break;
    case "F5":
      e.preventDefault();
      imprimirEtiquetas();
      break;
    case "F6":
      e.preventDefault();
      recepcionProveedor();
      break;
    case "F7":
      e.preventDefault();
      terminarParcialidad();
      break;
    case "F9":
      e.preventDefault();
      guardarAvance();
      break;
    case "ArrowDown":
      if (!incAbierto) { e.preventDefault(); navigateTable(1); }
      break;
    case "ArrowUp":
      if (!incAbierto) { e.preventDefault(); navigateTable(-1); }
      break;
  }
}

// ─── ESCANEO ──────────────────────────────────────────────
function handleBarcodeKey(e) {
  if (e.key === "Enter") {
    const code = document.getElementById("barcodeInput").value.trim();
    if (code) procesarEscaneo(code);
  }
}

function procesarEscaneo(code) {
  const codeLimpio = code.replace(/^0+/, "");
  const prod = state.productos.find(
    (p) => p.sku.replace(/^0+/, "") === codeLimpio || p.barcode === code
  );

  if (!prod) {
    mostrarToast("⚠ Producto no encontrado en el pedido.", "warning");
    document.getElementById("barcodeInput").value = "";
    focusBarcode();
    return;
  }

  prod.cantidadEscaneada += 1;

  state.kardex.push({
    fecha: now(),
    sesion: state.sessionId,
    sku: prod.sku,
    producto: prod.producto,
    clavePosicion: prod.clavePosicion,
    cantidad: 1,
    accion: "Escaneo",
  });

  actualizarPanelProducto(prod);
  renderTable();
  selectRow(state.productos.indexOf(prod));

  document.getElementById("barcodeInput").value = "";
  focusBarcode();

  mostrarToast(`✔ Escaneado: ${prod.producto.substring(0, 45)}`, "success");
}

// ─── PANEL DE PRODUCTO ────────────────────────────────────
function actualizarPanelProducto(prod) {
  document.getElementById("prodBarcode").value = prod.sku;
  document.getElementById("prodDesc").value = prod.descripcion;
  document.getElementById("prodLoc").value = prod.localizacion;
  document.getElementById("prodPTN").value = prod.ptn;
}

// ─── RENDER TABLA ─────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  state.productos.forEach((prod, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.idx = idx;

    const inc = calcularIncidencia(prod);

    tr.innerHTML = `
      <td style="text-align:center">${prod.no}</td>
      <td>${prod.producto}</td>
      <td class="td-sku">${prod.sku}</td>
      <td class="td-qty">${prod.cantidadEscaneada}</td>
      <td>${prod.tipoProd}</td>
      <td>${prod.clavePosicion}</td>
      <td class="td-incidencia">${renderBadge(inc)}</td>
    `;

    tr.addEventListener("click", () => selectRow(idx));
    tbody.appendChild(tr);
  });

  // Restaurar selección
  if (state.selectedRow !== null) {
    const rows = tbody.querySelectorAll("tr");
    if (rows[state.selectedRow]) rows[state.selectedRow].classList.add("selected");
  }
}

function calcularIncidencia(prod) {
  if (prod.cantidadEscaneada === 0) return "Pendiente";
  if (prod.cantidadEscaneada < prod.cantidadEsperada) return "Faltante";
  if (prod.cantidadEscaneada > prod.cantidadEsperada) return "Sobrante";
  return "OK";
}

function renderBadge(label) {
  const map = {
    "OK": "badge-ok",
    "Pendiente": "badge-pend",
    "Faltante": "badge-inc",
    "Sobrante": "badge-inc",
  };
  return `<span class="${map[label] || 'badge-pend'}">${label}</span>`;
}

// ─── SELECCIÓN DE FILA ────────────────────────────────────
function selectRow(idx) {
  state.selectedRow = idx;
  const rows = document.querySelectorAll("#tableBody tr");
  rows.forEach((r) => r.classList.remove("selected"));
  if (rows[idx]) {
    rows[idx].classList.add("selected");
    rows[idx].scrollIntoView({ block: "nearest" });
    actualizarPanelProducto(state.productos[idx]);
  }
}

function navigateTable(dir) {
  if (state.selectedRow === null) return;
  const next = state.selectedRow + dir;
  if (next >= 0 && next < state.productos.length) selectRow(next);
}

// ─── TERMINAR PARCIALIDAD ─────────────────────────────────
function terminarParcialidad() {
  if (state.postIncidencias) {
    finalizarParcialidadFinal();
    return;
  }

  const incidencias = state.productos.filter((p) => calcularIncidencia(p) !== "OK");

  if (incidencias.length > 0) {
    mostrarModalIncidencias(incidencias);
  } else {
    mostrarModalCompleto();
  }
}

function finalizarParcialidadFinal() {
  state.kardex.push({
    fecha: now(),
    sesion: state.sessionId,
    sku: "—",
    producto: "CIERRE DE PARCIALIDAD FINAL",
    clavePosicion: "—",
    cantidad: 0,
    accion: "Cierre Final",
  });

  state.postIncidencias = false;

  // Restaurar botón
  const btn = document.getElementById("btnTerminar");
  const lbl = document.getElementById("btnTerminarLabel");
  btn.classList.remove("btn-finish-final");
  if (lbl) lbl.textContent = "Terminar Parcialidad (F7)";

  mostrarModalCompleto();
}

// ─── MODAL INCIDENCIAS ────────────────────────────────────
function mostrarModalIncidencias(incidencias) {
  // Guardar referencia a los índices reales de productos con incidencia
  state._incidenciasActuales = incidencias;
  state.selectedIncIdx = null;

  document.getElementById("incCount").textContent = incidencias.length;

  const tbody = document.getElementById("incidenciasBody");
  tbody.innerHTML = "";

  incidencias.forEach((prod, i) => {
    const prodIdx = state.productos.indexOf(prod);
    const inc = calcularIncidencia(prod);
    const tr = document.createElement("tr");
    tr.dataset.prodIdx = prodIdx;
    tr.dataset.incIdx = i;

    tr.innerHTML = `
      <td style="text-align:center">${prod.no}</td>
      <td>${prod.producto}</td>
      <td class="td-sku">${prod.sku}</td>
      <td class="td-qty">${prod.cantidadEscaneada}</td>
      <td class="td-qty">${prod.cantidadEsperada}</td>
      <td class="td-incidencia">${renderBadge(inc)}</td>
    `;

    tr.addEventListener("click", () => {
      selectIncRow(i, tr);
      selectRow(prodIdx);
    });

    tbody.appendChild(tr);
  });

  document.getElementById("modalIncidencias").style.display = "flex";
}

function selectIncRow(incIdx, tr) {
  state.selectedIncIdx = incIdx;
  document.querySelectorAll("#incidenciasBody tr").forEach((r) =>
    r.classList.remove("inc-selected")
  );
  tr.classList.add("inc-selected");
}

function cerrarModalIncidencias() {
  document.getElementById("modalIncidencias").style.display = "none";

  // Activar modo Finalizar Parcialidad Final
  state.postIncidencias = true;
  const btn = document.getElementById("btnTerminar");
  const lbl = document.getElementById("btnTerminarLabel");
  btn.classList.add("btn-finish-final");
  if (lbl) lbl.textContent = "Finalizar Parcialidad Final (F7)";

  focusBarcode();
}

// ─── REINICIAR CONTEO ─────────────────────────────────────
function reiniciarConteoDesdeModal() {
  if (state.selectedIncIdx === null) {
    mostrarToast("⚠ Seleccione un producto en la lista de incidencias.", "warning");
    return;
  }

  const prod = state._incidenciasActuales[state.selectedIncIdx];
  if (!prod) return;

  ejecutarReinicio(prod);

  // Refrescar modal con incidencias restantes
  const incidencias = state.productos.filter((p) => calcularIncidencia(p) !== "OK");
  if (incidencias.length > 0) {
    mostrarModalIncidencias(incidencias);
  } else {
    cerrarModalIncidencias();
    mostrarToast("✔ Todas las incidencias resueltas.", "success");
  }
}

function reiniciarConteo() {
  if (state.selectedRow === null) {
    mostrarToast("⚠ Seleccione un producto para reiniciar su conteo.", "warning");
    return;
  }
  const prod = state.productos[state.selectedRow];
  if (!prod) return;
  ejecutarReinicio(prod);
}

function ejecutarReinicio(prod) {
  const cantAnterior = prod.cantidadEscaneada;

  state.kardex.push({
    fecha: now(),
    sesion: state.sessionId,
    sku: prod.sku,
    producto: prod.producto,
    clavePosicion: prod.clavePosicion,
    cantidad: -cantAnterior,
    accion: `Reinicio de conteo (anterior: ${cantAnterior})`,
  });

  prod.cantidadEscaneada = 0;
  state.sessionId += 1;

  renderTable();
  selectRow(state.productos.indexOf(prod));

  mostrarToast(
    `↺ Conteo reiniciado: ${prod.producto.substring(0, 38)}... | Kardex actualizado`,
    "info"
  );
}

// ─── MODAL COMPLETO ───────────────────────────────────────
function mostrarModalCompleto() {
  document.getElementById("modalCompleto").style.display = "flex";
}

function cerrarModalCompleto() {
  document.getElementById("modalCompleto").style.display = "none";
  focusBarcode();
}

// ─── GUARDAR AVANCE ───────────────────────────────────────
function guardarAvance() {
  const ts = now();
  const sb = document.getElementById("statusBar");
  if (sb) {
    sb.innerHTML = `Último avance guardado: ${ts} – <span class="status-warning">Restan 24:00 horas para cierre automático de traspaso de pedido.</span>`;
  }

  state.kardex.push({
    fecha: ts,
    sesion: state.sessionId,
    sku: "—",
    producto: "GUARDADO DE AVANCE",
    clavePosicion: "—",
    cantidad: 0,
    accion: "Guardar avance",
  });

  document.getElementById("modalGuardar").style.display = "flex";
}

// ─── ACCIONES TOOLBAR ─────────────────────────────────────
function recepcionProveedor() {
  mostrarToast("📋 Abriendo recepción de proveedor...", "info");
}

function imprimirEtiquetas() {
  mostrarToast("🖨 Enviando etiquetas a impresora...", "info");
}

function closeWindow() {
  mostrarToast("✕ Ventana cerrada.", "info");
}

// ─── UTILIDADES ───────────────────────────────────────────
function now() {
  return new Date().toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

// ─── TOAST ────────────────────────────────────────────────
let _toastTimer = null;

function mostrarToast(msg, tipo) {
  const toast = document.getElementById("toastMsg");
  if (!toast) return;

  const colors = {
    success: { bg: "#27ae60", color: "#fff" },
    warning: { bg: "#e67e22", color: "#fff" },
    info:    { bg: "#2980b9", color: "#fff" },
    error:   { bg: "#e74c3c", color: "#fff" },
  };

  const c = colors[tipo] || colors.info;
  toast.style.background = c.bg;
  toast.style.color = c.color;
  toast.textContent = msg;
  toast.style.display = "block";
  toast.style.opacity = "1";

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => { toast.style.display = "none"; }, 320);
  }, 3200);
}
