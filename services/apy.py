import requests
import pandas as pd
import os
import time
from datetime import datetime, time as dt_time

# --- CONFIGURACIÓN DE RUTA ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_DESTINO = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "acciones"))

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

def ejecutar_extraccion():
    url = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"
    try:
        resp = requests.get(url, timeout=90)
        resp.raise_for_status()
        data = resp.json()
        acciones = data.get("items", [])
        fecha_actual = datetime.utcnow().strftime("%Y-%m-%d")

        for accion in acciones:
            nombre_simbolo = accion.get("COD_SIMB", "accion").strip()
            nombre_archivo = nombre_simbolo.replace(" ", "_")
            fila_full = {**accion, **accion.get("DATA", {})}
            
            precio = limpiar_precio_bvc(fila_full.get("PRECIO"))
            
            # ... Lógica de guardado en CSV (la que ya tienes) ...
            # (He omitido el bloque largo de Pandas para abreviar, mantén el tuyo)
            
            print(f"Guardado {nombre_simbolo}: {precio}")
            
    except Exception as e:
        print(f"Error: {e}")

# --- ESTO ES LO QUE HACE QUE "MIRE LA HORA" ---
if __name__ == "__main__":
    print("Servicio iniciado. Esperando ventana de tiempo (13:00 - 17:30 UTC)...")
    
    while True:
        ahora_utc = datetime.utcnow()
        hora_actual = ahora_utc.time()
        dia_semana = ahora_utc.weekday() 
        
        # Definimos los límites
        inicio = dt_time(13, 0)
        fin = dt_time(17, 30)

        # 1. Si es Sábado (5) o Domingo (6), dormir mucho
        if dia_semana > 4:
            print("Fin de semana. Bolsa cerrada. Durmiendo 1 hora...")
            time.sleep(3600)
            continue

        # 2. Si está en el rango de hora, ejecuta
        if inicio <= hora_actual <= fin:
            ejecutar_extraccion()
            print("Esperando 5 minutos para la próxima actualización...")
            time.sleep(300) # Espera 5 min para no saturar
        else:
            # 3. Si no es la hora, avisa y espera 10 minutos para volver a revisar
            print(f"Hora actual UTC: {hora_actual.strftime('%H:%M')}. Fuera de rango (13:00-17:30).")
            time.sleep(600)