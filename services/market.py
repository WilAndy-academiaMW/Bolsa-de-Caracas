import pandas as pd
import requests
import urllib3
import os
import time
from io import StringIO
from datetime import datetime, time as dt_time

# Desactivar warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "https://market.bolsadecaracas.com/es"
HEADERS = {"User-Agent": "Mozilla/5.0"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Ruta para la carpeta empresa
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

    fecha_hoy = datetime.utcnow().strftime("%Y-%m-%d")

    for _, fila in df.iterrows():
        simbolo = str(fila['Símbolo']).strip()
        if not simbolo: continue 
        
        nombre_archivo = os.path.join(FOLDER_EMPRESA, f"{simbolo}.csv")
        # Asegurarnos de que la fecha esté en el dataframe antes de guardar
        fila_dict = fila.to_dict()
        fila_dict['Fecha'] = fecha_hoy
        nueva_fila = pd.DataFrame([fila_dict])

        if os.path.exists(nombre_archivo):
            try:
                df_existente = pd.read_csv(nombre_archivo)
                # Si ya existe la fecha, omitimos para no duplicar filas en el mismo día
                if fecha_hoy in df_existente['Fecha'].astype(str).values:
                    continue
                nueva_fila.to_csv(nombre_archivo, mode='a', index=False, header=False, encoding="utf-8-sig")
            except:
                nueva_fila.to_csv(nombre_archivo, index=False, encoding="utf-8-sig")
        else:
            nueva_fila.to_csv(nombre_archivo, index=False, encoding="utf-8-sig")

def ejecutar_proceso():
    """Intenta descargar y procesar. Si falla, retorna False."""
    try:
        # Timeout de 30 seg por si la web de la BVC está lenta o caída
        resp = requests.get(URL, headers=HEADERS, verify=False, timeout=30)
        resp.raise_for_status()

        tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
        if not tablas:
            print("Web cargó pero no se encontraron tablas.")
            return False

        df = tablas[0]
        cols_existentes = [c for c in COLUMNAS if c in df.columns]
        df = df[cols_existentes].copy()

        for col in df.columns:
            if col not in ['Nombre', 'Símbolo']:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # Procesar y formatear
        for col in df.columns:
            if col not in ['Nombre', 'Símbolo']:
                df[col] = df[col].apply(formatear_venezuela)

        guardar_por_empresa(df)
        print(f"[{datetime.utcnow().strftime('%H:%M:%S')}] Datos guardados correctamente.")
        return True

    except Exception as e:
        print(f"[{datetime.utcnow().strftime('%H:%M:%S')}] La web falló (es normal): {e}")
        return False

# --- BUCLE PRINCIPAL (ALWAYS-ON) ---
if __name__ == "__main__":
    print("Iniciando Monitor de Empresas (13:00 - 17:30 UTC)...")
    
    while True:
        ahora_utc = datetime.utcnow()
        hora_actual = ahora_utc.time()
        dia_semana = ahora_utc.weekday()
        
        inicio = dt_time(13, 0)
        fin = dt_time(17, 30)

        # 1. Saltarse fines de semana
        if dia_semana > 4:
            print("Fin de semana. Durmiendo hasta el lunes...")
            time.sleep(3600)
            continue

        # 2. Rango de operación
        if inicio <= hora_actual <= fin:
            # Ejecuta. No importa si da True o False, el sleep de abajo ocurrirá igual.
            ejecutar_proceso()
            
            # Esperar 10 minutos (600 segundos) para el siguiente intento
            print("Próxima revisión en 10 minutos...")
            time.sleep(600)
        else:
            # 3. Fuera de horario, dormir 15 min y reintentar
            print(f"Hora UTC: {hora_actual.strftime('%H:%M')}. Fuera de jornada bursátil. Durmiendo...")
            time.sleep(900)