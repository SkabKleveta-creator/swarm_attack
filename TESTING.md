# Testing Swarm Attack

## Automated checks

Run `node --test tests/core.test.mjs`. These checks cover simulation behavior; they do not verify browser rendering or device performance.

## Manual acceptance checks

Serve the repository over HTTP and open its root. Test both a desktop browser and a touch device.

| Check | Expected result |
| --- | --- |
| First load | The start screen appears over a visible 3D gothic arena. No missing resources or uncaught errors. |
| Enter ruins | HUD appears, the player moves, and horde 1 begins. |
| Isometric view | The complete player remains visible from an elevated angle. Mouse aiming follows the cursor; touch attacks face nearby enemies. |
| Shoulder view | Camera follows behind and to the side of the player. Mouse-look or scene dragging changes aim. |
| Desktop movement | WASD follows the view. Holding Shift spends stamina to sprint. |
| Touch movement | Movement and attacks work at the same time. Releasing one finger does not cancel the other control. |
| Melee weapons | Swings hit enemies in range and in front. Heavy attacks spend extra stamina and interrupt brutes. |
| Ranged weapons | Arrows, bolts, and stones travel through the scene. A hit damages the enemy. Bow and crossbow ammunition decreases. |
| Defenses | Guard blocks incoming frontal damage using stamina. Dodge moves the player and briefly avoids damage. |
| Enemy warning | An attack ring appears before the strike. Moving out before impact avoids damage. |
| Horde clear | Life and ammunition are partly replenished. The next horde starts after seven seconds. |
| Pause | Enemies, projectiles, damage, and the wave timer stop. Loadout and camera may be changed. |
| Focus loss | Switching tabs or leaving the browser pauses the run. |
| Death and restart | Results show the run totals. Restart resets enemies, resources, and score. |
| Resize / rotation | The arena and essential controls remain usable in portrait and landscape. |
| Sound | Audio begins after interaction. Mute silences combat sounds. |

## Reporting an issue

Include device and browser, camera view, equipped weapons, horde number, what happened, and what you expected. Include a screenshot or short clip when it concerns controls or visuals.
