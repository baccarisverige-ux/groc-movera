import { expect, test } from '@playwright/test'

/* Movera used to be served under /Movera-host1/, and basePath.js still lists it
   in COMPAT_BASE_PATHS so old links keep resolving. Six e2e specs used to drive
   the whole suite through that dead prefix, which meant most of the app was
   verified under a base path production no longer uses — /groc-movera/ could
   have broken without them noticing.

   Those specs now use the production base. This is the one place that still
   covers the legacy prefix, so the compatibility promise stays tested on
   purpose rather than by accident. */

test('links under the retired /Movera-host1/ base still resolve', async ({ page }) => {
  await page.goto('/Movera-host1/profile')
  await expect(page.getByTestId('page-profile')).toBeVisible()
})

test('the retired base resolves the Map route too', async ({ page }) => {
  await page.goto('/Movera-host1/map')
  await expect(page.getByTestId('page-map')).toBeVisible()
})
