import { z } from "zod";
import { AppError } from "@/lib/errors";

const COINGECKO_API_BASE_URL = "https://api.coingecko.com/api/v3";
const majorExchangeIds = new Set([
  "binance",
  "coinbase_exchange",
  "kraken",
  "bybit_spot",
  "okx",
  "bitfinex",
  "kucoin",
  "gate",
  "crypto_com",
]);

const coinMarketsResponseSchema = z.array(
  z.object({
    id: z.string().trim().min(1),
    symbol: z.string().trim().min(1),
    name: z.string().trim().min(1),
    market_cap_rank: z.number().int().positive().nullable(),
    market_cap: z.number().nonnegative().nullable(),
    total_volume: z.number().nonnegative().nullable(),
    price_change_percentage_24h_in_currency: z.number().nullable(),
  }),
);

const coinTickersResponseSchema = z.object({
  tickers: z.array(
    z.object({
      is_anomaly: z.boolean().optional().default(false),
      is_stale: z.boolean().optional().default(false),
      trust_score: z.string().nullable().optional(),
      market: z.object({
        identifier: z.string().trim().min(1),
      }),
    }),
  ),
});

export type MarketCoinCandidate = {
  externalId: string;
  symbol: string;
  name: string;
  marketCapRank: number | null;
  marketCapUsd: number;
  volume24hUsd: number;
  priceChange24hPct: number | null;
  exchangeIds: string[];
};

export interface CoinMarketDataProvider {
  source: string;
  fetchCandidates(): Promise<MarketCoinCandidate[]>;
}

export class CoinGeckoMarketDataProvider implements CoinMarketDataProvider {
  source = "coingecko";

  async fetchCandidates() {
    const marketsUrl = new URL("/coins/markets", COINGECKO_API_BASE_URL);
    marketsUrl.searchParams.set("vs_currency", "usd");
    marketsUrl.searchParams.set("order", "market_cap_desc");
    marketsUrl.searchParams.set("per_page", "120");
    marketsUrl.searchParams.set("page", "1");
    marketsUrl.searchParams.set("sparkline", "false");
    marketsUrl.searchParams.set("price_change_percentage", "24h");

    const markets = coinMarketsResponseSchema.parse(
      await fetchJson(marketsUrl.toString()),
    );

    const candidates = markets.filter((coin) => coin.market_cap_rank !== null).slice(0, 100);
    const exchangeIdsByCoin = await mapWithConcurrency(
      candidates,
      5,
      async (coin) => {
        const tickersUrl = new URL(
          `/coins/${encodeURIComponent(coin.id)}/tickers`,
          COINGECKO_API_BASE_URL,
        );
        tickersUrl.searchParams.set("include_exchange_logo", "false");
        tickersUrl.searchParams.set("depth", "false");

        const tickers = coinTickersResponseSchema.parse(
          await fetchJson(tickersUrl.toString()),
        );

        const exchangeIds = new Set<string>();

        for (const ticker of tickers.tickers) {
          if (ticker.is_anomaly || ticker.is_stale) {
            continue;
          }

          if (ticker.trust_score && ticker.trust_score.toLowerCase() === "red") {
            continue;
          }

          if (majorExchangeIds.has(ticker.market.identifier)) {
            exchangeIds.add(ticker.market.identifier);
          }
        }

        return exchangeIds;
      },
    );

    return candidates.map((coin, index) => ({
      externalId: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      marketCapRank: coin.market_cap_rank,
      marketCapUsd: coin.market_cap ?? 0,
      volume24hUsd: coin.total_volume ?? 0,
      priceChange24hPct: coin.price_change_percentage_24h_in_currency,
      exchangeIds: Array.from(exchangeIdsByCoin[index]),
    }));
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "crypto-fantasy-platform/0.1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError({
      code: "COIN_MARKET_DATA_UNAVAILABLE",
      message: `Coin market data request failed with status ${response.status}.`,
      statusCode: 502,
      details: { url, status: response.status },
    });
  }

  return response.json();
}

async function mapWithConcurrency<TInput, TOutput>(
  input: TInput[],
  concurrency: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>,
) {
  const results: TOutput[] = new Array(input.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, input.length) }, async () => {
      while (cursor < input.length) {
        const currentIndex = cursor;
        cursor += 1;
        results[currentIndex] = await mapper(input[currentIndex], currentIndex);
      }
    }),
  );

  return results;
}
