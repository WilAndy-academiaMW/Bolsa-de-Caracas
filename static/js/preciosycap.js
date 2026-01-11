document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("precios"); // usar el id correcto

    if (btn) {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                const res = await fetch("/actualizar");
                const data = await res.json();
                console.log(data.message); 
                alert("Precios actualizados en CSV");
            } catch (err) {
                console.error("Error:", err);
                alert("Error al actualizar precios");
            }
        });
    } else {
        console.error("No se encontró el botón con id='precios'");
    }
});



document.getElementById("Convertir").addEventListener("click", async () => {
    try {
        const res = await fetch("/convertir", { method: "POST" });
        const data = await res.json();
        alert(data.message); // "Conversión realizada"
    } catch (err) {
        alert("Error al convertir: " + err);
    }
});

