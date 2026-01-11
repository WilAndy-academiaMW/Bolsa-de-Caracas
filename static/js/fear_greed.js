function mostrarFearGreed(symbol, label) {
  fetch(`/feargreed/${symbol}`)
    .then(res => res.json())
    .then(data => {
      const el = document.getElementById("fear_geed");
      if (!el) return;

      const index = data.FearGreedIndex;
      let color = "";
      let estado = "";

      if (index <= 25) {
        color = "red";
        estado = "😱 Miedo extremo";
      } else if (index <= 50) {
        color = "tomato";
        estado = "😨 Miedo";
      } else if (index <= 75) {
        color = "limegreen";
        estado = "😎 Codicia";
      } else {
        color = "green";
        estado = "🚀 Codicia extrema";
      }

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
          margin: 10px;
        ">
          <h4 style="margin:0; font-size:14px;">${label}</h4>
          <p style="font-size:16px; margin:4px 0;">
            Fear & Greed: 
            <span style="color:${color}; font-weight:bold;">${index}</span>
          </p>
          <p style="margin:0; font-size:13px;">${estado}</p>
          <hr style="border:0.5px solid ${color}; margin:6px 0;">
          <p style="margin:2px 0; font-size:12px;">📉 Volatilidad: <span style="color:${color};">${data.Volatilidad.toFixed(1)}</span></p>
          <p style="margin:2px 0; font-size:12px;">📈 Momentum: <span style="color:${color};">${data.Momentum.toFixed(1)}</span></p>
          <p style="margin:2px 0; font-size:12px;">📊 Rendimiento: <span style="color:${color};">${data.Rendimiento.toFixed(1)}</span></p>
        </div>
      `;
    })
    .catch(err => console.error("Error obteniendo Fear & Greed:", err));
}


// Botones
document.querySelectorAll('aside.panel button[data-symbol]').forEach(btn => {
  btn.addEventListener('click', () => {
    const symbol = btn.dataset.symbol;
    const label = btn.dataset.label;

    cargarCSV(`/static/csv/accionesusd/${symbol}.csv`, label);
    mostrarFearGreed(symbol, label);
  });
});

// Carga inicial
cargarCSV('/static/csv/accionesusd/Banco del Caribe_usd.csv', 'Banco del Caribe');
mostrarFearGreed('Banco del Caribe_usd', 'Banco del Caribe');
