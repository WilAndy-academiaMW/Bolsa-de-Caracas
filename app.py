from flask import Flask, render_template, request, jsonify


from services.preciocap import actualizar
from services.prices import update_all_csv
from services.smart import obtener_movimientos_multi_radar

# from services import Fear   # eliminado porque no se usa

app = Flask(__name__)

# -------------------- RUTAS HTML --------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/index2")
def index2():
    return render_template("index2.html")

@app.route("/index3")
def index3():
    return render_template("index3.html")

@app.route("/index4")
def index4():
    return render_template("index4.html")

@app.route("/grafica")
def grafica():
    return render_template("grafica.html")

# -------------------- API ZONAS --------------------
@app.route("/guardar_zona_compra", methods=["POST"])
def guardar_zona_compra_route():
    data = request.get_json()
    zonas.guardar_zona_compra(data)
    return jsonify({"ok": True})

@app.route("/guardar_zona_venta", methods=["POST"])
def guardar_zona_venta_route():
    data = request.get_json()
    zonas.guardar_zona_venta(data)
    return jsonify({"ok": True})

@app.route("/guardar_fvg", methods=["POST"])
def guardar_fvg_route():
    data = request.get_json()
    zonas.guardar_fvg(data)
    return jsonify({"ok": True})

@app.route("/cargar_fvg", methods=["GET"])
def cargar_fvg_route():
    return jsonify(zonas.cargar_fvg())

@app.route("/guardar_fibo", methods=["POST"])
def guardar_fibo_route():
    data = request.get_json()
    guardar_fibo(data)
    return jsonify({"ok": True})

@app.route("/cargar_fibo", methods=["GET"])
def cargar_fibo_route():
    return jsonify(cargar_fibo())

@app.route("/guardar_canal", methods=["POST"])
def guardar_canal_route():
    data = request.get_json()
    guardar_canal(data)
    return jsonify({"ok": True})

@app.route("/cargar_canal", methods=["GET"])
def cargar_canal_route():
    return jsonify(cargar_canal())

# -------------------- Tendencias --------------------
@app.route("/guardar_tendencia", methods=["POST"])
def guardar_tendencia_route():
    data = request.get_json()
    guardar_tendencia(data)
    return jsonify({"ok": True})

@app.route("/cargar_tendencia", methods=["GET"])
def cargar_tendencia_route():
    return jsonify(cargar_tendencia())

# -------------------- Ondas de Elliott --------------------
@app.route("/guardar_ondas", methods=["POST"])
def guardar_ondas_route():
    data = request.get_json()
    guardar_ondas(data)
    return jsonify({"ok": True})

@app.route("/cargar_ondas", methods=["GET"])
def cargar_ondas_route():
    return jsonify(cargar_ondas())

# -------------------- Precio y capitalización --------------------
@app.route("/actualizar", methods=["GET"]) 
def actualizar_route(): 
    resultado = actualizar() 
    return jsonify(resultado)

# -------------------- Data histórica --------------------
@app.route("/download_all", methods=["GET"]) 
def download_all_route(): 
    results = update_all_csv() 
    return jsonify(results)

#--------------------------------------------------------
from services import derivatives

@app.route("/funding/<symbol>")
def funding_route(symbol):
    return jsonify(derivatives.obtener_funding(symbol))

@app.route("/openinterest/<symbol>")
def open_interest_route(symbol):
    return jsonify(derivatives.obtener_open_interest(symbol))

#--------------------liquidaciones--------------
from services import liquidaciones

@app.route("/liquidaciones/<symbol>")
def liquidaciones_route(symbol):
    result = liquidaciones.obtener_liquidaciones(symbol)
    return jsonify(result), (200 if result.get("ok") else 400)

#----------------------------------------
from services import datos

@app.route("/actualizar_datos", methods=["GET"])
def actualizar_datos_route():
    result = datos.actualizar_datos()
    return jsonify(result)

#--------------------volumen--------------------
from services import volumen

@app.route("/actualizar_volumen", methods=["GET"])
def actualizar_volumen_route():
    result = volumen.actualizar_volumen()
    return jsonify(result)

#--------------------convertidos---------------
from services.convercion import convertir_acciones 

@app.route("/convertir", methods=["POST"])
def convertir():
    mensaje = convertir_acciones()
    return jsonify({"status": "ok", "message": mensaje})

#------------------ Miedo y Codicia -----------------
from services.fear_greed import calcular_fear_greed
import os

@app.route("/feargreed/<symbol>")
def feargreed(symbol):
    try:
        # ✅ ahora apunta a static/acciones/
        ruta = os.path.join("static", "acciones", f"{symbol}.csv")

        if not os.path.exists(ruta):
            return jsonify({"error": f"Archivo {ruta} no encontrado"}), 404

        resultado = calcular_fear_greed(ruta)
        resultado["symbol"] = symbol
        return jsonify(resultado)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
#---------------radar

@app.route('/api/radares-smart')
def api_radares():
    """Esta es la ruta que tu JavaScript está llamando cada 30 segundos"""
    try:
        data = obtener_movimientos_multi_radar()
        return jsonify(data)
    except Exception as e:
        print(f"Error en la API: {e}")
        return jsonify({"error": "No se pudieron obtener los datos"}), 500
# -------------------- MAIN --------------------
if __name__ == "__main__":
    app.run(debug=True)
