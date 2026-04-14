# services\horario.py
import json
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_LOG_JSON = os.path.join(BASE_DIR, "log_actualizaciones.json")

def registrar_en_json(nombre_simbolo, precio_limpio, hora_bvc):
    ahora = datetime.now()
    timestamp_log = ahora.strftime("%b %d %H:%M:%S")
    
    mensaje_log = f"{timestamp_log} ✅ ACTUALIZADO {nombre_simbolo}: {precio_limpio} a las {hora_bvc}"
    
    entrada_json = {
        "timestamp": timestamp_log,
        "simbolo": nombre_simbolo,
        "precio": precio_limpio,
        "hora_bolsa": hora_bvc,
        "mensaje": mensaje_log
    }

    datos_log = []
    if os.path.exists(RUTA_LOG_JSON):
        try:
            with open(RUTA_LOG_JSON, 'r', encoding='utf-8') as f:
                datos_log = json.load(f)
        except: datos_log = []
    
    datos_log.append(entrada_json)
    
    with open(RUTA_LOG_JSON, 'w', encoding='utf-8') as f:
        json.dump(datos_log, f, indent=4, ensure_ascii=False)
    
    return mensaje_log