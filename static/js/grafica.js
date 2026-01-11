// -------------------- INICIALIZAR GRÁFICOS --------------------
const chartDomCandles = document.getElementById('chart-candles');
const chartDomProfile = document.getElementById('chart-profile');

const myChartCandles = echarts.init(chartDomCandles);
const myChartProfile = echarts.init(chartDomProfile); // este empieza oculto

let fechas = [];
let fechasDate = []; // 🔧 guardamos objetos Date
let velas = [];
let volumenes = []; // 🔧 aquí guardamos el volumen
let rotacion = 0; // 0, 90, 270

// -------------------- OPCIÓN BASE PARA VELAS --------------------
const baseOptionCandles = {
  title: { text: 'Banco del Caribe/USD', left: 'center' },
  tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
  grid: { containLabel: true },
  xAxis: {
    type: 'category',
    data: [],
    scale: true,
    boundaryGap: false,
    position: 'bottom',
    axisLabel: { align: 'right' },
    inverse: false
  },
  yAxis: { scale: true },
  series: [{
    id: 'candlestick',
    type: 'candlestick',
    name: 'Banco del Caribe',
    data: []
  }],
  dataZoom: [
    { type: 'inside', minValueSpan: 5 },
    { type: 'slider', minValueSpan: 5 }
  ]
};
myChartCandles.setOption(baseOptionCandles);

// -------------------- TOGGLE ENTRE GRÁFICOS --------------------
document.getElementById("toggleCharts").addEventListener("click", () => {
  if (chartDomCandles.style.display !== "none") {
    chartDomCandles.style.display = "none";
    chartDomProfile.style.display = "block";
  } else {
    chartDomProfile.style.display = "none";
    chartDomCandles.style.display = "block";
  }
});

// -------------------- ROTACIÓN --------------------
function aplicarRotacion(deg) {
  rotacion = 0;
  chartDomCandles.style.transformOrigin = 'center center';
  chartDomCandles.style.transform = '';
  ajustarTamanio();
  myChartCandles.resize();
}


function ajustarTamanio() {
  const parent = chartDomCandles.parentElement;
  if (!parent) return;
  const pw = parent.clientWidth || window.innerWidth;
  const ph = parent.clientHeight || window.innerHeight;
  if (rotacion === 90 || rotacion === 270) {
    chartDomCandles.style.width = `${ph}px`;
    chartDomCandles.style.height = `${pw}px`;
  } else {
    chartDomCandles.style.width = `${pw}px`;
    chartDomCandles.style.height = `${ph}px`;
  }
}
window.addEventListener('resize', () => {
  ajustarTamanio();
  myChartCandles.resize();
});

// -------------------- PARSEO CSV --------------------
function limpiarHeader(h) {
  return h.replace(/\uFEFF/g, '').trim();
}
function toLowerNoDots(h) {
  return limpiarHeader(h).toLowerCase().replace(/\./g, '');
}
function findIndex(headers, candidates) {
  const H = headers.map(toLowerNoDots);
  for (const cand of candidates) {
    const c = cand.toLowerCase().replace(/\./g, '');
    const idx = H.indexOf(c);
    if (idx !== -1) return idx;
  }
  return -1;
}
function parseDateFlexible(s) {
  const t = s.replace(/\./g, '-').replace(/\//g, '-').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(t);
  if (/^\d{2}-\d{2}-\d{4}$/.test(t)) {
    const [dd, mm, yyyy] = t.split('-').map(x => parseInt(x, 10));
    return new Date(yyyy, mm - 1, dd);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(t)) {
    const [mm, dd, yyyy] = t.split('-').map(x => parseInt(x, 10));
    return new Date(yyyy, mm - 1, dd);
  }
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
function cargarCSV(ruta, label) {
  fetch(ruta)
    .then(res => res.text())
    .then(texto => {
      const filas = texto.split(/\r?\n/).filter(l => l.length > 0);
      if (filas.length === 0) {
        mostrarMensaje("❌ CSV vacío");
        return;
      }
      const cabeceraRaw = filas.shift().split(",");
      const cabecera = cabeceraRaw.map(limpiarHeader);

      const idxDate  = findIndex(cabecera, ["Date", "fecha"]);
      const idxOpen  = findIndex(cabecera, ["Apert._USD", "Open_USD", "Apertura_USD"]);
      const idxClose = findIndex(cabecera, ["Cierre_USD", "Close_USD"]);
      const idxHigh  = findIndex(cabecera, ["Max._USD", "High_USD"]);
      const idxLow   = findIndex(cabecera, ["Min._USD", "Low_USD"]);
      const idxVol   = findIndex(cabecera, ["efectivo", "efectivo_USD"]);

      fechas = [];
      fechasDate = [];
      velas = [];
      volumenes = [];

      for (let i = 0; i < filas.length; i++) {
        const cols = filas[i].split(",");
        const dateStr = cols[idxDate] ? cols[idxDate].trim() : null;
        const open  = idxOpen  !== -1 ? parseFloat(cols[idxOpen])  : NaN;
        const close = idxClose !== -1 ? parseFloat(cols[idxClose]) : NaN;
        const high  = idxHigh  !== -1 ? parseFloat(cols[idxHigh])  : NaN;
        const low   = idxLow   !== -1 ? parseFloat(cols[idxLow])   : NaN;
        const vol   = idxVol   !== -1 ? parseFloat(cols[idxVol])   : NaN;

        const d = dateStr ? parseDateFlexible(dateStr) : null;

        if (d && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
          fechas.push(dateStr);
          fechasDate.push(d);
          velas.push([open, close, low, high]);
          volumenes.push(isNaN(vol) ? 0 : vol);
        }
      }

      cargarGrafica(label, { fechas, velas });
      mostrarMensaje(`✅ Gráfico actualizado: ${label} (${fechas.length} velas)`);
      console.log(`[CSV] ${label}: ${fechas.length} filas cargadas`);

      // 🔧 Aquí actualizamos los paneles de volumen
      actualizarPanelesVolumen(fechas, velas, volumenes);
    })
    .catch(err => {
      console.error("Error cargando CSV:", err);
      mostrarMensaje("❌ Error cargando CSV");
    });
}

function cargarGrafica(activo, data) {
  const option = {
    title: { text: `${activo}/USD`, left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { containLabel: true },
    xAxis: { type: 'category', data: data.fechas, boundaryGap: false, axisLabel: { align: 'right' }, inverse: true },
    yAxis: { scale: true },
    series: [{
      id: 'candlestick',
      type: 'candlestick',
      name: activo,
      data: data.velas,
      itemStyle: {
        color: '#26a69a',
        color0: '#ef5350',
        borderColor: '#2bff00ff',
        borderColor0: '#ef5350'
      }
    }],
    dataZoom: [
      { type: 'inside', minValueSpan: 5 },
      { type: 'slider', minValueSpan: 5 }
    ]
  };
  myChartCandles.setOption(option, true);
}
function actualizarGrafico(fechasFiltradas, velasFiltradas) {
  myChartCandles.setOption({
    xAxis: { data: fechasFiltradas },
    series: [{ id: 'candlestick', data: velasFiltradas }]
  });
}

function filtrarRango(meses) {
  if (fechas.length === 0 || fechasDate.length === 0) {
    console.warn("[Filtro] No hay datos cargados aún.");
    return;
  }

  // 🔧 Ordenamos las fechas junto con velas
  const indicesOrdenados = fechasDate
    .map((d, i) => ({ d, i }))
    .sort((a, b) => a.d - b.d)
    .map(obj => obj.i);

  const fechasOrd = indicesOrdenados.map(i => fechas[i]);
  const fechasDateOrd = indicesOrdenados.map(i => fechasDate[i]);
  const velasOrd = indicesOrdenados.map(i => velas[i]);

  // 🔧 Tomamos la última fecha real
  const ultima = fechasDateOrd[fechasDateOrd.length - 1];
  const limite = new Date(ultima);
  limite.setMonth(limite.getMonth() - meses);

  // 🔧 Filtramos
  const f = [];
  const v = [];
  for (let i = 0; i < fechasOrd.length; i++) {
    if (fechasDateOrd[i] >= limite) {
      f.push(fechasOrd[i]);
      v.push(velasOrd[i]);
    }
  }

  actualizarGrafico(f, v);
  mostrarMensaje(`Mostrando últimos ${meses} meses (${f.length} velas)`);
  console.log(`[Filtro] ${meses} meses -> ${f.length} puntos`);
}
// -------------------- EVENTOS (DOM listo) --------------------
document.addEventListener('DOMContentLoaded', () => {
  const B1 = document.getElementById('1m');
  const B3 = document.getElementById('3m');
  const B6 = document.getElementById('6m');
  const B12 = document.getElementById('1a');
  const B24 = document.getElementById('2a');
  const B36 = document.getElementById('3a');

  if (B1) B1.addEventListener('click', () => { console.log('[Click] 1m'); filtrarRango(1); });
  if (B3) B3.addEventListener('click', () => { console.log('[Click] 3m'); filtrarRango(3); });
  if (B6) B6.addEventListener('click', () => { console.log('[Click] 6m'); filtrarRango(6); });
  if (B12) B12.addEventListener('click', () => { console.log('[Click] 1a'); filtrarRango(12); });
  if (B24) B24.addEventListener('click', () => { console.log('[Click] 2a'); filtrarRango(24); });
  if (B36) B36.addEventListener('click', () => { console.log('[Click] 3a'); filtrarRango(36); });

  document.querySelectorAll('aside.panel button[data-symbol]').forEach(btn => {
    btn.addEventListener('click', () => {
      const symbol = btn.dataset.symbol;
      const label = btn.dataset.label;
      console.log(`[Activo] ${label} -> ${symbol}`);
      cargarCSV(`/static/csv/accionesusd2/${symbol}.csv`, label);
    });
  });

  // Carga inicial
  cargarCSV('/static/csv/accionesusd2/banco caribe_usd.csv', 'Banco del Caribe');

  // Mensajes y rotación
  aplicarRotacion(0);
});

// -------------------- MENSAJES --------------------
function mostrarMensaje(texto) {
  const el = document.getElementById('mensaje');
  if (el) el.innerText = texto;
}
