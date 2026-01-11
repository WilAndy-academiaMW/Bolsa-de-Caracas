let fiboClicks = [];

function activarFibonacci() {
  const chart = echarts.getInstanceByDom(document.getElementById("chart-container"));
  if (!chart) {
    console.error("Fibonacci: no hay gráfico activo.");
    return;
  }

  fiboClicks = [];
  chart.off('click');

  mostrarMensaje("👉 Haz clic en la primera vela para Fibonacci");

  chart.on('click', function (params) {
    if (params.seriesType !== 'candlestick') return;

    const fecha = params.name;
    const valores = params.data;
    const precioHigh = valores[4]; // Alto
    const precioLow  = valores[3]; // Bajo
    const activo = getActivo();

    fiboClicks.push({ fecha, precioHigh, precioLow });

    if (fiboClicks.length === 1) {
      mostrarMensaje(`✅ Primera vela capturada: ${fecha}`);
      mostrarMensaje("👉 Ahora haz clic en la segunda vela para Fibonacci");
    } else if (fiboClicks.length === 2) {
      mostrarMensaje(`✅ Segunda vela capturada: ${fecha}`);
      mostrarMensaje(`📌 Fibonacci entre ${fiboClicks[0].fecha} y ${fiboClicks[1].fecha}`);

      // Guardar en backend
      fetch('/guardar_fibo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo,
          fecha: fiboClicks[0].fecha, // fecha de referencia
          alto_one: fiboClicks[0].precioHigh,
          bajo_one: fiboClicks[0].precioLow,
          alto_two: fiboClicks[1].precioHigh,
          bajo_two: fiboClicks[1].precioLow
        })
      });

      chart.off('click'); // desactivar después de los dos clicks
    }
  });
}

// Botón para activar captura de Fibonacci
document.getElementById("fibonnacci").onclick = activarFibonacci;
