async function cargarIndicador(symbol) {
    const sentimientoEl = document.getElementById("sentimiento");
    const indiceEl = document.getElementById("indice");
    const momentumEl = document.getElementById("momentum");
    const volumenEl = document.getElementById("volumen");
    const volatilidadEl = document.getElementById("volatilidad");
    const box = document.getElementById("indicador_feargreed");
    const needle = document.getElementById("fg-needle");

    try {
        const res = await fetch(`/feargreed/${symbol}`);
        if (!res.ok) return;
        const data = await res.json();

        const score = parseFloat(data.indice);
        const momVal = parseFloat(data.momentum);
        const volVal = parseFloat(data.volumen);
        const vltVal = parseFloat(data.volatilidad);

        // 1. ACTUALIZAR TEXTOS CON EFECTO POP
        actualizarDatoConEfecto("sentimiento", data.sentimiento);
        actualizarDatoConEfecto("indice", data.indice);
        actualizarDatoConEfecto("momentum", data.momentum + "%");
        actualizarDatoConEfecto("volumen", data.volumen + "%");
        actualizarDatoConEfecto("volatilidad", data.volatilidad + "%");

        // 2. AGUJA
        if (needle) {
            const grados = (score * 1.8) - 90;
            needle.style.transform = `rotate(${grados}deg)`;
        }

        // 3. COLOR DEL CONTENEDOR (SEGÚN TU ESCALA)
        box.className = "feargreed-box"; // Reset
        if (score >= 75) box.classList.add("glow-greed");
        else if (score >= 36) box.classList.add("glow-neutral");
        else box.classList.add("glow-fear");

        // 4. LÓGICA DE TITILEO POR INDICADOR
        
        // Momentum (Verde) -> Titila si es > 90
        if (momVal > 90) momentumEl.classList.add("flash-mom");
        else momentumEl.classList.remove("flash-mom");

        // Volumen (Amarillo/Naranja) -> Titila si es < 30 (Divergencia)
        if (volVal < 30) volumenEl.classList.add("flash-vol");
        else volumenEl.classList.remove("flash-vol");

        // Volatilidad (Rojo) -> Titila si es > 80 (Peligro)
        if (vltVal > 80) volatilidadEl.classList.add("flash-vlt");
        else volatilidadEl.classList.remove("flash-vlt");

    } catch (err) {
        console.error("Error cargando datos:", err);
    }
}

function actualizarDatoConEfecto(id, valor) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("pop-animation");
    void el.offsetWidth;
    el.textContent = valor;
    el.classList.add("pop-animation");
}

// Event Listeners para tus botones
document.addEventListener("DOMContentLoaded", () => {
    const botones = ["BVCC","BNC","BVL","BPV","CCP.B","MPA","SVS","ABC.A","CCR","CGQ","CRM.A","DOM","EFE","ENV","FNC","GMC.B","GZL","ICP.B","IVC.A","MTC.B","MVZ.A","MVZ.B","PCP.B","PGR","PIV.B","PTN","RST","RST.B","TPG","TDV.D"];
    botones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", () => cargarIndicador(id));
    });
    cargarIndicador("BVCC");
});