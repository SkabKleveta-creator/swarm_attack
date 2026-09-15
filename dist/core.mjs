export const MELEE = {
  sword: { name: 'Longsword', detail: 'Quick, balanced sweeps', damage: 34, reach: 2.9, arc: 1.2, cooldown: .43, cost: 9 },
  axe: { name: 'Battle axe', detail: 'Wide cuts. Heavy impact.', damage: 52, reach: 2.8, arc: 1.55, cooldown: .69, cost: 15 },
  mace: { name: 'Iron mace', detail: 'Crush and stagger', damage: 47, reach: 2.6, arc: 1.05, cooldown: .57, cost: 12 },
  club: { name: 'War club', detail: 'Fast swings. Low stamina.', damage: 26, reach: 2.7, arc: 1.3, cooldown: .34, cost: 6 },
};
export const RANGED = {
  bow: { name: 'Longbow', detail: '24 arrows · steady rhythm', damage: 56, speed: 34, gravity: 1.8, cooldown: .75, capacity: 24 },
  crossbow: { name: 'Crossbow', detail: '16 bolts · high damage', damage: 92, speed: 48, gravity: .55, cooldown: 1.3, capacity: 16 },
  sling: { name: 'Sling', detail: 'Unlimited stones · fast release', damage: 29, speed: 29, gravity: 4.2, cooldown: .49, capacity: Infinity },
};
export const ENEMIES = {
  zombie: { name: 'Hollow', hp: 66, speed: 1.18, radius: .43, damage: 10, windup: .8, reach: 1.65, height: 1.75, score: 100 },
  demon: { name: 'Cinder demon', hp: 86, speed: 2.4, radius: .43, damage: 14, windup: .58, reach: 1.9, height: 1.95, score: 175 },
  monster: { name: 'Grave brute', hp: 250, speed: .87, radius: .87, damage: 28, windup: 1.25, reach: 3.15, height: 3.3, score: 450 },
};
export const OBSTACLES = [
  {x:-7,z:-8,r:1.35}, {x:7,z:-8,r:1.35},
  {x:-7,z:7,r:1.35}, {x:7,z:7,r:1.35},
  {x:-16,z:-15,r:1}, {x:16,z:-15,r:1},
  {x:-16,z:15,r:1}, {x:16,z:15,r:1},
];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const toward=(x,z)=>Math.atan2(x,-z);
const length=(x,z)=>Math.hypot(x,z);
let serial=1;

export class HordeGame {
  constructor(random=Math.random) {
    this.random=random;
    this.melee='sword'; this.ranged='bow';
    this.reset(); this.mode='ready';
  }
  reset() {
    this.player={x:0,z:10,yaw:0,hp:100,stamina:100,mode:'melee',attack:0,attackDuration:0,heavy:false,combo:0,dodge:0,dodgeCooldown:0,invuln:0,guard:false,aim:false,speed:0,hitFlash:0,heal:3,ammo:{bow:24,crossbow:16,sling:Infinity}};
    this.enemies=[]; this.projectiles=[]; this.pickups=[]; this.events=[];
    this.wave=0; this.kills=0; this.score=0; this.elapsed=0;
    this.spawnQueue=[]; this.spawnTimer=0; this.intermission=0; this.waveTotal=0;
    this.mode='playing'; this.cooldown=0; this.staminaWait=0; this.comboAge=0; this.pendingSwing=null;
  }
  start(){ this.reset();this.nextWave(); }
  emit(type,data={}){ this.events.push({...data,type}); }
  takeEvents(){const e=this.events;this.events=[];return e;}
  setLoadout(melee,ranged){
    if(!MELEE[melee]||!RANGED[ranged])throw new Error('Unknown weapon');
    this.melee=melee;this.ranged=ranged;this.emit('equip');
  }
  toggleWeapon(){if(this.mode!=='playing')return;this.player.mode=this.player.mode==='melee'?'ranged':'melee';this.cooldown=Math.max(this.cooldown,.22);this.emit('equip');}
  nextWave(){
    this.wave++;this.intermission=0;
    const count=Math.min(9+this.wave*3,39);
    this.spawnQueue=[];
    for(let i=0;i<count;i++){
      let type='zombie';
      if(i%4===2)type='demon';
      if(this.wave>=2&&i%(this.wave>=5?7:11)===6)type='monster';
      this.spawnQueue.push(type);
    }
    this.waveTotal=count;
    this.spawnTimer=.5;
    this.emit('wave',{wave:this.wave});
  }
  spawn(type,x,z){
    const d=ENEMIES[type],p=this.player;
    if(x===undefined){
      let a=this.random()*Math.PI*2;
      x=clamp(p.x+Math.sin(a)*19,-20.5,20.5);
      z=clamp(p.z-Math.cos(a)*19,-20.5,20.5);
      if(length(x-p.x,z-p.z)<11){x=p.x>0?-20:20;z=p.z>0?-18:18;}
    }
    const growth=1+Math.max(0,this.wave-1)*.1;
    const e={id:serial++,type,x,z,yaw:toward(p.x-x,p.z-z),hp:d.hp*growth,maxHp:d.hp*growth,
      radius:d.radius,height:d.height,speed:d.speed*Math.min(1.65,1+this.wave*.023),
      state:'chase',timer:0,stagger:0,flash:0,age:0,phase:this.random()*6.28,
      windup:d.windup,attackAngle:0,dead:false,death:0};
    this.enemies.push(e);this.resolve(e);this.emit('spawn',{enemy:e});return e;
  }
  resolve(actor){
    const r=actor.radius||.4;
    actor.x=clamp(actor.x,-21.2+r,21.2-r);actor.z=clamp(actor.z,-21.2+r,21.2-r);
    for(const o of OBSTACLES){const dx=actor.x-o.x,dz=actor.z-o.z,dist=length(dx,dz),gap=o.r+r;
      if(dist<gap){const n=dist||.001;actor.x=o.x+(dx||.001)/n*gap;actor.z=o.z+dz/n*gap;}
    }
  }
  dodge(dx=0,dz=0){
    const p=this.player;if(this.mode!=='playing'||p.stamina<24||p.dodgeCooldown>0)return false;
    p.stamina-=24;this.staminaWait=.65;p.dodge=.36;p.dodgeCooldown=.75;p.invuln=.4;
    if(length(dx,dz)<.1){dx=Math.sin(p.yaw);dz=-Math.cos(p.yaw);}
    const n=length(dx,dz);p.dodgeX=dx/n;p.dodgeZ=dz/n;p.guard=false;
    this.emit('dodge');return true;
  }
  heal(){const p=this.player;if(this.mode!=='playing'||p.heal<1||p.hp>=100)return false;
    p.heal--;p.hp=Math.min(100,p.hp+45);this.emit('heal');return true;}
  attack(heavy=false,aimPoint=null){
    const p=this.player;
    if(this.mode!=='playing'||this.cooldown>0||p.dodge>0||p.guard)return false;
    if(p.mode==='ranged')return this.shoot(aimPoint);
    const w=MELEE[this.melee],cost=w.cost*(heavy?2:1);
    if(p.stamina<cost){this.emit('tired');return false;}
    p.stamina-=cost;this.staminaWait=.48;this.cooldown=w.cooldown*(heavy?1.65:1);
    p.attack=this.cooldown;p.attackDuration=this.cooldown;p.heavy=heavy;
    p.combo=this.comboAge<1.2?(p.combo+1)%3:0;this.comboAge=0;
    this.emit('swing',{heavy,weapon:this.melee});
    const reach=w.reach+(heavy?.55:0),arc=w.arc+(heavy?.45:0);
    // Apply impact partway through the animation; the player can still turn.
    this.pendingSwing={time:heavy?.27:.13,reach,arc,damage:w.damage*(heavy?1.85:1),heavy,hit:false};
    return true;
  }
  strike(swing){
    const p=this.player;let count=0;
    for(const e of this.enemies){
      if(e.dead)continue;
      const dx=e.x-p.x,dz=e.z-p.z,d=length(dx,dz);
      if(d>swing.reach+e.radius)continue;
      if(d>.75&&Math.abs(angleDiff(toward(dx,dz),p.yaw))>swing.arc)continue;
      this.hurtEnemy(e,swing.damage,swing.heavy?1.3:.35);count++;
      e.x+=Math.sin(p.yaw)*(swing.heavy?.85:.28);e.z-=Math.cos(p.yaw)*(swing.heavy?.85:.28);this.resolve(e);
    }
    if(count){this.emit('impact',{count,heavy:swing.heavy});}
  }
  shoot(aimPoint){
    const p=this.player,w=RANGED[this.ranged];
    if(p.ammo[this.ranged]<=0){this.emit('empty');return false;}
    p.ammo[this.ranged]--;this.cooldown=w.cooldown;p.attack=.23;p.attackDuration=.23;
    const x=p.x+Math.cos(p.yaw)*.25+Math.sin(p.yaw)*.5,z=p.z+Math.sin(p.yaw)*.25-Math.cos(p.yaw)*.5,y=1.5;
    let dx=Math.sin(p.yaw),dy=0,dz=-Math.cos(p.yaw);
    if(aimPoint){dx=aimPoint.x-x;dy=aimPoint.y-y;dz=aimPoint.z-z;}
    const d=Math.hypot(dx,dy,dz)||1;dx/=d;dy/=d;dz/=d;
    const shot={id:serial++,x,y,z,vx:dx*w.speed,vy:dy*w.speed,vz:dz*w.speed,life:2.5,kind:this.ranged,damage:w.damage,gravity:w.gravity};
    this.projectiles.push(shot);this.emit('shoot',{kind:this.ranged});return true;
  }
  hurtEnemy(e,amount,stagger=.1){
    if(e.dead)return;e.hp-=amount;e.flash=.16;
    // Heavy blows and maces interrupt attacks; light blows only interrupt small enemies.
    if(stagger>1||this.melee==='mace'||e.type!=='monster'){e.stagger=stagger;e.state='chase';e.timer=0;}
    this.emit('enemyHit',{x:e.x,y:e.height*.6,z:e.z,damage:Math.round(amount),enemyType:e.type});
    if(e.hp<=0){
      e.dead=true;e.death=.85;this.kills++;this.score+=ENEMIES[e.type].score;
      this.emit('kill',{x:e.x,z:e.z,enemyType:e.type});
      if(this.random()<.19||e.type==='monster')this.pickups.push({id:serial++,x:e.x,z:e.z,kind:this.random()<.45?'health':'ammo',life:26});
    }
  }
  hurtPlayer(amount,source){
    const p=this.player;if(p.invuln>0||this.mode!=='playing')return;
    const front=Math.abs(angleDiff(toward(source.x-p.x,source.z-p.z),p.yaw))<1.35;
    if(p.guard&&front&&p.stamina>=amount*.9){
      p.stamina-=amount*.9;this.staminaWait=.8;this.emit('block');p.invuln=.16;return;
    }
    p.hp=Math.max(0,p.hp-amount);p.hitFlash=.45;p.invuln=.48;this.emit('hurt',{amount});
    if(p.hp<=0){this.mode='dead';this.emit('death');}
  }
  step(dt,input={}){
    if(this.mode!=='playing')return;
    dt=Math.min(dt,.05);this.elapsed+=dt;this.comboAge+=dt;
    const p=this.player;this.cooldown=Math.max(0,this.cooldown-dt);this.staminaWait=Math.max(0,this.staminaWait-dt);
    p.attack=Math.max(0,p.attack-dt);p.invuln=Math.max(0,p.invuln-dt);p.hitFlash=Math.max(0,p.hitFlash-dt);
    p.dodgeCooldown=Math.max(0,p.dodgeCooldown-dt);
    p.guard=!!input.guard&&p.mode==='melee'&&p.dodge<=0&&p.attack<=0&&p.stamina>2;
    p.aim=!!input.guard&&p.mode==='ranged';
    let dx=input.x||0,dz=input.z||0,n=length(dx,dz);if(n>1){dx/=n;dz/=n;}
    let speed=p.guard?2.1:p.aim?2.5:input.sprint&&p.stamina>2&&n>.1?6.4:4.05;
    if(p.attack>0&&p.mode==='melee')speed*=.65;
    p.speed=n>.1?speed:0;
    if(p.dodge>0){p.dodge-=dt;p.x+=p.dodgeX*12*dt;p.z+=p.dodgeZ*12*dt;}
    else{p.x+=dx*speed*dt;p.z+=dz*speed*dt;}
    this.resolve(p);
    if(speed>6&&n>.1&&p.dodge<=0){p.stamina=Math.max(0,p.stamina-dt*16);this.staminaWait=.25;}
    else if(this.staminaWait===0&&!p.guard){p.stamina=Math.min(100,p.stamina+dt*24);}
    if(this.pendingSwing){this.pendingSwing.time-=dt;if(this.pendingSwing.time<=0){this.strike(this.pendingSwing);this.pendingSwing=null;}}
    if(this.intermission>0){this.intermission-=dt;if(this.intermission<=0)this.nextWave();}
    else{
      this.spawnTimer-=dt;
      if(this.spawnQueue.length&&this.spawnTimer<=0&&this.enemies.filter(e=>!e.dead).length<26){
        this.spawn(this.spawnQueue.shift());this.spawnTimer=Math.max(.28,1.1-this.wave*.07);
      }
    }
    for(let i=this.enemies.length-1;i>=0;i--){
      const e=this.enemies[i],d=ENEMIES[e.type];e.age+=dt;e.flash=Math.max(0,e.flash-dt);
      if(e.dead){e.death-=dt;if(e.death<=0){this.enemies.splice(i,1);this.emit('removeEnemy',{id:e.id});}continue;}
      if(e.stagger>0){e.stagger-=dt;continue;}
      const ex=p.x-e.x,ez=p.z-e.z,dist=length(ex,ez),angle=toward(ex,ez);
      if(e.state==='windup'){
        e.timer-=dt;
        if(e.timer<=0){
          const within=dist<d.reach+.45;
          const facing=Math.abs(angleDiff(angle,e.attackAngle))<(e.type==='monster'?Math.PI:1.25);
          if(within&&facing)this.hurtPlayer(d.damage*(1+Math.max(0,this.wave-3)*.055),e);
          this.emit('enemyAttack',{x:e.x,z:e.z,enemyType:e.type});e.state='recover';e.timer=e.type==='monster'?1.45:.95;
        }
      }else if(e.state==='recover'){e.timer-=dt;if(e.timer<=0)e.state='chase';}
      else{
        e.yaw+=angleDiff(angle,e.yaw)*Math.min(1,dt*5);
        if(dist<d.reach){e.state='windup';e.timer=d.windup;e.attackAngle=angle;e.yaw=angle;}
        else{
          let mx=ex/(dist||1),mz=ez/(dist||1);
          if(e.type==='demon'&&dist>3){const side=Math.sin(e.phase+e.age*.5)*.8;mx+=Math.cos(angle)*side;mz+=Math.sin(angle)*side;}
          // Steer around pillars before contact so the horde cannot get trapped.
          for(const o of OBSTACLES){const ox=e.x-o.x,oz=e.z-o.z,od=length(ox,oz);if(od<o.r+e.radius+1.7){mx+=ox/(od||1)*1.5;mz+=oz/(od||1)*1.5;}}
          const m=length(mx,mz)||1;e.x+=mx/m*e.speed*dt;e.z+=mz/m*e.speed*dt;
        }
      }
      this.resolve(e);
      for(let j=0;j<i;j++){
        const other=this.enemies[j];if(other.dead)continue;
        const sx=e.x-other.x,sz=e.z-other.z,sep=length(sx,sz),min=e.radius+other.radius;
        if(sep<min&&sep>.001){const push=(min-sep)*.5;e.x+=sx/sep*push;e.z+=sz/sep*push;other.x-=sx/sep*push;other.z-=sz/sep*push;}
      }
      if(dist<e.radius+.35&&p.dodge<=0){const s=(e.radius+.35-dist)*.5;e.x-=ex/(dist||1)*s;e.z-=ez/(dist||1)*s;this.resolve(e);}
    }
    for(let i=this.projectiles.length-1;i>=0;i--){
      const s=this.projectiles[i],ox=s.x,oy=s.y,oz=s.z;
      s.vy-=s.gravity*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.life-=dt;
      let hit=false;
      for(const e of this.enemies){
        if(e.dead)continue;
        const dx=s.x-ox,dy=s.y-oy,dz=s.z-oz;
        const t=clamp(((e.x-ox)*dx+(e.height*.57-oy)*dy+(e.z-oz)*dz)/(dx*dx+dy*dy+dz*dz||1),0,1);
        const px=ox+dx*t,pz=oz+dz*t,py=oy+dy*t;
        if(length(px-e.x,pz-e.z)<e.radius+.16&&py>.15&&py<e.height+.12){
          const headshot=py>e.height*.8;this.hurtEnemy(e,s.damage*(headshot?1.5:1),s.kind==='crossbow'?.8:.25);this.emit('impact',{heavy:headshot,ranged:true});hit=true;break;
        }
      }
      for(const o of OBSTACLES)if(length(s.x-o.x,s.z-o.z)<o.r&&s.y<4)hit=true;
      if(hit||s.life<=0||s.y<0||Math.abs(s.x)>22||Math.abs(s.z)>22){this.projectiles.splice(i,1);this.emit('removeProjectile',{id:s.id});}
    }
    for(let i=this.pickups.length-1;i>=0;i--){
      const a=this.pickups[i];a.life-=dt;
      if(length(a.x-p.x,a.z-p.z)<1.35){
        if(a.kind==='health'){p.hp=Math.min(100,p.hp+16);}else{p.ammo.bow=Math.min(40,p.ammo.bow+5);p.ammo.crossbow=Math.min(28,p.ammo.crossbow+3);}
        this.emit('pickup',{kind:a.kind});this.pickups.splice(i,1);
      }else if(a.life<=0)this.pickups.splice(i,1);
    }
    if(this.mode==='playing'&&this.wave>0&&this.spawnQueue.length===0&&!this.enemies.some(e=>!e.dead)&&this.intermission<=0){
      this.intermission=7;p.hp=Math.min(100,p.hp+25);p.stamina=100;
      p.ammo.bow=Math.min(40,p.ammo.bow+12);p.ammo.crossbow=Math.min(28,p.ammo.crossbow+8);
      if(this.wave%3===0)p.heal=Math.min(3,p.heal+1);
      this.score+=this.wave*250;this.emit('clear',{wave:this.wave});
    }
  }
  getState(){return {status:this.mode,wave:this.wave,kills:this.kills,score:this.score,health:Math.ceil(this.player.hp),stamina:Math.ceil(this.player.stamina),enemies:this.enemies.filter(e=>!e.dead).length,remaining:this.spawnQueue.length,melee:this.melee,ranged:this.ranged,active:this.player.mode};}
}
