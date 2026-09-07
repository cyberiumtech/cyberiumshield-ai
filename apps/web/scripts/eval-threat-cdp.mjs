import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = process.argv[2];
fs.mkdirSync(outputDir, { recursive: true });

const authServer = http.createServer((request, response) => {
  console.error('AUTH_SERVER', request.method, request.url);
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.url === '/api/v1/users/me') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ id: 1, email: 'analyst@example.test', username: 'analyst', full_name: 'SOC Analyst', is_active: true, is_verified: true, roles: ['security_analyst'], created_at: '2026-01-01T00:00:00Z' }));
    return;
  }
  response.writeHead(404);
  response.end();
});
await new Promise((resolve, reject) => authServer.listen(8000, resolve).once('error', reject));

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-background-networking',
    '--remote-debugging-pipe',
    '--user-data-dir=' + path.join(outputDir, 'chrome-profile'),
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] }
);
chrome.stderr.setEncoding('utf8');
chrome.stderr.on('data', chunk => process.stderr.write(chunk));
chrome.on('exit', (code, signal) => process.stderr.write(`CHROME_EXIT code=${code} signal=${signal}\n`));

let nextId = 0;
let buffer = '';
let sessionId;
let feedMode = 'loaded';
const pending = new Map();

chrome.stdio[4].setEncoding('utf8');
chrome.stdio[4].on('data', chunk => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\0')) !== -1) {
    const raw = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (!raw) continue;
    const message = JSON.parse(raw);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    } else if (message.method === 'Fetch.requestPaused') {
      void handleRequest(message);
    } else if (['Runtime.exceptionThrown','Network.loadingFailed','Log.entryAdded'].includes(message.method)) {
      console.error('EVENT', message.method, JSON.stringify(message.params));
    }
  }
});

function send(method, params = {}, session = sessionId) {
  const id = ++nextId;
  const payload = { id, method, params };
  if (session) payload.sessionId = session;
  chrome.stdio[3].write(JSON.stringify(payload) + '\0');
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const records = [
  ['CVE-2026-1234','Microsoft','Windows Server','Improper privilege management permits local elevation','2026-09-04','A local attacker may obtain elevated privileges through improper access control.','Apply mitigations per vendor instructions or discontinue use of the product.','2026-09-11','Known','See https://example.gov/advisory/windows.',['CWE-269']],
  ['CVE-2026-1201','Cisco','Secure Firewall Management Center','Command injection vulnerability in management interface','2026-09-03','A crafted management request can execute commands with elevated privileges.','Apply vendor updates and restrict management access.','2026-09-17','Unknown','',['CWE-78']],
  ['CVE-2026-1198','Apple','iOS and iPadOS','Memory corruption in image processing component','2026-09-02','Processing malicious content may lead to arbitrary code execution.','Apply updates per vendor instructions.','2026-09-16','Known','See https://example.gov/advisory/apple.',['CWE-787']],
  ['CVE-2026-1177','Google Chromium','Chrome','Type confusion in V8 JavaScript engine','2026-08-29','A remote attacker may exploit type confusion through crafted web content.','Update to the latest stable channel.','2026-09-08','Unknown','',['CWE-843']],
  ['CVE-2026-1112','Ivanti','Endpoint Manager Mobile','Authentication bypass in administrative endpoint','2026-08-27','An unauthenticated attacker can bypass authentication on an exposed administrative endpoint.','Apply vendor mitigation and rotate credentials.','2026-09-06','Known','',['CWE-288']],
  ['CVE-2026-1040','Atlassian','Confluence Data Center and Server','Template injection permits remote code execution','2026-08-25','Improper template validation permits unauthenticated code execution.','Apply updates per vendor instructions.','2026-09-05','Unknown','',['CWE-1336']],
  ['CVE-2025-9988','Fortinet','FortiOS','Path traversal exposes sensitive configuration files','2026-08-20','A path traversal issue may expose sensitive system configuration.','Upgrade affected appliances and review exposure.','2026-09-03','Known','',['CWE-22']],
  ['CVE-2025-8871','Palo Alto Networks','PAN-OS','Improper input validation in GlobalProtect gateway','2026-08-15','A remote attacker may bypass intended input validation.','Apply vendor hotfix and monitor gateway logs.','2026-09-01','Unknown','',['CWE-20']],
  ['CVE-2025-7312','Oracle','WebLogic Server','Deserialization flaw permits remote code execution','2026-07-31','Unsafe deserialization permits arbitrary code execution.','Apply Critical Patch Update immediately.','2026-08-14','Known','',['CWE-502']],
  ['CVE-2025-6901','VMware','vCenter Server','Out-of-bounds write in service daemon','2026-07-22','A network attacker may trigger an out-of-bounds write.','Apply vendor patches and restrict access.','2026-08-12','Unknown','',['CWE-787']],
  ['CVE-2025-6188','SAP','NetWeaver Application Server','Missing authorization check in administrative service','2026-06-19','A missing authorization check permits administrative actions.','Apply security note and audit administrative actions.','2026-07-03','Unknown','',['CWE-862']],
  ['CVE-2025-5510','Progress','MOVEit Transfer','SQL injection in file transfer endpoint','2026-05-14','A crafted request can access or modify application data.','Apply the vendor patch and inspect transfer logs.','2026-05-28','Known','',['CWE-89']],
  ['CVE-2025-4990','Citrix','NetScaler ADC and NetScaler Gateway','Session validation weakness permits unauthorized access','2026-04-08','A session validation weakness permits unauthorized access.','Apply updates and terminate active sessions.','2026-04-22','Known','',['CWE-287']],
  ['CVE-2025-4012','Adobe','ColdFusion','Unrestricted file upload in administrative component','2026-03-11','An authenticated attacker may upload executable content.','Apply security update and review uploaded files.','2026-03-25','Unknown','',['CWE-434']],
  ['CVE-2025-3420','Microsoft','Exchange Server','Server-side request forgery in web services','2026-02-03','A remote attacker can induce requests to internal resources.','Apply security updates and review proxy logs.','2026-02-17','Known','',['CWE-918']],
  ['CVE-2025-2744','SonicWall','SMA 100 Series','OS command injection through appliance interface','2026-01-09','Improper neutralization of commands permits code execution.','Apply firmware update or remove the appliance from service.','2026-01-23','Unknown','',['CWE-78']],
].map(([cveID,vendorProject,product,vulnerabilityName,dateAdded,shortDescription,requiredAction,dueDate,knownRansomwareCampaignUse,notes,cwes]) => ({cveID,vendorProject,product,vulnerabilityName,dateAdded,shortDescription,requiredAction,dueDate,knownRansomwareCampaignUse,notes,cwes}));

const catalog = {
  title: 'CISA Catalog of Known Exploited Vulnerabilities',
  catalogVersion: '2026.09.04',
  dateReleased: '2026-09-04T15:30:00Z',
  count: records.length,
  vulnerabilities: records,
};

async function handleRequest(message) {
  const { requestId, request } = message.params;
  const url = request.url;
  if (url.includes('8000') || url.includes('known_exploited')) console.error('REQ', request.method, url);
  if (url.includes('/api/v1/users/me')) {
    await send('Fetch.continueRequest', { requestId }, message.sessionId);
  } else if (url.includes('known_exploited_vulnerabilities.json')) {
    if (feedMode === 'loaded') {
      const body = JSON.stringify(catalog);
      await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}], body: Buffer.from(body).toString('base64') }, message.sessionId);
    } else {
      await send('Fetch.fulfillRequest', { requestId, responseCode: 503, responsePhrase: 'Service Unavailable', responseHeaders: [{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}], body: Buffer.from('{"error":"unavailable"}').toString('base64') }, message.sessionId);
    }
  } else {
    await send('Fetch.continueRequest', { requestId }, message.sessionId);
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function evaluate(expression) {
  return send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
}

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
}

async function screenshot(name, full = false) {
  let params = { format: 'png', captureBeyondViewport: true, fromSurface: true };
  if (full) {
    const { contentSize } = await send('Page.getLayoutMetrics');
    params.clip = { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 };
  }
  const result = await send('Page.captureScreenshot', params);
  fs.writeFileSync(path.join(outputDir, name), Buffer.from(result.data, 'base64'));
}

try {
  await wait(800);
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, undefined);
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, undefined));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await setViewport(1440, 1000);
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await wait(1800);
  await evaluate("localStorage.setItem('access_token','evaluation-token'); localStorage.setItem('refresh_token','evaluation-refresh'); 'ok'");
  console.error('TOKEN', JSON.stringify((await evaluate("({origin:location.origin,token:localStorage.getItem('access_token')})")).result.value));
  await send('Page.navigate', { url: 'http://localhost:5173/threat-intelligence' });
  await wait(3500);
  await screenshot('desktop-top.png');
  await screenshot('desktop-full.png', true);
  const desktopInfo = await evaluate("({url:location.href,title:document.title,text:document.body.innerText.slice(0,3500),size:{w:innerWidth,h:innerHeight,scrollHeight:document.documentElement.scrollHeight},overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth})");
  fs.writeFileSync(path.join(outputDir, 'desktop-state.json'), JSON.stringify(desktopInfo.result.value, null, 2));
  await evaluate("document.querySelector('tbody button')?.click(); true");
  await wait(400);
  await screenshot('desktop-detail.png');
  await evaluate("document.querySelector('[aria-label=\"Close vulnerability details\"]')?.click(); window.scrollTo(0, Math.round(document.documentElement.scrollHeight*.52)); true");
  await wait(250);
  await screenshot('desktop-mid.png');

  await setViewport(768, 1000);
  await evaluate('window.scrollTo(0,0); true');
  await wait(500);
  await screenshot('tablet-top.png');
  await screenshot('tablet-full.png', true);
  const tabletInfo = await evaluate("({size:{w:innerWidth,h:innerHeight,scrollHeight:document.documentElement.scrollHeight},overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth})");
  fs.writeFileSync(path.join(outputDir, 'tablet-state.json'), JSON.stringify(tabletInfo.result.value, null, 2));

  await setViewport(375, 1000);
  await evaluate('window.scrollTo(0,0); true');
  await wait(500);
  await screenshot('mobile-top.png');
  await screenshot('mobile-full.png', true);
  const mobileInfo = await evaluate("({text:document.body.innerText.slice(0,2500),size:{w:innerWidth,h:innerHeight,scrollHeight:document.documentElement.scrollHeight},overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth})");
  fs.writeFileSync(path.join(outputDir, 'mobile-state.json'), JSON.stringify(mobileInfo.result.value, null, 2));
  await evaluate("window.scrollTo(0, Math.round(document.documentElement.scrollHeight*.48)); true");
  await wait(300);
  await screenshot('mobile-mid.png');
  await evaluate("document.querySelector('article button')?.click(); true");
  await wait(400);
  await screenshot('mobile-detail.png');
  await evaluate("document.querySelector('[aria-label=\"Close vulnerability details\"]')?.click(); true");

  feedMode = 'error';
  await setViewport(1440, 1000);
  await send('Page.reload', { ignoreCache: true });
  await wait(3500);
  await screenshot('desktop-error.png');
  const errorInfo = await evaluate("({text:document.body.innerText.slice(0,2500),size:{w:innerWidth,h:innerHeight,scrollHeight:document.documentElement.scrollHeight},overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth})");
  fs.writeFileSync(path.join(outputDir, 'error-state.json'), JSON.stringify(errorInfo.result.value, null, 2));

  console.log('CAPTURE_COMPLETE');
} finally {
  chrome.kill();
  authServer.close();
}
