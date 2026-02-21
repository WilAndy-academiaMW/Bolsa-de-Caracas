import pandas as pd
import numpy as np
import re
from flask import Flask, jsonify

# ... (Tus otras funciones como calcular_fear_greed)

def calcular_master_score_brutal(csv_path):
    try:
        df = pd.read_csv(csv_path)
        df.columns = [c.strip().lower() for c in df.columns]

        # --- Tu limpieza de confianza ---
        def limpiar_numero(s):
            if pd.isna(s): return np.nan
            t = str(s).strip().replace(",", ".")
            t = re.sub(r"[^0-9\.\-]", "", t)
            try: return float(t)
            except: return np.nan

        df['precio'] = df['precio'].apply(limpiar_numero)
        df['monto_efectivo'] = df['monto_efectivo'].apply(limpiar_numero)
        df = df.dropna(subset=['precio']).sort_values('fecha')

        # --- CÁLCULO RSI (14) ---
        delta = df['precio'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        df['rsi'] = 100 - (100 / (1 + (gain / loss)))

        # --- CÁLCULO MACD (12, 26, 9) ---
        ema12 = df['precio'].ewm(span=12, adjust=False).mean()
        ema26 = df['precio'].ewm(span=26, adjust=False).mean()
        df['macd_line'] = ema12 - ema26
        df['macd_signal'] = df['macd_line'].ewm(span=9, adjust=False).mean()
        df['macd_hist'] = df['macd_line'] - df['macd_signal']

        # --- CÁLCULO MEDIA VOLUMEN (10) ---
        df['vol_media'] = df['monto_efectivo'].rolling(window=10).mean()

        # Tomamos el último registro para el Score
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

        # Bono Volumen
        bono_vol = 0
        ratio_vol = row['monto_efectivo'] / row['vol_media'] if row['vol_media'] > 0 else 1
        variacion = row['precio'] - df['precio'].iloc[-2]
        if ratio_vol > 1.3:
            bono_vol = 15 if variacion > 0 else -15

        # Master Score Final
        master_score = (score_rsi * 0.4) + (p_macd * 0.4) + (50 * 0.2) + bono_vol
        master_score = np.clip(master_score, 0, 100)

        # Estados según tus rangos
        if master_score < 30: estado = "Sobre Venta"
        elif master_score < 45: estado = "Venta"
        elif master_score < 60: estado = "Neutral"
        elif master_score < 75: estado = "Compra"
        else: estado = "Sobre Compra"

        return {
            "valor": round(master_score, 2),
            "estado": estado,
            "rsi": round(score_rsi, 2),
            "macd_hist": round(row['macd_hist'], 4)
        }

    except Exception as e:
        return {"valor": 50, "estado": f"Error: {str(e)}"}

# --- RUTA PARA TU APP FLASK ---
