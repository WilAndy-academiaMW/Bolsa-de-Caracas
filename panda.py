import pandas as pd
import os

# Rutas de archivos
ruta_origen = os.path.join('static', 'empresa', 'DOM.csv')
ruta_destino = os.path.join('static', 'csv', 'acciones', 'DOM.csv')

def actualizar_banco_caribe():
    try:
        # 1. LEER DATOS NUEVOS (ABC.A.csv)
        # Manejamos el formato de números con comas y puntos
        df_nuevo = pd.read_csv(ruta_origen, decimal=',', thousands='.')
        
        # Seleccionamos y reordenamos columnas: Fecha, Apertura, Máximo, Mínimo, Precio, Volumen
        columnas_velas = ['Fecha', 'Apertura', 'Máximo', 'Mínimo', 'Precio', 'Volumen']
        df_nuevo = df_nuevo[columnas_velas].copy()
        
        # Limpiamos decimales (1 solo decimal)
        cols_num = ['Apertura', 'Máximo', 'Mínimo', 'Precio', 'Volumen']
        df_nuevo[cols_num] = df_nuevo[cols_num].round(1)

        # 2. LEER DATOS EXISTENTES (Banco del Caribe.csv)
        if os.path.exists(ruta_destino):
            # Leemos el archivo actual. Como no tiene encabezados, los asignamos temporalmente
            df_existente = pd.read_csv(ruta_destino, header=None, names=columnas_velas)
            
            # 3. COMBINAR DATOS
            # Concatenamos ambos DataFrames
            df_combinado = pd.concat([df_existente, df_nuevo])
            
            # Eliminamos duplicados basados en la columna 'Fecha'
            # 'keep="last"' asegura que si una fecha se repite, se quede con el dato más reciente (el del primer csv)
            df_final = df_combinado.drop_duplicates(subset=['Fecha'], keep='last')
            
            # Ordenamos por fecha para que el archivo sea legible
            df_final = df_final.sort_values(by='Fecha')
        else:
            # Si el archivo destino no existía, el "final" es simplemente el nuevo procesado
            df_final = df_nuevo

        # 4. GUARDAR
        # index=False y header=False para mantener el formato limpio que me pediste
        df_final.to_csv(ruta_destino, index=False, header=False)
        
        print(f"¡Actualización completada! El archivo '{os.path.basename(ruta_destino)}' ha sido actualizado.")
        print(f"Últimas filas procesadas:\n{df_final.tail()}")

    except Exception as e:
        print(f"Error en la actualización: {e}")

if __name__ == "__main__":
    actualizar_banco_caribe()