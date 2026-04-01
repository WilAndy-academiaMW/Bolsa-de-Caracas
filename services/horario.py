import pandas as pd
import requests
import urllib3
import os
import time
from io import StringIO
from datetime import datetime

# Desactivar warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "https://market.bolsadecaracas.com/es"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# --- CONFIGURACIÓN DE RUTA ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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
            
            # Datos de la web
            p_inicio = fila['Apertura']
            p_alto = fila['Máximo']
            p_bajo = fila['Mínimo']
            p_cierre = fila['Precio']
            v_monto = fila.get('Monto', 0) # Capturamos volumen (monto efectivo)

            if os.path.exists(nombre_archivo):
                df_historial = pd.read_csv(nombre_archivo)
                df_historial['Date'] = df_historial['Date'].astype(str)

                # LÓGICA DE ARRASTRE: Si hoy no hay precio, usamos el cierre de ayer
                if p_cierre <= 0 and not df_historial.empty:
                    ultimo_cierre_ayer = df_historial.iloc[-1]['Precio_Cierre']
                    p_inicio, p_alto, p_bajo, p_cierre = [ultimo_cierre_ayer] * 4
                    v_monto = 0.0
                    print(f"[{simbolo}] - Arrastrando precio anterior.")

                # ACTUALIZAR O AGREGAR
                if fecha_hoy in df_historial['Date'].values:
                    df_historial.loc[df_historial['Date'] == fecha_hoy, 
                                     ['Precio_Inicio', 'Alto', 'Bajo', 'Precio_Cierre', 'Volume']] = \
                        [p_inicio, p_alto, p_bajo, p_cierre, v_monto]
                    df_historial.to_csv(nombre_archivo, index=False, encoding="utf-8")
                    print(f"[{simbolo}] - Vela actualizada.")
                else:
                    nueva_fila = pd.DataFrame([{
                        'Date': fecha_hoy, 'Precio_Inicio': p_inicio, 
                        'Alto': p_alto, 'Bajo': p_bajo, 'Precio_Cierre': p_cierre, 'Volume': v_monto
                    }])
                    nueva_fila.to_csv(nombre_archivo, mode='a', index=False, header=False, encoding="utf-8")
                    print(f"[{simbolo}] - Nueva vela agregada.")
            else:
                # Si el archivo no existe, lo creamos (solo si hay precio válido)
                if p_cierre > 0:
                    df_nuevo = pd.DataFrame([{
                        'Date': fecha_hoy, 'Precio_Inicio': p_inicio, 
                        'Alto': p_alto, 'Bajo': p_bajo, 'Precio_Cierre': p_cierre, 'Volume': v_monto
                    }])
                    df_nuevo.to_csv(nombre_archivo, index=False, encoding="utf-8")
                    print(f"[{simbolo}] - Archivo creado.")
                
        except Exception as e:
            print(f"Error en {simbolo}: {e}")

def main():
    intentos_max = 3
    for i in range(intentos_max):
        try:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Conectando BVC (Intento {i+1}/3)...")
            resp = requests.get(URL, headers=HEADERS, verify=False, timeout=60)
            resp.raise_for_status()
            
            tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
            df = tablas[0]

            cols_num = ['Apertura', 'Máximo', 'Mínimo', 'Precio', 'Monto']
            for col in cols_num:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

            guardar_por_empresa(df)
            print("\n✅ ¡ÉXITO! Proceso completado.")
            break 

        except Exception as e:
            print(f"❌ Falló intento {i+1}: {e}")
            if i < intentos_max - 1:
                print("⏳ Esperando 2 minutos para reintentar...")
                time.sleep(120)
            else:
                print("🚫 No se pudo conectar con la BVC.")

if __name__ == "__main__":
    main()