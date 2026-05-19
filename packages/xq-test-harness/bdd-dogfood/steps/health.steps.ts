import { When, Then, expect, type XQFixture } from '@chauhaidang/xq-test-harness';
import type { APIResponse } from '@playwright/test';

let lastResponse: APIResponse | undefined;

When('I request the health endpoint', async ({  request }) => {
  
  lastResponse = await request.get('/health');
});

Then('the response is OK', async () => {
  expect(lastResponse?.status()).toBe(200);
});
