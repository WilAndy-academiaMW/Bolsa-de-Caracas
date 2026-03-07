function formatearAbreviado(numero) {
    if (numero >= 1e12) return (numero / 1e12).toFixed(2) + " T"; 
    if (numero >= 1e9)  return (numero / 1e9).toFixed(2) + " B";  
    if (numero >= 1e6)  return (numero / 1e6).toFixed(2) + " M";  
    if (numero >= 1e3)  return (numero / 1e3).toFixed(1) + " K";  
    return numero.toFixed(2);
}

window.actualizarCapitalizacion = async function(symbol) {
    const capLabel = document.getElementById('capitalizacion');
    const precioLabel = document.getElementById('precio'); 

    if (!capLabel || !precioLabel) return;

    let precioTexto = precioLabel.innerText || precioLabel.textContent;
    // Limpieza de Bs: quitamos puntos de miles, cambiamos coma a punto
    let precioLimpio = precioTexto.replace(/Bs/g, "").replace(/\./g, "").replace(",", ".").trim();
    let precioActual = parseFloat(precioLimpio);

    if (isNaN(precioActual) || precioActual <= 0) return;

    try {
        // 1. CARGAR CIRCULANTE (Formato: 38.666.662,00)
        const resCirculante = await fetch(`/static/capitalizacion/${symbol}.csv`);
        let dataCirc = await resCirculante.text();
        let circulante = parseFloat(dataCirc.trim().replace(/\./g, "").replace(",", "."));

        // 2. CARGAR TASA DÓLAR (Formato: USD,405.3518,2025-02-23)
        const resDolar = await fetch(`/static/csv/dolar_bolivar.csv`);
        let tasaDolar = 1;
        
        if (resDolar.ok) {
            let dataDolar = await resDolar.text();
            let filasDolar = dataDolar.trim().split('\n');
            let ultimaFila = filasDolar[filasDolar.length - 1].split(',');
            
            // IMPORTANTE: Aquí NO quitamos el punto, porque es el decimal real (405.35)
            let valorTasaRaw = ultimaFila[1].trim(); 
            tasaDolar = parseFloat(valorTasaRaw);
            
            console.log(`💵 Tasa Dólar detectada: ${tasaDolar}`);
        }

        // 3. CÁLCULO FINAL
        if (!isNaN(circulante) && tasaDolar > 0) {
            const capBs = precioActual * circulante;
            const capUsd = capBs / tasaDolar;

            console.log(`📊 BS: ${capBs} | USD: ${capUsd}`);

            capLabel.style.color = "#00ff88"; 
            capLabel.innerHTML = `
                <div style="font-size: 1.1em;">${formatearAbreviado(capBs)} Bs</div>
                <div style="font-size: 0.85em; color: #00d1ff; margin-top: 4px; font-family: monospace;">
                    $ ${formatearAbreviado(capUsd)}
                </div>
            `;
        }

    } catch (err) {
        console.error("🔥 Error en cálculo dual:", err);
    }
};