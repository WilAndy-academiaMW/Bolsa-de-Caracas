async function cargarFunding(symbol) {
    const el = document.getElementById("funding");
    try {
        const res = await fetch(`/funding/${symbol}`);
        const data = await res.json();
        if (!data.ok) {
            el.innerHTML = `<strong>Funding (${symbol})</strong><br><span style="color:red;">${data.msg}</span>`;
            return;
        }
        const rate = data.fundingRate;
        const color = rate >= 0 ? "limegreen" : "red";
        // Formatear con 6 decimales
        const formattedRate = rate.toFixed(6);
        el.innerHTML = `<strong>Funding Rate (${symbol})</strong><br><span style="color:${color};">${formattedRate}</span>`;
    } catch (err) {
        el.textContent = "Error cargando Funding";
    }
}

async function cargarOpenInterest(symbol) {
    const el = document.getElementById("openinterest");
    try {
        const res = await fetch(`/openinterest/${symbol}`);
        const data = await res.json();
        if (!data.ok) {
            el.innerHTML = `<strong>Open Interest (${symbol})</strong><br><span style="color:red;">${data.msg}</span>`;
            return;
        }
        const oi = data.openInterest;
        // Formatear con separadores de miles y 2 decimales
        const formattedOI = oi.toLocaleString("es-ES", { maximumFractionDigits: 2 });
        el.innerHTML = `<strong>Open Interest (${symbol})</strong><br>${formattedOI}`;
    } catch (err) {
        el.textContent = "Error cargando Open Interest";
    }
}

function refrescarIndicadores(symbol) {
    cargarFunding(symbol);
    cargarOpenInterest(symbol);
}

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("symbolSelect");
    refrescarIndicadores(select.value);

    select.addEventListener("change", (e) => {
        refrescarIndicadores(e.target.value);
    });

    // 🔄 Auto-refresh cada 60 segundos
    setInterval(() => {
        refrescarIndicadores(select.value);
    }, 60000);
});
