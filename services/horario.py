import pandas as pd
import os

# --- CONFIGURACIÓN DE RUTAS ---
ARCHIVO_ENTRADA = "datos_bvc_limpios.csv" 
CARPETA_SALIDA = "static/acciones-horas"

def generar_velas_horarias(input_file, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder, exist_ok=True)

    try:
        # Leer el archivo
        df = pd.read_csv(input_file)
        
        # Limpiar TKR
        df['TKR'] = df['TKR'].str.replace(':', '', regex=False).str.strip()

        # --- TRADUCTOR Y NORMALIZACIÓN ---
        # Pasamos todo a minúsculas para que coincida siempre
        df['Fecha'] = df['Fecha'].str.lower().str.strip()

        meses_es_en = {
            'ene': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'abr': 'Apr',
            'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Aug',
            'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dec'
        }

        # Aplicamos la traducción
        for es, en in meses_es_en.items():
            df['Fecha'] = df['Fecha'].str.replace(es, en, regex=False)

        # Crear columna de tiempo real
        anio_actual = 2026 
        df['Full_Fecha'] = df['Fecha'] + f" {anio_actual} " + df['Hora_BVC']
        
        # CONVERSIÓN ROBUSTA:
        # Usamos format='mixed' y dayfirst para que Pandas sea más flexible
        df['Datetime'] = pd.to_datetime(df['Full_Fecha'], dayfirst=True, errors='coerce')

        # Eliminar filas donde la fecha no se pudo procesar (si las hay)
        df = df.dropna(subset=['Datetime'])

        tickers_unicos = df['TKR'].unique()

        for ticker in tickers_unicos:
            print(f"📊 Procesando velas para: {ticker}...")
            df_ticker = df[df['TKR'] == ticker].copy()
            df_ticker.set_index('Datetime', inplace=True)

            # Generar OHLC (Vela de 1 Hora)
            ohlc_df = df_ticker['Precio'].resample('1H').ohlc()
            
            # Limpiar filas vacías (horas donde no hubo trades)
            ohlc_df = ohlc_df.dropna(subset=['open'])
            
            if ohlc_df.empty:
                continue

            ohlc_df.columns = ['Apertura', 'Maximo', 'Minimo', 'Cierre']
            ohlc_df.reset_index(inplace=True)
            ohlc_df.rename(columns={'Datetime': 'Fecha_Hora'}, inplace=True)

            # Guardar CSV
            ruta_final = os.path.join(output_folder, f"{ticker}.csv")
            ohlc_df.to_csv(ruta_final, index=False)
            print(f"✅ Guardado: {ruta_final}")

        print("\n🚀 ¡Velas horarias generadas con éxito!")

    except Exception as e:
        print(f"❌ Error procesando el motor de velas: {e}")

if __name__ == "__main__":
    generar_velas_horarias(ARCHIVO_ENTRADA, CARPETA_SALIDA)