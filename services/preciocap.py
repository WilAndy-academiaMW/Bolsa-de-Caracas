import requests, csv, os

CRYPTO_LIST = [
    "bitcoin", "ethereum", "bnb", "ripple", "solana", "cardano", "dogecoin", "tron",
    "toncoin", "avalanche-2", "shiba-inu", "polkadot", "chainlink", "polygon",
    "litecoin", "bitcoin-cash", "stellar", "uniswap", "hedera", "internet-computer",
    "aptos", "near", "monero", "arbitrum", "vechain", "optimism", "algorand",
    "eos", "tezos", "sui","toncoin"
]

def actualizar():
    url = "https://api.coingecko.com/api/v3/coins/markets"
    params = {
        "vs_currency": "usd",
        "ids": ",".join(CRYPTO_LIST),
        "order": "market_cap_desc",
        "per_page": len(CRYPTO_LIST),
        "page": 1,
        "sparkline": False
    }

    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()

        os.makedirs("static/csv", exist_ok=True)
        with open("static/csv/precios_cap.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["criptomoneda", "precio", "capitalizacion"])
            for coin in data:
                writer.writerow([coin["name"], coin["current_price"], coin["market_cap"]])

        return {"status": "ok", "message": "CSV actualizado"}
    else:
        return {"status": "error", "code": response.status_code}
