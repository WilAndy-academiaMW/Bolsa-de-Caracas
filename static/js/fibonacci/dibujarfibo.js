// =========================
// Configuración de niveles Fibonacci
// =========================
const fiboConfig = [
  { level: 0.0,   color: "black",    active: true },
  { level: 0.236, color: "purple",   active: false },
  { level: 0.382, color: "green",    active: true },
  { level: 0.5,   color: "green",    active: true },
  { level: 0.618, color: "yellow",   active: true },
  { level: 0.66,  color: "yellow",   active: true },
  { level: 0.786, color: "cyan",     active: true },
  { level: 1.0,   color: "blue",     active: true }
];

// =========================
// Función principal: dibujar Fibonacci + Canal
// =========================
async function dibujarFibo(chart) {
  // Leer CSV de Fibonacci
  const respFibo = await fetch("/static/fibonnaci/fibonnaci.csv");
  const textFibo = await respFibo.text();
  const rowsFibo = textFibo.trim().split("\n").map(r => r.split(",").map(v => v.trim()));

  // Leer CSV de Canal
  const respCanal = await fetch("/static/fibonnaci/canal.csv");
  const textCanal = await respCanal.text();
  const rowsCanal = textCanal.trim().split("\n").map(r => r.split(",").map(v => v.trim()));

  const option = chart.getOption();
  const fechas = option.xAxis[0].data;
  const fechaInicio = fechas[0];
  const fechaFin = fechas[fechas.length - 1];
  const series = option.series.slice();
  const idxVela = series.findIndex(s => s.type === "candlestick");
  if (idxVela === -1) return;

  if (!series[idxVela].markArea) series[idxVela].markArea = { data: [] };
  if (!series[idxVela].markLine) series[idxVela].markLine = { data: [] };

  // Dibujar Fibonacci
  rowsFibo.forEach((row, idx) => {
    if (idx === 0 && row[0].toLowerCase() === "activo") return;
    const [activoCSV, fechaCSV, alto_one, bajo_one, alto_two, bajo_two] = row;

    const a1 = parseFloat(alto_one);
    const b1 = parseFloat(bajo_one);
    const a2 = parseFloat(alto_two);
    const b2 = parseFloat(bajo_two);

    let high, low;
    if (a1 < a2) {
      low = b1;
      high = a2;
    } else {
      high = a1;
      low = b2;
    }

    const diff = high - low;

    fiboConfig.forEach(cfg => {
      if (!cfg.active) return;

      const value = a1 < a2
        ? high - diff * cfg.level
        : low + diff * cfg.level;

      series[idxVela].markArea.data.push([
        {
          name: `Fib ${cfg.level}`,
          coord: [fechaCSV, value],
          itemStyle: {
            color: "rgba(0,0,0,0.0)",
            borderColor: cfg.color,
            borderWidth: 3
          },
          label: {
            show: true,
            formatter: `Fib ${cfg.level}`,
            position: "inside",
            color: cfg.color
          }
        },
        { coord: [fechaFin, value] }
      ]);
    });
  });

  // Dibujar Canal
// =========================
// 4. Dibujar Canal + Niveles Fibonacci internos
// =========================
rowsCanal.forEach((row, idx) => {
  if (idx === 0 && row[0].toLowerCase() === "activo") return;
  const [activoCSV, fechaCSV, alto_one, bajo_one, alto_two, bajo_two] = row;

  const a1 = parseFloat(alto_one);
  const b1 = parseFloat(bajo_one);
  const a2 = parseFloat(alto_two);
  const b2 = parseFloat(bajo_two);

  const altoMayor = Math.max(a1, a2);
  const bajoMenor = Math.min(b1, b2);
  const rango = altoMayor - bajoMenor;

  // Canal superior
  series[idxVela].markLine.data.push([
    { coord: [fechaInicio, altoMayor], lineStyle: { color: '#00ff00', width: 3 }, label: { show: false } },
    { coord: [fechaFin, altoMayor],   lineStyle: { color: '#00ff00', width: 3 }, label: { show: false } }
  ]);

  // Canal inferior
  series[idxVela].markLine.data.push([
    { coord: [fechaInicio, bajoMenor], lineStyle: { color: '#ff0000', width: 3 }, label: { show: false } },
    { coord: [fechaFin, bajoMenor],    lineStyle: { color: '#ff0000', width: 3 }, label: { show: false } }
  ]);

  // Niveles internos de Fibonacci dentro del canal
  const fibLevels = [
    { f: 0.236, color: '#aa00ff' }, // púrpura
    { f: 0.382, color: '#00ff00' }, // verde
    { f: 0.5,   color: '#00ff00' }, // verde
    { f: 0.618, color: '#ffff00' }, // amarillo
    { f: 0.786, color: '#00ffff' }  // cyan
  ];

  fibLevels.forEach(cfg => {
    const nivel = bajoMenor + rango * cfg.f;
    series[idxVela].markLine.data.push([
      { coord: [fechaInicio, nivel], lineStyle: { color: cfg.color, width: 3 }, label: { show: false } },
      { coord: [fechaFin, nivel],    lineStyle: { color: cfg.color, width: 3 }, label: { show: false } }
    ]);
  });
});

  chart.setOption({ series }, { replaceMerge: ["series"] });
}


// =========================
// Toggle de Fibonacci + Canal
// =========================
let fiboActivo = false;

document.getElementById("dibujarfibo").onclick = async function() {
  const chart = echarts.getInstanceByDom(document.getElementById("chart-container"));
  if (!chart) return;

  const elMsg = document.getElementById("mensaje");

  if (!fiboActivo) {
    elMsg.textContent = "📐 Dibujando Fibonacci + Canal...";
    await dibujarFibo(chart);
    fiboActivo = true;
    elMsg.textContent = "✅ Fibonacci + Canal activos";
  } else {
    const option = chart.getOption();
    const series = option.series.slice();
    const idxVela = series.findIndex(s => s.type === "candlestick");
    if (idxVela !== -1) {
      if (series[idxVela].markArea) series[idxVela].markArea.data = [];
      if (series[idxVela].markLine) series[idxVela].markLine.data = [];
      chart.setOption({ series }, { replaceMerge: ["series"] });
    }
    fiboActivo = false;
    elMsg.textContent = "❌ Fibonacci + Canal desactivados";
  }
};
