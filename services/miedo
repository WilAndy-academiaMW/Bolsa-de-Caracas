import pandas as pd
import numpy as np
import re

def calcular_fear_greed(csv_path, ventana=20):
    try:
        df = pd.read_csv(csv_path)
        df.columns = [c.strip().lower() for c in df.columns]

        # --- Limpieza idéntica para no romper nada ---
        def limpiar_numero(s):
            if pd.isna(s): return np.nan
            t = str(s).strip().replace(",", ".")
            t = re.sub(r"[^0-9\.\-]", "", t)
            try: return float(t)
            except: return np.nan

        df['precio'] = df['precio'].apply(limpiar_numero)
        df['monto_efectivo'] = df['monto_efectivo'].apply(limpiar_numero)
        df = df.dropna(subset=['precio', 'monto_efectivo']).sort_values('fecha')
        
        df_window = df.tail(ventana).copy()

        # ----------------- 1. MOMENTUM PORCENTUAL -----------------
        # Antes: p_fin - p_ini (Daba 400, que el min(100) convertía en 100)
        # Ahora: Porcentaje real
        p_ini = df_window['precio'].iloc[0]
        p_fin = df_window['precio'].iloc[-1]
        cambio_pct = ((p_fin - p_ini) / p_ini) * 100
        
        # Normalización: Un 15% de subida en 25 días es Codicia (100 pts)
        # Un 0% es Neutral (50 pts). Una caída del 15% es Miedo (0 pts).
        momentum_norm = min(100, max(0, 50 + (cambio_pct * 3.33)))

        # ----------------- 2. VOLUMEN (Se mantiene tu lógica) -----------------
        cierres = df_window['precio'].values
        vols = df_window['monto_efectivo'].values
        v_pos, v_neg = 0, 0
        for i in range(1, len(cierres)):
            if cierres[i] > cierres[i-1]: v_pos += vols[i]
            elif cierres[i] < cierres[i-1]: v_neg += vols[i]
        
        volumen_norm = (v_pos / (v_pos + v_neg)) * 100 if (v_pos + v_neg) > 0 else 50

        # ----------------- 3. VOLATILIDAD PORCENTUAL -----------------
        # Antes: std del precio (Daba 300, que el min(100) convertía en 100)
        # Ahora: std del retorno diario en %
        retornos_diarios = df_window['precio'].pct_change().dropna() * 100
        std_pct = np.std(retornos_diarios)
        
        # Una volatilidad diaria del 3% promedio ya es extrema (100 pts)
        vol_base = min(100, (std_pct / 3.0) * 100)
        
        # Si el precio baja, la volatilidad suma "Miedo" (puntos bajos)
        if p_fin >= p_ini:
            volatilidad_norm = vol_base
        else:
            volatilidad_norm = 100 - vol_base

        # --- ÍNDICE FINAL ---
        indice = (momentum_norm + volumen_norm + volatilidad_norm) / 3.0

        if indice >= 75: sentimiento = "Codicia extrema"
        elif indice >= 60: sentimiento = "Codicia"
        elif indice <= 25: sentimiento = "Miedo extremo"
        elif indice <= 40: sentimiento = "Miedo"
        else: sentimiento = "Neutral"

        return {
            "momentum": round(momentum_norm, 2),
            "volumen": round(volumen_norm, 2),
            "volatilidad": round(volatilidad_norm, 2),
            "indice": round(indice, 2),
            "sentimiento": sentimiento
        }

    except Exception as e:
        return {"indice": 50, "sentimiento": str(e)}