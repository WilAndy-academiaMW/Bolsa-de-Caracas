/**
 * BLOQUE DE INDICADORES TÉCNICOS
 * ID unificado: "grafica"
 */

let isRSIvisible = false;
let isMACDvisible = false;
let bbActivo = false;
let isADXvisible = false;
let isMFIvisible = false;
let isWPRvisible = false;


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
                    lineStyle: { color: "rgba(255, 7, 7, 0.3)", type: "line", },
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

// --- ADX (Average Directional Index) ---
function mostrarADX(periodo = 14) {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();
    const seriesCandle = option.series.find(s => s.type === 'candlestick');
    
    if (!seriesCandle || !seriesCandle.data || seriesCandle.data.length < periodo * 2) {
        mostrarMensaje("⚠️ Datos insuficientes para ADX (requiere min. 28 días)");
        return;
    }

    if (isADXvisible) {
        const filtradas = option.series.filter(s => !['ADX', 'DI+', 'DI-'].includes(s.name));
        const sinADXaxis = option.yAxis.filter(y => y.id !== 'adxAxis');
        myChart.setOption({ yAxis: sinADXaxis, series: filtradas }, { replaceMerge: ['series', 'yAxis'] });
        isADXvisible = false;
        mostrarMensaje("❌ ADX eliminado");
        return;
    }

    const data = seriesCandle.data; // [open, close, low, high] -> según tu formato de ECharts suelen ser 4 valores
    // Nota: Asegúrate de que el orden en tu data sea [open, close, low, high] o ajusta los índices:
    const highs = data.map(d => d[3]);
    const lows = data.map(d => d[2]);
    const closes = data.map(d => d[1]);

    let tr = [], plusDM = [], minusDM = [];

    for (let i = 1; i < data.length; i++) {
        let h = highs[i], l = lows[i], ph = highs[i-1], pl = lows[i-1], pc = closes[i-1];
        
        // True Range
        tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
        
        // Directional Movement
        let moveUp = h - ph;
        let moveDown = pl - l;
        
        plusDM.push(moveUp > moveDown && moveUp > 0 ? moveUp : 0);
        minusDM.push(moveDown > moveUp && moveDown > 0 ? moveDown : 0);
    }

    // Suavizado (Wilder's Smoothing)
    const smooth = (arr, p) => {
        let res = [arr.slice(0, p).reduce((a, b) => a + b, 0)];
        for (let i = p; i < arr.length; i++) {
            res.push(res[res.length - 1] - (res[res.length - 1] / p) + arr[i]);
        }
        return res;
    };

    const str = smooth(tr, periodo);
    const sPlusDM = smooth(plusDM, periodo);
    const sMinusDM = smooth(minusDM, periodo);

    const diPlus = sPlusDM.map((v, i) => (v / str[i]) * 100);
    const diMinus = sMinusDM.map((v, i) => (v / str[i]) * 100);
    
    const dx = diPlus.map((v, i) => Math.abs(v - diMinus[i]) / (v + diMinus[i]) * 100);
    
    // El ADX final es el suavizado del DX
    let adxFinal = new Array(periodo * 2).fill(null);
    let currentADX = dx.slice(0, periodo).reduce((a, b) => a + b, 0) / periodo;
    
    for (let i = periodo; i < dx.length; i++) {
        currentADX = ((currentADX * (periodo - 1)) + dx[i]) / periodo;
        adxFinal.push(currentADX);
    }

    // Alineación de datos con el gráfico (rellenar con nulls al inicio)
    const padding = new Array(data.length - adxFinal.length).fill(null);
    const finalADX = [...padding, ...adxFinal];
    const finalDIPlus = [...padding, ...new Array(periodo).fill(null), ...diPlus];
    const finalDIMinus = [...padding, ...new Array(periodo).fill(null), ...diMinus];

    myChart.setOption({
        yAxis: [
            ...option.yAxis,
            { id: 'adxAxis', type: 'value', max: 100, min: 0, position: 'right', offset: 80, splitLine: {show: false}, axisLabel: {fontSize: 10, color: '#fff'} }
        ],
        series: [
            ...option.series,
            { name: "ADX", type: "line", data: finalADX, yAxisIndex: option.yAxis.length, lineStyle: { color: "#fff", width: 3 }, showSymbol: false },
            { name: "DI+", type: "line", data: finalDIPlus, yAxisIndex: option.yAxis.length, lineStyle: { color: "#00ff88", width: 1, type: 'dashed' }, showSymbol: false },
            { name: "DI-", type: "line", data: finalDIMinus, yAxisIndex: option.yAxis.length, lineStyle: { color: "#ff2e63", width: 1, type: 'dashed' }, showSymbol: false }
        ]
    });

    isADXvisible = true;
    mostrarMensaje("✅ ADX Brutal Activado (Fuerza de Tendencia)");
}

function mostrarMFI(periodo = 14) {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();
    const seriesCandle = option.series.find(s => s.type === 'candlestick');
    
    if (isMFIvisible) {
        const filtradas = option.series.filter(s => s.name !== 'MFI');
        const sinMFIaxis = option.yAxis.filter(y => y.id !== 'mfiAxis');
        myChart.setOption({ yAxis: sinMFIaxis, series: filtradas }, { replaceMerge: ['series', 'yAxis'] });
        isMFIvisible = false;
        mostrarMensaje("❌ MFI eliminado");
        return;
    }

    const data = seriesCandle.data; 
    // Necesitamos: Típico Precio = (H + L + C) / 3 y Volumen
    // Asumiendo que tu data tiene [Open, Close, Low, High, Volume]
    const highs = data.map(d => d[3]);
    const lows = data.map(d => d[2]);
    const closes = data.map(d => d[1]);
    const volumes = data.map(d => d[4] || 100); // Si no hay volumen, ponemos 100 por defecto

    let typicalPrices = highs.map((h, i) => (h + lows[i] + closes[i]) / 3);
    let rawMoneyFlow = typicalPrices.map((tp, i) => tp * volumes[i]);

    let mfiValues = new Array(periodo).fill(null);

    for (let i = periodo; i < typicalPrices.length; i++) {
        let posFlow = 0;
        let negFlow = 0;

        for (let j = i - periodo + 1; j <= i; j++) {
            if (typicalPrices[j] > typicalPrices[j - 1]) {
                posFlow += rawMoneyFlow[j];
            } else {
                negFlow += rawMoneyFlow[j];
            }
        }

        let moneyRatio = negFlow === 0 ? 100 : posFlow / negFlow;
        mfiValues.push(100 - (100 / (1 + moneyRatio)));
    }

    myChart.setOption({
        yAxis: [
            ...option.yAxis,
            { id: 'mfiAxis', type: 'value', max: 100, min: 0, position: 'right', offset: 120, splitLine: {show: false}, axisLabel: {color: '#00ff88'} }
        ],
        series: [
            ...option.series,
            { 
                name: "MFI", 
                type: "line", 
                data: mfiValues, 
                yAxisIndex: option.yAxis.length, 
                lineStyle: { color: "#00ff88", width: 2 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(0, 255, 136, 0.3)' },
                        { offset: 1, color: 'rgba(0, 255, 136, 0)' }
                    ])
                },
                showSymbol: false 
            }
        ]
    });

    isMFIvisible = true;
    mostrarMensaje("✅ MFI Activado (Rastreador de Dinero Real)");
}

function mostrarWilliamsR(periodo = 14) {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();
    const seriesCandle = option.series.find(s => s.type === 'candlestick');
    
    if (isWPRvisible) {
        const filtradas = option.series.filter(s => s.name !== 'WPR');
        const sinWPRaxis = option.yAxis.filter(y => y.id !== 'wprAxis');
        myChart.setOption({ yAxis: sinWPRaxis, series: filtradas }, { replaceMerge: ['series', 'yAxis'] });
        isWPRvisible = false;
        mostrarMensaje("❌ Williams %R eliminado");
        return;
    }

    const data = seriesCandle.data; 
    // Usamos los índices que confirmaste: [1]=Close, [2]=Low, [3]=High
    const closes = data.map(d => d[1]);
    const lows = data.map(d => d[2]);
    const highs = data.map(d => d[3]);

    let wprValues = new Array(periodo - 1).fill(null);

    for (let i = periodo - 1; i < data.length; i++) {
        const sliceHighs = highs.slice(i - periodo + 1, i + 1);
        const sliceLows = lows.slice(i - periodo + 1, i + 1);
        
        const maxHigh = Math.max(...sliceHighs);
        const minLow = Math.min(...sliceLows);
        const currentClose = closes[i];

        // Fórmula: ((MaxHigh - Close) / (MaxHigh - MinLow)) * -100
        const val = ((maxHigh - currentClose) / (maxHigh - minLow)) * -100;
        wprValues.push(val);
    }

    myChart.setOption({
        yAxis: [
            ...option.yAxis,
            { 
                id: 'wprAxis', 
                type: 'value', 
                max: 0, 
                min: -100, 
                position: 'right', 
                offset: 120, // Para que no choque con RSI/MACD
                splitLine: { show: false },
                axisLabel: { color: '#ffea00', fontSize: 10 } 
            }
        ],
        series: [
            ...option.series,
            { 
                name: "WPR", 
                type: "line", 
                data: wprValues, 
                yAxisIndex: option.yAxis.length, 
                lineStyle: { color: "#ffea00", width: 2 }, // Color Amarillo Eléctrico
                markLine: {
                    symbol: "none",
                    lineStyle: { color: "rgba(255,255,255,0.2)", type: "dashed" },
                    data: [{ yAxis: -20 }, { yAxis: -80 }]
                },
                showSymbol: false 
            }
        ]
    });

    isWPRvisible = true;
    mostrarMensaje("✅ Williams %R Activado (Timing Preciso)");
}
// Event Listeners para los botones
document.getElementById("btnRSI")?.addEventListener("click", () => mostrarRSI());
document.getElementById("btnmacd")?.addEventListener("click", () => mostrarMACD());
document.getElementById("btnbb")?.addEventListener("click", () => mostrarBollinger());
document.getElementById("btnADX")?.addEventListener("click", () => mostrarADX());
document.getElementById("btnMFI")?.addEventListener("click", () => mostrarMFI());
document.getElementById("btnWPR")?.addEventListener("click", () => mostrarWilliamsR());