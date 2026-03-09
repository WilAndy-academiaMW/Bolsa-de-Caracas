// 1. VARIABLES DE ESTADO Y CONFIGURACIÓN
var chartDom = document.getElementById('grafica');
var myChart = echarts.init(chartDom);
let tickerActual = "ABC.A"; 

document.addEventListener('DOMContentLoaded', () => {
    inicializarGrafico("ABC.A", "ABC.A");
});

async function inicializarGrafico(archivo, nombre) {
    tickerActual = archivo;
    const { dates, ohlc } = await loadCSV(`/static/csv/accionesusd/${archivo}.csv`);
    
    if (dates.length === 0) return;

    const option = {
        backgroundColor: '#000000',
        title: { text: nombre, left: 'center', textStyle: { color: '#ffffff' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        grid: { left: '5%', right: '12%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#8392A5' } } },
        yAxis: { scale: true, splitLine: { lineStyle: { color: '#272727' } } },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], start: 80, end: 100 }, // Zoom H (Rueda)
            { type: 'slider', xAxisIndex: [0], top: '90%', start: 80, end: 100 }, // Barra H
          //  { type: 'inside', yAxisIndex: [0], start: 0, end: 100 }, // Zoom V (Rueda)
          //  { type: 'slider', yAxisIndex: [0], left: '93%', start: 0, end: 100 } // Barra V
        ],
        series: [{
            name: 'Precio',
            type: 'candlestick',
            data: ohlc,
            markArea: { data: [] }, // Limpia zonas al iniciar
            markLine: { data: [] }, // Limpia Fibo al iniciar
            itemStyle: {
                color: '#26a69a', color0: '#ef5350',
                borderColor: '#26a69a', borderColor0: '#ef5350'
            }
        }]
    };

    // El 'true' aquí es VITAL: Borra todo rastro de la moneda anterior
    myChart.setOption(option, true); 
    
    cargarFiboGuardado(tickerActual);
    cargarZonasMemoria(tickerActual);
}

async function cargarNuevoCSV(archivo, nombreLegible) {
    tickerActual = archivo;
    const path = `../static/csv/accionesusd/${archivo}.csv`;
    const { dates, ohlc } = await loadCSV(path);

    if (dates.length > 0) {
        // Al cambiar de moneda, reseteamos las series por completo
        myChart.setOption({
            title: { text: `Gráfico: ${nombreLegible}` },
            xAxis: { data: dates },
            series: [{
                name: 'Precio',
                data: ohlc,
                markArea: { data: [] }, // Borra zonas de la moneda anterior
                markLine: { data: [] }  // Borra Fibos de la moneda anterior
            }]
        });

        cargarFiboGuardado(tickerActual);
        cargarZonasMemoria(tickerActual);
    }
}

window.addEventListener('resize', myChart.resize);