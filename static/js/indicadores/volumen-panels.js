function actualizarPanelesVolumen(fechasIn, cierresIn, volumenesIn) {
  const contenedor = document.getElementById("volumen-panels");
  contenedor.innerHTML = "";

  // Orden cronológico ascendente
  const { fechas, cierres, volumenes } = ordenarCronologico(fechasIn, cierresIn, volumenesIn);

  const totalBloques = 6;
  const diasPorBloque = 30;

  // Última fecha real
  const ultimaFecha = new Date(fechas[fechas.length - 1]);

  for (let b = 0; b < totalBloques; b++) {
    // Límite inferior del bloque
    const limite = new Date(ultimaFecha);
    limite.setDate(limite.getDate() - diasPorBloque * (b + 1));

    // Límite superior del bloque
    const limiteSup = new Date(ultimaFecha);
    limiteSup.setDate(limiteSup.getDate() - diasPorBloque * b);

    // Filtrar registros dentro del rango [limite, limiteSup]
    const fechasBloque = [];
    const cierresBloque = [];
    const volsBloque = [];

    for (let i = 0; i < fechas.length; i++) {
      const f = new Date(fechas[i]);
      if (f >= limite && f <= limiteSup) {
        fechasBloque.push(fechas[i]);
        cierresBloque.push(cierres[i]);
        volsBloque.push(volumenes[i]);
      }
    }

    if (cierresBloque.length < 2) continue;

    // Conteo de días y volumen
    let volPos = 0, volNeg = 0, diasPos = 0, diasNeg = 0;
    for (let i = 1; i < cierresBloque.length; i++) {
      const cierrePrev = cierresBloque[i - 1];
      const cierreAct = cierresBloque[i];
      const vol = volsBloque[i] || 0;

      if (cierreAct >= cierrePrev) {
        volPos += vol;
        diasPos++;
      } else {
        volNeg += vol;
        diasNeg++;
      }
    }

    const diferencia = volPos - volNeg;

    // 🔎 Color definido por primer vs último cierre
    const cierreInicial = cierresBloque[0];
    const cierreFinal = cierresBloque[cierresBloque.length - 1];
    const esPositivo = cierreFinal >= cierreInicial;

    const claseExtra = esPositivo ? "positivo-bloque" : "negativo-bloque";
    const emoji = esPositivo ? "📈🔥" : "📉💀";

    // Render
    const div = document.createElement("div");
    div.className = `panel-volumen ${claseExtra}`;
    div.innerHTML = `
      <h4>Bloque ${b+1} ${emoji}</h4>
      <p><b>Rango:</b> ${fechasBloque[0]} → ${fechasBloque[fechasBloque.length-1]}</p>
      <p><b>Días positivos:</b> ${diasPos} • <b>Días negativos:</b> ${diasNeg}</p>
      <p><b>Volumen positivo:</b> ${volPos.toFixed(2)}</p>
      <p><b>Volumen negativo:</b> ${volNeg.toFixed(2)}</p>
      <p><b>Diferencia:</b> ${diferencia.toFixed(2)}</p>
    `;
    contenedor.appendChild(div);
  }
}

function ordenarCronologico(fechas, cierres, volumenes) {
  const idx = fechas.map((f, i) => ({ i, d: new Date(f.replace(/\./g,'-').replace(/\//g,'-')) }))
                    .sort((a, b) => a.d - b.d)
                    .map(o => o.i);
  return {
    fechas: idx.map(i => fechas[i]),
    cierres: idx.map(i => cierres[i]),
    volumenes: idx.map(i => volumenes[i]),
  };
}
