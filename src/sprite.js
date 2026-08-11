// スプライトシートの切り出しと、歩行アニメのコマ送り。

// 格子状に並んだスプライトシートから 1コマずつ描画する。
class SpriteSheet {
  constructor(image, cols, rows) {
    this.image = image;
    this.cols = cols;
    this.rows = rows;
    // 1コマのサイズは画像全体を等分して求めるので、
    // 元画像の解像度が変わってもコードを直さなくてよい。
    this.frameWidth = image.width / cols;
    this.frameHeight = image.height / rows;
  }

  // (col, row) のコマを、左上が (dx, dy) になるように描く。
  draw(ctx, col, row, dx, dy) {
    const { frameWidth: w, frameHeight: h } = this;
    ctx.drawImage(
      this.image,
      col * w, row * h, w, h,
      Math.round(dx), Math.round(dy), w, h,
    );
  }
}

// 歩いている間だけコマを進め、止まったら立ち絵に戻すアニメーター。
class WalkAnimator {
  constructor({ frameCount, fps, idleFrame }) {
    this.frameCount = frameCount;
    this.fps = fps;
    this.idleFrame = idleFrame;
    this.frame = idleFrame;
    this.elapsed = 0;
  }

  update(dt, isMoving) {
    if (!isMoving) {
      // 止まったらアニメをリセットしておく。
      // こうしないと歩き出しのコマが毎回変わってちらついて見える。
      this.frame = this.idleFrame;
      this.elapsed = 0;
      return;
    }
    this.elapsed += dt;
    const secondsPerFrame = 1 / this.fps;
    while (this.elapsed >= secondsPerFrame) {
      this.elapsed -= secondsPerFrame;
      this.frame = (this.frame + 1) % this.frameCount;
    }
  }
}

// 画像を読み込む (失敗したら reject)。
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像を読み込めませんでした: ${src}`));
    img.src = src;
  });
}
