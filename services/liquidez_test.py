import pandas as pd
import os

def calcular_liquidez_data(ruta_csv, tolerancia=0.0005):
    if not os.path.exists(ruta_csv):
        return {"error": "Archivo no encontrado"}

    df = pd.read_csv(ruta_csv)
    df['Alto_USD'] = pd.to_numeric(df['Alto_USD'], errors='coerce')
    df['Bajo_USD'] = pd.to_numeric(df['Bajo_USD'], errors='coerce')
    
    liquidez_puntos = []

    # Buscamos en los últimos 20 registros para encontrar zonas frescas
    for i in range(10, len(df)):
        alto_actual = float(df.iloc[i]['Alto_USD'])
        bajo_actual = float(df.iloc[i]['Bajo_USD'])
        fecha_actual = df.iloc[i]['Date']

        # Buscar Buy Side Liquidity (BSL - Techos Iguales)
        for j in range(i-10, i):
            alto_pasado = float(df.iloc[j]['Alto_USD'])
            if abs(alto_actual - alto_pasado) / alto_pasado <= tolerancia:
                liquidez_puntos.append({
                    "tipo": "BSL",
                    "precio": alto_actual,
                    "fecha": fecha_actual,
                    "texto": "Liquidez de Venta ($)"
                })
                break

        # Buscar Sell Side Liquidity (SSL - Suelos Iguales)
        for j in range(i-10, i):
            bajo_pasado = float(df.iloc[j]['Bajo_USD'])
            if abs(bajo_actual - bajo_pasado) / bajo_pasado <= tolerancia:
                liquidez_puntos.append({
                    "tipo": "SSL",
                    "precio": bajo_actual,
                    "fecha": fecha_actual,
                    "texto": "Liquidez de Compra ($)"
                })
                break

    return {"status": "ok", "puntos": liquidez_puntos}