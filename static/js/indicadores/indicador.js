let isRSIvisible = false;

function mostrarRSI(periodo = 14) {
  const myChart = echarts.getInstanceByDom(document.getElementById("chart-container"));
  if (!myChart) {
    mostrarMensaje("⚠️ No se encontró el gráfico");
    return;
  }

  // Obtener datos directamente del gráfico
  const option = myChart.getOption();
  const series = option.series.find(s => s.type === 'candlestick');
  if (!series || !series.data || series.data.length < periodo) {
    mostrarMensaje("⚠️ No hay suficientes velas para calcular RSI");
    return;
  }

  // Toggle: si ya está activo → limpiar
  if (isRSIvisible) {
    const soloVelas = option.series.filter(s => s.type === 'candlestick');
    const sinRSIaxis = option.yAxis.filter(y => y.id !== 'rsiAxis');

    myChart.setOption({
      yAxis: sinRSIaxis,
      series: soloVelas
    }, { replaceMerge: ['series','yAxis'] });

    isRSIvisible = false;
    mostrarMensaje("❌ RSI eliminado");
    return;
  }

  // Calcular RSI usando Close (índice 1 en candlestick)
  const closes = series.data.map(d => d[1]);
  const deltas = closes.map((c, i) => i === 0 ? 0 : c - closes[i - 1]);
  const gains = deltas.map(d => d > 0 ? d : 0);
  const losses = deltas.map(d => d < 0 ? -d : 0);

  const avgGain = [], avgLoss = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < periodo - 1) { avgGain.push(null); avgLoss.push(null); }
    else if (i === periodo - 1) {
      const g = gains.slice(0, periodo).reduce((a, b) => a + b, 0) / periodo;
      const l = losses.slice(0, periodo).reduce((a, b) => a + b, 0) / periodo;
      avgGain.push(g); avgLoss.push(l);
    } else {
      const prevAvgGain = avgGain[i - 1];
      const prevAvgLoss = avgLoss[i - 1];
      const k = 1 / periodo;
      avgGain.push(prevAvgGain + k * (gains[i] - prevAvgGain));
      avgLoss.push(prevAvgLoss + k * (losses[i] - prevAvgLoss));
    }
  }

  const rsi = avgGain.map((g, i) => {
    const l = avgLoss[i];
    if (g === null || l === null) return null;
    const rs = l === 0 ? (g === 0 ? 0 : Infinity) : g / l;
    return 100 - (100 / (1 + rs));
  });

  const soloVelas = option.series.filter(s => s.type === 'candlestick');
  const sinRSIaxis = option.yAxis.filter(y => y.id !== 'rsiAxis');

  myChart.setOption({
    yAxis: [
      ...sinRSIaxis,
      { id: 'rsiAxis', name: 'RSI', position: 'right', min: 0, max: 100, interval: 10 }
    ],
    series: [
      ...soloVelas,
      {
        name: "RSI",
        type: "line",
        data: rsi,
        smooth: true,
        yAxisIndex: 1,
        lineStyle: { color: "red", width: 2 },
        markLine: {
          symbol: "none",
          lineStyle: { color: "blue", type: "dashed", width: 1 },
          data: [
            { yAxis: 70, name: "Sobrecompra" },
            { yAxis: 30, name: "Sobreventa" }
          ]
        }
      }
    ]
  }, { replaceMerge: ['series','yAxis'] });

  isRSIvisible = true;
  mostrarMensaje("✅ RSI dibujado con líneas en 70 y 30");
}

document.getElementById("btnRSI").addEventListener("click", () => mostrarRSI());


let isMACDvisible = false;

function mostrarMACD() {
  const myChart = echarts.getInstanceByDom(document.getElementById("chart-container"));
  if (!myChart) {
    mostrarMensaje("⚠️ No se encontró el gráfico");
    return;
  }

  const option = myChart.getOption();
  const series = option.series.find(s => s.type === 'candlestick');
  if (!series || !series.data || series.data.length < 30) {
    mostrarMensaje("⚠️ No hay suficientes velas para calcular MACD");
    return;
  }

  // Toggle: si ya está activo → limpiar
  if (isMACDvisible) {
    const soloVelas = option.series.filter(s => s.type === 'candlestick');
    const sinMACDaxis = option.yAxis.filter(y => y.id !== 'macdAxis');

    myChart.setOption({
      yAxis: sinMACDaxis,
      series: soloVelas
    }, { replaceMerge: ['series','yAxis'] });

    isMACDvisible = false;
    mostrarMensaje("❌ MACD eliminado");
    return;
  }

  // Extraer precios de cierre (índice 1 en candlestick)
  const closes = series.data.map(d => d[1]);

  // Función EMA
  function ema(values, span) {
    const k = 2 / (span + 1);
    let emaArr = [];
    for (let i = 0; i < span - 1; i++) emaArr.push(null);
    let prev = values.slice(0, span).reduce((a, b) => a + b, 0) / span;
    emaArr.push(prev);
    for (let i = span; i < values.length; i++) {
      const val = values[i] * k + prev * (1 - k);
      emaArr.push(val); prev = val;
    }
    return emaArr;
  }

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v !== null && ema26[i] !== null ? v - ema26[i] : null);

  const macdValuesForSignal = macdLine.filter(v => v !== null);
  const signalValues = ema(macdValuesForSignal, 9);

  let signalLine = [];
  const initialNulls = macdLine.length - macdValuesForSignal.length;
  for (let i = 0; i < initialNulls; i++) signalLine.push(null);
  signalLine.push(...signalValues);

  const histogram = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i] : null
  );

  const soloVelas = option.series.filter(s => s.type === 'candlestick');
  const sinMACDaxis = option.yAxis.filter(y => y.id !== 'macdAxis');

  // Configurar y agregar MACD
  myChart.setOption({
    yAxis: [
      ...sinMACDaxis,
      {
        id: 'macdAxis',
        name: 'MACD',
        position: 'right',
        splitLine: { show: false },
        axisLabel: { formatter: '{value}', color: 'blue' }
      }
    ],
    series: [
      ...soloVelas,
      {
        name: "MACD",
        type: "line",
        data: macdLine,
        lineStyle: { color: "blue", width: 2 },
        showSymbol: false,
        yAxisIndex: 1
      },
      {
        name: "Signal",
        type: "line",
        data: signalLine,
        lineStyle: { color: "orange", width: 1, type: "dashed" },
        showSymbol: false,
        yAxisIndex: 1
      },
      {
        name: "Histograma",
        type: "bar",
        data: histogram,
        barWidth: '30%', // 👈 barras más delgadas
        itemStyle: { color: p => p.value >= 0 ? "green" : "red" },
        yAxisIndex: 1
      }
    ]
  }, { replaceMerge: ['series','yAxis'] });

  isMACDvisible = true;
  mostrarMensaje("✅ MACD dibujado con barras más delgadas");
}

// Botón
document.getElementById("btnmacd").addEventListener("click", () => mostrarMACD());


let bbActivo = false;

function mostrarBollinger(periodo = 20, factor = 2) {
  const myChart = echarts.getInstanceByDom(document.getElementById("chart-container"));
  if (!myChart) {
    mostrarMensaje("⚠️ No se encontró el gráfico");
    return;
  }

  const option = myChart.getOption();
  const series = option.series.find(s => s.type === 'candlestick');
  if (!series || !series.data || series.data.length < periodo) {
    mostrarMensaje("⚠️ No hay suficientes velas para calcular Bollinger Bands");
    return;
  }

  // Toggle: si ya está activo → limpiar
  if (bbActivo) {
    const soloVelas = option.series.filter(s => s.type === 'candlestick');
    myChart.setOption({ series: soloVelas }, { replaceMerge: ['series'] });
    bbActivo = false;
    mostrarMensaje("❌ Bollinger Bands eliminadas");
    return;
  }

  // Extraer precios de cierre (índice 1 en candlestick)
  const closes = series.data.map(d => d[1]);

  // Función SMA
  function sma(values, period) {
    return values.map((v, i) => {
      if (i < period - 1) return null;
      const slice = values.slice(i - period + 1, i + 1);
      return slice.reduce((a, b) => a + b, 0) / period;
    });
  }

  // Función desviación estándar
  function std(values, period) {
    return values.map((v, i) => {
      if (i < period - 1) return null;
      const slice = values.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      return Math.sqrt(variance);
    });
  }

  const smaBase = sma(closes, periodo);
  const desviacion = std(closes, periodo);

  // Bandas superior e inferior
  const bandaSuperior = smaBase.map((v, i) => v !== null ? v + factor * desviacion[i] : null);
  const bandaInferior = smaBase.map((v, i) => v !== null ? v - factor * desviacion[i] : null);

  const soloVelas = option.series.filter(s => s.type === 'candlestick');

  myChart.setOption({
    series: [
      ...soloVelas,
      { name: "SMA", type: "line", data: smaBase, lineStyle: { color: "yellow", width: 1.5 }, showSymbol: false },
      { name: "Banda Superior", type: "line", data: bandaSuperior, lineStyle: { color: "blue", width: 1 }, showSymbol: false },
      { name: "Banda Inferior", type: "line", data: bandaInferior, lineStyle: { color: "blue", width: 1 }, showSymbol: false }
    ]
  }, { replaceMerge: ['series'] });

  bbActivo = true;
  mostrarMensaje("✅ Bollinger Bands dibujadas en el gráfico");
}

// Botón
document.getElementById("btnbb").addEventListener("click", () => mostrarBollinger());
