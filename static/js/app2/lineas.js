// --- VARIABLES GLOBALES ---
let dibujandoLinea = false;
let puntosSeleccionados = []; // Almacena temporalmente los clics
let lineasGuardadas = [];     // Almacena todas las líneas confirmadas

const btn = document.getElementById('lineastendencia');

// --- 1. ACTIVAR / DESACTIVAR MODO DIBUJO ---
btn.addEventListener('click', () => {
  dibujandoLinea = !dibujandoLinea;

  // Estilo visual del botón
  btn.style.backgroundColor = dibujandoLinea ? '#26a69a' : '';
  btn.style.color = dibujandoLinea ? 'white' : '';
  
  // Cambiar el cursor del mouse
  const zr = myChart.getZr();
  if (dibujandoLinea) {
    zr.setCursorStyle('crosshair');
    mostrarMensaje("📍 DIBUJO ACTIVO: Haz clic en el primer punto");
  } else {
    zr.setCursorStyle('default');
    mostrarMensaje("Modo dibujo desactivado");
    puntosSeleccionados = []; // Limpiar selección incompleta
  }
});

// --- 2. CAPTURAR CLICS EN CUALQUIER PARTE DEL CANVAS ---
myChart.getZr().on('click', function (params) {
  if (!dibujandoLinea) return;

  // A. Convertir Píxeles (pantalla) a Coordenadas Lógicas (Gráfico)
  // Usamos 'grid' para referirnos al área principal del gráfico
  const pointInPixel = [params.offsetX, params.offsetY];
  
  // finder: { seriesIndex: 0 } fuerza a usar el sistema de coordenadas de las velas
  const pointInGrid = myChart.convertFromPixel({ seriesIndex: 0 }, pointInPixel);

  // Si el clic fue fuera del gráfico (ej: en los títulos), pointInGrid será null
  if (!pointInGrid) return;

  // B. Procesar Coordenadas
  // Eje X: En 'category', el valor es el ÍNDICE del array. Lo redondeamos.
  const xIndex = Math.round(pointInGrid[0]); 
  const yValue = pointInGrid[1]; // Precio

  // C. Obtener la FECHA real (String) basada en el índice
  // Esto es CRUCIAL: Necesitamos la fecha, no el número, para que la línea se pegue a la vela.
  const currentOption = myChart.getOption();
  const listaFechas = currentOption.xAxis[0].data;
  const fechaReal = listaFechas[xIndex];

  // Validación: Si hicimos clic en un área vacía sin fecha asociada
  if (!fechaReal) {
    console.warn("Clic fuera del rango de fechas válido");
    return;
  }

  // D. Guardar punto
  puntosSeleccionados.push({
    xAxis: fechaReal, // Usamos la fecha (String)
    yAxis: yValue     // Usamos el precio (Float)
  });

  // Feedback inmediato al usuario
  if (puntosSeleccionados.length === 1) {
    mostrarMensaje(`Punto 1 fijado en: ${fechaReal} @ ${yValue.toFixed(2)}`);
  }

  // --- 3. TRAZAR LA LÍNEA CUANDO TENGAMOS 2 PUNTOS ---
  if (puntosSeleccionados.length === 2) {
    const p1 = puntosSeleccionados[0];
    const p2 = puntosSeleccionados[1];

    // Estructura exacta que pide ECharts
    const nuevaLineaData = [
      { coord: [p1.xAxis, p1.yAxis] }, // Inicio
      { coord: [p2.xAxis, p2.yAxis] }  // Fin
    ];

    lineasGuardadas.push(nuevaLineaData);

    // Actualizar el gráfico
    myChart.setOption({
      series: [
        {
          id: 'candlestick', // DEBE COINCIDIR con tu main.js
          markLine: {
            symbol: ['circle', 'circle'], // Puntos en los extremos
            symbolSize: 6,
            animation: false, // Desactiva animación para que se sienta instantáneo
            silent: true,     // La línea no interfiere con el mouse
            lineStyle: {
              color: '#FFD700', // Amarillo
              width: 2,
              type: 'solid'
            },
            data: lineasGuardadas // Pasamos TODO el historial de líneas
          }
        }
      ]
    });

    mostrarMensaje("✅ Línea Trazada");
    puntosSeleccionados = []; // Reiniciar para la siguiente línea
  }
});