import pandas as pd

def detectar_zonas_maestras_smc(ruta_csv):
    try:
        df = pd.read_csv(ruta_csv)
        for col in ['Alto_USD', 'Bajo_USD', 'Precio_Cierre_USD', 'Precio_Inicio_USD']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        zonas_oferta = []
        zonas_demanda = []
        
        # 'periodo' define qué tan importante es el pico/suelo (Swing High/Low)
        periodo = 5 
        precio_actual = df.iloc[-1]['Precio_Cierre_USD']

        for i in range(len(df) - 2, periodo, -1):
            v_actual = df.iloc[i]
            
            # --- LÓGICA DE OFERTA (SWING HIGH) ---
            if len(zonas_oferta) < 5:
                techo_posible = v_actual['Alto_USD']
                # ¿Es el más alto de su entorno (izquierda)?
                es_pico = all(techo_posible >= df.iloc[i-k]['Alto_USD'] for k in range(1, periodo + 1))
                
                if es_pico:
                    # ¿Fue superado a la derecha?
                    superado = any(df.iloc[j]['Alto_USD'] > techo_posible for j in range(i + 1, len(df)))
                    # ¿Hubo desplazamiento (caída de al menos 3%)?
                    if not superado and precio_actual < techo_posible * 0.97:
                        zonas_oferta.append({"fecha": v_actual['Date'], "precio": techo_posible})

            # --- LÓGICA DE DEMANDA (SWING LOW) ---
            if len(zonas_demanda) < 5:
                suelo_posible = v_actual['Bajo_USD']
                # ¿Es el más bajo de su entorno (izquierda)?
                es_suelo = all(suelo_posible <= df.iloc[i-k]['Bajo_USD'] for k in range(1, periodo + 1))
                
                if es_suelo:
                    # ¿Fue roto hacia abajo a la derecha?
                    roto = any(df.iloc[j]['Bajo_USD'] < suelo_posible for j in range(i + 1, len(df)))
                    # ¿Hubo desplazamiento (subida de al menos 3%)?
                    if not roto and precio_actual > suelo_posible * 1.03:
                        zonas_demanda.append({"fecha": v_actual['Date'], "precio": suelo_posible})

        # --- IMPRESIÓN DE RESULTADOS ---
        print(f"\n" + "="*50)
        print(f"REPORTES DE INGENIERÍA SMC - {ruta_csv}")
        print("="*50)

        print("\n[VENDEDORES] ZONAS DE OFERTA (RESISTENCIAS MAESTRAS):")
        for z in zonas_oferta:
            print(f" • {z['fecha']} | Nivel Crítico: {z['precio']} USD")
        
        print("\n[COMPRADORES] ZONAS DE DEMANDA (SOPORTES MAESTROS):")
        for z in zonas_demanda:
            print(f" • {z['fecha']} | Nivel Crítico: {z['precio']} USD")
        print("\n" + "="*50)

    except Exception as e:
        print(f"Error en el proceso: {e}")

if __name__ == "__main__":
    ruta = r'static\csv\accionesusd\ABC.A.csv'
    detectar_zonas_maestras_smc(ruta)