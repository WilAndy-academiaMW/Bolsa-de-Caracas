async function cargarIndicador(symbol) {
    const box = document.getElementById("indicador_feargreed");
    // Cambiamos la referencia de 'needle' a 'pointer' para que coincida con tu ID del HTML
    const pointer = document.getElementById("fg-pointer");

    try {
        const res = await fetch(`/feargreed/${symbol}`);
        if (!res.ok) return;
        const data = await res.json();

        // --- 1. ACTUALIZAR CAJA PRINCIPAL (Hija 1) ---
        const act = data.actual;
        
        actualizarDatoConEfecto("sentimiento", act.sentimiento);
        actualizarDatoConEfecto("indice", Math.round(act.indice));
        actualizarDatoConEfecto("momentum", act.momentum);
        actualizarDatoConEfecto("volumen", act.volumen);
        actualizarDatoConEfecto("volatilidad", act.volatilidad);

        // MOVIMIENTO DE LA BARRA (AJUSTE LINEAL)
        // El valor de act.indice (0-100) se traduce directamente a porcentaje de 'left'
        if (pointer && act.indice !== "--") {
            const score = parseFloat(act.indice);
            pointer.style.left = `${score}%`;
        }

        // Glow Brutalista
        box.className = "fg-pro-panel"; // Reset de clases para no acumular glows
        if (act.indice >= 75) box.classList.add("glow-greed");
        else if (act.indice >= 36) box.classList.add("glow-neutral");
        else if (act.indice !== "--") box.classList.add("glow-fear");

        // --- 2. ACTUALIZAR HISTORIAL (Las 3 Nietas abajo) ---
        const meses = ["h1", "h2", "h3"];
        
        meses.forEach(m => {
            const mData = data[m];
            if (mData) {
                actualizarDatoConEfecto(`${m}_indice`, mData.indice);
                actualizarDatoConEfecto(`${m}_momentum`, mData.momentum);
                actualizarDatoConEfecto(`${m}_volumen`, mData.volumen);
                actualizarDatoConEfecto(`${m}_volatilidad`, mData.volatilidad);
            }
        });

    } catch (err) {
        console.error("Error cargando Fear & Greed:", err);
    }
}

function actualizarDatoConEfecto(id, valor) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.textContent = valor;
    
    // Animación de refresco (pop)
    el.classList.remove("pop-animation");
    void el.offsetWidth; // Forzar reflujo para reiniciar animación
    el.classList.add("pop-animation");
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    const tickerList = [
        "BVCC","BNC","BVL","BPV","CCP.B","MPA","SVS","ABC.A","CCR","CGQ",
        "CRM.A","DOM","EFE","ENV","FNC","GMC.B","GZL","ICP.B","IVC.A",
        "MTC.B","MVZ.A","MVZ.B","PCP.B","PGR","PIV.B","PTN","RST","RST.B",
        "TPG","TDV.D"
    ];
    
    tickerList.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", () => cargarIndicador(id));
    });

    // Carga inicial por defecto
    cargarIndicador("BVCC");
});