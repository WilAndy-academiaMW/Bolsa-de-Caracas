import pandas as pd
import io

archivo_sucio = "datos_bvc_limpios.csv" # Tu archivo actual
archivo_limpio = "datos_bvc_limpios.csv"

def arreglar_comas_fecha(input_file, output_file):
    lineas_arregladas = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for linea in f:
            # Reemplazamos la PRIMERA coma que encuentre por un espacio
            # El '1' significa que solo lo haga una vez por línea
            nueva_linea = linea.replace(',', ' ', 1)
            lineas_arregladas.append(nueva_linea)
    
    # Ahora que la fecha está unida, lo pasamos a un DataFrame
    # Usamos la coma como separador para el resto de los datos
    csv_string = "".join(lineas_arregladas)
    df = pd.read_csv(io.StringIO(csv_string), names=['Fecha', 'Hora_Log', 'TKR', 'Precio', 'Hora_BVC'])
    
    # Guardamos el CSV final bien estructurado
    df.to_csv(output_file, index=False)
    print(f"✅ Archivo arreglado: {output_file}")
    print(df.head())

if __name__ == "__main__":
    arreglar_comas_fecha(archivo_sucio, archivo_limpio)