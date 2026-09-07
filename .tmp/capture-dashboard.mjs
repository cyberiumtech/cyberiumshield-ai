import { writeFileSync } from 'node:fs';

const [targetUrl, outputPath, widthText] = process.argv.slice(2);
const width = Number(widthText);
const pages = await fetch('http://127.0.0.1:9333/json').then(response => response.json());
const page = pages.find(item => item.type === 'page');
if (!page) throw new Error('No Chrome page target found.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result);
});

const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await command('Page.enable');
await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
await command('Page.navigate', { url: targetUrl });
await new Promise(resolve => setTimeout(resolve, 6000));
const metrics = await command('Runtime.evaluate', {
  expression: 'JSON.stringify({innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})',
  returnByValue: true,
});
const sizes = JSON.parse(metrics.result.value);
await command('Emulation.setDeviceMetricsOverride', { width, height: Math.min(sizes.scrollHeight, 6000), deviceScaleFactor: 1, mobile: width < 600 });
await new Promise(resolve => setTimeout(resolve, 500));
const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
writeFileSync(outputPath, Buffer.from(shot.data, 'base64'));
console.log(JSON.stringify(sizes));
socket.close();
