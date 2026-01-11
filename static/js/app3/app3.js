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

    async function cargarGrafica(symbol) {
        try {
            const res = await fetch(`/static/acciones/${symbol}.csv`);
            if (!res.ok) {
                alert(`Error al cargar CSV de ${symbol}`);
                return;
            }
            const text = await res.text();
            const lines = text.trim().split("\n");
            if (lines.length <= 1) {
                alert(`CSV de ${symbol} vacío o inválido`);
                return;
            }

            const data = lines.slice(1).map(r => r.split(","));

            const fechaIndex = 0;   // Fecha
            const precioIndex = 2;  // Último Precio (Bs)
            const montoIndex = 4;   // Monto Efectivo (Bs)

            const toNumber = (val) => {
                const n = parseFloat(String(val).trim().replace(/,/g, ""));
                return Number.isFinite(n) ? n : null; // ✅ quitamos Math.abs
            };

            const registrosValidos = data.map(r => ({
                date: r[fechaIndex],
                precio: toNumber(r[precioIndex]),
                monto: toNumber(r[montoIndex])
            })).filter(row => row.date && row.precio !== null && row.monto !== null);

            const dias = rangoMeses * 30;
            const ultimos = registrosValidos.slice(-dias);

            const labels = ultimos.map(r => r.date);
            const precios = ultimos.map(r => r.precio);
            const montos = ultimos.map(r => r.monto);

            if (precios.length === 0 || montos.length === 0) {
                alert("No se encontraron datos válidos para graficar");
                return;
            }

            // 🔹 Gráfica de Precio
            if (chart) chart.destroy();
            const ctx = document.getElementById("grafica_linea").getContext("2d");
            chart = new Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: `${symbol} Último Precio (Bs)`,
                        data: precios,
                        borderColor: "#ff0000ff",
                        backgroundColor: "rgba(0,0,0,0.08)",
                        borderWidth: 2,
                        tension: 0
                    }]
                },
                options: { responsive: true }
            });

            // 🔹 Colores de barras según variación del precio
            const colors = montos.map((_, i) => {
                if (i === 0) return "green";
                return precios[i] >= precios[i - 1] ? "green" : "red";
            });

            // 🔹 Gráfica de Monto Efectivo (Bs)
            if (volumeChart) volumeChart.destroy();
            const ctxVol = document.getElementById("volumen_bs").getContext("2d");
            volumeChart = new Chart(ctxVol, {
                type: "bar",
                data: {
                    labels,
                    datasets: [{
                        label: `${symbol} Monto Efectivo (Bs)`,
                        data: montos,
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
            // 🔹 Resumen de montos positivos y negativos
            let positivos = 0, negativos = 0;
            let sumaPos = 0, sumaNeg = 0;
            for (let i = 0; i < montos.length; i++) {
                const monto = montos[i];
                if (i === 0 || precios[i] >= precios[i - 1]) {
                    positivos++;
                    sumaPos += monto;
                } else {
                    negativos++;
                    sumaNeg += monto;
                }
            }
            const sumaTotal = sumaPos + sumaNeg;
            const resumenDiv = document.getElementById("resumen_volumen");
            resumenDiv.innerHTML = `
                <p><strong>Días positivos (precio ↑):</strong> ${positivos} — Total: ${sumaPos.toLocaleString("es-VE")} Bs</p>
                <p><strong>Días negativos (precio ↓):</strong> ${negativos} — Total: ${sumaNeg.toLocaleString("es-VE")} Bs</p>
                <p><strong>Total acumulado:</strong> ${positivos + negativos} días — ${sumaTotal.toLocaleString("es-VE")} Bs</p>
            `;

            // 🔹 Último precio
            const ultimoPrecio = precios[precios.length - 1];
            document.getElementById("precio").textContent = `${ultimoPrecio.toLocaleString("es-VE")} Bs`;

            // 🔹 Rendimiento (máximo 30 días)
            if (precios.length > 1) {
                const dias = Math.min(30, precios.length - 1);
                const precioInicial = precios[precios.length - dias];
                const precioFinal = ultimoPrecio;
                const rendimiento = ((precioFinal - precioInicial) / precioInicial) * 100;
                document.getElementById("rendimiento").textContent =
                    `${rendimiento.toFixed(2)} %`;
            } else {
                document.getElementById("rendimiento").textContent = "N/A";
            }

            // 🔹 Dibujar RSI
        

        } catch (err) {
            console.error("Error cargando gráfica:", err);
            alert(`Error cargando gráfica de ${symbol}: ${err.message}`);
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

