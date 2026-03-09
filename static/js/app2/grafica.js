// 1. VARIABLES DE ESTADO Y CONFIGURACIÓN
var chartDom = document.getElementById('grafica');
var myChart = echarts.init(chartDom);
let tickerActual = "ABC.A"; 

// --- NUEVA FUNCIÓN: loadCSV (Indispensable para que funcione) ---
async function loadCSV(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error("No se encontró el archivo CSV");
        const data = await response.text();
        
        const rows = data.trim().split('\n').slice(1); // Saltar encabezado
        let dates = [];
        let ohlc = [];

        rows.forEach(row => {
            const cols = row.split(',');
            if (cols.length >= 5) {
                dates.push(cols[0]); // Fecha
                ohlc.push([
                    parseFloat(cols[1]), // Open
                    parseFloat(cols[4]), // Close
                    parseFloat(cols[3]), // Low
                    parseFloat(cols[2])  // High
                ]);
            }
        });
        return { dates, ohlc };
    } catch (error) {
        console.error("Error cargando CSV:", error);
        return { dates: [], ohlc: [] };
    }
}

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    inicializarGrafico("ABC.A", "ABC.A");
});

async function inicializarGrafico(archivo, nombre) {
    tickerActual = archivo;
    // RUTA CORREGIDA: Usando /static/ al inicio
    const { dates, ohlc } = await loadCSV(`/static/csv/accionesusd/${archivo}.csv`);
    
    if (dates.length === 0) {
        console.error("No hay datos para mostrar");
        return;
    }

    const option = {
        backgroundColor: '#000000',
        title: { text: nombre, left: 'center', textStyle: { color: '#ffffff' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        grid: { left: '5%', right: '12%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#8392A5' } } },
        yAxis: { scale: true, splitLine: { lineStyle: { color: '#272727' } } },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], start: 80, end: 100 },
            { type: 'slider', xAxisIndex: [0], top: '90%', start: 80, end: 100 }
        ],
        series: [{
            name: 'Precio',
            type: 'candlestick',
            data: ohlc,
            itemStyle: {
                color: '#26a69a', color0: '#ef5350',
                borderColor: '#26a69a', borderColor0: '#ef5350'
            }
        }]
    };

    myChart.setOption(option, true); 
    
    // Comenta estas si aún no has cargado los otros scripts .js
    // cargarFiboGuardado(tickerActual);
    // cargarZonasMemoria(tickerActual);
  
    
    cargarFiboGuardado(tickerActual);

        
}

// 3. CAMBIO DE ACTIVO
/**
 * Cambia el activo actual, carga su CSV y restaura sus indicadores guardados.
 */
async function cargarNuevoCSV(archivo, nombreLegible) {
    // 1. Actualizar el ticker global para que las demás funciones sepan qué moneda es
    tickerActual = archivo;

    // 2. Resetear el estado del botón de Ocultar/Mostrar Fibonacci
    const btnOcultar = document.getElementById('fibo-off');
    if (btnOcultar) {
        btnOcultar.innerText = "Ocultar Fibonacci";
        fiboVisible = true; // Variable que controla el toggle
    }

    // 3. Limpiar visualmente el Fibonacci y zonas anteriores antes de cargar lo nuevo
    // Esto evita que el Fibo de BTC se vea un segundo sobre la gráfica de ETH
    myChart.setOption({
        series: [{
            name: 'Precio',
            markLine: { data: [] }, // Limpia Fibo
            markArea: { data: [] }  // Limpia Zonas
        }]
    }, false);

    // 4. Cargar los datos del nuevo CSV
    const path = `/static/csv/accionesusd/${archivo}.csv`;
    const { dates, ohlc } = await loadCSV(path);

    if (dates.length > 0) {
        // 5. Renderizar las nuevas velas y el nuevo título
        myChart.setOption({
            title: { text: `Gráfico: ${nombreLegible}` },
            xAxis: { data: dates },
            series: [{
                name: 'Precio',
                data: ohlc
            }]
        });

        // 6. RECARGAR INDICADORES GUARDADOS
        // Usamos un retraso (500ms) para asegurar que ECharts terminó de 
        // procesar las nuevas fechas, de lo contrario el Fibo no se dibujará.
        setTimeout(() => {
            console.log("Restaurando indicadores para: " + tickerActual);
            
            // Cargar Fibonacci desde Python
            if (typeof cargarFiboGuardado === 'function') {
                cargarFiboGuardado(tickerActual);
            }
            
            // Cargar Zonas desde Python (si las tienes implementadas)
            if (typeof cargarZonasMemoria === 'function') {
                cargarZonasMemoria(tickerActual);
            }
        }, 500);

        // Mensaje de feedback
        const mensajeDiv = document.getElementById('mensaje');
        if (mensajeDiv) mensajeDiv.innerText = `Activo cambiado a ${nombreLegible}`;
    } else {
        console.error("No se pudo cargar el archivo: " + path);
    }
}

window.addEventListener('resize', () => myChart.resize());