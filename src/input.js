// キーボード入力。矢印キーと WASD の両方を受け付ける。
const Input = (() => {
  const KEY_TO_DIR = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  const held = new Set();
  // 斜め移動中にどちらの向きを向くか決めるため、最後に押した軸を覚えておく。
  let lastAxis = 'y';

  window.addEventListener('keydown', (e) => {
    const dir = KEY_TO_DIR[e.code];
    if (!dir) return;
    e.preventDefault();
    if (!held.has(dir)) lastAxis = (dir === 'left' || dir === 'right') ? 'x' : 'y';
    held.add(dir);
  });

  window.addEventListener('keyup', (e) => {
    const dir = KEY_TO_DIR[e.code];
    if (!dir) return;
    e.preventDefault();
    held.delete(dir);
  });

  // フォーカスが外れたらキーが押しっぱなし扱いにならないようにする。
  window.addEventListener('blur', () => held.clear());

  return {
    // 移動方向を -1..1 で返す。斜めでも速度が速くならないよう正規化する。
    moveVector() {
      let x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      let y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    // 斜め移動時に優先する軸 ('x' or 'y')。
    preferredAxis() {
      return lastAxis;
    },
  };
})();
