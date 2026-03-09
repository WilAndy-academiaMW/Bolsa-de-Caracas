let fiboActivo = false;

let puntosFibonacci = [];

// Activador del botón

document.getElementById('fibo').addEventListener('click', function() {

    fiboActivo = !fiboActivo;

    puntosFibonacci = [];

    const mensajeDiv = document.getElementById('mensaje');

   

    if (fiboActivo) {

        this.style.border = "2px solid #ff0000";

        mensajeDiv.innerText = "📏 MODO FIBO: Haz clic en el MÍNIMO (P1)";

    } else {

        this.style.border = "";

        mensajeDiv.innerText = "Modo Fibonacci desactivado";

    }

});



// Captura de clics en el gráfico

myChart.getZr().on('click', function (params) {

    if (!fiboActivo) return;



    var pointInGrid = myChart.convertFromPixel('grid', [params.offsetX, params.offsetY]);

    if (pointInGrid) {

        const indexVela = Math.round(pointInGrid[0]);

        const datosVela = myChart.getOption().series[0].data[indexVela];

        const fecha = myChart.getOption().xAxis[0].data[indexVela];



        if (!datosVela) return;



        // P1 = Low (index 2), P2 = High (index 3)

        let precioReal = (puntosFibonacci.length === 0) ? datosVela[2] : datosVela[3];

        puntosFibonacci.push({ fecha, precio: precioReal });



        if (puntosFibonacci.length === 1) {

            document.getElementById('mensaje').innerText = `📍 P1 (Mínimo): $${precioReal}. Selecciona P2 (Máximo).`;

        }

        else if (puntosFibonacci.length === 2) {

            dibujarFiboLimpio(puntosFibonacci[0], puntosFibonacci[1]);

            guardarFiboEnPython(tickerActual, puntosFibonacci[0], puntosFibonacci[1]);



            fiboActivo = false;

            document.getElementById('fibo').style.border = "";

            document.getElementById('mensaje').innerText = `✅ Fibo guardado para ${tickerActual}`;

        }

    }

});



// Función "Brutal" de Dibujo

function dibujarFiboLimpio(p1, p2) {

    const opciones = myChart.getOption();

    const ultimaFecha = opciones.xAxis[0].data[opciones.xAxis[0].data.length - 1];

    const diff = p2.precio - p1.precio;

   

    const niveles = [

        { valor: p1.precio, etiqueta: '1.0', color: '#ff0000', solido: true },

        { valor: p2.precio, etiqueta: '0.0', color: '#ff0000', solido: true },

        { valor: p2.precio - (diff * 0.236), etiqueta: '0.236', color: '#8392A5', solido: false },

        { valor: p2.precio - (diff * 0.382), etiqueta: '0.382', color: '#8392A5', solido: false },

        { valor: p2.precio - (diff * 0.5), etiqueta: '0.5', color: '#8392A5', solido: false },

        { valor: p2.precio - (diff * 0.618), etiqueta: '0.618', color: '#ff9800', solido: true },

        { valor: p2.precio - (diff * 0.66), etiqueta: '0.66', color: '#ff9800', solido: true },

        { valor: p2.precio - (diff * 0.786), etiqueta: '0.786', color: '#4400ff', solido: true }

    ];



    const lineasData = niveles.map(n => ([

        { coord: [p1.fecha, n.valor] },

        {

            coord: [ultimaFecha, n.valor],

            label: {

                formatter: `${n.etiqueta} ($${n.valor.toFixed(2)})`,

                position: 'end', show: true, color: n.color,

                backgroundColor: '#000', padding: [2, 4], borderRadius: 2

            }

        }

    ]));



    myChart.setOption({

        series: [{

            name: 'Precio',

            markLine: {

                symbol: ['none', 'none'],

                data: lineasData.map((linea, index) => {

                    const n = niveles[index];

                    return [

                        { ...linea[0], lineStyle: { color: n.color, type: n.solido ? 'solid' : 'dashed', width: n.solido ? 2 : 1 } },

                        { ...linea[1] }

                    ];

                })

            }

        }]

    });

}

let fiboVisible = true; // Estado inicial

function toggleFibonacci() {
    const btn = document.getElementById('fibo-off');
    const chartInstance = echarts.getInstanceByDom(document.getElementById('grafica'));
    
    if (!chartInstance) return;

    if (fiboVisible) {
        // --- LÓGICA PARA OCULTAR ---
        chartInstance.setOption({
            series: [{
                name: 'Precio',
                markLine: { data: [] } 
            }]
        }, false);
        
        btn.innerText = "Mostrar Fibonacci";
        btn.classList.add('btn-active'); // Opcional: para cambiar el color del botón
        fiboVisible = false;
        console.log("Fibonacci oculto visualmente");

    } else {
        // --- LÓGICA PARA MOSTRAR ---
        // Volvemos a llamar a la función que ya tienes para traer los datos de Python
        if (typeof cargarFiboGuardado === 'function') {
            cargarFiboGuardado(tickerActual);
        }
        
        btn.innerText = "Ocultar Fibonacci";
        btn.classList.remove('btn-active');
        fiboVisible = true;
        console.log("Restaurando Fibonacci de: " + tickerActual);
    }
}

// Vincular al botón
document.getElementById('fibo-off')?.addEventListener('click', toggleFibonacci);



/**

 * Filtra el zoom de la gráfica para mostrar periodos específicos

 * @param {number} dias - Cantidad de días hacia atrás

 * @param {string} textoLabel - Texto para el mensaje (ej: "1 Mes")

 */

function filtrarTiempo(dias, textoLabel) {

    const mensajeDiv = document.getElementById('mensaje');

   

    // 1. Obtener datos actuales del gráfico

    const opciones = myChart.getOption();

    if (!opciones.xAxis[0].data) return;

   

    const totalPuntos = opciones.xAxis[0].data.length;



    let startPercent;



    // 2. Lógica de cálculo de zoom

    if (dias === 0) {

        startPercent = 0; // Mostrar todo

    } else {

        // Calculamos cuánto representa 'dias' respecto al total

        const diferencia = (dias / totalPuntos) * 100;

        startPercent = 100 - diferencia;

        if (startPercent < 0) startPercent = 0;

    }



    // 3. Aplicar el zoom en ECharts

    myChart.dispatchAction({

        type: 'dataZoom',

        start: startPercent,

        end: 100

    });



    // 4. Actualizar el mensaje de estado

    mensajeDiv.innerText = `Visualizando: Gráfica de ${textoLabel}`;

}



// ==========================================

// 4. COMUNICACIÓN CON PYTHON (API)

// ==========================================



function guardarFiboEnPython(moneda, p1, p2) {

    fetch('/api/guardar-fibo', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ moneda, p1, p2 })

    })

    .then(res => res.json())

    .then(data => console.log(data.message));

}



function cargarFiboGuardado(moneda) {

    fetch(`/api/cargar-fibo/${moneda}`)

    .then(res => res.json())

    .then(data => {

        if (data.status === "found") {

            dibujarFiboLimpio(data.puntos[0], data.puntos[1]);

        } else {

            // Si no hay Fibo, limpiamos las líneas viejas del gráfico

            myChart.setOption({ series: [{ name: 'Precio', markLine: { data: [] } }] });

        }

    });

}



// ==========================================

// 5. FUNCIONES DE APOYO (CSV Y FILTROS)

// ==========================================



async function loadCSV(path) {

    const response = await fetch(path);

    if (!response.ok) return { dates: [], ohlc: [] };

    const text = await response.text();

    const rows = text.trim().split("\n").slice(1);

    let dates = [];

    let ohlc = [];

    rows.forEach(row => {

        const parts = row.split(",");

        if (parts.length >= 5) {

            dates.push(parts[0]);

            ohlc.push([parseFloat(parts[1]), parseFloat(parts[4]), parseFloat(parts[3]), parseFloat(parts[2])]);

        }

    });

    return { dates, ohlc };

}
