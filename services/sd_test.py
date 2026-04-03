import pandas as pd
import os

def calcular_oferta_demanda(ruta_csv):
    if not os.path.exists(ruta_csv):
        return {"error": "Archivo no encontrado"}

    df = pd.read_csv(ruta_csv)
    cols = ['Alto_USD', 'Bajo_USD', 'Precio_Inicio_USD', 'Precio_Cierre_USD', 'Date']
    df[cols[:-1]] = df[cols[:-1]].apply(pd.to_numeric, errors='coerce')

    ultimo_alto = df['Alto_USD'].iloc[0]
    ultimo_bajo = df['Bajo_USD'].iloc[0]
    
    posible_demanda = None 
    posible_oferta = None
    zonas_vivas = []

    for i in range(1, len(df)):
        fila = df.iloc[i]
        
        # Identificar vela bajista -> Candidata a Demanda
        if fila['Precio_Cierre_USD'] < fila['Precio_Inicio_USD']:
            posible_demanda = {
                "top": float(fila['Alto_USD']),
                "bottom": float(fila['Bajo_USD']),
                "fecha": fila['Date'],
                "tipo": "DEMAND"
            }
        # Identificar vela alcista -> Candidata a Oferta
        elif fila['Precio_Cierre_USD'] > fila['Precio_Inicio_USD']:
            posible_oferta = {
                "top": float(fila['Alto_USD']),
                "bottom": float(fila['Bajo_USD']),
                "fecha": fila['Date'],
                "tipo": "SUPPLY"
            }

        # --- VALIDACIÓN POR ROMPIMIENTO (BOS) ---
        # Si rompe el máximo, confirmamos la demanda previa
        if fila['Precio_Cierre_USD'] > ultimo_alto:
            if posible_demanda:
                # Comprobar si sigue virgen hasta el final del archivo
                mitigada = False
                for j in range(i + 1, len(df)):
                    if df.iloc[j]['Bajo_USD'] <= posible_demanda['top']:
                        mitigada = True
                        break
                if not mitigada:
                    zonas_vivas.append(posible_demanda)
                posible_demanda = None
            ultimo_alto = fila['Alto_USD']

        # Si rompe el mínimo, confirmamos la oferta previa
        elif fila['Precio_Cierre_USD'] < ultimo_bajo:
            if posible_oferta:
                mitigada = False
                for j in range(i + 1, len(df)):
                    if df.iloc[j]['Alto_USD'] >= posible_oferta['bottom']:
                        mitigada = True
                        break
                if not mitigada:
                    zonas_vivas.append(posible_oferta)
                posible_oferta = None
            ultimo_bajo = fila['Bajo_USD']

    return {"status": "ok", "zonas": zonas_vivas}