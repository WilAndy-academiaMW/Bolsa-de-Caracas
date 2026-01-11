let allData = [];
let showVolume = false;
let currentYears = 1;

document.getElementById("csvFile").addEventListener("change", function(e) {
  Papa.parse(e.target.files[0], {
    header: true,
    complete: function(results) {
      // Guardar todos los datos del CSV
      allData = results.data.filter(d => d.Date && d.Open && !d.Date.startsWith("Date"));
      // Graficar inicial (1 año)
      filterYears(1);
    }
  });
});

function filterYears(years) {
  currentYears = years;
  if (allData.length === 0) {
    alert("Primero carga un CSV.");
    return;
  }
  const slice = allData.slice(-365 * years);

  const dates = slice.map(d => d.Date);
  const open = slice.map(d => parseFloat(d.Open));
  const high = slice.map(d => parseFloat(d.High));
  const low = slice.map(d => parseFloat(d.Low));
  const close = slice.map(d => parseFloat(d.Close));
  const volume = slice.map(d => parseFloat(d["Volume USDT"] || 0));

  const traceCandles = {
    x: dates,
    open, high, low, close,
    type: "candlestick",
    name: "BTC"
  };

  const traceVolume = {
    x: dates,
    y: volume,
    type: "bar",
    name: "Volumen",
    marker: { color: "#6ee7ff" },
    yaxis: "y2"
  };

  const layout = {
    dragmode: "zoom",
    margin: { r: 50, t: 25, b: 40, l: 60 },
    showlegend: false,
    xaxis: { rangeslider: { visible: false } },
    yaxis: { title: "Precio USD" },
    yaxis2: {
      title: "Volumen USDT",
      overlaying: "y",
      side: "right",
      showgrid: false,
      visible: showVolume
    }
  };

  const traces = showVolume ? [traceCandles, traceVolume] : [traceCandles];
  Plotly.newPlot("chart", traces, layout);
}

function toggleVolume() {
  showVolume = !showVolume;
  filterYears(currentYears);
}



