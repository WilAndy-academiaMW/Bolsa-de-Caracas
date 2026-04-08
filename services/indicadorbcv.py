import pandas as pd
import os
import numpy as np

def calcular_oscilador_brutal(simbolo):
    try:
        # 1. CARGA DE DATOS
        ruta = os.path.join("static", "empresa", f"{simbolo.upper()}.csv")
        if not os.path.exists(ruta):
            return []

        df = pd.read_csv(ruta)
        
        # 2. LIMPIEZA DE DATOS
        columnas = ['Compra', 'Venta', 'Precio', 'Efectivo', 'Operaciones', 'Volumen']
        for col in columnas:
            if col in df.columns and df[col].dtype == 'object':
                df[col] = df[col].str.replace('.', '', regex=False).str.replace(',', '.', regex=False).astype(float)
            elif col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        df['Fecha'] = pd.to_datetime(df['Fecha'])
        df = df.sort_values(by='Fecha')

        # 3. CÁLCULO DE MÉTRICAS CLAVE
        
        # A. MOMENTUM (Precio vs Media 10)
        df['SMA_10'] = df['Precio'].rolling(window=10, min_periods=1).mean()
        df['Price_Momentum'] = ((df['Precio'] - df['SMA_10']) / df['SMA_10']) * 100

        # B. TPT (Institucional)
        df['TPT'] = df['Efectivo'] / df['Operaciones'].replace(0, 1)
        df['TPT_Mean'] = df['TPT'].rolling(window=20, min_periods=1).mean()
        
        # C. LIBRO Y BRECHA (NUEVO)
        # Ratio de volumen en puntas
        df['Presion_Neta'] = (df['Compra'] - df['Venta']) / (df['Compra'] + df['Venta'] + 1)
        
        # Cálculo de la Brecha (Spread %)
        # Es la distancia entre el mejor vendedor y el mejor comprador
        df['Brecha'] = ((df['Venta'] - df['Compra']) / df['Precio']).abs() * 100

        # 4. LÓGICA DE SCORING CON FILTRO DE BRECHA
        def scoring_maestro(row):
            score = 0
            
            # --- FACTOR PRECIO (Hasta 40 pts) ---
            if row['Price_Momentum'] > 1:
                score += 40 * min(row['Price_Momentum'] / 5, 1.5)
            elif row['Price_Momentum'] < -1:
                score -= 40 * min(abs(row['Price_Momentum']) / 5, 1.5)

            # --- FACTOR INSTITUCIONAL (Hasta 25 pts) ---
            if row['TPT'] > row['TPT_Mean']:
                score += 25
            
            # --- FACTOR LIBRO + FILTRO DE BRECHA (Hasta 35 pts) ---
            presion = row['Presion_Neta']
            brecha = row['Brecha']

            if brecha > 8: 
                # Si la brecha es > 8%, el libro no es confiable (iliquidez)
                # Reducimos el impacto del libro a la mitad
                score += (presion * 15)
            elif brecha < 2:
                # Si la brecha es < 2%, es un mercado muy líquido y real
                # Le damos el máximo peso al libro
                score += (presion * 35)
            else:
                # Brecha normal (2% a 8%)
                score += (presion * 25)
                
            return score

        df['Score_Crudo'] = df.apply(scoring_maestro, axis=1)

        # 5. SUAVIZADO EMA (Reacción rápida span 5)
        df['Score_Final'] = df['Score_Crudo'].ewm(span=5, adjust=False).mean()
        df['Score_Final'] = df['Score_Final'].clip(-100, 100)

        # 6. FORMATEO JSON
        resultado = []
        for _, fila in df.iterrows():
            if pd.isna(fila['Score_Final']): continue
            resultado.append({
                "time": fila['Fecha'].strftime('%Y-%m-%d'),
                "value": round(float(fila['Score_Final']), 2)
            })

        return resultado

    except Exception as e:
        print(f"❌ Error en Power Logic: {e}")
        return []