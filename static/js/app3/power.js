/**
 * NEXUS ENGINE - LÓGICA DE INSTRUMENTACIÓN TÉCNICA
 */

async function cargarNexusBVC(symbol) {
    const nexusBox = document.getElementById("contenedor_nexus");
    const needle = document.getElementById("nexus_needle");
    const fillArc = document.getElementById("meter-fill");
    const rsiEl = document.getElementById("nexus_rsi");

    try {
        const res = await fetch(`/api/indicador_maestro/${symbol}`);
        if (!res.ok) return;
        
        const data = await res.json();

        // Verificamos que 'actual' exista para evitar el TypeError
        if (!data || !data.actual) {
            console.error("Estructura de datos inválida");
            return;
        }

        const act = data.actual;
        const score = parseFloat(act.valor);
        const rsiVal = parseFloat(act.rsi);

        // 1. ACTUALIZAR TEXTOS CAJA PRINCIPAL
        actualizarDatoNexus("nexus_score", act.valor || "0");
        actualizarDatoNexus("nexus_estado", act.estado || "ESPERANDO");
        actualizarDatoNexus("nexus_rsi", (act.rsi || "--") + "%");
        actualizarDatoNexus("nexus_macd", act.macd_hist || "--");

        // 2. CONTROL DE LA AGUJA (Semicírculo: -90deg a 90deg)
        if (needle && !isNaN(score)) {
            const grados = (score * 1.8) - 90;
            // Usamos translateX(-50%) para mantener el eje centrado
            needle.style.transform = `translateX(-50%) rotate(${grados}deg)`;
            
            // Vibración en extremos
            if (score >= 85 || score <= 15) {
                needle.classList.add("needle-vibrate");
            } else {
                needle.classList.remove("needle-vibrate");
            }
        }

        // 3. LLENADO DEL ARCO SVG (Stroke-dashoffset)
        if (fillArc && !isNaN(score)) {
            const maxDash = 126; // Ajustado para el arco de 100x60
            const progress = (score / 100) * maxDash;
            fillArc.style.strokeDashoffset = maxDash - progress;
        }

        // 4. ACTUALIZAR EL HISTORIAL (Las 3 Nietas)
        const meses = ["h1", "h2", "h3"];
        meses.forEach(m => {
            const mData = data[m];
            if (mData && mData.valor !== "--") {
                actualizarDatoNexus(`nx_${m}_score`, mData.valor);
                actualizarDatoNexus(`nx_${m}_rsi`, (mData.rsi || "--") + "%");
                actualizarDatoNexus(`nx_${m}_macd`, mData.macd_hist || "--");
            } else {
                actualizarDatoNexus(`nx_${m}_score`, "--");
                actualizarDatoNexus(`nx_${m}_rsi`, "--%");
                actualizarDatoNexus(`nx_${m}_macd`, "--");
            }
        });

        // 5. ESTILOS DE COLOR (Glow y Alertas)
        if (nexusBox) {
            nexusBox.classList.remove("nexus-sobrecompra", "nexus-compra", "nexus-neutral", "nexus-venta", "nexus-sobreventa");
            if (score >= 75) nexusBox.classList.add("nexus-sobrecompra");
            else if (score >= 60) nexusBox.classList.add("nexus-compra");
            else if (score >= 45) nexusBox.classList.add("nexus-neutral");
            else if (score >= 30) nexusBox.classList.add("nexus-venta");
            else if (!isNaN(score)) nexusBox.classList.add("nexus-sobreventa");
        }

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
    
    // Evitar parpadeo si el valor es el mismo
    if (el.textContent === valor.toString()) return;

    el.textContent = valor;
    el.classList.remove("pop-animation");
    void el.offsetWidth; // Trigger reflow
    el.classList.add("pop-animation");
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    const tickers = ["BVCC","BNC","BVL","BPV","CCP.B","MPA","SVS","ABC.A","CCR","CGQ","CRM.A","DOM","EFE","ENV","FNC","GMC.B","GZL","ICP.B","IVC.A","MTC.B","MVZ.A","MVZ.B","PCP.B","PGR","PIV.B","PTN","RST","RST.B","TPG","TDV.D"];
    
    tickers.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener("click", () => {
                cargarNexusBVC(id); 
                // Llama al otro indicador de Miedo/Codicia si existe
                if (typeof cargarIndicador === 'function') {
                    cargarIndicador(id);
                }
            });
        }
    });

    // Carga inicial
    cargarNexusBVC("BVCC");
});