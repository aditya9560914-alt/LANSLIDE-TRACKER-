
const API = "/api";
let map,markers=[],current=[];const $=id=>document.getElementById(id);
async function api(path,options={}){const r=await fetch(API+path,options);if(!r.ok){let t=await r.text();throw new Error(t||`HTTP ${r.status}`)}return r.json()}
function setStatus(ok){$("statusDot").style.background=ok?"#4ade80":"#fb7185";$("statusText").textContent=ok?"API + MySQL connected":"Backend unavailable"}
function showError(msg){$("errorBox").textContent=msg;$("errorBox").classList.remove("hidden")}

async function boot() {
    try {
        await api("/health");
        setStatus(true);

        // Initialize map BEFORE loading incident records
        if (!map) {
            initMap();
        }

        await Promise.all([
            loadStats(),
            loadStates(),
            loadReports(),
            loadAnalytics()
        ]);

    } catch (e) {
        console.error("Dashboard loading error:", e);
        setStatus(false);
        showError(
            "Data cannot be loaded. Check the backend and browser console."
        );
    }
}

async function loadStats(){const d=await api("/statistics");$("total").textContent=d.total_incidents;$("high").textContent=d.risk.High||0;$("medium").textContent=d.risk.Medium||0;$("low").textContent=d.risk.Low||0;$("active").textContent=d.status.Active||0;$("states").textContent=d.states_covered;$("districts").textContent=d.districts_covered}
async function loadStates(){const a=await api("/states");$("state").innerHTML='<option value="">All states</option>'+a.map(x=>`<option>${esc(x)}</option>`).join("")}
async function loadDistricts(){const q=$("state").value;const a=await api("/districts"+(q?"?state="+encodeURIComponent(q):""));$("district").innerHTML='<option value="">All districts</option>'+a.map(x=>`<option>${esc(x)}</option>`).join("")}
async function loadReports(){const p=new URLSearchParams();let f={search:"search",state:"state",district:"district",risk:"risk",status:"status"};Object.entries(f).forEach(([id,k])=>{if($(id).value)p.set(k,$(id).value)});const data=await api("/incidents?"+p);current=data;$("resultCount").textContent=`${data.length} records`;renderCards(data);renderMarkers(data)}
function renderCards(data){$("cards").innerHTML=data.length?data.map(x=>`<article class="incident card" onclick="details(${x.id})"><div class="incident-top"><span class="muted">LS-${String(x.id).padStart(4,"0")}</span><span class="badge ${esc(x.risk)}">${esc(x.risk)} Risk</span></div><h3>${esc(x.location)}</h3><div class="muted">${esc(x.district)}, ${esc(x.state)}</div><div class="meta"><div><small>DATE</small>${esc(x.incident_date)}</div><div><small>STATUS</small>${esc(x.status)}</div><div><small>AFFECTED</small>${Number(x.affected_people||0).toLocaleString()}</div><div><small>ROAD</small>${esc(x.road_status)}</div></div></article>`).join(""):'<div class="loading">No records found.</div>'}
function initMap(){map=L.map("map").setView([22.5,79],5);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map)}
function renderMarkers(data){if(!map)return;markers.forEach(m=>m.remove());markers=[];data.forEach(x=>{if(x.latitude==null||x.longitude==null)return;let c=x.risk==="High"?"#fb7185":x.risk==="Medium"?"#fbbf24":"#4ade80";let m=L.circleMarker([x.latitude,x.longitude],{radius:8,color:c,fillColor:c,fillOpacity:.85,weight:2}).addTo(map).bindPopup(`<b>${esc(x.location)}</b><br>${esc(x.district)}, ${esc(x.state)}<br>Risk: ${esc(x.risk)}<br>Date: ${esc(x.incident_date)}<br><button onclick="details(${x.id})">View details</button>`);markers.push(m)})}
async function loadAnalytics(){const d=await api("/analytics");let max=Math.max(...d.by_state.map(x=>x.count),1);$("stateChart").innerHTML=d.by_state.slice(0,10).map(x=>`<div class="bar"><div class="bar-label"><span>${esc(x.state)}</span><b>${x.count}</b></div><div class="bar-track"><div class="bar-fill" style="width:${x.count/max*100}%"></div></div></div>`).join("");let total=Object.values(d.by_risk).reduce((a,b)=>a+b,0)||1;$("riskChart").innerHTML=Object.entries(d.by_risk).map(([k,v])=>`<div class="bar"><div class="bar-label"><span>${k} Risk</span><b>${v}</b></div><div class="bar-track"><div class="bar-fill" style="width:${v/total*100}%"></div></div></div>`).join("")}
async function details(id){const x=await api("/incidents/"+id);$("modalBody").innerHTML=`<span class="eyebrow">INCIDENT LS-${String(x.id).padStart(4,"0")}</span><h2>${esc(x.location)}</h2><div class="muted">${esc(x.district)}, ${esc(x.state)}</div><div class="modal-grid">${Object.entries({Date:x.incident_date,Time:x.incident_time,Risk:x.risk,Status:x.status,Rainfall:x.rainfall+" mm","Affected area":x.affected_area+" ha","Affected people":x.affected_people,Road:x.road_status,Source:x.source}).map(([k,v])=>`<div><small>${k}</small><b>${esc(String(v??"—"))}</b></div>`).join("")}</div><p>${esc(x.description)}</p>`;$("modal").classList.remove("hidden")}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
["search","risk","status","district"].forEach(id=>$(id).addEventListener("input",loadReports));$("state").addEventListener("change",async()=>{await loadDistricts();loadReports()});$("refreshBtn").onclick=()=>boot();$("closeModal").onclick=()=>$("modal").classList.add("hidden");$("modal").onclick=e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")};
$("reportForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/incidents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:$("fState").value,district:$("fDistrict").value,location:$("fLocation").value,incident_date:$("fDate").value,description:$("fDescription").value})});e.target.reset();alert("Report submitted successfully.");await boot()}catch(err){alert("Report failed. Please check backend.")}});
boot();
