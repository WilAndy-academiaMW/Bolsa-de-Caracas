import os, csv

CSV_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "csv")

def load_csv(symbol="bitcoin"):
    filename = os.path.join(CSV_FOLDER, f"{symbol}.csv")
    data = []
    with open(filename, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # Saltar filas que son encabezados repetidos o vacías
                if not row.get("Date") or row["Date"].startswith("Date"):
                    continue
                data.append({
                    "date": row["Date"],
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row.get("Volume USDT", 0) or 0)
                })
            except Exception:
                # Saltar cualquier fila corrupta
                continue
    return data

def filter_years(symbol="bitcoin", years=1):
    data = load_csv(symbol)
    # Si no hay datos, devuelve lista vacía
    if not data:
        return []
    return data[-365*years:]
