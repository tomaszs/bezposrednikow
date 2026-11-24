import puppeteer from 'puppeteer';

const companies = [
  { name: 'Devapo', id: '1074020902' },
  { name: 'Mindbox', id: '1074221283' },
  { name: 'ITDS', id: '20270956' },
];

const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });

for (const c of companies) {
  const page = await browser.newPage();
  await page.goto(`https://pracodawcy.pracuj.pl/company/${c.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const lines = document.body.innerText.split('\n').map((l) => l.trim()).filter(Boolean);
    const interesting = lines.filter((l) =>
      /agenc|rekrut|pośredn|outsourcing|body leasing|consulting|IT services|usługi/i.test(l),
    );

    return { title: document.title, interesting: interesting.slice(0, 25) };
  });

  console.log(c.name, JSON.stringify(info, null, 2));
  await page.close();
}

await browser.close();
