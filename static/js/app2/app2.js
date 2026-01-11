// -------------------- INICIALIZAR GRÁFICO --------------------
const chartDom = document.getElementById('chart-container');
const myChart = echarts.init(chartDom);

let fechas = [];
let velas = [];

// Configuración base inicial
const baseOption = {
  title: { text: 'Banco del Caribe/USD', left: 'center' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: [], scale: true, boundaryGap: false },
  yAxis: { scale: true },
  series: [{ id: 'candlestick', type: 'candlestick', name: 'Banco del Caribe', data: [] }],
  dataZoom: [
    { type: 'inside', minValueSpan: 5 },
    { type: 'slider', minValueSpan: 5 }
  ]
};
myChart.setOption(baseOption);

// -------------------- FUNCIONES --------------------

// Cargar CSV y actualizar gráfico
function cargarCSV(ruta, label) {
  fetch(ruta)
    .then(res => res.text())
    .then(texto => {
      const filas = texto.trim().split("\n");
      filas.shift(); // quitar cabecera

      fechas = [];
      velas = [];

      filas.forEach(linea => {
        const cols = linea.split(",");
        const date  = cols[0]; // Fecha
        const open  = parseFloat(cols[1]);
        const high  = parseFloat(cols[2]);
        const low   = parseFloat(cols[3]);
        const close = parseFloat(cols[4]);

        if (date && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
          fechas.push(date);
          velas.push([open, close, low, high]);
        }
      });

      // ❌ No invertir, ya que el CSV está en orden cronológico
      cargarGrafica(label, { fechas, velas });
      mostrarMensaje(`✅ Gráfico actualizado: ${label} (${fechas.length} velas)`);
    })
    .catch(err => console.error("Error cargando CSV:", err));
}


// Renderizar gráfica
function cargarGrafica(activo, data) {
  const option = {
    title: { text: `${activo}/USD`, left: 'center' },
    
    // --- MODIFICACIÓN AQUÍ ---
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross' // Esto activa la cruz (líneas punteadas)
      }
    },
    
    xAxis: { 
      type: 'category', 
      data: data.fechas, 
      scale: true, 
      boundaryGap: false,
      // Opcional: etiqueta en el eje X cuando pasas el mouse
      axisPointer: {
        label: { show: true }
      }
    },
    
    yAxis: { 
      scale: true,
      // Opcional: etiqueta en el eje Y cuando pasas el mouse
      axisPointer: {
        label: { show: true }
      }
    },
    // -------------------------

    series: [
      {
        id: 'candlestick',
        type: 'candlestick',
        name: activo,
        data: data.velas,
        itemStyle: {
          color: '#26a69a',
          color0: '#ef5350',
          borderColor: '#26a69a',
          borderColor0: '#ef5350'
        }
      }
    ],
    dataZoom: [
      { type: 'inside', minValueSpan: 5 },
      { type: 'slider', minValueSpan: 5 }
    ]
  };
  myChart.setOption(option, true);
}


// Actualizar gráfico con rango filtrado
function actualizarGrafico(fechasFiltradas, velasFiltradas) {
  myChart.setOption({
    xAxis: { data: fechasFiltradas },
    series: [{ id: 'candlestick', data: velasFiltradas }]
  });
}

// Filtrar por rango temporal
function filtrarRango(meses) {
  if (fechas.length === 0) return;

  const ultima = new Date(fechas[fechas.length - 1]);
  const limite = new Date(ultima);
  limite.setMonth(limite.getMonth() - meses);

  const f = [];
  const v = [];
  for (let i = 0; i < fechas.length; i++) {
    const d = new Date(fechas[i]);
    if (d >= limite) {
      f.push(fechas[i]);
      v.push(velas[i]);
    }
  }

  actualizarGrafico(f, v);
  mostrarMensaje(`Mostrando últimos ${meses} meses (${f.length} velas)`);
}

// -------------------- EVENTOS --------------------

// Botones de rango temporal
document.getElementById('1m').onclick = () => filtrarRango(1);
document.getElementById('3m').onclick = () => filtrarRango(3);
document.getElementById('6m').onclick = () => filtrarRango(6);
document.getElementById('1a').onclick = () => filtrarRango(12);
document.getElementById('2a').onclick = () => filtrarRango(24);
document.getElementById('3a').onclick = () => filtrarRango(36);

// Botones de activos (ejemplo: Banco del Caribe, Provincial)
document.querySelectorAll('aside.panel button[data-symbol]').forEach(btn => {
  btn.addEventListener('click', () => {
    const symbol = btn.dataset.symbol;   // "Banco del Caribe_usd" o "provincial_usd"
    const label = btn.dataset.label;     // "Banco del Caribe" o "Provincial"
    cargarCSV(`/static/csv/accionesusd/${symbol}.csv`, label);
  });
});

// -------------------- CARGA INICIAL --------------------
// Por defecto: Banco del Caribe
cargarCSV('/static/csv/accionesusd/Banco del Caribe_usd.csv', 'Banco del Caribe');

// -------------------- MENSAJES --------------------
function mostrarMensaje(texto) {
  const el = document.getElementById('mensaje');
  if (el) el.innerText = texto;
}
