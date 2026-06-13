export const platformerTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Platformer Game - NiskBuild</title>
  <style>
    body { margin: 0; padding: 0; background: #0B0F19; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui; }
    #game-container { display: flex; flex-direction: column; align-items: center; }
    #controls { margin-top: 20px; display: flex; gap: 15px; }
    button { padding: 10px 20px; background: #4F6EF7; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
    button:hover { background: #3B5BD9; }
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
  <div class="instructions">← → Arrow keys to move | ↑ or Space to jump | Collect all coins to win!</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js"></script>
<script>
  class PlatformerGame {
    constructor() {
      this.config = {
        type: Phaser.AUTO,
        width: 800,
        height: 400,
        parent: 'game',
        physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
        scene: { preload: this.preload.bind(this), create: this.create.bind(this), update: this.update.bind(this) }
      };
      this.game = new Phaser.Game(this.config);
      this.score = 0;
    }

    preload() {
      this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
      this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
      this.load.image('coin', 'https://labs.phaser.io/assets/sprites/coin.png');
      this.load.spritesheet('player', 'https://labs.phaser.io/assets/sprites/dude.png', { frameWidth: 32, frameHeight: 48 });
    }

    create() {
      this.add.image(400, 200, 'background');
      this.platforms = this.physics.add.staticGroup();
      this.platforms.create(400, 380, 'ground').setScale(2).refreshBody();
      for (let i = 0; i < 5; i++) {
        this.platforms.create(150 + i * 130, 320, 'ground');
      }

      this.player = this.physics.add.sprite(100, 300, 'player');
      this.player.setBounce(0.2);
      this.player.setCollideWorldBounds(true);
      this.physics.add.collider(this.player, this.platforms);

      this.coins = this.physics.add.group({ key: 'coin', repeat: 4, setXY: { x: 150, y: 280, stepX: 130 } });
      this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

      this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '18px', fill: '#FFF' });
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    collectCoin(player, coin) {
      coin.disableBody(true, true);
      this.score += 10;
      this.scoreText.setText('Score: ' + this.score);
      if (this.coins.countActive(true) === 0) {
        this.add.text(400, 200, 'YOU WIN!', { fontSize: '48px', fill: '#FFF' }).setOrigin(0.5);
        this.physics.pause();
      }
    }

    update() {
      if (this.cursors.left.isDown) { this.player.setVelocityX(-160); }
      else if (this.cursors.right.isDown) { this.player.setVelocityX(160); }
      else { this.player.setVelocityX(0); }
      if ((this.cursors.up.isDown || this.spaceKey.isDown) && this.player.body.touching.down) {
        this.player.setVelocityY(-330);
      }
    }
  }

  new PlatformerGame();

  document.getElementById('restart-btn').addEventListener('click', () => location.reload());
  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    const el = document.getElementById('game-container');
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });
</script>
</body>
</html>`;
