import { createAdminPassthroughHandler, createGatewayHealthHandlers } from '@treeseed/sdk/market-gateway';
import descriptor from '../artifacts/admin-api-descriptor.json' with { type: 'json' };

export type MarketHandler = (request: Request) => Promise<Response> | Response;
export type DependencyChecks = Parameters<typeof createGatewayHealthHandlers>[0]['checks'];

export function createMarketGateway(options: { adminBaseUrl: string; checks: DependencyChecks; marketHandler?: MarketHandler; serviceAssertion?: (request: Request) => Promise<string | null> | string | null; fetchImpl?: typeof fetch }) {
	const health = createGatewayHealthHandlers({ checks: options.checks });
	const admin = createAdminPassthroughHandler({ adminBaseUrl: options.adminBaseUrl, adminRoutes: descriptor.routes, fetchImpl: options.fetchImpl, serviceAssertion: options.serviceAssertion });
	return async (request: Request) => {
		const path = new URL(request.url).pathname;
		if (path === '/healthz') return health.process();
		if (path === '/healthz/deep') return health.deep();
		if (path === '/readyz') return health.ready();
		if (path === '/v1/market/status') return Response.json({ ok: true, service: 'market-api', adminDescriptor: 'sha256:810cccc26feaf12fe437e102274b78878d4a420325c666b418ed297bcdca3f8e' });
		if (path === '/v1/market/profile') return request.method === 'GET'
			? Response.json({ ok: true, payload: { id: 'central', label: 'TreeSeed Central Market', baseUrl: 'https://api.treeseed.dev', kind: 'central', alwaysAvailable: true } })
			: Response.json({ error: 'method-not-allowed' }, { status: 405, headers: { allow: 'GET' } });
		if (path.startsWith('/v1/market/')) return options.marketHandler ? options.marketHandler(request) : Response.json({ error: 'market-route-not-found' }, { status: 404 });
		if (path.startsWith('/v1/')) return admin(request);
		return Response.json({ error: 'not-found' }, { status: 404 });
	};
}
