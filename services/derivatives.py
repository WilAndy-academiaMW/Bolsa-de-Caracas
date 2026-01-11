# services/derivatives.py
import requests

BINANCE_FAPI = "https://fapi.binance.com"

def obtener_funding(symbol="BTCUSDT"):
    """
    Funding rate actual para contratos perpetuos en Binance Futures.
    """
    try:
        url = f"{BINANCE_FAPI}/fapi/v1/premiumIndex"
        params = {"symbol": symbol}
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        # Validaciones defensivas
        rate_str = data.get("lastFundingRate")
        next_time = data.get("nextFundingTime")
        if rate_str is None:
            return {"ok": False, "msg": "lastFundingRate no disponible", "raw": data}

        try:
            rate = float(rate_str)
        except (ValueError, TypeError):
            return {"ok": False, "msg": "Formato inválido de lastFundingRate", "raw": data}

        return {
            "ok": True,
            "symbol": symbol,
            "fundingRate": rate,
            "fundingTime": next_time
        }
    except requests.exceptions.RequestException as e:
        return {"ok": False, "msg": f"Error de red: {e}"}
    except Exception as e:
        return {"ok": False, "msg": f"Error interno: {e}"}

def obtener_open_interest(symbol="BTCUSDT"):
  
    try:
        url = f"{BINANCE_FAPI}/fapi/v1/openInterest"
        params = {"symbol": symbol}
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        oi_str = data.get("openInterest")
        if oi_str is None:
            return {"ok": False, "msg": "openInterest no disponible", "raw": data}

        try:
            oi = float(oi_str)
        except (ValueError, TypeError):
            return {"ok": False, "msg": "Formato inválido de openInterest", "raw": data}

        return {
            "ok": True,
            "symbol": symbol,
            "openInterest": oi
        }
    except requests.exceptions.RequestException as e:
        return {"ok": False, "msg": f"Error de red: {e}"}
    except Exception as e:
        return {"ok": False, "msg": f"Error interno: {e}"}
