import { describe, expect, it, vi } from 'vitest';
import { createMarketGateway } from '../src/gateway.ts';
import { createAudienceBoundAssertion } from '../src/service-assertion.ts';

const checks = { 'market-database': async () => true, 'admin-api': async () => true, 'internal-auth': async () => true, 'provider-bindings': async () => true };

describe('singleton Market gateway', () => {
	it('owns Market routes and passes every other v1 route to Admin', async () => {
		const fetchImpl = vi.fn(async () => Response.json({ admin: true }, { status: 202 }));
		const gateway = createMarketGateway({ adminBaseUrl: 'http://admin.internal', checks, fetchImpl });
		expect((await gateway(new Request('https://api.treeseed.dev/v1/market/status'))).status).toBe(200);
		const response = await gateway(new Request('https://api.treeseed.dev/v1/projects?id=one'));
		expect(response.status).toBe(202);
		expect(fetchImpl).toHaveBeenCalledWith('http://admin.internal/v1/projects?id=one', expect.anything());
	});

	it('fails readiness when hosted Admin is unavailable while process health remains available', async () => {
		const gateway = createMarketGateway({ adminBaseUrl: 'http://admin.internal', checks: { ...checks, 'admin-api': async () => false } });
		expect((await gateway(new Request('https://api.treeseed.dev/healthz'))).status).toBe(200);
		expect((await gateway(new Request('https://api.treeseed.dev/healthz/deep'))).status).toBe(503);
		expect((await gateway(new Request('https://api.treeseed.dev/readyz'))).status).toBe(503);
	});

	it('creates short-lived audience-bound service assertions', () => {
		const assertion = createAudienceBoundAssertion('secret', 'http://admin.internal', () => 1000)(new Request('https://api.treeseed.dev/v1/projects', { headers: { 'x-request-id': 'request-1' } }));
		const payload = JSON.parse(Buffer.from(assertion.split('.')[1]!, 'base64url').toString());
		expect(payload).toMatchObject({ aud: 'http://admin.internal', method: 'GET', path: '/v1/projects', requestId: 'request-1', exp: 31 });
	});
});
