export const puzzleTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Puzzle Match - NiskBuild</title>
  <style>
    body { margin: 0; padding: 0; background: #0B0F19; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui; }
    #game-container { display: flex; flex-direction: column; align-items: center; }
    #controls { margin-top: 20px; display: flex; gap: 15px; }
    button { padding: 10px 20px; background: #7C3AED; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
    button:hover { background: #6D28D9; }
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
  <div class="instructions">Click two adjacent gems to swap | Match 3+ of the same color to score!</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js"></script>
<script>
  const COLORS = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa78bfa, 0x60a5fa, 0xf472b6];
  const GRID = 8;
  const TILE = 48;
  const OFFSET_X = 80;
  const OFFSET_Y = 40;

  class PuzzleGame extends Phaser.Scene {
    constructor() { super('PuzzleGame'); this.score = 0; this.selected = null; this.board = []; }

    create() {
      this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#fff' });
      this.movesText = this.add.text(16, 44, 'Moves: 30', { fontSize: '16px', fill: '#94A3B8' });
      this.movesLeft = 30;
      this.initBoard();
      this.drawBoard();
    }

    initBoard() {
      for (let r = 0; r < GRID; r++) {
        this.board[r] = [];
        for (let c = 0; c < GRID; c++) {
          this.board[r][c] = Phaser.Math.Between(0, COLORS.length - 1);
        }
      }
      while (this.findMatches().length) this.initBoard();
    }

    drawBoard() {
      if (this.tiles) this.tiles.forEach(t => t.destroy());
      this.tiles = [];
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const x = OFFSET_X + c * TILE + TILE / 2;
          const y = OFFSET_Y + r * TILE + TILE / 2;
          const gem = this.add.rectangle(x, y, TILE - 6, TILE - 6, COLORS[this.board[r][c]])
            .setStrokeStyle(2, 0x1e293b)
            .setInteractive({ useHandCursor: true });
          gem.setData('row', r);
          gem.setData('col', c);
          gem.on('pointerdown', () => this.onGemClick(gem));
          this.tiles.push(gem);
        }
      }
    }

    onGemClick(gem) {
      if (this.movesLeft <= 0) return;
      if (!this.selected) {
        this.selected = gem;
        gem.setStrokeStyle(3, 0xffffff);
        return;
      }
      const r1 = this.selected.getData('row'), c1 = this.selected.getData('col');
      const r2 = gem.getData('row'), c2 = gem.getData('col');
      const adjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
      this.selected.setStrokeStyle(2, 0x1e293b);
      this.selected = null;
      if (!adjacent) return;

      const tmp = this.board[r1][c1];
      this.board[r1][c1] = this.board[r2][c2];
      this.board[r2][c2] = tmp;
      const matches = this.findMatches();
      if (!matches.length) {
        this.board[r2][c2] = this.board[r1][c1];
        this.board[r1][c1] = tmp;
        return;
      }
      this.movesLeft--;
      this.movesText.setText('Moves: ' + this.movesLeft);
      this.resolveMatches(matches);
      this.drawBoard();
      if (this.movesLeft <= 0) {
        this.add.text(240, 220, 'Game Over!', { fontSize: '36px', fill: '#fff' }).setOrigin(0.5);
      }
    }

    findMatches() {
      const matched = new Set();
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID - 2; c++) {
          const v = this.board[r][c];
          if (v === this.board[r][c+1] && v === this.board[r][c+2]) {
            matched.add(r+','+c); matched.add(r+','+(c+1)); matched.add(r+','+(c+2));
          }
        }
      }
      for (let c = 0; c < GRID; c++) {
        for (let r = 0; r < GRID - 2; r++) {
          const v = this.board[r][c];
          if (v === this.board[r+1][c] && v === this.board[r+2][c]) {
            matched.add(r+','+c); matched.add((r+1)+','+c); matched.add((r+2)+','+c);
          }
        }
      }
      return [...matched].map(k => k.split(',').map(Number));
    }

    resolveMatches(matches) {
      matches.forEach(([r, c]) => {
        this.board[r][c] = Phaser.Math.Between(0, COLORS.length - 1);
        this.score += 10;
      });
      this.scoreText.setText('Score: ' + this.score);
      let again = this.findMatches();
      while (again.length) {
        again.forEach(([r, c]) => { this.board[r][c] = Phaser.Math.Between(0, COLORS.length - 1); this.score += 5; });
        this.scoreText.setText('Score: ' + this.score);
        again = this.findMatches();
      }
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 480,
    parent: 'game',
    backgroundColor: '#0B0F19',
    scene: PuzzleGame
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
