(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width, H = canvas.height;
  const titlePanel = document.getElementById('titlePanel');
  const pausePanel = document.getElementById('pausePanel');
  const hud = document.getElementById('hud');
  const toast = document.getElementById('toast');
  const caption = document.getElementById('transitionCaption');
  const floorLabel = document.getElementById('floorLabel');
  const objectiveLabel = document.getElementById('objectiveLabel');
  const progressFill = document.getElementById('progressFill');
  const keys = new Set();
  const floorY = [211, 205, 215, 205, 212];
  const floorNames = ['ANDAR 05 / 05','ANDAR 04 / 05','ANDAR 03 / 05','ANDAR 02 / 05','ANDAR 01 / 05'];
  const floorHints = ['ESCADA LESTE','SIGA AS PLACAS','ENCONTRE A ESCADA','MANTENHA A ROTA','SAÍDA DE EMERGÊNCIA'];
  const floorWidth = 480, totalWidth = floorWidth * 5;
  let state = 'title', last = 0, cameraX = 0, toastTimer = 0, safeTimer = 0, flash = 0;
  let soundOn = false, audioCtx = null;
  const player = {x: 40,y: 0,vx: 0,vy: 0,w: 11,h: 19,onGround: false,invuln: 0,hearts: 3,rescues: 0};
  const rescued = new Set();
  const rescueSpots = [310, 830, 1320, 1770];
  const hazards = [
    {x:215,w:27,h:16,f:0},{x:610,w:32,h:18,f:1},{x:1030,w:25,h:20,f:2},
    {x:1515,w:32,h:20,f:3},{x:1980,w:36,h:23,f:4},{x:2180,w:29,h:19,f:4}
  ];
  const debris = Array.from({length:18},(_,i)=>({x:(i*83+73)%totalWidth,y:90+(i*29)%80,s:2+i%3,spd:17+i%28,phase:i*1.7}));
  const particles = [];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const text=(s,x,y,size=8,color='#e6e2d9',align='left')=>{ctx.fillStyle=color;ctx.font=`${size}px monospace`;ctx.textAlign=align;ctx.fillText(s,Math.round(x),Math.round(y));ctx.textAlign='left';};

  function tone(freq=500,dur=.08){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch{}}
  function showToast(message,duration=2.2){toast.textContent=message;toast.classList.remove('hidden');toastTimer=duration;}
  function begin(){state='play';titlePanel.classList.add('hidden');pausePanel.classList.add('hidden');hud.classList.remove('hidden');caption.classList.add('hidden');player.x=40;player.y=floorY[0]-player.h;player.vx=player.vy=0;player.hearts=3;player.rescues=0;player.invuln=0;rescued.clear();cameraX=0;safeTimer=0;showToast('ENCONTRE A ESCADA LESTE E SIGA AS PLACAS');tone(440,.13);}
  function pause(){if(state==='play'){state='pause';pausePanel.classList.remove('hidden')}else if(state==='pause'){state='play';pausePanel.classList.add('hidden');last=performance.now()}}
  document.getElementById('startButton').addEventListener('click',begin);
  document.getElementById('resumeButton').addEventListener('click',pause);
  document.getElementById('pauseButton').addEventListener('click',pause);
  document.getElementById('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;document.getElementById('soundState').textContent=soundOn?'ON':'OFF';if(soundOn)tone(540,.1)});
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp',' ','w','a','s','d','W','A','D'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if((e.key===' '||e.key==='ArrowUp'||e.key.toLowerCase()==='w')&&state==='play')jump();if(e.key.toLowerCase()==='p'||e.key==='Escape')pause();if(e.key==='Enter'&&(state==='title'||state==='credits'))begin();});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  document.querySelectorAll('.touch-controls button').forEach(button=>{const key=button.dataset.control==='left'?'arrowleft':button.dataset.control==='right'?'arrowright':' ';button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);if(key===' ')jump()});for(const ev of ['pointerup','pointercancel','pointerleave'])button.addEventListener(ev,()=>keys.delete(key));});
  function jump(){if(player.onGround&&state==='play'){player.vy=-146;player.onGround=false;tone(360,.06)}}

  function drawSkyline(){
    rect(0,0,W,H,'#192430');
    // dusk sky and distant city silhouettes
    for(let i=0;i<15;i++){let x=i*39-cameraX*.12%39;let h=28+(i*31%72);rect(x,120-h,27,h+120,'#202d38');rect(x+4,126-h,19,h+114,'#263541');for(let wy=0;wy<5;wy++)for(let wx=0;wx<2;wx++)if((i+wx+wy)%3)rect(x+5+wx*9,128-h+wy*13,3,4,'#68706b');}
    rect(0,126,W,39,'#34414a');rect(0,163,W,3,'#69716f');
    // neighboring tower silhouettes: architectural, not photorealistic
    drawTower(48,22,82,143,false);drawTower(359,9,83,156,true);
    // haze and cloud bands
    rect(0,100,W,3,'#859092');rect(8,97,62,2,'#9b9b8c');rect(358,93,78,2,'#a1a091');
  }
  function drawTower(x,y,w,h,damaged){
    rect(x+7,y,w-14,h,'#4b5961');rect(x,y+5,w, h-5,'#69757a');rect(x+5,y,w-10,h-4,'#78817f');
    rect(x+4,y+h-5,w-8,5,'#394751');
    for(let yy=y+9;yy<y+h-8;yy+=10){rect(x+4,yy,w-8,2,'#4c5960');for(let xx=x+9;xx<x+w-9;xx+=11){rect(xx,yy+3,5,5,(Math.floor(xx+yy)%4?'#b4a77e':'#d0b779'));}}
    if(damaged){rect(x+11,y+49,23,15,'#2d3438');rect(x+31,y+46,15,4,'#c3845a');rect(x+17,y+44,4,19,'#9b624c');}
    rect(x+w/2-2,y-8,4,8,'#828987');
  }
  function drawRoom(){
    const offset=Math.floor(cameraX);drawSkyline();
    // Interior wall, beams and floor segments
    rect(0,0,W,30,'#202a33');rect(0,30,W,5,'#46535b');
    for(let x=-(offset%96);x<W;x+=96){rect(x,35,3,150,'#384650');rect(x+7,49,1,112,'#313e47');}
    rect(0,178,W,8,'#343f47');
    for(let seg=0;seg<5;seg++){
      const sx=seg*floorWidth-offset;if(sx>W||sx+floorWidth<0)continue;const gy=floorY[seg];
      rect(sx,gy,floorWidth,7,'#6f7169');rect(sx,gy+7,floorWidth,H-gy,'#303a3e');rect(sx,gy+7,floorWidth,3,'#8e8772');
      // wall accents, windows and floor numbering
      rect(sx+18,51,2,gy-53,'#657079');rect(sx+floorWidth-20,51,2,gy-53,'#657079');
      for(let wx=0;wx<4;wx++){const xx=sx+40+wx*97;rect(xx,67,48,57,'#273b48');rect(xx+3,70,42,50,'#52656b');rect(xx+5,73,18,44,'#83908b');rect(xx+25,73,17,44,'#65777b');rect(xx+23,70,2,50,'#364650');rect(xx,124,48,3,'#b09a75');}
      // door and evacuation marker at each segment's end
      rect(sx+floorWidth-63,gy-42,35,42,'#26343b');rect(sx+floorWidth-59,gy-37,27,37,'#9a805d');rect(sx+floorWidth-54,gy-32,17,29,'#25323a');rect(sx+floorWidth-40,gy-17,2,2,'#e7c982');
      rect(sx+floorWidth-70,gy-57,49,11,'#e9dfbe');text('SAÍDA',sx+floorWidth-64,gy-49,6,'#283139');
      // little floor label plaque
      rect(sx+16,gy-20,43,12,'#293943');text(`NÍVEL 0${5-seg}`,sx+20,gy-11,6,'#d7cba9');
      // loose paper and harmless room details
      rect(sx+111,gy-3,7,3,'#cab994');rect(sx+114,gy-6,5,3,'#e0d2b2');
      if(seg<4){rect(sx+floorWidth-4,gy-2,8,2,'#d5bb84');rect(sx+floorWidth,gy-2,4,Math.abs(floorY[seg+1]-gy)+5,'#7f796a');}
    }
    // A restrained, abstract impact-damaged zone in the final corridor
    const zoneX=4*floorWidth+112-offset;
    if(zoneX<W&&zoneX+220>0){rect(zoneX,38,220,3,'#544b43');rect(zoneX+17,42,2,39,'#514940');rect(zoneX+111,42,2,42,'#514940');rect(zoneX+194,42,2,36,'#514940');rect(zoneX+28,79,71,3,'#776b59');rect(zoneX+146,78,47,3,'#776b59');rect(zoneX+49,83,3,11,'#b98758');rect(zoneX+160,82,3,13,'#b98758');rect(zoneX+54,88,10,3,'#d89b58');rect(zoneX+164,87,9,3,'#d89b58');}
    // fixed ambient dust pixels
    for(const d of debris){const sx=d.x-offset;if(sx>-2&&sx<W+2){const yy=d.y+Math.sin(performance.now()/700+d.phase)*3;rect(sx,yy,d.s,d.s,'#c4b39766');}}
  }
  function drawStairSign(x,y){rect(x,y,31,20,'#253b3e');rect(x+3,y+3,25,14,'#e5d7af');text('ESCADA',x+5,y+12,5,'#344147');text('↓',x+23,y+12,7,'#344147');}
  function drawNPC(worldX,index){if(rescued.has(index))return;const x=worldX-cameraX;if(x<-20||x>W+20)return;const y=floorY[Math.floor(worldX/floorWidth)]||floorY[4];rect(x-4,y-16,9,12,'#d2b78a');rect(x-3,y-14,6,6,'#b98063');rect(x-4,y-4,3,4,'#d6d1c3');rect(x+1,y-4,3,4,'#d6d1c3');rect(x-5,y-16,10,2,'#ede2c6');text('!',x,y-20,7,'#f3d48f','center');}
  function drawHazard(h){const x=h.x-cameraX;if(x<-50||x>W+50)return;const y=floorY[h.f];const pulse=(Math.sin(performance.now()/170+h.x)*1.5);rect(x,y-4, h.w,4,'#58483b');rect(x+3,y-9+pulse,h.w-8,5,'#9e6543');rect(x+8,y-13+pulse,7,5,'#bd7950');rect(x+4,y-1,h.w-7,1,'#df9f60');}
  function drawPlayer(){const x=player.x-cameraX,y=player.y;if(player.invuln>0&&Math.floor(performance.now()/90)%2)return;
    // compact pixel-art evacuee, with clear silhouette and small backpack
    rect(x+2,y,7,6,'#d5ae83');rect(x+1,y+1,8,2,'#4d423a');rect(x+3,y+4,1,1,'#302d2a');rect(x+6,y+4,1,1,'#302d2a');rect(x,y+7,10,8,'#64818a');rect(x-2,y+8,3,6,'#b3845c');rect(x+2,y+15,3,4,'#39454a');rect(x+7,y+15,3,4,'#39454a');rect(x-1,y+8,3,5,'#b77f54');rect(x+9,y+8,2,5,'#d5ae83');rect(x-2,y+14,4,2,'#e2d6c3');rect(x+7,y+14,4,2,'#e2d6c3');
  }
  function drawWorld(){drawRoom();for(let i=0;i<rescueSpots.length;i++)drawNPC(rescueSpots[i],i);hazards.forEach(drawHazard);
    // Stairwell door at the end of each floor, marked in teal
    for(let f=0;f<5;f++){const x=(f+1)*floorWidth-54-cameraX;if(x>-70&&x<W+10){drawStairSign(x,floorY[f]-74);rect(x+14,floorY[f]-31,2,14,'#d4bd86');}}
    drawPlayer();
    // soft smoke puffs, no flames or graphic imagery
    if(state==='play'&&player.x>4*floorWidth+70){for(let i=0;i<8;i++){const sx=218+((i*37+performance.now()/23)%100),sy=43+((i*19+performance.now()/71)%53);rect(sx,sy,7,3,'#aaa59a22');}}
    if(state==='play'&&player.x>4*floorWidth+88&&player.x<4*floorWidth+320){text('ZONA INSTÁVEL  ·  CORRA',W/2,38,8,'#f2c887','center');}
  }
  function update(dt){
    if(state==='play'){
      if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.classList.add('hidden')}
      const left=keys.has('arrowleft')||keys.has('a'),right=keys.has('arrowright')||keys.has('d');const sprint=player.x>4*floorWidth+70&&player.x<4*floorWidth+340;
      const speed=sprint?117:78;player.vx=(right?1:0)-(left?1:0);player.vx*=speed;
      if(player.vx)player.x+=player.vx*dt;
      player.x=clamp(player.x,0,totalWidth-23);
      player.vy+=380*dt;player.y+=player.vy*dt;
      const floor=Math.min(4,Math.floor(player.x/floorWidth));const ground=floorY[floor]-player.h;
      if(player.y>=ground){player.y=ground;player.vy=0;player.onGround=true}else player.onGround=false;
      // short connected level transitions; the marked stair door unlocks next floor
      for(let i=0;i<5;i++){const gate=(i+1)*floorWidth-47;if(player.x>gate&&player.x<(i+1)*floorWidth+7&&i<4){player.x=(i+1)*floorWidth+10;showToast(`ANDAR ${4-i} · SIGA PELA ESCADA`,1.5);tone(570,.08);}}
      if(player.invuln>0)player.invuln-=dt;
      for(const h of hazards){if(Math.floor(player.x/floorWidth)!==h.f)continue;const near=Math.abs((player.x+5)-(h.x+h.w/2))<h.w/2+5;const high=player.y+h<floorY[h.f]-8;if(near&&!high&&player.invuln<=0){player.hearts--;player.invuln=1.5;player.x=Math.max(h.f*floorWidth+18,player.x-28);tone(150,.14);showToast('CUIDADO COM OS DETRITOS · TENTE PULAR');if(player.hearts<=0){player.hearts=3;player.x=Math.floor(player.x/floorWidth)*floorWidth+18;showToast('PAUSA PARA RESPIRAR · VOCÊ PODE TENTAR DE NOVO',2.8);}}}
      for(let i=0;i<rescueSpots.length;i++){if(!rescued.has(i)&&Math.abs(player.x-rescueSpots[i])<17){rescued.add(i);player.rescues++;tone(680,.12);showToast(['VOCÊS SEGUEM JUNTOS.','MAIS UMA PESSOA A CAMINHO DA SAÍDA.','UM GESTO DE CUIDADO FAZ DIFERENÇA.','NINGUÉM PRECISA SEGUIR SÓ.'][i],2.4);}}
      cameraX=clamp(player.x-145,0,totalWidth-W);
      const floorNow=Math.min(4,Math.floor(player.x/floorWidth));floorLabel.textContent=floorNames[floorNow];objectiveLabel.textContent=player.x>4*floorWidth+70?'CORRA PARA A ESCADA':floorHints[floorNow];progressFill.style.width=`${Math.min(100,player.x/(totalWidth-100)*100)}%`;
      if(player.x>=4*floorWidth+105&&player.x<4*floorWidth+335){safeTimer+=dt;if(safeTimer>11){player.x+=58*dt;}if(safeTimer>14){startTransition();}}
      else if(player.x>=totalWidth-35){startTransition();}
    } else if(state==='transition'){
      flash+=dt;if(flash>3.7){state='credits';caption.innerHTML='<div><div class="credits-title">EM MEMÓRIA</div><br />Às vidas perdidas em 11 de setembro de 2001.<br /><br />À coragem de quem ajudou.<br />À solidariedade que atravessou a cidade.<br /><br /><span style="color:#9eabb2">Que a memória nos aproxime.</span><br /><br /><span style="font-size:9px;color:#77848d">FIM · ENTER PARA RECOMEÇAR</span></div>';caption.classList.remove('hidden');hud.classList.add('hidden');}
    }
  }
  function startTransition(){if(state!=='play')return;state='transition';flash=0;hud.classList.add('hidden');toast.classList.add('hidden');tone(520,.5);}

  function drawTransition(){
    // slow, respectful camera move across a quiet pixel-art skyline
    rect(0,0,W,H,'#101923');
    for(let i=0;i<12;i++){const x=i*48-((flash*18)%48);const h=35+(i*23%58);rect(x,210-h,32,h+45,'#24323c');for(let wy=0;wy<4;wy++)for(let wx=0;wx<2;wx++)rect(x+7+wx*11,218-h+wy*13,4,5,'#938c70');}
    const slide=clamp(flash/2,0,1);const tx=65-slide*92;drawTower(tx,30,94,163,false);drawTower(tx+108,27,94,166,false);
    rect(0,223,W,47,'#17212b');rect(0,221,W,2,'#69736e');
    if(flash>2.65){const a=clamp((flash-2.65)/.65,0,1);rect(0,0,W,H,`rgba(4,7,10,${a})`);}
    if(flash<2.8){text('DO ALTO, A CIDADE RESPIRA.',W/2,251,8,'#d9d4c8','center');}
  }
  function drawCredits(){rect(0,0,W,H,'#090d12');for(let i=0;i<55;i++){const x=(i*89)%W,y=(i*47)%H;rect(x,y,1,1,'#555b5d');}}
  function draw(){if(state==='title'||state==='pause'){cameraX=0;drawWorld();}else if(state==='transition')drawTransition();else if(state==='credits')drawCredits();else drawWorld();}
  function loop(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop)}
  // Initial illustration behind title
  player.x=40;player.y=floorY[0]-player.h;requestAnimationFrame(loop);
})();
