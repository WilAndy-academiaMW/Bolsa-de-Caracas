import os
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from datetime import datetime

# --- CONFIGURACIÓN DE RUTAS ---
RUTA_DOLAR_BS = "./static/csv/dolar_bolivar.csv"
RUTA_ACCIONES_BS = "./static/csv/acciones/bolivar.csv"

def actualizar_tasa_bcv():
    print("🚀 [BCV BOT] Iniciando extracción...")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless") 
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

    driver = None
    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.get("https://www.bcv.org.ve/")
        driver.implicitly_wait(10)
        
        # Extraer el valor del dólar
        dolar_box = driver.find_element(By.ID, 'dolar')
        # El BCV a veces cambia la etiqueta, buscamos el texto que contenga el número
        precio_usd_str = dolar_box.text.strip().split()[-1].replace('.', '').replace(',', '.') 
        precio_usd = float(precio_usd_str)
        
        fecha_actual = datetime.now().strftime("%Y-%m-%d")
        print(f"💰 Tasa encontrada: {precio_usd}")

        # --- PROCESO 1: dolar_bolivar.csv ---
        # Columnas: Moneda, Tasa (Bs/USD), Fecha Extracción
        cols1 = ['Moneda', 'Tasa (Bs/USD)', 'Fecha Extracción']
        nuevo_dato1 = pd.DataFrame([['USD', precio_usd, fecha_actual]], columns=cols1)

        if os.path.exists(RUTA_DOLAR_BS):
            df1 = pd.read_csv(RUTA_DOLAR_BS)
            df1 = df1[df1['Fecha Extracción'].astype(str) != fecha_actual] # Evitar duplicado de hoy
            df1 = pd.concat([df1, nuevo_dato1], ignore_index=True)
        else:
            df1 = nuevo_dato1
        
        df1.to_csv(RUTA_DOLAR_BS, index=False)

        # --- PROCESO 2: acciones/bolivar.csv ---
        # Columnas: Date, Precio_Inicio, Alto, Bajo, Precio_Cierre
        cols2 = ['Date', 'Precio_Inicio', 'Alto', 'Bajo', 'Precio_Cierre']
        nuevo_dato2 = pd.DataFrame([[fecha_actual, precio_usd, precio_usd, precio_usd, precio_usd]], columns=cols2)

        if os.path.exists(RUTA_ACCIONES_BS):
            df2 = pd.read_csv(RUTA_ACCIONES_BS)
            # Limpiamos si ya existe hoy
            df2 = df2[df2['Date'].astype(str) != fecha_actual]
            df2 = pd.concat([df2, nuevo_dato2], ignore_index=True)
        else:
            df2 = nuevo_dato2

        df2.to_csv(RUTA_ACCIONES_BS, index=False)

        print(f"✅ [BCV BOT] Datos actualizados en ambas rutas.")
        return precio_usd

    except Exception as e:
        print(f"❌ [BCV BOT] Error: {e}")
        return None
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    actualizar_tasa_bcv()