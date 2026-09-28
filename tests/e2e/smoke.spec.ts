import { expect, test, type Page } from '@playwright/test';

// Uses the seeded Mensah family and the local passcode "family-tree".
const PASSCODE = process.env.E2E_PASSCODE ?? 'family-tree';

async function enterPasscode(page: Page, passcode = PASSCODE) {
  await page.getByLabel('Family passcode').fill(passcode);
  await page.getByRole('button', { name: 'Enter' }).click();
}

test('passcode gate → tree → profile', async ({ page }) => {
  // Everything redirects to the passcode page first.
  await page.goto('/tree');
  await expect(page).toHaveURL(/\/passcode/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mensah');

  // A wrong passcode is refused with a friendly message.
  await enterPasscode(page, 'not-the-passcode');
  await expect(page.locator('#passcode-error')).toContainText('not right');

  // The right one lands back on the tree.
  await enterPasscode(page);
  await expect(page).toHaveURL(/\/tree/);
  const kwame = page.getByRole('button', { name: /^Opanyin Kwame Mensah\s*1898 – 1972/ });
  await expect(page.getByRole('button', { name: /^Nana Kwaku Boateng Mensah/ })).toBeVisible();

  // Choosing someone re-centres the tree on them (keyboard works too).
  await kwame.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/focus=kwame-mensah-1898/);
  await expect(page.getByRole('link', { name: /Profile/ })).toBeVisible();

  // Open their profile: both wives and their children are listed.
  await page.getByRole('link', { name: /Profile/ }).click();
  await expect(page).toHaveURL(/\/people\/kwame-mensah-1898$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Opanyin Kwame Mensah');
  await expect(page.getByText('Wife 1')).toBeVisible();
  await expect(page.getByText('Wife 2')).toBeVisible();
  await expect(page.getByRole('link', { name: /Akwasi Mensah/ })).toBeVisible();
  await expect(page.getByText('Death certificate of Kwame Mensah').first()).toBeVisible();
});

test('visitors do not see private details of living people', async ({ page }) => {
  await page.goto('/people/abena-mensah');
  await enterPasscode(page);
  await expect(page).toHaveURL(/\/people\/abena-mensah$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Abena Mensah');
  await expect(page.getByText(/is living, so their details are private/)).toBeVisible();
  // Birth year, other names and life events stay hidden.
  await expect(page.getByText('1941')).toHaveCount(0);
  await expect(page.getByText('Grandma Abena')).toHaveCount(0);
  await expect(page.getByText('Life events of living people are private.')).toBeVisible();
});

test('pages are marked noindex', async ({ page, request }) => {
  const res = await request.get('/passcode');
  expect(res.headers()['x-robots-tag']).toContain('noindex');
  await page.goto('/passcode');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toMatch(/Disallow: \//);
});
