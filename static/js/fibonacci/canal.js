// Estado global
let canalActivo = false;
let canalClicks = 0;
let puntosCanal = [];

// =========================
// Función principal
// =========================
function activarCanal() {
  const chart = echarts.getInstanceByDom(document.getElementById("chart-container"));
  if (!chart) {
    console.error("Canal: no hay gráfico activo.");
    return;
  }

  canalActivo = true;
  canalClicks = 0;
  puntosCanal = [];
  chart.off('click');

  mostrarMensaje("👉 Canal activado. Haz clic en dos velas para guardar en CSV.");

  chart.on('click', function (params) {
    if (!canalActivo) return;
    if (params.seriesType !== 'candlestick') return;

    const fecha = params.name;
    const valores = params.data;
    const precioBajo = valores[3];
    const precioAlto = valores[4];
    const activo = getActivo();

    puntosCanal.push({ fecha, alto: precioAlto, bajo: precioBajo });
    canalClicks++;

    mostrarMensaje(`Click ${canalClicks}: ${fecha} → Alto: ${precioAlto}, Bajo: ${precioBajo}`);

    if (canalClicks % 2 === 0) {
      const p1 = puntosCanal[canalClicks - 2];
      const p2 = puntosCanal[canalClicks - 1];

      // Guardar en backend
      fetch('/guardar_canal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo,
          fecha: p1.fecha,
          alto_one: p1.alto,
          bajo_one: p1.bajo,
          alto_two: p2.alto,
          bajo_two: p2.bajo
        })
      });

      mostrarMensaje("✅ Canal guardado en CSV");
      chart.off('click'); // desactivar después de los dos clicks
      canalActivo = false;
    }
  });
}

// =========================
// Listener para el botón con id "canal"
// =========================
window.addEventListener('DOMContentLoaded', () => {
  const btnCanal = document.getElementById("canal");
  if (!btnCanal) {
    console.error('No se encontró el botón con id "canal".');
    return;
  }
  btnCanal.addEventListener("click", () => {
    activarCanal();
  });
});
