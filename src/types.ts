export interface PythPrice {
  price: string | number;
  conf: string | number;
  expo: number;
  publish_time?: number;
  publishTime?: number;
}

export interface PythParsedPriceUpdate {
  id: string;
  price?: PythPrice;
  ema_price?: PythPrice;
  emaPrice?: PythPrice;
  metadata?: Record<string, unknown>;
}

export interface PythPriceFeedAttributes {
  asset_type?: string;
  base?: string;
  quote_currency?: string;
  quoteCurrency?: string;
  symbol?: string;
  description?: string;
}

export interface PythPriceFeed {
  id: string;
  attributes?: PythPriceFeedAttributes;
}

export interface PythPriceUpdateResponse {
  binary?: {
    data?: string[];
    encoding?: string;
  };
  parsed?: PythParsedPriceUpdate[];
}

export interface PythClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
}

export interface PythConfig {
  baseUrl: string;
  timeoutMs: number;
  retries: number;
}
