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
        console.log("Intentando cargar CSV para:", symbol); // Mensaje de control
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
        const toNumber = (val) => {
            const n = parseFloat(String(val).trim().replace(/,/g, ""));
            return Number.isFinite(n) ? n : null;
        };

        const registrosValidos = data.map(r => ({
            date: r[0],
            precio: toNumber(r[2]),
            monto: toNumber(r[4])
        })).filter(row => row.date && row.precio !== null);

        const dias = rangoMeses * 30;
        const ultimos = registrosValidos.slice(-dias);

        const labels = ultimos.map(r => r.date);
        const precios = ultimos.map(r => r.precio);
        const montos = ultimos.map(r => r.monto);


        //rendimeinto
        // ... (debajo de donde actualizas el precio)

// 1. Obtener el primer precio (el más antiguo) y el último (el actual)
const precioInicial = precios[0]; 
const precioFinal = precios[precios.length - 1];

if (precioInicial && precioFinal) {
    // 2. Calcular el porcentaje de rendimiento
    const rendimientoTotal = ((precioFinal - precioInicial) / precioInicial) * 100;

    // 3. Seleccionar el elemento y formatear
    const elRendimiento = document.getElementById("rendimiento");
    elRendimiento.textContent = `${rendimientoTotal.toFixed(2)}%`;

    // 4. Bonus: Color dinámico (verde si subió, rojo si bajó)
    elRendimiento.style.color = rendimientoTotal >= 0 ? "#00ff00" : "#ff0000";
}

        // --- AQUÍ ESTÁ LA CONEXIÓN QUE FALTA ---
        console.log("🔌 Conectando con indicadores.js...");
        if (typeof procesarRSI === "function") {
            procesarRSI(precios, labels); 
        } else {
            console.error("❌ ERROR: indicadores.js no está cargado o procesarRSI no existe.");
        }
        // ---------------------------------------

        if (precios.length === 0) return;

        // 🔹 Gráfica de Precio (lo que ya tenías)
        if (chart) chart.destroy();
        const ctx = document.getElementById("grafica_linea").getContext("2d");
        chart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: `${symbol} Precio`,
                    data: precios,
                    borderColor: "#ff0000ff",
                    borderWidth: 2,
                    tension: 0
                }]
            }
        });

        // 🔹 Gráfica de Volumen
       // 🔹 Gráfica de Volumen con colores dinámicos
if (volumeChart) volumeChart.destroy();

// Generar array de colores: rojo si el precio bajó, verde si subió o se mantuvo
const coloresVolumen = precios.map((p, i) => {
    if (i === 0) return "green"; // Primer dato por defecto
    return p < precios[i - 1] ? "red" : "green";
});

const ctxVol = document.getElementById("volumen_bs").getContext("2d");
volumeChart = new Chart(ctxVol, {
    type: "bar",
    data: {
        labels,
        datasets: [{
            label: "Monto Efectivo",
            data: montos,
            backgroundColor: coloresVolumen
        }]
    },
    options: {
        scales: {
            y: {
                type: 'logarithmic', // <--- Esto hace la magia
                beginAtZero: false   // En logarítmica es mejor false o Chart.js se quejará
            }
        }
    }
});

        // Actualizar el DOM
        document.getElementById("precio").textContent = `${precios[precios.length-1].toLocaleString("es-VE")} Bs`;

    } catch (err) {
        console.error("Error en cargarGrafica:", err);
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

