import pandas as pd
import os

def calcular_smc_estructura(ruta_csv):
    if not os.path.exists(ruta_csv):
        return {"error": "Archivo no encontrado"}

    df = pd.read_csv(ruta_csv)
    # Ajuste de columnas según tu CSV
    cols = ['Precio_Cierre_USD', 'Alto_USD', 'Bajo_USD']
    df[cols] = df[cols].apply(pd.to_numeric, errors='coerce')
    
    ultimo_alto = df['Alto_USD'].iloc[0]
    ultimo_bajo = df['Bajo_USD'].iloc[0]
    tendencia = None
    eventos = []

    for i in range(1, len(df)):
        fila = df.iloc[i]
        cierre = fila['Precio_Cierre_USD']
        fecha = fila['Date']

        # Rompimiento Alcista
        if cierre > ultimo_alto:
            tipo = "ChoCh" if tendencia == "BAJISTA" else "BOS"
            eventos.append({"fecha": fecha, "precio": float(ultimo_alto), "tipo": f"{tipo} ALCISTA"})
            tendencia = "ALCISTA"
            ultimo_alto = fila['Alto_USD']

        # Rompimiento Bajista
        elif cierre < ultimo_bajo:
            tipo = "ChoCh" if tendencia == "ALCISTA" else "BOS"
            eventos.append({"fecha": fecha, "precio": float(ultimo_bajo), "tipo": f"{tipo} BAJISTA"})
            tendencia = "BAJISTA"
            ultimo_bajo = fila['Bajo_USD']

        # Actualizar fractales
        if fila['Alto_USD'] > ultimo_alto: ultimo_alto = fila['Alto_USD']
        if fila['Bajo_USD'] < ultimo_bajo: ultimo_bajo = fila['Bajo_USD']

    return {"status": "ok", "eventos": eventos}