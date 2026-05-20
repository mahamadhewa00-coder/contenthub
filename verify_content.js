const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080');

  // Wait for the content to be rendered
  await page.waitForSelector('.content-card', { timeout: 5000 }).catch(e => console.log('Content card not found'));

  // Scroll down a bit
  await page.mouse.wheel(0, 500);

  await page.screenshot({ path: '/home/jules/verification/content_view.png', fullPage: true });

  const cardsCount = await page.locator('.content-card').count();
  console.log('Cards found:', cardsCount);

  const commentText = await page.locator('.card-comments').textContent().catch(() => 'No comment found');
  console.log('Comment text:', commentText.trim());

  await browser.close();
})();
