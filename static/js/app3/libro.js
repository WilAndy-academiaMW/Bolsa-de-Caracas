/**
 * BRUTAL APP - Order Book & Sentiment Engine
 * Archivo: libro.js (Versión con Totales de Volumen Sumados)
 */

document.addEventListener('DOMContentLoaded', () => {
    cargarLibroOrdenes("ABC.A");

    const botones = document.querySelectorAll('.botones');
    botones.forEach(boton => {
        boton.addEventListener('click', () => {
            if (boton.id) cargarLibroOrdenes(boton.id);
        });
    });
});

async function cargarLibroOrdenes(simbolo) {
    const ruta = `static/empresa/${simbolo}.csv`;
    
    try {
        const respuesta = await fetch(ruta);
        if (!respuesta.ok) throw new Error("Archivo no encontrado");

        const texto = await respuesta.text();
        const filas = texto.trim().split('\n').filter(l => l.trim() !== '').slice(1);
        const ultimas7 = filas.slice(-15);

        const tCompra = document.getElementById('tabla-compras');
        const tVenta = document.getElementById('tabla-ventas');
        
        // IDs de los totales en el FOOTER
        const totalQtyC = document.getElementById('total-qty-compra');
        const totalQtyV = document.getElementById('total-qty-venta');
        const totalVolC = document.getElementById('total-vol-compra'); 
        const totalVolV = document.getElementById('total-vol-venta');

        tCompra.innerHTML = '';
        tVenta.innerHTML = '';
        
        let acumuladoQtyC = 0, acumuladoVolC = 0;
        let acumuladoQtyV = 0, acumuladoVolV = 0;

        // Limpiador de números profesional
        const parseNum = (v) => {
            if (!v || v.trim() === "" || v === '""') return 0;
            let n = v.replace(/"/g, '').replace(/\./g, '').replace(',', '.');
            return parseFloat(n) || 0;
        };

        ultimas7.forEach(fila => {
            const col = fila.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            // MAPEO
            const qtyC   = parseNum(col[2]);  // Cantidad Compra
            const qtyV   = parseNum(col[5]);  // Cantidad Venta
            const precio = col[6] ? col[6].replace(/"/g, '').trim() : "-"; 
            const volCSV = parseNum(col[10]); // Volumen (Columna 10) como número para sumar
            const fechaRaw = col[15] ? col[15].replace(/"/g, '').trim() : "";

            let fechaF = "---";
            if (fechaRaw) {
                const partes = fechaRaw.split('-');
                if (partes.length === 3) fechaF = `${partes[2]}/${partes[1]}`;
            }

            // Inyectar Compra
            if (qtyC > 0 || precio !== "-") {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="col-fecha align-left">${fechaF}</td>
                    <td class="align-left"><strong>${qtyC.toLocaleString('es-VE')}</strong></td>
                    <td class="align-right">${volCSV.toLocaleString('es-VE')}</td>
                    <td class="align-right">${precio}</td>
                `;
                tCompra.appendChild(tr);
                acumuladoQtyC += qtyC;
                acumuladoVolC += volCSV; // Sumamos el volumen aquí
            }

            // Inyectar Venta
            if (qtyV > 0 || precio !== "-") {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="align-left">${precio}</td>
                    <td class="align-right">${volCSV.toLocaleString('es-VE')}</td>
                    <td class="align-right"><strong>${qtyV.toLocaleString('es-VE')}</strong></td>
                    <td class="col-fecha align-right">${fechaF}</td>
                `;
                tVenta.appendChild(tr);
                acumuladoQtyV += qtyV;
                acumuladoVolV += volCSV; // Sumamos el volumen aquí
            }
        });

        // Pintar los totales sumados en el footer
        if(totalQtyC) totalQtyC.innerText = acumuladoQtyC.toLocaleString('es-VE');
        if(totalVolC) totalVolC.innerText = acumuladoVolC.toLocaleString('es-VE');
        
        if(totalQtyV) totalQtyV.innerText = acumuladoQtyV.toLocaleString('es-VE');
        if(totalVolV) totalVolV.innerText = acumuladoVolV.toLocaleString('es-VE');

        actualizarSentimiento(acumuladoQtyC, acumuladoQtyV);

    } catch (error) {
        console.error("[Error en libro.js]:", error.message);
    }
}

function actualizarSentimiento(compra, venta) {
    const total = compra + venta;
    const dot = document.getElementById('sentiment-dot');
    const pBuy = document.getElementById('perc-buy');
    const pSell = document.getElementById('perc-sell');

    if (total > 0) {
        const porcC = (compra / total) * 100;
        if(pBuy) pBuy.innerText = porcC.toFixed(1) + "%";
        if(pSell) pSell.innerText = (100 - porcC).toFixed(1) + "%";
        if(dot) dot.style.left = porcC + "%";
    }
}