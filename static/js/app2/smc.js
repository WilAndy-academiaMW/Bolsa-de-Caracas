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
    const myChart = obtenerGrafico(); // Usa la función que ya tenemos para ECharts
    if (!myChart) return;

    const option = myChart.getOption();

    // INTERRUPTOR: Si ya está activo, lo removemos (Toggle)
    if (fvgActivo) {
        const seriesLimpias = option.series.map(s => {
            if (s.type === 'candlestick') {
                return { ...s, markArea: { data: [] } };
            }
            return s;
        });
        myChart.setOption({ series: seriesLimpias });
        fvgActivo = false;
        mostrarMensaje("❌ FVG: Zonas Mitigadas Ocultas");
        return;
    }

    try {
        mostrarMensaje("🔍 Filtrando Vacíos No Mitigados...");
        
        // Llamada a tu nueva API con filtro de mitigación
        const response = await fetch(`/api/fvg/${folder}/${symbol}`);
        const result = await response.json();

        if (result.status === "ok") {
            // Creamos las áreas para ECharts
            const areas = result.fvgs.map(gap => {
                const esAlcista = gap.tipo === "BULLISH";
                
                // Colores: Verde para compras (Bullish), Rojo para ventas (Bearish)
                // Usamos opacidad baja (0.15) para el fondo y (0.5) para el borde
                const colorFondo = esAlcista ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 46, 99, 0.15)';
                const colorBorde = esAlcista ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 46, 99, 0.5)';

                return [
                    {
                        name: gap.tipo,
                        yAxis: gap.bottom,
                        xAxis: gap.fecha, // Punto de origen en el tiempo
                        itemStyle: {
                            color: colorFondo,
                            borderWidth: 1,
                            borderType: 'dashed',
                            borderColor: colorBorde
                        },
                        label: {
                            show: true,
                            position: 'insideRight',
                            formatter: esAlcista ? 'FVG Buy' : 'FVG Sell',
                            color: colorBorde,
                            fontSize: 10,
                            distance: 10
                        }
                    },
                    {
                        yAxis: gap.top,
                        // Al no definir xAxis aquí, la caja se extiende hasta el borde derecho
                    }
                ];
            });

            // Actualizamos la serie de velas con las nuevas áreas
            const nuevasSeries = option.series.map(s => {
                if (s.type === 'candlestick') {
                    return {
                        ...s,
                        markArea: {
                            silent: true, // Evita que interfiera con el tooltip de las velas
                            data: areas
                        }
                    };
                }
                return s;
            });

            myChart.setOption({ series: nuevasSeries });
            fvgActivo = true;
            mostrarMensaje("✅ FVG: Zonas Vivas Marcadas");
        } else {
            mostrarMensaje("⚠️ No se encontraron FVG vivos");
        }
    } catch (error) {
        console.error("Error FVG JS:", error);
        mostrarMensaje("⚠️ Error de conexión API");
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


document.getElementById("btnSMC")?.addEventListener("click", () => {
    // Intentamos obtener el símbolo del input de búsqueda
    const inputSymbol = document.getElementById("search-input")?.value;
    // Si no hay nada en el input, puedes usar uno por defecto o una variable global
    const symbol = inputSymbol || "ABC.A"; 
    
    // Ejecutamos pasando la carpeta y el símbolo
    mostrarSMC("accionesusd", symbol);
});
document.getElementById("btnFVG")?.addEventListener("click", () => {
    const symbol = document.getElementById("search-input")?.value || "ABC.A";
    mostrarFVG("accionesusd", symbol);
});
document.getElementById("btnSD")?.addEventListener("click", () => {
    const symbol = document.getElementById("search-input")?.value || "ABC.A";
    mostrarZonasSD("accionesusd", symbol);
});
document.getElementById("btnLiquidez")?.addEventListener("click", () => {
    const symbol = document.getElementById("search-input")?.value || "ABC.A";
    mostrarLiquidez("accionesusd", symbol);
});