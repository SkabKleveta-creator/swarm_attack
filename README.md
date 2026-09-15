# Swarm Attack

A playable third-person horde slasher set in **Hollow Wake**, a ruined gothic courtyard. The default camera has a classic isometric action-RPG feel. An over-the-shoulder camera is also available.

## Play and develop

The game is a static website. It has no build step, account requirement, or server API. Three.js is vendored locally, including its MIT license, so gameplay does not depend on a CDN.

From this repository, run:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Edit the source files and reload. Use an HTTP server; JavaScript modules do not work reliably when opening the HTML as a local file.

The root entry also works with GitHub Pages configured to serve `main` from the repository root. The existence of this entry does not enable Pages automatically.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Left stick |
| Aim | Mouse; mouse-look in shoulder view | Nearby-enemy assist in isometric view; drag scene in shoulder view |
| Attack / fire | Hold left click | Hold Slash / Fire |
| Heavy attack | Q | Heavy |
| Guard / aim | Hold right click | Hold Guard / Aim |
| Dodge | Space | Dodge |
| Sprint | Shift while moving | — |
| Swap melee / ranged | F or weapon bar | Weapon bar |
| Heal | E | Heal |
| Camera | V or camera button | Camera button |
| Rotate isometric view | R | — |
| Pause and change loadout | P, Escape, or pause button | Pause button |

## Implemented

- Third-person isometric and shoulder cameras, animated 3D characters, a gothic stone arena, light, fog, torch flames, hit effects, and synthesized combat audio.
- Longsword, battle axe, iron mace, and war club, each with different reach, damage, speed, and stamina costs.
- Longbow, crossbow, and sling with simulated projectiles, ammunition, and headshot bonuses. There are no firearms.
- Slow zombie swarms, fast flanking demons, and large monsters with telegraphed attacks. Brutes appear starting with horde 2.
- Escalating hordes, score, kills, pickups, healing, blocking, dodging, stamina recovery, death, restart, and seven-second recovery periods between hordes.
- Desktop and touch controls. The game pauses when focus is lost.

## Where to make changes

| File | Responsibility |
| --- | --- |
| `dist/core.mjs` | Weapon and enemy values, spawning, movement, collision, combat, projectiles, pickups, and wave progression. Pure JavaScript, independent of rendering. |
| `dist/game.js` | 3D models and world, cameras, animations, audio, controls, HUD, and menus. |
| `dist/style.css` | Responsive interface and the gothic visual theme. |
| `dist/index.html` | Game page, title, icon, and local entry points. |
| `tests/core.test.mjs` | Regression checks for the combat simulation. |
| `TESTING.md` | Manual desktop and touch checks. |

## Checks

```sh
node --check dist/game.js
node --check dist/core.mjs
node --test tests/core.test.mjs
```

Keep changes small and describe the gameplay effect in commit messages. The weapon and enemy constants at the top of `core.mjs` are the quickest place to adjust balance.

## Dependencies

Three.js 0.180.0 is included in `dist/three.module.js` and `dist/three.core.js`. Its license is preserved in `dist/THREE-LICENSE.txt`. The arena, characters, weapons, sound effects, and interface are created in code. No Diablo assets are included.
