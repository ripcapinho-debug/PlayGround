
(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const missionData=[
 {title:'O tanque morreu aqui',desc:'O Tiger quebrou na estrada. Encontre combustível e um rádio para chamar a resistência.',obj:'Vasculhe o posto abandonado',reward:'+ 25 XP'},
 {title:'Um sinal entre os mortos',desc:'O rádio de campanha está sem peças. A fazenda Lebrun pode ter o que precisamos.',obj:'Encontre peças de rádio na fazenda',reward:'+ 40 XP'},
 {title:'Luz na escuridão',desc:'A resistência respondeu. Atravesse o vale e encontre a capela Saint-Loup.',obj:'Chegue à capela e acenda o sinal',reward:'+ 50 XP'},
 {title:'Ecos do bunker',desc:'O sinal foi visto. Há um posto de comando aliado ao sul — procure munição e a rota de evacuação.',obj:'Investigue o posto de comando',reward:'+ 60 XP'},
 {title:'A última estrada',desc:'A extração está a leste. Atravesse a rodovia dominada e alcance o ponto de encontro.',obj:'Alcance o ponto de extração a leste',reward:'SOBREVIVA'},
 {title:'Sobrevivente',desc:'Você escapou da zona infectada. Sua história continua…',obj:'Missão concluída',reward:'FIM DO CAPÍTULO'}
];
function currentMission(){return missionData[Math.min(missionStep,5)]}
function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');toastTimer=2100}
function notice(text){noticeText=text;noticeTimer=2100}
function updateUI(){
 $('health-text').textContent=`${Math.max(0,Math.ceil(player.hp))} / 100`;$('health-bar').style.width=`${clamp(player.hp,0,100)}%`;
 $('stamina-text').textContent=`${Math.round(player.stamina)} / 100`;$('stamina-bar').style.width=`${player.stamina}%`;
 const m=currentMission();$('mission-title').textContent=m.title;$('mission-desc').textContent=m.desc;$('objective').classList.toggle('done',missionStep>0&&missionStep<5);$('objective').querySelector('span:last-child').textContent=m.obj;$('objective').querySelector('.objective-check').textContent=missionStep===5?'✓':missionStep>0?'◉':'○';$('mission-reward').textContent=m.reward;
 $('mission-id').textContent=`${String(Math.min(missionStep+1,5)).padStart(2,'0')} / 05`;$('chapter-label').textContent=missionStep<3?'CAPÍTULO I · A RODOVIA':missionStep<4?'CAPÍTULO II · ECOS DO BUNKER':missionStep<5?'CAPÍTULO III · EXTRAÇÃO':'FIM · SOBREVIVENTE';
 $('xp-label').textContent=`NÍVEL ${player.level}`;$('xp-bar').style.width=`${Math.min(100,(player.xp%100))}%`;
 const wp=weapons[player.weapon];$('weapon-name').textContent=wp.name;$('ammo-current').textContent=wp.ammo;$('ammo-total').textContent=wp.total;$('ammo-bar').style.width=`${wp.clip?wp.ammo/wp.clip*100:0}%`;
 $('weapon-slots').innerHTML=weapons.map((w,i)=>`<div class="weapon-slot ${player.weapon===i?'active':''}" data-weapon="${i}" style="${!w.unlocked?'opacity:.38':''}"><span class="weapon-icon">${w.icon}</span><small>${w.short}</small></div>`).join('');
 $('weapon-slots').querySelectorAll('[data-weapon]').forEach(e=>e.onclick=()=>selectWeapon(+e.dataset.weapon));
 $('quick-items').innerHTML=[['✚','CURATIVO',inventory.bandage],['▤','MUNIÇÃO',inventory.ammo],['▣','COMBUSTÍVEL',inventory.fuel],['⌁','PEÇAS',inventory.parts]].map(x=>`<div class="item"><span class="item-icon">${x[0]}</span><small>${x[1]}</small><b class="count">${x[2]}</b></div>`).join('');
 $('coords').textContent=`X: ${String(Math.floor(player.x/10)).padStart(3,'0')} · Y: ${String(Math.floor(player.y/10)).padStart(3,'0')}`;
}
function selectWeapon(i){if(!weapons[i].unlocked){showToast('ARMA NÃO ENCONTRADA');return}player.weapon=i;updateUI();showToast(`${weapons[i].name} EQUIPADA`)}
function completeStep(msg){missionStep=Math.min(5,missionStep+1);player.xp+=25;if(player.xp>=100){player.level++;player.xp-=100;showToast('NÍVEL AUMENTOU · NÍVEL '+player.level)}else showToast(msg);notice(`OBJETIVO ATUALIZADO\n${currentMission().title.toUpperCase()}`);updateUI()}
function nearest(){let best=null,dist=1e9;for(const l of locations){const d=Math.hypot(player.x-l.x,player.y-l.y);if(d<dist){best=l;dist=d}}for(const l of loot.filter(x=>!x.used)){const d=Math.hypot(player.x-l.x,player.y-l.y);if(d<dist){best=l;dist=d}}return dist<40?{item:best,dist}:null}
function interact(){const near=nearest();if(!near){if(player.inside){player.inside=false;showToast('VOCÊ SAIU DO ABRIGO');return}showToast('NADA PARA INTERAGIR AQUI');return}
 const o=near.item;
 if(o.type&&o.type!=='building'&&o.type!=='truck'){
  o.used=true;
  if(o.type==='fuel'){inventory.fuel++;showToast('COMBUSTÍVEL ADICIONADO À MOCHILA');if(missionStep===0)completeStep('COMBUSTÍVEL RECUPERADO')}
  if(o.type==='parts'){inventory.parts++;showToast('PEÇAS DE RÁDIO RECUPERADAS');if(missionStep===1)completeStep('RÁDIO REPARADO')}
  if(o.type==='food'){inventory.food++;showToast('RAÇÕES MILITARES +1')}
  if(o.type==='ammo'){weapons[1].total+=12;inventory.ammo+=12;showToast('MUNIÇÃO 9MM +12')}
  if(o.type==='med'){inventory.bandage++;showToast('KIT MÉDICO +1')}
  if(o.type==='weapon'){weapons[2].unlocked=true;weapons[2].ammo=12;weapons[2].total=36;showToast('MP40 ENCONTRADA · ARMA DESEMBLOQUEADA')}
  updateUI();return
 }
 switch(o.action){
  case'fuel':if(missionStep===0){inventory.fuel++;completeStep('GALÃO DE COMBUSTÍVEL RECUPERADO')}else{inventory.scrap++;showToast('NADA ALÉM DE SUCATA E FERRUGEM')}break;
  case'parts':if(missionStep===1){inventory.parts++;completeStep('PEÇAS DE RÁDIO RECUPERADAS')}else{inventory.scrap++;showToast('A FAZENDA ESTÁ VAZIA')}break;
  case'shelter':if(missionStep===2){player.hp=Math.min(100,player.hp+20);completeStep('SINAL ACESO · A RESISTÊNCIA RESPONDEU')}else{player.inside=!player.inside;showToast(player.inside?'ABRIGO TEMPORÁRIO · [E] PARA SAIR':'VOCÊ SAIU DA CAPELA')};break;
  case'ammo':if(missionStep===3){weapons[0].total+=10;completeStep('MAPA DE EXTRAÇÃO ENCONTRADO')}else{player.hp=Math.min(100,player.hp+12);weapons[0].total+=5;showToast('SUPRIMENTOS: +12 VIDA · +5 MUNIÇÃO')};break;
  case'truck':if(inventory.bandage<4){inventory.bandage++;showToast('KIT MÉDICO ENCONTRADO')}else{inventory.ammo+=5;showToast('MUNIÇÃO ENCONTRADA · +5')};break;
 }
 updateUI();
}
function fire(){if(overlayOpen||player.inside||player.attackCd>0)return;const w=weapons[player.weapon];if(w.ammo<=0){showToast('SEM MUNIÇÃO · PRESSIONE R PARA RECARREGAR');player.attackCd=350;return}w.ammo--;player.attackCd=player.weapon===2?260:450;
 // gunshot ray and zombie hit test in the direction the soldier faces
 let hit=null,best=w.range;for(const z of zombies){if(!z.alive)continue;let dx=z.x-player.x,dy=z.y-player.y;let forward=dx*player.dirX+dy*player.dirY,side=Math.abs(dx*player.dirY-dy*player.dirX);if(forward>0&&forward<best&&side<13){best=forward;hit=z}}
 const bx=player.x+player.dirX*18,by=player.y+player.dirY*18;bullets.push({x:bx,y:by,dx:player.dirX,dy:player.dirY,life:8});if(hit){hit.hp-=w.damage;hit.x+=player.dirX*4;hit.y+=player.dirY*4;if(hit.hp<=0){hit.alive=false;kills++;player.xp+=15;notice('INFECTADO ELIMINADO');if(kills%3===0)showToast('AMEAÇA ELIMINADA · +15 XP')} }
 if(soundOn)beep();updateUI();
}
function reload(){const w=weapons[player.weapon],need=w.clip-w.ammo,have=player.weapon===0?inventory.ammo:w.total;if(need<=0){showToast('PENTE CHEIO');return}if(have<=0){showToast('SEM MUNIÇÃO RESERVA');return}let got=Math.min(need,have);w.ammo+=got;if(player.weapon===0)inventory.ammo-=got;else w.total-=got;showToast(`RECARREGADO · ${got} CARTUCHOS`);updateUI()}
function useMed(){if(inventory.bandage<=0){showToast('SEM CURATIVOS');return}if(player.hp>=100){showToast('VITALIDADE JÁ ESTÁ CHEIA');return}inventory.bandage--;player.hp=Math.min(100,player.hp+35);showToast('CURATIVO APLICADO · +35 VIDA');updateUI()}
function update(dt){if(overlayOpen)return;let dx=0,dy=0;if(keys.w||keys.arrowup)dy--;if(keys.s||keys.arrowdown)dy++;if(keys.a||keys.arrowleft)dx--;if(keys.d||keys.arrowright)dx++;if(dx||dy){let len=Math.hypot(dx,dy);dx/=len;dy/=len;player.dirX=dx;player.dirY=dy;if(Math.abs(dx)>Math.abs(dy))player.dir=dx>0?1:-1;let speed=player.speed*(keys.Shift?1.45:1);player.x=clamp(player.x+dx*speed*dt/16,8,world.w-8);player.y=clamp(player.y+dy*speed*dt/16,8,world.h-8);player.stamina=Math.max(0,player.stamina-.018*dt)}else player.stamina=Math.min(100,player.stamina+.025*dt);
 if(player.inside){player.x=clamp(player.x,locations[2].x-36,locations[2].x+36);player.y=clamp(player.y,locations[2].y-28,locations[2].y+28)}
 if(player.attackCd>0)player.attackCd-=dt;if(player.invuln>0)player.invuln-=dt;
 for(const b of bullets){b.x+=b.dx*5;b.y+=b.dy*5;b.life--}for(let i=bullets.length-1;i>=0;i--)if(bullets[i].life<=0)bullets.splice(i,1);
 for(const z of zombies){if(!z.alive)continue;z.cd=Math.max(0,z.cd-dt);const d=Math.hypot(player.x-z.x,player.y-z.y);if(d<180){z.x+=(player.x-z.x)/Math.max(d,1)*.34*dt/16;z.y+=(player.y-z.y)/Math.max(d,1)*.34*dt/16;if(d<20&&z.cd<=0&&player.invuln<=0){player.hp=Math.max(0,player.hp-9);player.invuln=850;z.cd=1300;showToast('VOCÊ FOI FERIDO · USE UM CURATIVO');updateUI()}}}
 cam.x=clamp(player.x-W/2,0,world.w-W);cam.y=clamp(player.y-H/2,0,world.h-H);
 const near=nearest();const hint=$('interaction-hint');hint.classList.toggle('show',!!near);hint.querySelector('span').textContent=near?`E · ${near.item.name||near.item.label}`:'E · INTERAGIR';
 let loc='RODOVIA 9 · SETOR LESTE';for(const l of locations){if(Math.hypot(player.x-l.x,player.y-l.y)<120){loc=l.name;break}}if(player.inside)loc='CAPELA SAINT-LOUP · INTERIOR';$('location-name').textContent=loc;
 if(player.x>1450&&Math.abs(player.y-550)<140&&missionStep===4){missionStep=5;completeStep('EXTRAÇÃO CONCLUÍDA')}
 if(player.hp<=0){player.hp=0;updateUI();overlayOpen=true;overlay('FIM DE JOGO','A horda tomou a estrada. Mas um soldado do 7º regimento não desiste tão fácil.',[['TENTAR DE NOVO','restart'],['FECHAR','close']])}
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show')}if(noticeTimer>0){noticeTimer-=dt;$('center-notice').textContent=noticeText;if(noticeTimer<=0)$('center-notice').textContent=''}
}
function drawInterior(){rect(0,0,W,H,'#252b23');for(let y=0;y<H;y+=16)for(let x=0;x<W;x+=16){rect(x,y,15,15,((x+y)%32===0)?'#37382e':'#30342a');rect(x+2,y+2,1,1,'#51503c')};rect(20,25,440,14,'#5b5946');rect(20,25,440,4,'#847858');rect(20,260,440,13,'#5b5946');rect(20,25,12,245,'#5b5946');rect(448,25,12,245,'#5b5946');rect(80,75,68,34,'#63583e');rect(85,79,58,24,'#84724a');rect(315,57,62,54,'#465043');rect(319,61,54,46,'#596249');rect(75,183,45,24,'#433e32');rect(81,178,38,7,'#6d6042');rect(343,180,51,24,'#554c38');rect(349,174,40,9,'#81724c');rect(215,36,49,4,'#c4b786');rect(226,34,27,3,'#e1d6ac');rect(214,246,52,15,'#403a2e');rect(236,245,8,18,'#947d4b');rect(231,260,18,3,'#c7ae70');drawPlayer();rect(230,260,20,3,'#d7c071')}
function drawMap(){rect(0,0,W,H,'#161d17');const sc=.24;rect(0,466*sc,world.w*sc,166*sc,'#625f50');for(let x=0;x<world.w;x+=106)rect(x*sc,545*sc,46*sc,3,'#c9b979');trees.forEach(t=>{rect(t.x*sc,t.y*sc,2,2,t.dead?'#756448':'#536047')});locations.forEach(l=>{rect(l.x*sc-l.w*sc/2,l.y*sc-l.h*sc/2,l.w*sc,l.h*sc,'#b49a5b');ctx.fillStyle='#efe0ab';ctx.font='6px monospace';ctx.fillText(l.label,l.x*sc-20,l.y*sc-8)});zombies.filter(z=>z.alive).forEach(z=>rect(z.x*sc-1,z.y*sc-1,3,3,'#bd6555'));rect(player.x*sc-2,player.y*sc-2,5,5,'#79c3a0');ctx.fillStyle='#f0e5c4';ctx.font='8px monospace';ctx.fillText('MAPA DA REGIÃO · RODOVIA 9',12,17);rect(0,0,world.w*sc,world.h*sc,'transparent')}
function frame(t){let dt=Math.min(50,t-(frame.last||t));frame.last=t;gameTime=t;update(dt);if(worldMap)drawMap();else if(player.inside)drawInterior();else drawWorld();requestAnimationFrame(frame)}

// World, soldier and pixel-art scene
const gameTimeRef=()=>gameTime;
const W=canvas.width,H=canvas.height,TILE=16,world={w:1600,h:1200};
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const keys={};
let gameTime=0,toastTimer=0,noticeTimer=0,noticeText='',overlayOpen=false,worldMap=false,soundOn=false;
let cam={x:0,y:0};
const player={x:665,y:555,dir:1,dirX:1,dirY:0,hp:82,stamina:100,speed:1.55,invuln:0,xp:0,level:1,attackCd:0,weapon:0,inside:false};
const inventory={bandage:2,ammo:25,fuel:0,parts:0,food:1,scrap:0};
const weapons=[{name:'KARABINER 98K',short:'98K',icon:'⌁',clip:5,ammo:5,total:25,damage:2,range:105,unlocked:true},{name:'WALTHER P38',short:'P38',icon:'⌖',clip:8,ammo:8,total:32,damage:1,range:82,unlocked:true},{name:'SCHMEISSER MP40',short:'MP40',icon:'▤',clip:20,ammo:0,total:0,damage:1,range:95,unlocked:false}];
let chapter=1,missionStep=0,missionDone=[false,false,false,false],kills=0;
const locations=[
 {id:'gas',x:355,y:340,name:'POSTO DE ESTRADA',type:'building',w:112,h:75,color:'#7d6846',label:'Posto · combustível',action:'fuel'},
 {id:'farm',x:1040,y:235,name:'FAZENDA LEBRUN',type:'building',w:96,h:72,color:'#6e5940',label:'Fazenda · rádio',action:'parts'},
 {id:'chapel',x:1350,y:770,name:'CAPELA SAINT-LOUP',type:'building',w:93,h:72,color:'#77745e',label:'Capela · abrigo',action:'shelter'},
 {id:'bunker',x:225,y:875,name:'POSTO DE COMANDO',type:'building',w:108,h:69,color:'#535d4d',label:'Bunker · resistência',action:'ammo'},
 {id:'truck',x:870,y:515,name:'CAMINHÃO DE SUPRIMENTOS',type:'truck',w:47,h:25,label:'Caminhão abandonado',action:'truck'}
];
let loot=[{x:391,y:397,type:'fuel',icon:'▣',name:'Galão de combustível',used:false},{x:1070,y:272,type:'parts',icon:'⌁',name:'Peças de rádio',used:false},{x:1368,y:807,type:'food',icon:'♟',name:'Raçoes militares',used:false},{x:270,y:900,type:'ammo',icon:'▤',name:'Munição 9mm',used:false},{x:895,y:540,type:'med',icon:'✚',name:'Kit de primeiros socorros',used:false},{x:1065,y:302,type:'weapon',icon:'⌖',name:'Submetralhadora MP40',used:false}];
const trees=[];let seed=445;
function seeded(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<230;i++){let x=seeded()*world.w,y=seeded()*world.h;if(y<465||y>630){}else continue;if(locations.some(l=>Math.abs(l.x-x)<90&&Math.abs(l.y-y)<80))continue;trees.push({x,y,s:rand(.75,1.3),dead:seeded()<.1})}
const zombies=[{x:540,y:492,hp:2},{x:780,y:600,hp:2},{x:296,y:570,hp:3},{x:910,y:450,hp:2},{x:575,y:745,hp:2},{x:1200,y:545,hp:3},{x:1240,y:810,hp:3},{x:940,y:710,hp:2},{x:430,y:900,hp:3}].map((z,i)=>({...z,alive:true,cd:0,phase:i*2}));
const bullets=[];
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function line(x,y,x2,y2,c){ctx.strokeStyle=c;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function drawGround(){rect(0,0,W,H,'#344133');const sx=Math.floor(cam.x/TILE),sy=Math.floor(cam.y/TILE);for(let gy=sy;gy<sy+20;gy++)for(let gx=sx;gx<sx+32;gx++){let h=((gx*17+gy*43+gx*gy*7)%29);let px=gx*TILE-cam.x,py=gy*TILE-cam.y;rect(px,py,TILE,TILE,h<4?'#384536':h<8?'#314031':'#354233');if(h===3)rect(px+5,py+6,2,2,'#536044');if(h===6)rect(px+12,py+2,1,2,'#242f26')}
 rect(-10,466-cam.y,world.w+20,166,'#4c4a3e');rect(-10,466-cam.y,world.w+20,6,'#67614c');rect(-10,627-cam.y,world.w+20,5,'#272e27');for(let x=0;x<world.w;x+=106){rect(x-cam.x,545-cam.y,46,3,'#c1ad70');rect(x-cam.x+50,548-cam.y,20,2,'#756b4e')}for(let i=0;i<28;i++){let x=((i*197+97)%world.w)-cam.x,y=478+((i*37)%140)-cam.y;rect(x,y,rand(6,23),2,'#383a32')}for(let i=0;i<18;i++){let x=((i*139+53)%world.w)-cam.x,y=485+((i*67)%132)-cam.y;rect(x,y,rand(5,16),rand(2,7),'#37372f')}for(let i=0;i<80;i++){let x=((i*83+11)%world.w)-cam.x,y=(i%2?454:636)+((i*13)%23)-cam.y;rect(x,y,3,2,i%3?'#74724d':'#89905c')}rect(615-cam.x,476-cam.y,60,8,'#393b32');rect(620-cam.x,612-cam.y,65,6,'#393b32')}
function drawTree(t){let x=t.x-cam.x,y=t.y-cam.y;if(x<-18||x>W+18||y<-25||y>H+20)return;const s=t.s;if(t.dead){rect(x-2,y-2,5,16,'#514332');rect(x-10,y-4,9,3,'#514332');rect(x+2,y-10,8,3,'#514332');return}rect(x-2*s,y-1*s,5*s,13*s,'#44392d');rect(x-10*s,y-12*s,20*s,16*s,'#28382c');rect(x-7*s,y-18*s,14*s,12*s,'#40503a');rect(x-4*s,y-21*s,7*s,5*s,'#596347');rect(x-9*s,y+3*s,5*s,3*s,'#536042')}
function drawBuilding(l){let x=l.x-cam.x,y=l.y-cam.y;if(x<-140||x>W+140||y<-100||y>H+100)return;if(l.type==='truck'){rect(x-24,y-12,34,21,'#63583e');rect(x+10,y-9,14,18,'#847650');rect(x+12,y-7,9,7,'#576253');rect(x-22,y-9,22,3,'#8e7c4c');rect(x-17,y+8,6,6,'#20231f');rect(x+14,y+8,6,6,'#20231f');rect(x-6,y-11,4,4,'#a44f35');return}rect(x-l.w/2+5,y-l.h/2+9,l.w,l.h,'#252b25');rect(x-l.w/2,y-l.h/2,l.w,l.h,l.color);rect(x-l.w/2-3,y-l.h/2-5,l.w+6,l.h+12,'#423e31');rect(x-l.w/2,y-l.h/2,l.w,l.h,l.color);for(let k=0;k<l.w;k+=12)rect(x-l.w/2+k,y-l.h/2,2,l.h,'#5c513b');rect(x-5,y-l.h/2+4,10,l.h-8,'#544936');rect(x-4,y-3,8,15,'#2e3027');rect(x-l.w/2+8,y-l.h/2+10,14,12,'#a58a55');rect(x-l.w/2+11,y-l.h/2+13,8,7,'#394539');rect(x-l.w/2-4,y-l.h/2-8,l.w+8,5,'#2e342c');rect(x-l.w/2-5,y-l.h/2-10,l.w+10,4,'#81724c');if(l.id==='chapel'){rect(x-5,y-l.h/2-19,10,20,'#77745e');rect(x-2,y-l.h/2-26,4,12,'#b49a5c');rect(x-7,y-l.h/2-20,14,3,'#b49a5c')}rect(x-14,y+l.h/2+8,28,2,'#98804c')}
function drawTank(){let x=624-cam.x,y=555-cam.y;rect(x-31,y-15,63,29,'#20241e');rect(x-26,y-11,52,22,'#62704c');rect(x-19,y-14,38,5,'#444c38');rect(x-19,y+10,38,5,'#444c38');for(let i=0;i<5;i++)rect(x-23+i*10,y-13,3,26,'#333b2e');rect(x-11,y-7,22,14,'#738055');rect(x-5,y-12,13,9,'#566444');rect(x+7,y-10,30,4,'#606d4d');rect(x+27,y-11,9,6,'#3f4938');rect(x+14,y+2,13,5,'#3f4938');rect(x-21,y-6,7,5,'#9b583b');rect(x-4,y-7,5,3,'#947e45');rect(x+20,y+4,8,4,'#8d5037');rect(x-30,y-18,3,4,'#a84931');rect(x-32,y-23,5,4,'#6f6857');rect(x+35,y-13,3,3,'#a54531')}
function drawPlayer(){let x=Math.round(player.x-cam.x),y=Math.round(player.y-cam.y),d=player.dir;rect(x-5,y+5,11,3,'#252b22');rect(x-4,y+1,3,5,'#564d36');rect(x+1,y+1,3,5,'#564d36');rect(x-6,y-8,12,11,'#67714b');rect(x-4,y-11,8,5,'#b39167');rect(x-5,y-13,10,4,'#504a35');rect(x-7,y-7,3,8,'#49523a');rect(x+4,y-7,3,8,'#49523a');rect(x-1,y-9,2,2,'#302d25');let gunX=x+(d>0?7:-13);rect(gunX,y-5,6,2,'#252a25');rect(gunX+(d>0?5:-1),y-6,3,1,'#89805f')}
function drawZombie(z){let x=Math.round(z.x-cam.x),y=Math.round(z.y-cam.y);if(x<-20||x>W+20||y<-20||y>H+20)return;let sway=Math.sin(gameTime*.006+z.phase)>0?1:0;rect(x-5,y+5,11,3,'#282c22');rect(x-5,y,4,6,'#4e4b38');rect(x+1,y+1,4,5,'#514c36');rect(x-7,y-8,14,10,'#4f6348');rect(x-5,y-12,10,6,'#79735b');rect(x-5,y-14,9,4,'#554c3c');rect(x-7,y-5,3,8,'#56674b');rect(x+4,y-7+sway,5,3,'#74684a');rect(x-3,y-10,2,2,'#b85c43');if(z.hp<2)rect(x+3,y-2,3,2,'#994b3c')}
function drawLoot(l){if(l.used)return;let x=l.x-cam.x,y=l.y-cam.y;if(x<-15||x>W+15||y<-15||y>H+15)return;rect(x-5,y-4,10,9,'#1c241d');rect(x-4,y-5,8,8,l.type==='fuel'?'#9a7242':l.type==='med'?'#a95142':l.type==='parts'?'#8a8356':'#b09a57');rect(x-2,y-3,4,4,'#d7c78c');if(l.type==='med'){rect(x-1,y-4,2,7,'#eee0ba');rect(x-3,y-2,6,2,'#eee0ba')}}
function drawWorld(){drawGround();trees.forEach(drawTree);locations.forEach(drawBuilding);drawTank();loot.forEach(drawLoot);zombies.filter(z=>z.alive).forEach(drawZombie);bullets.forEach(b=>{rect(b.x-cam.x-1,b.y-cam.y-1,4,2,'#edc879');rect(b.x-cam.x,b.y-cam.y,2,2,'#fff2ad')});drawPlayer();if(Math.random()<.13){let x=rand(0,W),y=rand(15,H);rect(x,y,1,1,'#b8a269')}}
function overlay(title,body,actions=[]){overlayOpen=true;const el=$('screen-overlay'),card=$('overlay-card');card.innerHTML=`<div class="overlay-kicker">ESTRADA MORTA · RELATÓRIO DE CAMPO</div><h2>${title}</h2><p>${body}</p>${actions.length?`<div class="overlay-actions">${actions.map(a=>`<button class="game-button ${a[2]?'secondary':''}" data-action="${a[1]}">${a[0]}</button>`).join('')}</div>`:''}`;el.classList.remove('hidden');card.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{if(b.dataset.action==='close')closeOverlay();if(b.dataset.action==='restart')location.reload()})}
function closeOverlay(){overlayOpen=false;$('screen-overlay').classList.add('hidden')}
function openInventory(){overlay('MOCHILA DE CAMPANHA','Itens recuperados no setor. Use um curativo para recuperar 35 pontos de vitalidade.',[['USAR CURATIVO · [ H ]','med'],['FECHAR','close',true]]);const b=$('overlay-card').querySelector('[data-action="med"]');if(b)b.onclick=()=>{useMed();closeOverlay()};const items=[['✚','Curativos',inventory.bandage],['▤','Munição reserva',inventory.ammo],['▣','Combustível',inventory.fuel],['⌁','Peças de rádio',inventory.parts],['♟','Raçoes',inventory.food],['⚙','Sucata',inventory.scrap]];$('overlay-card').insertAdjacentHTML('beforeend',`<div class="overlay-grid">${items.map(a=>`<div class="inventory-cell"><span>${a[0]}</span><b>${a[1]}</b><small>QUANTIDADE · ${a[2]}</small></div>`).join('')}</div>`)}
function openJournal(){overlay('DIÁRIO DE CAMPO','Anotações de Elias Voss · França ocupada · 1944',[]);$('overlay-card').insertAdjacentHTML('beforeend',`<div class="journal-entry"><b>23:40 · RODOVIA 9</b><p>O Tiger parou no meio da estrada. Há infectados por toda parte. Preciso de combustível.</p></div><div class="journal-entry"><b>OBJETIVOS DA OPERAÇÃO</b><p>1. Combustível no posto · 2. Peças na fazenda · 3. Sinal na capela · 4. Posto de comando · 5. Extração a leste.</p></div><div class="overlay-actions"><button class="game-button secondary" data-action="close">FECHAR</button></div>`);$('overlay-card').querySelector('[data-action=close]').onclick=closeOverlay}
function beep(){try{const ac=new(window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),g=ac.createGain();o.type='square';o.frequency.value=105;g.gain.setValueAtTime(.035,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.09);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.09);o.onended=()=>ac.close()}catch(e){}}
function toggleMap(){worldMap=!worldMap;if(worldMap)showToast('MAPA DA REGIÃO · M PARA VOLTAR');else showToast('RODOVIA 9 · SETOR LESTE')}
window.addEventListener('keydown',e=>{const k=e.key==='Shift'?'Shift':e.key.toLowerCase();keys[k]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat)return;if(k==='e')interact();if(k===' '||k==='j')fire();if(k==='q')selectWeapon((player.weapon+1)%weapons.length);if(k==='r')reload();if(k==='i')openInventory();if(k==='h')useMed();if(k==='m')toggleMap();if(k==='escape'){if(overlayOpen)closeOverlay();else if(worldMap)toggleMap()}});
window.addEventListener('keyup',e=>{const k=e.key==='Shift'?'Shift':e.key.toLowerCase();keys[k]=false});
$('inventory-btn').onclick=openInventory;$('journal-btn').onclick=openJournal;$('map-btn').onclick=toggleMap;$('help-btn').onclick=()=>overlay('COMO JOGAR','Explore a região e siga os objetivos. Caminhe com WASD ou setas; aproxime-se de objetos e pressione E. Espaço ataca na direção em que você está olhando. Q alterna armas, R recarrega, I abre a mochila e H usa curativo. Procure abrigo, vasculhe edifícios e sobreviva à horda.',[['ENTENDI','close']]);$('help-btn').addEventListener('click',()=>{$('overlay-card').querySelector('[data-action=close]').onclick=closeOverlay});$('sound-btn').onclick=()=>{soundOn=!soundOn;$('sound-btn').textContent=soundOn?'♫':'♩';showToast(soundOn?'EFEITOS DE SOM ATIVADOS':'EFEITOS DE SOM DESATIVADOS')};
document.querySelectorAll('[data-move]').forEach(b=>{const dir=b.dataset.move;const key={up:'w',down:'s',left:'a',right:'d'}[dir];b.addEventListener('pointerdown',e=>{e.preventDefault();keys[key]=true});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys[key]=false))});$('mobile-action').onclick=interact;$('mobile-fire').onclick=fire;
updateUI();notice('A ESTRADA ESTÁ TOMADA\nENCONTRE COMBUSTÍVEL NO POSTO');requestAnimationFrame(frame);
})();
