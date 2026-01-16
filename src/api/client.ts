import axios, { type AxiosError, type AxiosInstance } from "axios";
import type {
  PythClientOptions,
  PythPriceFeed,
  PythPriceFeedAttributes,
  PythPriceUpdateResponse,
} from "../types";
import { normalizeFeedId } from "../utils/prices";
import { PYTH_ENDPOINTS } from "./endpoints";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: AxiosError): boolean => {
  if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
    return true;
  }
  const status = error.response?.status;
  if (!status) {
    return true;
  }
  return status === 429 || (status >= 500 && status < 600);
};

const isHexFeedId = (value: string): boolean => /^0x?[0-9a-fA-F]{64}$/.test(value.trim());

const normalizeSymbol = (value: string): string => value.trim().toLowerCase();

const quoteFromAttributes = (attributes: PythPriceFeedAttributes | undefined): string | null => {
  if (!attributes) {
    return null;
  }
  return attributes.quote_currency ?? attributes.quoteCurrency ?? null;
};

export class PythClient {
  private readonly http: AxiosInstance;
  private readonly retries: number;
  private priceFeedsCache: PythPriceFeed[] | null = null;
  private feedIndex: Map<string, PythPriceFeed> | null = null;

  constructor(options: PythClientOptions & { http?: AxiosInstance } = {}) {
    this.retries = options.retries ?? 2;
    this.http =
      options.http ??
      axios.create({
        baseURL: options.baseUrl ?? "https://hermes.pyth.network",
        timeout: options.timeoutMs ?? 10_000,
      });
  }

  private async request<T>(
    path: string,
    params?: Record<string, string | number | string[]>,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.http.get<T>(path, { params });
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        lastError = axiosError;
        if (attempt < this.retries && isRetryableError(axiosError)) {
          await sleep(200 * 2 ** attempt);
          continue;
        }
        throw axiosError;
      }
    }
    throw lastError;
  }

  async getPriceFeeds(query?: string): Promise<PythPriceFeed[]> {
    const params = query ? { query } : undefined;
    const feeds = await this.request<PythPriceFeed[]>(PYTH_ENDPOINTS.priceFeeds, params);
    if (!query) {
      this.cachePriceFeeds(feeds);
    }
    return feeds;
  }

  async resolvePriceFeedId(input: string): Promise<string> {
    if (isHexFeedId(input)) {
      return input.trim();
    }
    const feed = await this.getPriceFeedBySymbol(input);
    return feed?.id ?? input;
  }

  async getLatestPriceUpdates(ids: string[]): Promise<PythPriceUpdateResponse> {
    if (!ids.length) {
      return { parsed: [] };
    }
    return this.request<PythPriceUpdateResponse>(PYTH_ENDPOINTS.latestPriceUpdates, { ids });
  }

  async getLatestPriceUpdate(id: string): Promise<PythPriceUpdateResponse> {
    return this.getLatestPriceUpdates([id]);
  }

  private async getPriceFeedBySymbol(input: string): Promise<PythPriceFeed | null> {
    if (!this.feedIndex) {
      await this.getPriceFeeds();
    }
    const key = normalizeSymbol(input);
    return this.feedIndex?.get(key) ?? null;
  }

  private cachePriceFeeds(feeds: PythPriceFeed[]) {
    this.priceFeedsCache = feeds;
    this.feedIndex = new Map();

    for (const feed of feeds) {
      const idKey = normalizeFeedId(feed.id);
      this.feedIndex.set(idKey, feed);

      const attributes = feed.attributes;
      const symbol = attributes?.symbol;
      if (symbol) {
        this.feedIndex.set(normalizeSymbol(symbol), feed);
      }

      const base = attributes?.base;
      const quote = quoteFromAttributes(attributes);
      if (base && quote) {
        this.feedIndex.set(normalizeSymbol(`${base}/${quote}`), feed);
      }

      const description = attributes?.description;
      if (description) {
        this.feedIndex.set(normalizeSymbol(description), feed);
      }
    }
  }
}

export const createPythClient = (options: PythClientOptions): PythClient => {
  return new PythClient(options);
};
