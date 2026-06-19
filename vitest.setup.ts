import '@testing-library/jest-dom/vitest';
import * as dotenv from 'dotenv';
import { server } from './src/tests/msw/server';
import { beforeAll, afterEach, afterAll } from 'vitest';

dotenv.config({ path: '.env.local' });

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
