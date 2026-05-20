/* =========================================================
   EXODUS ERP – Recepción de Mercancía
   Lógica principal – GitHub Pages
   ========================================================= */

// ─── ESTADO GLOBAL ────────────────────────────────────────
const state = {
  sessionId: 1,
  selectedRow: null,
  postIncidencias: false,
  esperandoContenedor: false,
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
      cantidadEscaneada: 3,
      cantidadEsperada: 2,
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
      cantidadEscaneada: 3,
      cantidadEsperada: 2,
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
  ocultarColumnaIncidencias();
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
  switch (e.key) {
    case "F1":
      e.preventDefault();
      reiniciarConteo();
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
      e.preventDefault(); navigateTable(1);
      break;
    case "ArrowUp":
      e.preventDefault(); navigateTable(-1);
      break;
  }
}

// ─── MODO CONTENEDOR ─────────────────────────────────────
function activarModoContenedor() {
  state.esperandoContenedor = true;

  document.getElementById("labelBarcode").textContent = "Código de contenedor:";
  document.getElementById("barcodeInput").placeholder = "Escanee el contenedor...";

  document.querySelector(".info-panels").style.display    = "none";
  document.querySelector(".table-wrapper").style.display  = "none";
  document.querySelector(".bottom-bar").style.display     = "none";
  document.querySelector(".status-bar").style.display     = "none";
  document.getElementById("estadoContenedor").style.display = "flex";

  focusBarcode();
}

function desactivarModoContenedor() {
  state.esperandoContenedor = false;

  document.getElementById("labelBarcode").textContent = "Código de barras:";
  document.getElementById("barcodeInput").placeholder = "7 dígitos (producto) o 18 dígitos (producto+cantidad)";

  document.querySelector(".info-panels").style.display    = "";
  document.querySelector(".table-wrapper").style.display  = "";
  document.querySelector(".bottom-bar").style.display     = "";
  document.querySelector(".status-bar").style.display     = "";
  document.getElementById("estadoContenedor").style.display = "none";

  focusBarcode();
}

function procesarContenedor(code) {
  desactivarModoContenedor();
  mostrarToast(`✔ Contenedor ${code} cargado — pedido listo para recepción.`, "success");
  selectRow(0);
}

// ─── ESCANEO ──────────────────────────────────────────────
function handleBarcodeKey(e) {
  if (e.key === "Enter") {
    const code = document.getElementById("barcodeInput").value.trim();
    if (code) procesarEscaneo(code);
  }
}

function procesarEscaneo(code) {
  if (state.esperandoContenedor) { procesarContenedor(code); return; }

  let codigoProd, cantidad;

  if (code.length === 18) {
    if (!/^\d{18}$/.test(code)) {
      mostrarToast("⚠ Código inválido: solo se permiten dígitos numéricos.", "warning");
      limpiarBarcode(); return;
    }
    codigoProd = code.substring(0, 7);
    cantidad   = parseInt(code.substring(7, 13), 10);
    // posiciones 13–17 se ignoran (relleno)
    if (cantidad === 0) {
      mostrarToast("⚠ Código inválido: la cantidad no puede ser cero.", "warning");
      limpiarBarcode(); return;
    }
  } else if (code.length === 7) {
    if (!/^\d{7}$/.test(code)) {
      mostrarToast("⚠ Código inválido: solo se permiten dígitos numéricos.", "warning");
      limpiarBarcode(); return;
    }
    codigoProd = code;
    cantidad   = 1;
  } else {
    mostrarToast(`⚠ Longitud inválida: se esperan 7 u 18 dígitos (recibidos: ${code.length}).`, "warning");
    limpiarBarcode(); return;
  }

  const prod = state.productos.find((p) => p.sku === codigoProd);
  if (!prod) {
    mostrarToast("⚠ Producto no encontrado en el pedido.", "warning");
    limpiarBarcode(); return;
  }

  prod.cantidadEscaneada += cantidad;

  state.kardex.push({
    fecha: now(),
    sesion: state.sessionId,
    sku: prod.sku,
    producto: prod.producto,
    clavePosicion: prod.clavePosicion,
    cantidad,
    accion: code.length === 18 ? `Escaneo 18 dígitos (+${cantidad})` : "Escaneo 7 dígitos (+1)",
  });

  actualizarPanelProducto(prod);
  renderTable();
  selectRow(state.productos.indexOf(prod));
  limpiarBarcode();

  mostrarToast(`✔ ${prod.producto.substring(0, 38)} +${cantidad} uds.`, "success");
}

function limpiarBarcode() {
  document.getElementById("barcodeInput").value = "";
  focusBarcode();
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
  if (label === "OK") return `<span class="badge-ok">OK</span>`;
  return `<span class="badge-inc">Incidencia</span>`;
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
  actualizarBtnReinicio();
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

  mostrarModalCompleto();
}

// ─── MODAL INCIDENCIAS ────────────────────────────────────
function mostrarModalIncidencias(incidencias) {
  document.getElementById("incCount").textContent = incidencias.length;
  document.getElementById("modalIncidencias").style.display = "flex";
}

function cerrarModalIncidencias() {
  document.getElementById("modalIncidencias").style.display = "none";

  // Mostrar columna de incidencias en tabla principal para revisión
  mostrarColumnaIncidencias();
  renderTable();

  // Activar modo Finalizar Parcialidad Final
  state.postIncidencias = true;
  const btn = document.getElementById("btnTerminar");
  const lbl = document.getElementById("btnTerminarLabel");
  btn.classList.add("btn-finish-final");
  if (lbl) lbl.textContent = "Finalizar Parcialidad Final (F7)";

  actualizarBtnReinicio();
  focusBarcode();
}

// ─── COLUMNA INCIDENCIAS ──────────────────────────────────
function ocultarColumnaIncidencias() {
  document.getElementById("productTable").classList.add("hide-incidencias");
  actualizarBtnReinicio();
}

function mostrarColumnaIncidencias() {
  document.getElementById("productTable").classList.remove("hide-incidencias");
  actualizarBtnReinicio();
}

// ─── BOTÓN REINICIAR CONTEO ───────────────────────────────
function actualizarBtnReinicio() {
  const btn = document.getElementById("btnReiniciarConteo");
  if (!btn) return;
  btn.disabled = !(state.postIncidencias && state.selectedRow !== null);
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
  resetearRecepcion();
  focusBarcode();
}

function resetearRecepcion() {
  // Resetear cantidades escaneadas
  state.productos.forEach((p) => { p.cantidadEscaneada = 0; });

  // Resetear flags de estado
  state.postIncidencias = false;
  state.selectedRow = null;
  state.sessionId += 1;

  // Ocultar columna de incidencias y actualizar botones
  ocultarColumnaIncidencias();

  const btn = document.getElementById("btnTerminar");
  const lbl = document.getElementById("btnTerminarLabel");
  btn.classList.remove("btn-finish-final");
  if (lbl) lbl.textContent = "Terminar Parcialidad (F7)";

  // Limpiar panel de producto
  document.getElementById("prodBarcode").value = "";
  document.getElementById("prodDesc").value = "";
  document.getElementById("prodLoc").value = "";
  document.getElementById("prodPTN").value = "";

  renderTable();
  activarModoContenedor();
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
