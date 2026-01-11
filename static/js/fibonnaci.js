let fiboActivo3 = false;

function mostrarFibonacci() {
  const myChart = echarts.getInstanceByDom(document.getElementById("chart-container"));
  if (!myChart) {
    mostrarMensaje("⚠️ No se encontró el gráfico");
    return;
  }

  // Obtener datos directamente del gráfico
  const option = myChart.getOption();
  const series = option.series.find(s => s.type === 'candlestick');
  if (!series || !series.data || series.data.length < 2) {
    mostrarMensaje("⚠️ No hay suficientes velas para calcular Fibonacci");
    return;
  }

  // Si ya está activo → limpiar y salir
  if (fiboActivo3) {
    myChart.setOption({ graphic: [] }, { replaceMerge: ['graphic'] });
    fiboActivo3 = false;
    mostrarMensaje("❌ Fibonacci eliminado del gráfico");
    return;
  }

  // Detectar máximo y mínimo usando High/Low
  const highs = series.data.map(d => d[3]); // High
  const lows  = series.data.map(d => d[2]); // Low
  const max = Math.max(...highs);
  const min = Math.min(...lows);

  const niveles = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const fibLevels = niveles.map(n => ({
    valor: max - (max - min) * n,
    porcentaje: (n * 100).toFixed(1) + "%"
  }));

  const graphics = [];

  // Dibujar líneas horizontales y etiquetas
  fibLevels.forEach(f => {
    const yPixel = myChart.convertToPixel({ yAxisIndex: 0 }, f.valor);
    const width = myChart.getWidth();

    graphics.push({
      type: 'line',
      shape: { x1: 0, y1: yPixel, x2: width, y2: yPixel },
      style: { stroke: '#05ff2aff', lineWidth: 5 }
    });

    graphics.push({
      type: 'text',
      style: {
        x: 10,
        y: yPixel -40,
        text: `${f.porcentaje} (${f.valor.toFixed(2)})`,
        fill: '#fefefeff',
        fontSize: 25,
        fontWeight: 'bold'
      }
    });
  });

  myChart.setOption({ graphic: graphics }, { replaceMerge: ['graphic'] });
  fiboActivo3 = true;
  mostrarMensaje("✅ Fibonacci dibujado en el gráfico");
}

// Botón
document.getElementById("btn-fibo")?.addEventListener("click", () => {
  mostrarFibonacci();
});
