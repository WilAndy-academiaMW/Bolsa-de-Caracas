document.addEventListener('DOMContentLoaded', () => {
    // Tu lista manual se mantiene igual
    const acciones = ['ABC.A','ALZ.B','ARC.A', 'ARC.B','BNC','BPV','BVCC','BVL','CCP.B',
      'CCR','CGQ','CRM.A','DOM','EFE','ENV','FFV.A','FFV.B','FNC','FNV','GMC.B','GZL','ICP.B'
      ,'IVC.A','IVC.B','MPA','MTC.B','MVZ.A','MVZ.B','PCP.B','PIV.B','PIV.B','PGR','PTN','RST.B'
      ,'RST','SVS','TDV.D','TPG'
    ]; 

    const tableBody = document.querySelector('#accionesTable tbody');
    const totalMontoEl = document.getElementById('totalMonto');
    const buttons = document.querySelectorAll('.panel__controls button');
    const headers = document.querySelectorAll('#accionesTable th');

    let datosProcesados = [];

    async function cargarYProcesar(filtro) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Procesando datos de hoy...</td></tr>';
        datosProcesados = [];
        let granTotalMonto = 0;

        // Obtenemos la fecha de hoy en formato YYYY-MM-DD (igual al CSV)
        const hoy = new Date().toISOString().split('T')[0];

        for (const ticket of acciones) {
            try {
                // Añadimos un parámetro random para evitar que el navegador guarde cache viejo
                const response = await fetch(`static/acciones/${ticket}.csv?v=${new Date().getTime()}`);
                if (!response.ok) continue;

                const csvText = await response.text();
                const lineas = csvText.trim().split('\n').slice(1);
                if (lineas.length === 0) continue;

                // --- LÓGICA DE FILTRO POR FECHA ---
                const ultimaLineaRaw = lineas[lineas.length - 1];
                const datosFila = ultimaLineaRaw.split(',');
                const fechaArchivo = datosFila[0].trim(); // Columna 0 es la fecha

                // Si el filtro es "24h" y la fecha no es hoy, ignoramos la acción
                if (filtro === '24' && fechaArchivo !== hoy) {
                    console.log(`⏩ Saltando ${ticket}: Datos viejos (${fechaArchivo})`);
                    continue; 
                }
                // ----------------------------------

                // Si llegamos aquí, es porque o la fecha coincide o el filtro es "todos"
                let cant = filtro === 'all' ? lineas.length : parseInt(filtro === '24' ? 1 : (filtro === '48' ? 2 : filtro));
                const filasSel = lineas.slice(-cant);
                
                const fFinal = filasSel[filasSel.length - 1].split(',');
                const fInicial = filasSel[0].split(',');
                
                const pFinal = parseFloat(fFinal[2]);
                const pAnterior = parseFloat(fInicial[2]) - parseFloat(fInicial[3]);
                
                const vAbs = pFinal - pAnterior;
                const vRel = pAnterior !== 0 ? (vAbs / pAnterior) * 100 : 0;
                
                let sMonto = 0;
                filasSel.forEach(l => sMonto += parseFloat(l.split(',')[4]) || 0);

                granTotalMonto += sMonto;

                datosProcesados.push({
                    ticket,
                    precio: pFinal,
                    varAbs: vAbs,
                    varRel: vRel,
                    monto: sMonto
                });

            } catch (err) { console.error(`Error en ${ticket}:`, err); }
        }

        renderizarTabla(datosProcesados, granTotalMonto);
    }

    function renderizarTabla(data, totalMonto) {
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay movimientos registrados hoy.</td></tr>';
        }

        data.forEach(item => {
            const color = item.varAbs > 0 ? '#008f39' : (item.varAbs < 0 ? '#ff0000' : '#444');
            const flecha = item.varAbs > 0 ? '▲' : (item.varAbs < 0 ? '▼' : '');

            tableBody.innerHTML += `
                <tr>
                    <td style="text-align:center;"><strong>${item.ticket}</strong></td>
                    <td style="text-align:center;">${item.precio.toLocaleString('de-DE', {minimumFractionDigits: 2})} Bs</td>
                    <td style="text-align:center; color: ${color}; font-weight: bold;">
                        ${flecha} ${Math.abs(item.varAbs).toFixed(2)}
                    </td>
                    <td style="text-align:center; color: ${color};">${item.varRel.toFixed(2)}%</td>
                    <td style="text-align:center;">${item.monto.toLocaleString('de-DE', {minimumFractionDigits: 2})} Bs</td>
                </tr>
            `;
        });
        totalMontoEl.textContent = totalMonto.toLocaleString('de-DE', {minimumFractionDigits: 2}) + " Bs";
    }

    // Eventos de ordenación (Hacer clic en los encabezados)
    headers.forEach((th, index) => {
        th.style.cursor = "pointer";
        th.addEventListener('click', () => {
            const claves = ['ticket', 'precio', 'varAbs', 'varRel', 'monto'];
            const clave = claves[index];

            datosProcesados.sort((a, b) => {
                if (typeof a[clave] === 'string') return a[clave].localeCompare(b[clave]);
                return b[clave] - a[clave];
            });

            // Re-renderizar usando el total que ya tenemos en pantalla
            const totalActual = parseFloat(totalMontoEl.textContent.replace(' Bs', '').replace(/\./g, '').replace(',', '.'));
            renderizarTabla(datosProcesados, totalActual);
        });
    });

    buttons.forEach(btn => btn.addEventListener('click', (e) => cargarYProcesar(e.target.getAttribute('data-filter'))));
    
    // Iniciar siempre con el filtro de 24h (Hoy)
    cargarYProcesar('24');
});