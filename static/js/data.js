
document.getElementById("data").addEventListener("click", async () => {
    try {
        const response = await fetch("/actualizar_datos");
        const result = await response.json();
        console.log("Resultado:", result);
        alert("Datos actualizados correctamente ✅");
    } catch (error) {
        console.error("Error al actualizar:", error);
        alert("❌ Error al actualizar datos");
    }
});

//---------------------------------


document.getElementById("volumen").addEventListener("click", async () => {
    try {
        const response = await fetch("/actualizar_volumen");
        const result = await response.json();
        console.log("Resultado:", result);
        alert("✅ Volumen actualizado correctamente");
    } catch (error) {
        console.error("Error al actualizar volumen:", error);
        alert("❌ Error al actualizar volumen");
    }
});

