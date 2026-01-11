import pandas as pd
import os

def convertir_acciones():
    RUTA_ACCIONES = "static/csv/acciones2/"
    RUTA_SALIDA = "static/csv/accionesusd2/"
    ARCHIVO_FX = os.path.join("static/csv/acciones2/usd_ves.csv")

    os.makedirs(RUTA_SALIDA, exist_ok=True)

    # Leer tipo de cambio (bolívar)
    df_fx = pd.read_csv(ARCHIVO_FX)
    df_fx["Date"] = pd.to_datetime(df_fx["Date"], errors="coerce")
    df_fx = df_fx[["Date", "Precio_Cierre"]].rename(columns={"Precio_Cierre": "Tasa"})
    df_fx.sort_values("Date", inplace=True)
    df_fx["Tasa"] = pd.to_numeric(df_fx["Tasa"], errors="coerce").replace(0, pd.NA).ffill()

    # Lista de acciones
    ACCIONES = [
        "banco caribe.csv", "bnc.csv", "bdv.csv", "IBC.csv",
        "mampa.csv", "mercantil.csv", "proagro.csv",
        "provincial.csv", "sinvesa.csv","ceramica carabobo.csv","corimon.csv",
        "Domingues y sia.csv", "bolsa de caracas.csv","telares.csv","efe.csv","envases.csv",
    ]

    for archivo in ACCIONES:
        ruta_in = os.path.join(RUTA_ACCIONES, archivo)
        if not os.path.exists(ruta_in):
            print(f"Archivo no encontrado: {archivo}")
            continue

        # Leer acciones
        df_bs = pd.read_csv(ruta_in)
        df_bs["Date"] = pd.to_datetime(df_bs["fecha"], errors="coerce")

        # Merge con tipo de cambio
        df = pd.merge(df_bs, df_fx, on="Date", how="inner")

        # Mapear columnas correctamente
        mapping = {
            "Apert.": "Apert.",
            "Cierre": "Cierre",
            "Max.": "Max.",
            "Min.": "Min.",
            "efectivo": "efectivo"
        }

        # Convertir a USD
        for col_accion in mapping.keys():
            df[col_accion] = pd.to_numeric(df[col_accion], errors="coerce")
            df[col_accion + "_USD"] = (df[col_accion] / df["Tasa"]).round(3)

        # Columnas de salida
        columnas_salida = ["Date"] + [c + "_USD" for c in mapping.keys()]
        df_out = df[columnas_salida].copy()

        # Guardar CSV
        salida = os.path.join(RUTA_SALIDA, archivo.replace(".csv", "_usd.csv"))
        df_out.to_csv(salida, index=False, float_format="%.3f")
        print(f"Archivo convertido: {salida}")

    return "Conversión realizada"

if __name__ == "__main__":
    resultado = convertir_acciones()
    print(resultado)
