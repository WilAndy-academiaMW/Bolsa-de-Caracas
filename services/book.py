import pandas as pd
import requests
import urllib3
import os
from io import StringIO
from datetime import date

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- CONFIGURACIÓN DE RUTAS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Carpeta para el resumen diario (histórico)
FOLDER_EMPRESA = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "empresa"))
# Carpeta nueva para los Libros de Órdenes (puntas)
FOLDER_LIBRO = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "libro"))

# Crear la carpeta de libros si no existe
os.makedirs(FOLDER_LIBRO, exist_ok=True)

URL_MERCADO = "https://market.bolsadecaracas.com/es"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def guardar_libro_ordenes(simbolo):
    """Descarga el libro de órdenes actual y lo guarda en static/libro/{simbolo}.csv"""
    api_url = f"https://market.bolsadecaracas.com/api/mercado/resumen/simbolos/{simbolo}/libroOrdenes"
    try:
        resp = requests.get(api_url, headers=HEADERS, verify=False)
        if resp.status_code == 200:
            datos = resp.json()
            if datos:
                df_libro = pd.DataFrame(datos)
                # Guardamos solo el estado actual del libro (sobrescribimos para tener lo más reciente)
                ruta_archivo = os.path.join(FOLDER_LIBRO, f"{simbolo}.csv")
                df_libro.to_csv(ruta_archivo, index=False, encoding="utf-8-sig")
                return True
    except Exception as e:
        print(f"Error descargando libro para {simbolo}: {e}")
    return False

def main():
    try:
        # 1. Obtener el resumen general del mercado
        resp = requests.get(URL_MERCADO, headers=HEADERS, verify=False)
        tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
        df_general = tablas[0]

        # 2. Procesar cada empresa del resumen
        print(f"Iniciando actualización en {date.today()}...")
        
        for _, fila in df_general.iterrows():
            simbolo = str(fila['Símbolo']).strip()
            if not simbolo or simbolo == 'nan': continue

            # --- A. GUARDAR HISTÓRICO DE LA EMPRESA (Tu lógica anterior) ---
            # (Aquí iría tu función guardar_por_empresa que ya tienes armada)
            # ... [Omitido por brevedad, pero se mantiene igual] ...

            # --- B. GUARDAR LIBRO DE ÓRDENES (La parte nueva) ---
            exito = guardar_libro_ordenes(simbolo)
            if exito:
                print(f"✅ Libro actualizado: {simbolo}")
            else:
                print(f"⚠️ Sin libro para: {simbolo}")

        print(f"\n¡Proceso terminado!")
        print(f"Resúmenes en: {FOLDER_EMPRESA}")
        print(f"Libros en: {FOLDER_LIBRO}")

    except Exception as e:
        print(f"Error en el proceso principal: {e}")

if __name__ == "__main__":
    main()