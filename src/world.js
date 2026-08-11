// タイルマップと当たり判定。
// タイル画像は用意せず、色の矩形で描いている (キャラの動作確認が目的のため)。

const TILE_LEGEND = {
  '.': { name: 'grass', solid: false, base: '#6aa84f', speck: '#7bbb5b' },
  ',': { name: 'grass2', solid: false, base: '#639c48', speck: '#74af55' },
  'p': { name: 'path', solid: false, base: '#c9b18b', speck: '#d6c09c' },
  '#': { name: 'wall', solid: true, base: '#8a7f74', speck: '#9c9086' },
  'T': { name: 'tree', solid: true, base: '#3f6b34', speck: '#2f5127' },
  '~': { name: 'water', solid: true, base: '#4a86c8', speck: '#5f9bdb' },
};

// 1文字 = 1タイル。'#' 壁 / 'T' 木 / '~' 水 は通れない。
const MAP_ROWS = [
  '####################',
  '#..,..pppp....T...T#',
  '#.,...p..p.....,...#',
  '#.....p..p..,......#',
  '#..T..pppp.....~~~~#',
  '#...........,..~~~~#',
  '#.pppppppppppp.~~~~#',
  '#.p..........p.....#',
  '#.p..,...T...p..T..#',
  '#.p..........p.....#',
  '#.pppppppppppp,....#',
  '#..T.....,.........#',
  '#..............T...#',
  '####################',
];

class World {
  constructor(rows, tileSize) {
    this.tileSize = tileSize;
    this.grid = rows.map((row) => row.split(''));
    this.cols = this.grid[0].length;
    this.rowCount = this.grid.length;
    this.width = this.cols * tileSize;
    this.height = this.rowCount * tileSize;
  }

  tileAt(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rowCount) return null;
    return TILE_LEGEND[this.grid[row][col]] ?? null;
  }

  // マップ外は通れない扱いにする (null のとき true)。
  isSolidAt(x, y) {
    const tile = this.tileAt(
      Math.floor(x / this.tileSize),
      Math.floor(y / this.tileSize),
    );
    return tile === null || tile.solid;
  }

  // 矩形 (中心 cx, cy) が壁に重なっているか。四隅を調べれば足りる
  // (矩形がタイルより小さい前提。今の当たり判定サイズなら成り立つ)。
  rectCollides(cx, cy, halfW, halfH) {
    const left = cx - halfW;
    const right = cx + halfW - 0.001;
    const top = cy - halfH;
    const bottom = cy + halfH - 0.001;
    return (
      this.isSolidAt(left, top) ||
      this.isSolidAt(right, top) ||
      this.isSolidAt(left, bottom) ||
      this.isSolidAt(right, bottom)
    );
  }

  // カメラに映っている範囲のタイルだけ描く。
  draw(ctx, camera) {
    const ts = this.tileSize;
    const startCol = Math.max(0, Math.floor(camera.x / ts));
    const endCol = Math.min(this.cols - 1, Math.floor((camera.x + camera.width) / ts));
    const startRow = Math.max(0, Math.floor(camera.y / ts));
    const endRow = Math.min(this.rowCount - 1, Math.floor((camera.y + camera.height) / ts));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = this.tileAt(col, row);
        if (!tile) continue;
        const x = col * ts;
        const y = row * ts;
        ctx.fillStyle = tile.base;
        ctx.fillRect(x, y, ts, ts);

        // 単色だと移動しているのが分かりにくいので、
        // タイル座標から決まる模様を描いて目印にする。
        ctx.fillStyle = tile.speck;
        const odd = (col + row) % 2 === 0;
        if (tile.name === 'tree') {
          ctx.fillRect(x + 6, y + 4, ts - 12, ts - 10);
        } else if (tile.name === 'wall') {
          ctx.fillRect(x, y + (odd ? 4 : 18), ts, 2);
        } else {
          ctx.fillRect(x + (odd ? 6 : 20), y + (odd ? 18 : 8), 4, 4);
        }
      }
    }
  }
}
