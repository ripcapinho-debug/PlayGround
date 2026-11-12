(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width, H = canvas.height;
  const world = { w: 1420, h: 900 };
  const keys = new Set();
  const player = { x: 150, y: 465, r: 9, health: 3, invuln: 0, facing: 1, moving: false };
  const tank = { x: 145, y: 460 };
  const parts = [
    { x: 1250, y: 265, name: 'Final drive', icon: '⚙', found: false, color: '#b8a879' },
    { x: 1170, y: 705, name: 'Track link', icon: '▰', found: false, color: '#a7aa82' },
    { x: 500, y: 720, name: 'Fuel filter', icon: '▤', found: false, color: '#c27b50' },
    { x: 795, y: 320, name: 'Radio coil', icon: '⌁', found: false, color: '#9eae83' }
  ];
  const medkits = [{ x: 695, y: 570, found: false }, { x: 1280, y: 410, found: false }];
  const enemies = [
    { x: 640, y: 190, vx: 1, vy: 0, alert: 0, seed: 1 },
    { x: 915, y: 550, vx: 0, vy: 1, alert: 0, seed: 2 },
    { x: 365, y: 640, vx: -1, vy: 0, alert: 0, seed: 3 },
    { x: 1240, y: 225, vx: 0, vy: -1, alert: 0, seed: 4 }
  ];
  const buildings = [
    { x: 245, y: 110, w: 185, h: 126, kind: 0 }, { x: 475, y: 105, w: 130, h: 112, kind: 1 },
    { x: 720, y: 110, w: 180, h: 135, kind: 1 }, { x: 1020, y: 95, w: 180, h: 125, kind: 0 },
    { x: 210, y: 345, w: 145, h: 130, kind: 1 }, { x: 470, y: 300, w: 155, h: 135, kind: 0 },
    { x: 1040, y: 320, w: 170, h: 135, kind: 1 }, { x: 270, y: 570, w: 150, h: 125, kind: 0 },
    { x: 650, y: 690, w: 160, h: 120, kind: 1 }, { x: 930, y: 640, w: 175, h: 138, kind: 0 }
  ];
  let camera = { x: 0, y: 0 }, state = 'intro', timeLeft = 240, last = 0;
  let repair = 0, messageTimer = 0, damageFlash = 0, walkCycle = 0, elapsed = 0;
  const overlay = document.getElementById('overlay');
  const endPanel = document.getElementById('endPanel');
  const messageEl = document.getElementById('message');
  const heartsEl = document.getElementById('hearts');
  const timerEl = document.getElementById('timer');
  const objectiveText = document.getElementById('objectiveText');
  const objectiveSub = document.getElementById('objectiveSub');
  const rand = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function showMessage(text, duration = 2.4) {
    messageEl.textContent = text; messageEl.classList.add('visible'); messageTimer = duration;
  }
  function updateHud() {
    heartsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) { const span = document.createElement('span'); span.className = 'heart' + (i >= player.health ? ' empty' : ''); span.textContent = '♥'; heartsEl.appendChild(span); }
    const found = parts.filter(p => p.found).length;
    objectiveText.textContent = found === 4 ? 'Return to your Tiger' : 'Find the tank parts';
    objectiveSub.textContent = found === 4 ? (repair > 0 ? 'Hold E to complete repairs' : '4 / 4 · return to the tank') : `${found} / 4 recovered`;
    const mins = Math.floor(timeLeft / 60), secs = Math.floor(timeLeft % 60);
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerEl.style.color = timeLeft < 45 ? '#cc7758' : '';
  }
  function endGame(won) {
    if (state !== 'playing') return;
    state = won ? 'won' : 'lost';
    document.getElementById('endTitle').textContent = won ? 'THE ENGINE CATCHES' : 'LOST TO THE DARK';
    document.getElementById('endText').textContent = won
      ? 'The old Tiger shudders back to life. You leave the village behind as the last light fades. Tonight, you make it home.'
      : 'The search ends here. The village is swallowed by the infected, and the engine never turns over.';
    endPanel.classList.remove('hidden');
  }
  function startGame() {
    overlay.style.display = 'none'; endPanel.classList.add('hidden'); state = 'playing'; last = performance.now();
    showMessage('Find four repair parts. Stay out of reach.', 3.2);
    requestAnimationFrame(loop);
  }
  document.getElementById('startButton').addEventListener('click', startGame);
  document.getElementById('restartButton').addEventListener('click', () => location.reload());
  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    const key = e.key.toLowerCase(); keys.add(key);
    if (key === 'e' || key === ' ') interact();
    if (key === 'escape' && state === 'playing') { state = 'paused'; showMessage('PAUSED · PRESS ESC TO RESUME', 99); }
    else if (key === 'escape' && state === 'paused') { state = 'playing'; last = performance.now(); messageEl.classList.remove('visible'); requestAnimationFrame(loop); }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  const touchAction = document.getElementById('touchInteract');
  touchAction.addEventListener('pointerdown', e => { e.preventDefault(); keys.add('touchAction'); touchAction.setPointerCapture(e.pointerId); interact(); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => touchAction.addEventListener(type, () => keys.delete('touchAction')));
  document.querySelectorAll('[data-dir]').forEach(button => {
    const dir = button.dataset.dir;
    button.addEventListener('pointerdown', e => { e.preventDefault(); keys.add('touch' + dir); button.setPointerCapture(e.pointerId); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(type => button.addEventListener(type, () => keys.delete('touch' + dir)));
  });
  function interact() {
    if (state === 'playing' && parts.every(p => p.found) && Math.hypot(player.x - tank.x, player.y - tank.y) < 70) {
      showMessage('HOLD E TO REPAIR THE ENGINE', 1.4);
    }
  }
  function collideBuilding(x, y) {
    return buildings.some(b => x > b.x - 12 && x < b.x + b.w + 12 && y > b.y - 8 && y < b.y + b.h + 8);
  }
  function update(dt) {
    elapsed += dt;
    if (state !== 'playing') return;
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; updateHud(); endGame(false); return; }
    let dx = (keys.has('d') || keys.has('arrowright') || keys.has('touchright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') || keys.has('touchleft') ? 1 : 0);
    let dy = (keys.has('s') || keys.has('arrowdown') || keys.has('touchdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') || keys.has('touchup') ? 1 : 0);
    const moving = !!(dx || dy); player.moving = moving;
    if (moving) {
      const mag = Math.hypot(dx, dy); dx /= mag; dy /= mag; player.facing = dx < 0 ? -1 : dx > 0 ? 1 : player.facing;
      const speed = keys.has('shift') ? 140 : 100; const nx = clamp(player.x + dx * speed * dt, 18, world.w - 18); const ny = clamp(player.y + dy * speed * dt, 18, world.h - 18);
      if (!collideBuilding(nx, player.y)) player.x = nx;
      if (!collideBuilding(player.x, ny)) player.y = ny;
      walkCycle += dt * (keys.has('shift') ? 15 : 10);
    }
    player.invuln = Math.max(0, player.invuln - dt); damageFlash = Math.max(0, damageFlash - dt);
    for (const enemy of enemies) {
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < 205) enemy.alert = 1.8;
      enemy.alert = Math.max(0, enemy.alert - dt);
      if (enemy.alert > 0) {
        const ex = (player.x - enemy.x) / (dist || 1), ey = (player.y - enemy.y) / (dist || 1);
        const speed = 34; const nx = enemy.x + ex * speed * dt, ny = enemy.y + ey * speed * dt;
        if (!collideBuilding(nx, enemy.y)) enemy.x = nx;
        if (!collideBuilding(enemy.x, ny)) enemy.y = ny;
      } else {
        enemy.x += Math.sin(elapsed * .65 + enemy.seed) * 13 * dt;
        enemy.y += Math.cos(elapsed * .8 + enemy.seed) * 11 * dt;
      }
      if (dist < 18 && player.invuln <= 0) {
        player.health--; player.invuln = 1.25; damageFlash = .35; showMessage('THE INFECTED GOT TOO CLOSE!', 1.8); updateHud();
        if (player.health <= 0) { endGame(false); return; }
      }
    }
    for (const part of parts) if (!part.found && Math.hypot(player.x - part.x, player.y - part.y) < 24) {
      part.found = true; showMessage(`${part.name.toUpperCase()} RECOVERED`, 2); updateHud();
      if (parts.every(p => p.found)) showMessage('ALL PARTS FOUND. RETURN TO YOUR TIGER.', 3);
    }
    for (const kit of medkits) if (!kit.found && player.health < 3 && Math.hypot(player.x - kit.x, player.y - kit.y) < 22) {
      kit.found = true; player.health++; showMessage('MEDICAL SUPPLIES FOUND · CONDITION RESTORED', 2); updateHud();
    }
    if (parts.every(p => p.found) && Math.hypot(player.x - tank.x, player.y - tank.y) < 70) {
      if (keys.has('e') || keys.has(' ') || keys.has('touchAction')) {
        repair = Math.min(3, repair + dt); showMessage('REPAIRING ENGINE… KEEP HOLDING', 1.1);
        if (repair >= 3) { endGame(true); return; }
      } else repair = 0;
    } else repair = 0;
    const targetX = clamp(player.x - W / 2, 0, world.w - W), targetY = clamp(player.y - H / 2, 0, world.h - H);
    camera.x += (targetX - camera.x) * Math.min(1, dt * 5); camera.y += (targetY - camera.y) * Math.min(1, dt * 5);
    if (messageTimer > 0) { messageTimer -= dt; if (messageTimer <= 0) messageEl.classList.remove('visible'); }
    updateHud();
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
  function drawGround() {
    rect(0,0,world.w,world.h,'#343c2c');
    for (let y=0;y<world.h;y+=16) for(let x=0;x<world.w;x+=16){
      const n=rand(x*2+y*7); if(n>.53) rect(x,y,16,16,n>.87?'#3b4330':n>.72?'#353e2e':'#333b2c');
      if(n>.955) rect(x+3,y+5,2,2,'#616047');
    }
    // Mud road running through the abandoned village
    rect(0,425,world.w,80,'#514b38'); rect(0,431,world.w,5,'#625b42'); rect(0,493,world.w,4,'#423f31');
    for(let i=0;i<38;i++){const x=i*39+((i%3)*7);rect(x,440+(i%4)*12,18+(i%3)*7,3,'#635a3f');rect(x+13,468-(i%3)*8,13,3,'#3f4030');}
    for(let i=0;i<34;i++){const x=rand(i+800)*world.w,y=rand(i+1500)*world.h; if(!buildings.some(b=>x>b.x-20&&x<b.x+b.w+20&&y>b.y-20&&y<b.y+b.h+20)) drawGrass(x,y);}
    // scattered crater marks
    for(let i=0;i<13;i++){const x=70+i*103,y=85+rand(i+32)*720;ctx.fillStyle='#252c22';ctx.beginPath();ctx.ellipse(x,y,12,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#464637';ctx.fillRect(x-7,y-1,13,2);}
  }
  function drawGrass(x,y){rect(x,y,2,6,'#77804e');rect(x+2,y+2,2,4,'#606c43');rect(x-2,y+3,2,3,'#83834e')}
  function drawBuilding(b){
    const {x,y,w,h,kind}=b;
    rect(x+8,y+9,w,h,'#22271e'); rect(x+4,y+4,w,h,'#5b5542');rect(x,y,w,h,'#766d54');
    rect(x+6,y+5,w-12,h-11,kind?'#625d49':'#6d654e');
    // roof damage / floor patches
    rect(x+12,y+10,w-24,5,'#82785b');
    for(let i=0;i<8;i++){const rx=x+10+rand(i+x)* (w-20),ry=y+15+rand(i+y)* (h-25);rect(rx,ry,7+rand(i)*9,5,'#554f3f');}
    if(kind===0){rect(x+w*.43,y+h-15,21,15,'#27291f');rect(x+w*.43+4,y+h-15,13,3,'#948260');}
    else {rect(x+18,y+h-24,22,18,'#252a21');rect(x+20,y+h-22,18,14,'#a28a5b');rect(x+23,y+h-20,12,9,'#474735');}
    rect(x+18,y+28,28,16,'#282e24');rect(x+21,y+31,22,10,'#7c7959');rect(x+w-47,y+24,25,15,'#292f23');rect(x+w-44,y+27,19,9,'#8b7954');
    // blasted corner
    rect(x+w-16,y+h-10,16,10,'#35392b');rect(x+w-10,y+h-18,10,9,'#514d3c');
    rect(x+8,y+h,w-8,3,'#292e24');
  }
  function drawTree(x,y,scale=1){
    const s=scale;rect(x-3*s,y+3*s,7*s,11*s,'#514735');
    rect(x-12*s,y-9*s,23*s,16*s,'#253327');rect(x-8*s,y-15*s,18*s,10*s,'#303d2d');rect(x-4*s,y-19*s,11*s,7*s,'#354430');
    rect(x-10*s,y-6*s,5*s,4*s,'#46543a');rect(x+3*s,y-12*s,5*s,5*s,'#46533a');
  }
  function drawWrecks(){
    // burned-out truck
    rect(870,465,65,28,'#242922');rect(879,450,31,20,'#343a31');rect(884,454,19,9,'#68705a');rect(912,455,16,12,'#454537');
    for(const x of [881,919]){ctx.fillStyle='#181d18';ctx.beginPath();ctx.arc(x,491,6,0,Math.PI*2);ctx.fill();}
    rect(856,483,15,7,'#705540');rect(941,474,13,3,'#826449');
    // crates / shell casings
    [[575,530],[595,535],[980,275],[1335,615],[425,260]].forEach(([x,y])=>{rect(x,y,17,13,'#66543b');rect(x+2,y+2,13,2,'#98804f');rect(x+7,y,2,13,'#4e4733')});
  }
  function drawTank(){
    const x=tank.x,y=tank.y;
    // track and hull silhouette
    rect(x-49,y-23,100,47,'#242a23');rect(x-44,y-19,90,39,'#4a5040');
    for(let i=0;i<7;i++){rect(x-38+i*12,y-17,7,3,'#858267');rect(x-38+i*12,y+14,7,3,'#858267');}
    rect(x-32,y-17,65,34,'#5b6248');rect(x-27,y-13,55,26,'#737754');
    rect(x-14,y-12,31,25,'#596044');rect(x-9,y-17,20,16,'#777a54');rect(x-3,y-14,9,10,'#858763');
    rect(x+12,y-5,47,7,'#696e4c');rect(x+49,y-3,12,3,'#555b41');
    rect(x-43,y-8,9,8,'#767a54');rect(x+35,y+7,8,7,'#353d2d');
    // canvas, tools and repair glow
    rect(x-54,y-34,20,10,'#5a4934');rect(x-50,y-32,15,6,'#8c714b');
    if(parts.every(p=>p.found)){rect(x-5,y-2,10,4,'#c7c97d');}
    // marker
    if(parts.every(p=>p.found)){const pulse=1+Math.sin(elapsed*4)*.18;rect(x-2,y-54,4,4,'#d4d691');rect(x-5,y-47,10,2,'#c5c986');}
  }
  function drawPart(p){
    if(p.found)return; const bob=Math.sin(elapsed*3+p.x)*2;
    rect(p.x-10,p.y+5+bob,20,5,'#20271f');rect(p.x-8,p.y-4+bob,16,12,p.color);rect(p.x-5,p.y-7+bob,10,5,'#d1c69b');rect(p.x-3,p.y-1+bob,6,6,'#4b503d');
    rect(p.x-2,p.y-15+bob,4,3,'#d5d69c');
  }
  function drawMedkit(k){if(k.found)return;rect(k.x-9,k.y-6,18,13,'#ddd8bd');rect(k.x-6,k.y-3,12,7,'#a75442');rect(k.x-1,k.y-2,3,5,'#e1d8b8');rect(k.x-3,k.y,7,2,'#e1d8b8');}
  function drawPlayer(){
    const x=player.x,y=player.y,step=player.moving?Math.sin(walkCycle)*2:0;
    if(player.invuln>0&&Math.floor(elapsed*12)%2===0)return;
    rect(x-8,y+7,16,4,'#20261f');
    // boots / legs
    rect(x-5,y+4+step,4,5,'#292d27');rect(x+2,y+4-step,4,5,'#292d27');
    rect(x-7,y-4,14,10,'#62634e');rect(x-6,y-2,12,7,'#737258');
    // backpack and shoulders
    rect(x-9,y-5,4,8,'#4d523e');rect(x+5,y-6,4,7,'#4a503d');rect(x-5,y-10,10,7,'#77765a');
    // head and cap
    rect(x-4,y-15,8,7,'#c1a17c');rect(x-5,y-17,10,4,'#4c513f');rect(x-3,y-19,7,3,'#64634a');
    // rifle silhouette held across body
    rect(x+2*player.facing,y-6,11*player.facing,2,'#312d24');rect(x+11*player.facing,y-7,3*player.facing,2,'#706044');
    rect(x-2,y-7,4,3,'#bd9b73');
  }
  function drawEnemy(e){
    const x=e.x,y=e.y, wob=Math.sin(elapsed*8+e.seed)*1.5;
    rect(x-8,y+8,17,4,'#20241d');rect(x-5,y+3+wob,4,7,'#313b32');rect(x+2,y+4-wob,4,6,'#303a31');
    rect(x-8,y-6,16,12,'#47513f');rect(x-10,y-4,4,7,'#6a5544');rect(x+6,y-3,4,7,'#6a5544');
    rect(x-4,y-14,9,9,'#7c785b');rect(x-5,y-13,10,5,'#6b4037');rect(x-4,y-9,3,2,'#d3a36a');rect(x+2,y-9,3,2,'#d3a36a');
    rect(x-7,y-1,4,3,'#a3614b');rect(x+4,y+2,4,2,'#995b46');
    if(e.alert>0){rect(x-1,y-22,3,3,'#c07a50');rect(x-5,y-25,11,2,'#c07a50');}
  }
  function drawMinimap(){
    const mw=106,mh=68,x=W-mw-13,y=13;rect(x-3,y-3,mw+6,mh+6,'#131a14');rect(x,y,mw,mh,'#30392a');
    for(const b of buildings){rect(x+b.x/world.w*mw,y+b.y/world.h*mh,Math.max(3,b.w/world.w*mw),Math.max(3,b.h/world.h*mh),'#6b634b');}
    rect(x+tank.x/world.w*mw-2,y+tank.y/world.h*mh-2,5,5,'#aeb77a');
    parts.filter(p=>!p.found).forEach(p=>rect(x+p.x/world.w*mw-1,y+p.y/world.h*mh-1,3,3,'#d4a36a'));
    rect(x+player.x/world.w*mw-2,y+player.y/world.h*mh-2,4,4,'#e6e2c8');
    ctx.strokeStyle='#c2c89b55';ctx.lineWidth=1;ctx.strokeRect(x,y,mw,mh);
  }
  function render(){
    ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));
    drawGround();
    // debris and scrub in predictable spots
    for(let i=0;i<48;i++){const x=rand(i+81)*world.w,y=rand(i+218)*world.h;if(!buildings.some(b=>x>b.x-20&&x<b.x+b.w+20&&y>b.y-20&&y<b.y+b.h+20))drawTree(x,y,rand(i+9)>.75?1:.7);}
    drawWrecks();
    for(const b of buildings)drawBuilding(b);
    drawTank(); parts.forEach(drawPart); medkits.forEach(drawMedkit);
    enemies.forEach(drawEnemy);drawPlayer();
    // world perimeter
    rect(0,0,world.w,5,'#20291f');rect(0,world.h-5,world.w,5,'#20291f');rect(0,0,5,world.h,'#20291f');rect(world.w-5,0,5,world.h,'#20291f');
    ctx.restore();drawMinimap();
    if(damageFlash>0){ctx.fillStyle=`rgba(166,65,45,${damageFlash*.26})`;ctx.fillRect(0,0,W,H);}
    // interaction hint
    if(parts.every(p=>p.found)&&Math.hypot(player.x-tank.x,player.y-tank.y)<85&&state==='playing'){
      rect(W/2-86,H-44,172,26,'#131914dd');ctx.fillStyle='#d5d4bc';ctx.font='9px "DM Mono", monospace';ctx.textAlign='center';ctx.fillText('HOLD  E  TO REPAIR',W/2,H-28);ctx.textAlign='left';
    }
  }
  function loop(now){
    if(state!=='playing')return;
    const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);render();
    if(state==='playing')requestAnimationFrame(loop);
  }
  updateHud(); render();
})();
