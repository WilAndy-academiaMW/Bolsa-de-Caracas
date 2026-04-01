import pandas as pd
import requests
import urllib3
import os
from io import StringIO
from datetime import datetime

# Desactivar warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "https://market.bolsadecaracas.com/es"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# --- CONFIGURACIÓN DE RUTA ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Ruta corregida a tu estructura
FOLDER_ACCIONES = os.path.abspath(os.path.join(BASE_DIR, "..", "static", "csv", "acciones-hora"))

def guardar_por_empresa(df_pizarra):
    if not os.path.exists(FOLDER_ACCIONES):
        os.makedirs(FOLDER_ACCIONES, exist_ok=True)

    fecha_hoy = datetime.now().strftime("%Y-%m-%d")
    
    for _, fila in df_pizarra.iterrows():
        try:
            simbolo = str(fila['Símbolo']).strip()
            if not simbolo or simbolo == 'nan': continue 
            
            nombre_archivo = os.path.join(FOLDER_ACCIONES, f"{simbolo}.csv")
            
            # Datos frescos de la web
            datos_nuevos = {
                'Date': fecha_hoy,
                'Precio_Inicio': fila['Apertura'],
                'Alto': fila['Máximo'],
                'Bajo': fila['Mínimo'],
                'Precio_Cierre': fila['Precio']
            }
            df_nueva_fila = pd.DataFrame([datos_nuevos])

            if os.path.exists(nombre_archivo):
                df_historial = pd.read_csv(nombre_archivo)
                df_historial['Date'] = df_historial['Date'].astype(str)

                # ¿Ya existe la vela de hoy?
                if fecha_hoy in df_historial['Date'].values:
                    # ACTUALIZAMOS la vela de hoy con los nuevos máximos/mínimos/cierre
                    df_historial.loc[df_historial['Date'] == fecha_hoy, 
                                     ['Precio_Inicio', 'Alto', 'Bajo', 'Precio_Cierre']] = \
                        [fila['Apertura'], fila['Máximo'], fila['Mínimo'], fila['Precio']]
                    
                    df_historial.to_csv(nombre_archivo, index=False, encoding="utf-8")
                    print(f"[{simbolo}] - Vela de hoy actualizada.")
                else:
                    # Es un día nuevo, agregamos la fila al final
                    df_nueva_fila.to_csv(nombre_archivo, mode='a', index=False, header=False, encoding="utf-8")
                    print(f"[{simbolo}] - Nueva vela diaria agregada.")
            else:
                # El archivo no existe, lo creamos
                df_nueva_fila.to_csv(nombre_archivo, index=False, encoding="utf-8")
                print(f"[{simbolo}] - Archivo creado con la primera vela.")
                
        except Exception as e:
            print(f"Error procesando {simbolo}: {e}")

def main():
    try:
        resp = requests.get(URL, headers=HEADERS, verify=False, timeout=15)
        # Importante: decimal punto y miles nada para que Pandas entienda los números
        tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
        df = tablas[0]

        # Limpieza rápida: asegurar que los números sean floats
        cols_num = ['Apertura', 'Máximo', 'Mínimo', 'Precio']
        for col in cols_num:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        guardar_por_empresa(df)
        print("\n¡Proceso OHLC completado!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()