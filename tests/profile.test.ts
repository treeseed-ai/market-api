import { describe, expect, it, vi } from 'vitest';
import { createMarketGateway } from '../src/gateway.js';

const checks = { 'market-database': async () => true, 'admin-api': async () => true, 'internal-auth': async () => true, 'provider-bindings': async () => true };

describe('singleton Market profile', () => {
	it('owns the canonical profile route without contacting Admin', async () => {
		const fetchImpl = vi.fn(async () => Response.json({ admin: true }));
		const gateway = createMarketGateway({ adminBaseUrl: 'http://admin.internal', checks, fetchImpl });
		const response = await gateway(new Request('https://api.treeseed.dev/v1/market/profile'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true, payload: { id: 'central', label: 'TreeSeed Central Market', baseUrl: 'https://api.treeseed.dev', kind: 'central', alwaysAvailable: true } });
		expect(fetchImpl).not.toHaveBeenCalled();
		expect((await gateway(new Request('https://api.treeseed.dev/v1/market/profile', { method: 'POST' }))).status).toBe(405);
	});
});
