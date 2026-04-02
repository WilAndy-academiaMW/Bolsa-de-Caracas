import pandas as pd
import requests
import urllib3
import os
import time  # <--- IMPORTANTE PARA EL ESPERA
from io import StringIO
from datetime import date

# Desactivar warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "https://market.bolsadecaracas.com/es"
HEADERS = {"User-Agent": "Mozilla/5.0"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FOLDER_EMPRESA = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "empresa"))

COLUMNAS = [
    'Nombre', 'Símbolo', 'Compra', 'Precio comp', 'Precio Vent', 'Venta',
    'Precio', 'Apertura', 'Var %', 'Var Abs', 'Volumen', 'Efectivo',
    'Operaciones', 'Máximo', 'Mínimo'
]

def formatear_venezuela(valor):
    if pd.isna(valor) or valor == '-':
        return ""
    try:
        return "{:,.2f}".format(float(valor)).replace(",", "X").replace(".", ",").replace("X", ".")
    except:
        return str(valor)

def guardar_por_empresa(df):
    if not os.path.exists(FOLDER_EMPRESA):
        print(f"Error: No existe la ruta {FOLDER_EMPRESA}")
        return

    fecha_hoy = date.today().strftime("%Y-%m-%d")

    for _, fila in df.iterrows():
        simbolo = str(fila['Símbolo']).strip()
        if not simbolo: continue 
        
        nombre_archivo = os.path.join(FOLDER_EMPRESA, f"{simbolo}.csv")
        nueva_fila = pd.DataFrame([fila])

        if os.path.exists(nombre_archivo):
            df_existente = pd.read_csv(nombre_archivo)
            if fecha_hoy in df_existente['Fecha'].astype(str).values:
                print(f"Empresa {simbolo}: Ya registrado hoy.")
                continue
            else:
                nueva_fila.to_csv(nombre_archivo, mode='a', index=False, header=False, encoding="utf-8-sig")
                print(f"Empresa {simbolo}: Línea agregada.")
        else:
            nueva_fila.to_csv(nombre_archivo, index=False, encoding="utf-8-sig")
            print(f"Empresa {simbolo}: Archivo creado.")

def ejecutar_proceso():
    """Función lógica principal con protecciones"""
    try:
        # TIMEOUT DE 30 SEGUNDOS: Si la web no responde, el script no se queda colgado
        resp = requests.get(URL, headers=HEADERS, verify=False, timeout=30)
        resp.raise_for_status() # Lanza error si la web devuelve 404 o 500

        tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
        if not tablas:
            print("No se encontraron tablas.")
            return False

        df = tablas[0]
        cols_existentes = [c for c in COLUMNAS if c in df.columns]
        df = df[cols_existentes].copy()

        for col in df.columns:
            if col not in ['Nombre', 'Símbolo']:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        df['Fecha'] = date.today().strftime("%Y-%m-%d")

        for col in df.columns:
            if col not in ['Nombre', 'Símbolo', 'Fecha']:
                df[col] = df[col].apply(formatear_venezuela)

        guardar_por_empresa(df)
        return True # TODO SALIÓ BIEN

    except Exception as e:
        print(f"Fallo en el intento: {e}")
        return False # ALGO SALIÓ MAL

if __name__ == "__main__":
    intentos_maximos = 3
    intentos_realizados = 0
    exito = False

    while intentos_realizados < intentos_maximos and not exito:
        intentos_realizados += 1
        print(f"--- Intento {intentos_realizados} de {intentos_maximos} ---")
        
        exito = ejecutar_proceso()

        if exito:
            print(f"¡Listo! Archivos actualizados.")
        else:
            if intentos_realizados < intentos_maximos:
                print("Esperando 5 minutos para reintentar...")
                time.sleep(300) # 300 segundos = 5 minutos
            else:
                print("Se agotaron los intentos por esta hora.")