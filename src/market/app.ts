import type { MarketHandler } from '../gateway.js';

export function createMarketHandler(): MarketHandler {
	return async () => Response.json({ error: 'market-route-not-implemented' }, { status: 501 });
}
