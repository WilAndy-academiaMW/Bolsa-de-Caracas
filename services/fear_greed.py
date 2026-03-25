import pandas as pd
import numpy as np
import re
import os

def calcular_fear_greed(csv_accion, csv_dolar='static/csv/dolar_bolivar.csv', ventana=21):
    try:
        # 1. CARGA DE DATOS
        df = pd.read_csv(csv_accion)
        df_dolar = pd.read_csv(csv_dolar)
        
        # Limpiar nombres de columnas
        df.columns = [c.strip().lower() for c in df.columns]
        df_dolar.columns = [c.strip().lower() for c in df_dolar.columns]

        # --- Función de limpieza numérica ---
        def limpiar_numero(s):
            if pd.isna(s): return np.nan
            t = str(s).strip().replace(",", ".")
            t = re.sub(r"[^0-9\.\-]", "", t)
            try: return float(t)
            except: return np.nan

        # Limpiar precios de la acción y tasa del dólar
        df['precio'] = df['precio'].apply(limpiar_numero)
        df['monto_efectivo'] = df['monto_efectivo'].apply(limpiar_numero)
        
        # En el CSV del dólar: Columna 1 es Tasa, Columna 2 es Fecha
        # Basado en tu descripción: Moneda, Tasa (Bs/USD), Fecha Extracción
        col_tasa = df_dolar.columns[1]
        col_fecha_dolar = df_dolar.columns[2]
        df_dolar[col_tasa] = df_dolar[col_tasa].apply(limpiar_numero)

        # 2. UNIFICAR POR FECHA (Merge)
        # Aseguramos que las fechas tengan el mismo formato para el cruce
        df['fecha'] = pd.to_datetime(df['fecha']).dt.date
        df_dolar[col_fecha_dolar] = pd.to_datetime(df_dolar[col_fecha_dolar]).dt.date

        # Cruzamos ambos CSVs para tener la tasa que correspondía a cada día
        df = pd.merge(df, df_dolar[[col_fecha_dolar, col_tasa]], 
                      left_on='fecha', right_on=col_fecha_dolar, how='left')

        # Si no hay tasa para un día, usamos la anterior (ffill)
        df[col_tasa] = df[col_tasa].ffill()

        # --- DOLARIZACIÓN REAL ---
        # Dividimos el precio en Bs entre la tasa del BCV de ese mismo día
        df['precio_usd'] = df['precio'] / df[col_tasa]
        
        # Usamos el precio dolarizado para los cálculos
        df = df.dropna(subset=['precio_usd', 'monto_efectivo']).sort_values('fecha')
        df_window = df.tail(ventana).copy()

        # ----------------- 1. MOMENTUM (En USD) -----------------
        p_ini = df_window['precio_usd'].iloc[0]
        p_fin = df_window['precio_usd'].iloc[-1]
        cambio_pct = ((p_fin - p_ini) / p_ini) * 100
        momentum_norm = min(100, max(0, 50 + (cambio_pct * 3.33)))

        mom_txt = "Subida (USD)" if momentum_norm >= 70 else "Lateral (USD)" if momentum_norm >= 40 else "Bajista (USD)"

        # ----------------- 2. VOLUMEN -----------------
        cierres = df_window['precio_usd'].values
        vols = df_window['monto_efectivo'].values # El monto efectivo suele estar en Bs, pero la tendencia es la misma
        v_pos, v_neg = 0, 0
        for i in range(1, len(cierres)):
            if cierres[i] > cierres[i-1]: v_pos += vols[i]
            elif cierres[i] < cierres[i-1]: v_neg += vols[i]
        
        volumen_norm = (v_pos / (v_pos + v_neg)) * 100 if (v_pos + v_neg) > 0 else 50
        vol_txt = "Acumulación" if volumen_norm >= 60 else "Neutral" if volumen_norm >= 40 else "Distribución"

        # ----------------- 3. VOLATILIDAD (Sensibilidad 10.0) -----------------
        retornos_diarios = df_window['precio_usd'].pct_change().dropna() * 100
        std_pct = np.std(retornos_diarios)
        vol_base = min(100, (std_pct / 10.0) * 100) # Divisor 10 para mercado Vzla
        
        if p_fin >= p_ini:
            volatilidad_norm = vol_base
        else:
            volatilidad_norm = 100 - vol_base

        vlt_txt = "normal" if volatilidad_norm >= 75 else "Moderada" if volatilidad_norm >= 40 else "alta"

        # --- ÍNDICE FINAL ---
        indice = (momentum_norm + volumen_norm + volatilidad_norm) / 3.0

        if indice >= 75: sentimiento = "Codicia extrema"
        elif indice >= 60: sentimiento = "Codicia"
        elif indice <= 25: sentimiento = "Miedo extremo"
        elif indice <= 40: sentimiento = "Miedo"
        else: sentimiento = "Neutral"

        return {
            "momentum": f"{round(momentum_norm, 2)}% ({mom_txt})",
            "volumen": f"{round(volumen_norm, 2)}% ({vol_txt})",
            "volatilidad": f"{round(volatilidad_norm, 2)}% ({vlt_txt})",
            "indice": round(indice, 2),
            "sentimiento": sentimiento,
            "analisis": "Dolarizado (Precios / Tasa BCV)"
        }

    except Exception as e:
        return {"indice": 50, "sentimiento": f"Error: {str(e)}"}