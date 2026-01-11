// --- Indicador Fear & Greed ---
// --- Indicador Fear & Greed Actualizado ---
function mostrarFearGreed(symbol, label) {
  fetch(`/feargreed/${symbol}`)
    .then(res => {
      if (!res.ok) throw new Error(`Servidor devolvió ${res.status}`);
      return res.json();
    })
    .then(data => {
      const el = document.getElementById("fear_geed");
      if (!el) return;

      const index = data.FearGreedIndex;
      let color = "";
      
      // Mantenemos tu lógica de colores basada en el índice
      if (index <= 25) {
        color = "red";
      } else if (index <= 50) {
        color = "tomato";
      } else if (index <= 75) {
        color = "limegreen";
      } else {
        color = "green";
      }

      // Usamos data.Estado que viene directamente del Python
      const estado = data.Estado || "Neutral";

      el.innerHTML = `
        <div style="
          background: linear-gradient(135deg, ${color}, black);
          color: white;
          padding: 8px;
          border-radius: 6px;
          text-align: center;
          font-family: 'Arial Black', sans-serif;
          box-shadow: 0 0 6px ${color};
          max-width: 250px;
          margin: 10px auto;
        ">
          <h4 style="margin:0; font-size:14px;">${label}</h4>
          <p style="font-size:16px; margin:4px 0;">
            Fear & Greed: 
            <span style="color:${color}; font-weight:bold;">${index}</span>
          </p>
          <p style="margin:0; font-size:13px;">${estado}</p>
          <hr style="border:0.5px solid ${color}; margin:6px 0;">
          
          <p style="margin:2px 0; font-size:11px;">💰 Dinero Entrante: 
            <span style="color:limegreen;">$${data.Dinero_Entrante_14d?.toLocaleString() ?? "0"}</span>
          </p>
          <p style="margin:2px 0; font-size:11px;">💸 Dinero Saliente: 
            <span style="color:tomato;">$${data.Dinero_Saliente_14d?.toLocaleString() ?? "0"}</span>
          </p>
          <p style="margin:2px 0; font-size:10px; opacity:0.8;">(Últimos 14 días)</p>
        </div>
      `;
    })
    .catch(err => {
      console.error("Error obteniendo Fear & Greed:", err);
      const el = document.getElementById("fear_geed");
      if (el) {
        el.innerHTML = `<div style="color:red; font-weight:bold;">⚠️ No se pudo cargar Fear & Greed para ${label}</div>`;
      }
    });
}
// --- Botones ---
document.querySelectorAll('button[data-symbol]').forEach(btn => {
  btn.addEventListener('click', () => {
    const symbol = btn.dataset.symbol;   // ej: "banco caribe_usd"
    const label = btn.dataset.label;     // ej: "Banco del Caribe"

    // Nueva ruta de CSV
    cargarCSV(`/static/csv/accionesusd2/${symbol}.csv`, label);

    // Indicador Fear & Greed
    mostrarFearGreed(symbol, label);
  });
});

// --- Carga inicial ---
cargarCSV('/static/csv/accionesusd2/banco caribe_usd.csv', 'Banco del Caribe');
mostrarFearGreed('banco caribe_usd', 'Banco del Caribe');
