async function cargarDatosProvincial() {
    console.log("--- Iniciando carga de datos: BPV ---");
    
    try {
        // 1. OBTENER PRECIO (BPV.csv)
        const resPrecio = await fetch('/static/empresa/BPV.csv');
        const textoPrecio = await resPrecio.text();
        const lineasPrecio = textoPrecio.trim().split('\n').filter(l => l.trim() !== "");
        const cabeceras = lineasPrecio[0].split(',').map(c => c.trim());
        const idxPrecio = cabeceras.indexOf('Precio');
        const ultimaFilaPrecio = lineasPrecio[lineasPrecio.length - 1].split(',');
        const precioBs = parseFloat(ultimaFilaPrecio[idxPrecio].replace(/[^0-9.,]/g, '').replace(',', '.'));

        // 2. OBTENER ACCIONES (BPV.csv en capitalizacion)
        const resCap = await fetch('/static/capitalizacion/BPV.csv');
        const textoCap = await resCap.text();
        const lineasCap = textoCap.trim().split('\n').filter(l => l.trim() !== "");
        const acciones = parseFloat(lineasCap[0].split(',')[0].replace(/\./g, ''));

        // 3. OBTENER DÓLAR (dolar_bolivar.csv)
        const resDolar = await fetch('/static/csv/dolar_bolivar.csv');
        const textoDolar = await resDolar.text();
        const lineasDolar = textoDolar.trim().split('\n').filter(l => l.trim() !== "");
        const ultimaFilaDolar = lineasDolar[lineasDolar.length - 1].split(',');
        const tasaDolar = parseFloat(ultimaFilaDolar[1].trim().replace(',', '.'));

        // 4. CÁLCULOS
        const marketCapBs = precioBs * acciones;
        const marketCapUSD = marketCapBs / tasaDolar;
        const precioUSD = precioBs / tasaDolar;

        // 5. ACTUALIZAR INTERFAZ (Formato 2 decimales)
        
        // Precio: Bs. XX.XX ($ XX.XX)
        document.getElementById('precio-bpv').innerHTML = `
            Bs. ${precioBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
            <span class="text-sm text-slate-400 font-normal ml-2">
                ($${precioUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
        `;

        // Capitalización: Mostramos el valor en USD con 2 decimales
        // Usamos un formato que se entienda bien para cifras grandes
        document.getElementById('cap-bpv').innerHTML = `
            <div class="text-white font-bold">$ ${marketCapUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="text-xs text-slate-500 mt-1">Equiv. Bs. ${marketCapBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</div>
        `;
        
        document.getElementById('barra-progreso').style.width = "100%";

        console.log("✅ Datos Cargados: " + precioBs + " Bs / " + tasaDolar + " tasa USD");

    } catch (error) {
        console.error("❌ Error cargando BPV:", error.message);
    }
}

cargarDatosProvincial()