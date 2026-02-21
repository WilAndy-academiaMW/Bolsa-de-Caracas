async function cargarLibroOrdenesVivo(symbol) {
    // 1. Referencias a los elementos del HTML (Usa los IDs 'live-')
    const contenedorBids = document.getElementById('live-ob-bids');
    const contenedorAsks = document.getElementById('live-ob-asks');
    const barra = document.getElementById('dominance-fill');
    const txtPorcentaje = document.getElementById('dominance-percent');
    const txtSentiment = document.getElementById('market-sentiment');

    // Salir si no encuentra los contenedores
    if (!contenedorBids || !contenedorAsks) return;

    try {
        // 2. Fetch de los datos
        const res = await fetch(`../static/libro/${symbol}.csv`);
        if (!res.ok) throw new Error("Archivo de libro no encontrado");

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

        // 3. --- LÓGICA DE DOMINANCIA INTELIGENTE ---
        // Buscamos las mejores puntas para el precio medio
        const mejorB = datos.find(d => d.p_cmp > 0)?.p_cmp || 0;
        const mejorA = [...datos].reverse().find(d => d.p_vta > 0)?.p_vta || 0;
        const precioMedio = (mejorB > 0 && mejorA > 0) ? (mejorB + mejorA) / 2 : mejorB || mejorA;

        let fuerzaCompra = 0;
        let fuerzaVenta = 0;

        datos.forEach(d => {
            // Ponderación: Mientras más cerca del centro, más peso.
            // Usamos Volumen * Precio (Dinero Real)
            if (d.p_cmp > 0) {
                let distancia = Math.abs(precioMedio - d.p_cmp) / precioMedio;
                let peso = 1 / (1 + distancia * 15); // Castigo de distancia
                fuerzaCompra += (d.v_cmp * d.p_cmp) * peso;
            }
            if (d.p_vta > 0) {
                let distancia = Math.abs(precioMedio - d.p_vta) / precioMedio;
                let peso = 1 / (1 + distancia * 15);
                fuerzaVenta += (d.v_vta * d.p_vta) * peso;
            }
        });

        const totalFuerza = fuerzaCompra + fuerzaVenta;
        const porcentajeCompra = totalFuerza > 0 ? (fuerzaCompra / totalFuerza) * 100 : 50;

        // Actualizar visual del Termómetro
        if (barra) {
            barra.style.width = `${porcentajeCompra}%`;
            txtPorcentaje.innerText = `${porcentajeCompra.toFixed(1)}% COMPRA vs ${(100 - porcentajeCompra).toFixed(1)}% VENTA`;
            
            if (porcentajeCompra > 55) {
                txtSentiment.innerText = "DOMINANCIA COMPRADORA";
                txtSentiment.style.color = "#00ff88"; // Verde neón
            } else if (porcentajeCompra < 45) {
                txtSentiment.innerText = "DOMINANCIA VENDEDORA";
                txtSentiment.style.color = "#ff3b3b"; // Rojo neón
            } else {
                txtSentiment.innerText = "MERCADO EQUILIBRADO";
                txtSentiment.style.color = "#ffffff";
            }
        }

        // 4. --- DIBUJAR LAS FILAS DEL LIBRO ---
        // Limpiamos antes de inyectar
        contenedorBids.innerHTML = "";
        contenedorAsks.innerHTML = "";

        const maxVol = Math.max(...datos.map(d => Math.max(d.v_cmp, d.v_vta)));

        // Inyectar VENTAS (Asks) - Se invierten para que el precio bajo esté cerca del centro
        const ventas = datos.filter(d => d.p_vta > 0).reverse();
        ventas.forEach(d => {
            const porcentaje = (d.v_vta / maxVol) * 100;
            contenedorAsks.innerHTML += `
                <div class="ob-row">
                    <div class="bar-fill ask-fill" style="width: ${porcentaje}%"></div>
                    <span class="price-val ask-price">${d.p_vta.toLocaleString('de-DE', {minimumFractionDigits: 2})}</span>
                    <span class="qty-val">${d.v_vta.toLocaleString('de-DE')}</span>
                </div>`;
        });

        // Inyectar COMPRAS (Bids)
        const compras = datos.filter(d => d.p_cmp > 0);
        compras.forEach(d => {
            const porcentaje = (d.v_cmp / maxVol) * 100;
            contenedorBids.innerHTML += `
                <div class="ob-row">
                    <div class="bar-fill bid-fill" style="width: ${porcentaje}%"></div>
                    <span class="price-val bid-price">${d.p_cmp.toLocaleString('de-DE', {minimumFractionDigits: 2})}</span>
                    <span class="qty-val">${d.v_cmp.toLocaleString('de-DE')}</span>
                </div>`;
        });

    } catch (error) {
        console.error("Fallo en libro vivo:", error);
    }
}