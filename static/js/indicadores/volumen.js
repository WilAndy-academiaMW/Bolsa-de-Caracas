
let isVolumenVisible = false;
let fechas2 = [];
let velas2 = [];
let volumenes2 = [];

function cargarCSV2(ruta, label) {
  fetch(ruta)
    .then(res => res.text())
    .then(texto => {
      const filas = texto.split(/\r?\n/).filter(l => l.length > 0);
      const cabecera = filas.shift().split(",").map(h => h.trim());

      const idxDate  = cabecera.indexOf("Date");
      const idxOpen  = cabecera.indexOf("Apert._USD");
      const idxClose = cabecera.indexOf("Cierre_USD");
      const idxHigh  = cabecera.indexOf("Max._USD");
      const idxLow   = cabecera.indexOf("Min._USD");
      const idxVol   = cabecera.indexOf("efectivo_USD");

      fechas2 = [];
      velas2 = [];
      volumenes2 = [];

      filas.forEach(linea => {
        const cols = linea.split(",");
        const date  = cols[idxDate];
        const open  = parseFloat(cols[idxOpen]);
        const close = parseFloat(cols[idxClose]);
        const high  = parseFloat(cols[idxHigh]);
        const low   = parseFloat(cols[idxLow]);
        const vol   = parseFloat(cols[idxVol]);

        if (date && !isNaN(open) && !isNaN(close) && !isNaN(high) && !isNaN(low)) {
          fechas2.push(date);
          velas2.push([open, close, low, high]);
          volumenes2.push(isNaN(vol) ? 0 : vol);
        }
      });

      const myChart = echarts.init(document.getElementById("chart-candles"));
      myChart.setOption({
        title: { text: `${label}/USD`, left: 'center' },
        xAxis: { type: 'category', data: fechas2 },
        yAxis: [{ id: 'priceAxis', type: 'value' }],
        series: [{
          type: 'candlestick',
          data: velas2,
          itemStyle: { color: '#26a69a', color0: '#ef5350' }
        }]
      });
    });
}

function mostrarVolumen2() {
  const myChart = echarts.getInstanceByDom(document.getElementById("chart-candles"));
  if (!myChart || !velas2.length) return;

  // Si ya está visible, lo ocultamos
  if (isVolumenVisible) {
    // Filtramos para quitar la serie del volumen y el eje del volumen
    const opcionesActuales = myChart.getOption();
    const soloVelas = opcionesActuales.series.filter(s => s.id !== 'volOverlay2');
    const sinVolAxis = opcionesActuales.yAxis.filter(y => y.id !== 'volAxis');

    myChart.setOption({
      yAxis: sinVolAxis,
      series: soloVelas
    }, { replaceMerge: ['series', 'yAxis'] }); // Importante para limpiar la memoria del gráfico

    isVolumenVisible = false;
    mostrarMensaje("❌ Volumen eliminado");
    return;
  }

  // --- PREPARACIÓN DE DATOS (Sin escalar los valores, usamos los reales) ---
  const volumenData = velas2.map((d, i) => {
    const close = d[1];
    const prevClose = i > 0 ? velas2[i - 1][1] : close;
    const volReal = volumenes2[i];
    // Color: Verde si subió, Rojo si bajó (o usa tus colores hexadecimales)
    const color = close >= prevClose ?  "#22ff00ff":"#ff0000ff";

    return {
      value: volReal, // <--- AQUÍ: Usamos el valor real, sin matemáticas raras
      itemStyle: { color: color }
    };
  });

  // --- CONFIGURACIÓN DEL EJE Y ---
  const yAxisArray = [
    ...myChart.getOption().yAxis, // Mantenemos el eje de precios existente
    {
      id: 'volAxis',
      type: 'value',
      position: 'right',     // Lo ponemos a la derecha (opcional)
      splitLine: { show: false }, // Sin líneas horizontales para no ensuciar
      axisLabel: { show: false }, // Ocultamos los números del eje para limpieza visual
      axisTick: { show: false },
      axisLine: { show: false },
      // TRUCO DE ORO: Multiplicamos el máximo por 4 o 5.
      // Esto hace que las barras solo ocupen el 20-25% inferior del gráfico.
      max: function (value) {
        return value.max * 4; 
      }
    }
  ];

  // --- APLICAR CAMBIOS ---
  myChart.setOption({
    // Activamos el tooltip global para ver datos al pasar el mouse
    tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
    },
    yAxis: yAxisArray,
    series: [
      ...myChart.getOption().series,
      {
        id: "volOverlay2",
        name: "Efectivo USD", // Nombre que saldrá en el tooltip
        type: "bar",
        data: volumenData,
        xAxisIndex: 0,
        yAxisIndex: 1, // <--- Importante: Vinculamos esta serie al SEGUNDO eje Y (índice 1)
        barWidth: "60%",
        z: 1, // Z-index bajo para que quede detrás de líneas si es necesario
        // Personalizamos el tooltip para que se vea bonito el dinero
        tooltip: {
             valueFormatter: (value) => {
                // Formato de moneda: "1,234.56"
                return new Intl.NumberFormat('en-US', { 
                    style: 'decimal', 
                    minimumFractionDigits: 2 
                }).format(value);
             }
        }
      }
    ]
  });

  isVolumenVisible = true;
  mostrarMensaje("✅ Volumen activado (Valores reales)");
}

document.getElementById("volumen").addEventListener("click", () => mostrarVolumen2());


function mostrarMensaje(texto) {
  const el = document.getElementById("mensaje");
  if (el) el.innerText = texto;
}

// --- Carga inicial ---
cargarCSV2("static/csv/accionesusd2/banco caribe_usd.csv", "Banco del Caribe");

