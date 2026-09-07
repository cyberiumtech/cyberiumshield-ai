const $ = id => document.getElementById(id);
let latest = [];

function fmt(n){
  if(n < 1024) return `${n} B/s`;
  if(n < 1024**2) return `${(n/1024).toFixed(1)} KB/s`;
  if(n < 1024**3) return `${(n/1024**1024).toFixed(1)} MB/s`;
  return `${(n/1024**1024**1024).toFixed(1)} GB/s`;
}
function render(){
  const q = $("filter").value.toLowerCase();
  const rows = latest.filter(x => JSON.stringify(x).toLowerCase().includes(q));
  $("table").innerHTML = rows.map(x => `<tr>
    <td>${esc(x.process)}</td><td>${esc(x.pid)}</td><td>${esc(x.protocol)}</td>
    <td>${esc(x.local_address)}</td><td>${esc(x.remote_address)}</td><td>${esc(x.status)}</td>
  </tr>`).join("");
}
function esc(v){return String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
async function refresh(){
  try{
    const r=await fetch("/api/status",{cache:"no-store"}); const d=await r.json();
    $("status").textContent=d.monitoring?"Monitoring":"Stopped";
    $("connections").textContent=d.connection_count;
    $("tcp").textContent=d.tcp; $("udp").textContent=d.udp;
    $("upload").textContent=fmt(d.upload_bps); $("download").textContent=fmt(d.download_bps);
    $("updated").textContent=d.updated;
    latest=d.connections; render();
    $("interfaces").innerHTML=d.interfaces.map(i=>`<div class="iface">
      <div class="${i.is_up?'up':'down'}">${esc(i.name)} — ${i.is_up?'UP':'DOWN'}</div>
      <small>Sent: ${fmt(i.bytes_sent)} total · Received: ${fmt(i.bytes_recv)} total</small>
    </div>`).join("");
  }catch(e){$("status").textContent="Offline";}
}
async function post(url){await fetch(url,{method:"POST"});refresh();}
$("start").onclick=()=>post("/api/start"); $("stop").onclick=()=>post("/api/stop");
$("filter").oninput=render; refresh(); setInterval(refresh,2000);
