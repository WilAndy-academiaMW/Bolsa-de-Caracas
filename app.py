from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import os
from datetime import timedelta

# --- IMPORTACIONES DE TUS SERVICIOS ORIGINALES ---
from services.smart import obtener_movimientos_multi_radar
from services.fibonnaci import guardar_fibo_csv, cargar_fibo_csv
from services.power import calcular_master_score_brutal
from services.operaciones import procesar_radar_completo
from services.convercion import convertir_acciones 
from services.fear_greed import calcular_fear_greed
from services.smc_test import calcular_smc_estructura
from services.fvg_test import calcular_fvg_data
from services.sd_test import calcular_oferta_demanda
from services.liquidez_test import calcular_liquidez_data

app = Flask(__name__)

# CONFIGURACIÓN BÁSICA
app.secret_key = 'tu_clave_secreta_brutal_123' 
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# -------------------- RUTAS DE NAVEGACIÓN (SIN CANDADOS) --------------------

@app.route("/")
@app.route("/index2")
def index2():
    # Eliminado el "if not session" para que entre directo
    return render_template("index2.html", usuario_autenticado=True)

@app.route("/index3")
def index3():
    return render_template("index3.html", usuario_autenticado=True)

@app.route("/index4")
def index4():
    return render_template("index4.html", usuario_autenticado=True)

@app.route("/index5")
def index5():
    return render_template("index5.html", usuario_autenticado=True)

# -------------------- APIS DE DATOS (SIN CHEQUEO DE SESIÓN) --------------------

@app.route("/convertir", methods=["POST"])
def convertir():
    mensaje = convertir_acciones()
    return jsonify({"status": "ok", "message": mensaje})

@app.route("/feargreed/<symbol>")
def feargreed(symbol):
    try:
        ruta = os.path.join("static", "acciones", f"{symbol.upper()}.csv")
        if not os.path.exists(ruta):
            return jsonify({"error": "Archivo no encontrado"}), 404
        resultado = calcular_fear_greed(ruta)
        resultado["symbol"] = symbol
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/radares-smart')
def api_radares():
    try:
        data = obtener_movimientos_multi_radar()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/indicador_maestro/<simbolo>')
def api_maestro(simbolo):
    path = f"static/acciones/{simbolo.upper()}.csv"
    resultado = calcular_master_score_brutal(path)
    return jsonify(resultado)

@app.route('/api/radar/<symbol>')
def radar_motor(symbol):
    resultado = procesar_radar_completo(symbol)
    return jsonify(resultado)

@app.route("/api/guardar-fibo", methods=['POST'])
def api_guardar_fibo():
    datos = request.json
    return jsonify(guardar_fibo_csv(datos.get('moneda'), datos.get('p1'), datos.get('p2')))

@app.route("/api/cargar-fibo/<moneda>")
def api_cargar_fibo(moneda):
    return jsonify(cargar_fibo_csv(moneda))

@app.route('/api/smc/<folder>/<symbol>')
def api_smc(folder, symbol):
    path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
    return jsonify(calcular_smc_estructura(path))

@app.route('/api/fvg/<folder>/<symbol>')
def api_fvg(folder, symbol):
    path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
    return jsonify(calcular_fvg_data(path))
    
@app.route('/api/zonas-sd/<folder>/<symbol>')
def api_zonas_sd(folder, symbol):
    path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
    return jsonify(calcular_oferta_demanda(path))

@app.route('/api/liquidez/<folder>/<symbol>')
def api_liquidez(folder, symbol):
    path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
    return jsonify(calcular_liquidez_data(path, tolerancia=0.0005))



from services.indicadorbcv import calcular_oscilador_brutal

@app.route('/api/oscilador-poder/<simbolo>')
def api_oscilador_poder(simbolo):
    # Ahora 'simbolo' es dinámico, viene de lo que el usuario clickee
    resultado = calcular_oscilador_brutal(simbolo)
    return jsonify(resultado)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)