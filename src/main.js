// 起動処理とメインループ。
(async function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CONFIG.viewWidth;
  canvas.height = CONFIG.viewHeight;
  // ドット絵がぼやけないように補間を切る。
  ctx.imageSmoothingEnabled = false;

  let image;
  try {
    image = await loadImage(CONFIG.sheetPath);
  } catch (err) {
    showError(err.message);
    return;
  }

  const sheet = new SpriteSheet(image, CONFIG.cols, CONFIG.rows);
  const world = new World(MAP_ROWS, CONFIG.tileSize);
  const camera = new Camera(CONFIG.viewWidth, CONFIG.viewHeight, world);
  const player = new Player(
    world.width / 2,
    world.height / 2,
    sheet,
    CONFIG,
  );

  // デバッグ用にコンソールから触れるようにしておく (例: game.player.speed = 200)。
  window.game = { player, world, camera, sheet };

  let showDebug = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F1') {
      e.preventDefault();
      showDebug = !showDebug;
    }
  });

  fitCanvasToWindow(canvas);
  window.addEventListener('resize', () => fitCanvasToWindow(canvas));

  let lastTime = performance.now();
  let fps = 0;

  function frame(now) {
    // タブを切り替えて戻ってきたときに一気に進まないよう上限を設ける。
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (dt > 0) fps = fps * 0.9 + (1 / dt) * 0.1;

    player.update(dt, Input, world);
    camera.follow(player.x, player.y);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1b1b22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // カメラ位置を整数に丸めないと、ドット絵の境目に隙間が出てちらつく。
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
    world.draw(ctx, camera);
    player.draw(ctx);
    if (showDebug) player.drawHitbox(ctx);
    ctx.restore();

    if (showDebug) drawDebugText(ctx, player, fps);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

// 内部解像度を保ったまま、ウィンドウに収まる最大の整数倍で引き伸ばす。
// 整数倍にすることでドットの大きさが揃う。
function fitCanvasToWindow(canvas) {
  const CHROME_HEIGHT = 64; // 下の操作説明を表示する余白
  const scale = Math.max(1, Math.floor(Math.min(
    window.innerWidth / canvas.width,
    (window.innerHeight - CHROME_HEIGHT) / canvas.height,
  )));
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}

function drawDebugText(ctx, player, fps) {
  const lines = [
    `fps ${fps.toFixed(0)}`,
    `pos ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`,
    `facing ${player.facing}  frame ${player.animator.frame}`,
  ];
  ctx.font = '10px monospace';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(4, 4 + i * 12, ctx.measureText(line).width + 6, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, 7, 5 + i * 12);
  });
}

function showError(message) {
  const box = document.getElementById('error');
  box.textContent = `${message}\nassets/character.png を用意するか、src/config.js の sheetPath を直してください。`;
  box.hidden = false;
}
