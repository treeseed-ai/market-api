import { createAdminPassthroughHandler, createGatewayHealthHandlers } from '@treeseed/sdk';
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
		if (path === '/v1/market/status') return Response.json({ ok: true, service: 'market-api', adminDescriptor: 'sha256:a1db527487273f6a531551cfdc6d1be2ae84353a9e0dc37391729983c98a2090' });
		if (path.startsWith('/v1/market/')) return options.marketHandler ? options.marketHandler(request) : Response.json({ error: 'market-route-not-found' }, { status: 404 });
		if (path.startsWith('/v1/')) return admin(request);
		return Response.json({ error: 'not-found' }, { status: 404 });
	};
}
