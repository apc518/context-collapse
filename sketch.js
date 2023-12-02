/*
CONTEXT COLLAPSE by Andy Chamberlain
*/

const CONTEXT_COLLAPSE_VERSION = "1.0.0";

// dev
let debugSprites = false;
let drawSafeRadius = false;

// game state stuff
const STARTING = 0;
const PLAYING = 1;
const PAUSED = 2;
const ERROR = 3;
let gameErrorMessage = "An unknown error occurred :(";
let gameState = STARTING;
let gameFrame = 0;

const FRAMERATE = 60;

// canvas
const canvasHeight = 800;
const canvasWidth = canvasHeight;
let p5canvas;

const globalFont = "Trebuchet MS";

// rng
let gameSeed;
let rng; // a function produced by mulberry32()

// recording
/**
{
  gameVersion: string,
  startingTime: number,   // (unix ms)
  seed: number,
  inputs[]: {    // indexed by gameFrame 
    keysPressed: [], 
    isMousePressed: boolean, 
    mousePosition: { x: number, y: number }
  }
}
*/
let inputProvider;

// player stuff
const playerWidth = 64;
const playerHeight = 64;
const playerMoveForce = 0.9;
const playerFriction = 0.1;
const playerStrength = 20;
const playerArrowSpeed = 15;
const playerHealthMax = 100;

// health pack item constants
const healthPackEmbargo = 10 * FRAMERATE;
const healthPackSpawnPeriodAverage = 10 * FRAMERATE;
const healthPackSpawnVariance = 3 * FRAMERATE;
const healthBarWidth = 200;

// arrow item constants
const arrowBunchSize = 8;
const arrowSpawnPeriodDefault = 4;
const arrowSpawnPeriodAfterBigEnemyRateMultiplier = 3;

// powerup constants
const killallSpawnPeriod = 80 * FRAMERATE;
const freezeSpawnPeriod = 50 * FRAMERATE;

const allSounds = [];

let velocityCache = [];

let enemyGroup;
let bigEnemyGroup;
let bossGroup;

const monsterAccelerationVariance = 0.2;
const monsterMaxSpeedVariance = 0.2;

const bossValue = 50;
const bossSpawnScoreDefault = 100;
const bossSpawnScoreInterval = 200;
let bossSpawnScore = bossSpawnScoreDefault;
const sockSpeed = 7;

const bigEnemyHealthMax = 80;
const enemyHealthMax = 20;
const safeRadius = 340; // monsters dont spawn immediately on or next to the player

// chance that a bigEnemy DOESN'T spawn is multiplied by this every time a monster spawns
// this will only activate after the enemySpawnPeriod has reached its minimum.
const bigEnemyRateMultiplier = 0.998;

const serverURLBase = "https://chambercode-back.herokuapp.com";
// const serverURLBase = "http://localhost:5000";
let leaderboardError = false;
let leaderboardLoading = false;
let leaderboardPage = 1; // leaderboard pages are 1-indexed (not 0-indexed)
let networkError = false;
let authToken;

let sweetAlerting = false;

let useLegacySfx = false;
let sfxOn = true;
let musicOn = false;
let music;

// button constants
const btnHoverColor = "#ff9";
const btnDefaultColor = "#fff";


class MetaObj{
  constructor(health=0, strength=10, value=1, bigEnemy=false, isBoss=false){
    this.health = health;
    this.strength = strength;
    this.value = value;
    this.isBigEnemy = bigEnemy;
    this.isBoss = isBoss;
  }
}

// real modulo
function mod(n, m){
  return ((n % m) + m) % m;
}

// initialize gameplay-related variables
function initializeGameplayGlobals(){
  setGameState(STARTING);
  gameIsStarting = true;
  gameIsOver = false;
  gameFrame = 0;
  
  showingSettings = false;
  showingLeaderboard = false;
  pauseScreen = false;
  
  score = 0;

  playerSpeedX = 0;
  playerSpeedY = 0;
  playerHealth = playerHealthMax;

  healthPackSpawnPeriod = healthPackSpawnPeriodAverage;
  healthPackPrevSpawn = 0;
  healthPackSpawnFrame = 0;

  arrowSpawnPeriod = arrowSpawnPeriodDefault;
  arrowBunchSpawnFrame = 0;
  playerArrows = arrowBunchSize;
  
  killlallsEquipped = 0;
  killallAbilityPrevSpawn = 0; // seconds that a killall ability is available for before it disappears

  freezesEquipped = 0;
  freezing = false; // whether or not it is currently active.
  freezeTimer = 0;
  freezePrevSpawn = 0;

  enemySpawnPeriod = endlessSettings.enemySpawnPeriodMax;

  enemySpawnFrame = 0;
  bigEnemyRateMultiplierIsActive = false;
  bigEnemyRate = endlessSettings.bigEnemyRate;

  bossCount = 0;
  bossSpawnScore = bossSpawnScoreDefault;
  sockShootingFrame = 0;

  leaderboard = null;
}


/// P5 FUNCTIONS
function preload(){
  playerImage = loadImage("images/character-head-128.png");
  playerDeadImage = loadImage("images/character-head-dead-128.png");
  backgroundImage = loadImage("images/twinkling_night_v3_1600px.png");
  enemyImage = loadImage("images/enemy-1.png");
  arrowImage = loadImage("images/mc_arrow.png");
  arrowBunchImage = loadImage("images/mc_arrow_bunch.png");
  pauseIconImage = loadImage("images/pause_icon_64.png");
  healthPackImage = loadImage("images/health_pack.png");
  killallAbilityImage = loadImage("images/killall-1.png");
  freezeAbilityImage = loadImage("images/freeze-1.png");
  crosshairImage = loadImage("images/crosshair_4.png");
  settingsImage = loadImage("images/gear-1.png");
  sfxOnIcon = loadImage("images/volume_on.png");
  sfxOffIcon = loadImage("images/volume_off.png");
  musicOnIcon = loadImage("images/music_on.png");
  musicOffIcon = loadImage("images/music_off.png");
  bossManImage = loadImage("images/bossman.png");
  sockImage = loadImage("images/sock.png");
  blankImage = loadImage("images/nothing.png");
  multiShot = loadImage("images/mc_three_arrows.png");
  titleImage = loadImage("images/cc-title-2.png");

  bigEnemyDamageImages = [];
  for(let i = 4; i >= 0; i--) bigEnemyDamageImages.push(loadImage("images/enemy-big-" + i + ".png"));

  monsterFreezeImages = [];
  for(let i = 0; i < 5; i++) monsterFreezeImages.push(loadImage("images/enemy-1-freeze" + i + ".png"));

  bigEnemyFreezeImages = [];
  for(let i = 0; i < 5; i++) bigEnemyFreezeImages.push(loadImage("images/enemy-big-freeze" + i + ".png"));
}

function loadSound(path, vol=1, rate=1, html5=false){
  return new Howl({
    src: [path],
    volume: vol,
    rate: rate,
    html5: html5
  });
}

function playSound(howl){
  if (!howl.maxPolyphony || howl.playing() < howl.maxPolyphony){
    howl.play();
  }
}

function setup(){
  p5canvas = createCanvas(canvasWidth, canvasHeight);
  p5canvas.parent("p5_canvas");

  const volumeControl = document.getElementById("volumeSlider");
  volumeControl.oninput = e => {
    Howler.volume(volumeControl.value / 100);
  }
  // initial volume
  Howler.volume(volumeControl.value / 100);

  // alert the user if their screen isnt big enough to hold the whole canvas
  let bodyStyle = getComputedStyle(document.body);
  if(window.innerHeight < canvasHeight + parseInt(bodyStyle.marginTop)) {
    clickablesDisabled = true;
    Swal.fire({
      icon: 'warning',
      title: 'Zoom out',
      text: 'Your screen is too small to fit the whole canvas at base resolution. Zoom out until you can see the bottom edge of the canvas.'
    }).then(() => clickablesDisabled = false);
  }

  initializeGameplayGlobals();

  enemyGroup = new Group();
  bigEnemyGroup = new Group();
  arrows = new Group();
  arrowBunches = new Group();
  healthPacks = new Group();
  killallAbilities = new Group();
  freezeAbilities = new Group();
  hotbarItems = new Group();
  players = new Group();
  bossGroup = new Group();
  sockGroup = new Group();
  
  twangSfx = loadSound("audio/arrow_shot_1.wav", 0.2);
  hitSfx = loadSound("audio/hit_1.wav");
  iceClinkSfx = loadSound("audio/ice_clink_1.wav");
  iceBreakSfx = loadSound("audio/ice_break_1.wav");
  monsterDeathSfx = loadSound("audio/monster_death_1.wav", 0.5);
  monsterDeathSfx.maxPolyphony = 3;
  chainSfx = loadSound("audio/chain_rattle.wav", 0.2);
  killallSfx = loadSound("audio/fire_impact_1.wav");
  killallEquipSfx = loadSound("audio/snow_punch_2.wav");
  freezeSfx = loadSound("audio/snow_punch_1.wav");
  playerDamageSfx = loadSound("audio/heavy_sound_1.wav", 0.2);
  playerDeathSfx = loadSound("audio/death_2.wav");
  healthPackSfx = loadSound("audio/health_bottle_3.wav");
  menuClickSfx = loadSound("audio/collider-boom-clave.wav", 0.5);
  sockSfx = loadSound("audio/sock_1.wav", 0.5, 5);
  

  if(!('highscores' in localStorage)){
    localStorage['highscores'] = JSON.stringify({easy: 0, normal: 0, hard: 0});
  }

  noCursor();

  setupSettingsIcon();
  setupSettingsMenu();
  setupFreezeTimer();
  setupStartScreen();
  setupLeaderboard();
  setupGameOverScreen();

  // set up listeners for the page losing focus. If it does lose focus, pause the game.
  let visibilityChange;
  if (typeof document.hidden !== "undefined")
      visibilityChange = "visibilitychange";
  else if (typeof document.mozHidden !== "undefined")
      visibilityChange = "mozvisibilitychange";
  else if (typeof document.msHidden !== "undefined") 
      visibilityChange = "msvisibilitychange";
  else if (typeof document.webkitHidden !== "undefined")
      visibilityChange = "webkitvisibilitychange";
  const pause = () => {
    if(gameState === PLAYING){
      pauseScreen = true;
      setGameState(PAUSED);
    }
  }
  document.addEventListener(visibilityChange, pause);
  window.addEventListener("blur", pause);
}

// custom _drawSprites to control the order
function _drawSprites(){
  arrowBunches.draw();
  healthPacks.draw();
  killallAbilities.draw();
  freezeAbilities.draw();
  arrows.draw();
  bossGroup.draw();
  bigEnemyGroup.draw();
  enemyGroup.draw();
  hotbarItems.draw();
  sockGroup.draw();
  players.draw();

  drawBossHealthBars();
}

function draw(){
  background(backgroundImage);
  if(gameState === STARTING){
    cursor(ARROW, mouseX, mouseY);
    if(showingSettings) drawSettingsMenu();
    else if(showingLeaderboard) drawLeaderboard();
    else drawStartScreen();
  }
  else if(gameState === PLAYING){
    const pressEvents = inputProvider.getPressEventsByGameFrame(gameFrame);
    const currentInputs = inputProvider.getInputsByGameFrame(gameFrame);
    for (const k of pressEvents.keys){
      doKeyPressedAction(k);
    }
    if (pressEvents.mouse){
      doMousePressedAction(currentInputs.mousePosition.x, currentInputs.mousePosition.y);
    }

    spawnMonster();
    spawnArrowBunch();
    spawnHealthPack();
    spawnKillallAbility();
    spawnFreezeAbility();
    playerControls();
    collisions();
    attractMonsters();
    attractProjectiles();
    shootSocks();
    _drawSprites();
    assignImages();
    drawPowerups();
    drawStats();
    noCursor();
    drawCursor();
    cleanup();
    drawSafeFromSpawningArea();
    if(freezeTimer === 0) freezing = false;
    gameFrame++;
  }
  else if(gameState === PAUSED){ // includes game over
    pauseMonsters();
    pauseProjectiles();
    cursor(ARROW, mouseX, mouseY);
    _drawSprites();
    drawPowerups();
    drawStats();
    if(showingSettings){
      drawSettingsMenu();
    }
    else if (gameIsOver){
      drawGameOverScreen();
    }
    else{
      drawPauseScreen();
    }
  }
  else{
    push();
    textSize(24);
    fill(255, 150, 150);
    noStroke();
    textFont(globalFont);
    textAlign(CENTER);
    text(gameErrorMessage, canvasWidth / 2, canvasHeight / 2);
    backBtn.draw();
    pop();
  }

  drawSettingsIcon();
}


/// SPECIFIC SETUP FUNCTIONS
function setupSettingsIcon(){
  settingsButton = new Clickable();
  settingsButton.locate(canvasWidth - 52, canvasHeight - 52);
  settingsButton.resize(48, 48);
  settingsButton.image = settingsImage;
  settingsButton.color = "#00000000";
  settingsButton.strokeWeight = 0;
  settingsButton.text = "";
  settingsButton.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    showingSettings = true;
    if(gameState === PLAYING) {
      setGameState(PAUSED);
      // since an arrow will be shot
      if(arrows.length > 0){
        while(arrows.length > 0) arrows[0].remove();
        playerArrows += 1;
      }
    }
  }
  settingsButton.onHover = () => {
    settingsButton.color = "#ffffff33";
  }
  settingsButton.onOutside = () => {
    settingsButton.color = "#00000000";
  }
}

function setupSettingsMenu(){
  // sfx toggle button
  const sfxToggleBtnSize = 64;
  sfxToggleBtn = new Clickable();
  sfxToggleBtn.text = "";
  sfxToggleBtn.image = sfxOnIcon;
  sfxToggleBtn.locate(canvasWidth / 2 - sfxToggleBtnSize - 10, canvasHeight / 2 - sfxToggleBtnSize / 2);
  sfxToggleBtn.resize(sfxToggleBtnSize, sfxToggleBtnSize);
  sfxToggleBtn.onPress = () => {
    sfxOn = !sfxOn;
    sfxToggleBtn.image = sfxOn ? sfxOnIcon : sfxOffIcon;
    if(sfxOn) playSound(menuClickSfx);
  }
  sfxToggleBtn.onHover = () => {
    sfxToggleBtn.color = btnHoverColor;
  }
  sfxToggleBtn.onOutside = () => {
    sfxToggleBtn.color = btnDefaultColor;
  }

  // music toggle button
  musicToggleBtn = new Clickable();
  musicToggleBtn.text = "";
  musicToggleBtn.image = musicOn ? musicOnIcon : musicOffIcon;
  musicToggleBtn.locate(canvasWidth / 2 + 10, canvasHeight / 2 - sfxToggleBtnSize / 2);
  musicToggleBtn.resize(sfxToggleBtnSize, sfxToggleBtnSize);
  musicToggleBtn.onPress = () => {
    musicOn = !musicOn;
    if(musicOn && !music.playing()){
      music.play();
    }
    else{
      music.pause();
    }
    musicToggleBtn.image = musicOn ? musicOnIcon : musicOffIcon;
    if(sfxOn) menuClickSfx.play();
  }
  musicToggleBtn.onHover = () => {
    musicToggleBtn.color = btnHoverColor;
  }
  musicToggleBtn.onOutside = () => {
    musicToggleBtn.color = btnDefaultColor;
  }


  // okay button
  okayButtonSize = 64;
  okayButton = new Clickable();
  okayButton.text = "Okay";
  okayButton.textFont = globalFont;
  okayButton.textSize = 20;
  okayButton.locate(canvasWidth / 2 - okayButtonSize / 2, canvasHeight / 2 - okayButtonSize / 2 + sfxToggleBtnSize + 10);
  okayButton.resize(64,64);
  okayButton.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    showingSettings = false;
    if(gameState === PAUSED && !gameIsOver && !pauseScreen){
      setGameState(PLAYING);
    }
  }
  okayButton.onHover = () => {
    okayButton.color = btnHoverColor;
  }
  okayButton.onOutside = () => {
    okayButton.color = btnDefaultColor;
  }
}

function setupFreezeTimer(){
  freezeTimerInterval = setInterval(() => {
    freezeTimer = max(0, freezeTimer - 1);
    // console.log(`freezeTimer: ${freezeTimer}`);
  }, 1000);
}

const startScreenButtonSize = [170, 60];
const startScreenButtonTextSize = 24;

function setupStartScreen(){
  frameRate(FRAMERATE);
  
  endlessBtn = new Clickable();
  endlessBtn.locate(canvasWidth / 2 - 170, canvasHeight / 2);
  endlessBtn.resize(...startScreenButtonSize);
  endlessBtn.text = "Endless";
  endlessBtn.textSize = startScreenButtonTextSize;
  endlessBtn.textFont = globalFont;
  endlessBtn.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    registerGame();
  }
  endlessBtn.onHover = () => {
    endlessBtn.color = btnHoverColor;
  }
  endlessBtn.onOutside = () => {
    endlessBtn.color = btnDefaultColor;
  }
  
  campaignBtn = new Clickable();
  campaignBtn.locate(canvasWidth / 2, canvasHeight / 2);
  campaignBtn.resize(...startScreenButtonSize);
  campaignBtn.text = "Campaign";
  campaignBtn.textSize = startScreenButtonTextSize;
  campaignBtn.textFont = globalFont;
  campaignBtn.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    gameErrorMessage = "Campaign mode is not supported yet";
    setGameState(ERROR);
  }
  campaignBtn.onHover = () => {
    campaignBtn.color = btnHoverColor;
  }
  campaignBtn.onOutside = () => {
    campaignBtn.color = btnDefaultColor;
  }

  leaderboardBtn = new Clickable();
  leaderboardBtn.resize(...startScreenButtonSize);
  leaderboardBtn.locate(canvasWidth / 2 - leaderboardBtn.width / 2, canvasHeight / 2 + 100);
  leaderboardBtn.text = "Leaderboard";
  leaderboardBtn.textSize = startScreenButtonTextSize;
  leaderboardBtn.textFont = globalFont;
  leaderboardBtn.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    fetchLeaderboard();
  }
  leaderboardBtn.onHover = () => {
    leaderboardBtn.color = btnHoverColor;
  }
  leaderboardBtn.onOutside = () => {
    leaderboardBtn.color = btnDefaultColor;
  }

  helpBtn = new Clickable();
  helpBtn.resize(...startScreenButtonSize);
  helpBtn.locate(canvasWidth / 2 - helpBtn.width / 2, canvasHeight / 2 + 210);
  helpBtn.text = "How To Play";
  helpBtn.textSize = 24;
  helpBtn.textFont = globalFont;
  helpBtn.onPress = () => {
    if(sfxOn) menuClickSfx.play();
    clickablesDisabled = true;
    Swal.fire({
      title: "How To Play",
      html: `
      Move with WASD, shoot by clicking.<br/><br/>
      There are two powerup slots which can be activated by the Q and E keys respectively.<br/><br/>
      <a class="game-details" href="https://github.com/apc518/context-collapse/blob/master/Game_Details.md" target="_blank" rel="noreferrer">More Details</a>
      <br/>
      `
    }).then(() => {
      clickablesDisabled = false;
    }).catch(e => {
      console.error(e);
      clickablesDisabled = false;
    })
  }
  helpBtn.onHover = () => {
    helpBtn.color = btnHoverColor;
  }
  helpBtn.onOutside = () => {
    helpBtn.color = btnDefaultColor;
  }

  replayBtn = new Clickable();
  replayBtn.resize(...startScreenButtonSize);
}

function setupLeaderboard(){
  backBtn = new Clickable();
  backBtn.resize(...startScreenButtonSize);
  backBtn.locate(canvasWidth / 2 - backBtn.width / 2, canvasHeight / 2 + 150);
  backBtn.text = "Back";
  backBtn.textSize = startScreenButtonTextSize;
  backBtn.textFont = globalFont;
  backBtn.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    showingLeaderboard = false;
    if (gameState === ERROR) {
      setGameState(STARTING);
    }
  }
  backBtn.onHover = () => {
    backBtn.color = btnHoverColor;
  }
  backBtn.onOutside = () => {
    backBtn.color = btnDefaultColor;
  }

  const PAGE_BUTTON_WIDTH = 40;
  const PAGE_BUTTON_HEIGHT = 40;

  const setupPageButton = (btn, text, xPos, increment) => {
    btn.resize(PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT);
    btn.locate(xPos, canvasHeight / 2 + 60);
    btn.text = text;
    btn.textSize = 32;
    btn.textFont = globalFont;
    btn.onHover = () => {
      btn.color = btnHoverColor;
    }
    btn.onOutside = () => {
      btn.color = btnDefaultColor;
    }
    btn.onPress = () => {
      if(leaderboardPage + increment < 1) return;
      if(sfxOn) playSound(menuClickSfx);
      leaderboardPage = Math.max(1, leaderboardPage + increment);
      fetchLeaderboard();
    }
  }

  pageForwardBtn = new Clickable();
  setupPageButton(pageForwardBtn, ">", canvasWidth / 2, 1);

  pageBackBtn = new Clickable();
  setupPageButton(pageBackBtn, "<", canvasWidth / 2 - PAGE_BUTTON_WIDTH, -1);
}

function setupGameOverScreen(){
  submitScoreBtn = new Clickable();
  submitScoreBtn.locate(canvasWidth / 2 - 120, canvasHeight / 2 + 40);
  submitScoreBtn.resize(240, 60);
  submitScoreBtn.text = "Submit High Score";
  submitScoreBtn.textSize = 24;
  submitScoreBtn.textFont = globalFont;
  submitScoreBtn.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    submitHighScore();
  }
  submitScoreBtn.onHover = () => {
    submitScoreBtn.color = btnHoverColor;
  }
  submitScoreBtn.onOutside = () => {
    submitScoreBtn.color = btnDefaultColor;
  }

  submitScoreBtnDisabled = new Clickable();
  submitScoreBtnDisabled.locate(submitScoreBtn.x, submitScoreBtn.y);
  submitScoreBtnDisabled.resize(submitScoreBtn.width, submitScoreBtn.height);
  submitScoreBtnDisabled.text = submitScoreBtn.text;
  submitScoreBtnDisabled.textSize = submitScoreBtn.textSize;
  submitScoreBtnDisabled.textFont = submitScoreBtn.textFont;
  submitScoreBtnDisabled.color = "#666"; // grayed out

  restartBtn = new Clickable();
  restartBtn.locate(canvasWidth / 2 - 90, canvasHeight / 2 + 130);
  restartBtn.resize(180, 60);
  restartBtn.text = "Back to Title";
  restartBtn.textSize = 24;
  restartBtn.textFont = globalFont;
  restartBtn.onPress = () => {
    if(sfxOn) playSound(menuClickSfx);
    clickablesDisabled = true;
    Swal.fire({
      title: gameIsOver ? "Are you sure you want to exit?" : "Are you sure you want to quit?",
      text: gameIsOver ? (score > getHighScore() ? "You won't be able to submit this high score." : "") : "You will lose all progress from this round.",
      showCancelButton: true,
      confirmButtonText: "Yes",
      focusCancel: true
    }).then(res => {
      clickablesDisabled = false;
      if (res.isConfirmed) {
        resetLevel();
      }
    })
    // resetLevel();
  }
  restartBtn.onHover = () => {
    restartBtn.color = btnHoverColor;
  }
  restartBtn.onOutside = () => {
    restartBtn.color = btnDefaultColor;
  }
}


/// DRAWING FUNCTIONS
function drawStartScreen(){
  push();

  const titleY = canvasHeight / 3.5;
  imageMode(CENTER);
  image(titleImage, canvasWidth / 2, titleY);

  const abilityIconRotation = (frameCount / 30) % (2*PI);
  const abilityIconScale = 0.6;

  push();
  translate(canvasWidth / 2 - 296, titleY);
  rotate(abilityIconRotation);
  image(freezeAbilityImage, 0, 0, freezeAbilityImage.width * abilityIconScale, freezeAbilityImage.height * abilityIconScale);
  pop();
  
  push();
  translate(canvasWidth / 2 + 55, titleY);
  rotate(abilityIconRotation + PI/4);
  image(killallAbilityImage, 0, 0, killallAbilityImage.width * abilityIconScale, killallAbilityImage.height * abilityIconScale);
  pop();

  textAlign(CENTER);
  textSize(28);
  fill("#aaa");
  text("Select gamemode", canvasWidth / 2, canvasHeight / 2 - 30);

  fill("white");
  endlessBtn.draw();
  campaignBtn.draw();
  leaderboardBtn.draw();
  helpBtn.draw();

  pop();
}

function drawPowerups(){
  let offset = 32;
  let size = 48;
  let spacing = 5;

  // empty powerup slots
  push();
  stroke(60);
  textAlign(CENTER, CENTER);
  textSize(offset);
  textFont(globalFont);
  fill(60, 127);
  ellipse(offset, canvasHeight - offset, size);
  fill(140);
  text("Q", offset, canvasHeight - offset);
  fill(60, 127);
  ellipse(offset + (size + spacing), canvasHeight - offset, size);
  fill(140);
  text("E", offset + (size + spacing), canvasHeight - offset);
  pop();

  // killall powerup
  if(freezesEquipped > 0){
    push();
    imageMode(CENTER);
    translate(offset, canvasHeight - offset);
    tint(255, 127);
    image(freezeAbilityImage, 0, 0, size, size);
    tint(255);
    
    if (freezesEquipped > 1){
      textSize(18);
      textFont(globalFont);
      stroke(0);
      fill(btnHoverColor);
      strokeWeight(3);
      textAlign(CENTER);
      text(freezesEquipped, 18, 18);
    }
    pop();
  }

  // freeze powerup
  if(killlallsEquipped > 0){
    push();
    imageMode(CENTER);
    translate(offset + size + spacing, canvasHeight - offset);
    tint(255, 127);
    image(killallAbilityImage, 0, 0, size, size);
    tint(255);
    
    if (killlallsEquipped > 1){
      textSize(18);
      textFont(globalFont);
      stroke(0);
      fill(btnHoverColor);
      strokeWeight(3);
      textAlign(CENTER);
      text(killlallsEquipped, 18, 18);
    }
    pop();
  }
}

function drawStats(){
  // Score
  textFont(globalFont);
  textSize(32);
  fill("white");
  textAlign(LEFT)
  text("Score: " + score, 8, 32);
  push();
  textSize(16);
  fill(btnHoverColor);
  text("High: " + getHighScore(), 8, 52);
  pop();

  // Arrow Count
  textAlign(CENTER);
  text("Arrows: " + playerArrows, canvasWidth / 2, 32);

  // Gamemode
  push();
  fill("#4c4");
  textAlign(RIGHT);
  text("Endless", canvasWidth - 8, 32);
  pop();
 
  // health bar
  stroke(0);
  strokeWeight(4);
  noFill();
  rect(canvasWidth / 2 - (healthBarWidth / 2) - 2, canvasHeight - 30 - 2, healthBarWidth + 4, 20 + 4);
  noStroke();
  let healthFraction = playerHealth / playerHealthMax;
  let colorBalance = max(0, (healthFraction - 0.2) / 0.8); // color fades from green to red as player loses health. At or below 20% health it is completely red.
  fill(lerp(0, 255, 1 - colorBalance), lerp(0, 255, colorBalance), 0, 127);
  rect(canvasWidth / 2 - (healthBarWidth / 2), canvasHeight - 30, healthBarWidth * healthFraction, 20);
}

function drawGameOverScreen(){
    push();  
    fill(0, 0, 0, 127);
    rect(0, 0, canvasWidth, canvasHeight);
    fill("white");
    textSize(48);
    textAlign(CENTER);
    text("Final score: " + score, canvasWidth / 2, canvasHeight / 2);

    if (score > getHighScore()){
      fill("#ff8");
      textSize(36)
      text("New High Score!", canvasWidth / 2, canvasHeight / 2 - 70);
    }
    
    if(networkError){
      submitScoreBtnDisabled.draw();
    }
    else if (score > getHighScore()){
      submitScoreBtn.draw();
    }

    restartBtn.draw();
    pop();
}

function drawPauseScreen(){
  fill(0, 0, 0, 127);
  rect(0, 0, canvasWidth, canvasHeight);
  image(pauseIconImage, canvasWidth / 2 - 32, canvasWidth / 2 - 32);
  fill("white");
  textSize(32);
  textFont(globalFont);
  textAlign(CENTER);
  text("Press space to pause/unpause", canvasWidth / 2, canvasHeight / 2 + 72);
  restartBtn.draw();
}

function drawCursor(){
  push();
  imageMode(CENTER);
  const currentInputs = inputProvider.getInputsByGameFrame(gameFrame);
  image(crosshairImage, currentInputs.mousePosition.x, currentInputs.mousePosition.y, 48, 48);
  pop();
}

function drawSettingsIcon(){
  push();
  if(gameState === PLAYING) drawingContext.globalAlpha = 0.5;
  else drawingContext.globalAlpha = 1;
  settingsButton.draw();
  drawingContext.globalAlpha = 1;
  pop();
}

function drawSettingsMenu(){
  push();
  // darken behind
  fill(0, 0, 0, 127);
  rect(0, 0, canvasWidth, canvasHeight);

  sfxToggleBtn.draw();
  musicToggleBtn.draw();

  okayButton.draw();
  pop();
}

function drawLeaderboard(){
  push();
  // darken behind
  fill(0, 0, 0, 127);
  rect(0, 0, canvasWidth, canvasHeight);

  textAlign(LEFT);
  textSize(20);
  
  try{
    easyLeaderboardString = "EASY:\n";

    const truncated = (newLine) => {
      // measure the line, then
      // while it is too wide, chop off the last four characters and replace with three dots
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext("2d");
      ctx.font = globalFont;
      let metrics = ctx.measureText(newLine);
      while (metrics.width > (canvasWidth / 6)){
        newLine = newLine.slice(0, -4); // chop of last 4 characters
        newLine += "...";
        metrics = ctx.measureText(newLine);
      }
      return newLine;
    }

    for(let i = 0; i < leaderboard.easy.length && i < 10; i++){
      let newLine = truncated(`${leaderboard.easy[i].score} - ${leaderboard.easy[i].name}`)
      easyLeaderboardString += `${newLine}\n`;
    }
    
    normalLeaderboardString = "NORMAL:\n";
    for(let i = 0; i < leaderboard.normal.length && i < 10; i++){
      normalLeaderboardString += `${leaderboard.normal[i].score} - ${leaderboard.normal[i].name}\n`
    }
    
    hardLeaderboardString = "HARD:\n";
    for(let i = 0; i < leaderboard.hard.length && i < 10; i++){
      hardLeaderboardString += `${leaderboard.hard[i].score} - ${leaderboard.hard[i].name}\n`
    }

    const alignBias = canvasWidth / 6 - 10;
    
    fill(endlessSettings.easy.color);
    text(easyLeaderboardString, canvasWidth / 6 - alignBias, 80);
    fill(endlessSettings.normal.color);
    text(normalLeaderboardString, canvasWidth / 2 - alignBias, 80);
    fill(endlessSettings.hard.color);
    text(hardLeaderboardString, canvasWidth - canvasWidth / 6 - alignBias, 80);
  }
  catch(e){
    push();
    textAlign(CENTER);
    if(leaderboardError){
      fill(255, 127, 127);
      text("Error loading leaderboard. Try again later.", canvasWidth / 2, 280);
    }
    else{
      fill(255);
      text("Loading...", canvasWidth / 2, 280);
    }
    pop();
  }

  backBtn.draw();
  pageForwardBtn.draw();
  pageBackBtn.draw();
  
  fill(255);
  textAlign(CENTER);
  textSize(24);
  text(`Page ${leaderboardPage}${leaderboardLoading ? '...' : ''}`, canvasWidth / 2, canvasHeight / 2 + 40)
  pop();
}

function drawSafeFromSpawningArea(){
  if (drawSafeRadius){
    push();
    stroke(255, 0, 0);
    strokeWeight(1);
    noFill();
    ellipse(player.position.x, player.position.y, safeRadius * 2, safeRadius * 2);
    pop();
  }
}

function drawBossHealthBars(){
  const bossHbOffsetX = -148;
  const bossHbOffsetY = -150;
  const bossHbWidth = 300;
  const bossHbHeight = 20;

  for (const boss of bossGroup){
    push();
    strokeWeight(2);
    stroke(0);
    noFill();
    rect(boss.position.x + bossHbOffsetX, boss.position.y + bossHbOffsetY, bossHbWidth, bossHbHeight);
    noStroke();
    fill(255, 0, 0, 80);
    rect(boss.position.x + bossHbOffsetX, boss.position.y + bossHbOffsetY, bossHbWidth * boss.tag.health / endlessSettings.bossHealthMax, bossHbHeight);
    pop();
  }
}

function assignImages(){
  // normal enemies
  for(let i = 0; i < enemyGroup.length; i++){
    if(freezeTimer >= 1){
      // console.log(`adding image ${freezeTimer-1}`);
      enemyGroup[i].addImage(monsterFreezeImages[5 - freezeTimer]);
    }
    else{
      enemyGroup[i].addImage(enemyImage);
      freezing = false;
    }
  }
  // bigEnemy enemies
  for(let i = 0; i < bigEnemyGroup.length; i++){
    let enemy = bigEnemyGroup[i];
    if(freezeTimer >= 1){
      enemy.addImage(bigEnemyFreezeImages[5 - freezeTimer]);
    }
    else{
      freezing = false;
      // console.log(`index: ${Math.floor(4 * enemy.tag.health / bigEnemyHealthMax)}`);
      enemy.addImage(bigEnemyDamageImages[Math.floor(4 * enemy.tag.health / bigEnemyHealthMax)]);
    }
  }
}


/// PLAYER CONTROLS
function incrementVelocity(){
  let x = 0;
  let y = 0;
  const currentInputs = inputProvider.getInputsByGameFrame(gameFrame);
  // create a unit vector from pressed keys
  if(currentInputs.keysPressed.includes("w")){
    y -= 1;
  }
  if(currentInputs.keysPressed.includes("s")){
    y += 1;
  }
  if(currentInputs.keysPressed.includes("d")){
    x += 1;
  }
  if(currentInputs.keysPressed.includes("a")){
    x -= 1;
  }

  // (x,y) is now a unit vector representing the appropriate direction

  if(Math.abs(x) + Math.abs(y) > 0){
    x /= Math.sqrt(x*x + y*y);
    y /= Math.sqrt(x*x + y*y);

    playerSpeedX += x * playerMoveForce;
    playerSpeedY += y * playerMoveForce;
  }

  // apply friction
  // calculate friction force (opposite direction of movement * speed)
  playerSpeedX -= playerFriction * playerSpeedX;
  playerSpeedY -= playerFriction * playerSpeedY;
}

function playerControls(){
  // this functions handles the players movement
  // handle border
  if(player.position.y > canvasHeight - playerWidth/2){
    player.position.y = canvasHeight - playerWidth/2;
  }
  if(player.position.y < 0 + playerWidth/2){
    player.position.y = playerWidth/2;
  }
  if(player.position.x < 0 + playerWidth/2){
    player.position.x = playerWidth/2;
  }
  if(player.position.x > canvasWidth - playerWidth/2){
    player.position.x = canvasWidth - playerWidth/2;
  }

  incrementVelocity();

  player.position.x += playerSpeedX;
  player.position.y += playerSpeedY;
}


/// NON-PLAYER MOVEMENT
function attractMonsters(){
  if(!freezing){
    for(var i = 0; i < enemyGroup.length; i++){
      monster = enemyGroup[i];
      monster.attractionPoint(monster.tag.acceleration, player.position.x, player.position.y);
      monster.maxSpeed = monster.tag.maxSpeed;
    }
    for(var i = 0; i < bigEnemyGroup.length; i++){
      monster = bigEnemyGroup[i];
      monster.attractionPoint(monster.tag.acceleration, player.position.x, player.position.y);
      monster.maxSpeed = monster.tag.maxSpeed;
    }
    for(let i = 0; i < bossGroup.length; i++){
      monster = bossGroup[i];
      monster.attractionPoint(0.01, player.position.x, player.position.y);
      monster.maxSpeed = 0.5;
    }
  }
}

function attractProjectiles(){
  for (const projectileList of [arrows, sockGroup]){
    for (const projectile of projectileList){
      let dx = cos(projectile.tag.direction);
      let dy = sin(projectile.tag.direction);
      
      projectile.maxSpeed = projectile.tag.maxSpeed;

      projectile.attractionPoint(projectile.maxSpeed, projectile.position.x + dx, projectile.position.y + dy);
    }
  }
}


/// GENERAL MOVEMENT
function cacheVelocities() {
  velocityCache = allSprites.map(s => ({ sprite: s, velocity: { x: s.velocity.x, y: s.velocity.y} }));
}

function restoreVelocities(){
  velocityCache.map(vc => {
    vc.sprite.velocity.x = vc.velocity.x;
    vc.sprite.velocity.y = vc.velocity.y;
  })
}


/// UTILITY
function wrangleCoords(x, y){
  // returns coordinates that are always inside of the canvas
  return [mod(x, canvasWidth), mod(y, canvasHeight)];
}

function fetchLeaderboard(){
  showingLeaderboard = true;
  leaderboardError = false;
  leaderboardLoading = true;
  fetch(`${serverURLBase}/leaderboard?page=${leaderboardPage}`)
    .then(res => {
      res.json().then(data => {
        leaderboard = data;
        leaderboardError = false;
      });
    })
    .catch(e => {
      console.error("Error loading leaderboard");
      console.error(e);
      leaderboardError = true;
    })
    .finally(() => {
      leaderboardLoading = false;
    });
}

function submitHighScore(){
  clickablesDisabled = true;
  let name = "";
  if ('name' in localStorage){
    name = localStorage.name;
  }
  Swal.fire({
    title: name.length > 0 ? `Congrats ${name}! Submit your new high score of ${score}` : `Enter your name and submit your score of ${score}`,
    text: 'Enter a new name if you wish to change it',
    input: 'text',
    inputValue: name.length > 0 ? name : '',
    showCancelButton: true,
    confirmButtonText: 'Submit Score',
    showLoaderOnConfirm: true,
    preConfirm: newName => {
      // store name in localStorage. Try to get it from there, or create it for the first time
      if (newName.length > 0) {
        localStorage['name'] = newName;
      }

      // store scoreToken in localStorage. Try to get it from there, or create it for the first time
      let scoreToken;
      if ("scoreToken" in localStorage){
        scoreToken = localStorage.scoreToken;
      }
      else{
        let arr = new Uint8Array(32);
        window.crypto.getRandomValues(arr);
        scoreToken = Array.from(arr, dec => dec.toString(16)).join('');
        localStorage['scoreToken'] = scoreToken;
      }

      return fetch(`${serverURLBase}/leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: localStorage.name,
          score: score,
        })
      })
      .then(res => {
        if (!res.ok){
          Swal.showValidationMessage(
            `Error: ${res.statusText}`
          )
          return "";
        }
        else{
          return res.json();
        }
      })
    },
    didDestroy: () => {
      clickablesDisabled = false;
    }
  }).then((res) => {
    if(res.isConfirmed){
      clickablesDisabled = true;
      Swal.fire({
        title: 'Successfully submitted high score!'
      }).then(() => {
        clickablesDisabled = false;
        resetLevel();
      })
    }
    else{
      clickablesDisabled = false;
    }
  });
}

function toggleLegacySfx(){
  useLegacySfx = !useLegacySfx;
  if(useLegacySfx){
    twangSfx = loadSound("audio/twang.wav", 3);
    playerDamageSfx = loadSound("audio/ow.wav");
    playerDeathSfx = loadSound("audio/aww.wav");
    monsterDeathSfx = loadSound("audio/fwoo.wav");
  }
  else{
    twangSfx = loadSound("audio/arrow_shot_1.wav", 0.2);
    playerDamageSfx = loadSound("audio/heavy_sound_1.wav", 0.2);
    playerDeathSfx = loadSound("audio/death_2.wav");
    monsterDeathSfx = loadSound("audio/monster_death_1.wav", 0.5);
  }
}

function updateHighscore(){
  if (localStorage.highscores) {
    localStorage.removeItem("highscores");
  }
  let highscore = parseInt(localStorage.highscore);
  if (Number.isFinite(highscore)){
    highscore = Math.max(highscore, score);
    localStorage.highscore = highscore;
  }
  else{
    localStorage.highscore = score;
  }
}

function getHighScore(){
  let highscore = localStorage.highscore;
  return parseInt(highscore);
}

// src: https://github.com/cprosche/mulberry32
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}


/// SPAWNING
function spawnKillallAbility(){
  if(killallAbilityPrevSpawn + killallSpawnPeriod <= gameFrame){
    var killallAbility = createSprite(rng() * canvasWidth, rng() * canvasHeight);
    killallAbility.addImage(killallAbilityImage);
    killallAbility.setCollider("rectangle", 0, 0, 96, 96);
    killallAbility.debug = debugSprites;
    killallAbility.scale = 0.7;
    killallAbilities.add(killallAbility);

    killallAbilityPrevSpawn = gameFrame;
  }
}

function spawnFreezeAbility(){
  if(freezePrevSpawn + freezeSpawnPeriod <= gameFrame){
    var freeze = createSprite(rng() * canvasWidth, rng() * canvasHeight);
    freeze.addImage(freezeAbilityImage);
    freeze.setCollider("rectangle", 0, 0, 96, 96);
    freeze.debug = debugSprites;
    freeze.scale = 0.7;
    freezeAbilities.add(freeze);

    freezePrevSpawn = gameFrame;
  }
}

function spawnHealthPack(){
  if(healthPackPrevSpawn + healthPackSpawnPeriod <= gameFrame && healthPackEmbargo <= gameFrame){
    var healthPack = createSprite(rng() * canvasWidth, rng() * canvasHeight);
    healthPack.addImage(healthPackImage);
    healthPack.setCollider("rectangle", 0, 0, 128, 128);
    healthPack.debug = debugSprites;
    healthPack.scale = 0.3;
    healthPacks.add(healthPack);

    healthPackPrevSpawn = gameFrame;
    healthPackSpawnPeriod = healthPackSpawnPeriodAverage + rng() * 2 * healthPackSpawnVariance + healthPackSpawnVariance;
  }
}

function spawnArrowBunch(){
  if(gameFrame === arrowBunchSpawnFrame){
    if(arrowBunches.length < 6){
      var arrowBunch = createSprite(rng() * canvasWidth, rng() * canvasHeight);
      arrowBunch.addImage(arrowBunchImage);
      arrowBunch.setCollider("rectangle", 0, 0, 64, 64);
      arrowBunch.debug = debugSprites;
      arrowBunch.scale = 0.35;
      arrowBunches.add(arrowBunch);
      arrowBunch.depth = 1;
    }
    arrowBunchSpawnFrame += Math.round(arrowSpawnPeriod * FRAMERATE);
  }
}

function spawnMonster(){
  if(enemySpawnFrame <= gameFrame && !freezing){
    // create a random vector pointing out from the player, length half of the canvasWidth
    
    var length = rng() * (canvasWidth / 2 - safeRadius) + safeRadius; // hypotenuse
    var theta = rng() * 2 * Math.PI;

    var x_ = Math.cos(theta) * length;
    var y_ = Math.sin(theta) * length;
    
    var coords = wrangleCoords(player.position.x + x_, player.position.y + y_);
    
    createMonster(...coords);
    
    enemySpawnPeriod = max(endlessSettings.enemySpawnPeriodMin, enemySpawnPeriod * endlessSettings.enemySpawnAcceleration);

    if(enemySpawnPeriod <= endlessSettings.enemySpawnPeriodMin){
      bigEnemyRateMultiplierIsActive = true;
      arrowSpawnPeriod = arrowSpawnPeriodAfterBigEnemyRateMultiplier;
    }

    if(bigEnemyRateMultiplierIsActive){
      bigEnemyRate = 1 - (bigEnemyRateMultiplier * (1 - bigEnemyRate));
    }

    enemySpawnFrame = gameFrame + FRAMERATE * enemySpawnPeriod;
  }
}

let bossCount = 0;

function createMonster(x, y){
  var monster = createSprite(x, y);
  monster.debug = debugSprites;
  if (score >= bossSpawnScore && !bossIsAlive()){
    // spawn the boss as far away from the player as possible, aka the far corner
    monster.position.x = player.position.x > canvasWidth / 2 ? -150 : canvasWidth + 150;
    monster.position.y = player.position.y > canvasHeight / 2 ? -150 : canvasHeight + 150;

    monster.addImage(bossManImage);
    monster.setCollider("circle", 0, 0, 135);
    monster.tag = new MetaObj(health=endlessSettings.bossHealthMax, strength=200, value=bossValue);
    monster.tag.isBoss = true;
    bossGroup.add(monster);
    monster.scale = 1.4;
    bossSpawnScore += bossSpawnScoreInterval;
    bossCount += 1;
  }
  else if(rng() > endlessSettings.bigEnemyRate && (bossCount > 1 || !bossIsAlive())){
    // normal monster
    monster.addImage(enemyImage);
    monster.setCollider("rectangle", 0, 0, 38, 50);
    monster.tag = new MetaObj(health=enemyHealthMax, strength=10);
    monster.tag.acceleration = endlessSettings.smallMonsterAcceleration * (1 + rng() * monsterAccelerationVariance - (monsterAccelerationVariance / 2));
    monster.tag.maxSpeed = endlessSettings.smallMonsterMaxSpeed * (1 + rng() * monsterMaxSpeedVariance - (monsterMaxSpeedVariance / 2));
    enemyGroup.add(monster);
  }
  else if (bossCount > 2 || !bossIsAlive()){
    // big monster
    monster.addImage(bigEnemyDamageImages[0]);
    monster.scale = 0.5;
    monster.setCollider("circle", 0, -3, 110);
    monster.tag = new MetaObj(health=bigEnemyHealthMax, strength=30, value=3, bigEnemy=true);
    monster.tag.acceleration = endlessSettings.bigMonsterAcceleration * (1 + rng() * monsterAccelerationVariance - (monsterAccelerationVariance / 2));
    monster.tag.maxSpeed = endlessSettings.bigMonsterMaxSpeed * (1 + rng() * monsterMaxSpeedVariance - (monsterMaxSpeedVariance / 2));
    bigEnemyGroup.add(monster);
  }
}

function bossIsAlive() {
  return bossGroup.length > 0;
}


let sockShootingFrame = 0;
let sockHitbox = [3, 17, 75, 30];
let otherSockHitbox = [20, -18, 30, 45];

function shootSocks() {
  if (!bossIsAlive() || freezing) return;

  const sockShootingPeriod = 45; // frames
  const sockDamage = 5;
  const sockTargetSpread = PI / 3;
  
  if (gameFrame >= sockShootingFrame){
    if (sfxOn) playSound(sockSfx);
    const bossPos = [bossGroup[0].position.x, bossGroup[0].position.y];
    const theta = atan((player.position.y - bossPos[1]) / (player.position.x - bossPos[0])) + rng() * sockTargetSpread - (sockTargetSpread / 2) + (player.position.x < bossPos[0] ? PI : 0);
    const sockTarget = [bossPos[0] + cos(theta), bossPos[1] + sin(theta)];

    let sock = createSprite(...bossPos);
    sock.addImage(sockImage);
    
    sock.attractionPoint(sockSpeed, ...sockTarget);
    sock.debug = debugSprites;
    sock.setCollider("rectangle", ...sockHitbox);
    sockGroup.add(sock);

    sock.tag.otherSock = createSprite(sock.position.x, sock.position.y);
    sock.tag.otherSock.attractionPoint(sockSpeed, ...sockTarget);
    sock.tag.otherSock.debug = debugSprites;
    sock.tag.otherSock.setCollider("rectangle", ...otherSockHitbox);
    sock.tag.otherSock.addImage(blankImage);
    sockGroup.add(sock.tag.otherSock);

    sock.tag.otherSock.tag.otherSock = sock;

    sock.tag.strength = sockDamage;
    sock.tag.otherSock.tag.strength = sockDamage;
    
    sock.scale = 0.75;
    sock.tag.otherSock.scale = 0.75;

    sock.maxSpeed = sockSpeed;
    sock.tag.otherSock.maxSpeed = sockSpeed;

    sock.tag.direction = theta;
    sock.tag.otherSock.tag.direction = theta;

    sock.tag.maxSpeed = sockSpeed;
    sock.tag.otherSock.tag.maxSpeed = sockSpeed;

    sockShootingFrame = gameFrame + sockShootingPeriod;
  }
}

function pauseMonsters(){
  for(var i = 0; i < enemyGroup.length; i++){
    enemyGroup[i].maxSpeed = 0;
  }
  for(var i = 0; i < bigEnemyGroup.length; i++){
    bigEnemyGroup[i].maxSpeed = 0;
  }
  for(var i = 0; i < bossGroup.length; i++){
    bossGroup[i].maxSpeed = 0;
  }
}

function pauseProjectiles(){
  for (const projectileList of [arrows, sockGroup]){
    for (const projectile of projectileList){
      projectile.maxSpeed = 0;
    }
  }
}

/// COLLISIONS AND COLLISION HANDLERS
function collisions(){
  enemyGroup.overlap(arrows, damageEnemy);
  bigEnemyGroup.overlap(arrows, damageEnemy);
  bossGroup.overlap(arrows, damageEnemy);
  enemyGroup.collide(players, damagePlayer);
  bigEnemyGroup.collide(players, damagePlayer);
  bossGroup.collide(players, damagePlayer);
  sockGroup.collide(players, damagePlayer);
  arrowBunches.overlap(players, stockArrows);
  healthPacks.overlap(players, healPlayer);
  killallAbilities.overlap(players, equipKillall);
  freezeAbilities.overlap(players, equipFreeze);
}

function damageEnemy(enemy, arrow){
  var ret = null;
  enemy.tag.health = max(0, enemy.tag.health - (playerStrength * (freezing ? 0.8 : 1)));
  if(enemy.tag.health <= 0){
    enemy.remove();
    
    if(!gameIsOver) score += enemy.tag.value;
    if(sfxOn) {
      if(freezing) playSound(iceBreakSfx);
      else playSound(monsterDeathSfx);
    }
    ret = 0;
  }
  else if(enemy.tag.isBigEnemy){
    // display corresponding damage level
    var idx = Math.floor(4 * enemy.tag.health / bigEnemyHealthMax);
    enemy.addImage(bigEnemyDamageImages[idx]);
    
    // knockback from arrow
    if (arrow){
      enemy.velocity.x = 0;
      enemy.velocity.y = 0;
    }
  }

  if(arrow !== null){
    arrows.remove(arrow);
    arrow.remove();
    if(sfxOn){
      if(freezing) playSound(iceClinkSfx);
      else playSound(hitSfx);
    }
  }

  return ret;
}

function damagePlayer(enemy){
  if(sfxOn && playerDamageSfx.playing() < 5) playerDamageSfx.play();
  
  playerHealth -= enemy.tag.strength;

  if (enemy.tag.otherSock){
    enemy.tag.otherSock.remove();
  }
  else{
    playerSpeedX += enemy.velocity.x * enemy.tag.health / 30;
    playerSpeedY += enemy.velocity.y * enemy.tag.health / 30;
  }

  if(playerHealth <= 0){
    playerHealth = 0;
    gameOver();
  }
  else{
    enemy.remove();
  }
}

function stockArrows(arrowBunch){
  playerArrows += arrowBunchSize;
  arrowBunch.remove();
  if(sfxOn) chainSfx.play();
}

function healPlayer(healthPack){
  if(sfxOn) healthPackSfx.play();
  healthPack.remove();
  playerHealth = min(playerHealthMax, playerHealth + 10);
}

function equipKillall(killallAbility){
  killallAbility.remove();
  if(sfxOn) playSound(killallEquipSfx);
  killlallsEquipped += 1;
}

function equipFreeze(freeze){
  freeze.remove();
  if(sfxOn) playSound(killallEquipSfx);
  freezesEquipped += 1;
}

/// POWERUP EXECUTION
function doKillall(){
  if(killlallsEquipped > 0 && gameState === PLAYING){
    if(sfxOn) playSound(killallSfx);

    scoreBeforeKillall = score;

    while(enemyGroup.length > 0) enemyGroup[0].remove();

    // make copies of the enemy groups so we arent iterating
    // through a mutating list; they will be removed from the
    // original group if they are killed by damageEnemy, but
    // they wont be removed from the copy
    for (const enemyList of [enemyGroup.slice(), bigEnemyGroup.slice()]){
      for (const enemy of enemyList){
        for (let i = 0; i < 3; i++){
          if (damageEnemy(enemy, null) != null) break;
        }
      }
    }
    
    for (const enemy of bossGroup.slice()){
      for (let i = 0; i < 18; i++){
        if (enemy.tag.isBoss && enemy.tag.health <= playerStrength) break;
        if (damageEnemy(enemy, null) != null) break;
      }
    }

    score = scoreBeforeKillall;
    killlallsEquipped -= 1;
  }
}

function doFreeze(){
  if(freezesEquipped > 0 && gameState === PLAYING){
    if(sfxOn) playSound(freezeSfx);
    freezing = true;
    pauseMonsters();
    freezeTimer = 5;
    freezesEquipped -= 1;
  }
}


/// GAMESTATE FUNCTIONS
function gameOver(){
  if(gameIsOver){
    return;
  }
  setGameState(PAUSED);
  playerHealth = 0;
  gameIsOver = true;
  player.addImage(playerDeadImage);
  if(sfxOn) playSound(playerDeathSfx);

  // make recording
  const recording = {
    replayVersion: InputProvider.version,
    gameVersion: CONTEXT_COLLAPSE_VERSION,
    seed: gameSeed,
    inputs: inputProvider.generatedReplayData
  }

  const blob = new Blob([JSON.stringify(recording)], { type: 'text/json' });

  // Create an object URL from the Blob
  const objectUrl = URL.createObjectURL(blob);

  clickablesDisabled = true;
  Swal.fire({
    title: 'Save Replay File',
    showCancelButton: true,
    allowOutsideClick: false
  }).then((result) => {
    if (result.isConfirmed) {
      // Create a download link element
      const downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = `context-collapse-${Date.now()}.replay.json`;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    // Revoke the object URL
    URL.revokeObjectURL(objectUrl);

    clickablesDisabled = false;
  });
}

function resetLevel(){
  // set new highscore
  updateHighscore();

  // intialize agnostic globals again
  initializeGameplayGlobals();

  // reset player
  player.position.x = canvasWidth / 2;
  player.position.y = canvasHeight / 2;
  player.addImage(playerImage);

  enemySpawnPeriod = endlessSettings.enemySpawnPeriodMax;

  // destroy all sprites
  while(allSprites.length > 0) allSprites[0].remove();
}


function replayGame(replayData) {
  console.assert(replayData.gameVersion === CONTEXT_COLLAPSE_VERSION, "replay file game version and current game version do not match");
  console.assert(replayData.replayVersion === InputProvider.version, "replay input version is unsupported");
  inputProvider = new InputProvider(replayData.inputs);
  startGame(replayData.seed);
}


function registerGame(){
  if (!music){
    music = loadSound("audio/newmayphobia.mp3", 0.5, 1, true);
    music.loop(true);
  }

  if(!music.playing() && musicOn){
    music.play();
  }

  inputProvider = new InputProvider();
  startGame(Math.floor(Math.random() * 1_000_000_000));

  fetch(`${serverURLBase}/leaderboard`)
    .then(res => {
      res.json().then(() => {
        networkError = false;
      }).catch(() => {
        networkError = false;
      });
    })
    .catch(e => {
      networkError = true;
    });
}

function startGame(seed){
  gameSeed = seed;
  rng = mulberry32(gameSeed);

  player = createSprite(canvasWidth / 2, canvasHeight / 2, playerWidth, playerHeight); 
  player.addImage(playerImage);
  player.setCollider("circle", 0, 5, playerWidth / 2);
  player.debug = debugSprites;
  player.depth = 2;
  players.add(player);

  gameIsStarting = false;

  setGameState(PLAYING);
}

function setGameState(newState){
  oldState = gameState;
  gameState = newState;
  if (oldState === PLAYING && newState === PAUSED){
    cacheVelocities();
  }
  else if (oldState === PAUSED && newState === PLAYING){
    restoreVelocities();
  }
}


/// CLEANUP (prevent memory leaks from sprites flying off the screen)
function cleanup(){
  const allSpritesCopy = allSprites.slice();
  for(var i = 0; i < allSpritesCopy.length; i++){
    var x = allSpritesCopy[i].position.x;
    var y = allSpritesCopy[i].position.y;
    if(-canvasWidth > x || x > 2*canvasWidth || -canvasHeight > y || y > 2*canvasHeight){
      allSpritesCopy[i].remove();
    }
  }
}


function createArrow(posX, posY, direction) {
  var arrow = createSprite(posX, posY);
  arrow.addImage(arrowImage);
  arrow.scale = 0.35;

  let dx = cos(direction);
  let dy = sin(direction);

  arrow.rotation = 45 + 360 * direction / (2*PI);
  arrow.attractionPoint(playerArrowSpeed, posX + dx, posY + dy);
  arrow.maxSpeed = playerArrowSpeed;
  arrow.tag = { direction: direction, maxSpeed: playerArrowSpeed }
  arrow.debug = debugSprites;
  arrow.setCollider("rectangle", 0, 0, 20, 20);
  arrows.add(arrow);
}


/// INPUT EVENTS
function doMousePressedAction(_mouseX, _mouseY){
  if(gameState === PLAYING && playerArrows > 0){
    if(_mouseX < canvasWidth && _mouseX >= 0 && _mouseY < canvasHeight && _mouseY >= 0){
      var arrow = createSprite(player.position.x, player.position.y);
      arrow.addImage(arrowImage);
      arrow.scale = 0.35;
    }
    
    if(_mouseX < canvasWidth && _mouseX >= 0 && _mouseY < canvasHeight && _mouseY >= 0){      
      var arrow = createSprite(player.position.x, player.position.y);
      arrow.addImage(arrowImage);
      arrow.scale = 0.35;
      
      // calculate rotation, default points NE
      var x_diff = _mouseX - player.position.x;
      var y_diff = _mouseY - player.position.y;
      var theta = Math.atan(y_diff / x_diff);
      if(_mouseX < player.position.x){
        theta += PI;
      }
      
      createArrow(player.position.x, player.position.y, theta);
      // createArrow(player.position.x, player.position.y, theta + PI / 16);
      // createArrow(player.position.x, player.position.y, theta - PI / 16);
      // createArrow(player.position.x, player.position.y, theta + PI / 32);
      // createArrow(player.position.x, player.position.y, theta - PI / 32);
      
      playerArrows--;
      if(sfxOn) playSound(twangSfx);
    }
    else{
      setGameState(PAUSED);
    }
  }
}

function doKeyPressedAction(_key){
  if(["1", "q", "Q"].includes(_key)){
    doFreeze();
  }
  
  if(["2", "e", "E"].includes(_key)){
    doKillall();
  }
}

// only for non-gameplay controls (pausing, changing non-functional aesthetics)
function keyPressed(){
  if(key === " " && !gameIsOver){
    if(gameState === PAUSED){
      if(showingSettings){
        showingSettings = false;
      }
      else{
        setGameState(PLAYING);
      }
    }
    else if(gameState === PLAYING){
      pauseScreen = true;
      setGameState(PAUSED);
    }
  }
  
  if(key === "Escape"){
    if(showingSettings) showingSettings = false;
    if(gameState === STARTING){
    }
    else if(gameState === PLAYING){
      pauseScreen = true;
      setGameState(PAUSED);
    }
    else if(gameState === PAUSED){
    }
  }

  if(key === "h" || key === "H"){
    debugSprites = !debugSprites;
    allSprites.forEach(s => {
      s.debug = debugSprites;
    });
  }

  if(key === "."){
    toggleLegacySfx();
  }
}