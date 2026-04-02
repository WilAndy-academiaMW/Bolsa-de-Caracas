import requests
import pandas as pd
import os
from datetime import datetime

# --- CONFIGURACIÓN DE RUTA ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_DESTINO = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "acciones"))

def limpiar_precio_bvc(valor):
    """
    Específicamente para la BVC: 
    '7.800' -> 7800.0
    '1.234.567,89' -> 1234567.89
    """
    if valor is None or valor == "": 
        return 0.0
    
    str_val = str(valor).strip()
    
    # Caso 1: Tiene puntos y comas (ej. 1.200,50)
    if "." in str_val and "," in str_val:
        str_val = str_val.replace('.', '').replace(',', '.')
    
    # Caso 2: El API de la BVC a veces manda '7.800' para miles.
    # Si detectamos que hay un punto y NO hay coma, y el punto está 
    # en una posición que sugiere miles (como 7.800 o 10.500):
    elif "." in str_val and "," not in str_val:
        # Verificamos si después del punto hay exactamente 3 dígitos (formato miles)
        partes = str_val.split('.')
        if len(partes[-1]) == 3:
            str_val = str_val.replace('.', '')
            
    # Caso 3: Solo coma decimal
    elif "," in str_val:
        str_val = str_val.replace(',', '.')
        
    try:
        return float(str_val)
    except ValueError:
        return 0.0

# --- PROCESO PRINCIPAL ---
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
        nombre_simbolo = accion.get("COD_SIMB", "accion").strip()
        nombre_archivo = nombre_simbolo.replace(" ", "_")
        
        # El API tiene la data en la raíz y en el nodo "DATA"
        fila_full = {**accion, **accion.get("DATA", {})}
        
        # USAMOS LA NUEVA FUNCIÓN DE LIMPIEZA
        precio_limpio = limpiar_precio_bvc(fila_full.get("PRECIO"))
        var_abs_limpia = limpiar_precio_bvc(fila_full.get("VAR_ABS"))
        monto_limpio = limpiar_precio_bvc(fila_full.get("MONTO_EFECTIVO"))

        df_nueva = pd.DataFrame([{
            "fecha": fecha_actual,
            "accion": nombre_simbolo,
            "precio": precio_limpio,
            "variacion_abs": var_abs_limpia,
            "monto_efectivo": monto_limpio,
            "hora": fila_full.get("HORA")
        }])
        
        df_nueva = df_nueva.reindex(columns=columnas)
        ruta_archivo = os.path.join(RUTA_DESTINO, f"{nombre_archivo}.csv")

        if os.path.exists(ruta_archivo):
            try:
                df_existente = pd.read_csv(ruta_archivo)
                df_existente["fecha"] = df_existente["fecha"].astype(str)
                df_existente = df_existente[df_existente["fecha"] != fecha_actual]
                df_final = pd.concat([df_existente, df_nueva], ignore_index=True)
            except:
                df_final = df_nueva
        else:
            df_final = df_nueva

        df_final.to_csv(ruta_archivo, index=False, decimal='.')
        print(f"Guardado {nombre_archivo}: {precio_limpio}")