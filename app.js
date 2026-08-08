(() => {
"use strict";

const CONFIG=window.TYPEFORGE_CONFIG||{};
const API_URL=CONFIG.API_URL||"";
const POLL_MS=Number(CONFIG.POLL_MS||1800);
const TOKEN_KEY="typeforge_session_token";
const SETTINGS_KEY="typeforge_settings";
const LEGACY_SETTINGS_KEYS=["typeforge_v5_settings","typeforge_v4_settings"];

const LANGUAGES=[
["english","english"],["indonesian","indonesia"],["spanish","español"],["french","français"],["german","deutsch"],
["italian","italiano"],["portuguese","português"],["dutch","nederlands"],["russian","русский"],["arabic","العربية"],
["hindi","हिन्दी"],["japanese","日本語"],["korean","한국어"],["chinese","中文"],["turkish","türkçe"],
["vietnamese","tiếng việt"],["thai","ไทย"],["polish","polski"],["javanese","basa jawa"],["khmer","ខ្មែរ"]
];

const THEMES={
  forge:{name:"forge",bg:"#090d0b",panel:"#111713",panel2:"#172019",text:"#edf3ee",sub:"#6e7b72",main:"#a8ff35",error:"#ff5c6c",caret:"#a8ff35"},
  midnight:{name:"midnight",bg:"#0b1020",panel:"#11182a",panel2:"#17213a",text:"#dce6ff",sub:"#617092",main:"#7aa2f7",error:"#f7768e",caret:"#7aa2f7"},
  matrix:{name:"matrix",bg:"#07110a",panel:"#0c1a10",panel2:"#112718",text:"#c6f6d5",sub:"#4f7d5d",main:"#72f58b",error:"#ff647c",caret:"#72f58b"},
  cyber:{name:"cyber lime",bg:"#080b12",panel:"#10151e",panel2:"#171e2b",text:"#eff5ea",sub:"#697265",main:"#b8ff4f",error:"#ff647c",caret:"#b8ff4f"},
  ocean:{name:"ocean",bg:"#07141b",panel:"#0d2029",panel2:"#12303d",text:"#d9f3f8",sub:"#5d8790",main:"#5ee6ff",error:"#ff6f91",caret:"#5ee6ff"},
  dracula:{name:"dracula",bg:"#282a36",panel:"#303341",panel2:"#3a3d4c",text:"#f8f8f2",sub:"#7e8396",main:"#bd93f9",error:"#ff5555",caret:"#f1fa8c"},
  nord:{name:"nord",bg:"#2e3440",panel:"#3b4252",panel2:"#434c5e",text:"#eceff4",sub:"#7f8ba3",main:"#88c0d0",error:"#bf616a",caret:"#ebcb8b"},
  coffee:{name:"coffee",bg:"#1b1512",panel:"#251d19",panel2:"#30251f",text:"#e8ddd3",sub:"#76665a",main:"#d7a86e",error:"#d46a6a",caret:"#d7a86e"},
  cream:{name:"cream",bg:"#f4efe6",panel:"#e9e1d5",panel2:"#ddd2c3",text:"#4b433b",sub:"#988c80",main:"#b7791f",error:"#c05656",caret:"#b7791f"},
  light:{name:"light",bg:"#f5f6f8",panel:"#e8ebef",panel2:"#dce0e6",text:"#30343b",sub:"#8a9099",main:"#4767d7",error:"#cf4d5d",caret:"#4767d7"},
  amoled:{name:"amoled",bg:"#000000",panel:"#090909",panel2:"#131313",text:"#e9e9e9",sub:"#555555",main:"#ffffff",error:"#ff4d5f",caret:"#ffffff"}
};

const DEFAULT_SETTINGS={
  theme:"forge",customTheme:null,font:"'JetBrains Mono',monospace",fontSize:30,lines:3,
  sound:false,caret:"line",smoothCaret:true,liveWpm:true,liveAcc:true,liveProgress:true,
  difficulty:"normal",minWpm:0,minAccuracy:0,stopOnError:false,blind:false,freedom:false,
  punctuation:false,numbers:false,language:"english",listSize:200,mode:"time",time:60,wordCount:50
};

const state={
  user:null,settings:loadSettings(),activeArena:null,lastTestParams:null,
  dashboard:null,coach:null,globalCompetition:null,compRoom:null,multiRoom:null,compPoll:null,multiPoll:null,multiScheduled:null,
  tabArmedUntil:0,commandIndex:0
};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function loadSettings(){try{let raw=localStorage.getItem(SETTINGS_KEY);if(!raw){for(const k of LEGACY_SETTINGS_KEYS){raw=localStorage.getItem(k);if(raw)break;}}return{...DEFAULT_SETTINGS,...JSON.parse(raw||"{}")} ;}catch{return{...DEFAULT_SETTINGS};}}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(state.settings));applyTheme();syncSettingsUI();if(state.activeArena)state.activeArena.applyAppearance();}
function toast(msg,type="success"){const d=document.createElement("div");d.className=`toast ${type}`;d.textContent=msg;$("#toastContainer").appendChild(d);setTimeout(()=>d.remove(),3600);}
function busy(btn,on,text="loading..."){if(!btn)return;if(on){btn.dataset.old=btn.innerHTML;btn.disabled=true;btn.textContent=text;}else{btn.disabled=false;if(btn.dataset.old)btn.innerHTML=btn.dataset.old;}}
function initials(n){return String(n||"U").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"U";}
function formatDate(v,short=false){if(!v)return"—";const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat("id-ID",short?{day:"2-digit",month:"short"}:{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);}
async function api(action,payload={},auth=false){
  if(!API_URL||API_URL.includes("PASTE_YOUR"))throw new Error("API URL belum diatur.");
  const body={action,...payload};if(auth)body.token=localStorage.getItem(TOKEN_KEY)||"";
  const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body),redirect:"follow"});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();if(!d.ok)throw new Error(d.message||"request gagal");return d;
}

function applyTheme(){
  const t=state.settings.customTheme||THEMES[state.settings.theme]||THEMES.forge,r=document.documentElement.style;
  [["--bg",t.bg],["--panel",t.panel],["--panel2",t.panel2],["--text",t.text],["--sub",t.sub],["--main",t.main],["--error",t.error],["--caret",t.caret||t.main]].forEach(([k,v])=>r.setProperty(k,v));
  r.setProperty("--error-extra",t.error);r.setProperty("--font",state.settings.font);r.setProperty("--typing-size",`${state.settings.fontSize}px`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",t.bg);
}
function syncSettingsUI(){
  const s=state.settings;
  if($("#settingDifficulty")){$("#settingDifficulty").value=s.difficulty;$("#settingMinWpm").value=s.minWpm;$("#settingMinAccuracy").value=s.minAccuracy;$("#settingStopError").checked=s.stopOnError;$("#settingBlind").checked=s.blind;$("#settingFreedom").checked=s.freedom;$("#settingCaret").value=s.caret;$("#settingSmoothCaret").checked=s.smoothCaret;$("#settingSound").checked=s.sound;$("#settingFont").value=s.font;$("#settingFontSize").value=s.fontSize;$("#fontSizeLabel").textContent=`${s.fontSize}px`;$("#settingLines").value=String(s.lines);$("#settingLiveWpm").checked=s.liveWpm;$("#settingLiveAcc").checked=s.liveAcc;$("#settingLiveProgress").checked=s.liveProgress;}
  $("#togglePunctuation")?.classList.toggle("active",s.punctuation);$("#toggleNumbers")?.classList.toggle("active",s.numbers);$("#activeLanguageLabel").textContent=LANGUAGES.find(x=>x[0]===s.language)?.[1]||s.language;
  $$(".mode-chip").forEach(b=>b.classList.toggle("active",b.dataset.mode===s.mode));renderModeOptions();renderThemeGrid();
}
function renderThemeGrid(){
  const g=$("#themeGrid");if(!g)return;g.innerHTML=Object.entries(THEMES).map(([k,t])=>`<button class="theme-card ${!state.settings.customTheme&&state.settings.theme===k?"active":""}" data-theme="${k}" style="background:${t.bg};color:${t.text}"><div><i style="background:${t.main}"></i><i style="background:${t.text}"></i><i style="background:${t.error}"></i></div><span>${esc(t.name)}</span></button>`).join("");
  $$('[data-theme]',g).forEach(b=>b.onclick=()=>{state.settings.theme=b.dataset.theme;state.settings.customTheme=null;saveSettings();});
}
function fillLanguages(){
  const html=LANGUAGES.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");$$('.language-select').forEach(s=>{s.innerHTML=html;s.value=state.settings.language;});renderLanguageGrid();
}
function renderLanguageGrid(q=""){
  const g=$("#languageGrid");if(!g)return;const items=LANGUAGES.filter(x=>x[1].toLowerCase().includes(q.toLowerCase())||x[0].includes(q.toLowerCase()));
  g.innerHTML=items.map(([v,n])=>`<button class="language-choice ${state.settings.language===v?"active":""}" data-lang="${v}">${esc(n)}</button>`).join("");
  $$('[data-lang]',g).forEach(b=>b.onclick=()=>{state.settings.language=b.dataset.lang;saveSettings();$$('.language-select').forEach(s=>s.value=state.settings.language);closeLanguage();restartMain();});
}
function openLanguage(){$("#languageModal").classList.remove("hidden");$("#languageSearch").value="";renderLanguageGrid();setTimeout(()=>$("#languageSearch").focus(),50);}
function closeLanguage(){$("#languageModal").classList.add("hidden");}

function showAuth(){$("#authScreen").classList.remove("hidden");$("#appShell").classList.add("hidden");}
function showApp(){$("#authScreen").classList.add("hidden");$("#appShell").classList.remove("hidden");}
function authTab(tab){$$('[data-auth-tab]').forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));$("#loginForm").classList.toggle("hidden",tab!=="login");$("#registerForm").classList.toggle("hidden",tab!=="register");}
function applyUser(){if(!state.user)return;$("#headerAvatar").textContent=initials(state.user.displayName);$("#headerName").textContent=state.user.displayName.split(" ")[0];$("#profileAvatar").textContent=initials(state.user.displayName);$("#profileName").textContent=state.user.displayName;$("#profileUserId").textContent=`@${state.user.userId}`;$("#profileJoined").textContent=formatDate(state.user.createdAt,true);}
function navigate(page){
  if(page!=="type"&&state.activeArena?.context?.page==="type")state.activeArena.blur();
  $$('.page').forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));$$('[data-nav]').forEach(b=>b.classList.toggle("active",b.dataset.nav===page));
  if(page==="stats"){loadDashboard();loadHistory();}if(page==="coach")loadSmartCoach();if(page==="leaderboard")loadLeaderboard();if(page==="practice")loadPractice();if(page==="competition"){loadGlobalCompetition();loadCompetitionRooms();}if(page==="multiplayer")loadMultiRooms();if(page==="settings")syncSettingsUI();
}

async function bootstrap(){
  applyTheme();fillLanguages();wire();syncSettingsUI();
  try{await api("health");$("#apiFooter").textContent="api online";}catch{$("#apiFooter").textContent="api offline";}
  const token=localStorage.getItem(TOKEN_KEY);if(!token){showAuth();return;}
  try{const d=await api("me",{},true);state.user=d.user;applyUser();showApp();await loadDashboard();loadSmartCoach(true);loadGlobalCompetition();await restartMain();}catch{localStorage.removeItem(TOKEN_KEY);showAuth();toast("session ended — login again","error");}
}
async function login(e){e.preventDefault();const b=e.submitter;busy(b,true,"signing in...");try{const d=await api("login",{userId:$("#loginUserId").value.trim(),password:$("#loginPassword").value});localStorage.setItem(TOKEN_KEY,d.token);state.user=d.user;applyUser();showApp();await loadDashboard();loadSmartCoach(true);loadGlobalCompetition();await restartMain();toast("welcome back");}catch(err){toast(err.message,"error");}finally{busy(b,false);}}
async function register(e){e.preventDefault();const b=e.submitter;busy(b,true,"creating...");try{const d=await api("register",{displayName:$("#registerName").value.trim(),userId:$("#registerUserId").value.trim(),password:$("#registerPassword").value});localStorage.setItem(TOKEN_KEY,d.token);state.user=d.user;applyUser();showApp();await loadDashboard();loadSmartCoach(true);loadGlobalCompetition();await restartMain();toast("account created");}catch(err){toast(err.message,"error");}finally{busy(b,false);}}
function logout(){clearInterval(state.compPoll);clearInterval(state.multiPoll);state.activeArena?.destroy();localStorage.removeItem(TOKEN_KEY);state.user=null;showAuth();}

function renderModeOptions(){
  const box=$("#modeOptions"),m=state.settings.mode;if(!box)return;$("#customModePanel").classList.toggle("hidden",m!=="custom");if(m==="custom"){box.classList.add("hidden");return;}box.classList.remove("hidden");
  let html="";
  if(m==="time")html=[15,30,60,120].map(x=>`<button class="option-chip ${state.settings.time===x?"active":""}" data-time="${x}">${x}</button>`).join("")+`<button class="option-chip" data-time="custom">custom</button><span class="config-separator"></span>`;
  else if(m==="words")html=[10,25,50,100].map(x=>`<button class="option-chip ${state.settings.wordCount===x?"active":""}" data-wordcount="${x}">${x}</button>`).join("")+`<button class="option-chip" data-wordcount="custom">custom</button><span class="config-separator"></span>`;
  else if(m==="quote")html=`<button class="option-chip" data-quote="short">short</button><button class="option-chip active" data-quote="medium">medium</button><button class="option-chip" data-quote="long">long</button><button class="option-chip" data-quote="all">all</button><span class="config-separator"></span>`;
  else if(m==="zen")html=`<span class="option-chip active">free typing · untimed</span><span class="config-separator"></span>`;
  html+=`<button class="option-chip ${state.settings.listSize===200?"active":""}" data-list="200">top 200</button><button class="option-chip ${state.settings.listSize===1000?"active":""}" data-list="1000">1k</button>`;
  box.innerHTML=html;bindModeOptionButtons();
}
function bindModeOptionButtons(){
  $$('[data-time]').forEach(b=>b.onclick=()=>{if(b.dataset.time==="custom"){const x=prompt("duration in seconds (10–600)",String(state.settings.time));if(!x)return;state.settings.time=clamp(Number(x)||60,10,600);}else state.settings.time=Number(b.dataset.time);saveSettings();restartMain();});
  $$('[data-wordcount]').forEach(b=>b.onclick=()=>{if(b.dataset.wordcount==="custom"){const x=prompt("word count (1–500)",String(state.settings.wordCount));if(!x)return;state.settings.wordCount=clamp(Number(x)||50,1,500);}else state.settings.wordCount=Number(b.dataset.wordcount);saveSettings();restartMain();});
  $$('[data-list]').forEach(b=>b.onclick=()=>{state.settings.listSize=Number(b.dataset.list);saveSettings();restartMain();});
  $$('[data-quote]').forEach(b=>b.onclick=()=>{$$('[data-quote]').forEach(x=>x.classList.toggle("active",x===b));restartMain({quoteLength:b.dataset.quote});});
}
function currentMainParams(extra={}){const s=state.settings,m=s.mode,p={type:"typing",mode:m,language:s.language,listSize:s.listSize,punctuation:s.punctuation,numbers:s.numbers,...extra};if(m==="time")p.duration=s.time;if(m==="words")p.wordCount=s.wordCount;if(m==="quote")p.quoteLength=extra.quoteLength||"medium";if(m==="zen")p.duration=0;return p;}
async function restartMain(extra={}){if(!state.user)return;const m=state.settings.mode;if(m==="custom"){state.activeArena?.destroy();$("#mainArenaMount").innerHTML="";return;}await createArena("#mainArenaMount",currentMainParams(extra),{page:"type",main:true});}
async function launchCustom(){const text=$("#customTextInput").value.trim();if(text.length<5)return toast("custom text is too short","error");const duration=clamp(Number($("#customDurationInput").value)||0,0,600);await createArena("#mainArenaMount",{type:"typing",mode:"custom",language:"custom",customText:text,duration},{page:"type",main:true});}
async function createArena(selector,params,context={}){state.activeArena?.destroy();const mount=$(selector);mount.innerHTML=`<div class="muted-empty">generating test...</div>`;try{const d=await api("newTest",params,true);state.lastTestParams=params;state.activeArena=new Arena(mount,d.test,context);return state.activeArena;}catch(err){mount.innerHTML="";toast(err.message,"error");return null;}}

class Arena{
  constructor(mount,test,context){
    this.mount=mount;this.test=test;this.context=context;this.started=false;this.finished=false;this.failed=false;this.timer=null;this.roomTimer=null;this.startedPerf=0;this.elapsed=0;this.timeline=[];this.lastSample=0;this.wordStart=0;this.wordTimes=[];this.prevValue="";this.audio=null;
    mount.innerHTML="";mount.appendChild($("#arenaTemplate").content.cloneNode(true));this.root=$(".typing-engine",mount);this.stage=$("[data-stage]",this.root);this.passage=$("[data-passage]",this.root);this.zen=$("[data-zen]",this.root);this.input=$("[data-capture]",this.root);this.liveTime=$("[data-live-time]",this.root);this.liveWpm=$("[data-live-wpm]",this.root);this.liveAcc=$("[data-live-acc]",this.root);this.liveProgress=$("[data-live-progress]",this.root);this.result=$("[data-result]",this.root);this.failBox=$("[data-fail]",this.root);this.target=test.passage||"";this.mode=test.mode||"time";this.render("");this.applyAppearance();this.bind();this.updateMeta();setTimeout(()=>this.focus(),80);
  }
  applyAppearance(){this.root.classList.toggle("blind",state.settings.blind);this.root.classList.remove("caret-line","caret-block","caret-underline","smooth-caret");this.root.classList.add(`caret-${state.settings.caret}`);if(state.settings.smoothCaret)this.root.classList.add("smooth-caret");const h=Math.round(state.settings.fontSize*1.45*state.settings.lines);this.passage.style.height=`${h}px`;this.zen.style.minHeight=`${h}px`;this.liveWpm.classList.toggle("hidden",!state.settings.liveWpm);this.liveAcc.classList.toggle("hidden",!state.settings.liveAcc);this.liveProgress.classList.toggle("hidden",!state.settings.liveProgress);}
  updateMeta(){$("[data-meta-mode]",this.root).textContent=this.mode;$("[data-meta-language]",this.root).textContent=this.test.language||"";$("[data-meta-list]",this.root).textContent=this.test.listSize?`${this.test.listSize} words pool`:"";}
  bind(){this.stage.onclick=()=>this.focus();this.input.addEventListener("input",()=>this.onInput());this.input.addEventListener("paste",e=>{e.preventDefault();toast("paste disabled during test","error");});this.input.addEventListener("keydown",e=>this.onKeydown(e));$("[data-end-zen]",this.root).onclick=()=>this.finish();$("[data-repeat]",this.root).onclick=()=>this.repeat();$("[data-next]",this.root).onclick=()=>this.next();$("[data-repeat-fail]",this.root).onclick=()=>this.repeat();$("[data-close-fail]",this.root).onclick=()=>this.closeFail();$("[data-practice-missed]",this.root).onclick=()=>this.practiceWords(this.missedWords||[]);$("[data-practice-slow]",this.root).onclick=()=>this.practiceWords(this.slowWords||[]);}
  focus(){if(this.finished||this.failed)return;this.input.focus({preventScroll:true});this.stage.classList.add("focused");}
  blur(){this.input.blur();}
  clickSound(){if(!state.settings.sound)return;try{this.audio=this.audio||new(window.AudioContext||window.webkitAudioContext)();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type="square";o.frequency.value=90+Math.random()*100;g.gain.setValueAtTime(.018,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.022);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+.024);}catch{}}
  onKeydown(e){if(e.key.length===1||e.key==="Backspace")this.clickSound();if(e.key==="Backspace"&&!state.settings.freedom&&this.input.selectionStart===this.input.value.length&&this.input.value.endsWith(" ")){e.preventDefault();return;}}
  render(value){if(this.mode==="zen"){this.passage.classList.add("hidden");this.zen.classList.remove("hidden");this.zen.innerHTML=value?`${esc(value)}<span class="char current"></span>`:`<span class="zen-placeholder">start typing anything...</span><span class="char current"></span>`;$("[data-end-zen]",this.root)?.classList.remove("hidden");return;}let html="";for(let i=0;i<this.target.length;i++){let c="char";if(i<value.length)c+=value[i]===this.target[i]?" correct":" incorrect";else if(i===value.length)c+=" current";html+=`<span class="${c}">${esc(this.target[i])}</span>`;}this.passage.innerHTML=html;const cur=$(".current",this.passage);if(cur)cur.scrollIntoView({block:"center"});}
  metrics(){const v=this.input.value;if(this.mode==="zen"){const mins=Math.max(this.elapsed,1)/60;return{correct:v.length,incorrect:0,extra:0,missed:0,errors:0,wpm:(v.length/5)/mins,raw:(v.length/5)/mins,accuracy:100,progress:0};}let correct=0,incorrect=0;for(let i=0;i<v.length;i++)v[i]===this.target[i]?correct++:incorrect++;const extra=Math.max(0,v.length-this.target.length),missed=Math.max(0,this.target.length-v.length),mins=Math.max(this.elapsed,1)/60;return{correct,incorrect,extra,missed,errors:incorrect+extra,wpm:(correct/5)/mins,raw:(v.length/5)/mins,accuracy:v.length?correct/v.length*100:100,progress:this.target.length?clamp(v.length/this.target.length*100,0,100):0};}
  async start(){if(this.started)return;this.started=true;this.startedPerf=performance.now();this.wordStart=this.startedPerf;$("#typingConfig")?.classList.add("dimmed");api("startTest",{testId:this.test.testId},true).catch(()=>{});this.timer=setInterval(()=>this.tick(),100);if(this.context.roomId)this.roomTimer=setInterval(()=>this.pushRoomProgress(),POLL_MS);}
  tick(){this.elapsed=(performance.now()-this.startedPerf)/1000;const m=this.metrics();let shown;if(this.mode==="time"||(this.mode==="custom"&&Number(this.test.duration)>0))shown=Math.max(0,Number(this.test.duration)-this.elapsed);else shown=this.elapsed;this.liveTime.textContent=this.mode==="time"||(this.mode==="custom"&&Number(this.test.duration)>0)?Math.ceil(shown):shown.toFixed(0);this.liveWpm.textContent=`${Math.round(m.wpm)} wpm`;this.liveAcc.textContent=`${Math.round(m.accuracy)}% acc`;this.liveProgress.textContent=this.mode==="zen"?"zen":`${Math.round(m.progress)}%`;if(this.elapsed-this.lastSample>=1){this.timeline.push({t:this.elapsed,wpm:m.wpm,raw:m.raw,errors:m.errors});this.lastSample=this.elapsed;}if(this.elapsed>=5){if(state.settings.minWpm>0&&m.wpm<state.settings.minWpm)return this.fail(`minimum ${state.settings.minWpm} wpm not met`);if(state.settings.minAccuracy>0&&m.accuracy<state.settings.minAccuracy)return this.fail(`minimum ${state.settings.minAccuracy}% accuracy not met`);}if((this.mode==="time"||(this.mode==="custom"&&Number(this.test.duration)>0))&&this.elapsed>=Number(this.test.duration))this.finish();}
  onInput(){if(this.finished||this.failed)return;const v=this.input.value;if(!this.started&&v.length)this.start();if(this.mode!=="zen"&&v.length>this.target.length)this.input.value=v.slice(0,this.target.length);const nowVal=this.input.value;this.render(nowVal);this.trackWords(nowVal);if(this.mode!=="zen"){const idx=nowVal.length-1;if(idx>=0&&nowVal[idx]!==this.target[idx]){if(state.settings.stopOnError||state.settings.difficulty==="master")return this.fail("wrong character");}if(state.settings.difficulty==="expert"&&nowVal.endsWith(" ")){const typedWords=nowVal.trimEnd().split(/\s+/),targetWords=this.target.trim().split(/\s+/),i=typedWords.length-1;if(typedWords[i]!==targetWords[i])return this.fail("incorrect word in expert mode");}if(nowVal.length>=this.target.length&&(this.mode==="words"||this.mode==="quote"||(this.mode==="custom"&&Number(this.test.duration)===0)))this.finish();}this.prevValue=nowVal;}
  trackWords(v){if(this.mode==="zen")return;if(v.length>this.prevValue.length&&(v.endsWith(" ")||v.length===this.target.length)){const now=performance.now(),idx=v.trimEnd().split(/\s+/).length-1,word=this.target.trim().split(/\s+/)[idx]||"";if(word)this.wordTimes.push({word,ms:now-this.wordStart});this.wordStart=now;}}
  fail(reason){if(this.failed||this.finished)return;this.failed=true;clearInterval(this.timer);clearInterval(this.roomTimer);this.input.disabled=true;this.stage.classList.add("hidden");this.failBox.classList.remove("hidden");$("[data-fail-reason]",this.failBox).textContent=reason;$("#typingConfig")?.classList.remove("dimmed");}
  closeFail(){this.destroy();if(this.context.main)restartMain();}
  async finish(){if(this.finished||this.failed||!this.input.value.length)return;this.finished=true;clearInterval(this.timer);clearInterval(this.roomTimer);this.input.disabled=true;if(!this.elapsed&&this.started)this.elapsed=(performance.now()-this.startedPerf)/1000;try{const local=this.localAnalytics();const d=await api("finishTest",{testId:this.test.testId,typedText:this.input.value,consistency:local.consistency,slowWords:local.slow||[]},true);this.showResult(d.result,local);loadDashboard();if(this.context.globalCompetition)loadGlobalCompetition();if(this.context.roomId)this.pushRoomProgress(true);}catch(err){this.finished=false;this.input.disabled=false;toast(err.message,"error");}finally{$("#typingConfig")?.classList.remove("dimmed");}}
  localAnalytics(){const m=this.metrics(),vals=this.timeline.map(x=>x.wpm).filter(Number.isFinite),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,sd=vals.length?Math.sqrt(vals.reduce((s,x)=>s+(x-avg)**2,0)/vals.length):0,consistency=avg?clamp(100-(sd/avg*100),0,100):100;const slow=this.wordTimes.slice().sort((a,b)=>b.ms-a.ms).slice(0,8).map(x=>x.word);return{...m,consistency,slow:[...new Set(slow)]};}
  showResult(r,local){this.stage.classList.add("hidden");$(".live-row",this.root).classList.add("hidden");$(".arena-bottom",this.root).classList.add("hidden");this.result.classList.remove("hidden");$("[data-result-wpm]",this.result).textContent=Math.round(r.wpm);$("[data-result-acc]",this.result).textContent=`${Number(r.accuracy).toFixed(1)}%`;$("[data-result-raw]",this.result).textContent=Math.round(r.rawWpm);$("[data-result-consistency]",this.result).textContent=`${Math.round(local.consistency)}%`;const cs=r.characterStats||{correct:r.correctChars||0,incorrect:r.errors||0,extra:0,missed:0};$("[data-result-chars]",this.result).textContent=`${cs.correct}/${cs.incorrect}/${cs.extra}/${cs.missed}`;$("[data-result-time]",this.result).textContent=`${Number(r.elapsed||this.elapsed).toFixed(1)}s`;$("[data-result-mode]",this.result).textContent=`${this.mode} · ${this.test.language}`;$("[data-result-xp]",this.result).textContent=`+${r.points||0}`;this.missedWords=Object.keys(r.wordErrorMap||{}).slice(0,12);this.slowWords=(r.slowWords&&r.slowWords.length?r.slowWords:local.slow)||[];$("[data-practice-missed]",this.result).classList.toggle("hidden",!this.missedWords.length);$("[data-practice-slow]",this.result).classList.toggle("hidden",!this.slowWords.length);this.renderHeat(r.errorMap||{});this.renderWords();this.drawChart();this.result.scrollIntoView({behavior:"smooth",block:"start"});}
  renderHeat(map){const box=$("[data-heatmap]",this.result),e=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,25),max=Math.max(1,...e.map(x=>x[1]));box.innerHTML=e.length?e.map(([c,n])=>`<span class="heat-tile" style="--heat:${(.16+.74*n/max).toFixed(2)}"><b>${esc(c===" "?"␠":c)}</b><small>${n}×</small></span>`).join(""):`<span class="muted-empty">no errors</span>`;}
  renderWords(){$("[data-missed-list]",this.result).innerHTML=this.missedWords.length?this.missedWords.map(w=>`<span class="word-chip">${esc(w)}</span>`).join(""):`<span class="muted-empty">none</span>`;$("[data-slow-list]",this.result).innerHTML=this.slowWords.length?this.slowWords.map(w=>`<span class="word-chip">${esc(w)}</span>`).join(""):`<span class="muted-empty">none</span>`;}
  drawChart(){const c=$("[data-result-chart]",this.result),rect=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(320,rect.width),h=210;c.width=w*dpr;c.height=h*dpr;const x=c.getContext("2d");x.scale(dpr,dpr);x.clearRect(0,0,w,h);const arr=this.timeline.length?this.timeline:[{t:this.elapsed,wpm:this.metrics().wpm,raw:this.metrics().raw,errors:this.metrics().errors}],max=Math.max(40,...arr.map(a=>a.raw))*1.15;x.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue("--line");x.lineWidth=1;for(let i=1;i<5;i++){x.beginPath();x.moveTo(0,i*h/5);x.lineTo(w,i*h/5);x.stroke();}const draw=(key,color,width=2)=>{x.strokeStyle=color;x.lineWidth=width;x.beginPath();arr.forEach((a,i)=>{const px=arr.length===1?w/2:i/(arr.length-1)*(w-10)+5,py=h-8-(a[key]/max)*(h-20);i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();};const css=getComputedStyle(document.documentElement);draw("raw",css.getPropertyValue("--sub"),1.2);draw("wpm",css.getPropertyValue("--main"),2.2);x.fillStyle=css.getPropertyValue("--error");arr.forEach((a,i)=>{if(a.errors>0){const px=arr.length===1?w/2:i/(arr.length-1)*(w-10)+5;x.fillRect(px-1,h-7,2,-Math.min(30,a.errors*4));}});}
  async practiceWords(words){if(!words.length)return;const repeated=[];for(let i=0;i<8;i++)repeated.push(...words);navigate("type");state.settings.mode="custom";saveSettings();$("#customTextInput").value=repeated.join(" ");$("#customDurationInput").value=0;await launchCustom();}
  async repeat(){const p=this.test.request||state.lastTestParams||currentMainParams();if(this.context.main)await createArena("#mainArenaMount",p,{page:"type",main:true});else if(this.context.globalCompetition){await startGlobalCompetition();}else if(this.context.roomId){const sel=this.context.type==="competition"?"#competitionArenaMount":"#multiArenaMount";await createArena(sel,p,this.context);}}
  async next(){if(this.context.main){state.settings.mode=this.mode==="custom"?"time":state.settings.mode;saveSettings();await restartMain();}else this.destroy();}
  async pushRoomProgress(final=false){if(!this.context.roomId||(!this.started&&!final))return;const m=this.metrics();api("roomProgress",{roomId:this.context.roomId,progress:final?100:Math.round(m.progress),wpm:Math.round(m.wpm),accuracy:Math.round(m.accuracy)},true).catch(()=>{});}
  destroy(){clearInterval(this.timer);clearInterval(this.roomTimer);this.mount.innerHTML="";if(state.activeArena===this)state.activeArena=null;$("#typingConfig")?.classList.remove("dimmed");}
}


async function loadSmartCoach(silent=false){
  if(!state.user)return;
  try{
    const d=await api("smartCoach",{},true);state.coach=d;
    const r=d.recommendation||{},weak=d.weakWords||[],chars=d.weakChars||[],signal=d.signal||{};
    const title=r.title||"Build your baseline";
    const text=r.text||"Complete a few tests so TypeForge can personalize your drills.";
    if($("#smartStripTitle"))$("#smartStripTitle").textContent=title;
    if($("#smartStripText"))$("#smartStripText").textContent=text;
    if($("#coachRecommendationTitle"))$("#coachRecommendationTitle").textContent=title;
    if($("#coachRecommendationText"))$("#coachRecommendationText").textContent=text;
    if($("#coachRecommendationTags"))$("#coachRecommendationTags").innerHTML=(r.tags||[]).map(x=>`<span class="coach-tag">${esc(x)}</span>`).join("");
    if($("#coachTodayTests"))$("#coachTodayTests").textContent=`${d.today?.tests||0} tests · ${d.today?.points||0} xp`;
    if($("#dailyChallengeText"))$("#dailyChallengeText").textContent=`60 seconds · top 200 · ${LANGUAGES.find(x=>x[0]===state.settings.language)?.[1]||state.settings.language}`;
    if($("#coachWeakWords"))$("#coachWeakWords").innerHTML=weak.length?weak.map(x=>`<span class="coach-word">${esc(x.word)} <b>${x.score}</b></span>`).join(""):`<span class="muted-empty">No repeated weak words yet.</span>`;
    if($("#coachWeakChars"))$("#coachWeakChars").innerHTML=chars.length?chars.slice(0,15).map(x=>`<span class="coach-char"><b>${esc(x.char===" "?"␠":x.char)}</b><small>${x.count}×</small></span>`).join(""):`<span class="muted-empty">No recurring character errors yet.</span>`;
    if($("#coachSignal"))$("#coachSignal").textContent=signal.label||"building baseline";
    if($("#coachSpeedBar"))$("#coachSpeedBar").style.width=`${clamp(signal.speed||0,0,100)}%`;
    if($("#coachAccuracyBar"))$("#coachAccuracyBar").style.width=`${clamp(signal.accuracy||0,0,100)}%`;
    if($("#coachConsistencyBar"))$("#coachConsistencyBar").style.width=`${clamp(signal.consistency||0,0,100)}%`;
  }catch(e){if(!silent)toast(e.message,"error");}
}
async function startSmartPractice(){
  navigate("type");const mount="#mainArenaMount";if($(mount))$(mount).innerHTML=`<div class="muted-empty">building adaptive drill...</div>`;
  try{const d=await api("smartTest",{language:state.settings.language},true);state.activeArena?.destroy();const el=$(mount);el.innerHTML="";state.activeArena=new Arena(el,d.test,{page:"type",main:true});state.lastTestParams=d.test.request||null;}
  catch(e){toast(e.message,"error");restartMain();}
}
async function startDailyChallenge(){
  navigate("type");const mount="#mainArenaMount";if($(mount))$(mount).innerHTML=`<div class="muted-empty">loading today's challenge...</div>`;
  try{const d=await api("dailyChallenge",{language:state.settings.language},true);state.activeArena?.destroy();const el=$(mount);el.innerHTML="";state.activeArena=new Arena(el,d.test,{page:"type",main:true});state.lastTestParams=d.test.request||null;}
  catch(e){toast(e.message,"error");restartMain();}
}
async function practiceCoachWeakWords(){
  const words=(state.coach?.weakWords||[]).map(x=>x.word).slice(0,16);if(!words.length)return startSmartPractice();
  navigate("type");state.settings.mode="custom";saveSettings();$("#customTextInput").value=Array.from({length:8},()=>words).flat().join(" ");$("#customDurationInput").value=0;await launchCustom();
}

async function loadDashboard(){if(!state.user)return;try{const d=await api("dashboardV4",{},true);state.dashboard=d;const s=d.stats||{},p=d.progression||{},recent=d.recent||[];$("#statBestWpm").textContent=s.bestWpm||0;$("#statAvgWpm").textContent=s.avgWpm||0;$("#statAccuracy").textContent=s.avgAccuracy||0;$("#statTests").textContent=s.totalTests||0;$("#headerLevel").textContent=p.level||1;$("#levelNumber").textContent=p.level||1;$("#pointsTotal").textContent=p.points||0;$("#xpText").textContent=`${p.currentLevelXp||0} / ${p.nextLevelXp||500} xp`;$("#xpBar").style.width=`${p.percent||0}%`;if($("#typeQuickLevel"))$("#typeQuickLevel").textContent=p.level||1;if($("#typeQuickBest"))$("#typeQuickBest").textContent=s.bestWpm||0;if($("#typeQuickAverage"))$("#typeQuickAverage").textContent=s.avgWpm||0;if($("#typeQuickAccuracy"))$("#typeQuickAccuracy").textContent=`${s.avgAccuracy||0}%`;if($("#typeQuickTests"))$("#typeQuickTests").textContent=s.totalTests||0;renderTypeRecent(recent);renderAchievements(d.achievements||[]);drawPerformance(recent.slice().reverse());}catch(err){if(/session/i.test(err.message))logout();}}
function renderAchievements(a){$("#achievementGrid").innerHTML=a.map(x=>`<div class="achievement ${x.unlocked?"":"locked"}"><i>${x.icon}</i><b>${esc(x.name)}</b><small>${esc(x.description)}</small></div>`).join("");}
function drawPerformance(items){const c=$("#performanceChart");if(!c)return;const r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(300,r.width),h=210;c.width=w*dpr;c.height=h*dpr;const x=c.getContext("2d");x.scale(dpr,dpr);x.clearRect(0,0,w,h);const css=getComputedStyle(document.documentElement);x.strokeStyle=css.getPropertyValue("--line");for(let i=1;i<5;i++){x.beginPath();x.moveTo(0,i*h/5);x.lineTo(w,i*h/5);x.stroke();}if(!items.length)return;const vals=items.map(i=>Number(i.wpm)||0),max=Math.max(40,...vals)*1.15;x.strokeStyle=css.getPropertyValue("--main");x.lineWidth=2;x.beginPath();vals.forEach((v,i)=>{const px=items.length===1?w/2:i/(items.length-1)*(w-10)+5,py=h-10-v/max*(h-22);i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();}
function renderTypeRecent(items=[]){const box=$("#typeRecentList");if(!box)return;box.innerHTML=items.length?items.slice(0,5).map(x=>`<div class="type-recent-item"><div><strong>${Math.round(x.wpm||0)} WPM</strong><small>${Number(x.accuracy||0).toFixed(1)}% accuracy · ${esc(x.mode||x.type||"time")} · ${esc(x.language||"")}</small></div><span>${formatDate(x.createdAt,true)}</span></div>`).join(""):`<div class="muted-empty">Complete a few tests and your recent results will appear here.</div>`;}

async function loadHistory(){const b=$("#historyBody");b.innerHTML=`<tr><td colspan="8">loading...</td></tr>`;try{const d=await api("history",{limit:100},true);b.innerHTML=d.items.length?d.items.map(x=>`<tr><td>${formatDate(x.createdAt)}</td><td><strong>${Math.round(x.wpm)}</strong></td><td>${Math.round(x.rawWpm)}</td><td>${Number(x.accuracy).toFixed(1)}%</td><td>${x.errors}</td><td>${esc(x.mode||x.type)}</td><td>${esc(x.language)}</td><td>${x.points||0}</td></tr>`).join(""):`<tr><td colspan="8">no history yet</td></tr>`;}catch(e){b.innerHTML=`<tr><td colspan="8">${esc(e.message)}</td></tr>`;}}
async function loadLeaderboard(){const b=$("#leaderboardBody");b.innerHTML=`<tr><td colspan="7">loading...</td></tr>`;try{const d=await api("leaderboard",{limit:100});b.innerHTML=d.items.length?d.items.map((x,i)=>`<tr><td class="rank">${i+1}</td><td><div class="table-user"><span class="mini-avatar">${initials(x.displayName)}</span><b>${esc(x.displayName)}</b></div></td><td><strong>${Math.round(x.wpm)}</strong></td><td>${Number(x.accuracy).toFixed(1)}%</td><td>${esc(x.mode||x.type)}</td><td>${esc(x.language)}</td><td>${formatDate(x.createdAt,true)}</td></tr>`).join(""):`<tr><td colspan="7">no scores yet</td></tr>`;}catch(e){b.innerHTML=`<tr><td colspan="7">${esc(e.message)}</td></tr>`;}}
async function loadGlobalCompetition(){
  if(!state.user)return;const body=$("#globalCompetitionBody"),btn=$("#startGlobalCompetitionBtn"),quickBtn=$("#quickStartCupBtn");if(body&&!body.dataset.ready)body.innerHTML=`<tr><td colspan="5">loading global cup...</td></tr>`;
  try{const d=await api("globalCompetition",{},true),c=d.competition||{};state.globalCompetition=c;
    if($("#globalCompetitionDate"))$("#globalCompetitionDate").textContent=c.date||"today";
    if($("#globalCompetitionPlayers"))$("#globalCompetitionPlayers").textContent=c.participants||0;
    if($("#globalCompetitionRank"))$("#globalCompetitionRank").textContent=c.rank?`#${c.rank}`:"—";
    if($("#globalCompetitionAttempts"))$("#globalCompetitionAttempts").textContent=`${c.attemptsUsed||0}/${c.maxAttempts||3}`;
    if($("#globalCompetitionBest"))$("#globalCompetitionBest").textContent=c.myBest?`${Math.round(c.myBest.wpm)} wpm`:"—";
    if($("#globalCompetitionBestMeta"))$("#globalCompetitionBestMeta").textContent=c.myBest?`${Number(c.myBest.accuracy).toFixed(1)}% accuracy · best attempt`:"complete an attempt to enter the ranking";
    if($("#typeCupPlayers"))$("#typeCupPlayers").textContent=c.participants||0;
    if($("#typeCupRank"))$("#typeCupRank").textContent=c.rank?`#${c.rank}`:"—";
    if($("#typeCupAttempts"))$("#typeCupAttempts").textContent=`${c.attemptsUsed||0}/${c.maxAttempts||3}`;
    if($("#typeCupBest"))$("#typeCupBest").textContent=c.myBest?`${Math.round(c.myBest.wpm)} WPM`:"—";
    if($("#typeCupMeta"))$("#typeCupMeta").textContent=c.myBest?`${Number(c.myBest.accuracy).toFixed(1)}% accuracy · best attempt`:"complete an attempt to join the board";
    const left=Math.max(0,(c.maxAttempts||3)-(c.attemptsUsed||0));
    if(btn){btn.disabled=left<=0;btn.textContent=left>0?`start global attempt · ${left} left`:"daily attempts completed";}
    if(quickBtn){quickBtn.disabled=left<=0;quickBtn.textContent=left>0?`start daily cup · ${left} left`:"daily attempts completed";}
    if(body){body.dataset.ready="1";const leaders=c.leaders||[];body.innerHTML=leaders.length?leaders.map(x=>`<tr class="${x.userId===state.user.userId?"is-me":""}"><td class="rank">${x.rank}</td><td><div class="table-user"><span class="mini-avatar">${initials(x.displayName)}</span><b>${esc(x.displayName)}</b>${x.userId===state.user.userId?'<small class="you-tag">you</small>':''}</div></td><td><strong>${Math.round(x.wpm)}</strong></td><td>${Number(x.accuracy).toFixed(1)}%</td><td>${formatDate(x.createdAt,true)}</td></tr>`).join(""):`<tr><td colspan="5">Be the first player on today's board.</td></tr>`;}
  }catch(e){if(body)body.innerHTML=`<tr><td colspan="5">${esc(e.message)}</td></tr>`;if(btn)btn.disabled=true;if(quickBtn)quickBtn.disabled=true;}
}
async function startGlobalCompetition(){
  const btn=$("#startGlobalCompetitionBtn");busy(btn,true,"preparing same passage...");
  try{const d=await api("globalCompetitionTest",{},true);state.activeArena?.destroy();const mount=$("#globalCompetitionArenaMount");mount.innerHTML="";state.activeArena=new Arena(mount,d.test,{page:"competition",globalCompetition:true});state.lastTestParams=d.test.request||null;mount.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>state.activeArena?.focus(),120);}
  catch(e){toast(e.message,"error");loadGlobalCompetition();}finally{busy(btn,false);}
}

async function loadPractice(){const box=$("#practiceList");box.textContent="loading...";try{const d=await api("listPracticeTexts",{limit:80});box.innerHTML=d.items.length?d.items.map(x=>`<div class="practice-card"><h4>${esc(x.title)}</h4><p>${esc(x.preview)}</p><div class="practice-meta"><span>${esc(x.language)} · ${esc(x.displayName)} · ${x.length} chars</span><button class="ghost-button" data-practice="${x.textId}">practice</button></div></div>`).join(""):`<div class="muted-empty">no community texts yet</div>`;$$('[data-practice]',box).forEach(b=>b.onclick=()=>startPractice(b.dataset.practice));}catch(e){box.textContent=e.message;}}
async function submitPractice(){const b=$("#submitPracticeBtn");busy(b,true,"publishing...");try{await api("createPracticeText",{title:$("#practiceTitle").value.trim(),language:$("#practiceLanguage").value,content:$("#practiceContent").value.trim()},true);$("#practiceTitle").value="";$("#practiceContent").value="";toast("text published");loadPractice();}catch(e){toast(e.message,"error");}finally{busy(b,false);}}
async function startPractice(id){await createArena("#practiceArenaMount",{type:"practice",sourceId:id},{page:"practice"});$("#practiceArenaMount").scrollIntoView({behavior:"smooth"});}

function roomRow(x,type){const icon=type==="competition"?"🏆":"⚔";return `<div class="room-row"><div class="room-icon">${icon}</div><div class="room-copy"><div class="room-title-line"><h4>${esc(x.name)}</h4><span class="status-pill">${esc(x.status||"open")}</span></div><p>${esc(x.language)} · top ${x.listSize} · ${x.duration}s</p><div class="room-capacity"><span style="width:${clamp((x.playerCount/Math.max(1,x.maxPlayers))*100,0,100)}%"></span></div><small>${x.playerCount}/${x.maxPlayers} players</small></div><button class="ghost-button compact" data-room-code="${esc(x.code)}" data-room-kind="${type}">join</button></div>`;}
function bindRoomButtons(){$$('[data-room-code]').forEach(b=>b.onclick=()=>joinRoom(b.dataset.roomKind,b.dataset.roomCode));}
async function loadCompetitionRooms(){if(state.compRoom)return;const box=$("#competitionList");box.textContent="loading...";try{const d=await api("listRooms",{type:"competition"});box.innerHTML=d.items.length?d.items.map(x=>roomRow(x,"competition")).join(""):`<div class="muted-empty">no public competitions</div>`;bindRoomButtons();}catch(e){box.textContent=e.message;}}
async function loadMultiRooms(){if(state.multiRoom)return;const box=$("#multiList");box.textContent="loading...";try{const d=await api("listRooms",{type:"multiplayer"});box.innerHTML=d.items.length?d.items.map(x=>roomRow(x,"multiplayer")).join(""):`<div class="muted-empty">no public races</div>`;bindRoomButtons();}catch(e){box.textContent=e.message;}}
async function createRoom(type){const comp=type==="competition",b=$(comp?"#createCompetitionBtn":"#createMultiBtn");busy(b,true,"creating...");try{const d=await api("createRoom",{type,name:$(comp?"#compName":"#multiName").value.trim(),visibility:$(comp?"#compVisibility":"#multiVisibility").value,maxPlayers:Number($(comp?"#compMax":"#multiMax").value),language:$(comp?"#compLanguage":"#multiLanguage").value,listSize:Number($(comp?"#compList":"#multiListSize").value),duration:Number($(comp?"#compDuration":"#multiDuration").value)},true);enterRoom(type,d.room.roomId);}catch(e){toast(e.message,"error");}finally{busy(b,false);}}
async function joinRoom(type,code){try{const d=await api("joinRoom",{type,code:String(code||"").trim().toUpperCase()},true);enterRoom(type,d.room.roomId);}catch(e){toast(e.message,"error");}}
function enterRoom(type,id){if(type==="competition"){state.compRoom=id;$("#competitionHome").classList.add("hidden");$("#competitionRoom").classList.remove("hidden");clearInterval(state.compPoll);state.compPoll=setInterval(()=>refreshRoom("competition"),POLL_MS);}else{state.multiRoom=id;$("#multiHome").classList.add("hidden");$("#multiRoom").classList.remove("hidden");clearInterval(state.multiPoll);state.multiPoll=setInterval(()=>refreshRoom("multiplayer"),POLL_MS);}refreshRoom(type);}
async function refreshRoom(type){const id=type==="competition"?state.compRoom:state.multiRoom;if(!id)return;try{const d=await api("roomState",{roomId:id},true),r=d.room,p=d.players||[];if(type==="competition"){$("#compRoomName").textContent=r.name;$("#compRoomCode").textContent=r.code;$("#competitionPlayers").innerHTML=renderPlayers(p,false);const me=p.find(x=>x.userId===state.user.userId);$("#startCompetitionTestBtn").disabled=!!me?.finished;}else{$("#multiRoomName").textContent=r.name;$("#multiRoomCode").textContent=r.code;$("#multiPlayers").innerHTML=renderPlayers(p,true);const me=p.find(x=>x.userId===state.user.userId);$("#multiReadyBtn").textContent=me?.ready?"ready ✓":"i'm ready";$("#multiStartBtn").classList.toggle("hidden",r.hostUserId!==state.user.userId||r.status!=="OPEN");if(r.status==="STARTED"&&r.startAt)scheduleRace(r);}}catch(e){console.warn(e);}}
function renderPlayers(p,race){return p.slice().sort((a,b)=>(b.finished-a.finished)||(b.wpm-a.wpm)||(b.progress-a.progress)).map((x,i)=>`<div class="player-row"><div class="player-rank">${i+1}</div><div class="player-name"><strong>${esc(x.displayName)}</strong><small>${race?(x.ready?"ready":"waiting"):(x.finished?"finished":"typing")}</small><div class="player-progress"><span style="width:${clamp(x.progress,0,100)}%"></span></div></div><div class="player-stat">${Math.round(x.wpm)} wpm</div><div class="player-stat">${Math.round(x.progress)}%</div></div>`).join("");}
async function startCompetition(){if(!state.compRoom)return;await createArena("#competitionArenaMount",{type:"competition",sourceId:state.compRoom},{page:"competition",roomId:state.compRoom,type:"competition"});}
async function toggleReady(){try{await api("roomReady",{roomId:state.multiRoom},true);refreshRoom("multiplayer");}catch(e){toast(e.message,"error");}}
async function startRace(){try{await api("startRoom",{roomId:state.multiRoom},true);refreshRoom("multiplayer");}catch(e){toast(e.message,"error");}}
function scheduleRace(room){if(state.multiScheduled===room.roomId||state.activeArena?.context?.roomId===room.roomId)return;state.multiScheduled=room.roomId;const start=new Date(room.startAt).getTime(),box=$("#multiCountdown");box.classList.remove("hidden");const tick=()=>{const left=Math.max(0,Math.ceil((start-Date.now())/1000));box.textContent=left||"go";if(Date.now()<start)setTimeout(tick,180);else{setTimeout(()=>box.classList.add("hidden"),650);launchRace(room);}};tick();}
async function launchRace(room){const a=await createArena("#multiArenaMount",{type:"multiplayer",sourceId:room.roomId},{page:"multiplayer",roomId:room.roomId,type:"multiplayer"});if(a)a.start();}
function leaveRoom(type){state.activeArena?.destroy();if(type==="competition"){clearInterval(state.compPoll);state.compRoom=null;$("#competitionRoom").classList.add("hidden");$("#competitionHome").classList.remove("hidden");loadCompetitionRooms();}else{clearInterval(state.multiPoll);state.multiRoom=null;state.multiScheduled=null;$("#multiRoom").classList.add("hidden");$("#multiHome").classList.remove("hidden");loadMultiRooms();}}
function copyCode(el){navigator.clipboard?.writeText(el.textContent).then(()=>toast("room code copied"));}

const COMMANDS=[
  ["Restart test","restart",()=>state.activeArena?state.activeArena.repeat():restartMain()],
  ["Mode: Time","typing mode",()=>setMode("time")],["Mode: Words","typing mode",()=>setMode("words")],["Mode: Quote","typing mode",()=>setMode("quote")],["Mode: Zen","typing mode",()=>setMode("zen")],["Mode: Custom","typing mode",()=>setMode("custom")],
  ["Time: 15 seconds","time",()=>setTime(15)],["Time: 30 seconds","time",()=>setTime(30)],["Time: 60 seconds","time",()=>setTime(60)],["Time: 120 seconds","time",()=>setTime(120)],
  ["Toggle punctuation","input",()=>{state.settings.punctuation=!state.settings.punctuation;saveSettings();restartMain();}],
  ["Toggle numbers","input",()=>{state.settings.numbers=!state.settings.numbers;saveSettings();restartMain();}],
  ["Change language","language",()=>openLanguage()],["Open Smart Coach","navigation",()=>navigate("coach")],["Start Smart Practice","smart",()=>startSmartPractice()],["Daily Challenge","smart",()=>startDailyChallenge()],["Open leaderboard","navigation",()=>navigate("leaderboard")],["Open stats","navigation",()=>navigate("stats")],["Open settings","navigation",()=>navigate("settings")],["Open competition","navigation",()=>navigate("competition")],["Start Global Daily Cup","competition",()=>{navigate("competition");startGlobalCompetition();}],["Open multiplayer","navigation",()=>navigate("multiplayer")],
  ["Theme: Forge","theme",()=>setTheme("forge")],["Theme: Midnight","theme",()=>setTheme("midnight")],["Theme: Cyber Lime","theme",()=>setTheme("cyber")],["Theme: AMOLED","theme",()=>setTheme("amoled")]
];
function setMode(m){state.settings.mode=m;saveSettings();closeCommands();restartMain();}
function setTime(t){state.settings.mode="time";state.settings.time=t;saveSettings();closeCommands();restartMain();}
function setTheme(t){state.settings.theme=t;state.settings.customTheme=null;saveSettings();closeCommands();}
function openCommands(){state.commandIndex=0;$("#commandPalette").classList.remove("hidden");$("#commandSearch").value="";renderCommands();setTimeout(()=>$("#commandSearch").focus(),30);}
function closeCommands(){$("#commandPalette").classList.add("hidden");state.activeArena?.focus();}
function renderCommands(){const q=$("#commandSearch").value.toLowerCase(),items=COMMANDS.filter(c=>`${c[0]} ${c[1]}`.toLowerCase().includes(q));state.commandIndex=clamp(state.commandIndex,0,Math.max(0,items.length-1));$("#commandResults").innerHTML=items.map((c,i)=>`<button class="command-item ${i===state.commandIndex?"selected":""}" data-command="${COMMANDS.indexOf(c)}"><span>${esc(c[0])}</span><small>${esc(c[1])}</small></button>`).join("");$$('[data-command]').forEach(b=>b.onclick=()=>{COMMANDS[Number(b.dataset.command)][2]();closeCommands();});}
function commandKey(e){const items=$$('.command-item');if(e.key==="ArrowDown"){e.preventDefault();state.commandIndex=clamp(state.commandIndex+1,0,items.length-1);renderCommands();}else if(e.key==="ArrowUp"){e.preventDefault();state.commandIndex=clamp(state.commandIndex-1,0,items.length-1);renderCommands();}else if(e.key==="Enter"&&items.length){e.preventDefault();items[state.commandIndex]?.click();}else if(e.key==="Escape")closeCommands();}

function exportSettings(){const blob=new Blob([JSON.stringify(state.settings,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="typeforge-settings.json";a.click();URL.revokeObjectURL(a.href);}
function importSettingsFile(file){const r=new FileReader();r.onload=()=>{try{state.settings={...DEFAULT_SETTINGS,...JSON.parse(r.result)};saveSettings();toast("settings imported");restartMain();}catch{toast("invalid settings file","error");}};r.readAsText(file);}
function mixHex(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16),ar=pa>>16,ag=pa>>8&255,ab=pa&255,br=pb>>16,bg=pb>>8&255,bb=pb&255;return"#"+((1<<24)+(Math.round(ar+(br-ar)*t)<<16)+(Math.round(ag+(bg-ag)*t)<<8)+Math.round(ab+(bb-ab)*t)).toString(16).slice(1);}
function setSettingsTab(tab){$$('[data-settings-tab]').forEach(b=>b.classList.toggle('active',b.dataset.settingsTab===tab));$$('[data-settings-panel]').forEach(p=>p.classList.toggle('active',p.dataset.settingsPanel===tab));}

function wire(){
  $$('[data-auth-tab]').forEach(b=>b.onclick=()=>authTab(b.dataset.authTab));$("#loginForm").onsubmit=login;$("#registerForm").onsubmit=register;$$('.toggle-password').forEach(b=>b.onclick=()=>{const i=b.parentElement.querySelector("input");i.type=i.type==="password"?"text":"password";});
  $$('[data-settings-tab]').forEach(b=>b.onclick=()=>setSettingsTab(b.dataset.settingsTab));
  $$('[data-nav]').forEach(b=>b.onclick=e=>{e.preventDefault();navigate(b.dataset.nav);});$("#logoutBtn").onclick=logout;
  $("#togglePunctuation").onclick=()=>{state.settings.punctuation=!state.settings.punctuation;saveSettings();restartMain();};$("#toggleNumbers").onclick=()=>{state.settings.numbers=!state.settings.numbers;saveSettings();restartMain();};$("#languageButton").onclick=openLanguage;
  $$('.mode-chip').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));bindModeOptionButtons();$("#launchCustomBtn").onclick=launchCustom;
  $(".modal-close").onclick=closeLanguage;$("#languageModal").onclick=e=>{if(e.target===$("#languageModal"))closeLanguage();};$("#languageSearch").oninput=e=>renderLanguageGrid(e.target.value);
  $("#smartPracticeQuickBtn").onclick=startSmartPractice;$("#refreshCoachBtn").onclick=()=>loadSmartCoach(false);$("#startRecommendedBtn").onclick=startSmartPractice;$("#startDailyBtn").onclick=startDailyChallenge;$("#practiceWeakWordsBtn").onclick=practiceCoachWeakWords;$("#refreshLeaderboardBtn").onclick=loadLeaderboard;$("#refreshHistoryBtn").onclick=loadHistory;$("#refreshPracticeBtn").onclick=loadPractice;$("#submitPracticeBtn").onclick=submitPractice;
  $("#startGlobalCompetitionBtn").onclick=startGlobalCompetition;if($("#quickStartCupBtn"))$("#quickStartCupBtn").onclick=()=>{navigate("competition");setTimeout(startGlobalCompetition,80);};$("#refreshGlobalCompetitionBtn").onclick=loadGlobalCompetition;$("#createCompetitionBtn").onclick=()=>createRoom("competition");$("#joinCompetitionBtn").onclick=()=>joinRoom("competition",$("#compJoinCode").value);$("#refreshCompetitionBtn").onclick=()=>{loadGlobalCompetition();loadCompetitionRooms();};$("#startCompetitionTestBtn").onclick=startCompetition;$("#leaveCompetitionBtn").onclick=()=>leaveRoom("competition");$("#compRoomCode").onclick=e=>copyCode(e.currentTarget);
  $("#createMultiBtn").onclick=()=>createRoom("multiplayer");$("#joinMultiBtn").onclick=()=>joinRoom("multiplayer",$("#multiJoinCode").value);$("#refreshMultiBtn").onclick=loadMultiRooms;$("#multiReadyBtn").onclick=toggleReady;$("#multiStartBtn").onclick=startRace;$("#leaveMultiBtn").onclick=()=>leaveRoom("multiplayer");$("#multiRoomCode").onclick=e=>copyCode(e.currentTarget);
  const bindSetting=(id,key,kind="value")=>{$(id).onchange=e=>{state.settings[key]=kind==="checked"?e.target.checked:kind==="number"?Number(e.target.value):e.target.value;saveSettings();};};
  bindSetting("#settingDifficulty","difficulty");bindSetting("#settingMinWpm","minWpm","number");bindSetting("#settingMinAccuracy","minAccuracy","number");bindSetting("#settingStopError","stopOnError","checked");bindSetting("#settingBlind","blind","checked");bindSetting("#settingFreedom","freedom","checked");bindSetting("#settingCaret","caret");bindSetting("#settingSmoothCaret","smoothCaret","checked");bindSetting("#settingSound","sound","checked");bindSetting("#settingFont","font");bindSetting("#settingLines","lines","number");bindSetting("#settingLiveWpm","liveWpm","checked");bindSetting("#settingLiveAcc","liveAcc","checked");bindSetting("#settingLiveProgress","liveProgress","checked");
  $("#settingFontSize").oninput=e=>{state.settings.fontSize=Number(e.target.value);saveSettings();};
  $("#resetSettingsBtn").onclick=()=>{state.settings={...DEFAULT_SETTINGS};saveSettings();restartMain();toast("settings reset");};
  $("#applyCustomThemeBtn").onclick=()=>{state.settings.customTheme={name:"custom",bg:$("#customBg").value,panel:mixHex($("#customBg").value,"#ffffff",.06),panel2:mixHex($("#customBg").value,"#ffffff",.11),text:$("#customTextColor").value,sub:$("#customSub").value,main:$("#customMain").value,error:$("#customError").value,caret:$("#customMain").value};saveSettings();};
  $("#exportSettingsBtn").onclick=exportSettings;$("#importSettingsBtn").onclick=()=>$("#settingsFileInput").click();$("#settingsFileInput").onchange=e=>e.target.files[0]&&importSettingsFile(e.target.files[0]);
  $("#openCommandFooter").onclick=openCommands;$("#commandSearch").oninput=()=>{state.commandIndex=0;renderCommands();};$("#commandSearch").onkeydown=commandKey;$("#commandPalette").onclick=e=>{if(e.target===$("#commandPalette"))closeCommands();};
  document.addEventListener("keydown",e=>{if(!$("#commandPalette").classList.contains("hidden"))return;if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="p"){e.preventDefault();return openCommands();}if(e.key==="Escape"){e.preventDefault();return openCommands();}if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();return state.activeArena?.repeat();}if(e.key==="Tab"&&state.activeArena){e.preventDefault();state.tabArmedUntil=Date.now()+1200;toast("press enter to restart");return;}if(e.key==="Enter"&&Date.now()<state.tabArmedUntil){e.preventDefault();state.tabArmedUntil=0;return state.activeArena?.repeat();}});
  window.addEventListener("resize",()=>{if(state.dashboard)drawPerformance((state.dashboard.recent||[]).slice().reverse());});
}
bootstrap();
})();
