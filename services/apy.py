import requests
import mysql.connector
import pandas as pd
import os
import time
from datetime import datetime, timezone, time as dt_time

# --- CONFIGURACIÓN ---
DB_CONFIG = {
    'host': 'william23.mysql.pythonanywhere-services.com',
    'user': 'william23',
    'password': 'TU_PASSWORD_AQUI', 
    'database': 'william23$bvc'
}

# Ruta donde tu App web lee los datos para mostrar los FVG/Gráficos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_ESTATICOS = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "acciones"))

def limpiar_precio(valor):
    if valor is None or valor == "": return 0.0
    str_val = str(valor).strip().replace('.', '').replace(',', '.')
    try:
        return float(str_val)
    except:
        return 0.0

def procesar_fvg_y_smart_money(simbolo, datos_actuales):
    """
    Aquí integras tu lógica de Pandas para calcular Fair Value Gaps.
    Por ahora, actualiza el JSON que consume tu App Web.
    """
    try:
        if not os.path.exists(RUTA_ESTATICOS):
            os.makedirs(RUTA_ESTATICOS)
            
        archivo_path = os.path.join(RUTA_ESTATICOS, f"{simbolo}.json")
        
        # Convertimos a DataFrame para que puedas meter tus fórmulas de Trading
        df = pd.DataFrame([datos_actuales])
        
        # Guardar para la App Web (sobrescribe el último estado)
        df.to_json(archivo_path, orient='records', indent=4)
        
    except Exception as e:
        print(f"Error procesando FVG para {simbolo}: {e}")

def ejecutar_ciclo_completo():
    url = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"
    ahora_utc = datetime.now(timezone.utc)
    
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        acciones = resp.json().get("items", [])
        
        # Conexión a DB para el historial
        conexion = mysql.connector.connect(**DB_CONFIG)
        cursor = conexion.cursor()

        for accion in acciones:
            simbolo = accion.get("COD_SIMB", "").strip()
            info = accion.get("DATA", {})
            
            # 1. Limpieza de datos
            precio = limpiar_precio(info.get("PRECIO"))
            volumen = int(str(info.get("VOLUMEN", 0)).replace('.', '').replace(',', ''))
            monto = limpiar_precio(info.get("MONTO_EFECTIVO"))

            # 2. GUARDAR EN MYSQL (Tu "Caja Fuerte" de datos)
            query = """
                INSERT INTO capturas_datos (simbolo, precio, volumen, monto_efectivo, fecha_hora)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (simbolo, precio, volumen, monto, ahora_utc))

            # 3. ACTUALIZAR FVG / SMART MONEY (Lo que ve el usuario en la Web)
            # Pasamos los datos limpios a tu lógica de carpetas
            datos_para_fvg = {
                "simbolo": simbolo,
                "precio": precio,
                "volumen": volumen,
                "monto": monto,
                "hora": ahora_utc.strftime('%H:%M:%S')
            }
            procesar_fvg_y_smart_money(simbolo, datos_para_fvg)
        
        conexion.commit()
        cursor.close()
        conexion.close()
        print(f"[{ahora_utc.strftime('%H:%M:%S')}] Ciclo Dual Completado: DB + FVG actualizados.")

    except Exception as e:
        print(f"Error en el ciclo maestro: {e}")

if __name__ == "__main__":
    print("🚀 SISTEMA MAESTRO INICIADO (MySQL + FVG)")
    
    while True:
        ahora_utc = datetime.now(timezone.utc)
        hora_actual = ahora_utc.time()
        dia_semana = ahora_utc.weekday() 

        # Horario BVC: 13:00 - 17:30 UTC (9:00 AM - 1:30 PM VZLA)
        inicio = dt_time(13, 0)
        fin = dt_time(17, 30)

        # 1. Fines de semana
        if dia_semana > 4:
            print("Fin de semana. Durmiendo 1 hora...")
            time.sleep(3600)
            continue

        # 2. Mercado Abierto: ACCIÓN TOTAL
        if inicio <= hora_actual <= fin:
            ejecutar_ciclo_completo()
            time.sleep(300) # Cada 5 minutos
        else:
            # 3. Fuera de hora: REPOSO
            print(f"Hora UTC: {ahora_utc.strftime('%H:%M')}. Fuera de rango. Esperando...")
            time.sleep(600)