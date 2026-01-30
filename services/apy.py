import requests
import pandas as pd
import os
from datetime import datetime

# --- CONFIGURACIÓN DE RUTA CORREGIDA ---
# 1. Obtiene la carpeta 'services'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Sube un nivel para llegar a 'IBC' y luego entra en 'static/acciones'
RUTA_DESTINO = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "acciones"))

# Verificación de seguridad
if not os.path.exists(RUTA_DESTINO):
    print(f"Error: No se encontró la carpeta en: {RUTA_DESTINO}")
    print("Asegúrate de que 'static' esté al mismo nivel que la carpeta 'services'.")
else:
    url = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"

    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Error al obtener datos: {e}")
        data = {"items": []}

    acciones = data.get("items", [])
    columnas = ["fecha", "accion", "precio", "variacion_abs", "monto_efectivo", "hora"]
    fecha_actual = datetime.now().strftime("%Y-%m-%d")

    for accion in acciones:
        nombre = accion.get("COD_SIMB", "accion").strip().replace(" ", "_")
        fila_full = {**accion, **accion.get("DATA", {})}
        
        df_nueva = pd.DataFrame([{
            "fecha": fecha_actual,
            "accion": fila_full.get("COD_SIMB"),
            "precio": fila_full.get("PRECIO"),
            "variacion_abs": fila_full.get("VAR_ABS"),
            "monto_efectivo": fila_full.get("MONTO_EFECTIVO"),
            "hora": fila_full.get("HORA")
        }])
        
        df_nueva = df_nueva.reindex(columns=columnas)
        ruta_archivo = os.path.join(RUTA_DESTINO, f"{nombre}.csv")

        if os.path.exists(ruta_archivo):
            df_existente = pd.read_csv(ruta_archivo, dtype=str)
            df_existente = df_existente[df_existente["fecha"] != fecha_actual]
            df_final = pd.concat([df_existente, df_nueva], ignore_index=True)
        else:
            df_final = df_nueva

        df_final.to_csv(ruta_archivo, index=False)
        print(f"Actualizado: {nombre}.csv en {RUTA_DESTINO}")