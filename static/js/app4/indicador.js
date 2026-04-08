let flowChartInstance = null;

async function actualizarOsciladorFlujo(simbolo) {
    const canvas = document.getElementById('bvc_flow_oscillator');
    if (!canvas) return;

    try {
        const response = await fetch(`/api/oscilador-poder/${simbolo}`);
        const data = await response.json();

        if (!data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (flowChartInstance) flowChartInstance.destroy();

        flowChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.time),
                datasets: [
                    {
                        label: 'Flow Momentum',
                        data: data.map(d => d.value),
                        borderColor: '#00ff9d', 
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 8, // Puntos grandes como pediste
                        pointHoverBackgroundColor: '#fff',
                        fill: {
                            target: 'origin',
                            above: 'rgba(0, 255, 157, 0.15)',
                            below: 'rgba(255, 65, 54, 0.15)'
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleFont: { family: 'monospace' },
                        bodyFont: { family: 'monospace' },
                        callbacks: {
                            title: (ctx) => `📅 FECHA: ${ctx[0].label}`,
                            label: (ctx) => ` MOMENTUM: ${ctx.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: {
                        // Forzamos el rango exacto de -100 a 100
                        min: -105,
                        max: 105,
                        grid: {
                            // Aquí configuramos las líneas sólidas de 75 y -75
                            color: (context) => {
                                const val = context.tick.value;
                                if (val === 0) return 'rgba(255, 255, 255, 0.5)'; // Eje central
                                if (val === 75 || val === -75) return 'rgba(0, 255, 157, 0.8)'; // Líneas de alerta
                                return 'rgba(255, 255, 255, 0.05)'; // Grilla normal
                            },
                            lineWidth: (context) => {
                                const val = context.tick.value;
                                if (val === 75 || val === -75) return 3; // 3px para las líneas de poder
                                if (val === 0) return 2;
                                return 1;
                            },
                            drawBorder: false
                        },
                        ticks: {
                            // Forzamos que se dibujen los valores que nos interesan
                            stepSize: 25, 
                            display: false // Mantenemos los números ocultos para estética brutalista
                        }
                    }
                }
            }
        });

        // Actualizar Nexus Gauge
        if (data.length > 0) {
            actualizarNexusInterface(data[data.length - 1].value);
        }

    } catch (error) {
        console.error("❌ Error en Power JS:", error);
    }
}

function actualizarNexusInterface(score) {
    const scoreNum = document.getElementById('nexus_score');
    const needle = document.getElementById('nexus_needle');
    const estado = document.getElementById('nexus_estado');
    
    if (scoreNum) scoreNum.innerText = score.toFixed(0);
    
    if (needle) {
        // Mapeo: -100 a 100 -> -90deg a 90deg
        const deg = score * 0.9;
        needle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
    }

    if (estado) {
        if (score >= 75) {
            estado.innerText = "OVERBOUGHT / CLIMAX";
            estado.style.color = "#00ff9d";
            estado.style.textShadow = "0 0 10px #00ff9d";
        } else if (score <= -75) {
            estado.innerText = "OVERSOLD / PANIC";
            estado.style.color = "#ff4136";
            estado.style.textShadow = "0 0 10px #ff4136";
        } else if (score > 0) {
            estado.innerText = "BULLISH MOMENTUM";
            estado.style.color = "#00ff9d";
        } else {
            estado.innerText = "BEARISH MOMENTUM";
            estado.style.color = "#ff4136";
        }
    }
}