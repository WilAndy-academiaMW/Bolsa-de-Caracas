import pandas as pd
import os

def calcular_fvg_data(ruta_csv):
    if not os.path.exists(ruta_csv):
        return {"error": "Archivo no encontrado"}

    df = pd.read_csv(ruta_csv)
    cols = ['Alto_USD', 'Bajo_USD', 'Date']
    df[cols[:-1]] = df[cols[:-1]].apply(pd.to_numeric, errors='coerce')

    fvgs_vivos = []

    for i in range(2, len(df)):
        v1 = df.iloc[i-2]
        v2 = df.iloc[i-1]
        v3 = df.iloc[i]
        
        fvg = None
        
        # --- DETECTAR FVG ALCISTA ---
        if v3['Bajo_USD'] > v1['Alto_USD']:
            fvg = {
                "fecha": v2['Date'],
                "top": float(v3['Bajo_USD']),
                "bottom": float(v1['Alto_USD']),
                "tipo": "BULLISH",
                "index": i
            }
            
        # --- DETECTAR FVG BAJISTA ---
        elif v3['Alto_USD'] < v1['Bajo_USD']:
            fvg = {
                "fecha": v2['Date'],
                "top": float(v1['Bajo_USD']),
                "bottom": float(v3['Alto_USD']),
                "tipo": "BEARISH",
                "index": i
            }

        if fvg:
            # --- COMPROBAR SI ESTÁ MITIGADO ---
            mitigado = False
            # Revisamos todas las velas desde que se formó el FVG (i+1) hasta el final
            for j in range(i + 1, len(df)):
                futura = df.iloc[j]
                
                if fvg["tipo"] == "BULLISH":
                    # Si el precio baja y entra en el hueco
                    if futura['Bajo_USD'] <= fvg["top"]:
                        mitigado = True
                        break
                else: # BEARISH
                    # Si el precio sube y entra en el hueco
                    if futura['Alto_USD'] >= fvg["bottom"]:
                        mitigado = True
                        break
            
            if not mitigado:
                fvgs_vivos.append(fvg)

    return {"status": "ok", "fvgs": fvgs_vivos}