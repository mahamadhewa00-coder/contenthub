import asyncio
from playwright.async_api import async_playwright
import os

async def capture_screenshot():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        path = os.path.abspath("index.html")
        await page.goto(f"file://{path}")
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(2)
        await page.screenshot(path="final_screenshot.png", full_page=True)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture_screenshot())
