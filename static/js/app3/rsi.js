/**
 * INDICADORES.JS - Motor de Análisis Técnico Pro
 * Incluye: RSI, Medias Móviles, Momentum y Velocímetro de Votos
 */

console.log("✅ Motor de indicadores activo.");

// --- FUNCIÓN PRINCIPAL QUE LLAMA app3.js ---
window.procesarRSI = function(precios, labels) {
    if (!precios || precios.length < 20) {
        console.warn("Datos insuficientes para análisis técnico.");
        return;
    }

    // 1. Ejecutar el motor de votos (Estilo TradingView)
    window.analizarMercadoCompleto(precios);

    // 2. Calcular RSI para otros posibles usos (como gráficas)
    const rsiValores = calcularRSI(precios, 14);
    const ultimoRSI = rsiValores[rsiValores.length - 1];
    
    console.log(`📊 Análisis Individual RSI: ${ultimoRSI.toFixed(2)}`);
};

// --- MOTOR DE VOTOS (VELOCÍMETRO) ---
window.analizarMercadoCompleto = function(precios) {
    let votosCompra = 0;
    let votosVenta = 0;
    let votosNeutral = 0;

    const precioActual = precios[precios.length - 1];

    // --- VOTO 1: RSI (Oscilador) ---
    const rsiValores = calcularRSI(precios, 14);
    const rsiHoy = rsiValores[rsiValores.length - 1];
    
    if (rsiHoy > 70) {
        votosVenta++; // Sobrecompra = Peligro/Venta
    } else if (rsiHoy < 30) {
        votosCompra++; // Sobreventa = Oportunidad/Compra
    } else {
        votosNeutral++;
    }

    // --- VOTO 2: MEDIA MÓVIL (SMA 10) ---
    const sma10 = precios.slice(-10).reduce((a, b) => a + b, 0) / 10;
    if (precioActual > sma10) {
        votosCompra++;
    } else {
        votosVenta++;
    }

    // --- VOTO 3: MOMENTUM (Tendencia 10 días) ---
    const precioHace10 = precios[precios.length - 10];
    if (precioActual > precioHace10) {
        votosCompra++;
    } else {
        votosVenta++;
    }

    // --- CÁLCULO DE PUNTAJE FINAL (Escala 0-100) ---
    // Base 50 (Neutral) + balance de votos
    let puntajeFinal = 50 + ((votosCompra - votosVenta) * 15);
    puntajeFinal = Math.min(Math.max(puntajeFinal, 0), 100);

    console.log(`--- ANALISIS: Compra:${votosCompra} Venta:${votosVenta} Neu:${votosNeutral} | Score: ${puntajeFinal} ---`);

    // ACTUALIZAR EL VELOCÍMETRO EN EL HTML
    actualizarInterfazVelocimetro(puntajeFinal);
};

// --- FUNCIONES DE CÁLCULO Y UI ---

function calcularRSI(precios, n) {
    let ganancias = [], perdidas = [];
    for (let i = 1; i < precios.length; i++) {
        let diff = precios[i] - precios[i - 1];
        ganancias.push(diff > 0 ? diff : 0);
        perdidas.push(diff < 0 ? Math.abs(diff) : 0);
    }
    let rsi = [];
    for (let i = n; i < precios.length; i++) {
        let avgG = ganancias.slice(i - n, i).reduce((a, b) => a + b, 0) / n;
        let avgP = perdidas.slice(i - n, i).reduce((a, b) => a + b, 0) / n;
        let rs = (avgP === 0) ? 100 : avgG / avgP;
        rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi;
}

function actualizarInterfazVelocimetro(score) {
    const needle = document.getElementById('needle-tradingview');
    const scoreEl = document.getElementById('gauge-score');
    const textEl = document.getElementById('gauge-text');

    // Mover aguja: 0 es -90deg, 50 es 0deg, 100 es 90deg
    if (needle) {
        const grados = (score * 1.8) - 90;
        needle.style.transform = `rotate(${grados}deg)`;
    }

    // Actualizar número
    if (scoreEl) scoreEl.innerText = Math.round(score);

    // Actualizar texto descriptivo y colores
    if (textEl) {
        if (score > 70) {
            textEl.innerText = "COMPRA FUERTE";
            textEl.style.color = "#00ffcc";
        } else if (score < 30) {
            textEl.innerText = "VENTA FUERTE";
            textEl.style.color = "#ff4444";
        } else if (score > 55) {
            textEl.innerText = "COMPRA";
            textEl.style.color = "#bbff00";
        } else if (score < 45) {
            textEl.innerText = "VENTA";
            textEl.style.color = "#ffbb00";
        } else {
            textEl.innerText = "NEUTRAL";
            textEl.style.color = "#888";
        }
    }
}