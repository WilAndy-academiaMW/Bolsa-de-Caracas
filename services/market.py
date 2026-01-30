import pandas as pd
import requests
import urllib3
import os
from io import StringIO
from datetime import date

# Desactivar warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "https://market.bolsadecaracas.com/es"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# --- CONFIGURACIÓN DE RUTA ---
# Subimos un nivel desde 'services' para llegar a 'IBC' y entrar en 'static/empresa'
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
    """Guarda en la carpeta 'static/empresa' que ya existe"""
    
    # Verificación de que la carpeta existe
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
            
            # Evitar duplicados del mismo día
            if fecha_hoy in df_existente['Fecha'].astype(str).values:
                print(f"Empresa {simbolo}: Ya registrado hoy.")
                continue
            else:
                nueva_fila.to_csv(nombre_archivo, mode='a', index=False, header=False, encoding="utf-8-sig")
                print(f"Empresa {simbolo}: Línea agregada.")
        else:
            nueva_fila.to_csv(nombre_archivo, index=False, encoding="utf-8-sig")
            print(f"Empresa {simbolo}: Archivo creado.")

def main():
    try:
        resp = requests.get(URL, headers=HEADERS, verify=False)
        tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
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
        print(f"\n¡Listo! Archivos actualizados en: {FOLDER_EMPRESA}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()