import pandas as pd
import numpy as np
import re
import os

def calcular_master_score_brutal(csv_path, csv_dolar='static/csv/dolar_bolivar.csv'):
    try:
        # 1. CARGA DE DATOS
        df = pd.read_csv(csv_path)
        df_dolar = pd.read_csv(csv_dolar)
        
        df.columns = [c.strip().lower() for c in df.columns]
        df_dolar.columns = [c.strip().lower() for c in df_dolar.columns]

        # --- Limpieza idéntica ---
        def limpiar_numero(s):
            if pd.isna(s): return np.nan
            t = str(s).strip().replace(",", ".")
            t = re.sub(r"[^0-9\.\-]", "", t)
            try: return float(t)
            except: return np.nan

        df['precio'] = df['precio'].apply(limpiar_numero)
        df['monto_efectivo'] = df['monto_efectivo'].apply(limpiar_numero)
        
        # Datos del Dólar (Columna 1: Tasa, Columna 2: Fecha)
        col_tasa = df_dolar.columns[1]
        col_f_dolar = df_dolar.columns[2]
        df_dolar[col_tasa] = df_dolar[col_tasa].apply(limpiar_numero)

        # 2. DOLARIZACIÓN ANTES DE LOS CÁLCULOS
        df['fecha'] = pd.to_datetime(df['fecha']).dt.date
        df_dolar[col_f_dolar] = pd.to_datetime(df_dolar[col_f_dolar]).dt.date
        
        df = pd.merge(df, df_dolar[[col_f_dolar, col_tasa]], 
                      left_on='fecha', right_on=col_f_dolar, how='left')
        df[col_tasa] = df[col_tasa].ffill()
        
        # PRECIO REAL EN USD (Sobre este calculamos los indicadores)
        df['precio_usd'] = df['precio'] / df[col_tasa]
        df = df.dropna(subset=['precio_usd']).sort_values('fecha')

        # --- CÁLCULO RSI (14) SOBRE PRECIO USD ---
        delta = df['precio_usd'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        # Evitar división por cero
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))

        # --- CÁLCULO MACD SOBRE PRECIO USD ---
        ema12 = df['precio_usd'].ewm(span=12, adjust=False).mean()
        ema26 = df['precio_usd'].ewm(span=26, adjust=False).mean()
        df['macd_line'] = ema12 - ema26
        df['macd_signal'] = df['macd_line'].ewm(span=9, adjust=False).mean()
        df['macd_hist'] = df['macd_line'] - df['macd_signal']

        # --- MEDIA VOLUMEN (Se puede quedar en Bs o USD, el ratio es el mismo) ---
        df['vol_media'] = df['monto_efectivo'].rolling(window=10).mean()

        # Tomamos el último registro dolarizado
        row = df.iloc[-1]
        
        # --- LÓGICA DE SCORE MAESTRO ---
        score_rsi = row['rsi'] if not pd.isna(row['rsi']) else 50
        
        # MACD Score
        p_macd = 50
        if row['macd_line'] > 0: p_macd += 10
        else: p_macd -= 10
        if row['macd_hist'] > 0: p_macd += 15
        else: p_macd -= 15
        if row['macd_line'] > row['macd_signal']: p_macd += 10

        # Bono Volumen (Detección de interés real)
        bono_vol = 0
        ratio_vol = row['monto_efectivo'] / row['vol_media'] if row['vol_media'] > 0 else 1
        variacion_usd = row['precio_usd'] - df['precio_usd'].iloc[-2]
        
        if ratio_vol > 1.3:
            # El bono solo se da si la variación en DÓLARES es positiva
            bono_vol = 15 if variacion_usd > 0 else -15

        # Master Score Final
        master_score = (score_rsi * 0.4) + (p_macd * 0.4) + (50 * 0.2) + bono_vol
        master_score = np.clip(master_score, 0, 100)

        # Estados
        if master_score < 30: estado = "Sobre Venta (Oportunidad)"
        elif master_score < 45: estado = "Venta"
        elif master_score < 60: estado = "Neutral"
        elif master_score < 75: estado = "Compra"
        else: estado = "Sobre Compra (Cuidado)"

        return {
            "valor": round(master_score, 2),
            "estado": estado,
            "rsi": round(score_rsi, 2),
            "macd_hist": round(row['macd_hist'], 6),
            "precio_usd": round(row['precio_usd'], 4),
            "analisis": "Técnico Real (Dolarizado)"
        }

    except Exception as e:
        return {"valor": 50, "estado": f"Error: {str(e)}"}