# Plan — Utreys NetSurvivors (full run, Utrace)

## Game
Survivors-like on one big datacenter floor (world ~5200x3600). Hero: Utrace (U-shaped mascot with legs, arms, hover-jet heels).
Auto attack: sector swipe 90 deg in the facing/aim direction (Трассировка кодов), knockback. Move WASD/arrows; dash = Space (Пакетный сброс).
Run: 10 minutes, waves of the project roster by time, boss «Критический инцидент» at 5:00 and 10:00 (survive to win), XP gems -> level up -> choose 1 of 3 (new weapon / weapon level / passive). Death or win -> results screen with kills, level, time, R to restart.
Weapons (code FX): Орбитальный сканер (orbiter), Криптохвост (seeker), DataMatrix-мина (minefield), Пинг (pulse), Ретрай (boomerang), Горячий кэш (zone). Passives: +HP, +speed, +magnet, +damage, +cooldown.

## Layers (top-down stack)
ground_tex raised floor (REPEAT) -> floor decals (cable runs, stencils, splats, scorch in a decal pass) -> light pools (additive amber, ground only) -> contact shadows -> Y-SORTED: props, pickups, enemies, hero -> projectiles/FX -> darkness grade + vignette -> HUD

## Asset inventory (generation order)
| name | class | canvas/alpha | refs | used by |
|---|---|---|---|---|
| ground_tex | tile material | 1024 sq, opaque | style | ground |
| props_sheet -> rack, rack_b, kiosk, ups, pdu, lamp, tank, cart | prop kit | 1536x1024 alpha | style | Y band |
| router (core ring) | set piece | 1024 sq alpha | style | Y band |
| cage (server cage stand) | set piece | 1024 sq alpha | style | Y band |
| hero anchor -> hero parts sheet | character | 1024 sq alpha | style | hero rig |
| enemy anchors: orb (client sphere), keg (tanker client), bug (beetle bug), node (L3 server box), panel (Grafana filter), boss (critical incident) | characters | 1024 sq alpha | style + hero | enemy rigs |
| icons_sheet: weapons + passives + xp gem + data bar | icons | 1536x1024 alpha | style | HUD, pickups |

## Effects
Amber light pools with flicker; blinking status LEDs on racks (code dots); sector swipe arc; muzzle/trace sparks; hit flashes; death pops into data shards; explosion (coolant tanks) with debris and flying enemies; XP gem bob + magnet fly; level-up ring; boss telegraph; floor scorch/splat decals persisting; drifting dust motes in light pools; screen shake trauma.

## Interactions
Enemies knocked back by hits; tanks explode on damage (chain), throwing enemies; cables/props wobble when hit by knockback; gems fly to hero; lamps flicker on nearby explosions.

## Level data
Arena bounds, prop list with footprints (circle/box colliders), lamp list, tank clusters, stencil decals, spawn ring around camera edge.

## Animation list
| actor | motions |
|---|---|
| hero (U mascot) | idle breath, walk/run (2 legs IK, arms swing), swipe attack (arm arc), hurt flash, death collapse |
| orb client | waddle walk on 2 stubby legs, bump attack, hit squash, death pop |
| keg client | heavy walk, ram, hit, death |
| bug | 6-leg tripod skitter, bite, death |
| node L3 | 2-leg march, zap, death |
| panel Grafana | 2-leg hop/walk, death |
| boss | heavy 2-leg stomp, slam telegraph + slam, hurt, death |

## Attract beats
Hero walks the match area, swipes a ring of enemies, picks gems, triggers the tank explosion, levels up once.
