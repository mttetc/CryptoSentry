-- Rename coingecko_id → binance_symbol across all tables
-- Values change from CoinGecko IDs ("bitcoin") to Binance symbols ("BTCUSDT")

ALTER TABLE price_alerts RENAME COLUMN coingecko_id TO binance_symbol;
ALTER TABLE influencer_events RENAME COLUMN coingecko_id TO binance_symbol;
ALTER TABLE user_portfolios RENAME COLUMN coingecko_id TO binance_symbol;
