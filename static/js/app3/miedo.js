async function cargarIndicador(symbol) {
    const box = document.getElementById("indicador_feargreed");
    const needle = document.getElementById("fg-needle");

    try {
        const res = await fetch(`/feargreed/${symbol}`);
        if (!res.ok) return;
        const data = await res.json();

        const score = parseFloat(data.indice);

        // 1. Actualizar textos con efecto
        actualizarDatoConEfecto("sentimiento", data.sentimiento);
        actualizarDatoConEfecto("indice", Math.round(score));
        actualizarDatoConEfecto("momentum", data.momentum);
        actualizarDatoConEfecto("volumen", data.volumen);
        actualizarDatoConEfecto("volatilidad", data.volatilidad);

        // 2. Aguja (0% = -90deg, 50% = 0deg, 100% = 90deg)
        if (needle) {
            const grados = (score * 1.8) - 90;
            needle.style.transform = `rotate(${grados}deg)`;
        }

        // 3. Brillo de la tarjeta
        box.classList.remove("glow-greed", "glow-neutral", "glow-fear");
        if (score >= 75) box.classList.add("glow-greed");
        else if (score >= 36) box.classList.add("glow-neutral");
        else box.classList.add("glow-fear");

        // 4. Lógica de alertas (Titileo)
        document.getElementById("momentum").className = (parseFloat(data.momentum) > 90) ? "value flash-mom" : "value";
        document.getElementById("volumen").className = (parseFloat(data.volumen) < 30) ? "value flash-vol" : "value";
        document.getElementById("volatilidad").className = (parseFloat(data.volatilidad) > 80) ? "value flash-vlt" : "value";

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