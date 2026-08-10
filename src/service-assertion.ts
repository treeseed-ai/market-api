import { createHmac, randomUUID } from 'node:crypto';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

export function createAudienceBoundAssertion(secret: string, audience: string, now = () => Date.now()) {
	if (!secret) throw new Error('Market service assertion secret is required.');
	return (request: Request) => {
		const issuedAt = Math.floor(now() / 1000);
		const requestId = request.headers.get('x-request-id') ?? randomUUID();
		const header = encode({ alg: 'HS256', typ: 'JWT' });
		const payload = encode({ aud: audience, iss: 'market-api', iat: issuedAt, exp: issuedAt + 30, method: request.method, path: new URL(request.url).pathname, requestId });
		const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
		return `${header}.${payload}.${signature}`;
	};
}
