// プレイヤーキャラクター。移動 / 向きの決定 / 歩行アニメを持つ。
class Player {
  // x, y は「足元の中心」。見下ろし視点では足元を基準にすると
  // 当たり判定とキャラの重なり順を素直に扱える。
  constructor(x, y, sheet, config) {
    this.x = x;
    this.y = y;
    this.sheet = sheet;
    this.config = config;
    this.facing = 'down';
    this.speed = config.speed;

    this.halfWidth = (sheet.frameWidth * config.hitboxWidthRatio) / 2;
    this.halfHeight = (sheet.frameHeight * config.hitboxHeightRatio) / 2;

    // 向きごとに使うコマの並び。設定がなければ全コマを順に使う。
    const allFrames = Array.from({ length: config.cols }, (_, i) => i);
    this.sequences = {};
    for (const direction of Object.keys(config.rowOf)) {
      this.sequences[direction] = config.frameSequence?.[direction] ?? allFrames;
    }

    this.animator = new WalkAnimator({
      fps: config.walkFps,
      idleIndex: config.idleIndex,
    });
  }

  // いま描くべきコマ番号。向きが変わってシーケンスが短くなっても
  // はみ出さないよう、剰余で丸める。
  get frameColumn() {
    const sequence = this.sequences[this.facing];
    return sequence[this.animator.index % sequence.length];
  }

  update(dt, input, world) {
    const move = input.moveVector();
    const isMoving = move.x !== 0 || move.y !== 0;

    if (isMoving) {
      this.facing = this.#facingFor(move, input.preferredAxis());
      // X と Y を別々に動かすと、壁に斜めからぶつかったときに
      // 止まらずに壁沿いに滑ってくれる。
      this.#moveAxis(world, move.x * this.speed * dt, 0);
      this.#moveAxis(world, 0, move.y * this.speed * dt);
    }

    this.animator.update(dt, isMoving, this.sequences[this.facing].length);
  }

  #facingFor(move, preferredAxis) {
    if (move.x !== 0 && move.y !== 0) {
      // 斜めのときは、後から押されたキーの軸を向く。
      return preferredAxis === 'x'
        ? (move.x > 0 ? 'right' : 'left')
        : (move.y > 0 ? 'down' : 'up');
    }
    if (move.x !== 0) return move.x > 0 ? 'right' : 'left';
    return move.y > 0 ? 'down' : 'up';
  }

  #moveAxis(world, dx, dy) {
    const nextX = this.x + dx;
    const nextY = this.y + dy;
    // 当たり判定は足元の矩形 (下端が y に接する)。
    const centerY = nextY - this.halfHeight;
    if (!world.rectCollides(nextX, centerY, this.halfWidth, this.halfHeight)) {
      this.x = nextX;
      this.y = nextY;
    }
  }

  draw(ctx) {
    const { frameWidth: w, frameHeight: h } = this.sheet;
    const row = this.config.rowOf[this.facing];
    this.sheet.draw(ctx, this.frameColumn, row, this.x - w / 2, this.y - h);
  }

  // デバッグ表示 (F1) 用の当たり判定の枠。
  drawHitbox(ctx) {
    ctx.strokeStyle = '#ff3b6b';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(this.x - this.halfWidth) + 0.5,
      Math.round(this.y - this.halfHeight * 2) + 0.5,
      Math.round(this.halfWidth * 2),
      Math.round(this.halfHeight * 2),
    );
  }
}
