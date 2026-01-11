import os
import requests

# Carpeta CSV a nivel del proyecto
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CSV_FOLDER = os.path.join(BASE_DIR, "csv")
os.makedirs(CSV_FOLDER, exist_ok=True)

# Top 30 (sin stablecoins) con URLs de Binance diario en CryptoDataDownload
CRYPTO_URLS = {
    "bitcoin": "https://www.cryptodatadownload.com/cdd/Binance_BTCUSDT_d.csv",
    "ethereum": "https://www.cryptodatadownload.com/cdd/Binance_ETHUSDT_d.csv",
    "bnb": "https://www.cryptodatadownload.com/cdd/Binance_BNBUSDT_d.csv",
    "solana": "https://www.cryptodatadownload.com/cdd/Binance_SOLUSDT_d.csv",
    "xrp": "https://www.cryptodatadownload.com/cdd/Binance_XRPUSDT_d.csv",
    "cardano": "https://www.cryptodatadownload.com/cdd/Binance_ADAUSDT_d.csv",
    "dogecoin": "https://www.cryptodatadownload.com/cdd/Binance_DOGEUSDT_d.csv",
    "toncoin": "https://www.cryptodatadownload.com/cdd/Binance_TONUSDT_d.csv",
    "avalanche": "https://www.cryptodatadownload.com/cdd/Binance_AVAXUSDT_d.csv",
    "polkadot": "https://www.cryptodatadownload.com/cdd/Binance_DOTUSDT_d.csv",
    "polygon": "https://www.cryptodatadownload.com/cdd/Binance_MATICUSDT_d.csv",
    "chainlink": "https://www.cryptodatadownload.com/cdd/Binance_LINKUSDT_d.csv",
    "internetcomputer": "https://www.cryptodatadownload.com/cdd/Binance_ICPUSDT_d.csv",
    "litecoin": "https://www.cryptodatadownload.com/cdd/Binance_LTCUSDT_d.csv",
    "uniswap": "https://www.cryptodatadownload.com/cdd/Binance_UNIUSDT_d.csv",
    "stellar": "https://www.cryptodatadownload.com/cdd/Binance_XLMUSDT_d.csv",
    "near": "https://www.cryptodatadownload.com/cdd/Binance_NEARUSDT_d.csv",
    "aptos": "https://www.cryptodatadownload.com/cdd/Binance_APTUSDT_d.csv",
    "filecoin": "https://www.cryptodatadownload.com/cdd/Binance_FILUSDT_d.csv",
    "cosmos": "https://www.cryptodatadownload.com/cdd/Binance_ATOMUSDT_d.csv",
    "hedera": "https://www.cryptodatadownload.com/cdd/Binance_HBARUSDT_d.csv",
    "vechain": "https://www.cryptodatadownload.com/cdd/Binance_VETUSDT_d.csv",
    "arbitrum": "https://www.cryptodatadownload.com/cdd/Binance_ARBUSDT_d.csv",
    "optimism": "https://www.cryptodatadownload.com/cdd/Binance_OPUSDT_d.csv",
    "algorand": "https://www.cryptodatadownload.com/cdd/Binance_ALGOUSDT_d.csv",
    "maker": "https://www.cryptodatadownload.com/cdd/Binance_MKRUSDT_d.csv",
    "render": "https://www.cryptodatadownload.com/cdd/Binance_RNDRUSDT_d.csv",
    "immutable": "https://www.cryptodatadownload.com/cdd/Binance_IMXUSDT_d.csv",
    "thegraph": "https://www.cryptodatadownload.com/cdd/Binance_GRTUSDT_d.csv",
    "fantom": "https://www.cryptodatadownload.com/cdd/Binance_FTMUSDT_d.csv"
}

SUPPORTED_SYMBOLS = list(CRYPTO_URLS.keys())

def _download_to_file(url: str, filepath: str) -> dict:
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(r.content)
        return {"status": "ok", "file": filepath}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

def download_csv(symbol: str) -> dict:
    url = CRYPTO_URLS.get(symbol)
    if not url:
        return {"status": "error", "msg": f"{symbol} no soportado"}
    filename = os.path.join(CSV_FOLDER, f"{symbol}.csv")
    return _download_to_file(url, filename)

def update_all_csv() -> dict:
    results = {}
    for sym, url in CRYPTO_URLS.items():
        filename = os.path.join(CSV_FOLDER, f"{sym}.csv")
        results[sym] = _download_to_file(url, filename)
    return results
