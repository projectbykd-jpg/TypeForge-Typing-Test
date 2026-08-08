(() => {
"use strict";

const CONFIG = window.TYPEFORGE_CONFIG || {};
const API_URL = CONFIG.API_URL || "";
const POLL_MS = Number(CONFIG.POLL_MS || 1800);
const TOKEN_KEY = "typeforge_session_token";
const SETTINGS_KEY = "typeforge_ui_settings_v3";

const LANGUAGES = [
  ["english","English"],["indonesian","Indonesia"],["spanish","Español"],["french","Français"],
  ["german","Deutsch"],["italian","Italiano"],["portuguese","Português"],["dutch","Nederlands"],
  ["russian","Русский"],["arabic","العربية"],["hindi","हिन्दी"],["japanese","日本語"],
  ["korean","한국어"],["chinese","中文"],["turkish","Türkçe"],["vietnamese","Tiếng Việt"],
  ["thai","ไทย"],["greek","Ελληνικά"],["polish","Polski"],["swedish","Svenska"],
  ["javanese","Basa Jawa"],["khmer","ខ្មែរ"],["bengali","বাংলা"],["hebrew","עברית"]
];

const state = {
  user:null, dashboard:null, testLevel:"standard", activeArena:null,
  compRoom:null, multiRoom:null, compPoll:null, multiPoll:null,
  scheduledMultiStart:null,
  settings: loadSettings()
};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function toast(message,type="success"){const e=document.createElement("div");e.className=`toast ${type}`;e.textContent=message;$("#toastContainer").appendChild(e);setTimeout(()=>e.remove(),3600);}
function setBusy(btn,busy,text="Loading..."){if(!btn)return;if(busy){btn.dataset.old=btn.innerHTML;btn.disabled=true;btn.textContent=text;}else{btn.disabled=false;if(btn.dataset.old)btn.innerHTML=btn.dataset.old;}}
function initials(name){return String(name||"U").trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join("")||"U";}
function formatDate(v,short=false){if(!v)return"—";const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat("id-ID",short?{day:"2-digit",month:"short"}:{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

async function api(action,payload={},auth=false){
  if(!API_URL||API_URL.includes("PASTE_YOUR"))throw new Error("API URL belum diatur.");
  const body={action,...payload};
  if(auth)body.token=localStorage.getItem(TOKEN_KEY)||"";
  const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body),redirect:"follow"});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(!data.ok)throw new Error(data.message||"Request gagal.");
  return data;
}

function loadSettings(){
  const def={font:"'JetBrains Mono', monospace",fontSize:22,lines:4,sound:false};
  try{return {...def,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")};}catch{return def;}
}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(state.settings));applySettingsUI();if(state.activeArena)state.activeArena.applyAppearance();}
function applySettingsUI(){
  $("#settingFont").value=state.settings.font;$("#settingFontSize").value=state.settings.fontSize;$("#fontSizeLabel").textContent=`${state.settings.fontSize}px`;$("#settingLines").value=String(state.settings.lines);$("#settingSound").checked=!!state.settings.sound;
  const p=$("#settingsPreview");p.style.fontFamily=state.settings.font;p.style.fontSize=`${state.settings.fontSize}px`;
}
function fillLanguages(){
  $$(".language-options").forEach(sel=>{
    sel.innerHTML=LANGUAGES.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");
    if(["languageSelect","compLanguage","practiceLanguage","multiLanguage"].includes(sel.id)) sel.value="indonesian";
  });
}

function showAuth(){$("#authScreen").classList.remove("hidden");$("#appShell").classList.add("hidden");}
function showApp(){$("#authScreen").classList.add("hidden");$("#appShell").classList.remove("hidden");}
function setAuthTab(tab){
  $$("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));
  $("#loginForm").classList.toggle("hidden",tab!=="login");$("#registerForm").classList.toggle("hidden",tab!=="register");
  $("#authTitle").textContent=tab==="login"?"Welcome back":"Create account";
  $("#authSubtitle").textContent=tab==="login"?"Masuk untuk melanjutkan progress mengetikmu.":"Daftar sekali, lalu semua hasil tersimpan di akunmu.";
}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  $(".sidebar").classList.remove("open");
  if(page==="dashboard")loadDashboard();
  if(page==="leaderboard")loadLeaderboard();
  if(page==="history")loadHistory();
  if(page==="competition")loadCompetitions();
  if(page==="practice")loadPracticeTexts();
  if(page==="multiplayer")loadMultiRooms();
  if(page==="profile")applySettingsUI();
}
function applyUser(){
  if(!state.user)return;const init=initials(state.user.displayName);
  $("#sidebarAvatar").textContent=init;$("#profileAvatar").textContent=init;$("#sidebarName").textContent=state.user.displayName;$("#sidebarUserId").textContent=`@${state.user.userId}`;
  $("#welcomeName").textContent=state.user.displayName.split(" ")[0];$("#profileName").textContent=state.user.displayName;$("#profileUserId").textContent=`@${state.user.userId}`;$("#profileJoined").textContent=formatDate(state.user.createdAt);
}

async function bootstrap(){
  fillLanguages();wireEvents();applySettingsUI();
  try{const h=await api("health");$("#apiStatus").textContent=h.version||"online";}catch{$("#apiStatus").textContent="offline";}
  const token=localStorage.getItem(TOKEN_KEY);if(!token)return showAuth();
  try{const d=await api("me",{},true);state.user=d.user;applyUser();showApp();await loadDashboard();}catch{localStorage.removeItem(TOKEN_KEY);showAuth();toast("Sesi berakhir. Silakan login lagi.","error");}
}
async function handleLogin(e){e.preventDefault();const b=e.submitter;setBusy(b,true,"Signing in...");try{const d=await api("login",{userId:$("#loginUserId").value.trim(),password:$("#loginPassword").value});localStorage.setItem(TOKEN_KEY,d.token);state.user=d.user;applyUser();showApp();navigate("dashboard");toast("Login berhasil.");}catch(err){toast(err.message,"error");}finally{setBusy(b,false);}}
async function handleRegister(e){e.preventDefault();const b=e.submitter;setBusy(b,true,"Creating...");try{const d=await api("register",{displayName:$("#registerName").value.trim(),userId:$("#registerUserId").value.trim(),password:$("#registerPassword").value});localStorage.setItem(TOKEN_KEY,d.token);state.user=d.user;applyUser();showApp();navigate("dashboard");toast("Akun berhasil dibuat.");}catch(err){toast(err.message,"error");}finally{setBusy(b,false);}}
function logout(){stopRoomPolling();if(state.activeArena)state.activeArena.destroy();localStorage.removeItem(TOKEN_KEY);state.user=null;showAuth();toast("Logout berhasil.");}

async function loadDashboard(){
  try{
    const d=await api("dashboardV3",{},true);state.dashboard=d;
    const s=d.stats||{},p=d.progression||{};
    $("#statBestWpm").textContent=s.bestWpm||0;$("#statAvgWpm").textContent=s.avgWpm||0;$("#statAccuracy").textContent=s.avgAccuracy||0;$("#statTests").textContent=s.totalTests||0;$("#statPoints").textContent=p.points||0;
    $("#profileTests").textContent=s.totalTests||0;$("#profileBest").textContent=`${s.bestWpm||0} WPM`;$("#profilePoints").textContent=`${p.points||0} XP`;
    $("#topLevel").textContent=p.level||1;$("#levelNumber").textContent=p.level||1;$("#xpText").textContent=`${p.currentLevelXp||0} / ${p.nextLevelXp||500} XP`;$("#xpPercent").textContent=`${p.percent||0}%`;$("#xpBar").style.width=`${p.percent||0}%`;
    $("#levelHint").textContent=p.nextAchievement?`Next badge: ${p.nextAchievement}`:"All current badges unlocked.";
    renderRecent(d.recent||[]);renderAchievements(d.achievements||[]);drawPerformance((d.recent||[]).slice().reverse());
  }catch(err){if(/session/i.test(err.message))logout();else toast(err.message,"error");}
}
function renderRecent(items){
  const box=$("#recentResults");if(!items.length){box.className="recent-results empty-state";box.textContent="Belum ada hasil.";return;}
  box.className="recent-results";box.innerHTML=items.slice(0,5).map(x=>`<div class="recent-row"><div class="wpm">${Math.round(x.wpm)} <small>WPM</small></div><div class="muted">${escapeHtml(x.type||"test")}</div><div class="muted">${Number(x.accuracy).toFixed(1)}% ACC</div><div class="muted">${formatDate(x.createdAt,true)}</div></div>`).join("");
}
function renderAchievements(items){$("#achievementGrid").innerHTML=items.map(a=>`<div class="achievement ${a.unlocked?"":"locked"}"><div class="badge-icon">${a.icon}</div><strong>${escapeHtml(a.name)}</strong><span>${escapeHtml(a.description)}</span></div>`).join("");}
function drawPerformance(items){
  const c=$("#performanceChart"),ctx=c.getContext("2d");const rect=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;c.width=Math.max(300,rect.width*dpr);c.height=180*dpr;ctx.scale(dpr,dpr);const w=rect.width,h=180;ctx.clearRect(0,0,w,h);
  ctx.strokeStyle="rgba(255,255,255,.08)";ctx.lineWidth=1;for(let i=1;i<4;i++){const y=(h/4)*i;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  if(!items.length)return;const vals=items.map(x=>Number(x.wpm)||0),max=Math.max(40,...vals)*1.15;ctx.strokeStyle="#b8ff4f";ctx.lineWidth=2;ctx.beginPath();vals.forEach((v,i)=>{const x=items.length===1?w/2:(i/(items.length-1))*(w-14)+7,y=h-12-(v/max)*(h-28);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  ctx.fillStyle="#b8ff4f";vals.forEach((v,i)=>{const x=items.length===1?w/2:(i/(items.length-1))*(w-14)+7,y=h-12-(v/max)*(h-28);ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();});
}

class TypingArena{
  constructor(mount,test,context={}){
    this.mount=mount;this.test=test;this.context=context;this.started=false;this.elapsed=0;this.timer=null;this.progressTimer=null;this.finishing=false;this.audioCtx=null;
    const frag=$("#arenaTemplate").content.cloneNode(true);mount.innerHTML="";mount.appendChild(frag);this.root=mount.querySelector(".typing-arena");
    this.passage=$("[data-passage]",this.root);this.input=$("[data-input]",this.root);this.result=$("[data-result]",this.root);
    this.timerEl=$("[data-timer]",this.root);this.wpmEl=$("[data-wpm]",this.root);this.accEl=$("[data-accuracy]",this.root);this.progressEl=$("[data-progress]",this.root);
    this.startedAtPerf=0;this.target=test.passage||"";this.render("");this.applyAppearance();this.bind();setTimeout(()=>this.input.focus(),80);
  }
  bind(){
    this.onInput=()=>this.handleInput();this.onPaste=e=>{e.preventDefault();toast("Paste dinonaktifkan.","error");};this.onKey=()=>{if(state.settings.sound)this.clickSound();};
    this.input.addEventListener("input",this.onInput);this.input.addEventListener("paste",this.onPaste);this.input.addEventListener("keydown",this.onKey);
    $("[data-restart]",this.root).addEventListener("click",()=>this.destroy(true));
  }
  applyAppearance(){
    if(!this.passage)return;this.passage.style.fontFamily=state.settings.font;this.passage.style.fontSize=`${state.settings.fontSize}px`;
    const lineHeight=1.85;this.passage.style.lineHeight=String(lineHeight);this.passage.style.height=`${Math.round(state.settings.fontSize*lineHeight*state.settings.lines)}px`;
    this.input.style.fontFamily=state.settings.font;this.input.style.fontSize=`${Math.max(14,state.settings.fontSize-5)}px`;
  }
  clickSound(){
    try{this.audioCtx=this.audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=this.audioCtx.createOscillator(),g=this.audioCtx.createGain();o.type="square";o.frequency.value=110+Math.random()*70;g.gain.setValueAtTime(.025,this.audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audioCtx.currentTime+.025);o.connect(g);g.connect(this.audioCtx.destination);o.start();o.stop(this.audioCtx.currentTime+.026);}catch{}
  }
  render(typed){
    let html="";for(let i=0;i<this.target.length;i++){let cls="char";if(i<typed.length)cls+=typed[i]===this.target[i]?" correct":" incorrect";else if(i===typed.length)cls+=" current";html+=`<span class="${cls}">${escapeHtml(this.target[i])}</span>`;}this.passage.innerHTML=html;
    const cur=$(".current",this.passage);if(cur)cur.scrollIntoView({block:"center"});
  }
  metrics(){
    const typed=this.input.value;let correct=0,errors=0;for(let i=0;i<typed.length;i++){typed[i]===this.target[i]?correct++:errors++;}
    const mins=Math.max(this.elapsed,1)/60;return{correct,errors,raw:(typed.length/5)/mins,wpm:(correct/5)/mins,accuracy:typed.length?correct/typed.length*100:100,progress:this.target.length?typed.length/this.target.length*100:0};
  }
  async start(){
    if(this.started)return;this.started=true;this.startedAtPerf=performance.now();api("startTest",{testId:this.test.testId},true).catch(()=>{});
    this.timer=setInterval(()=>{this.elapsed=(performance.now()-this.startedAtPerf)/1000;const left=Math.max(0,this.test.duration-this.elapsed);this.timerEl.textContent=Math.ceil(left);this.updateLive();if(left<=0)this.finish();},100);
    if(this.context.roomId)this.progressTimer=setInterval(()=>this.sendRoomProgress(),POLL_MS);
  }
  handleInput(){
    if(!this.started&&this.input.value.length)this.start();if(this.input.value.length>this.target.length)this.input.value=this.input.value.slice(0,this.target.length);
    this.render(this.input.value);this.updateLive();if(this.input.value.length>=this.target.length)this.finish();
  }
  updateLive(){const m=this.metrics();this.wpmEl.textContent=Math.round(m.wpm);this.accEl.textContent=Math.round(m.accuracy);this.progressEl.textContent=`${Math.round(m.progress)}%`;}
  sendRoomProgress(){if(!this.context.roomId||!this.started||this.finishing)return;const m=this.metrics();api("roomProgress",{roomId:this.context.roomId,progress:Math.round(m.progress),wpm:Math.round(m.wpm),accuracy:Math.round(m.accuracy)},true).catch(()=>{});}
  async finish(){
    if(this.finishing||!this.input.value.length)return;this.finishing=true;clearInterval(this.timer);clearInterval(this.progressTimer);this.input.disabled=true;
    try{
      const d=await api("finishTest",{testId:this.test.testId,typedText:this.input.value},true);this.showResult(d.result);loadDashboard();
      if(this.context.roomId)this.sendRoomProgress();
    }catch(err){this.finishing=false;this.input.disabled=false;toast(err.message,"error");}
  }
  showResult(r){
    this.result.classList.remove("hidden");this.result.scrollIntoView({behavior:"smooth",block:"start"});
    $("[data-result-wpm]",this.result).textContent=Math.round(r.wpm);$("[data-result-accuracy]",this.result).textContent=`${Number(r.accuracy).toFixed(1)}%`;$("[data-result-raw]",this.result).textContent=Math.round(r.rawWpm);$("[data-result-errors]",this.result).textContent=r.errors;$("[data-result-points]",this.result).textContent=r.points||0;
    this.renderHeatmap(r.errorMap||{},r.wordErrorMap||{});
  }
  renderHeatmap(chars,words){
    const ce=$("[data-char-heatmap]",this.result),we=$("[data-word-errors]",this.result);const entries=Object.entries(chars).sort((a,b)=>b[1]-a[1]).slice(0,28),max=Math.max(1,...entries.map(x=>x[1]));
    ce.innerHTML=entries.length?entries.map(([c,n])=>`<div class="heat-tile" style="--heat:${(.08+.58*n/max).toFixed(2)}"><b>${escapeHtml(c===" "?"␠":c)}</b><small>${n}×</small></div>`).join(""):`<span class="muted">No character errors. Excellent accuracy.</span>`;
    const wentries=Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,12);we.innerHTML=wentries.length?wentries.map(([w,n])=>`<span class="word-error-chip">${escapeHtml(w)} <b>${n}×</b></span>`).join(""):`<span class="muted">No missed words.</span>`;
  }
  destroy(clear=true){clearInterval(this.timer);clearInterval(this.progressTimer);this.input?.removeEventListener("input",this.onInput);if(clear)this.mount.innerHTML="";if(state.activeArena===this)state.activeArena=null;}
}

async function createArena(mountId,params,context={}){
  if(state.activeArena)state.activeArena.destroy();
  const mount=$(mountId);mount.innerHTML=`<div class="panel-card empty-state">Generating test...</div>`;
  try{const d=await api("newTest",params,true);state.activeArena=new TypingArena(mount,d.test,context);return state.activeArena;}catch(err){mount.innerHTML="";toast(err.message,"error");return null;}
}

async function startCoreTest(){await createArena("#testArenaMount",{type:"typing",duration:60,language:$("#languageSelect").value,level:state.testLevel,mode:"words"});}
async function startCustom(){const text=$("#customText").value.trim(),duration=Number($("#customDuration").value);if(text.length<10)return toast("Masukkan minimal 10 karakter.","error");await createArena("#customArenaMount",{type:"custom",duration,language:$("#customLanguage").value.trim()||"custom",level:"custom",customText:text});}

async function loadLeaderboard(){
  const body=$("#leaderboardBody");body.innerHTML=`<tr><td colspan="7">Loading...</td></tr>`;
  try{const d=await api("leaderboard",{limit:100});body.innerHTML=d.items.length?d.items.map((x,i)=>`<tr><td class="rank">${i+1}</td><td><div class="user-cell"><span class="mini-avatar">${initials(x.displayName)}</span><strong>${escapeHtml(x.displayName)}</strong>${x.userId===state.user?.userId?'<span class="you-chip">YOU</span>':""}</div></td><td><strong>${Math.round(x.wpm)}</strong> WPM</td><td>${Number(x.accuracy).toFixed(1)}%</td><td>${escapeHtml(x.type||"typing")}</td><td>${escapeHtml(x.language||"")}</td><td>${formatDate(x.createdAt,true)}</td></tr>`).join(""):`<tr><td colspan="7">Belum ada data.</td></tr>`;}catch(err){body.innerHTML=`<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;}
}
async function loadHistory(){
  const body=$("#historyBody");body.innerHTML=`<tr><td colspan="8">Loading...</td></tr>`;
  try{const d=await api("history",{limit:150},true);body.innerHTML=d.items.length?d.items.map(x=>`<tr><td>${formatDate(x.createdAt)}</td><td><strong>${Math.round(x.wpm)}</strong></td><td>${Math.round(x.rawWpm)}</td><td>${Number(x.accuracy).toFixed(1)}%</td><td>${x.errors}</td><td>${escapeHtml(x.type||"typing")}</td><td>${escapeHtml(x.language||"")}</td><td>${x.points||0}</td></tr>`).join(""):`<tr><td colspan="8">Belum ada hasil.</td></tr>`;}catch(err){body.innerHTML=`<tr><td colspan="8">${escapeHtml(err.message)}</td></tr>`;}
}

async function loadPracticeTexts(){
  const box=$("#practiceList");box.className="practice-list empty-state";box.textContent="Loading texts...";
  try{const d=await api("listPracticeTexts",{limit:60});box.className="practice-list";box.innerHTML=d.items.length?d.items.map(x=>`<div class="practice-card"><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.preview)}</p><div class="practice-meta"><span>${escapeHtml(x.language)} · by ${escapeHtml(x.displayName)} · ${x.length} chars</span><button class="secondary-btn" data-practice-id="${escapeHtml(x.textId)}">Practice</button></div></div>`).join(""):`<div class="empty-state">Belum ada community text.</div>`;
    $$("[data-practice-id]",box).forEach(b=>b.onclick=()=>startPractice(b.dataset.practiceId));
  }catch(err){box.textContent=err.message;}
}
async function submitPractice(){
  const b=$("#submitPracticeBtn");setBusy(b,true,"Publishing...");
  try{await api("createPracticeText",{title:$("#practiceTitle").value.trim(),language:$("#practiceLanguage").value,content:$("#practiceContent").value.trim()},true);$("#practiceTitle").value="";$("#practiceContent").value="";toast("Text berhasil dipublish.");loadPracticeTexts();}catch(err){toast(err.message,"error");}finally{setBusy(b,false);}
}
async function startPractice(textId){await createArena("#practiceArenaMount",{type:"practice",sourceId:textId});$("#practiceArenaMount").scrollIntoView({behavior:"smooth"});}

function roomCard(x,type){
  return `<div class="room-row"><div><h4>${escapeHtml(x.name)}</h4><p>${escapeHtml(x.language)} · ${x.level} · ${x.duration}s · ${x.playerCount}/${x.maxPlayers} players</p></div><button class="secondary-btn" data-join-room="${escapeHtml(x.code)}" data-room-type="${type}">Join</button></div>`;
}
async function loadCompetitions(){
  const box=$("#competitionList");if(state.compRoom)return;box.textContent="Loading rooms...";
  try{const d=await api("listRooms",{type:"competition"});box.innerHTML=d.items.length?d.items.map(x=>roomCard(x,"competition")).join(""):`<div class="empty-state">Belum ada public competition.</div>`;bindRoomJoinButtons();}catch(err){box.textContent=err.message;}
}
async function loadMultiRooms(){
  const box=$("#multiList");if(state.multiRoom)return;box.textContent="Loading rooms...";
  try{const d=await api("listRooms",{type:"multiplayer"});box.innerHTML=d.items.length?d.items.map(x=>roomCard(x,"multiplayer")).join(""):`<div class="empty-state">Belum ada public race.</div>`;bindRoomJoinButtons();}catch(err){box.textContent=err.message;}
}
function bindRoomJoinButtons(){$$("[data-join-room]").forEach(b=>b.onclick=()=>joinRoom(b.dataset.roomType,b.dataset.joinRoom));}
async function createRoom(type){
  const isComp=type==="competition";const btn=$(isComp?"#createCompetitionBtn":"#createMultiBtn");setBusy(btn,true,"Creating...");
  try{
    const d=await api("createRoom",{type,name:$(isComp?"#compName":"#multiName").value.trim(),visibility:$(isComp?"#compVisibility":"#multiVisibility").value,maxPlayers:Number($(isComp?"#compMax":"#multiMax").value),language:$(isComp?"#compLanguage":"#multiLanguage").value,level:$(isComp?"#compLevel":"#multiLevel").value,duration:Number($(isComp?"#compDuration":"#multiDuration").value)},true);
    await enterRoom(type,d.room.roomId);
  }catch(err){toast(err.message,"error");}finally{setBusy(btn,false);}
}
async function joinRoom(type,code){
  try{const d=await api("joinRoom",{type,code:String(code).trim().toUpperCase()},true);await enterRoom(type,d.room.roomId);}catch(err){toast(err.message,"error");}
}
async function enterRoom(type,roomId){
  if(type==="competition"){state.compRoom=roomId;$("#competitionHome").classList.add("hidden");$("#competitionRoom").classList.remove("hidden");startCompPolling();}
  else{state.multiRoom=roomId;$("#multiHome").classList.add("hidden");$("#multiRoom").classList.remove("hidden");startMultiPolling();}
  await refreshRoom(type);
}
function stopRoomPolling(){clearInterval(state.compPoll);clearInterval(state.multiPoll);state.compPoll=null;state.multiPoll=null;}
function startCompPolling(){clearInterval(state.compPoll);state.compPoll=setInterval(()=>refreshRoom("competition"),POLL_MS);}
function startMultiPolling(){clearInterval(state.multiPoll);state.multiPoll=setInterval(()=>refreshRoom("multiplayer"),POLL_MS);}
async function refreshRoom(type){
  const roomId=type==="competition"?state.compRoom:state.multiRoom;if(!roomId)return;
  try{
    const d=await api("roomState",{roomId},true),room=d.room,players=d.players||[];
    if(type==="competition"){
      $("#compRoomName").textContent=room.name;$("#compRoomCode").textContent=room.code;$("#compDurationInfo").innerHTML=`${room.duration}<span>s</span>`;
      $("#competitionPlayers").innerHTML=renderPlayers(players,false);
      const me=players.find(p=>p.userId===state.user.userId);$("#startCompetitionTestBtn").disabled=!!me?.finished;
      $("#startCompetitionTestBtn").textContent=me?.finished?"Attempt Completed":"Start My Attempt";
    }else{
      $("#multiRoomName").textContent=room.name;$("#multiRoomCode").textContent=room.code;$("#multiPlayers").innerHTML=renderPlayers(players,true);
      const me=players.find(p=>p.userId===state.user.userId);$("#multiReadyBtn").textContent=me?.ready?"Ready ✓":"I'm Ready";
      $("#multiStartBtn").classList.toggle("hidden",room.hostUserId!==state.user.userId||room.status!=="OPEN");
      if(room.status==="STARTED"&&room.startAt)scheduleMultiplayerStart(room);
      if(room.status==="FINISHED")$("#multiCountdown").classList.add("hidden");
    }
  }catch(err){if(!/already|finished/i.test(err.message))console.warn(err);}
}
function renderPlayers(players,race){
  const sorted=players.slice().sort((a,b)=>(b.finished-a.finished)||(b.wpm-a.wpm)||(b.progress-a.progress));
  return sorted.map((p,i)=>`<div class="player-row"><div class="player-rank">${i+1}</div><div class="player-name"><strong>${escapeHtml(p.displayName)} ${p.userId===state.user.userId?'<span class="you-chip">YOU</span>':""}</strong><small>${race?(p.ready?"READY":"WAITING"):(p.finished?"FINISHED":"TYPING")}</small><div class="player-progress"><span style="width:${clamp(p.progress||0,0,100)}%"></span></div></div><div class="player-stat"><strong>${Math.round(p.wpm||0)}</strong> WPM</div><div class="player-stat">${Math.round(p.progress||0)}%</div></div>`).join("");
}
async function startCompetitionAttempt(){
  if(!state.compRoom)return;const d=await api("roomState",{roomId:state.compRoom},true);
  const arena=await createArena("#competitionArenaMount",{type:"competition",sourceId:state.compRoom},{roomId:state.compRoom,type:"competition"});if(arena)$("#competitionArenaMount").scrollIntoView({behavior:"smooth"});
}
async function toggleReady(){if(!state.multiRoom)return;try{await api("roomReady",{roomId:state.multiRoom},true);refreshRoom("multiplayer");}catch(err){toast(err.message,"error");}}
async function startRace(){if(!state.multiRoom)return;try{await api("startRoom",{roomId:state.multiRoom},true);refreshRoom("multiplayer");}catch(err){toast(err.message,"error");}}
function scheduleMultiplayerStart(room){
  if(state.scheduledMultiStart===room.roomId||state.activeArena?.context?.roomId===room.roomId)return;state.scheduledMultiStart=room.roomId;
  const start=new Date(room.startAt).getTime(),box=$("#multiCountdown");box.classList.remove("hidden");
  const tick=()=>{const left=Math.max(0,Math.ceil((start-Date.now())/1000));box.textContent=left||"GO";if(Date.now()<start){setTimeout(tick,200);}else{setTimeout(()=>box.classList.add("hidden"),700);launchMultiArena(room);}};tick();
}
async function launchMultiArena(room){if(state.activeArena?.context?.roomId===room.roomId)return;const arena=await createArena("#multiArenaMount",{type:"multiplayer",sourceId:room.roomId},{roomId:room.roomId,type:"multiplayer"});if(arena){arena.start();$("#multiArenaMount").scrollIntoView({behavior:"smooth"});}}
function leaveRoomView(type){
  if(state.activeArena)state.activeArena.destroy();
  if(type==="competition"){clearInterval(state.compPoll);state.compRoom=null;$("#competitionRoom").classList.add("hidden");$("#competitionHome").classList.remove("hidden");loadCompetitions();}
  else{clearInterval(state.multiPoll);state.multiRoom=null;state.scheduledMultiStart=null;$("#multiRoom").classList.add("hidden");$("#multiHome").classList.remove("hidden");loadMultiRooms();}
}
function copyCode(el){navigator.clipboard?.writeText(el.textContent).then(()=>toast("Room code copied."));}

function wireEvents(){
  $$("[data-auth-tab]").forEach(b=>b.onclick=()=>setAuthTab(b.dataset.authTab));$("#loginForm").onsubmit=handleLogin;$("#registerForm").onsubmit=handleRegister;
  $$(".toggle-password").forEach(b=>b.onclick=()=>{const i=b.parentElement.querySelector("input");i.type=i.type==="password"?"text":"password";});
  $$(".nav-item").forEach(b=>b.onclick=()=>navigate(b.dataset.page));$$("[data-page-link]").forEach(b=>b.onclick=()=>navigate(b.dataset.pageLink));$$("[data-go-test]").forEach(b=>b.onclick=()=>navigate("test"));
  $("#logoutBtn").onclick=logout;$("#mobileMenuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
  $$("[data-test-level]").forEach(c=>c.onclick=()=>{state.testLevel=c.dataset.testLevel;$$("[data-test-level]").forEach(x=>x.classList.toggle("selected",x===c));});
  $("#prepareTestBtn").onclick=startCoreTest;$("#startCustomBtn").onclick=startCustom;
  $("#refreshLeaderboardBtn").onclick=loadLeaderboard;$("#refreshHistoryBtn").onclick=loadHistory;$("#refreshPracticeBtn").onclick=loadPracticeTexts;$("#submitPracticeBtn").onclick=submitPractice;
  $("#createCompetitionBtn").onclick=()=>createRoom("competition");$("#joinCompetitionBtn").onclick=()=>joinRoom("competition",$("#compJoinCode").value);$("#refreshCompetitionBtn").onclick=loadCompetitions;$("#startCompetitionTestBtn").onclick=startCompetitionAttempt;$("#leaveCompetitionBtn").onclick=()=>leaveRoomView("competition");$("#compRoomCode").onclick=e=>copyCode(e.currentTarget);
  $("#createMultiBtn").onclick=()=>createRoom("multiplayer");$("#joinMultiBtn").onclick=()=>joinRoom("multiplayer",$("#multiJoinCode").value);$("#refreshMultiBtn").onclick=loadMultiRooms;$("#multiReadyBtn").onclick=toggleReady;$("#multiStartBtn").onclick=startRace;$("#leaveMultiBtn").onclick=()=>leaveRoomView("multiplayer");$("#multiRoomCode").onclick=e=>copyCode(e.currentTarget);
  $("#settingFont").onchange=e=>{state.settings.font=e.target.value;saveSettings();};$("#settingFontSize").oninput=e=>{state.settings.fontSize=Number(e.target.value);saveSettings();};$("#settingLines").onchange=e=>{state.settings.lines=Number(e.target.value);saveSettings();};$("#settingSound").onchange=e=>{state.settings.sound=e.target.checked;saveSettings();};
  $("#resetSettingsBtn").onclick=()=>{state.settings={font:"'JetBrains Mono', monospace",fontSize:22,lines:4,sound:false};saveSettings();toast("Settings reset.");};
  window.addEventListener("resize",()=>{if(state.dashboard)drawPerformance((state.dashboard.recent||[]).slice().reverse());});
}
bootstrap();
})();
