import requests
import pandas as pd
import os
from datetime import datetime

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
        fila_full = {**accion, **accion.get("DATA", {})}
        
        precio_limpio = limpiar_precio_bvc(fila_full.get("PRECIO"))
        var_abs_limpia = limpiar_precio_bvc(fila_full.get("VAR_ABS"))
        monto_limpio = limpiar_precio_bvc(fila_full.get("MONTO_EFECTIVO"))
        hora_bvc = fila_full.get("HORA")

        # Datos nuevos que queremos insertar
        dict_nuevo = {
            "fecha": fecha_actual,
            "accion": nombre_simbolo,
            "precio": precio_limpio,
            "variacion_abs": var_abs_limpia,
            "monto_efectivo": monto_limpio,
            "hora": hora_bvc
        }
        
        ruta_archivo = os.path.join(RUTA_DESTINO, f"{nombre_archivo}.csv")

        # --- LÓGICA DE VALIDACIÓN DE CAMBIOS ---
        guardar = True
        if os.path.exists(ruta_archivo):
            try:
                df_previo = pd.read_csv(ruta_archivo)
                if not df_previo.empty:
                    ultima_fila = df_previo.iloc[-1]
                    
                    # COMPARACIÓN CRÍTICA:
                    # No guardamos si el precio es igual Y la hora de la bolsa es la misma
                    mismo_precio = float(ultima_fila['precio']) == precio_limpio
                    misma_hora = str(ultima_fila['hora']) == str(hora_bvc)
                    misma_fecha = str(ultima_fila['fecha']) == fecha_actual

                    if mismo_precio and misma_hora and misma_fecha:
                        guardar = False # No hubo cambios, saltamos este archivo
            except Exception as e:
                print(f"Error leyendo previo de {nombre_simbolo}: {e}")

        if guardar:
            df_nueva = pd.DataFrame([dict_nuevo]).reindex(columns=columnas)
            if os.path.exists(ruta_archivo):
                try:
                    df_existente = pd.read_csv(ruta_archivo)
                    df_final = pd.concat([df_existente, df_nueva], ignore_index=True)
                except:
                    df_final = df_nueva
            else:
                df_final = df_nueva

            df_final.to_csv(ruta_archivo, index=False, decimal='.')
            print(f"✅ ACTUALIZADO {nombre_archivo}: {precio_limpio} a las {hora_bvc}")
        else:
            # Opcional: print(f"➖ Sin cambios para {nombre_archivo}")
            pass