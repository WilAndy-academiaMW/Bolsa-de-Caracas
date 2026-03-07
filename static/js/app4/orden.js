async function cargarLibroOrdenesVivo(symbol) {
    // 1. Referencias al nuevo HTML
    const contenedorBids = document.getElementById('live-ob-bids');
    const contenedorAsks = document.getElementById('live-ob-asks');
    const barra = document.getElementById('dominance-fill');
    const txtPorcentaje = document.getElementById('dominance-percent');
    const txtSentiment = document.getElementById('market-sentiment');

    if (!contenedorBids || !contenedorAsks) return;

    try {
        // 2. Carga del archivo CSV
        const res = await fetch(`../static/libro/${symbol}.csv`);
        if (!res.ok) throw new Error("Archivo no disponible");

        const texto = await res.text();
        const filas = texto.trim().split('\n').slice(1);
        
        const datos = filas.map(f => {
            const cols = f.split(',');
            return {
                v_cmp: parseFloat(cols[0]) || 0,
                p_cmp: parseFloat(cols[1]) || 0,
                v_vta: parseFloat(cols[2]) || 0,
                p_vta: parseFloat(cols[3]) || 0
            };
        });
        

        // 3. Lógica de Dominancia (Efectivo Ponderado)
        const mejorB = datos.find(d => d.p_cmp > 0)?.p_cmp || 0;
        const mejorA = [...datos].reverse().find(d => d.p_vta > 0)?.p_vta || 0;
        const precioMedio = (mejorB + mejorA) / 2;

        let fuerzaCompra = 0;
        let fuerzaVenta = 0;

        datos.forEach(d => {
            if (d.p_cmp > 0) {
                let dist = Math.abs(precioMedio - d.p_cmp) / precioMedio;
                let peso = 1 / (1 + dist * 15);
                fuerzaCompra += (d.v_cmp * d.p_cmp) * peso;
            }
            if (d.p_vta > 0) {
                let dist = Math.abs(precioMedio - d.p_vta) / precioMedio;
                let peso = 1 / (1 + dist * 15);
                fuerzaVenta += (d.v_vta * d.p_vta) * peso;
            }
        });

        const totalFuerza = fuerzaCompra + fuerzaVenta;
        const porcCompra = totalFuerza > 0 ? (fuerzaCompra / totalFuerza) * 100 : 50;

        // Actualizar Termómetro
        if (barra) {
            barra.style.width = `${porcCompra}%`;
            txtPorcentaje.innerText = `${porcCompra.toFixed(1)}% COMPRA vs ${(100 - porcCompra).toFixed(1)}% VENTA`;
            txtSentiment.innerText = porcCompra > 55 ? "DOMINANCIA COMPRADORA" : porcCompra < 45 ? "DOMINANCIA VENDEDORA" : "MERCADO EQUILIBRADO";
            txtSentiment.style.color = porcCompra > 55 ? "#00ff88" : porcCompra < 45 ? "#ff3b3b" : "#fff";
        }

        // 4. Inyección de Datos con Triple Columna (VALOR BS a la izquierda)
        contenedorBids.innerHTML = "";
        contenedorAsks.innerHTML = "";

        const maxVol = Math.max(...datos.map(d => Math.max(d.v_cmp, d.v_vta)));

        // --- VENTAS (ASKS) ---
        const ventas = datos.filter(d => d.p_vta > 0).reverse();
        ventas.forEach(d => {
            const valorBs = d.p_vta * d.v_vta;
            const anchoBarra = (d.v_vta / maxVol) * 100;
            contenedorAsks.innerHTML += `
                <div class="ob-row triple-left">
                    <div class="bar-fill ask-fill" style="width: ${anchoBarra}%"></div>
                    <span class="total-val-left">${valorBs.toLocaleString('de-DE', {maximumFractionDigits: 0})}</span>
                    <span class="qty-val">${d.v_vta.toLocaleString('de-DE')}</span>
                    <span class="price-val ask-price">${d.p_vta.toLocaleString('de-DE', {minimumFractionDigits: 2})}</span>
                </div>`;
        });

        // --- COMPRAS (BIDS) ---
        const compras = datos.filter(d => d.p_cmp > 0);
        compras.forEach(d => {
            const valorBs = d.p_cmp * d.v_cmp;
            const anchoBarra = (d.v_cmp / maxVol) * 100;
            contenedorBids.innerHTML += `
                <div class="ob-row triple-left">
                    <div class="bar-fill bid-fill" style="width: ${anchoBarra}%"></div>
                    <span class="total-val-left">${valorBs.toLocaleString('de-DE', {maximumFractionDigits: 0})}</span>
                    <span class="qty-val">${d.v_cmp.toLocaleString('de-DE')}</span>
                    <span class="price-val bid-price">${d.p_cmp.toLocaleString('de-DE', {minimumFractionDigits: 2})}</span>
                </div>`;
        });

    } catch (error) {
        console.error("Error cargando libro:", error);
    }

}