// Variables de estado Globales
let smcActivo = false;
let fvgActivo = false;
let sdActivo = false;
let liquidezActiva = false;

/**
 * Función para escribir mensajes en tu div con id="mensaje"
 */
function mostrarMensaje(texto) {
    const contenedor = document.getElementById("mensaje");
    if (contenedor) {
        contenedor.innerText = texto;
        contenedor.style.color = "#00ff88"; // Verde neón para que resalte
        // Limpiar el mensaje automáticamente tras 4 segundos
        setTimeout(() => {
            if (contenedor.innerText === texto) contenedor.innerText = "";
        }, 4000);
    } else {
        console.log("SMC LOG:", texto);
    }
}

/**
 * Función para obtener la instancia del gráfico de ECharts
 */
function obtenerGrafico() {
    // Busca por los IDs más comunes que podrías estar usando
    const dom = document.getElementById("grafica") || 
                document.getElementById("main") || 
                document.getElementById("chart");
    
    if (!dom) return null;
    return echarts.getInstanceByDom(dom);
}

/**
 * Función Principal para cargar y mostrar SMC
 */
async function mostrarSMC(folder, symbol) {
    const myChart = obtenerGrafico();
    if (!myChart) {
        console.error("No se pudo inicializar el gráfico. Revisa el ID en tu HTML.");
        return;
    }

    const option = myChart.getOption();

    // INTERRUPTOR (Toggle): Si ya está puesto, lo quitamos
    if (smcActivo) {
        const seriesLimpias = option.series.map(s => {
            if (s.type === 'candlestick') {
                return { ...s, markLine: { data: [] } };
            }
            return s;
        });
        myChart.setOption({ series: seriesLimpias });
        smcActivo = false;
        mostrarMensaje("❌ Estructura SMC Oculta");
        return;
    }

    try {
        mostrarMensaje("🔍 Escaneando Huella Institucional...");
        
        // Llamada a tu API de Flask: /api/smc/accionesusd/ABC.A
        const response = await fetch(`/api/smc/${folder}/${symbol}`);
        const result = await response.json();

        if (result.status === "ok") {
            const eventos = result.eventos;
            
            // MAPEO DE LÍNEAS (Versión Original por Dirección)
            const lines = eventos.map(ev => {
                const esAlcista = ev.tipo.includes("ALCISTA");
                // Verde para movimientos Alcistas, Rojo para movimientos Bajistas
                const color = esAlcista ? "#00ff88" : "#ff2e63"; 
                
                return {
                    name: ev.tipo,
                    xAxis: ev.fecha,
                    yAxis: ev.precio,
                    label: {
                        show: true,
                        position: 'end',
                        formatter: ev.tipo.split(' ')[0], // Muestra "BOS" o "ChoCh"
                        color: color,
                        fontSize: 11,
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: [3, 5],
                        borderRadius: 3,
                        borderWidth: 1,
                        borderColor: color
                    },
                    lineStyle: {
                        color: color,
                        type: 'dashed',
                        width: 1.5,
                        opacity: 0.7
                    }
                };
            });

            // Inyectar las líneas en la serie de velas (Candlestick)
            const nuevasSeries = option.series.map(s => {
                if (s.type === 'candlestick') {
                    return {
                        ...s,
                        markLine: {
                            symbol: ['none', 'circle'], // Círculo al inicio de la ruptura
                            symbolSize: 4,
                            data: lines,
                            label: { show: true }
                        }
                    };
                }
                return s;
            });

            myChart.setOption({ series: nuevasSeries });
            smcActivo = true;
            mostrarMensaje("✅ SMC: Estructura Aplicada");
        } else {
            mostrarMensaje("⚠️ Error: No se pudieron procesar los datos");
        }
    } catch (error) {
        console.error("Error en el fetch de SMC:", error);
        mostrarMensaje("⚠️ Error de conexión con la API");
    }
}
async function mostrarFVG(folder, symbol) {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();

    // 1. INTERRUPTOR (Toggle)
    if (fvgActivo) {
        const seriesLimpias = option.series.map(s => {
            if (s.type === 'candlestick') {
                // Filtramos para quitar solo los FVG y mantener otras zonas (como S&D)
                return { 
                    ...s, 
                    markArea: { 
                        ...s.markArea, 
                        data: s.markArea.data ? s.markArea.data.filter(d => d[0].name !== 'FVG_ZONE') : [] 
                    } 
                };
            }
            return s;
        });
        myChart.setOption({ series: seriesLimpias });
        fvgActivo = false;
        mostrarMensaje("❌ FVG: Ineficiencias Ocultas");
        return;
    }

    try {
        mostrarMensaje("🔍 Escaneando vacíos de liquidez...");
        
        const response = await fetch(`/api/fvg/${folder}/${symbol}`);
        const result = await response.json();

        if (result.status === "ok" && result.fvgs.length > 0) {
            
            // --- AUDITORÍA EN CONSOLA ---
            console.log(`%c ⚡ FVG REPORT - ${symbol} `, 'background: #111; color: #00e5ff; font-weight: bold;');

            const serieVelas = option.series.find(s => s.type === 'candlestick');
            const ultimoPrecio = serieVelas.data[serieVelas.data.length - 1][1]; // Cierre actual

            const areas = result.fvgs.map((gap, index) => {
                // Determinar si es Bullish o Bearish respecto al precio actual
                const centroGap = (gap.top + gap.bottom) / 2;
                const esBajista = centroGap > ultimoPrecio; 
                
                const colorFondo = esBajista ? 'rgba(255, 46, 99, 0.2)' : 'rgba(0, 255, 136, 0.2)';
                const colorEtiqueta = esBajista ? '#ff2e63' : '#00ff88';

                // Imprimir límites de velas 1 y 3 en consola
                console.log(`Gap #${index + 1} | Vela 1 (Extremo): ${gap.top} | Vela 3 (Extremo): ${gap.bottom} | Tipo: ${gap.tipo}`);

                return [
                    {
                        name: 'FVG_ZONE',
                        yAxis: gap.bottom,
                        xAxis: gap.fecha, // Punto donde nace la ineficiencia
                        itemStyle: {
                            color: colorFondo,
                            borderWidth: 0 // Sin bordes, estilo minimalista
                        },
                        label: {
                            show: true,
                            position: 'insideRight',
                            formatter: esBajista ? ' FVG SELL' : ' FVG BUY',
                            color: colorEtiqueta,
                            fontSize: 9,
                            fontWeight: 'bold'
                        }
                    },
                    {
                        yAxis: gap.top // Se proyecta al infinito a la derecha
                    }
                ];
            });

            // 2. ACTUALIZACIÓN DEL GRÁFICO (Preservando otras marcas)
            const nuevasSeries = option.series.map(s => {
                if (s.type === 'candlestick') {
                    const dataExistente = (s.markArea && s.markArea.data) ? s.markArea.data : [];
                    return {
                        ...s,
                        markArea: {
                            silent: true,
                            data: [...dataExistente, ...areas]
                        }
                    };
                }
                return s;
            });

            myChart.setOption({ series: nuevasSeries });
            fvgActivo = true;
            mostrarMensaje(`✅ ${result.fvgs.length} Ineficiencias Marcadas`);
        } else {
            mostrarMensaje("⚠️ No se detectaron FVG vivos");
        }
    } catch (error) {
        console.error("Error FVG JS:", error);
        mostrarMensaje("⚠️ Error de conexión con el motor FVG");
    }
}

async function mostrarZonasSD(folder, symbol) {
    const myChart = obtenerGrafico();
    if (!myChart) return;
    const option = myChart.getOption();

    if (sdActivo) {
        const seriesLimpias = option.series.map(s => {
            if (s.type === 'candlestick') {
                return { ...s, markArea: { ...s.markArea, data: s.markArea.data ? s.markArea.data.filter(d => d[0].name !== 'SD_ZONE') : [] } };
            }
            return s;
        });
        myChart.setOption({ series: seriesLimpias });
        sdActivo = false;
        mostrarMensaje("❌ Zonas S&D Ocultas");
        return;
    }

    try {
        mostrarMensaje("🔍 Dibujando Bloques de Órdenes...");
        const response = await fetch(`/api/zonas-sd/${folder}/${symbol}`);
        const result = await response.json();

        if (result.status === "ok") {
            const areas = result.zonas.map(zona => {
                const esDemanda = zona.tipo === "DEMAND";
                const colorFondo = esDemanda ? 'rgba(0, 150, 255, 0.2)' : 'rgba(255, 80, 0, 0.2)';
                const colorBorde = esDemanda ? '#0096ff' : '#ff5000';

                return [
                    {
                        name: 'SD_ZONE',
                        yAxis: zona.bottom, 
                        xAxis: zona.fecha,
                        itemStyle: {
                            color: colorFondo,
                            borderWidth: 1,
                            borderColor: colorBorde
                        },
                        label: {
                            show: true,
                            position: 'insideLeft',
                            formatter: esDemanda ? ' OB DEMAND' : ' OB SUPPLY',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: 9,
                            backgroundColor: colorBorde,
                            padding: [2, 4],
                            borderRadius: 2
                        }
                    },
                    {
                        yAxis: zona.top 
                    }
                ];
            });

            const nuevasSeries = option.series.map(s => {
                if (s.type === 'candlestick') {
                    const dataExistente = (s.markArea && s.markArea.data) ? s.markArea.data : [];
                    return { ...s, markArea: { silent: true, data: [...dataExistente, ...areas] } };
                }
                return s;
            });

            myChart.setOption({ series: nuevasSeries });
            sdActivo = true;
            mostrarMensaje("✅ Bloques de Órdenes (Mecha a Cuerpo) Marcados");
        }
    } catch (error) {
        console.error("Error S&D:", error);
    }
}

async function mostrarZonasSD(folder, symbol) {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();

    // INTERRUPTOR (Toggle)
    if (sdActivo) {
        const seriesLimpias = option.series.map(s => {
            if (s.type === 'candlestick') {
                return { ...s, markArea: { ...s.markArea, data: s.markArea.data.filter(d => d[0].name !== 'SD_ZONE') } };
            }
            return s;
        });
        myChart.setOption({ series: seriesLimpias });
        sdActivo = false;
        mostrarMensaje("❌ Zonas S&D Ocultas");
        return;
    }

    try {
        mostrarMensaje("🔍 Localizando Bloques de Órdenes...");
        
        const response = await fetch(`/api/zonas-sd/${folder}/${symbol}`);
        const result = await response.json();

        if (result.status === "ok") {
            const areas = result.zonas.map(zona => {
                const esDemanda = zona.tipo === "DEMAND";
                // Colores más "sólidos" para representar bloques de órdenes
                const colorFondo = esDemanda ? 'rgba(0, 150, 255, 0.3)' : 'rgba(255, 80, 0, 0.3)';
                const colorBorde = esDemanda ? '#0096ff' : '#ff5000';

                return [
                    {
                        name: 'SD_ZONE',
                        yAxis: zona.bottom,
                        xAxis: zona.fecha,
                        itemStyle: {
                            color: colorFondo,
                            borderWidth: 2,
                            borderColor: colorBorde
                        },
                        label: {
                            show: true,
                            position: 'insideLeft',
                            formatter: esDemanda ? ' DEMANDA' : ' OFERTA',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: 10,
                            backgroundColor: colorBorde,
                            padding: [2, 4],
                            borderRadius: 2
                        }
                    },
                    {
                        yAxis: zona.top,
                        // Se extiende al infinito (borde derecho)
                    }
                ];
            });

            // Combinar con marcas existentes (como FVG si estuvieran activos)
            const nuevasSeries = option.series.map(s => {
                if (s.type === 'candlestick') {
                    const dataExistente = (s.markArea && s.markArea.data) ? s.markArea.data : [];
                    return {
                        ...s,
                        markArea: {
                            silent: true,
                            data: [...dataExistente, ...areas]
                        }
                    };
                }
                return s;
            });

            myChart.setOption({ series: nuevasSeries });
            sdActivo = true;
            mostrarMensaje("✅ Zonas S&D: Bloques Vírgenes Detectados");
        }
    } catch (error) {
        console.error("Error S&D:", error);
        mostrarMensaje("⚠️ Error al cargar Oferta/Demanda");
    }
}

async function mostrarLiquidez(folder, symbol) {
    const myChart = obtenerGrafico();
    if (!myChart) return;

    const option = myChart.getOption();

    // INTERRUPTOR (Toggle)
    if (liquidezActiva) {
        const seriesLimpias = option.series.map(s => {
            if (s.type === 'candlestick') {
                return { ...s, markPoint: { data: [] } };
            }
            return s;
        });
        myChart.setOption({ series: seriesLimpias });
        liquidezActiva = false;
        mostrarMensaje("❌ Liquidez Oculta");
        return;
    }

    try {
        mostrarMensaje("💰 Escaneando Caza de Stop Loss...");
        
        const response = await fetch(`/api/liquidez/${folder}/${symbol}`);
        const result = await response.json();

        if (result.status === "ok") {
            // Transformar puntos para markPoint de ECharts
            const puntos = result.puntos.map(p => {
                const esTecho = p.tipo === "BSL";
                return {
                    name: p.tipo,
                    coord: [p.fecha, p.precio],
                    value: '$',
                    symbol: 'pin',
                    symbolSize: 25,
                    itemStyle: {
                        color: esTecho ? '#ffcc00' : '#00ffcc', // Dorado para techos, Cian para suelos
                        shadowBlur: 10,
                        shadowColor: 'rgba(0,0,0,0.5)'
                    },
                    label: {
                        show: true,
                        formatter: '$',
                        fontWeight: 'bold',
                        color: '#000'
                    },
                    tooltip: {
                        formatter: `<b>${p.texto}</b><br/>Precio: ${p.precio.toFixed(4)}`
                    }
                };
            });

            const nuevasSeries = option.series.map(s => {
                if (s.type === 'candlestick') {
                    return {
                        ...s,
                        markPoint: {
                            data: puntos
                        }
                    };
                }
                return s;
            });

            myChart.setOption({ series: nuevasSeries });
            liquidezActiva = true;
            mostrarMensaje("✅ Liquidez ($) Marcada en el Mapa");
        }
    } catch (error) {
        console.error("Error Liquidez JS:", error);
        mostrarMensaje("⚠️ Error al cargar Liquidez");
    }
}


// Agregamos un listener robusto que espera a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {

    // Botón SMC (Estructura BOS/ChoCh)
    document.getElementById("btnSMC")?.addEventListener("click", () => {
        // "accionesusd" es tu carpeta por defecto, tickerActual es el activo vivo
        mostrarSMC("accionesusd", tickerActual);
    });

    // Botón FVG (Fair Value Gaps)
    document.getElementById("btnFVG")?.addEventListener("click", () => {
        mostrarFVG("accionesusd", tickerActual);
    });

    // Botón S&D (Oferta y Demanda)
    document.getElementById("btnSD")?.addEventListener("click", () => {
        mostrarZonasSD("accionesusd", tickerActual);
    });

    // Botón Liquidez (BSL / SSL)
    document.getElementById("btnLiquidez")?.addEventListener("click", () => {
        mostrarLiquidez("accionesusd", tickerActual);
    });

});