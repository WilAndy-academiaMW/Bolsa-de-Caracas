import requests

def obtener_liquidaciones(symbol="BTCUSDT", limit=20):
    url = "https://fapi.binance.com/fapi/v1/forceOrders"
    params = {"symbol": symbol, "limit": limit}
    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if not data:
            return {"ok": False, "msg": "Sin liquidaciones recientes"}

        resultados = []
        for liq in data:
            resultados.append({
                "symbol": liq.get("symbol"),
                "price": float(liq.get("price", 0)),
                "qty": float(liq.get("origQty", 0)),
                "side": liq.get("side", "UNKNOWN"),
                "time": liq.get("time")
            })
        return {"ok": True, "liquidaciones": resultados}
    except Exception as e:
        return {"ok": False, "msg": f"Error: {e}"}
