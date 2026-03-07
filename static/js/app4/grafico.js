document.addEventListener("DOMContentLoaded", () => {
    const botonesAcciones = ["BVCC","BNC" ,"BVL", "BPV","CCP.B","MPA","SVS",
        "ABC.A","CCR","CGQ","CRM.A","DOM","EFE","ENV","FNC","GMC.B","GZL","ICP.B","IVC.A",
        "MTC.B","MVZ.A","MVZ.B","PCP.B","PGR","PIV.B","PTN","RST","RST.B","TPG","TDV.D"]; // IDs de botones = nombres de CSV
    
    const rangos = {
        "15d": 0.5,
        "1m": 1,
        "2m": 2,
        "3m": 3,
        "4m": 4,
        "5m": 5,
        "6m": 6
    };

    let chart;
    let volumeChart;
    let rangoMeses = 6; // por defecto 6 meses
    let simboloActivo = "BVL"; // por defecto BVL
    // ... (Tus variables iniciales botonesAcciones, chart, etc. se quedan igual)

async function cargarGrafica(symbol) {
    try {
        console.log("📈 Cargando gráficas para:", symbol);
        const res = await fetch(`static/empresa/${symbol}.csv`);
        if (!res.ok) throw new Error("Archivo no encontrado");

        const text = await res.text();
        const lines = text.trim().split("\n").slice(1);

        const toNumber = (val) => {
            if (!val || val.trim() === "" || val === '""') return 0;
            let n = val.replace(/"/g, '').replace(/\./g, '').replace(',', '.');
            return parseFloat(n) || 0;
        };

        const registros = lines.map(line => {
            const col = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                x: new Date(col[15].replace(/"/g, '')).getTime(),
                o: toNumber(col[7]), h: toNumber(col[13]), l: toNumber(col[14]),
                c: toNumber(col[6]), vol: toNumber(col[10]), efec: toNumber(col[11])
            };
        }).filter(d => d.c > 0 && !isNaN(d.x));

        const ultimos = registros.slice(-(rangoMeses * 30));

        // --- 1. Lógica de Precio Bimonetario ---
        const pFinal = ultimos[ultimos.length - 1].c;
        const pInicial = ultimos[0].c;
        const rend = ((pFinal - pInicial) / pInicial) * 100;

        // Buscamos la tasa del dólar para el precio
        const resDolar = await fetch(`static/csv/dolar_bolivar.csv`);
        let pFinalUsd = 0;
        if (resDolar.ok) {
            const dataDolar = await resDolar.text();
            const filasDolar = dataDolar.trim().split('\n');
            const ultimaFila = filasDolar[filasDolar.length - 1].split(',');
            const tasaDolar = parseFloat(ultimaFila[1]); // Formato 405.3518
            pFinalUsd = pFinal / tasaDolar;
        }

        // Actualizar Rendimiento
        const rendEl = document.getElementById("rendimiento");
        rendEl.textContent = `${rend.toFixed(2)}%`;
        rendEl.style.color = rend >= 0 ? "#00ff00" : "#ff0000";

        // Actualizar Precio (Inyectamos HTML para las dos monedas)
        const precioEl = document.getElementById("precio");
        precioEl.innerHTML = `
            <div>${pFinal.toLocaleString("es-VE")} Bs</div>
            <div style="font-size: 0.8em; color: #00d1ff; margin-top: 2px;">
                $ ${pFinalUsd.toFixed(2)}
            </div>
        `;

        // 2. Gráfica de Velas
        if (chart) chart.destroy();
        chart = new Chart(document.getElementById("grafica_linea"), {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: symbol,
                    data: ultimos.map(d => ({ x: d.x, o: d.o, h: d.h, l: d.l, c: d.c })),
                    color: { up: '#00ff00', down: '#ff0000', unchanged: '#999' }
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 3. Gráfica de Volumen
        if (volumeChart) volumeChart.destroy();
        volumeChart = new Chart(document.getElementById("volumen_bs"), {
            type: "bar",
            data: {
                labels: ultimos.map(d => d.x),
                datasets: [
                    { label: "Efectivo (Bs)", data: ultimos.map(d => d.efec), backgroundColor: '#28a745', yAxisID: 'y' },
                    { label: "Cant. Acciones", data: ultimos.map(d => d.vol), backgroundColor: '#00d4ff', yAxisID: 'y1' }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                    y: { position: 'left' }, 
                    y1: { position: 'right', grid: { display: false } } 
                }
            }
        });

        // 4. Ejecutar Radar y Capitalización
        cargarRadarBonito(symbol);
        cargarLibroOrdenesVivo(symbol);
        
        // Llamamos a la capitalización después de actualizar el precio
        actualizarCapitalizacion(symbol);

    } catch (err) {
        console.error("❌ Error en cargarGrafica:", err);
    }
}

// 🚀 SACAMOS ESTA FUNCIÓN FUERA PARA QUE SEA INDEPENDIENTE
async function cargarRadarBonito(symbol) {
    const lista = document.getElementById("radar-lista");
    if (!lista) return;

    try {
        const res = await fetch(`/api/radar/${symbol}`);
        const datos = await res.json();
        lista.innerHTML = ""; 

        datos.slice(0, 15).forEach(dia => {
            let colorPrincipal, sombra;
            
            // Configuración de colores por perfil
            if (dia.clase === 'shark') {
                colorPrincipal = "#00ff88"; // Verde Neón
                sombra = "rgba(0, 255, 136, 0.2)";
            } else if (dia.clase === 'retail') {
                colorPrincipal = "#ffaa00"; // Ámbar/Naranja
                sombra = "rgba(255, 170, 0, 0.2)";
            } else {
                colorPrincipal = "#00d4ff"; // Cian/Azul
                sombra = "rgba(0, 212, 255, 0.1)";
            }

            const card = document.createElement("div");
            card.style.cssText = `
                min-width: 220px;
                background: linear-gradient(145deg, #121212, #080808);
                border: 1px solid ${colorPrincipal};
                border-radius: 10px;
                padding: 15px;
                flex-shrink: 0;
                font-family: 'Consolas', 'monaco', monospace;
                box-shadow: 0 4px 15px ${sombra};
                transition: transform 0.3s ease;
                cursor: default;
            `;

            // Efecto hover simple (opcional)
            card.onmouseover = () => card.style.transform = "translateY(-5px)";
            card.onmouseout = () => card.style.transform = "translateY(0)";
            
            card.innerHTML = `
                <div style="color: #666; font-size: 0.7rem; margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 4px;">
                    📅 ${dia.fecha}
                </div>
                <div style="color: ${colorPrincipal}; font-weight: bold; font-size: 1rem; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                    ${dia.perfil}
                    <span style="font-size: 0.7rem; opacity: 0.7;">${dia.ratio}x</span>
                </div>
                <div style="font-size: 0.85rem; color: #bbb; margin-bottom: 5px;">
                    <span style="color: #555;">OPERACIONES:</span> <span style="color: #fff;">${dia.ops}</span>
                </div>
                <div style="font-size: 0.9rem; color: #fff; font-weight: bold; margin-bottom: 12px;">
                    Bs ${dia.efectivo.toLocaleString('es-VE')}
                </div>
                <div style="font-size: 0.7rem; color: #444; background: #000; padding: 5px; border-radius: 4px; text-align: center;">
                    TICKET: ${dia.ticket.toLocaleString('es-VE')}
                </div>
            `;
            lista.appendChild(card);
        });
    } catch (e) {
        console.error("Error en radar:", e);
    }
}
    // Eventos de botones de acciones
    botonesAcciones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener("click", async () => {
                simboloActivo = id;
                await cargarGrafica(simboloActivo);
            });
        }
    });

    // Eventos de botones de rango temporal
    Object.keys(rangos).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener("click", () => {
                rangoMeses = rangos[id];
                cargarGrafica(simboloActivo);
            });
        }
    });

    // 🔹 Mostrar BVCC por defecto al cargar la página
    (async () => {
        await cargarGrafica("ABC.A");
    })();
});

