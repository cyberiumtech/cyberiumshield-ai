import fs from 'node:fs/promises';

const endpoint = 'http://127.0.0.1:9224';
const outDir = 'C:/Users/ACER/AppData/Local/Temp/threat-intel-ls5ecjek.wtb';
const pageUrl = 'http://127.0.0.1:5173/threat-intelligence';

const pages = await fetch(`${endpoint}/json/list`).then(response => response.json());
const page = pages.find(item => item.type === 'page');
if (!page) throw new Error('No debuggable page found');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const events = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  } else if (message.method) {
    events.push(message);
  }
});

function send(method, params = {}) {
  const id = ++sequence;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression, awaitPromise = true) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function sleep(milliseconds) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForText(text, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(`document.body?.innerText.includes(${JSON.stringify(text)})`)) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${text}`);
}

async function screenshot(name, fullPage = false) {
  let params = { format: 'png', fromSurface: true, captureBeyondViewport: true };
  if (fullPage) {
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize;
    params = {
      ...params,
      clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 },
    };
  }
  const { data } = await send('Page.captureScreenshot', params);
  await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(data, 'base64'));
}

async function clickText(text, selector = 'button') {
  return evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find(node => node.textContent.trim().includes(${JSON.stringify(text)}));
    if (!el) return false;
    el.click();
    return true;
  })()`);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Page.navigate', { url: pageUrl });
await waitForText('Threat intelligence');
await evaluate('document.fonts.ready');
await sleep(1200);

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, scale: 1 },
  { name: 'tablet', width: 768, height: 1024, scale: 1 },
  { name: 'mobile', width: 375, height: 812, scale: 1 },
];

const audit = {};
for (const viewport of viewports) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale,
    mobile: viewport.width <= 375,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
  await evaluate('window.scrollTo(0, 0)');
  await sleep(500);
  const dimensions = await evaluate(`({
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    bodyText: document.body.innerText,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    clipped: [...document.querySelectorAll('*')].filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > innerWidth + 1 || rect.right > innerWidth + 1 || rect.left < -1;
    }).slice(0, 20).map(el => ({tag: el.tagName, text: el.textContent?.trim().slice(0, 80), rect: el.getBoundingClientRect().toJSON()}))
  })`);
  audit[viewport.name] = dimensions;
  await screenshot(`${viewport.name}-investigations-top`);
  const maxScroll = Math.max(0, dimensions.scrollHeight - viewport.height);
  for (const ratio of [0.25, 0.5, 0.75, 1]) {
    await evaluate(`window.scrollTo(0, ${Math.round(maxScroll * ratio)})`);
    await sleep(150);
  }
  await screenshot(`${viewport.name}-investigations-full`, true);
}

await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
  screenWidth: 1440,
  screenHeight: 1000,
});
await evaluate('window.scrollTo(0, 0)');
await clickText('CISA KEV catalog');
await waitForText('CISA KEV evidence');
await sleep(800);
audit.catalog = await evaluate(`({
  scrollHeight: document.documentElement.scrollHeight,
  text: document.body.innerText,
  buttons: [...document.querySelectorAll('button')].map(button => button.textContent.trim()).filter(Boolean),
  links: [...document.querySelectorAll('a')].map(a => ({ text: a.textContent.trim(), href: a.href })).filter(a => a.text)
})`);
await screenshot('desktop-catalog-top');
await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
await sleep(300);
await screenshot('desktop-catalog-full', true);

const detailOpened = await evaluate(`(() => {
  const candidates = [...document.querySelectorAll('button')];
  const el = candidates.find(button => /^CVE-\\d{4}-\\d+/.test(button.textContent.trim())) ||
    candidates.find(button => button.textContent.trim() === 'Inspect record');
  if (!el) return false;
  el.click();
  return true;
})()`);
if (detailOpened) {
  await waitForText('CISA KEV record');
  await sleep(300);
  await screenshot('desktop-catalog-detail');
  audit.detail = await evaluate(`({
    title: document.querySelector('[role="dialog"] h2')?.textContent,
    text: document.querySelector('[role="dialog"]')?.innerText,
    dialogWidth: document.querySelector('[role="dialog"]')?.getBoundingClientRect().width
  })`);
  await evaluate(`document.querySelector('[aria-label="Close vulnerability details"]')?.click()`);
}

await clickText('IOC investigations');
await waitForText('Investigate an indicator');
await sleep(300);
audit.controls = await evaluate(`(() => {
  const input = document.querySelector('#threat-indicator');
  const button = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Run investigation'));
  const before = button ? getComputedStyle(button) : null;
  if (button) button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  return {
    input: input ? { placeholder: input.getAttribute('placeholder'), width: input.getBoundingClientRect().width } : null,
    button: button ? { disabled: button.disabled, background: before.backgroundColor, border: before.borderColor } : null,
    text: document.body.innerText,
  };
})()`);

audit.console = events
  .filter(event => event.method === 'Log.entryAdded' || event.method === 'Runtime.exceptionThrown')
  .map(event => event.params);

await fs.writeFile(`${outDir}/browser-audit.json`, JSON.stringify(audit, null, 2));
ws.close();
console.log(JSON.stringify({ screenshots: viewports.length * 2 + 3, detailOpened, audit: `${outDir}/browser-audit.json` }, null, 2));
