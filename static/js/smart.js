// radares_smart.js - Monitor de Flujo Institucional
console.log("🚀 Monitor de Smart Money cargado...");

async function actualizarMultiRadares() {
    try {
        const res = await fetch('/api/radares-smart');
        if (!res.ok) throw new Error('Error en API');
        
        const data = await res.json();
        const radares = ["scalping", "day", "swing", "institucional"];
        
        radares.forEach(tipo => {
            const contenedor = document.getElementById(`radar-${tipo}`);
            if (!contenedor) return;

            const listaAlertas = data[tipo].alertas;
            contenedor.innerHTML = "";

            if (listaAlertas.length === 0) {
                contenedor.innerHTML = `<div style="color:#444; font-size:10px; text-align:center; padding:15px;">Sin actividad</div>`;
            } else {
                listaAlertas.forEach(a => {
                    // --- DETECCIÓN DE ANOMALÍA (TITILEO) ---
                    const esExplosivo = a.fuerza > 10; 
                    const item = document.createElement("div");
                    
                    // Asignamos la clase CSS para que titile si es mayor a 10x
                    if (esExplosivo) {
                        item.className = "alerta-explosiva";
                    }

                    // Estilo base del cuadro
                    item.style.background = esExplosivo ? '#2c2c00' : '#1a1a1a';
                    item.style.borderLeft = `4px solid ${a.color}`;
                    item.style.padding = '10px';
                    item.style.marginBottom = '8px';
                    item.style.cursor = 'pointer';
                    item.style.borderRadius = '4px';
                    item.style.transition = 'transform 0.2s';
                    item.style.display = 'flex';
                    item.style.flexDirection = 'column';

                    // Contenido HTML del cuadro
                    item.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; flex-direction:column;">
                                <b style="color:${esExplosivo ? '#ffd700' : 'white'}; font-size:14px;">
                                    ${esExplosivo ? '🚀 ' : ''}${a.symbol}
                                </b>
                                <span style="color:${a.color}; font-size:9px; font-weight:bold; text-transform:uppercase;">
                                    ${a.tipo}
                                </span>
                            </div>
                            <div style="text-align:right;">
                                <div style="color:${a.color}; font-size:16px; font-weight:900;">
                                    ${a.fuerza}<small style="font-size:10px;">x</small>
                                </div>
                                <div style="color:#666; font-size:8px; font-weight:bold;">VOL RELATIVO</div>
                            </div>
                        </div>
                    `;

                    // Interacción
                    item.onmouseover = () => item.style.transform = "scale(1.03)";
                    item.onmouseout = () => item.style.transform = "scale(1)";
                    
                    item.onclick = () => {
                        if (typeof window.sincronizarTodo === "function") {
                            window.sincronizarTodo(a.symbol);
                        }
                    };

                    contenedor.appendChild(item);
                });
            }
        });
    } catch (err) {
        console.error("❌ Error actualizando radares:", err);
    }
}

// Disparo inicial y configuración de intervalo (cada 30 segundos)
document.addEventListener('DOMContentLoaded', () => {
    actualizarMultiRadares();
   
});