import pandas as pd
import numpy as np
import re
import os

def limpiar_numero(s):
    if pd.isna(s): return np.nan
    t = str(s).strip().replace('"', '').replace(",", ".")
    t = re.sub(r"[^0-9\.\-]", "", t)
    try: return float(t)
    except: return np.nan

def procesar_bloque_tecnico(df_segmento):
    # REGLA DE ORO: Si el bloque no tiene al menos 26 filas, no se muestra (para h1, h2, h3)
    if len(df_segmento) < 26:
        return {"valor": "--", "estado": "ESPERANDO DATOS", "rsi": "--", "macd_hist": "--"}

    # Cálculos Técnicos
    delta = df_segmento['precio_usd'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
    rs = gain / loss
    df_segmento['rsi'] = 100 - (100 / (1 + rs))

    ema12 = df_segmento['precio_usd'].ewm(span=12, adjust=False).mean()
    ema26 = df_segmento['precio_usd'].ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    macd_signal = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - macd_signal

    row = df_segmento.iloc[-1]
    score_rsi = row['rsi'] if not pd.isna(row['rsi']) else 50
    
    p_macd = 50
    if macd_line.iloc[-1] > 0: p_macd += 10
    else: p_macd -= 10
    if macd_hist.iloc[-1] > 0: p_macd += 15
    else: p_macd -= 15

    master_score = np.clip((score_rsi * 0.5) + (p_macd * 0.5), 0, 100)

    if master_score < 30: estado = "SOBREVENTA"
    elif master_score < 45: estado = "VENTA"
    elif master_score < 60: estado = "NEUTRAL"
    elif master_score < 75: estado = "COMPRA"
    else: estado = "SOBRECOMPRA"

    return {
        "valor": round(master_score, 2),
        "estado": estado,
        "rsi": round(score_rsi, 1),
        "macd_hist": round(macd_hist.iloc[-1], 6)
    }

def calcular_master_score_brutal(csv_path, csv_dolar='static/csv/dolar_bolivar.csv'):
    try:
        df = pd.read_csv(csv_path)
        df_dolar = pd.read_csv(csv_dolar)
        
        df.columns = [c.strip().lower() for c in df.columns]
        df_dolar.columns = [c.strip().lower() for c in df_dolar.columns]

        df['precio'] = df['precio'].apply(limpiar_numero)
        df['fecha_dt'] = pd.to_datetime(df['fecha'])
        col_tasa = df_dolar.columns[1]
        df_dolar[col_tasa] = df_dolar[col_tasa].apply(limpiar_numero)
        df_dolar['fecha_dt'] = pd.to_datetime(df_dolar[df_dolar.columns[2]])

        df = pd.merge_asof(df.sort_values('fecha_dt'), 
                           df_dolar[['fecha_dt', col_tasa]].sort_values('fecha_dt'), 
                           on='fecha_dt', direction='backward')
        df['precio_usd'] = df['precio'] / df[col_tasa]
        df = df.dropna(subset=['precio_usd']).sort_values('fecha_dt')

        total = len(df)
        
        # --- LÓGICA DE BLOQUES DINÁMICOS ---
        
        # 1. ACTUAL: El estado de hoy (usa todo lo que haya, mínimo 26 para que sea serio)
        actual_res = procesar_bloque_tecnico(df.copy())

        # 2. MES 1 (h1): Las últimas 26 filas
        h1_data = df.iloc[-26:].copy() if total >= 26 else pd.DataFrame()
        
        # 3. MES 2 (h2): De la fila -52 a la -26
        h2_data = df.iloc[-52:-26].copy() if total >= 52 else pd.DataFrame()
        
        # 4. MES 3 (h3): De la fila -78 a la -52
        h3_data = df.iloc[-78:-52].copy() if total >= 78 else pd.DataFrame()

        return {
            "actual": actual_res,
            "h1": procesar_bloque_tecnico(h1_data) if not h1_data.empty else {"valor": "--"},
            "h2": procesar_bloque_tecnico(h2_data) if not h2_data.empty else {"valor": "--"},
            "h3": procesar_bloque_tecnico(h3_data) if not h3_data.empty else {"valor": "--"}
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"actual": {"valor": 0}, "h1": {"valor": "--"}, "h2": {"valor": "--"}, "h3": {"valor": "--"}}