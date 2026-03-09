/**
 * BLOQUE DE INDICADORES TÉCNICOS
 * ID unificado: "grafica"
 */

let isRSIvisible = false;
let isMACDvisible = false;
let bbActivo = false;

// Función auxiliar para obtener la instancia actual
function obtenerGrafico() {
    const chart = echarts.getInstanceByDom(document.getElementById("grafica"));
    if (!chart) {
        mostrarMensaje("⚠️ Error: No se inicializó el gráfico principal");
        return null;
    }
    return chart;
}

// --- RSI ---
function mostrarRSI(periodo = 14) {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();
    const series = option.series.find(s => s.type === 'candlestick');
    
    if (!series || !series.data || series.data.length < periodo) {
        mostrarMensaje("⚠️ No hay suficientes datos para RSI");
        return;
    }

    if (isRSIvisible) {
        const soloVelas = option.series.filter(s => s.type === 'candlestick');
        const sinRSIaxis = option.yAxis.filter(y => y.id !== 'rsiAxis');
        myChart.setOption({ yAxis: sinRSIaxis, series: soloVelas }, { replaceMerge: ['series', 'yAxis'] });
        isRSIvisible = false;
        mostrarMensaje("❌ RSI eliminado");
        return;
    }

    const closes = series.data.map(d => d[1]);
    const deltas = closes.map((c, i) => i === 0 ? 0 : c - closes[i - 1]);
    const gains = deltas.map(d => d > 0 ? d : 0);
    const losses = deltas.map(d => d < 0 ? -d : 0);

    const avgGain = [], avgLoss = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < periodo - 1) { avgGain.push(null); avgLoss.push(null); }
        else if (i === periodo - 1) {
            avgGain.push(gains.slice(0, periodo).reduce((a, b) => a + b, 0) / periodo);
            avgLoss.push(losses.slice(0, periodo).reduce((a, b) => a + b, 0) / periodo);
        } else {
            const k = 1 / periodo;
            avgGain.push(avgGain[i - 1] + k * (gains[i] - avgGain[i - 1]));
            avgLoss.push(avgLoss[i - 1] + k * (losses[i] - avgLoss[i - 1]));
        }
    }

    const rsi = avgGain.map((g, i) => {
        if (g === null) return null;
        const rs = avgLoss[i] === 0 ? 100 : g / avgLoss[i];
        return 100 - (100 / (1 + rs));
    });

    myChart.setOption({
        yAxis: [
            ...option.yAxis.filter(y => y.id !== 'rsiAxis'),
            { id: 'rsiAxis', name: 'RSI', position: 'right', min: 0, max: 100, interval: 25, splitLine: { show: false } }
        ],
        series: [
            ...option.series.filter(s => s.name !== 'RSI'),
            {
                name: "RSI", type: "line", data: rsi, smooth: true, yAxisIndex: 1,
                lineStyle: { color: "#ff4757", width: 2 },
                markLine: {
                    symbol: "none",
                    lineStyle: { color: "rgba(255,255,255,0.3)", type: "dashed" },
                    data: [{ yAxis: 70 }, { yAxis: 30 }]
                }
            }
        ]
    });
    isRSIvisible = true;
    mostrarMensaje("✅ RSI Activado");
}

// --- MACD ---
function mostrarMACD() {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();
    const seriesCandle = option.series.find(s => s.type === 'candlestick');
    
    if (isMACDvisible) {
        const soloVelas = option.series.filter(s => s.type === 'candlestick' || s.name.includes('BB'));
        const sinMACDaxis = option.yAxis.filter(y => y.id !== 'macdAxis');
        myChart.setOption({ 
            yAxis: sinMACDaxis, 
            series: soloVelas 
        }, { replaceMerge: ['series', 'yAxis'] });
        isMACDvisible = false;
        mostrarMensaje("❌ MACD eliminado");
        return;
    }

    const closes = seriesCandle.data.map(d => d[1]);

    // Función EMA para cálculos
    const ema = (vals, p) => {
        let k = 2 / (p + 1);
        let res = [vals[0]];
        for (let i = 1; i < vals.length; i++) {
            res.push(vals[i] * k + res[i - 1] * (1 - k));
        }
        return res;
    };

    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = ema(macdLine, 9);
    const hist = macdLine.map((v, i) => v - signalLine[i]);

    myChart.setOption({
        yAxis: [
            ...option.yAxis,
            {
                id: 'macdAxis',
                type: 'value',
                gridIndex: 0,
                position: 'right',
                offset: 40, // Desplazado para que no choque con el precio
                splitLine: { show: false },
                axisLabel: { color: '#2962ff', fontSize: 10 },
                // Esto fuerza a que el MACD se centre y tenga altura
                scale: true 
            }
        ],
        series: [
            ...option.series,
            { 
                name: "MACD", 
                type: "line", 
                data: macdLine, 
                yAxisId: 'macdAxis', // Vinculado al nuevo eje
                yAxisIndex: option.yAxis.length, 
                lineStyle: { color: "#2962ff", width: 1 },
                showSymbol: false
            },
            { 
                name: "Signal", 
                type: "line", 
                data: signalLine, 
                yAxisIndex: option.yAxis.length, 
                lineStyle: { color: "#ff9800", width: 1, type: 'dashed' },
                showSymbol: false
            },
            { 
                name: "Hist", 
                type: "bar", 
                data: hist, 
                yAxisIndex: option.yAxis.length, 
                itemStyle: { 
                    color: (p) => p.value > 0 ? "#26a69a" : "#ef5350" 
                }
            }
        ]
    });

    isMACDvisible = true;
    mostrarMensaje("✅ MACD Activado (Eje lateral)");
}

// --- BOLLINGER ---
function mostrarBollinger() {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();
    if (bbActivo) {
        const soloVelas = option.series.filter(s => s.type === 'candlestick');
        myChart.setOption({ series: soloVelas }, { replaceMerge: ['series'] });
        bbActivo = false;
        mostrarMensaje("❌ Bollinger eliminado");
        return;
    }

    const closes = option.series.find(s => s.type === 'candlestick').data.map(d => d[1]);
    const periodo = 20;
    
    const sma = closes.map((_, i) => {
        if (i < periodo - 1) return null;
        const slice = closes.slice(i - periodo + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / periodo;
    });

    const std = closes.map((_, i) => {
        if (i < periodo - 1) return null;
        const slice = closes.slice(i - periodo + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / periodo;
        return Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / periodo);
    });

    const upper = sma.map((v, i) => v + 2 * std[i]);
    const lower = sma.map((v, i) => v - 2 * std[i]);

    myChart.setOption({
        series: [
            ...option.series,
            { name: "BB_Mid", type: "line", data: sma, lineStyle: { opacity: 0.5, color: '#fff' }, showSymbol: false },
            { name: "BB_Upper", type: "line", data: upper, lineStyle: { color: '#2962ff' }, showSymbol: false },
            { name: "BB_Lower", type: "line", data: lower, lineStyle: { color: '#2962ff' }, showSymbol: false }
        ]
    });
    bbActivo = true;
    mostrarMensaje("✅ Bollinger Activado");
}

// Event Listeners para los botones
document.getElementById("btnRSI")?.addEventListener("click", () => mostrarRSI());
document.getElementById("btnmacd")?.addEventListener("click", () => mostrarMACD());
document.getElementById("btnbb")?.addEventListener("click", () => mostrarBollinger());