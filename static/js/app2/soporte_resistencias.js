// --- VARIABLES DE ESTADO ---

let isZonasVisible = false; // ÚNICA DECLARACIÓN

// --- FUNCIÓN UNIFICADA: PIVOTES BRUTALES ---
async function cargarPivotesBrutales(folder, symbol) {
    // 1. Si se llama desde el botón (sin parámetros) y ya está visible -> OCULTAR
    if (!folder && !symbol && isZonasVisible) {
        myChart.setOption({
            series: [{ name: 'Precio', markLine: { data: [] } }]
        });
        isZonasVisible = false;
        console.log("Zonas ocultas");
        return;
    }

    // 2. Determinar qué símbolo cargar
    const f = folder || "accionesusd";
    const s = symbol || tickerActual;

    try {
        const response = await fetch(`/api/pivotes-brutales/${f}/${s}`);
        const data = await response.json();

        if (data.error) {
            console.warn("API Error:", data.error);
            return;
        }

        let lineasDinamicas = [];

        // Línea del precio actual
        if (data.pivote_central) {
            lineasDinamicas.push({
                yAxis: data.pivote_central,
                label: { formatter: 'PP CENTRAL', backgroundColor: '#333' },
                lineStyle: { color: '#ffffff', type: 'dotted', width: 1 }
            });
        }

        // Mapeo de zonas de memoria (Lo que manda el Python)
        if (data.zonas_memoria) {
            data.zonas_memoria.forEach(zona => {
                lineasDinamicas.push({
                    yAxis: zona.precio,
                    label: { 
                        formatter: `${zona.impactos}T | ${zona.max_mov}%`,
                        position: 'end',
                        backgroundColor: zona.color,
                        color: zona.color === "#ffff00" ? "#000" : "#fff",
                        padding: [2, 4],
                        fontWeight: 'bold'
                    },
                    lineStyle: { 
                        color: zona.color, 
                        type: zona.impactos > 1 ? 'solid' : 'dashed',
                        width: zona.impactos > 1 ? 3 : 1.5
                    }
                });
            });
        }

        myChart.setOption({
            series: [{
                name: 'Precio',
                markLine: {
                    symbol: ['none', 'none'],
                    data: lineasDinamicas,
                    label: { position: 'start', color: '#fff' }
                }
            }]
        });

        isZonasVisible = true;
        console.log(`✅ Nivel de ${s} cargado.`);

    } catch (error) {
        console.error("Error en la carga técnica:", error);
    }
}

// --- LISTENER PARA EL BOTÓN DE PIVOTES ---
document.getElementById("btnPivotes")?.addEventListener("click", () => {
    
    cargarPivotesBrutales(); 
});