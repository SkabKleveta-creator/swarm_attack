import test from 'node:test';
import assert from 'node:assert/strict';
import {HordeGame,ENEMIES} from '../dist/core.mjs';
import {LEVEL,ENCOUNTERS,SUPPLIES,canStand,findPath,clearLine} from '../dist/level.mjs';

const start=()=>{const g=new HordeGame(()=>.8);g.start();g.takeEvents();return g;};
const tick=(g,s,input={})=>{for(let t=0;t<s;t+=.02)g.step(.02,input);};
const clear=(g,zone)=>{for(const e of g.enemies)if(!zone||e.zone===zone)g.hurtEnemy(e,10000,2);};
function at(g,x,z){g.player.x=x;g.player.z=z;}
function walk(g,x,z){
  const route=findPath(g.player.x,g.player.z,x,z,g.gateOpen,.4);assert.ok(route.length,'destination has a route');
  for(const waypoint of route){const limit=Math.ceil(Math.hypot(waypoint.x-g.player.x,waypoint.z-g.player.z)/.13)+40;for(let n=0;n<limit;n++){const dx=waypoint.x-g.player.x,dz=waypoint.z-g.player.z,d=Math.hypot(dx,dz);if(d<.15)break;g.move(g.player,dx/d*Math.min(d,.13),dz/d*Math.min(d,.13));}assert.ok(Math.hypot(g.player.x-waypoint.x,g.player.z-waypoint.z)<.3,'movement follows the navigable route');}
}

test('level has six areas and exactly 53 distinct authored enemies',()=>{
  assert.equal(LEVEL.rooms.length,6);assert.equal(ENCOUNTERS.length,53);assert.equal(new Set(ENCOUNTERS.map(e=>e.id)).size,53);
  const g=start();assert.equal(g.enemies.length,53);assert.equal(g.enemies.filter(e=>e.boss).length,1);
});
test('every enemy home and patrol point is on accessible ground',()=>{
  for(const e of ENCOUNTERS){assert.ok(canStand(e.x,e.z,e.boss?1.1:ENEMIES[e.type].radius,true),e.id);for(const [x,z]of e.patrol)assert.ok(canStand(x,z,ENEMIES[e.type].radius,true),e.id+' patrol');}
});
test('the safe entrance does not trigger a timed attack or more spawns',()=>{
  const g=start();tick(g,25);assert.equal(g.enemies.length,53);assert.equal(g.player.hp,100);assert.equal(g.elapsed>24,true);
  const events=g.takeEvents();assert.ok(!events.some(e=>['wave','clear','spawn'].includes(e.type)));assert.ok(!g.enemies.find(e=>e.boss).alert);
});
test('distant enemies stay at home and patrols actually move',()=>{
  const g=start(),boss=g.enemies.find(e=>e.boss),patrol=g.enemies.find(e=>e.patrol.length),z=patrol.z;tick(g,2);
  assert.equal(boss.x,boss.home.x);assert.equal(boss.z,boss.home.z);assert.notEqual(patrol.z,z);
});
test('approach or a ranged hit wakes an authored encounter',()=>{
  const g=start(),e=g.enemies.find(e=>e.id==='graves-demon-1');assert.equal(e.alert,false);g.hurtEnemy(e,1);assert.equal(e.alert,true);
  const guard=g.enemies.find(e=>e.id==='gate-zombie-1');at(g,-4,36);g.step(.02);assert.equal(guard.alert,true);
});
test('closed ward gate blocks travel, line of sight, and navigation',()=>{
  const g=start();at(g,0,-53);tick(g,2,{x:0,z:-1});assert.ok(g.player.z>=-54.61);
  assert.equal(clearLine(0,-53,0,-60,.1,false),false);assert.equal(findPath(0,-53,0,-65,false).length,0);
  g.gateOpen=true;tick(g,2,{x:0,z:-1});assert.ok(g.player.z<-59);
});
test('dodging cannot tunnel through map edges or the locked gate',()=>{
  const g=start();at(g,0,-53);g.dodge(0,-1);tick(g,.4);assert.ok(g.player.z>-55);
  at(g,14.8,44);g.player.stamina=100;g.player.dodgeCooldown=0;g.dodge(1,0);tick(g,.4);assert.ok(g.player.x<15.61);
});
test('seals cannot be taken while their guardians are within reach',()=>{
  const g=start();at(g,-40,-9.5);assert.equal(g.contextAction().type,'seal');assert.equal(g.interact(),false);assert.equal(g.seals.size,0);
});
test('either ward can be recovered first; the second opens the gate',()=>{
  for(const order of[[1,0],[0,1]]){const g=start();clear(g);for(const i of order){const s=LEVEL.seals[i];at(g,s.x,s.z+2.5);assert.equal(g.interact(),true);assert.equal(g.gateOpen,g.seals.size===2);}assert.equal(g.seals.size,2);}
});
test('the whole level route is traversable and the ending requires its objectives',()=>{
  const g=start();clear(g);
  walk(g,-40,-9.5);assert.equal(g.interact(),true);walk(g,41,-9.5);assert.equal(g.interact(),true);
  walk(g,LEVEL.shrine.x,LEVEL.shrine.z);assert.equal(g.interact(),true);assert.equal(g.shrineReached,true);
  walk(g,0,-129);assert.equal(g.contextAction().type,'exit');assert.equal(g.interact(),true);assert.equal(g.mode,'complete');
});
test('the breach cannot be sealed before the Bellkeeper falls',()=>{
  const g=start();g.gateOpen=true;g.seals=new Set(LEVEL.seals.map(s=>s.id));at(g,0,-129);assert.equal(g.interact(),false);assert.equal(g.mode,'playing');
});
test('death resumes at the shrine while preserving collected wards and defeated enemies',()=>{
  const g=start();clear(g,'graves');clear(g,'market');clear(g,'cloister');
  for(const s of LEVEL.seals){at(g,s.x,s.z+2.5);g.interact();}
  at(g,0,LEVEL.shrine.z);assert.equal(g.interact(),true);const kills=g.kills,boss=g.enemies.find(e=>e.boss);g.hurtEnemy(boss,100);g.player.hp=1;g.player.invuln=0;g.hurtPlayer(20,{x:0,z:-64});assert.equal(g.mode,'dead');g.respawn();
  assert.equal(g.mode,'playing');assert.equal(g.player.z,LEVEL.shrine.z);assert.equal(g.player.hp,100);assert.equal(g.seals.size,2);assert.equal(g.kills,kills);assert.equal(boss.hp,boss.maxHp);
});
test('supplies are finite and restart restores the original level',()=>{
  const g=start(),cache=SUPPLIES.find(s=>s.id==='gate-ammo');g.player.ammo.bow=0;at(g,cache.x,cache.z);g.step(.02);assert.ok(g.player.ammo.bow>0);assert.ok(!g.pickups.some(p=>p.id===cache.id));
  g.start();assert.equal(g.pickups.length,SUPPLIES.length);assert.equal(g.enemies.length,53);assert.equal(g.seals.size,0);assert.equal(g.gateOpen,false);assert.equal(g.player.z,44);
});
test('a completed level stays complete without generating new enemies',()=>{
  const g=start();g.mode='complete';const n=g.enemies.length,time=g.elapsed;tick(g,20);assert.equal(g.mode,'complete');assert.equal(g.enemies.length,n);assert.equal(g.elapsed,time);
});
