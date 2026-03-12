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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FOLDER_ACCIONES = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "csv", "acciones"))

# Mapeo: Web -> Tu CSV
MAPEO_COLUMNAS = {
    'Fecha': 'Date',
    'Apertura': 'Precio_Inicio',
    'Máximo': 'Alto',
    'Mínimo': 'Bajo',
    'Precio': 'Precio_Cierre'
}

def guardar_por_empresa(df_pizarra):
    if not os.path.exists(FOLDER_ACCIONES):
        os.makedirs(FOLDER_ACCIONES, exist_ok=True)

    fecha_hoy = date.today().strftime("%Y-%m-%d")
    columnas_finales = ['Date', 'Precio_Inicio', 'Alto', 'Bajo', 'Precio_Cierre']

    for _, fila in df_pizarra.iterrows():
        try:
            simbolo = str(fila['Símbolo']).strip()
            if not simbolo or simbolo == 'nan': continue 
            
            nombre_archivo = os.path.join(FOLDER_ACCIONES, f"{simbolo}.csv")
            
            # Extraer solo lo que necesitamos para este símbolo
            datos_fila = {
                'Date': fecha_hoy,
                'Precio_Inicio': fila['Precio_Inicio'],
                'Alto': fila['Alto'],
                'Bajo': fila['Bajo'],
                'Precio_Cierre': fila['Precio_Cierre']
            }
            nueva_fila_df = pd.DataFrame([datos_fila])

            if os.path.exists(nombre_archivo):
                # Leer el existente para validar
                df_existente = pd.read_csv(nombre_archivo)
                
                # Si el archivo viejo no tiene 'Date', lo arreglamos sobre la marcha
                if 'Date' not in df_existente.columns:
                    print(f"[{simbolo}] - Formato antiguo detectado. Actualizando encabezados...")
                    df_existente.columns = columnas_finales # Forzamos los nombres nuevos
                    df_existente.to_csv(nombre_archivo, index=False, encoding="utf-8")

                # Check de duplicados
                if fecha_hoy in df_existente['Date'].astype(str).values:
                    print(f"[{simbolo}] - Saltado (ya existe hoy).")
                    continue
                
                # Agregar al final sin encabezado
                nueva_fila_df.to_csv(nombre_archivo, mode='a', index=False, header=False, encoding="utf-8")
                print(f"[{simbolo}] - Línea agregada.")
            else:
                # Crear archivo nuevo con encabezados
                nueva_fila_df.to_csv(nombre_archivo, index=False, encoding="utf-8")
                print(f"[{simbolo}] - Archivo nuevo creado.")
                
        except Exception as e:
            print(f"Error procesando {fila.get('Símbolo', 'Desconocido')}: {e}")
            continue # IMPORTANTE: Pasa a la siguiente acción si esta falla

def main():
    try:
        print("Conectando con la Bolsa de Caracas...")
        resp = requests.get(URL, headers=HEADERS, verify=False, timeout=15)
        tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
        df = tablas[0]

        # Limpieza de datos
        cols_interes = ['Apertura', 'Máximo', 'Mínimo', 'Precio']
        for col in cols_interes:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # Renombrar columnas antes de procesar
        df = df.rename(columns=MAPEO_COLUMNAS)

        print(f"Se encontraron {len(df)} registros en la pizarra. Procesando...")
        guardar_por_empresa(df)
        print(f"\n¡Finalizado! Revisa la carpeta: {FOLDER_ACCIONES}")

    except Exception as e:
        print(f"Error crítico en main: {e}")

if __name__ == "__main__":
    main()