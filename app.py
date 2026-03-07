from flask import Flask, render_template, request, jsonify



from services.smart import obtener_movimientos_multi_radar

from services.power import calcular_master_score_brutal
from services.operaciones import procesar_radar_completo

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

@app.route("/index5")
def index5():
    return render_template("index5.html")



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
    
#----------------------------------
@app.route('/api/indicador_maestro/<simbolo>')
def api_maestro(simbolo):
    # Asumiendo que tus archivos están en esta ruta
    path = f"static/acciones/{simbolo.upper()}.csv"
    resultado = calcular_master_score_brutal(path)
    return jsonify(resultado)


#----------------------------------------------operaciones



@app.route('/api/radar/<symbol>')
def radar_motor(symbol):
    resultado = procesar_radar_completo(symbol)
    return jsonify(resultado)


# -------------------- MAIN --------------------
if __name__ == "__main__":
    app.run(debug=True)
