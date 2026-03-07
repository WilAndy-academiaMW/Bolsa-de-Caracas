import tabula
import pandas as pd
import warnings

# Desactivar advertencias de formato para una consola limpia
warnings.filterwarnings("ignore")

def extraer_datos_provincial(url_pdf):
    print(f"--- Analizando informe bancario ---")
    
    try:
        # Extraemos todas las tablas del PDF
        # 'stream=True' es mejor para tablas sin líneas divisorias visibles
        tablas = tabula.read_pdf(url_pdf, pages='all', stream=True, multiple_tables=True)
        
        datos_encontrados = False

        for i, df in enumerate(tablas):
            # Limpiamos nombres de columnas para facilitar la búsqueda
            df.columns = [str(c).replace('\r', ' ') for c in df.columns]
            
            # Buscamos la fila del BBVA Provincial
            # Usamos 'case=False' por si viene en mayúsculas o minúsculas
            fila_provincial = df[df.apply(lambda row: row.astype(str).str.contains('Provincial', case=False).any(), axis=1)]

            if not fila_provincial.empty:
                # Si encontramos la fila, imprimimos la info
                # Normalmente: Columna 0=Banco, Columna 1=Monto, Columna 2=Cuota...
                info = fila_provincial.values[0]
                
                # Intentamos identificar si es tabla de Créditos o Captaciones por el contexto de la página
                contexto = " ".join(df.columns).lower()
                tipo = "Captaciones" if "captaciones" in contexto or "depósitos" in contexto else "Cartera de Créditos"
                
                print(f"\n📍 Tipo de Tabla detectada: {tipo}")
                print(f"🏦 Banco: {info[0]}")
                print(f"💰 Monto (MM Bs.): {info[1]}")
                print(f"📊 Cuota de Mercado: {info[2]}%")
                datos_encontrados = True

        if not datos_encontrados:
            print("No se encontró la fila de 'Provincial' en las tablas del PDF.")

    except Exception as e:
        print(f"Error al procesar el PDF: {e}")

# URL del PDF (debes copiar el link directo del PDF que quieres analizar)
url_ejemplo = "https://www.bancaynegocios.com/wp-content/uploads/2026/01/ranking-enero.pdf"
extraer_datos_provincial(url_ejemplo)