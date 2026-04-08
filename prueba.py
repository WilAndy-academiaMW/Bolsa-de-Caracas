import pandas as pd

path = r"static\empresa\SVS.csv"

def limpiar_numero(serie):
    if serie.dtype == 'object':
        return serie.str.replace('.', '', regex=False).str.replace(',', '.', regex=False).astype(float)
    return serie

def calcular_indicador_bvc_5dias(ruta):
    try:
        df = pd.read_csv(ruta)
        
        # Limpieza de columnas
        columnas_numericas = ['Compra', 'Venta', 'Precio', 'Var %', 'Efectivo', 'Operaciones', 'Volumen']
        for col in columnas_numericas:
            df[col] = limpiar_numero(df[col])

        df['Fecha'] = pd.to_datetime(df['Fecha'])
        df = df.sort_values(by='Fecha')

        # Cálculos base
        df['TPT'] = df['Efectivo'] / df['Operaciones']
        df['TPT_Mean_26'] = df['TPT'].rolling(window=min(26, len(df))).mean()
        df['Presion_Libro'] = (df['Compra'] - df['Venta']) / (df['Compra'] + df['Venta'])
        df['Vol_Relativo'] = df['Volumen'] / df['Volumen'].rolling(window=min(26, len(df))).mean()

        # Seleccionamos los últimos 5 días
        ultimos_5 = df.tail(5)

        print(f"\n==========================================")
        print(f" REPORTE EVOLUTIVO: {ultimos_5.iloc[-1]['Símbolo']}")
        print(f"==========================================\n")

        for i in range(len(ultimos_5)):
            fila = ultimos_5.iloc[i]
            
            # Cálculo de Score rápido para cada día
            score = 0
            if fila['Vol_Relativo'] > 1.1: score += 30
            if fila['TPT'] > fila['TPT_Mean_26']: score += 40
            if fila['Presion_Libro'] > 0: score += 30
            
            # Formato de salida
            print(f"FECHA: {fila['Fecha'].date()}")
            print(f"Precio: {fila['Precio']:,.2f} ({fila['Var %']}%)")
            print(f"Efectivo: {fila['Efectivo']:,.2f} | Ops: {int(fila['Operaciones'])}")
            print(f"TPT (Poder): {fila['TPT']:,.2f} vs Media: {fila['TPT_Mean_26']:,.2f}")
            print(f"Intención Libro: {round(fila['Presion_Libro'], 2)}")
            print(f"SCORE: {score}/100")
            
            # Un separador visual entre días
            if i < len(ultimos_5) - 1:
                print("-" * 25)
            else:
                print("\n==========================================")
                if score >= 70: print("ESTADO FINAL: COMPRA FUERTE")
                elif score >= 40: print("ESTADO FINAL: NEUTRAL / OBSERVACIÓN")
                else: print("ESTADO FINAL: DEBILIDAD EXTREMA")

    except Exception as e:
        print(f"Error: {e}")

calcular_indicador_bvc_5dias(path)