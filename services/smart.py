import pandas as pd
import numpy as np
import os

def obtener_movimientos_multi_radar():
    # Lista de acciones
    monedas = ["ABC.A","ARC.B","BPV","BNC","BVCC","BVL","CCP.B","CCR","CGQ","CRM.A","GZL","ICP.B",
               "TPG", "MPA", "BDV","BVCC", "EFE", "ENV", "TDA", "FNC", "DOM","MVZ.A","RST",
               "TDV.D","RST.B","PTN","MTC.B","IVC.A","IVC.B"]
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_dolar_path = os.path.join(base_dir, 'static', 'csv', 'dolar_bolivar.csv')
    
    # 1. Cargar tasas del BCV para dolarizar
    try:
        df_dolar = pd.read_csv(csv_dolar_path)
        df_dolar.columns = [c.strip().lower() for c in df_dolar.columns]
        # Columna 1: Tasa, Columna 2: Fecha
        col_tasa = df_dolar.columns[1]
        col_f_dolar = df_dolar.columns[2]
        df_dolar[col_f_dolar] = pd.to_datetime(df_dolar[col_f_dolar]).dt.date
    except Exception as e:
        print(f"⚠️ Error cargando dólar: {e}")
        return {}

    radares = {
        "scalping": {"ventana": 5, "umbral": 1.10, "alertas": []},
        "day": {"ventana": 15, "umbral": 1.20, "alertas": []},
        "swing": {"ventana": 30, "umbral": 1.40, "alertas": []},
        "institucional": {"ventana": 60, "umbral": 1.60, "alertas": []}
    }

    for crypto in monedas:
        csv_path = os.path.join(base_dir, 'static', 'acciones', f"{crypto.lower()}.csv")
        if not os.path.exists(csv_path): continue

        try:
            # 2. Carga y limpieza de la acción
            df = pd.read_csv(csv_path, names=['fecha', 'accion', 'precio', 'variacion_abs', 'monto_efectivo', 'hora'], header=0)
            df['fecha'] = pd.to_datetime(df['fecha']).dt.date
            
            # 3. Unificar con dólar para obtener PRECIO REAL (USD)
            df = pd.merge(df, df_dolar[[col_f_dolar, col_tasa]], left_on='fecha', right_on=col_f_dolar, how='left')
            df[col_tasa] = df[col_tasa].ffill() # Rellenar huecos de tasa
            
            # Creamos la columna de precio en dólares
            df['precio_usd'] = df['precio'] / df[col_tasa]
            
            df = df.tail(105)
            if len(df) < 2: continue 

            # Valores actuales dolarizados
            precio_actual_usd = float(df['precio_usd'].iloc[-1])
            precio_anterior_usd = float(df['precio_usd'].iloc[-2])
            vol_actual = float(df['monto_efectivo'].iloc[-1]) # El volumen lo dejamos en Bs o podrías dolarizarlo también

            # --- LÓGICA DE DETECCIÓN EN USD ---
            if precio_actual_usd > precio_anterior_usd:
                tipo, color = "ACUMULACIÓN (USD)", "#00ff00"
            elif precio_actual_usd < precio_anterior_usd:
                tipo, color = "DISTRIBUCIÓN (USD)", "#ff4444"
            else:
                tipo, color = "ABSORCIÓN (USD)", "#ebebeb"

            for nombre, config in radares.items():
                v = config["ventana"]
                if len(df) >= v + 1:
                    vol_promedio = df['monto_efectivo'].iloc[-(v+1):-1].mean()
                    
                    if vol_promedio > 0:
                        fuerza = vol_actual / vol_promedio
                        if fuerza > config["umbral"]:
                            config["alertas"].append({
                                "symbol": crypto,
                                "fuerza": round(fuerza, 2),
                                "tipo": tipo,
                                "color": color,
                                "precio_usd": round(precio_actual_usd, 4),
                                "precio_bs": round(df['precio'].iloc[-1], 2)
                            })
                            print(f"🚀 Radar {nombre} detectó {crypto} en USD!")

        except Exception as e:
            print(f"❌ Error en {crypto}: {e}")
            continue

    # Ordenar por fuerza
    for nombre in radares:
        radares[nombre]["alertas"] = sorted(radares[nombre]["alertas"], key=lambda x: x['fuerza'], reverse=True)

    return radares