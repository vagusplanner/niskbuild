export const runnerTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Endless Runner - NiskBuild</title>
  <style>
    body { margin: 0; padding: 0; background: #0B0F19; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui; }
    #game-container { display: flex; flex-direction: column; align-items: center; }
    #controls { margin-top: 20px; display: flex; gap: 15px; }
    button { padding: 10px 20px; background: #10B981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
    button:hover { background: #059669; }
    .instructions { margin-top: 15px; color: #94A3B8; font-size: 14px; text-align: center; max-width: 90vw; }
  </style>
</head>
<body>
<div id="game-container">
  <div id="game"></div>
  <div id="controls">
    <button id="restart-btn" type="button">Restart</button>
    <button id="fullscreen-btn" type="button">Fullscreen</button>
  </div>
  <div class="instructions">Space or tap to jump | Avoid obstacles | Speed increases over time!</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js"></script>
<script>
  class RunnerGame extends Phaser.Scene {
    constructor() { super('RunnerGame'); }

    preload() {
      this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
      this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
      this.score = 0;
      this.gameOver = false;
      this.speed = 200;
      this.add.rectangle(400, 200, 800, 400, 0x0f172a);
      this.ground = this.add.tileSprite(400, 370, 800, 64, 'ground');

      this.player = this.physics.add.sprite(120, 300, 'dude');
      this.player.setCollideWorldBounds(true);
      this.player.body.setGravityY(600);

      this.obstacles = this.physics.add.group();
      this.time.addEvent({ delay: 1800, callback: this.spawnObstacle, callbackScope: this, loop: true });

      this.physics.add.overlap(this.player, this.obstacles, () => this.endGame(), null, this);

      this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#fff' });
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.input.on('pointerdown', () => this.jump());
    }

    spawnObstacle() {
      if (this.gameOver) return;
      const obs = this.obstacles.create(820, 330, 'ground');
      obs.setDisplaySize(40, 60);
      obs.body.setAllowGravity(false);
      obs.setVelocityX(-this.speed);
      obs.setImmovable(true);
    }

    jump() {
      if (this.gameOver) return;
      if (this.player.body.touching.down) {
        this.player.setVelocityY(-380);
      }
    }

    endGame() {
      if (this.gameOver) return;
      this.gameOver = true;
      this.physics.pause();
      this.add.text(400, 180, 'GAME OVER', { fontSize: '42px', fill: '#EF4444' }).setOrigin(0.5);
      this.add.text(400, 230, 'Score: ' + this.score, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
    }

    update(time, delta) {
      if (this.gameOver) return;
      this.ground.tilePositionX += this.speed * (delta / 1000);
      this.speed += 0.02;
      this.score += Math.floor(delta / 50);
      this.scoreText.setText('Score: ' + this.score);

      this.obstacles.children.each((child) => {
        if (child.x < -50) child.destroy();
      });

      if (this.cursors.up.isDown || this.spaceKey.isDown) this.jump();
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    parent: 'game',
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: RunnerGame
  });

  document.getElementById('restart-btn').addEventListener('click', () => location.reload());
  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    const el = document.getElementById('game-container');
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });
</script>
</body>
</html>`;
