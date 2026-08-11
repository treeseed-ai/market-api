import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createMarketGateway, type MarketHandler } from './gateway.js';
import { createAudienceBoundAssertion } from './service-assertion.js';

const adminBaseUrl = process.env.TREESEED_ADMIN_API_INTERNAL_URL ?? '';
if (!adminBaseUrl) throw new Error('TREESEED_ADMIN_API_INTERNAL_URL is required.');
const assertionSecret = process.env.TREESEED_MARKET_SERVICE_ASSERTION_SECRET ?? '';
const checkUrl = async (url: string) => { try { return (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok; } catch { return false; } };
const applicationModulePath = './market/app.js';
const application = await import(applicationModulePath) as { createMarketHandler: () => MarketHandler };
const gateway = createMarketGateway({
	adminBaseUrl,
	marketHandler: application.createMarketHandler(),
	serviceAssertion: createAudienceBoundAssertion(assertionSecret, adminBaseUrl),
	checks: {
		'market-database': async () => Boolean(process.env.TREESEED_MARKET_DATABASE_URL),
		'admin-api': async () => checkUrl(`${adminBaseUrl.replace(/\/$/u, '')}/healthz`),
		'internal-auth': async () => Boolean(assertionSecret),
		'provider-bindings': async () => process.env.TREESEED_PROVIDER_BINDINGS_READY === 'true',
	},
});

const server = createServer(async (incoming, outgoing) => {
	const origin = `http://${incoming.headers.host ?? '127.0.0.1'}`;
	const body = incoming.method === 'GET' || incoming.method === 'HEAD' ? undefined : Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
	const response = await gateway(new Request(new URL(incoming.url ?? '/', origin), { method: incoming.method, headers: incoming.headers as HeadersInit, body, duplex: body ? 'half' : undefined } as RequestInit & { duplex?: 'half' }));
	outgoing.statusCode = response.status;
	for (const [name, value] of response.headers) outgoing.setHeader(name, value);
	if (!response.body) return outgoing.end();
	Readable.fromWeb(response.body as never).pipe(outgoing);
});
server.listen(Number(process.env.PORT ?? 3000));
