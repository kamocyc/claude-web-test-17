// スプライトシートとゲーム挙動の設定。
// 自作のスプライトシートに差し替えるときは、基本的にこのファイルだけを直せば動く。
const CONFIG = {
  // --- スプライトシート ---
  // 8列 x 4行。1コマのサイズは画像サイズから自動計算する
  // (frameW = image.width / cols, frameH = image.height / rows)。
  sheetPath: 'assets/character.png',
  cols: 8,
  rows: 4,

  // 元画像の行の並び (上から 下 / 上 / 右 / 左)。
  // 別の並びのシートを使う場合はここの数字を入れ替える。
  rowOf: { down: 0, up: 1, right: 2, left: 3 },

  // 立ち止まっているときに表示するコマ (0 始まり)。
  idleFrame: 0,
  // 歩行アニメの速さ (1秒あたりのコマ数)。
  walkFps: 10,

  // --- プレイヤー ---
  speed: 90,              // 移動速度 (px/秒)
  // 当たり判定は足元の小さな矩形。見た目の1コマに対する比率で指定する。
  hitboxWidthRatio: 0.42,
  hitboxHeightRatio: 0.20,

  // --- 画面 ---
  viewWidth: 400,         // 内部解像度 (px)。これを整数倍して画面に引き伸ばす
  viewHeight: 300,
  tileSize: 32,
};
