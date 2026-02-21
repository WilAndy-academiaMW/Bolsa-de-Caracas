import requests
import pandas as pd
import os
from datetime import datetime

# --- CONFIGURACIÓN DE RUTA ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_DESTINO = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "acciones"))

if not os.path.exists(RUTA_DESTINO):
    print(f"Error: No se encontró la carpeta en: {RUTA_DESTINO}")
else:
    url = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"

    try:
        resp = requests.get(url, timeout=90)
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
        
        # --- LIMPIEZA DE DATOS (Punto en vez de Coma) ---
        def limpiar_numero(valor):
            if valor is None: return 0.0
            # Si es string, reemplaza coma por punto. Si ya es número, lo deja igual.
            str_val = str(valor).replace(',', '.')
            try:
                return float(str_val)
            except ValueError:
                return 0.0

        precio_limpio = limpiar_numero(fila_full.get("PRECIO"))
        var_abs_limpia = limpiar_numero(fila_full.get("VAR_ABS"))
        monto_limpio = limpiar_numero(fila_full.get("MONTO_EFECTIVO"))

        df_nueva = pd.DataFrame([{
            "fecha": fecha_actual,
            "accion": fila_full.get("COD_SIMB"),
            "precio": precio_limpio,
            "variacion_abs": var_abs_limpia,
            "monto_efectivo": monto_limpio,
            "hora": fila_full.get("HORA")
        }])
        
        df_nueva = df_nueva.reindex(columns=columnas)
        ruta_archivo = os.path.join(RUTA_DESTINO, f"{nombre}.csv")

        if os.path.exists(ruta_archivo):
            # Leemos el CSV; quitamos el dtype=str para que Pandas reconozca los números
            df_existente = pd.read_csv(ruta_archivo)
            # Aseguramos que la fecha se compare como string
            df_existente["fecha"] = df_existente["fecha"].astype(str)
            df_existente = df_existente[df_existente["fecha"] != fecha_actual]
            df_final = pd.concat([df_existente, df_nueva], ignore_index=True)
        else:
            df_final = df_nueva

        # Guardamos asegurando que el separador decimal sea el punto
        df_final.to_csv(ruta_archivo, index=False, decimal='.')
        print(f"Actualizado: {nombre}.csv -> Precio: {precio_limpio}")