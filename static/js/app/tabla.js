document.addEventListener('DOMContentLoaded', () => {
    const acciones = ['ABC.A', 'BNC', 'BPV','BCVV','BVL','CCP.B',
      'CCR','CGQ','CRM.A','DOM','EFE','ENV','FNC','GMC.B','GZL','ICP.B'
      ,'IVC.A','IVC.B','MPA','MTC.B','MVZ.A','MVZ.B','PCP.B','PIV.B','PTN','RST.B'
      ,'RST','SVS','TDV.D','TPG'
    ]; 
    const tableBody = document.querySelector('#accionesTable tbody');
    const totalMontoEl = document.getElementById('totalMonto');
    const buttons = document.querySelectorAll('.panel__controls button');
    const headers = document.querySelectorAll('#accionesTable th');

    let datosProcesados = []; // Aquí guardaremos los resultados para ordenar sin volver a leer el CSV

    async function cargarYProcesar(filtro) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Procesando...</td></tr>';
        datosProcesados = [];
        let granTotalMonto = 0;

        for (const ticket of acciones) {
            try {
                const response = await fetch(`static/acciones/${ticket}.csv`);
                if (!response.ok) continue;

                const csvText = await response.text();
                const lineas = csvText.trim().split('\n').slice(1);
                if (lineas.length === 0) continue;

                // Rango de filas
                let cant = filtro === 'all' ? lineas.length : parseInt(filtro === '24' ? 1 : (filtro === '48' ? 2 : filtro));
                const filasSel = lineas.slice(-cant);
                
                // Cálculos
                const fFinal = filasSel[filasSel.length - 1].split(',');
                const fInicial = filasSel[0].split(',');
                const pFinal = parseFloat(fFinal[2]);
                const pInicialIni = parseFloat(fInicial[2]) - parseFloat(fInicial[3]);
                
                const vAbs = pFinal - pInicialIni;
                const vRel = pInicialIni !== 0 ? (vAbs / pInicialIni) * 100 : 0;
                
                let sMonto = 0;
                filasSel.forEach(l => sMonto += parseFloat(l.split(',')[4]) || 0);

                granTotalMonto += sMonto;

                // Guardamos el objeto para ordenar después
                datosProcesados.push({
                    ticket,
                    precio: pFinal,
                    varAbs: vAbs,
                    varRel: vRel,
                    monto: sMonto
                });

            } catch (err) { console.error(err); }
        }

        renderizarTabla(datosProcesados, granTotalMonto);
    }

    function renderizarTabla(data, totalMonto) {
        tableBody.innerHTML = '';
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

    // --- EVENTOS DE ORDENACIÓN (Hacer clic en TH) ---
    headers.forEach((th, index) => {
        th.style.cursor = "pointer"; // Para que el usuario sepa que puede hacer clic
        th.addEventListener('click', () => {
            const claves = ['ticket', 'precio', 'varAbs', 'varRel', 'monto'];
            const clave = claves[index];

            // Ordenar de Mayor a Menor (Descendente) por defecto
            datosProcesados.sort((a, b) => {
                if (typeof a[clave] === 'string') return a[clave].localeCompare(b[clave]);
                return b[clave] - a[clave];
            });

            // Re-renderizar con el mismo total
            const totalActual = totalMontoEl.textContent.replace(' Bs', '').replace(/\./g, '').replace(',', '.');
            renderizarTabla(datosProcesados, parseFloat(totalActual));
        });
    });

    buttons.forEach(btn => btn.addEventListener('click', (e) => cargarYProcesar(e.target.getAttribute('data-filter'))));
    cargarYProcesar('24');
});