import requests
import mysql.connector
from datetime import datetime
import time
import os

# --- CONFIGURACIÓN DE LA BASE DE DATOS ---
DB_CONFIG = {
    'host': 'william23.mysql.pythonanywhere-services.com',
    'user': 'william23',
    'password': 'TU_PASSWORD_DE_DATABASE', # <--- Pon tu clave real aquí
    'database': 'william23$bvc'
}

def limpiar_precio(valor):
    if valor is None or valor == "": return 0.0
    str_val = str(valor).strip().replace('.', '').replace(',', '.')
    try:
        return float(str_val)
    except:
        return 0.0

def extraer_y_guardar():
    url = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"
    ahora_utc = datetime.utcnow() # Usamos UTC para que coincida con tu horario
    
    try:
        resp = requests.get(url, timeout=30)
        data = resp.json()
        acciones = data.get("items", [])
        
        conexion = mysql.connector.connect(**DB_CONFIG)
        cursor = conexion.cursor()

        for accion in acciones:
            simbolo = accion.get("COD_SIMB", "").strip()
            # Extraemos los datos del sub-diccionario 'DATA'
            info = accion.get("DATA", {})
            
            precio = limpiar_precio(info.get("PRECIO"))
            volumen = int(str(info.get("VOLUMEN", 0)).replace('.', '').replace(',', ''))
            monto = limpiar_precio(info.get("MONTO_EFECTIVO"))

            # SQL para insertar en la tabla que acabas de crear
            query = """
                INSERT INTO capturas_datos (simbolo, precio, volumen, monto_efectivo, fecha_hora)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (simbolo, precio, volumen, monto, ahora_utc))
        
        conexion.commit()
        cursor.close()
        conexion.close()
        print(f"[{ahora_utc}] Captura exitosa: {len(acciones)} acciones guardadas.")

    except Exception as e:
        print(f"Error en la extracción: {e}")

if __name__ == "__main__":
    print("🚀 Extractor iniciado. Trabajando de 13:00 a 17:30 UTC...")
    while True:
        ahora = datetime.utcnow()
        # Horario de la BVC en UTC
        if ahora.weekday() < 5 and 13 <= ahora.hour < 18:
            extraer_y_guardar()
            time.sleep(300) # Espera 5 minutos (300 segundos)
        else:
            # Si el mercado está cerrado, revisa cada 10 minutos
            print(f"Mercado cerrado. Hora actual UTC: {ahora.strftime('%H:%M')}")
            time.sleep(600)