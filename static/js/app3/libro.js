/**
 * BRUTAL APP - Order Book & Sentiment Engine
 * Archivo: libro.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // Carga inicial por defecto
    cargarLibroOrdenes("ABC.A");

    // Configurar clics en botones de acciones
    const botones = document.querySelectorAll('.botones');
    botones.forEach(boton => {
        boton.addEventListener('click', () => {
            if (boton.id) cargarLibroOrdenes(boton.id);
        });
    });
});

async function cargarLibroOrdenes(simbolo) {
    // Ruta hacia la carpeta de tus CSV
    const ruta = `static/empresa/${simbolo}.csv`;
    
    console.log(`[OrderBook] Cargando: ${ruta}`);

    try {
        const respuesta = await fetch(ruta);
        if (!respuesta.ok) throw new Error("Archivo no encontrado");

        const texto = await respuesta.text();
        
        // Limpiar filas vacías y quitar cabecera
        const filas = texto.trim().split('\n')
                           .filter(l => l.trim() !== '')
                           .slice(1);

        // Tomar las últimas 7 filas
        const ultimas7 = filas.slice(-7);

        const tCompra = document.getElementById('tabla-compras');
        const tVenta = document.getElementById('tabla-ventas');
        const totalQtyC = document.getElementById('total-qty-compra');
        const totalQtyV = document.getElementById('total-qty-venta');

        // Limpieza de tablas
        tCompra.innerHTML = '';
        tVenta.innerHTML = '';
        
        let acumuladoC = 0;
        let acumuladoV = 0;

        ultimas7.forEach(fila => {
            // Separación respetando comillas
            const col = fila.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            // Función para limpiar números: "1.234,56" -> 1234.56
            const parseNum = (v) => {
                if (!v || v.trim() === "" || v === '""') return 0;
                let n = v.replace(/"/g, '').replace(/\./g, '').replace(',', '.');
                return parseFloat(n) || 0;
            };

            // Mapeo de columnas
            const fechaRaw = col[15] ? col[15].replace(/"/g, '').trim() : "";
            const qtyC = parseNum(col[2]);
            const prcC = col[3] ? col[3].replace(/"/g, '').trim() : "-";
            const prcV = col[4] ? col[4].replace(/"/g, '').trim() : "-";
            const qtyV = parseNum(col[5]);

            // Formatear Fecha YYYY-MM-DD -> DD/MM
            let fechaF = "---";
            if (fechaRaw) {
                const partes = fechaRaw.split('-');
                if (partes.length === 3) fechaF = `${partes[2]}/${partes[1]}`;
            }

            // Inyectar Compra (Fecha | Cantidad | Precio)
            if (qtyC > 0 || prcC !== "-") {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="col-fecha align-left">${fechaF}</td>
                    <td class="align-left">${qtyC.toLocaleString('es-VE')}</td>
                    <td class="align-right">${prcC}</td>
                `;
                tCompra.appendChild(tr);
                acumuladoC += qtyC;
            }

            // Inyectar Venta (Precio | Cantidad | Fecha)
            if (qtyV > 0 || prcV !== "-") {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="align-left">${prcV}</td>
                    <td class="align-right">${qtyV.toLocaleString('es-VE')}</td>
                    <td class="col-fecha align-right">${fechaF}</td>
                `;
                tVenta.appendChild(tr);
                acumuladoV += qtyV;
            }
        });

        // Actualizar Totales numéricos
        totalQtyC.innerText = acumuladoC.toLocaleString('es-VE');
        totalQtyV.innerText = acumuladoV.toLocaleString('es-VE');

        // --- ACTUALIZAR BARRA DE DOMINIO ---
        actualizarSentimiento(acumuladoC, acumuladoV);

    } catch (error) {
        console.error("[Error]:", error.message);
    }
}

function actualizarSentimiento(compra, venta) {
    const total = compra + venta;
    const dot = document.getElementById('sentiment-dot');
    const pBuy = document.getElementById('perc-buy');
    const pSell = document.getElementById('perc-sell');

    if (total > 0) {
        const porcC = (compra / total) * 100;
        const porcV = (venta / total) * 100;

        pBuy.innerText = porcC.toFixed(1) + "%";
        pSell.innerText = porcV.toFixed(1) + "%";
        
        // El punto se mueve basado en el porcentaje de compra
        // 100% Compra = punto a la izquierda (verde)
        // 0% Compra = punto a la derecha (rojo)
        // Usamos porcC para la posición 'left'
        dot.style.left = porcC + "%";
    } else {
        pBuy.innerText = "50%";
        pSell.innerText = "50%";
        dot.style.left = "50%";
    }
}