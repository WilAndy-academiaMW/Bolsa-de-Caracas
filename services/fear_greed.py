import pandas as pd
import numpy as np
import re
import math

def calcular_fear_greed(csv_path, ventana=25):
    try:
        print(f"👉 Leyendo archivo: {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"✅ CSV cargado con {len(df)} filas y columnas: {list(df.columns)}")

        # Normalizar nombres de columnas
        df.columns = [c.strip().lower() for c in df.columns]

        fecha_col = "fecha"
        precio_col = "precio"
        monto_col = "monto_efectivo"

        # ----------------- Limpieza numérica robusta -----------------
        def limpiar_numero(s):
            if pd.isna(s):
                return np.nan
            t = str(s).strip()
            if t == "" or t == "--":
                return np.nan
            # Reemplazar coma decimal por punto
            t = t.replace(",", ".")
            # Quitar espacios
            t = t.replace(" ", "")
            # Si hay más de un punto decimal, conservar solo el primero
            if t.count(".") > 1:
                # "584.6.15" -> "584.615"
                t = re.sub(r"\.(?=.*\.)", "", t)
            # Quitar cualquier carácter no numérico salvo el punto y el signo
            t = re.sub(r"[^0-9\.\-]", "", t)
            try:
                return float(t)
            except:
                return np.nan

        # Conversión de tipos con limpieza
        df[fecha_col] = pd.to_datetime(df[fecha_col], errors="coerce")
        df[precio_col] = df[precio_col].apply(limpiar_numero)
        df[monto_col] = df[monto_col].apply(limpiar_numero)

        # Reporte de valores inválidos
        invalid_precio = df[precio_col].isna().sum()
        invalid_monto = df[monto_col].isna().sum()
        print(f"🧹 Precio inválido/NaN: {invalid_precio} | Monto inválido/NaN: {invalid_monto}")

        # Filtrar filas válidas
        df = df.dropna(subset=[fecha_col, precio_col, monto_col])
        df = df.sort_values(fecha_col).reset_index(drop=True)

        # Ventana de cálculo
        df_window = df.tail(ventana)
        print(f"📊 Usando ventana de {len(df_window)} registros (de {len(df)} válidos)")

        # ----------------- Momentum acumulado -----------------
        precio_inicial = df_window[precio_col].iloc[0]
        precio_final = df_window[precio_col].iloc[-1]
        momentum_acumulado = ((precio_final - precio_inicial) / precio_inicial) * 100
        momentum_norm = min(100, max(0, momentum_acumulado))
        print(f"⚡ Momentum acumulado: {momentum_norm:.2f}")

        # ----------------- Volumen positivo vs negativo -----------------
        vol_pos, vol_neg = 0.0, 0.0

        # Asegurar arrays numéricos
        cierres = df_window[precio_col].astype(float).values
        volumenes = df_window[monto_col].astype(float).values

        # Depurar posibles no finitos en volumen
        non_finite_vol_idx = [i for i, v in enumerate(volumenes) if not np.isfinite(v)]
        if non_finite_vol_idx:
            print(f"⚠️ Volúmenes no finitos en índices: {non_finite_vol_idx}; serán tratados como 0.")

        for i in range(1, len(cierres)):
            vol = volumenes[i] if np.isfinite(volumenes[i]) else 0.0
            if cierres[i] > cierres[i-1]:
                vol_pos += vol
            elif cierres[i] < cierres[i-1]:
                vol_neg += vol
            # empates (igual precio) no suman

        total_vol = vol_pos + vol_neg
        volumen_norm = (vol_pos / total_vol) * 100 if total_vol > 0 else 50
        print(f"📦 Volumen positivo: {vol_pos:.2f} | negativo: {vol_neg:.2f} | volumen_norm: {volumen_norm:.2f}")

        # ----------------- Volatilidad diferenciada -----------------
        variaciones = df_window[precio_col].diff().dropna().astype(float)
        std_total = float(np.std(variaciones)) if len(variaciones) > 0 else 0.0

        if (variaciones > 0).sum() > (variaciones < 0).sum():
            volatilidad_norm = min(100, std_total)  # volatilidad alcista -> más codicia
            sesgo = "alcista"
        else:
            volatilidad_norm = max(0, 100 - std_total)  # volatilidad bajista -> más miedo
            sesgo = "bajista"
        print(f"🌪️ Volatilidad std: {std_total:.4f} | sesgo: {sesgo} | volatilidad_norm: {volatilidad_norm:.2f}")

        # ----------------- Índice final -----------------
        indice = (momentum_norm + volumen_norm + volatilidad_norm) / 3.0

        if indice >= 75:
         sentimiento = "Codicia extrema"
        elif indice >= 60:
         sentimiento = "Codicia"
        elif indice <= 25:
         sentimiento = "Miedo extremo"
        elif indice <= 40:
         sentimiento = "Miedo"
        else:
         sentimiento = "Neutral"


        print(f"🎯 Índice Miedo & Codicia: {indice:.2f} → Sentimiento: {sentimiento}")

        return {
            "momentum": round(momentum_norm, 2),
            "volumen": round(volumen_norm, 2),
            "volatilidad": round(volatilidad_norm, 2),
            "indice": round(indice, 2),
            "sentimiento": sentimiento
        }

    except Exception as e:
        import traceback
        print("❌ Error en cálculo:", traceback.format_exc())
        raise
