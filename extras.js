(function(){
const NM={'XAU/USD':'Gold Spot / U.S. Dollar','XAG/USD':'Silver Spot / U.S. Dollar','XPT/USD':'Platinum / U.S. Dollar','EUR/USD':'Euro / U.S. Dollar','GBP/USD':'British Pound / U.S. Dollar','USD/JPY':'U.S. Dollar / Japanese Yen','AUD/USD':'Australian Dollar / U.S. Dollar','BTC/USD':'Bitcoin / U.S. Dollar','ETH/USD':'Ethereum / U.S. Dollar'};
window.SYM=localStorage.SYM||'XAU/USD';window.SYMN=NM[SYM];
window.DPF=()=>({'EUR/USD':5,'GBP/USD':5,'AUD/USD':5,'USD/JPY':3,'XAG/USD':3})[SYM]||2;
const VOLM={},VOLT={},vkey=()=>SYM+'|'+main;
const GOLD=()=>SYM=='XAU/USD',J=(k,d)=>{try{return JSON.parse(localStorage[k])||d}catch(e){return d}};
const css=document.createElement('style');css.textContent='.box input,.box select,.box button{background:#2b313b;color:#e9edf2;border:0;border-radius:6px;padding:7px 9px;margin:2px;font-size:13px}.box input{width:78px}.box input[type=checkbox]{width:auto}.mu{color:#8b95a3;font-size:12px}';document.head.appendChild(css);
const box=(t,b)=>`<div class="box"><h2>${t}</h2>${b}</div>`;
document.querySelector('footer').insertAdjacentHTML('beforebegin',
box('Market and session',`<select id="sym">${Object.keys(NM).map(k=>`<option ${k==SYM?'selected':''}>${k}</option>`).join('')}</select><select id="ses">${['All','Asia','London','New York'].map(k=>`<option>${k}</option>`).join('')}</select><label><input type="checkbox" id="atr"> ATR grid spacing</label><div id="sesnow" class="mu"></div><div class="mu">Signals outside the chosen session are hidden. Times are UTC. Other markets always use ATR spacing.</div>`)+
box('Confirmation','<div id="conf"></div>')+
box('Track record','<div id="bt"></div>')+
box('Risk calculator','Balance $<input id="bal" value="1000"> Risk % <input id="rk" value="1"> Leverage 1:<input id="lev" value="100"><div id="risk"></div>')+
box('Alerts','Price alert <input id="pa" placeholder="4200"><button id="pab">Set</button><div id="pas" class="mu"></div>Send signals to: <label><input type="checkbox" id="tg"> Telegram</label> <label><input type="checkbox" id="wa"> WhatsApp</label> <label><input type="checkbox" id="em"> Email</label><br><button id="tst">Send test alert</button><div id="als" class="mu"></div><div class="mu">Each channel needs its keys in Secrets.</div>')+
box('Trade journal','<input id="jn" placeholder="Note" style="width:120px"><input id="jp" placeholder="Price"><input id="jl" placeholder="Lots"><button id="ja">Add</button><div id="jr"></div><button id="ex">Export CSV</button>'));
// saved layout
const IDS=['g','s','sp','nl','ses','atr','bal','rk','lev','tg','wa','em'],cfg=J('cfg',{});
IDS.forEach(id=>{const e=$(id);if(cfg[id]!=null){if(e.type=='checkbox')e.checked=cfg[id];else e.value=cfg[id]}e.addEventListener('input',()=>{cfg[id]=e.type=='checkbox'?e.checked:e.value;localStorage.cfg=JSON.stringify(cfg);draw()})});
$('sym').onchange=()=>{window.SYM=$('sym').value;localStorage.SYM=SYM;window.SYMN=NM[SYM];for(const k in D)delete D[k];$('px').textContent='Loading…';busy=false;refresh()};
// session filter and ATR spacing
const SES={All:[0,24],Asia:[0,8],London:[7,16],'New York':[12,21]},hr=t=>+String(t).slice(11,13);
window.filt=S=>{const[a,b]=SES[$('ses').value];return S.filter(m=>{const h=hr(m.time);return h>=a&&h<b})};
const atr=(cs,n=14)=>{let s=0,c=0;for(let i=Math.max(1,cs.length-n);i<cs.length;i++){s+=Math.max(cs[i].h-cs[i].l,Math.abs(cs[i].h-cs[i-1].c),Math.abs(cs[i].l-cs[i-1].c));c++}return s/c};
window.spx=cs=>($('atr').checked||SYM!='XAU/USD')?Math.max(1e-5,+(atr(cs)*2).toPrecision(3)):(+$('sp').value||10);
// previous day high/low and round numbers
window.lines=(x,o)=>{const{cs,st,N,mn,mx,Y,X,w,h,pw,cw}=o;x.font='10px system-ui';const d=D['1d'];
if(d&&d.length>1){const p=d[d.length-2];[[p.h,'PDH'],[p.l,'PDL']].forEach(([v,l])=>{if(v>mn&&v<mx){x.setLineDash([2,3]);x.strokeStyle='#f0b90b';x.lineWidth=1;x.beginPath();x.moveTo(0,Y(v));x.lineTo(w-pw,Y(v));x.stroke();x.setLineDash([]);x.fillStyle='#f0b90b';x.fillText(l+' '+v.toFixed(dp()),w-pw-96,Y(v)-3)}})}
const stp=Math.pow(10,Math.floor(Math.log10(mx-mn)));
for(let v=Math.ceil(mn/stp)*stp;v<mx;v+=stp){x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=1;x.beginPath();x.moveTo(0,Y(v));x.lineTo(w-pw,Y(v));x.stroke();x.fillStyle='#8b95a3';x.fillText(v.toFixed(dp()),2,Y(v)-2)}
const vm=VOLM[vkey()];if(vm&&vm.v){let mv=0;for(let i=st;i<N;i++)mv=Math.max(mv,vm.v[cs[i].t]||0);if(mv)for(let i=st;i<N;i++){const v=vm.v[cs[i].t]||0,bh=v/mv*h*.14;x.fillStyle=cs[i].c>=cs[i].o?'rgba(25,230,140,.35)':'rgba(233,237,242,.3)';x.fillRect(X(i)-cw*.3,h-bh,cw*.6,bh)}}};
// volume (real for crypto, ETF proxy for metals, none for forex)
async function loadVol(){const k=vkey();if(main=='3m'||Date.now()-(VOLT[k]||0)<55000)return;VOLT[k]=Date.now();
try{const r=await fetch('/api/volume?i='+main+'&s='+encodeURIComponent(SYM)),j=await r.json();VOLM[k]=r.ok?j:{error:j.error};if(r.ok)draw()}catch(e){VOLM[k]={error:e.message}}}
function volTxt(cs){const vm=VOLM[vkey()];if(main=='3m')return'Volume: not shown on 3M.';if(!vm)return'Volume: loading…';if(vm.error)return'Volume unavailable: '+vm.error;if(!vm.source)return'Volume: none exists for '+SYM+' (forex has no central volume).';
const a=cs.slice(-21,-1).map(c=>vm.v[c.t]||0),avg=a.reduce((s,v)=>s+v,0)/a.length,cur=vm.v[cs[cs.length-1].t]||0;
return cur&&avg?`Volume (${vm.source}): latest candle ${(cur/avg).toFixed(1)}x the 20-candle average`:`Volume (${vm.source}): no trades in the latest candle (US market closed?)`}
// confirmations
const rsi=(cs,n=14)=>{let g=0,l=0;for(let i=1;i<=n;i++){const d=cs[i].c-cs[i-1].c;d>0?g+=d:l-=d}g/=n;l/=n;const r=[];for(let i=n+1;i<cs.length;i++){const d=cs[i].c-cs[i-1].c;g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;r[i]=l==0?100:100-100/(1+g/l)}return r};
function conf(cs){const r=rsi(cs),i=cs.length-1,c=cs.map(x=>x.c),e12=ema(c,12),e26=ema(c,26),m=e12.map((v,k)=>v-e26[k]),sg=ema(m,9),h=m.map((v,k)=>v-sg[k]),lows=[];
for(let k=Math.max(20,cs.length-80);k<cs.length-3;k++){let ok=true;for(let q=k-3;q<=k+3;q++)if(cs[q].l<cs[k].l)ok=false;if(ok)lows.push(k)}
const a=lows[lows.length-2],b=lows[lows.length-1],dv=a!=null&&b!=null&&cs[b].l<cs[a].l&&r[b]>r[a],n=TF.filter(([,k])=>trend(k)).length,rv=r[i];
$('conf').innerHTML=`RSI 14: <b>${rv.toFixed(0)}</b> ${rv>70?'(overbought)':rv<30?'(oversold)':'(neutral)'}<br>MACD histogram: <b class="${h[i]>=0?'u':'d'}">${h[i]>=0?'positive':'negative'}</b>, ${h[i]>h[i-1]?'rising':'falling'}<br>Bullish divergence: <b>${dv?'yes':'no'}</b><br>Timeframes up: <b>${n} of 9</b><br><span class="mu">${volTxt(cs)}</span>`}
// track record / backtest
function bt(cs,S,sp){const R=S.map(m=>{let res=m.i+40<cs.length?'–':'…',adv=0;for(let j=m.i+1;j<Math.min(cs.length,m.i+41);j++){adv=Math.max(adv,m.p-cs[j].l);if(cs[j].l<=m.p-sp){res='✗';break}if(cs[j].h>=m.p+sp){res='✓';break}}return{...m,res,adv}});
const row=(n,t)=>{const a=R.filter(m=>m.t==t),w=a.filter(m=>m.res=='✓').length,l=a.filter(m=>m.res=='✗').length;return`<tr><td>${n}</td><td>${a.length}</td><td>${w+l?Math.round(w/(w+l)*100)+'%':'–'}</td><td>${a.length?(a.reduce((s,m)=>s+m.adv,0)/a.length).toFixed(2):'–'}</td></tr>`};
$('bt').innerHTML=`<table><tr><th>Type</th><th>Signals</th><th>Win</th><th>Avg dip</th></tr>${row('BUY','B')}${row('Strong Buy','S')}</table><table>${R.slice(-8).reverse().map(m=>`<tr><td>${m.t=='S'?'★':'▲'}</td><td>${m.time}</td><td>${m.p.toFixed(dp())}</td><td>${m.res}</td></tr>`).join('')}</table><div class="mu">Win = price rises one grid step before falling one step, within 40 candles (✓ win, ✗ loss, – timed out, … still open). Uses the ~500 loaded candles, so it is a small sample.</div>`;window.SIG=R}
// risk calculator (standard contract sizes)
const CON={'XAU/USD':[100,1],'XAG/USD':[5000,1],'XPT/USD':[50,1],'EUR/USD':[1e5,1],'GBP/USD':[1e5,1],'AUD/USD':[1e5,1],'USD/JPY':[1e5,0],'BTC/USD':[1,1],'ETH/USD':[1,1]};
function risk(o){const[u,q]=CON[SYM],b=+$('bal').value||0,r=+$('rk').value||0,lev=+$('lev').value||1,sp=o.sp,nl=+$('nl').value||8,l=last?o.lots:.01,tot=l*nl,pv=q?u:u/o.px,loss=l*pv*sp*nl*(nl-1)/2,nom=q?u*o.px:u;
$('risk').innerHTML=`Risk amount: <b>$${(b*r/100).toFixed(2)}</b><br>Lot size for a ${sp.toFixed(dp())} stop: <b>${(b*r/100/(sp*pv)).toFixed(2)}</b><br>Grid: ${tot.toFixed(2)} lots, margin if all fill <b>$${(tot*nom/lev).toFixed(0)}</b><br>Loss if price falls to the last level: <b class="d">$${loss.toFixed(0)}</b> (${b?(loss/b*100).toFixed(0):'–'}% of balance)<div class="mu">Standard contract sizes assumed; check your broker's.</div>`}
// alerts
const chans=()=>['tg','wa','em'].filter(k=>$(k).checked);
const tg=async t=>{try{const r=await fetch('/api/alert',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:t,ch:chans()})}),j=await r.json();$('als').textContent='Last alert: '+Object.entries(j.results||{}).map(([k,v])=>k+' '+v).join(', ')}catch(e){$('als').textContent='Alert failed: '+e.message}};
const nt=t=>{if(window.Notification&&Notification.permission=='granted')new Notification(t)};
function alerts(o){const pa=J('pa',null);$('pas').textContent=pa?'Alert at '+pa.v+' (price going '+pa.d+')':'No price alert set';
if(pa&&(pa.d=='above'?o.px>=pa.v:o.px<=pa.v)){const t='Price alert: '+SYM+' '+o.px.toFixed(dp());nt(t);if(chans().length)tg(t);localStorage.removeItem('pa');$('pas').textContent='Alert fired'}
if(chans().length&&last&&last.i>=o.cs.length-2){const k=SYM+last.time+last.t;if(localStorage.sent!=k){localStorage.sent=k;tg('Accuracy Gold: '+(last.t=='S'?'Strong Buy':'BUY')+' '+SYM+' '+last.p.toFixed(dp()))}}}
$('pab').onclick=()=>{const v=+$('pa').value;if(!v)return;if(window.Notification&&Notification.permission=='default')Notification.requestPermission();localStorage.pa=JSON.stringify({v,d:v>(window.LASTPX||0)?'above':'below'});draw()};
$('tst').onclick=()=>tg('Accuracy Gold test alert: '+SYM+' '+(window.LASTPX||0).toFixed(dp()));
// journal and export
const jr=()=>{$('jr').innerHTML=J('jr',[]).map((e,i)=>`<div>${e.t} · ${e.n} · ${e.p} · ${e.l} <a href="#" data-i="${i}" style="color:#ff4d4d">delete</a></div>`).join('')||'<span class="mu">No entries yet.</span>'};
$('ja').onclick=()=>{const a=J('jr',[]);a.push({t:new Date().toISOString().slice(0,16).replace('T',' '),n:$('jn').value,p:$('jp').value,l:$('jl').value});localStorage.jr=JSON.stringify(a);$('jn').value=$('jp').value=$('jl').value='';jr()};
$('jr').onclick=e=>{const i=e.target.dataset.i;if(i==null)return;e.preventDefault();const a=J('jr',[]);a.splice(+i,1);localStorage.jr=JSON.stringify(a);jr()};
$('ex').onclick=()=>{const rows=[['type','time','symbol','price','result']].concat((window.SIG||[]).map(m=>[m.t=='S'?'Strong Buy':'BUY',m.time,SYM,m.p.toFixed(dp()),m.res]),[[],['journal time','note','price','lots']],J('jr',[]).map(e=>[e.t,e.n,e.p,e.l]));
const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='accuracy-gold.csv';a.click()};
jr();
window.after=o=>{try{window.LASTPX=o.px;const h=new Date().getUTCHours(),s=[];if(h<8)s.push('Asia');if(h>=7&&h<16)s.push('London');if(h>=12&&h<21)s.push('New York');$('sesnow').textContent='Now: '+(s.join(' + ')||'between sessions')+' (UTC '+String(h).padStart(2,'0')+':00)';
if(o.cs.length>60){conf(o.cs);bt(o.cs,o.S,o.sp)}risk(o);alerts(o);loadVol()}catch(e){console.error(e)}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
if(get(main))draw();
})();
