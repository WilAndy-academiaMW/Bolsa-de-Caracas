import requests
import pandas as pd
import os
from datetime import datetime

os.makedirs("acciones", exist_ok=True)

url = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"

try:
    resp = requests.get(url, timeout=50)
    resp.raise_for_status()
    data = resp.json()
except Exception as e:
    print("No se pudo obtener datos válidos:", e)
    data = {"items": []}

acciones = data.get("items", [])

columnas = ["fecha","accion","precio","variacion_abs","monto_efectivo","hora"]

if not acciones:
    print("La API no devolvió datos, se mantiene el archivo sin cambios.")
else:
    for accion in acciones:
        nombre = accion.get("COD_SIMB", accion.get("CODE", "accion")).strip().replace(" ", "_")
        fila = {**accion, **accion.get("DATA", {})}
        df = pd.DataFrame([fila])

        df_final = df[["COD_SIMB","PRECIO","VAR_ABS","MONTO_EFECTIVO","HORA"]].copy()
        df_final.rename(columns={
            "COD_SIMB": "accion",
            "PRECIO": "precio",
            "VAR_ABS": "variacion_abs",
            "MONTO_EFECTIVO": "monto_efectivo",
            "HORA": "hora"
        }, inplace=True)

        fecha_actual = datetime.now().strftime("%Y-%m-%d")
        df_final["fecha"] = fecha_actual

        # Reordenar columnas y rellenar faltantes
        df_final = df_final.reindex(columns=columnas)

        ruta = os.path.join("acciones", f"{nombre}.csv")

        if os.path.exists(ruta):
            df_existente = pd.read_csv(ruta, dtype=str, on_bad_lines="skip")
            if "fecha" not in df_existente.columns:
                df_existente = pd.DataFrame(columns=columnas)

            # Borrar fila de hoy si existe
            df_existente = df_existente[df_existente["fecha"] != fecha_actual]

            # Agregar nueva fila
            df_existente = pd.concat([df_existente, df_final], ignore_index=True)

            df_existente.to_csv(ruta, index=False, columns=columnas)
        else:
            df_final.to_csv(ruta, index=False, columns=columnas)

        print(f"Actualizado: {ruta}")
