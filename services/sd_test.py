import pandas as pd
import os

def calcular_oferta_demanda(ruta_csv):
    if not os.path.exists(ruta_csv):
        return {"error": "Archivo no encontrado"}

    try:
        df = pd.read_csv(ruta_csv)
        for col in ['Alto_USD', 'Bajo_USD', 'Precio_Cierre_USD', 'Precio_Inicio_USD']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df = df.dropna(subset=['Alto_USD', 'Bajo_USD', 'Date'])
        
        zonas_vivas = []
        periodo = 5 
        precio_actual = df.iloc[-1]['Precio_Cierre_USD']

        for i in range(len(df) - 2, periodo, -1):
            v_actual = df.iloc[i]
            
            # --- LÓGICA DE OFERTA (SUPPLY) ---
            techo = v_actual['Alto_USD']
            es_pico = all(techo >= df.iloc[i-k]['Alto_USD'] for k in range(1, periodo + 1))
            
            if es_pico:
                fue_mitigada = any(df.iloc[j]['Alto_USD'] >= techo for j in range(i + 1, len(df)))
                if not fue_mitigada and precio_actual < techo * 0.97:
                    # El borde inferior es el MINIMO entre Open y Close (el inicio del cuerpo)
                    limite_cuerpo = min(v_actual['Precio_Inicio_USD'], v_actual['Precio_Cierre_USD'])
                    zonas_vivas.append({
                        "top": float(techo),
                        "bottom": float(limite_cuerpo),
                        "fecha": v_actual['Date'],
                        "tipo": "SUPPLY"
                    })

            # --- LÓGICA DE DEMANDA (DEMAND) ---
            suelo = v_actual['Bajo_USD']
            es_suelo = all(suelo <= df.iloc[i-k]['Bajo_USD'] for k in range(1, periodo + 1))
            
            if es_suelo:
                fue_mitigada = any(df.iloc[j]['Bajo_USD'] <= suelo for j in range(i + 1, len(df)))
                if not fue_mitigada and precio_actual > suelo * 1.03:
                    # El borde superior es el MAXIMO entre Open y Close (el final del cuerpo)
                    limite_cuerpo = max(v_actual['Precio_Inicio_USD'], v_actual['Precio_Cierre_USD'])
                    zonas_vivas.append({
                        "top": float(limite_cuerpo),
                        "bottom": float(suelo),
                        "fecha": v_actual['Date'],
                        "tipo": "DEMAND"
                    })

            if len(zonas_vivas) >= 12: break

        return {"status": "ok", "zonas": zonas_vivas}
    except Exception as e:
        return {"status": "error", "message": str(e)}