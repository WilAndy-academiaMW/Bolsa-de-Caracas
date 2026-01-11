import requests
import pandas as pd
import os
from datetime import datetime

# Configuración inicial
os.makedirs("acciones", exist_ok=True)
URL = "https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json"
COLUMNAS = ["fecha", "accion", "precio", "variacion_abs", "monto_efectivo", "hora"]

def formatear_venezuela(valor):
    """Transforma números a formato 1.234,56"""
    try:
        if valor is None or valor == "" or valor == "-": 
            return "0,00"
        # Limpiar el valor por si viene con formato previo
        num = float(str(valor).replace('.', '').replace(',', '.')) if isinstance(valor, str) else float(valor)
        return "{:,.2f}".format(num).replace(",", "X").replace(".", ",").replace("X", ".")
    except:
        return "0,00"

def ejecutar():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Conectando con la Bolsa de Caracas...")
    
    try:
        resp = requests.get(URL, timeout=10)
        resp.raise_for_status()
        json_data = resp.json()
    except Exception as e:
        print(f"Error de conexión: {e}")
        return

    items = json_data.get("items", [])
    fecha_actual = datetime.now().strftime("%Y-%m-%d")

    if not items:
        print("No se recibieron datos de la API.")
        return

    for item in items:
        # IMPORTANTE: La API a veces trae los datos en item['DATA']
        # Usamos .get() para buscar en la raíz o en el sub-diccionario DATA
        data_interna = item.get("DATA", {})
        
        nombre = item.get("COD_SIMB", item.get("CODE", "accion")).strip().replace(" ", "_")
        
        # Intentamos obtener el valor de la raíz, y si no, de DATA
        precio = item.get("PRECIO") if item.get("PRECIO") else data_interna.get("PRECIO")
        var_abs = item.get("VAR_ABS") if item.get("VAR_ABS") else data_interna.get("VAR_ABS")
        # Aquí es donde fallaba:
        monto = item.get("MONTO_EFECTIVO") if item.get("MONTO_EFECTIVO") else data_interna.get("MONTO_EFECTIVO")
        hora = item.get("HORA") if item.get("HORA") else data_interna.get("HORA", "--:--")

        datos_fila = {
            "fecha": fecha_actual,
            "accion": nombre,
            "precio": formatear_venezuela(precio),
            "variacion_abs": formatear_venezuela(var_abs),
            "monto_efectivo": formatear_venezuela(monto),
            "hora": hora
        }

        df_nueva = pd.DataFrame([datos_fila])
        ruta = os.path.join("acciones", f"{nombre}.csv")

        if os.path.exists(ruta):
            df_existente = pd.read_csv(ruta, dtype=str)
            if "fecha" in df_existente.columns:
                df_existente = df_existente[df_existente["fecha"] != fecha_actual]
            df_final = pd.concat([df_existente, df_nueva], ignore_index=True)
        else:
            df_final = df_nueva

        # Guardado con separador de coma estándar
        df_final.to_csv(ruta, index=False, columns=COLUMNAS, encoding="utf-8-sig")
        print(f"Actualizado: {nombre:10} | Monto: {datos_fila['monto_efectivo']}")

    print(f"\nFinalizado. Revisa la carpeta 'acciones/'.")

if __name__ == "__main__":
    ejecutar()