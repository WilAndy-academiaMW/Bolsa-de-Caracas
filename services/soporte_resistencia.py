import pandas as pd
import os
import numpy as np

def calcular_pivotes_brutales(symbol, folder="accionesusd", sensibilidad=0.01):
    try:
        ruta_csv = os.path.join("static", "csv", folder, f"{symbol.upper()}.csv")
        if not os.path.exists(ruta_csv):
            return {"error": "Archivo no encontrado"}

        df = pd.read_csv(ruta_csv)
        df.columns = [str(c).strip().capitalize() for c in df.columns]

        # Mapeo de columnas para BVC (Alto_usd, Bajo_usd, Close)
        mapeo = {
            'High': ['Alto_usd', 'High', 'Maximo'],
            'Low': ['Bajo_usd', 'Low', 'Minimo'],
            'Close': ['Close', 'Cierre', 'Precio_cierre_usd']
        }
        for oficial, sinonimos in mapeo.items():
            for s in sinonimos:
                s_cap = s.capitalize()
                if s_cap in df.columns and oficial not in df.columns:
                    df.rename(columns={s_cap: oficial}, inplace=True)

        df['High'] = pd.to_numeric(df['High'], errors='coerce')
        df['Low'] = pd.to_numeric(df['Low'], errors='coerce')
        df['Close'] = pd.to_numeric(df['Close'], errors='coerce')
        df = df.dropna(subset=['High', 'Low', 'Close'])

        precios_high = df['High'].values
        precios_low = df['Low'].values
        precios_close = df['Close'].values
        
        lista_zonas = []
        ventana = 3 # Ventana más pequeña para no perder giros rápidos
        
        for i in range(ventana, len(df) - ventana):
            es_pico = (precios_high[i] == np.max(precios_high[i-ventana : i+ventana+1]))
            es_valle = (precios_low[i] == np.min(precios_low[i-ventana : i+ventana+1]))

            if es_pico or es_valle:
                precio_giro = precios_high[i] if es_pico else precios_low[i]
                
                # Buscamos el movimiento máximo en las siguientes velas
                futuro = precios_close[i+1 : i+30] # Escaneamos un mes de velas aprox.
                if len(futuro) == 0: continue

                if es_valle:
                    movimiento = (np.max(futuro) - precio_giro) / precio_giro
                else:
                    movimiento = (precio_giro - np.min(futuro)) / precio_giro

                # CLASIFICACIÓN INDEPENDIENTE POR COLORES
                if movimiento >= 0.10:
                    color = "#ffff00" # Amarillo (10%)
                    fuerza = "REACCION"
                    if movimiento >= 0.20:
                        color = "#0000ff" # Azul (20%)
                        fuerza = "FUERTE"
                    if movimiento >= 0.30:
                        color = "#ff0000" # Rojo (30%)
                        fuerza = "CRITICO"

                    lista_zonas.append({
                        "precio": float(precio_giro),
                        "color": color,
                        "fuerza": fuerza,
                        "mov": round(movimiento * 100, 1)
                    })

        # Filtrar: Solo nos quedamos con las últimas 15 zonas detectadas 
        # para que la gráfica no sea un arcoíris de líneas viejas
        lista_zonas = lista_zonas[-15:]

        precio_actual = precios_close[-1]
        final_zonas = []
        for z in lista_zonas:
            final_zonas.append({
                "precio": z["precio"],
                "color": z["color"],
                "fuerza": z["fuerza"],
                "impactos": z["mov"], # Usamos el % de movimiento como info extra
                "tipo": "SOPORTE" if precio_actual > z["precio"] else "RESISTENCIA"
            })

        return {
            "symbol": symbol,
            "pivote_central": round(float(precio_actual), 3),
            "zonas_memoria": final_zonas
        }

    except Exception as e:
        return {"error": str(e)}