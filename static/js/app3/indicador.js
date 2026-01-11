// indicador.js
document.addEventListener("DOMContentLoaded", () => {

    // 🔹 Calcular RSI
    function calcularRSI(cierres, periodo = 14) {
        const rsi = [];
        const deltas = cierres.map((c, i) => i === 0 ? 0 : c - cierres[i - 1]);
        const gains = deltas.map(d => d > 0 ? d : 0);
        const losses = deltas.map(d => d < 0 ? -d : 0);

        let avgGain = 0, avgLoss = 0;
        for (let i = 0; i < cierres.length; i++) {
            if (i < periodo) {
                // 🔹 Antes era null → ahora ponemos 50
                rsi.push(50);
                avgGain += gains[i] || 0;
                avgLoss += losses[i] || 0;
            } else if (i === periodo) {
                avgGain /= periodo;
                avgLoss /= periodo;
                const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            } else {
                avgGain = (avgGain * (periodo - 1) + gains[i]) / periodo;
                avgLoss = (avgLoss * (periodo - 1) + losses[i]) / periodo;
                const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }
        return rsi;
    }

    // 🔹 Solo imprimir en consola
    function dibujarRSI(labels, precios) {
        const valoresRSI = calcularRSI(precios, 14);

        labels.forEach((fecha, i) => {
            console.log(`${fecha}: RSI = ${valoresRSI[i].toFixed(2)}`);
        });
    }

    // 🔹 Exponer función global
    window.dibujarRSI = dibujarRSI;
});
