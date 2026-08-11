import { describe, expect, it, vi } from 'vitest';
import descriptor from '../artifacts/admin-api-descriptor.json' with { type: 'json' };
import { createMarketGateway } from '../src/gateway.js';
import { createAudienceBoundAssertion } from '../src/service-assertion.js';

const checks = { 'market-database': async () => true, 'admin-api': async () => true, 'internal-auth': async () => true, 'provider-bindings': async () => true };
const concretePath = (path: string) => path.replace(/:[^/]+/gu, 'fixture');

describe('singleton Market gateway', () => {
	it('owns Market routes and passes every declared Admin method and path through exactly', async () => {
		const fetchImpl = vi.fn(async () => Response.json({ admin: true }, { status: 202 }));
		const gateway = createMarketGateway({ adminBaseUrl: 'http://admin.internal', checks, fetchImpl });
		expect((await gateway(new Request('https://api.treeseed.dev/v1/market/status'))).status).toBe(200);
		for (const route of descriptor.routes) {
			const response = await gateway(new Request(`https://api.treeseed.dev${concretePath(route.path)}?inventory=true`, { method: route.method }));
			expect(response.status, `${route.method} ${route.path}`).toBe(202);
		}
		expect(fetchImpl).toHaveBeenCalledTimes(descriptor.routeCount);
	});

	it('rejects undeclared paths, method mismatches, and Admin shadowing of Market', async () => {
		const fetchImpl = vi.fn(async () => Response.json({ admin: true }));
		const gateway = createMarketGateway({ adminBaseUrl: 'http://admin.internal', checks, fetchImpl });
		const route = descriptor.routes[0]!;
		const methods = new Set(descriptor.routes.filter((candidate) => candidate.path === route.path).map((candidate) => candidate.method));
		const mismatched = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].find((method) => !methods.has(method))!;
		expect((await gateway(new Request('https://api.treeseed.dev/v1/not-declared'))).status).toBe(404);
		expect((await gateway(new Request(`https://api.treeseed.dev${concretePath(route.path)}`, { method: mismatched }))).status).toBe(404);
		expect((await gateway(new Request('https://api.treeseed.dev/v1/market/not-declared'))).status).toBe(404);
		expect(fetchImpl).not.toHaveBeenCalled();
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
