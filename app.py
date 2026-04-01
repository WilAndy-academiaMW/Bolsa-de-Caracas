from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import csv
import os
from datetime import timedelta

# Importaciones de tus servicios originales
from services.smart import obtener_movimientos_multi_radar
from services.fibonnaci import guardar_fibo_csv, cargar_fibo_csv
from services.power import calcular_master_score_brutal
from services.operaciones import procesar_radar_completo
from services.convercion import convertir_acciones 
from services.fear_greed import calcular_fear_greed

app = Flask(__name__)

# CONFIGURACIÓN CRÍTICA
app.secret_key = 'tu_clave_secreta_brutal_123' 
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# Ruta al CSV
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CSV_USUARIOS = os.path.join(BASE_DIR, 'usuarios.csv')

# -------------------- LÓGICA DE NAVEGACIÓN PÚBLICA --------------------

@app.route("/")
def home():
    """Esta es ahora tu página principal"""
    if session.get('logeado'):
        return redirect(url_for('index5'))
    return render_template("inicio.html")

@app.route("/acceso")
def acceso():
    """Aquí mostramos el formulario de login (tu antiguo index.html)"""
    if session.get('logeado'):
        return redirect(url_for('index5'))
    return render_template("login_page.html")

@app.route("/login", methods=["POST"])
def login():
    usuario_input = request.form.get("usuario")
    password_input = request.form.get("password")

    if not os.path.exists(CSV_USUARIOS):
        flash("ERROR: El archivo usuarios.csv no existe.")
        return redirect(url_for('acceso'))

    with open(CSV_USUARIOS, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user_csv = row['usuario'].strip()
            pass_csv = row['password'].strip()
            status_csv = row['estatus'].strip()

            if user_csv == usuario_input and pass_csv == password_input:
                if status_csv == 'activo':
                    session.permanent = True
                    session['logeado'] = True
                    session['user'] = user_csv
                    return redirect(url_for('index5'))
                else:
                    flash("TU MEMBRESÍA NO ESTÁ ACTIVA.")
                    return redirect(url_for('acceso'))
    
    flash("USUARIO O CONTRASEÑA INCORRECTOS.")
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
        # Asegúrate de que la ruta a los CSV de acciones sea la correcta
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)