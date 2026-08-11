// プレイヤーを中央に置き、マップの外が見えないように端で止まるカメラ。
class Camera {
  constructor(width, height, world) {
    this.width = width;
    this.height = height;
    this.world = world;
    this.x = 0;
    this.y = 0;
  }

  follow(targetX, targetY) {
    this.x = targetX - this.width / 2;
    this.y = targetY - this.height / 2;

    // マップが画面より小さい場合は中央寄せ、それ以外は端でクランプ。
    this.x = this.world.width <= this.width
      ? (this.world.width - this.width) / 2
      : clamp(this.x, 0, this.world.width - this.width);
    this.y = this.world.height <= this.height
      ? (this.world.height - this.height) / 2
      : clamp(this.y, 0, this.world.height - this.height);
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
