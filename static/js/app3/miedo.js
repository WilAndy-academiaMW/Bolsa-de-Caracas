// feargreed.js
async function cargarIndicador(symbol) {
    try {
        const res = await fetch(`/feargreed/${symbol}`);
        if (!res.ok) {
            document.getElementById("sentimiento").textContent = "Error";
            return;
        }
        const data = await res.json();

        document.getElementById("sentimiento").textContent = data.sentimiento;
        document.getElementById("indice").textContent = data.indice;
        document.getElementById("momentum").textContent = data.momentum;
        document.getElementById("volumen").textContent = data.volumen;
        document.getElementById("volatilidad").textContent = data.volatilidad;

        // 🔹 Color según sentimiento
        const box = document.getElementById("indicador_feargreed");
        if (data.sentimiento === "Codicia") {
            box.style.borderColor = "green";
        } else if (data.sentimiento === "Miedo") {
            box.style.borderColor = "red";
        } else {
            box.style.borderColor = "orange";
        }

    } catch (err) {
        console.error("Error cargando indicador:", err);
    }
}



// 👉 Integración con tus botones de acciones
document.addEventListener("DOMContentLoaded", () => {
    const botonesAcciones = ["BVCC","BNC","BVL","BPV","CCP.B","MPA","SVS",
        "ABC.A","CCR","CGQ","CRM.A","DOM","EFE","ENV","FNC","GMC.B","GZL","ICP.B","IVC.A",
        "MTC.B","MVZ.A","MVZ.B","PCP.B","PGR","PIV.B","PTN","RST","RST.B","TPG","TDV.D"];

    botonesAcciones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener("click", () => {
                cargarIndicador(id); // 🔹 cada vez que cambias de acción, carga el indicador
            });
        }
    });

    // Mostrar BVCC por defecto
    cargarIndicador("BVCC");
});
