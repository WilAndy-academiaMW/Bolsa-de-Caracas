let reglaActiva = false;
let puntosRegla = [];

async function gestionarRegla() {
    const chart = obtenerGrafico();
    if (!chart) return;
    const btn = document.getElementById("btn-regla");
    const mensajeDiv = document.getElementById("mensaje");

    // --- INTERRUPTOR: DESACTIVAR ---
    if (reglaActiva) {
        reglaActiva = false;
        puntosRegla = [];
        chart.off('click'); 
        
        const option = chart.getOption();
        const nuevasSeries = option.series.map(s => {
            if (s.type === 'candlestick' && s.markArea) {
                return {
                    ...s,
                    markArea: {
                        ...s.markArea,
                        data: s.markArea.data ? s.markArea.data.filter(d => d[0].name !== 'REGLA_ZONE') : []
                    }
                };
            }
            return s;
        });

        chart.setOption({ series: nuevasSeries });
        
        btn.style.backgroundColor = "transparent";
        btn.style.color = "#ffcc00";
        
        if (mensajeDiv) mensajeDiv.innerHTML = "❌ <span style='color: #ff5000'>Regla Desactivada y Limpia</span>";
        return;
    }

    // --- INTERRUPTOR: ACTIVAR ---
    reglaActiva = true;
    puntosRegla = [];
    
    btn.style.backgroundColor = "#ffcc00";
    btn.style.color = "#000";
    
    if (mensajeDiv) mensajeDiv.innerHTML = "📏 <span style='color: #ffcc00'>Regla Activa: Selecciona el punto de inicio</span>";

    chart.on('click', function (params) {
        if (!reglaActiva || params.seriesType !== 'candlestick') return;

        const fecha = params.name;
        const precioCierre = params.data[2]; 
        const indiceVela = params.dataIndex; 

        puntosRegla.push({ fecha, precio: precioCierre, index: indiceVela });

        // --- FEEDBACK DEL PRIMER CLICK ---
        if (puntosRegla.length === 1) {
            if (mensajeDiv) {
                mensajeDiv.innerHTML = `📍 <span style='color: #00ff88'>Punto 1: ${fecha} ($${precioCierre.toFixed(2)})</span>. Selecciona el punto final.`;
            }
        }

        // --- PROCESAMIENTO DEL SEGUNDO CLICK ---
        if (puntosRegla.length === 2) {
            const p1 = puntosRegla[0];
            const p2 = puntosRegla[1];

            const delta = (p2.precio - p1.precio).toFixed(4);
            const porcentaje = (((p2.precio - p1.precio) / p1.precio) * 100).toFixed(2);
            const diasHabiles = Math.abs(p2.index - p1.index) + 1;

            const esSubida = parseFloat(porcentaje) >= 0;
            const simbolo = esSubida ? "▲" : "▼";
            const colorSMC = esSubida ? '#00ff88' : '#ff2e63';
            const colorFondoArea = esSubida ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 46, 99, 0.1)';

            const etiquetaInfo = [
                `${simbolo} ${Math.abs(porcentaje)}%`,
                `$ ${delta}`,
                `${diasHabiles} Días Hábiles`
            ].join('\n');

            const option = chart.getOption();
            const nuevasSeries = option.series.map(s => {
                if (s.type === 'candlestick') {
                    const dataExistente = (s.markArea && s.markArea.data) ? s.markArea.data : [];
                    return {
                        ...s,
                       markArea: {
    silent: true,
    z: 100, // <--- Crucial: Fuerza a la regla a estar por ENCIMA de las velas (capa superior)
    data: [...dataExistente, [
        {
            name: 'REGLA_ZONE',
            coord: [p1.fecha, p1.precio],
            itemStyle: { 
                color: colorFondoArea, 
                borderWidth: 1.5, 
                borderColor: colorSMC, 
                borderType: 'dashed' 
            },
            label: {
                show: true,
                position: 'inside', // Centrado en el recuadro de la regla
                formatter: etiquetaInfo, // El texto con Delta, % y Días
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                lineHeight: 20,

                // --- ESTILO DE ALTA VISIBILIDAD (ANTI-OPACIDAD) ---
                backgroundColor: '#0a0a0a', // Fondo NEGRO SÓLIDO (tapa las velas que pasen por detrás)
                padding: [12, 18],
                borderRadius: 5,
                borderColor: colorSMC, // Borde del color del movimiento (verde/rojo)
                borderWidth: 2,
                
                // Efectos de profundidad para resaltar el texto
                shadowBlur: 15,
                shadowColor: 'rgba(0, 0, 0, 1)',
                shadowOffsetX: 3,
                shadowOffsetY: 3
            }
        },
        { 
            coord: [p2.fecha, p2.precio] 
        }
    ]]
}
                    };
                }
                return s;
            });

            chart.setOption({ series: nuevasSeries });

            // --- MENSAJE FINAL DE RESULTADO ---
            if (mensajeDiv) {
                mensajeDiv.innerHTML = `✅ <span style='color: ${colorSMC}'>${simbolo} ${Math.abs(porcentaje)}%</span> | $${delta} | ${diasHabiles} Días Hábiles`;
            }
            
            puntosRegla = []; // Reset para nueva medición
        }
    });
}

// Conectar el botón
document.getElementById("btn-regla").addEventListener("click", gestionarRegla);