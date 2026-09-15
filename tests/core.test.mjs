import test from 'node:test';
import assert from 'node:assert/strict';
import {HordeGame,RANGED} from '../dist/core.mjs';

function arena(){const g=new HordeGame(()=>.8);g.reset();g.player.x=0;g.player.z=5;g.player.yaw=0;g.takeEvents();return g;}
function tick(g,seconds,input={}){for(let t=0;t<seconds;t+=.02)g.step(.02,input);}
function target(g,type='zombie',x=0,z=2){const e=g.spawn(type,x,z);e.state='recover';e.timer=100;return e;}

test('invalid equipment is rejected without changing the loadout',()=>{const g=arena();assert.throws(()=>g.setLoadout('gun','bow'));assert.equal(g.melee,'sword');});
test('a slash damages enemies in front, preserves those behind, and emits the impact event',()=>{
  const g=arena(),front=target(g,'zombie',0,2.6),back=target(g,'zombie',0,7.4);g.attack();tick(g,.16);
  assert.ok(front.hp<front.maxHp);assert.equal(back.hp,back.maxHp);
  const hit=g.takeEvents().find(e=>e.type==='enemyHit');assert.equal(hit.enemyType,'zombie');assert.equal(hit.damage,34);
});
test('a heavy melee hit interrupts a brute attack and costs more stamina',()=>{
  const g=arena(),e=target(g,'monster',0,2.5);e.state='windup';e.timer=1;g.attack(true);tick(g,.3);
  assert.ok(e.stagger>0);assert.equal(e.state,'chase');assert.ok(g.player.stamina<=82);assert.ok(e.hp<e.maxHp-60);
});
for(const ranged of Object.keys(RANGED))test(ranged+' projectile hits a target and consumes the correct ammunition',()=>{
  const g=arena(),e=target(g,'monster',0,-5);g.setLoadout('sword',ranged);g.player.mode='ranged';const before=g.player.ammo[ranged];
  assert.equal(g.attack(false,{x:0,y:1.4,z:-5}),true);tick(g,.6);
  assert.ok(e.hp<e.maxHp,ranged+' should hit');assert.equal(g.player.ammo[ranged],before===Infinity?Infinity:before-1);
});
test('empty bow does not fire or create a projectile',()=>{const g=arena();g.player.mode='ranged';g.player.ammo.bow=0;assert.equal(g.attack(),false);assert.equal(g.projectiles.length,0);});
test('guard stops front damage but does not cover the player’s back',()=>{
  const g=arena();g.player.guard=true;g.hurtPlayer(20,{x:0,z:0});assert.equal(g.player.hp,100);assert.equal(g.player.stamina,82);
  g.player.invuln=0;g.hurtPlayer(20,{x:0,z:10});assert.equal(g.player.hp,80);
});
test('dodge grants brief immunity, moves the player, and respects stamina',()=>{
  const g=arena();target(g,'zombie',10,10);assert.equal(g.dodge(1,0),true);g.hurtPlayer(50,{x:0,z:0});assert.equal(g.player.hp,100);tick(g,.5);assert.ok(g.player.x>3);
  g.hurtPlayer(20,{x:0,z:0});assert.equal(g.player.hp,80);g.player.stamina=0;g.player.dodgeCooldown=0;assert.equal(g.dodge(),false);
});
test('pausing freezes simulation and a lethal hit ends the run',()=>{
  const g=arena();g.mode='paused';const before=g.elapsed;g.step(.05,{x:1,z:0});assert.equal(g.elapsed,before);assert.equal(g.player.x,0);
  g.mode='playing';g.hurtPlayer(120,{x:0,z:0});assert.equal(g.mode,'dead');assert.equal(g.player.hp,0);
});
test('reset clears pending strikes, enemies, score, and spent resources',()=>{
  const g=arena();target(g);g.attack();g.score=100;g.player.heal=0;g.start();assert.equal(g.pendingSwing,null);assert.equal(g.enemies.length,53);assert.equal(g.score,0);assert.equal(g.player.heal,3);
});
test('enemy windup is readable and causes damage only after the windup',()=>{
  const g=arena(),e=target(g,'zombie',0,3.6);e.state='chase';g.step(.02);assert.equal(e.state,'windup');assert.equal(g.player.hp,100);tick(g,.9);assert.ok(g.player.hp<100);
});
