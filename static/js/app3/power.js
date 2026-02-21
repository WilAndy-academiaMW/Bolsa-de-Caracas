async function cargarNexusBVC(symbol) {
    const rsiEl = document.getElementById("nexus_rsi");
    const nexusBox = document.getElementById("contenedor_nexus");
    const nexusNeedle = document.getElementById("nexus_needle");
    const fillArc = document.getElementById("meter-fill"); // El arco SVG

    try {
        const res = await fetch(`/api/indicador_maestro/${symbol}`);
        if (!res.ok) return;
        const data = await res.json();

        const score = parseFloat(data.valor);
        const rsiVal = parseFloat(data.rsi);

        // 1. ACTUALIZAR TEXTOS
        actualizarDatoNexus("nexus_score", data.valor);
        actualizarDatoNexus("nexus_estado", data.estado);
        actualizarDatoNexus("nexus_rsi", data.rsi + "%");
        actualizarDatoNexus("nexus_macd", data.macd_hist);

        // 2. CONTROL DE LA AGUJA (Física de velocímetro)
        if (nexusNeedle) {
            // -90deg es el 0, 90deg es el 100
            const grados = (score * 1.8) - 90;
            nexusNeedle.style.transform = `rotate(${grados}deg)`;
            
            // Efecto de vibración si el score es extremo (Sobre compra)
            if (score >= 85) {
                nexusNeedle.classList.add("needle-vibrate");
            } else {
                nexusNeedle.classList.remove("needle-vibrate");
            }
        }

        // 3. LLENADO DEL ARCO SVG (Stroke-dashoffset)
        if (fillArc) {
            // El total del camino SVG es 251.2
            const maxDash = 251.2;
            const progress = (score / 100) * maxDash;
            fillArc.style.strokeDashoffset = maxDash - progress;
        }

        // 4. ESTILOS DE COLOR (Nexus Box)
        if (nexusBox) {
            nexusBox.className = "nexus-container"; // Limpiar estados previos
            if (score >= 75) nexusBox.classList.add("nexus-sobrecompra");
            else if (score >= 60) nexusBox.classList.add("nexus-compra");
            else if (score >= 45) nexusBox.classList.add("nexus-neutral");
            else if (score >= 30) nexusBox.classList.add("nexus-venta");
            else nexusBox.classList.add("nexus-sobreventa");
        }

        // 5. ALERTA VISUAL RSI
        if (rsiEl) {
            if (rsiVal > 70 || rsiVal < 30) rsiEl.classList.add("flash-alert");
            else rsiEl.classList.remove("flash-alert");
        }

    } catch (err) {
        console.error("Error en Nexus BVC:", err);
    }
}

function actualizarDatoNexus(id, valor) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("pop-animation");
    void el.offsetWidth; 
    el.textContent = valor;
    el.classList.add("pop-animation");
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    const botones = ["BVCC","BNC","BVL","BPV","CCP.B","MPA","SVS","ABC.A","CCR","CGQ","CRM.A","DOM","EFE","ENV","FNC","GMC.B","GZL","ICP.B","IVC.A","MTC.B","MVZ.A","MVZ.B","PCP.B","PGR","PIV.B","PTN","RST","RST.B","TPG","TDV.D"];
    
    botones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener("click", () => {
                cargarNexusBVC(id); 
                if (typeof cargarIndicador === 'function') cargarIndicador(id);
            });
        }
    });

    cargarNexusBVC("BNC");
});