import { AnalyticsEngineDataset } from '@cloudflare/workers-types';
import { Hono } from 'hono'
export type Bindings = {
    VECTORIZE_SESSIONS_INDEX: VectorizeIndex;
    VECTORIZE_GENERAL_INDEX: VectorizeIndex
    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_API_TOKEN: string;
    OPENAI_API_KEY: string;
    AI: Fetcher;
    ANALYTICS_ENGINE: AnalyticsEngineDataset
}

export const createHonoApp = () => {
    return new Hono<{
        Bindings: Bindings;
    }>()
}