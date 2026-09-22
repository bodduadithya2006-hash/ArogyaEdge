import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const COMP_INFO = {
  esp32: { title:'ESP32-S3', desc:'Dual-core MCU with Wi-Fi/BLE. Runs TinyML models for heat stress & fall detection on-device. Main brain of ArogyaEdge.', tag:'MCU + Edge AI · ₹150–300', color:'#1a1a1a' },
  max30102: { title:'MAX30102 PPG', desc:'Optical heart-rate and SpO₂ sensor. Red/IR LEDs + photodiode under the glass window on the underside of the band.', tag:'HR + SpO₂ · ₹150–250', color:'#6b1515' },
  mpu: { title:'MPU6050 IMU', desc:'6-axis accelerometer + gyroscope. Feeds the fall-detection TinyML model and activity tracking.', tag:'Fall + Activity · ₹80–120', color:'#1a3a6e' },
  temp: { title:'Temp Sensor', desc:'Skin temperature (MLX90614 IR or DS18B20). Combined with ambient data for personalized heat-stress scoring.', tag:'Skin temperature · ₹100–200', color:'#c0c4c8' },
  amb: { title:'Ambient T/H', desc:'Ambient temperature and humidity (DHT22 / SHT30). Critical for heat-index style risk in Indian outdoor conditions.', tag:'Environment · ₹80–150', color:'#2a2a2a' },
  battery: { title:'Li-Po Battery', desc:'400–600 mAh cell sized for continuous sensing + occasional BLE + haptic. Target multi-day life with power management.', tag:'400–600 mAh · ₹120–180', color:'#333' },
  motor: { title:'Coin Motor', desc:'Haptic vibration motor for real-time alerts (heat, fall, dehydration) even when the user is not looking at the screen.', tag:'Haptic alerts · ₹30', color:'#c0c4c8' },
  pcb: { title:'Main PCB', desc:'Custom board hosting ESP32-S3, sensors, power management and connectors. Designed for compact wrist form-factor.', tag:'Core board', color:'#0d5c2e' },
  body: { title:'Enclosure + Strap', desc:'3D-printed case with silicone strap. Designed for outdoor workers — dust, sweat, heat.', tag:'Custom · ₹90–140', color:'#1e1e1e' }
};

const state = {
  hr:78, spo2:98, skinTemp:34.1, ambient:32.4, risk:12, battery:87,
  offline:false, mode:'A', monitoring:false, exploded:false, autoSpin:true,
  hrHist:[], spo2Hist:[]
};
const riskLevels = [
  { max:25, color:'#27ae60', label:'LOW RISK', hint:'Within personal baseline' },
  { max:50, color:'#f39c12', label:'MODERATE', hint:'Elevated — monitor closely' },
  { max:75, color:'#e67e22', label:'HIGH', hint:'Act now: rest & hydrate' },
  { max:100, color:'#e74c3c', label:'CRITICAL', hint:'SOS / medical attention' }
];

const wrap = document.getElementById('canvas-wrap');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe4ebf3);
const camera = new THREE.PerspectiveCamera(38, wrap.clientWidth/wrap.clientHeight, 0.01, 50);
camera.position.set(0.14, 0.1, 0.18);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(wrap.clientWidth, wrap.clientHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
wrap.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(wrap.clientWidth, wrap.clientHeight);
labelRenderer.domElement.style.cssText = 'position:absolute;top:0;pointer-events:none';
wrap.appendChild(labelRenderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 0.1; controls.maxDistance = 0.42; controls.target.set(0, 0.002, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(0.4, 0.6, 0.35); key.castShadow = true;
key.shadow.mapSize.set(2048,2048); key.shadow.camera.near=0.05; key.shadow.camera.far=2;
key.shadow.camera.left=key.shadow.camera.bottom=-0.3; key.shadow.camera.right=key.shadow.camera.top=0.3;
scene.add(key);
scene.add(new THREE.DirectionalLight(0xb0c8ff, 0.4).position.set(-0.4, 0.25, -0.3));
scene.add(new THREE.DirectionalLight(0xfff5e8, 0.35).position.set(0.15, -0.15, 0.4));
scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c8dc, 0.45));

const matBody = new THREE.MeshStandardMaterial({ color:0x1c1c1c, roughness:0.4, metalness:0.2 });
const matTeal = new THREE.MeshStandardMaterial({ color:0x00a896, roughness:0.22, metalness:0.5 });
const matStrap = new THREE.MeshStandardMaterial({ color:0x252525, roughness:0.9, metalness:0 });
const matPCB = new THREE.MeshStandardMaterial({ color:0x0d5c2e, roughness:0.5, metalness:0.15 });
const matChip = new THREE.MeshStandardMaterial({ color:0x151515, roughness:0.32, metalness:0.3 });
const matGold = new THREE.MeshStandardMaterial({ color:0xc9a84c, roughness:0.28, metalness:0.88 });
const matBattery = new THREE.MeshStandardMaterial({ color:0x2e2e2e, roughness:0.38, metalness:0.35 });
const matSilver = new THREE.MeshStandardMaterial({ color:0xc2c6ca, roughness:0.2, metalness:0.9 });
const matRed = new THREE.MeshStandardMaterial({ color:0x6b1515, roughness:0.32, metalness:0.42 });
const matBlue = new THREE.MeshStandardMaterial({ color:0x1a3a6e, roughness:0.38, metalness:0.35 });
const matGlass = new THREE.MeshPhysicalMaterial({ color:0xffffff, roughness:0.06, metalness:0, transmission:0.85, thickness:0.002, transparent:true, opacity:0.72 });

const device = new THREE.Group(); scene.add(device);
const outer = new THREE.Group(), internals = new THREE.Group(), strapG = new THREE.Group();
device.add(outer, internals, strapG);

const body = new THREE.Mesh(new RoundedBoxGeometry(0.046, 0.0115, 0.027, 6, 0.0035), matBody);
body.castShadow = true; body.receiveShadow = true; body.userData.comp = 'body'; outer.add(body);
const accentRing = new THREE.Mesh(new THREE.TorusGeometry(0.0205, 0.0009, 12, 48), matTeal);
accentRing.rotation.x = Math.PI/2; accentRing.position.y = 0.0059; outer.add(accentRing);

const screenCanvas = document.createElement('canvas'); screenCanvas.width=256; screenCanvas.height=160;
const sctx = screenCanvas.getContext('2d');
function drawScreen() {
  const g = sctx.createLinearGradient(0,0,0,160); g.addColorStop(0,'#0e1218'); g.addColorStop(1,'#080a0e');
  sctx.fillStyle = g; sctx.fillRect(0,0,256,160);
  sctx.fillStyle = '#00c4b4'; sctx.font = 'bold 14px system-ui'; sctx.fillText('ArogyaEdge', 16, 22);
  sctx.fillStyle = '#e8eef4'; sctx.font = '13px system-ui';
  sctx.fillText(`♥  ${Math.round(state.hr)} bpm`, 16, 50);
  sctx.fillText(`O₂  ${Math.round(state.spo2)}%`, 16, 72);
  sctx.fillText(`${state.skinTemp.toFixed(1)} °C`, 16, 94);
  const r = riskLevels.find(l => state.risk <= l.max) || riskLevels[3];
  sctx.fillStyle = r.color; sctx.font = 'bold 12px system-ui'; sctx.fillText(r.label, 16, 122);
  sctx.fillStyle = state.offline ? '#8b9bb0' : '#4a5568'; sctx.font = '10px system-ui';
  sctx.fillText(state.offline ? 'OFFLINE · ON-BAND AI' : 'EDGE AI ACTIVE', 16, 146);
  if (state.risk > 70) { sctx.fillStyle = 'rgba(231,76,60,0.25)'; sctx.fillRect(0,0,256,160); }
  screenTex.needsUpdate = true;
}
const screenTex = new THREE.CanvasTexture(screenCanvas);
const screenMat = new THREE.MeshStandardMaterial({ map:screenTex, emissiveMap:screenTex, emissive:0xffffff, emissiveIntensity:0.5, roughness:0.18 });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.0175), screenMat);
screen.rotation.x = -Math.PI/2; screen.position.y = 0.00605; outer.add(screen);

const ppgHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.0065,0.0065,0.0012,32), matBody); ppgHousing.position.y=-0.0059; outer.add(ppgHousing);
const ppgGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0055,32), matGlass); ppgGlass.rotation.x=Math.PI/2; ppgGlass.position.y=-0.00655; outer.add(ppgGlass);
const ppgLedMat = new THREE.MeshStandardMaterial({ color:0x220000, emissive:0x990000, emissiveIntensity:1.1 });
const ppgLed = new THREE.Mesh(new THREE.CircleGeometry(0.0032,24), ppgLedMat); ppgLed.rotation.x=Math.PI/2; ppgLed.position.y=-0.0064; outer.add(ppgLed);

const strapL = new THREE.Mesh(new THREE.TorusGeometry(0.033,0.005,12,40,Math.PI*1.15), matStrap);
strapL.rotation.set(0,Math.PI/2,Math.PI/2); strapL.position.set(-0.026,-0.0015,0); strapL.castShadow=true; strapG.add(strapL);
const strapR = strapL.clone(); strapR.rotation.y=-Math.PI/2; strapR.position.x=0.026; strapG.add(strapR);

const pcb = new THREE.Mesh(new RoundedBoxGeometry(0.036,0.0018,0.020,2,0.0004), matPCB); pcb.position.y=0.001; pcb.castShadow=true; pcb.userData.comp='pcb'; internals.add(pcb);
const esp32 = new THREE.Mesh(new RoundedBoxGeometry(0.013,0.002,0.010,2,0.00025), matChip); esp32.position.set(-0.0085,0.0028,0.0025); esp32.castShadow=true; esp32.userData.comp='esp32'; internals.add(esp32);
for(let i=0;i<5;i++){ const pad=new THREE.Mesh(new THREE.BoxGeometry(0.0016,0.00035,0.0012), matGold); pad.position.set(-0.0135+i*0.0028,0.0019,0.0025); internals.add(pad); }
const max30102 = new THREE.Mesh(new RoundedBoxGeometry(0.0095,0.0018,0.0065,2,0.00025), matRed); max30102.position.set(0.0095,0.0027,-0.0035); max30102.castShadow=true; max30102.userData.comp='max30102'; internals.add(max30102);
const maxWin = new THREE.Mesh(new THREE.CircleGeometry(0.002,16), new THREE.MeshStandardMaterial({color:0x1a0000,emissive:0xaa0000,emissiveIntensity:0.95})); maxWin.rotation.x=-Math.PI/2; maxWin.position.set(0.0095,0.0037,-0.0035); internals.add(maxWin);
const mpu = new THREE.Mesh(new RoundedBoxGeometry(0.0075,0.0016,0.0075,2,0.00025), matBlue); mpu.position.set(-0.0095,0.0026,-0.0055); mpu.castShadow=true; mpu.userData.comp='mpu'; internals.add(mpu);
const tempS = new THREE.Mesh(new THREE.CylinderGeometry(0.0024,0.0024,0.0032,16), matSilver); tempS.position.set(0.0115,0.0032,0.0055); tempS.castShadow=true; tempS.userData.comp='temp'; internals.add(tempS);
const amb = new THREE.Mesh(new RoundedBoxGeometry(0.006,0.0015,0.0045,2,0.0002), new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:0.5,metalness:0.2})); amb.position.set(0.004,0.0025,0.0065); amb.userData.comp='amb'; internals.add(amb);
const battery = new THREE.Mesh(new RoundedBoxGeometry(0.028,0.0055,0.016,2,0.001), matBattery); battery.position.y=-0.0032; battery.castShadow=true; battery.userData.comp='battery'; internals.add(battery);
const batTab = new THREE.Mesh(new THREE.BoxGeometry(0.0035,0.0008,0.0035), matGold); batTab.position.set(0.0115,-0.0002,0); internals.add(batTab);
const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.0042,0.0042,0.0035,20), matSilver); motor.rotation.z=Math.PI/2; motor.position.set(0.0145,-0.0008,0.0075); motor.castShadow=true; motor.userData.comp='motor'; internals.add(motor);

function makeLabel(text){ const div=document.createElement('div'); div.style.cssText='background:#fff;border:1.5px solid #00a896;border-radius:6px;padding:4px 9px;font-size:11px;color:#007a6e;font-weight:700;white-space:nowrap;box-shadow:0 3px 12px rgba(0,0,0,.12)'; div.textContent=text; const o=new CSS2DObject(div); o.visible=false; return o; }
const labelDefs = [
  { mesh:esp32, text:'ESP32-S3', key:'esp32' }, { mesh:max30102, text:'MAX30102', key:'max30102' },
  { mesh:mpu, text:'MPU6050', key:'mpu' }, { mesh:battery, text:'Li-Po', key:'battery' },
  { mesh:motor, text:'Motor', key:'motor' }, { mesh:tempS, text:'Temp', key:'temp' },
  { mesh:amb, text:'Ambient', key:'amb' }, { mesh:pcb, text:'PCB', key:'pcb' }
];
labelDefs.forEach(l => { const lab=makeLabel(l.text); lab.position.set(0,0.009,0); l.mesh.add(lab); l.label=lab; });

const ground = new THREE.Mesh(new THREE.CircleGeometry(0.65,64), new THREE.MeshStandardMaterial({color:0xd0d8e4,roughness:0.9,metalness:0.02}));
ground.rotation.x=-Math.PI/2; ground.position.y=-0.042; ground.receiveShadow=true; scene.add(ground);

const basePos = new Map();
function storePos(obj){ obj.traverse(c=>{ if(c.isMesh) basePos.set(c,c.position.clone()); }); }
storePos(outer); storePos(internals);
const explodeMap = new Map([
  [body,new THREE.Vector3(0,0.052,0)],[accentRing,new THREE.Vector3(0,0.057,0)],[screen,new THREE.Vector3(0,0.062,0)],
  [ppgHousing,new THREE.Vector3(0,-0.038,0)],[ppgGlass,new THREE.Vector3(0,-0.042,0)],[ppgLed,new THREE.Vector3(0,-0.04,0)],
  [pcb,new THREE.Vector3(0,0.02,0)],[esp32,new THREE.Vector3(-0.036,0.032,0.02)],[max30102,new THREE.Vector3(0.036,0.03,-0.018)],
  [mpu,new THREE.Vector3(-0.038,0.028,-0.02)],[tempS,new THREE.Vector3(0.04,0.026,0.022)],[amb,new THREE.Vector3(0.02,0.03,0.028)],
  [battery,new THREE.Vector3(0,-0.032,0)],[motor,new THREE.Vector3(0.042,-0.02,0.03)]
]);
let explodeT=0, selectedComp=null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickable = [body, esp32, max30102, mpu, tempS, amb, battery, motor, pcb];
renderer.domElement.addEventListener('pointerdown', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (hits.length) {
    const comp = hits[0].object.userData.comp;
    if (comp) selectComp(comp);
  }
});

function selectComp(key) {
  selectedComp = key;
  const info = COMP_INFO[key];
  if (!info) return;
  const card = document.getElementById('comp-card');
  document.getElementById('comp-title').textContent = info.title;
  document.getElementById('comp-desc').textContent = info.desc;
  document.getElementById('comp-tag').textContent = info.tag;
  card.classList.add('show');
  document.querySelectorAll('.comp-item').forEach(el => el.classList.toggle('active', el.dataset.key===key));
  if (!state.exploded) setExploded(true);
  log(`Inspected: ${info.title}`, 'info');
}

const list = document.getElementById('comp-list');
Object.entries(COMP_INFO).forEach(([key, info]) => {
  const btn = document.createElement('button');
  btn.className = 'comp-item'; btn.dataset.key = key;
  btn.innerHTML = `<span class="comp-dot" style="background:${info.color}"></span><div><div class="cname">${info.title}</div><div class="cdesc">${info.tag}</div></div>`;
  btn.onclick = () => selectComp(key);
  list.appendChild(btn);
});

document.querySelectorAll('.tab').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('panel-'+t.dataset.tab).classList.add('active');
  };
});

function log(msg, type='info') {
  const el = document.getElementById('event-log');
  const item = document.createElement('div'); item.className = `log-item ${type}`;
  const t = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  item.innerHTML = `<span>${msg}</span><span class="log-time">${t}</span>`;
  el.insertBefore(item, el.firstChild); while(el.children.length>8) el.removeChild(el.lastChild);
}
function showBanner(text, cls='') {
  const b = document.getElementById('alert-banner');
  b.textContent = text; b.className = 'alert-banner show ' + cls;
  clearTimeout(showBanner._t); showBanner._t = setTimeout(() => b.classList.remove('show'), 3500);
}
function drawSpark(id, hist, color) {
  const c = document.getElementById(id); if (!c) return;
  const ctx = c.getContext('2d'); const w=c.width, h=c.height;
  ctx.clearRect(0,0,w,h);
  if (hist.length < 2) return;
  const min = Math.min(...hist), max = Math.max(...hist);
  const range = max-min || 1;
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
  hist.forEach((v,i) => {
    const x = (i/(hist.length-1))*w;
    const y = h - ((v-min)/range)*(h-4) - 2;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();
}
function updateTelemetry() {
  document.getElementById('t-hr').textContent = Math.round(state.hr);
  document.getElementById('t-spo2').textContent = Math.round(state.spo2);
  document.getElementById('t-temp').textContent = state.skinTemp.toFixed(1);
  document.getElementById('t-amb').textContent = state.ambient.toFixed(1);
  const r = riskLevels.find(l => state.risk <= l.max) || riskLevels[3];
  document.getElementById('t-risk').textContent = Math.round(state.risk);
  document.getElementById('t-risk').style.color = r.color;
  document.getElementById('risk-fill').style.width = state.risk+'%';
  document.getElementById('risk-fill').style.background = r.color;
  document.getElementById('risk-label').textContent = r.label;
  document.getElementById('risk-label').style.color = r.color;
  document.getElementById('risk-hint').textContent = r.hint;
  document.getElementById('bat-level').style.width = state.battery+'%';
  document.getElementById('bat-level').style.background = state.battery>30?'#27ae60':state.battery>15?'#f39c12':'#e74c3c';
  document.getElementById('bat-text').textContent = `${Math.round(state.battery)}% · ~${Math.round(state.battery/5)} h remaining`;
  state.hrHist.push(state.hr); if(state.hrHist.length>24) state.hrHist.shift();
  state.spo2Hist.push(state.spo2); if(state.spo2Hist.length>24) state.spo2Hist.shift();
  drawSpark('spark-hr', state.hrHist, '#00a896');
  drawSpark('spark-spo2', state.spo2Hist, '#2980b9');
  const pa = document.getElementById('pipe-alert');
  if (state.risk > 50) { pa.classList.add('alert'); pa.classList.add('on'); }
  else { pa.classList.remove('alert'); pa.classList.toggle('on', state.monitoring); }
  drawScreen();
}
function setExploded(on) {
  state.exploded = on;
  document.getElementById('btn-cutaway').classList.toggle('active', on);
  document.getElementById('btn-cutaway').textContent = on ? 'Cutaway on' : 'Cutaway';
  labelDefs.forEach(l => l.label.visible = on);
}

document.getElementById('enter-lab').onclick = () => { document.getElementById('intro').style.display='none'; log('Advanced lab session started','ok'); };
document.getElementById('btn-cutaway').onclick = () => setExploded(!state.exploded);
document.getElementById('btn-spin').onclick = () => {
  state.autoSpin = !state.autoSpin;
  document.getElementById('btn-spin').classList.toggle('active', state.autoSpin);
  document.getElementById('btn-spin').textContent = state.autoSpin ? 'Auto-spin on' : 'Auto-spin';
};
document.getElementById('modeA').onclick = () => { state.mode='A'; document.getElementById('modeA').classList.add('active'); document.getElementById('modeB').classList.remove('active'); log('Mode A – Fully On-Band Edge AI','info'); };
document.getElementById('modeB').onclick = () => { state.mode='B'; document.getElementById('modeB').classList.add('active'); document.getElementById('modeA').classList.remove('active'); log('Mode B – Band + Phone Hybrid','info'); };

document.querySelectorAll('.scenario-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const sc = btn.dataset.scenario;
    if(sc==='normal') resetState(); else if(sc==='heat') triggerHeat(); else if(sc==='fall') triggerFall(); else if(sc==='dehydrate') triggerDehydrate();
  };
});
function resetState() {
  state.hr=74+Math.random()*8; state.spo2=97+Math.random()*2; state.skinTemp=33.8+Math.random()*0.6;
  state.ambient=30.5+Math.random()*2.5; state.risk=8+Math.random()*12; state.offline=false; state.battery=85+Math.random()*10;
  document.getElementById('btn-offline').textContent='📶 Go Offline'; updateTelemetry(); log('Reset – healthy baseline','ok');
}
function triggerHeat() {
  state.hr=108+Math.random()*10; state.skinTemp=37.5+Math.random()*0.7; state.ambient=41+Math.random()*3; state.risk=72+Math.random()*14;
  updateTelemetry(); log('HEAT STRESS – Drink water & seek shade','heat'); showBanner('⚠ HEAT STRESS DETECTED','heat');
  if(navigator.vibrate) navigator.vibrate([180,80,180,80,350]); pulseMotor();
}
function triggerFall() {
  state.hr=122+Math.random()*12; state.risk=88+Math.random()*10; updateTelemetry();
  log('FALL DETECTED – SOS triggered','fall'); showBanner('🚨 FALL · SOS SENT','');
  if(navigator.vibrate) navigator.vibrate([400,150,400,150,400]); pulseMotor();
}
function triggerDehydrate() {
  state.hr=96+Math.random()*8; state.skinTemp=36.6+Math.random()*0.5; state.spo2=95+Math.random()*1.2; state.risk=55+Math.random()*12;
  updateTelemetry(); log('Dehydration risk rising','heat'); showBanner('💧 DEHYDRATION RISK','heat');
}
function pulseMotor() {
  const s0 = motor.scale.x;
  let t=0; const iv=setInterval(()=>{ t+=0.15; motor.scale.setScalar(s0*(1+0.15*Math.sin(t*12))); if(t>1.2){ motor.scale.setScalar(s0); clearInterval(iv);} }, 30);
}
document.getElementById('btn-start').onclick = () => {
  state.monitoring=!state.monitoring;
  document.getElementById('btn-start').textContent=state.monitoring?'⏸ Pause':'▶ Start Monitoring';
  log(state.monitoring?'Continuous monitoring started':'Monitoring paused','info');
};
document.getElementById('btn-reset').onclick = resetState;
document.getElementById('btn-heat').onclick = triggerHeat;
document.getElementById('btn-fall').onclick = triggerFall;
document.getElementById('btn-offline').onclick = () => {
  state.offline=!state.offline;
  document.getElementById('btn-offline').textContent=state.offline?'📶 Restore Net':'📶 Go Offline';
  updateTelemetry(); log(state.offline?'Offline – On-band AI continues':'Connectivity restored', state.offline?'ok':'info');
};
document.getElementById('btn-vibrate').onclick = () => { if(navigator.vibrate) navigator.vibrate(220); log('Coin motor haptic test','info'); pulseMotor(); };

setInterval(() => {
  if(state.monitoring && state.risk<40) {
    state.hr+=(Math.random()-0.5)*1.5; state.spo2+=(Math.random()-0.5)*0.3; state.skinTemp+=(Math.random()-0.5)*0.05;
    state.hr=Math.max(66,Math.min(94,state.hr)); state.spo2=Math.max(96,Math.min(99.5,state.spo2)); state.skinTemp=Math.max(33.5,Math.min(35.4,state.skinTemp));
    if(state.monitoring) state.battery=Math.max(5, state.battery-0.02);
    updateTelemetry();
  }
  const pulse = 0.6 + 0.5*Math.sin(performance.now()/180);
  ppgLedMat.emissiveIntensity = state.monitoring ? pulse : 0.4;
}, 1200);

function animate() {
  requestAnimationFrame(animate);
  const target = state.exploded?1:0; explodeT += (target-explodeT)*0.07;
  explodeMap.forEach((offset, mesh) => {
    const base = basePos.get(mesh)||new THREE.Vector3();
    mesh.position.lerpVectors(base, base.clone().add(offset), explodeT);
  });
  if(state.autoSpin && !state.exploded && explodeT<0.05) device.rotation.y += 0.004;
  controls.update(); renderer.render(scene, camera); labelRenderer.render(scene, camera);
}
window.addEventListener('resize', () => {
  const w=wrap.clientWidth,h=wrap.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix();
  renderer.setSize(w,h); labelRenderer.setSize(w,h);
});
document.getElementById('loading').style.display='none';
document.getElementById('btn-spin').classList.add('active');
updateTelemetry(); animate();
