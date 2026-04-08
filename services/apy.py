import requests
import pandas as pd
import os
import sqlite3
from datetime import datetime

# --- CONFIGURACIÓN DE RUTAS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_DESTINO_CSV = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "acciones"))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "bvc_historial.db"))

def inicializar_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS historial_precios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT,
            accion TEXT,
            precio REAL,
            variacion_abs REAL,
            monto_efectivo REAL,
            hora TEXT,
            timestamp_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(fecha, accion, hora) -- Evita duplicados exactos en el historial
        )
    ''')
    conn.commit()
    conn.close()

def limpiar_precio_bvc(valor):
    if valor is None or valor == "": return 0.0
    str_val = str(valor).strip()
    if "." in str_val and "," in str_val:
        str_val = str_val.replace('.', '').replace(',', '.')
    elif "." in str_val and "," not in str_val:
        partes = str_val.split('.')
        if len(partes[-1]) == 3: str_val = str_val.replace('.', '')
    elif "," in str_val:
        str_val = str_val.replace(',', '.')
    try:
        return float(str_val)
    except:
        return 0.0

# 1. Asegurar carpetas e inicializar DB
if not os.path.exists(RUTA_DESTINO_CSV):
    os.makedirs(RUTA_DESTINO_CSV)
inicializar_db()

# 2. Obtener Datos
url = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"
try:
    resp = requests.get(url, timeout=90)
    resp.raise_for_status()
    data = resp.json()
except Exception as e:
    print(f"Error al obtener datos: {e}")
    data = {"items": []}

acciones = data.get("items", [])
fecha_actual = datetime.now().strftime("%Y-%m-%d")

# 3. Procesar cada acción
for accion in acciones:
    nombre_simbolo = accion.get("COD_SIMB", "accion").strip()
    nombre_archivo = nombre_simbolo.replace(" ", "_")
    fila_full = {**accion, **accion.get("DATA", {})}
    
    precio_limpio = limpiar_precio_bvc(fila_full.get("PRECIO"))
    var_abs_limpia = limpiar_precio_bvc(fila_full.get("VAR_ABS"))
    monto_limpio = limpiar_precio_bvc(fila_full.get("MONTO_EFECTIVO"))
    hora_bvc = fila_full.get("HORA")

    # --- PARTE A: GUARDAR EN BASE DE DATOS (Historial Total) ---
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR IGNORE INTO historial_precios (fecha, accion, precio, variacion_abs, monto_efectivo, hora)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (fecha_actual, nombre_simbolo, precio_limpio, var_abs_limpia, monto_limpio, hora_bvc))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error en DB para {nombre_simbolo}: {e}")

    # --- PARTE B: ACTUALIZAR CSV (Sin repetir fecha) ---
    ruta_archivo = os.path.join(RUTA_DESTINO_CSV, f"{nombre_archivo}.csv")
    columnas = ["fecha", "accion", "precio", "variacion_abs", "monto_efectivo", "hora"]
    nuevo_dato = [fecha_actual, nombre_simbolo, precio_limpio, var_abs_limpia, monto_limpio, hora_bvc]

    if os.path.exists(ruta_archivo):
        df = pd.read_csv(ruta_archivo)
        # Si la fecha ya existe, actualizamos esa fila
        if fecha_actual in df['fecha'].values:
            df.loc[df['fecha'] == fecha_actual, ["precio", "variacion_abs", "monto_efectivo", "hora"]] = [precio_limpio, var_abs_limpia, monto_limpio, hora_bvc]
        else:
            # Si es fecha nueva, agregamos línea al final
            nueva_fila = pd.DataFrame([nuevo_dato], columns=columnas)
            df = pd.concat([df, nueva_fila], ignore_index=True)
    else:
        df = pd.DataFrame([nuevo_dato], columns=columnas)

    df.to_csv(ruta_archivo, index=False, decimal='.')
    print(f"✅ ACTUALIZADO {nombre_archivo}: {precio_limpio} a las {hora_bvc}")

print("\n🚀 Proceso terminado: Datos en DB y CSVs actualizados.")