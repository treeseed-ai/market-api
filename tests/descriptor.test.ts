import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const descriptor = JSON.parse(readFileSync(resolve(import.meta.dirname, '../artifacts/admin-api-descriptor.json'), 'utf8'));
const deployment = JSON.parse(readFileSync(resolve(import.meta.dirname, '../singleton.manifest.json'), 'utf8'));

describe('Admin route descriptor pin', () => {
	it('pins the exact Admin image ref and exposes a disjoint route union', () => {
		expect(descriptor.sourceRef).toBe(deployment.adminApiRef);
		expect(descriptor.routeCount).toBe(descriptor.routes.length);
		expect(descriptor.routes.every((route: { path: string }) => !route.path.startsWith('/v1/market/'))).toBe(true);
		const digest = createHash('sha256').update(JSON.stringify(descriptor.routes)).digest('hex');
		expect(`sha256:${digest}`).toBe(descriptor.digest);
		expect(descriptor.digest).toBe(deployment.adminDescriptorDigest);
	});
});
