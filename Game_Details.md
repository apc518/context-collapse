# Game Details
How Context Collapse works, in full detail

## Objective
The objective of the game is to get as high a score as possible. Additions to the score may be referred to as points. In this way, the objective of the game is also to get as many points as possible.

The game ends when the player's health reaches 0.

## Environment
Context Collapse takes place in an 800x800 pixel square area. These dimensions are essential to a consistent difficulty, as the larger the dimensions, the easier the game becomes.

The game runs ideally at 60 fps, though this rate will vary slightly in practice. Timings in the game are declared in seconds, but are based on the assumption that the game runs at exactly 60 fps, and are thus timing in the game is somewhat imprecise.

A "round" is considered to start when a user is first able to move the player after selecting a difficulty from the title screen.

# The Player
The player takes the form of a somewhat cat-like avatar. I don't really know what it is, I just kind of drew something random on piskel<br/>
<img src="https://github.com/apc518/context-collapse/blob/master/images/character-head-128.png?raw=true" alt="player" height="100">

## Player Movement
The player can move in eight directions, each of which is a multiple of 45 degrees from straight rightward.
These directions may be referred to by their cardinal analogs: N, S, E, W, NE, NW, SE, and SW.

The WASD keys can be used to move the player, or the arrow keys interchangeably.
Pressing and holding W moves the player north, pressing and holding A moves the player west, etc.

Pressing movement keys (WASD or the arrow keys) applies an acceleration of 0.8 pixels/frame/frame to the player, but there is a friction coefficient of 0.1 applied as well.

WASD are not additive; instead, a unit vector is created by normalizing the addition of the four cardinal unit vectors multiplied by 1 if the associated key is pressed or 0 if not.

This means holding W and A together does not make the player move any faster than only holding W.

The friction coefficient is applied like so:
Let v_0 be the players velocity as a vector at frame i
Let v_1 be the players velocity as a vector at frame i+1
Let a be the added velocity of 0.8 pixels/frame
Let m be the unit vector representing the direction of movement
Let u be the friction coefficient of 0.1
v_1 = v_0 + am - uv_0

## Player Health
The player begins with 100 health points. When the player reaches 0 hp, the game is over.

## Player Attack
The player can shoot arrows, which do 20 damage to unfrozen enemies. This kills small monsters in one hit, and big monsters in four hits. Arrows travel at 15 pixels per frame, with no acceleration.

They look like this:<br/>
<img src="https://github.com/apc518/context-collapse/blob/master/images/mc_arrow.png?raw=true" alt="minecraft arrow" width="100"><br/>
Yes, they are minecraft arrows.

# Enemies
The game has two types of enemies which shall be referred to as "small monsters" and "big monsters". Big and small monsters behave qualitatively identically, but have very different health, strength, speed, acceleration, size, and spawn rates.

Small monsters have 42x54 pixel hitboxes, while big monsters have 180x200 pixel hitboxes.

Small monsters are worth 1 point each (when killed with an arrow), while big monsters are worth 3 points each.

Small Monster (not to scale):<br/>
<img src="https://github.com/apc518/context-collapse/blob/master/images/enemy-1.png?raw=true" alt="small monster" width="60">

Big Monster (not to scale):<br/>
<img src="https://github.com/apc518/context-collapse/blob/master/images/enemy-boss-0.png?raw=true" alt="big monster" width="100">

## Enemy Movement
All monsters are constantly accelerating towards the player at some rate (unless they are frozen), but have a maximum speed.

Small monsters accelerate towards the player at 1 pixel/frame/frame, and have a max speed of 3 pixels/frame.

Big monsters accelerate towards the player at 0.15 pixels/frame/frame, and have a max speed of 2 pixels/frame.

1 pixel/frame = 60 pixels/second

## Enemy Strength/Health
Enemies damage the player by making contact with the player. The monster immediately dies after dealing damage.
Enemies can also be killed by the player damaging them in various ways.

Both small and big monsters deal damage according to a strength, and have a random variance of +/- 3 damage*.

Small monsters have a strength of 10, and a health of 20.
Big monsters have a strength of 40, and a health of 80.

*If the calculated damage would bring the player's health below 0, it will instead bring the players health to exactly 0.

## Enemy Spawning
Depending on the difficulty, enemies spawn at a consistently decreasing interval (increasing rate) down to a minimum interval, at which point the proportion of enemies that are big monsters begins to increase, asymptotically approaching 1.

Enemies spawn in a random location in the game, only they cannot spawn within 256 pixels of the player. However, that is the distance from center to center, so considering the players hitbox and the enemies hitbox, the shortest distance to contact may be much smaller than 256 pixels upon spawning. 

Each time an enemy spawns, there is some chance that it will be a big monster. If it is not a big monster, it will be a small monster as there are only two types of monsters.

The chance that an enemy is _not_ a monster is multiplied by 0.998 each time a monster is spawned, starting once the spawn interval has reached its minimum.

All of the parameters surrounding enemy spawning that are dependant on difficulty are contained within difficulty.json.

Easy mode:
Spawn interval begins at 3.0 seconds, ends at 1.0 seconds. The multiple at each spawn is 0.995.
Proportion of big monsters starts at 0.05
Normal mode:
Spawn interval begins at 2.5 seconds, ends at 0.7 seconds. The multiple at each spawn is 0.9925.
Proportion of big monsters starts at 0.1
Easy mode:
Spawn interval begins at 2.0 seconds, ends at 0.6 seconds. The multiple at each spawn is 0.990.
Proportion of big monsters starts at 0.2

# Standard Items
There are two standard items in the game: arrow bunches, and health packs. They spawn at uniformly random locations in the game. Each are obtained when the player makes contact with them.

## Arrow Bunches
<img src="https://github.com/apc518/context-collapse/blob/master/images/mc_arrow_bunch.png?raw=true" alt="arrow bunch" width="80">

Each arrow bunch gives the player 8 arrows, and they spawn every 4 seconds (really, every 240 frames) until there are 6 arrow bunchs on screen at once. However, once the enemy spawn interval has reached its minimum, the arrow bunch spawn interval decreases to once every 3 seconds.

## Health Packs
<img src="https://github.com/apc518/context-collapse/blob/master/images/health_pack.png?raw=true" alt="arrow bunch" width="80"><br/>

Each health pack gives the player 10 health points, or heals the player to 100 hp, whichever results in the lower player hp.
Health packs spawn every 7-13 seconds, but are guaranteed to not spawn for the first 10 seconds.

# Special Abilities
The game has two special abilites: the freeze ability and the killall ability. Only one of each ability can be equipped at any given time.

Special abilities spawn at random locations in the game.

The user obtains these special abilities by picking them up from items of the same appearance.

The freeze powerup can be used by pressing 1, Q, X, or F.
The killall powerup can be used by pressing 2, E, C, or G.

## Freeze
<img src="https://github.com/apc518/context-collapse/blob/master/images/freeze-1.png?raw=true" alt="arrow bunch" width="100">

The freeze powerup freezes all enemies and stops new ones from spawning for 5 seconds.

While enemies are frozen, they take 20% less damage, causing an extra arrow hit to be necessary to kill both small and big monsters.

Freeze powerups spawn every 40-60 seconds.

## Killall
<img src="https://github.com/apc518/context-collapse/blob/master/images/killall-1.png?raw=true" alt="arrow bunch" width="100">

The killall powerup kills all small monsters and awards 1/2 of a point for each, rounding the total points gained _down_. It simulates up to 3 shots on big monsters, killing any that have already been hit and bring full-health big monsters down to 1 hit or 20hp. 3/2 of a point is awarded for each big monster killed by the powerup, rounding the total points gained _up_.

Killall powerups spawn every 60-100 seconds, but is guaranteed not to spawn for the first 120 seconds of a round.

# Miscellaneous

## In-Game Tools
Pressing H while ingame will show the hitboxes of all entities in the game.