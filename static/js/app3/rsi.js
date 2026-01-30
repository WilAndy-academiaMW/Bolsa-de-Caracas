/**
 * BRUTAL APP - Indicadores Dinámicos
 * Reacciona a cada cambio de botón y rango
 */

function procesarRSI(precios, labels) {
    // Si el usuario pone "15d" y no hay suficientes datos para el RSI de 14, avisamos
    if (!precios || precios.length < 15) {
        actualizarInterfazRSI(null, "⚠️ Insuficientes datos para este rango.");
        return;
    }

    const rsiValores = calcularRSI(precios, 14);
    const ultimoRSI = rsiValores[rsiValores.length - 1];

    // Buscamos divergencia comparando el hoy contra el inicio del set de datos actual
    // Así la divergencia es relativa al tiempo que el usuario está viendo (15d, 1m, etc.)
    const divergencia = detectarDivergenciaDinamica(precios, rsiValores);

    actualizarInterfazRSI(ultimoRSI, divergencia);
}

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
        let rs = avgP === 0 ? 100 : avgG / avgP;
        rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi;
}

function detectarDivergenciaDinamica(p, r) {
    const i = r.length - 1;   // Hoy
    const j = Math.max(0, r.length - 6); // Hace 5-6 registros del rango visible

    const pAct = p[p.length - 1], pPrev = p[p.length - 6];
    const rAct = r[i], rPrev = r[j];

    if (pAct < pPrev && rAct > rPrev && rAct < 50) {
        return "🚀 DIVERGENCIA ALCISTA (Acumulación)";
    }
    if (pAct > pPrev && rAct < rPrev && rAct > 50) {
        return "⚠️ DIVERGENCIA BAJISTA (Distribución)";
    }
    return "Neutral (Sin divergencia clara)";
}

function actualizarInterfazRSI(valor, estadoTexto) {
    const elValor = document.getElementById("rsi-valor");
    const elAlerta = document.getElementById("rsi-alerta");

    if (!elValor) return;

    if (valor === null) {
        elValor.textContent = "--";
        elAlerta.textContent = estadoTexto;
        return;
    }

    elValor.textContent = valor.toFixed(2);
    elAlerta.textContent = estadoTexto;

    // Colores dinámicos
    if (valor >= 70) elValor.style.color = "#ff4444"; // Sobrecompra
    else if (valor <= 30) elValor.style.color = "#00ffcc"; // Sobreventa
    else elValor.style.color = "#bbff00"; // Neutral
}