let isVolumeProfileVisible = false;
const lastClose = (velas && velas.length) ? velas[velas.length - 1][1] : null;

// Botón para activar/desactivar el Volume Profile
const btnVolumeProfile = document.getElementById("VolumeProfile");
if (btnVolumeProfile) {
  btnVolumeProfile.addEventListener("click", () => toggleVolumeProfile());
}

// Función para calcular el Volume Profile
function calcularVolumeProfile(velas, volumenes, numBins = 50) {
  if (!Array.isArray(velas) || velas.length === 0) return [];

  const minPrice = Math.min(...velas.map(v => v[2])); // low
  const maxPrice = Math.max(...velas.map(v => v[3])); // high;
  const range = maxPrice - minPrice;
  const binSize = (range === 0) ? 1 : range / numBins;

  const bins = new Array(numBins).fill(0);

  velas.forEach((v, i) => {
    const price = v[1]; // cierre
    let binIndex = Math.floor((price - minPrice) / binSize);
    if (binIndex >= numBins) binIndex = numBins - 1;
    if (binIndex < 0) binIndex = 0;
    const vol = Number.isFinite(volumenes[i]) ? volumenes[i] : 0;
    bins[binIndex] += vol;
  });

  return bins.map((vol, idx) => {
    const startPrice = minPrice + idx * binSize;
    return {
      value: [vol, startPrice, startPrice + binSize]
    };
  });
}

// Toggle Volume Profile
function toggleVolumeProfile() {
  const chartDom = document.getElementById("chart-candles");
  const myChart = echarts.getInstanceByDom(chartDom);
  if (!myChart || !Array.isArray(velas) || velas.length === 0) {
    mostrarMensaje("❌ No hay datos de velas para calcular el Volume Profile");
    return;
  }

  if (isVolumeProfileVisible) {
    // Apagar: eliminar la serie con id "volumeProfile"
    const opciones = myChart.getOption();
    const seriesSinProfile = opciones.series.filter(s => s.id !== "volumeProfile");
    myChart.setOption({ series: seriesSinProfile }, { replaceMerge: ['series'] });
    isVolumeProfileVisible = false;
    mostrarMensaje("❌ Volume Profile eliminado");
    return;
  }

  // Encender
  const numBins = 60;
  const profileData = calcularVolumeProfile(velas, volumen, numBins);
  if (!profileData.length) {
    mostrarMensaje("❌ No se pudo calcular el Volume Profile");
    return;
  }

  const maxVolProfile = Math.max(...profileData.map(d => d.value[0]), 1);

  myChart.setOption({
    series: [
      ...myChart.getOption().series,
      {
        id: "volumeProfile",
        name: "Volume Profile",
        type: "custom",
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 0,
        // dentro de la serie "volumeProfile", reemplaza renderItem por este:
      // Asume que maxVolProfile está definido en el scope exterior
// y que `velas` existe; además definimos lastClose para colorear
  
renderItem: function (params, api) { 
  const val = Number(api.value(0)) || 0;
  const priceMin = Number(api.value(1));
  const priceMax = Number(api.value(2));
  const priceMid = (priceMin + priceMax) / 2;

  // Coordenadas Y
  const pTop = api.coord([0, priceMax]) || [0, 0];
  const pBottom = api.coord([0, priceMin]) || [0, 0];
  const yTop = pTop[1];
  const yBottom = pBottom[1];
  const height = Math.max(Math.abs(yBottom - yTop), 1);

  // CoordSys y dimensiones
  const coordSys = params.coordSys || {};
  const gridX = coordSys.x || 0;
  const gridWidth = coordSys.width || (api.getWidth ? api.getWidth() * 0.9 : 400);

  // Escalado para ancho (más agresivo, sin min gigante)
  const maxWidthPixels = gridWidth * 0.85;          // hasta 85% del grid
  const normalized = (maxVolProfile > 0) ? (val / maxVolProfile) : 0;
  const scaled = Math.pow(normalized, 0.5);        // potencia <1 realza pequeños
  const barWidth = Math.max(scaled * maxWidthPixels, 500); // mínimo razonable 6px

  // Color según relación con el último cierre (puedes invertir lógica)
  let fillColor = 'rgba(77,166,255,0.65)'; // default azul
  if (lastClose !== null) {
    if (priceMid > lastClose) fillColor = 'rgba(0, 255, 106, 0.65)'; // verde si por encima
    else if (priceMid < lastClose) fillColor = 'rgba(239,83,80,0.65)'; // rojo si por debajo
  }

  // Posición X: derecha hacia la izquierda
  const xEnd = gridX + gridWidth;
  const xStart = xEnd - barWidth;

  // Opcional: etiqueta pequeña con volumen (solo si el bar es suficientemente ancho)
  const showLabel = barWidth > 30;

  return {
    type: 'group',
    children: [
      {
        type: 'rect',
        shape: {
          x: xStart,
          y: Math.min(yTop, yBottom),
          width: barWidth,
          height: height
        },
        style: api.style({
          fill: fillColor,
          stroke: '#333',
          lineWidth: 0.6,
          opacity: 0.75
        })
      },
      ...(showLabel ? [{
        type: 'text',
        style: {
          x: xStart + 6,
          y: Math.min(yTop, yBottom) + 12,
          text: (val >= 1000) ? (Math.round(val/1000) + 'k') : String(Math.round(val)),
          fill: '#fff',
          font: '11px sans-serif'
        }
      }] : [])
    ]
  };
},



        data: profileData,
        tooltip: {
          formatter: (params) => {
            return `Rango: ${params.value[1].toFixed(2)} - ${params.value[2].toFixed(2)}<br>Vol: ${new Intl.NumberFormat().format(params.value[0])}`;
          }
        }
      }
    ]
  }, { replaceMerge: ['series'] });

  isVolumeProfileVisible = true;
  mostrarMensaje("✅ Volume Profile Lateral Activado");
}

// Mensajes
function mostrarMensaje(texto) {
  const el = document.getElementById("mensaje");
  if (el) el.innerText = texto;
}
