// ------------------------------------
// Config
// ------------------------------------

var DEBUG = false;
var SPEED = 80;
var GRAVITY = 30;
var FLAP = 400;
var SPAWN_RATE = 1;
var OPENING = 134;
var fingersMap = [10, 50, 90, 30, 40, 10, 60, 50, 90, 20];
var LOGS = 'APP::';

// ------------------------------------
// Vars
// ------------------------------------

var gameState,
	score,
	bg,
	fingers,
	birds,
	invs,
	birdie,
	fence,
	flapSnd,
	scoreSnd,
	hurtSnd,
	winSnd,
	scoreText,
	instText,
	gameOverText,
	playerName;

playerName = window.intel ? intel.xdk.device.model : ' ';

// ------------------------------------
// Phaser setup
// ------------------------------------

callbacks = {
	preload: preload,
	create: create,
	update: update,
	render: render
};

function main() {
	var parent = document.querySelector('#screen');

	screenWidth = window.innerWidth;
	screenHeight = window.innerHeight > 500 ? 500 : window.innerHeight;

	console.log(LOGS, 'world size', screenWidth, screenHeight);

	game = new Phaser.Game(
		screenWidth,
		screenHeight,
		Phaser.CANVAS,
		parent,
		callbacks,
		true,
		false
	);
}

function preload() {
	game.load.spritesheet('birdie', 'assets/bird.png', 92, 64);

	game.load.image('finger', 'assets/finger.png');
	game.load.image('fence', 'assets/ground.png');
	game.load.image('background', 'assets/background.png');

	game.load.audio('flap', 'assets/flap.wav');
	game.load.audio('score', 'assets/score.wav');
	game.load.audio('hurt', 'assets/hurt.wav');
	if (window.intel) game.load.audio('lucky', 'assets/getlucky.ogg');
	game.load.audio('win', 'assets/Win Stage.wav');
}

function create() {
	game.world.setBounds(0, 0, 3000, game.world.height-1);

	// Draw bg
	bg = game.add.graphics(0, 0);
	bg.beginFill(0xDDEEFF, 1);
	bg.drawRect(0, 0, game.world.width, game.world.height);
	bg.endFill();

	// Add background
	background = game.add.tileSprite(0, game.world.height - 896, game.world.width, 896, 'background');
	background.tileScale.setTo(1, 1);

	// Groups
	fingers = game.add.group();
	invs = game.add.group();
	birds = game.add.group();

	spawnFingers();

	// Add fence
	fence = game.add.tileSprite(0, game.world.height - 30, game.world.width, 32, 'fence');
	fence.tileScale.setTo(0.8, 0.8);

	// Add main birdie
	birdie = game.add.sprite(0, 0, 'birdie');
	birdie.anchor.setTo(0.5, 0.5);
	birdie.animations.add('fly', [0, 1, 2], 10, true);
	birdie.scale.setTo(0.5, 0.5);
	birdie.inputEnabled = true;
	birdie.body.collideWorldBounds = true;
	birdie.body.gravity.y = GRAVITY;
	birds.add(birdie);

	game.camera.follow(birdie);

	// Add score text
	scoreText = game.add.text(0, 0, "",
		{
			font: '16px "Press Start 2P"',
			fill: '#fff',
			stroke: '#430',
			strokeThickness: 4,
			align: 'center'
		}
	);
	scoreText.anchor.setTo(0.5, 0.5);
	var sprite = game.add.sprite(0, 0);
	sprite.fixedToCamera = true;
	sprite.addChild(scoreText);
	sprite.cameraOffset.x = screenWidth / 2;
	sprite.cameraOffset.y = game.world.height / 4;

	// Add instructions text
	instText = game.add.text(0, 0, "",
		{
			font: '8px "Press Start 2P"',
			fill: '#fff',
			stroke: '#430',
			strokeThickness: 4,
			align: 'center'
		}
	);
	instText.anchor.setTo(0.5, 0.5);
	var sprite = game.add.sprite(0, 0);
	sprite.fixedToCamera = true;
	sprite.addChild(instText);
	sprite.cameraOffset.x = screenWidth / 2;
	sprite.cameraOffset.y = game.world.height - game.world.height / 4;

	// Add game over text
	gameOverText = game.add.text(0, 0, "",
		{
			font: '32px "Press Start 2P"',
			fill: '#fff',
			stroke: '#430',
			strokeThickness: 4,
			align: 'center'
		}
	);
	gameOverText.anchor.setTo(0.5, 0.5);
	var sprite = game.add.sprite(0, 0);
	sprite.fixedToCamera = true;
	sprite.addChild(gameOverText);
	sprite.cameraOffset.x = screenWidth / 2;
	sprite.cameraOffset.y = game.world.height / 2;

	// Add sounds
	flapSnd = game.add.audio('flap');
	scoreSnd = game.add.audio('score');
	hurtSnd = game.add.audio('hurt');
	if (window.intel) luckySnd = game.add.audio('lucky');
	winSnd = game.add.audio('win');

	// Add controls
	game.input.onDown.add(flap);
	spacebar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    spacebar.onDown.add(flap, this);

	// RESET!
	reset();
}

function update() {
	switch (gameState) {
		case STATE_READY:
			// Float in the air
			birdie.y = (game.world.height / 2) + 8 * Math.cos(game.time.now / 200);

			// Shake instructions text
			instText.scale.setTo(
				2 + 0.1 * Math.sin(game.time.now / 100),
				2 + 0.1 * Math.cos(game.time.now / 100)
			);
			break;

		case STATE_PLAYING:
			// Check game over
			if (birdie.body.bottom >= game.world.bounds.bottom) {
				setGameOver();
				break;
			}
			game.physics.overlap(birdie, fingers, setGameOver);

			// Add score
			game.physics.overlap(birdie, invs, addScore);
			break;

		case STATE_OVER:
		case STATE_OVER_WIN:
			// Shake game over text
			gameOverText.angle = Math.random() * 5 * Math.cos(game.time.now / 100);

			// Shake score text
			scoreText.scale.setTo(
				2 + 0.1 * Math.cos(game.time.now / 100),
				2 + 0.1 * Math.sin(game.time.now / 100)
			);
			break;
	}

	birds.forEachAlive(function(bird){
		if (bird.nameText) {
			bird.nameText.x = bird.x;
			bird.nameText.y = bird.y - 40;
		}

		// be sure to stop motion of clones on the floor
		if (bird != birdie && bird.body.bottom >= game.world.bounds.bottom) {
			birdie.body.velocity.x = 0;
		}

		// Angles
		if (bird == birdie && (gameState == STATE_READY || gameState == STATE_OVER_WIN)) return; // keep horizontal
		if (bird != birdie && (bird.gameState == STATE_READY || bird.gameState == STATE_OVER_WIN)) return; // keep horizontal
		var dvy = FLAP + bird.body.velocity.y;
		bird.angle = (90 * dvy / FLAP) - 180;
		if (bird.angle < -30) {
			bird.angle = -30;
		}
		if (bird.body.velocity.y == 0 || bird.angle > 90 || bird.angle < -90) {
			bird.angle = 90;
			bird.animations.stop();
			bird.frame = 3;
		} else {
			bird.animations.play('fly');
		}
	});
}

function render() {
	if (DEBUG) {
		game.debug.renderCameraInfo(game.camera, 40, 40);
		game.debug.renderSpriteBody(birdie);
		fingers.forEachAlive(function(finger) {
			game.debug.renderSpriteBody(finger);
		});
		invs.forEach(function(inv) {
			game.debug.renderSpriteBody(inv);
		});
	}
}

// ------------------------------------
// FSM
// ------------------------------------

var STATE_READY = 0;
var STATE_PLAYING = 1;
var STATE_OVER = 2;
var STATE_OVER_WIN = 3;

function reset() {
	console.log(LOGS, 'reset event');
	score = 0;
	scoreText.setText("PRET\nA\nS'ENVOLER");
	instText.setText("TOUCHEZ POUR\nVOLER");
	instText.renderable = true;
	gameOverText.renderable = false;

	birdie.body.allowGravity = false;
	birdie.angle = 0;
	birdie.reset(100, game.world.height / 2);
	birdie.animations.play('fly');

	birdie.body.velocity.x = 0;

	fingers.removeAll();
	invs.removeAll();
	spawnFingers();

	gameState = STATE_READY;
}

function start() {
	/*if (!playerName) {
		askPlayerName();
		return;
	}*/

	console.log(LOGS, 'start event');
	if (window.intel) luckySnd.play();

	birdie.body.allowGravity = true;
	birdie.body.velocity.x = SPEED;
	sendModel();

	// Show score
	scoreText.setText(score);
	instText.renderable = false;

	// START!
	gameState = STATE_PLAYING;
}

function setGameOver(win) {
	console.log(LOGS, 'over event');
	gameState = STATE_OVER;
	if (window.intel) luckySnd.stop();

	if (win === true) {
		gameState = STATE_OVER_WIN;
		instText.setText("GAGNANT !!");
		winSnd.play();
		birdie.body.allowGravity = false;
		birdie.body.velocity.x = SPEED/3;
		birdie.body.velocity.y = 0;
		birdie.angle = 0;
		birdie.body.y = game.world.height/2;
		birdie.animations.play('fly');
	} else {
		instText.setText("ESSAIE ENCORE");
		hurtSnd.play();
		birdie.body.velocity.x = 0;
	}

	instText.renderable = true;
	var hiscore = window.localStorage.getItem('hiscore');
	hiscore = hiscore ? hiscore : score;
	hiscore = score > parseInt(hiscore, 10) ? score : hiscore;
	window.localStorage.setItem('hiscore', hiscore);
	gameOverText.setText("GAMEOVER\n\nMEILLEUR SCORE\n" + hiscore);
	gameOverText.renderable = true;

	sendModel();
}

// ------------------------------------
// Utils
// ------------------------------------

function askPlayerName() {
	while (!playerName) {
		playerName = prompt('Player name (6 chars max):');
		playerName = playerName.replace(/^\s+|\s+$/g, '');
		playerName = playerName.substr(0, 6);
	};

	setTimeout(start, 100);
}

function flap() {
	switch (gameState) {
		case STATE_READY:
			start();
			break;

		case STATE_PLAYING:
			birdie.body.velocity.y = -FLAP;
			flapSnd.play();
			sendModel();
			break;

		case STATE_OVER:
		case STATE_OVER_WIN:
			setTimeout(reset, 0); // after event processed
			break;
	}
}

function spawnFingers() {
	for (var i=0; i<10; i++) {
		var fingerX = i * 200 + 300;
		var fingerY = game.height / 100 * fingersMap[i];
		var space = 100;

		var finger = fingers.create(
			fingerX,
			fingerY - space,
			'finger'
		);
		finger.scale.setTo(1, -1);
		finger.body.allowGravity = false;
		finger.body.offset.y = -finger.body.height;

		var finger = fingers.create(
			fingerX,
			fingerY + space,
			'finger'
		);
		finger.scale.setTo(1, 1);
		finger.body.allowGravity = false;

		// Add invisible thingy
		var inv = invs.create(fingerX + finger.width, 0);
		inv.width = 2;
		inv.height = game.world.height;
		inv.body.allowGravity = false;
	}
}

function addScore(_, inv) {
	invs.remove(inv);
	score += 1;
	scoreText.setText(score);
	scoreSnd.play();

	if (score >= fingersMap.length) {
		console.log(LOGS, 'win', score, 'pts of max', fingersMap.length);
		setGameOver(true);
	}
}

function sendModel() {
	var data = saveModel(birdie);
	socket.emit('position', data);
}

console.log(LOGS, 'loading');
console.log(LOGS, 'socket', socket);
var clones = {};
socket.on('position', function (data) {
	console.log(LOGS, 'clone position:', data);
	if (clones[data.sender]) {
		console.log(LOGS, 'clone position:', data);
	} else {
		clones[data.sender] = addClone(data.playerName);
		console.log(LOGS, 'new clone position:', data);
	}
	applyModel(clones[data.sender], data);

	if (data.clones && gameState == STATE_READY) {
		scoreText.setText("PRET\nA\nS'ENVOLER\n("+data.clones+")");
	}
});

function saveModel(bird) {
	var angle = bird.angle;
	var gravity = bird.body.allowGravity;
	var x = bird.body.x;
	var y = bird.body.y;
	var xx = bird.body.velocity.x;
	var yy = bird.body.velocity.y;
	return {
		gameState:gameState,
		angle:angle,
		gravity:gravity,
		x:x,
		y:y,
		xx:xx,
		yy:yy,
		playerName:playerName
	};
}

function applyModel(bird, data) {
	with (data) {
		bird.gameState = gameState;
		bird.angle = angle;
		bird.body.allowGravity = gravity;
		bird.reset(x, y);
		bird.body.velocity.setTo(xx, yy);
	}
}

function addClone(playerName) {
	// Add birdie clone
	var bird = game.add.sprite(0, 0, 'birdie');
	bird.anchor.setTo(0.5, 0.5);
	bird.animations.add('fly', [0, 1, 2], 10, true);
	bird.scale.setTo(0.5, 0.5);
	bird.inputEnabled = true;
	bird.body.collideWorldBounds = true;
	bird.body.gravity.y = GRAVITY;
	bird.body.allowGravity = false;
	bird.angle = 0;
	bird.reset(game.world.width / 2, game.world.height / 2);
	bird.alpha = 0.4;
	birds.add(bird);

	nameText = game.add.text(0, 0, playerName,
		{
			font: '9px "Press Start 2P"',
			fill: '#fff',
			stroke: '#430',
			strokeThickness: 1,
			align: 'center'
		}
	);
	nameText.anchor.setTo(0.5, 0.5);
	nameText.alpha = 0.4;
	bird.nameText = nameText;
	return bird;
}
