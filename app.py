from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import os
import mysql.connector
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

# CONFIGURACIÓN CRÍTICA
app.secret_key = 'tu_clave_secreta_brutal_123' 
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# --- CONFIGURACIÓN DE LA BASE DE DATOS ---
DB_CONFIG = {
    'host': 'william23.mysql.pythonanywhere-services.com',
    'user': 'william23',
    'password': '!KZ!U2AdpjA@ni@', # <--- CAMBIA ESTO POR TU CLAVE REAL
    'database': 'william23$bvc'
}

def obtener_conexion():
    """Crea una conexión fresca a la base de datos"""
    return mysql.connector.connect(**DB_CONFIG)

# -------------------- LÓGICA DE NAVEGACIÓN PÚBLICA --------------------

@app.route("/")
def home():
    if session.get('logeado'):
        return redirect(url_for('index5'))
    return render_template("inicio.html")

@app.route("/acceso")
def acceso():
    if session.get('logeado'):
        return redirect(url_for('index5'))
    return render_template("login_page.html")

@app.route("/login", methods=["POST"])
def login():
    usuario_input = request.form.get("usuario")
    password_input = request.form.get("password")

    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor(dictionary=True)
        
        # Buscamos al usuario en la tabla que creamos en DBeaver
        query = "SELECT usuario, password, estatus FROM usuarios WHERE usuario = %s"
        cursor.execute(query, (usuario_input,))
        usuario_db = cursor.fetchone()

        cursor.close()
        conexion.close()

        if usuario_db:
            if usuario_db['password'] == password_input:
                if usuario_db['estatus'] == 'activo':
                    session.permanent = True
                    session['logeado'] = True
                    session['user'] = usuario_db['usuario']
                    return redirect(url_for('index5'))
                else:
                    flash("TU MEMBRESÍA NO ESTÁ ACTIVA.")
            else:
                flash("CONTRASEÑA INCORRECTA.")
        else:
            flash("EL USUARIO NO EXISTE EN EL SISTEMA.")

    except Exception as e:
        flash(f"ERROR TÉCNICO: {str(e)}")
    
    return redirect(url_for('acceso'))

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for('home'))

# -------------------- RUTAS HTML PROTEGIDAS --------------------

@app.route("/index2")
def index2():
    if not session.get('logeado'): return redirect(url_for('acceso'))
    return render_template("index2.html", usuario_autenticado=True)

@app.route("/index3")
def index3():
    if not session.get('logeado'): return redirect(url_for('acceso'))
    return render_template("index3.html", usuario_autenticado=True)

@app.route("/index4")
def index4():
    if not session.get('logeado'): return redirect(url_for('acceso'))
    return render_template("index4.html", usuario_autenticado=True)

@app.route("/index5")
def index5():
    if not session.get('logeado'): return redirect(url_for('acceso'))
    return render_template("index5.html", usuario_autenticado=True)

# -------------------- APIS DE DATOS (PROTEGIDAS) --------------------

@app.route("/convertir", methods=["POST"])
def convertir():
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    mensaje = convertir_acciones()
    return jsonify({"status": "ok", "message": mensaje})

@app.route("/feargreed/<symbol>")
def feargreed(symbol):
    if not session.get('logeado'): return jsonify({"error": "Login requerido"}), 401
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
    if not session.get('logeado'): return jsonify({"error": "Acceso denegado"}), 401
    try:
        data = obtener_movimientos_multi_radar()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/indicador_maestro/<simbolo>')
def api_maestro(simbolo):
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    path = f"static/acciones/{simbolo.upper()}.csv"
    resultado = calcular_master_score_brutal(path)
    return jsonify(resultado)

@app.route('/api/radar/<symbol>')
def radar_motor(symbol):
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    resultado = procesar_radar_completo(symbol)
    return jsonify(resultado)

@app.route("/api/guardar-fibo", methods=['POST'])
def api_guardar_fibo():
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    datos = request.json
    return jsonify(guardar_fibo_csv(datos.get('moneda'), datos.get('p1'), datos.get('p2')))

@app.route("/api/cargar-fibo/<moneda>")
def api_cargar_fibo(moneda):
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    return jsonify(cargar_fibo_csv(moneda))

@app.route('/api/smc/<folder>/<symbol>')
def api_smc(folder, symbol):
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    try:
        path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
        resultado = calcular_smc_estructura(path)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fvg/<folder>/<symbol>')
def api_fvg(folder, symbol):
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    try:
        path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
        resultado = calcular_fvg_data(path)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/zonas-sd/<folder>/<symbol>')
def api_zonas_sd(folder, symbol):
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    try:
        path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
        resultado = calcular_oferta_demanda(path)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/liquidez/<folder>/<symbol>')
def api_liquidez(folder, symbol):
    if not session.get('logeado'): return jsonify({"error": "No autorizado"}), 401
    try:
        path = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
        resultado = calcular_liquidez_data(path, tolerancia=0.0005)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)