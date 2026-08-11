#!/usr/bin/env python3
"""罫線と見出し付きの参考画像から、ゲームで使えるスプライトシートを切り出す。

元画像 (行見出し 下/上/右/左、列見出し 1..8、黒い罫線) をそのまま読み込むと
罫線と余白まで描画されてしまう。このスクリプトは罫線を検出してマスの中身だけを
取り出し、8列 x 4行の隙間のないシートに並べ直す。

    python3 tools/slice_reference_sheet.py 参考画像.png -o assets/character.png

罫線の自動検出に失敗する場合は、マスの位置を直接指定する:

    python3 tools/slice_reference_sheet.py 参考画像.png \
        --x0 45 --y0 30 --cell-w 117 --cell-h 133
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter, deque
from pathlib import Path

from PIL import Image

COLS, ROWS = 8, 4


def find_grid_lines(gray: Image.Image, axis: str, dark_level: int, coverage: float) -> list[int]:
    """罫線 (画像を横断する暗い線) の中心座標を返す。

    axis='h' なら水平線 (y 座標)、'v' なら垂直線 (x 座標)。
    """
    width, height = gray.size
    pixels = gray.load()
    outer, inner = (height, width) if axis == "h" else (width, height)

    hits = []
    for i in range(outer):
        dark = 0
        for j in range(inner):
            value = pixels[j, i] if axis == "h" else pixels[i, j]
            if value < dark_level:
                dark += 1
        # 罫線は画像をほぼ横断するので、暗いピクセルの割合が高い行/列だけ拾う。
        if dark / inner >= coverage:
            hits.append(i)

    # 罫線は数ピクセルの太さがあるので、連続する座標をまとめて中心を取る。
    lines, run = [], []
    for i in hits:
        if run and i - run[-1] > 1:
            lines.append(sum(run) // len(run))
            run = []
        run.append(i)
    if run:
        lines.append(sum(run) // len(run))
    return lines


def background_color(cell: Image.Image) -> tuple[int, int, int, int]:
    """マスの外周で最も多い色を背景色とみなす。"""
    width, height = cell.size
    pixels = cell.load()
    border = Counter()
    for x in range(width):
        border[pixels[x, 0][:3]] += 1
        border[pixels[x, height - 1][:3]] += 1
    for y in range(height):
        border[pixels[0, y][:3]] += 1
        border[pixels[width - 1, y][:3]] += 1
    r, g, b = border.most_common(1)[0][0]
    return (r, g, b, 255)


def make_background_transparent(cell: Image.Image, tolerance: int) -> tuple[Image.Image, float]:
    """外周から届く範囲の背景色だけを透明にする。透明化した割合も返す。

    単純な色置換だと、白いドレスなどキャラ内部の同色まで消えてしまう。
    外側から塗りつぶし式に辿ることで、輪郭線で囲まれた内側は残す。
    それでもキャラと背景が同色で地続きだと中まで抜けてしまうので、
    tolerance は小さめが安全 (呼び出し側で抜けすぎを検出して警告する)。
    """
    cell = cell.convert("RGBA")
    width, height = cell.size
    pixels = cell.load()
    base = background_color(cell)[:3]

    def is_background(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        if a == 0:
            return True
        return max(abs(r - base[0]), abs(g - base[1]), abs(b - base[2])) <= tolerance

    seen = bytearray(width * height)
    queue = deque()
    for x in range(width):
        for y in (0, height - 1):
            queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            queue.append((x, y))

    cleared = 0
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height:
            continue
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1
        if not is_background(x, y):
            continue
        pixels[x, y] = (0, 0, 0, 0)
        cleared += 1
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return cell, cleared / (width * height)


def union_bbox(cells: list[Image.Image]) -> tuple[int, int, int, int]:
    """全マスの中身を囲む共通の矩形。

    マスごとに個別で切り詰めると、コマ間でキャラの位置がずれて
    アニメがガタつく。全コマ共通の矩形で切ることで相対位置を保つ。
    """
    boxes = [cell.getbbox() for cell in cells]
    boxes = [box for box in boxes if box]
    if not boxes:
        return (0, 0, cells[0].width, cells[0].height)
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def cell_boxes(image: Image.Image, args) -> list[tuple[int, int, int, int]]:
    """32マスそれぞれの (left, top, right, bottom) を求める。"""
    if args.cell_w and args.cell_h:
        x0 = args.x0 or 0
        y0 = args.y0 or 0
        return [
            (x0 + c * args.cell_w, y0 + r * args.cell_h,
             x0 + (c + 1) * args.cell_w, y0 + (r + 1) * args.cell_h)
            for r in range(ROWS) for c in range(COLS)
        ]

    gray = image.convert("L")
    h_lines = find_grid_lines(gray, "h", args.dark_level, args.coverage)
    v_lines = find_grid_lines(gray, "v", args.dark_level, args.coverage)
    if len(h_lines) != ROWS + 1 or len(v_lines) != COLS + 1:
        sys.exit(
            f"罫線を自動検出できませんでした "
            f"(水平線 {len(h_lines)}本 / 期待 {ROWS + 1}本, "
            f"垂直線 {len(v_lines)}本 / 期待 {COLS + 1}本)。\n"
            f"--coverage や --dark-level を調整するか、"
            f"--x0/--y0/--cell-w/--cell-h でマスの位置を直接指定してください。"
        )

    pad = args.inset
    return [
        (v_lines[c] + pad, h_lines[r] + pad, v_lines[c + 1] - pad, h_lines[r + 1] - pad)
        for r in range(ROWS) for c in range(COLS)
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", help="罫線付きの参考画像")
    parser.add_argument("-o", "--out", default="assets/character.png")
    parser.add_argument("--keep-background", action="store_true",
                        help="背景を透明化せずそのまま残す")
    parser.add_argument("--tolerance", type=int, default=12,
                        help="背景色とみなす色の許容差 (既定: 12)")
    parser.add_argument("--inset", type=int, default=2,
                        help="罫線を確実に除くため内側に詰めるピクセル数 (既定: 2)")
    parser.add_argument("--dark-level", type=int, default=128,
                        help="罫線とみなす明るさの上限 (既定: 128)")
    parser.add_argument("--coverage", type=float, default=0.5,
                        help="罫線とみなす暗ピクセルの割合 (既定: 0.5)")
    parser.add_argument("--x0", type=int, help="手動指定: マス範囲の左端")
    parser.add_argument("--y0", type=int, help="手動指定: マス範囲の上端")
    parser.add_argument("--cell-w", type=int, help="手動指定: マスの幅")
    parser.add_argument("--cell-h", type=int, help="手動指定: マスの高さ")
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGBA")
    boxes = cell_boxes(image, args)

    cells = [image.crop(box) for box in boxes]
    if not args.keep_background:
        results = [make_background_transparent(cell, args.tolerance) for cell in cells]
        cells = [cell for cell, _ in results]
        # 背景がキャラの内側まで抜けると、ほとんどが透明なコマになる。
        # 自動では直せないので、気づけるように知らせる。
        leaked = [i for i, (_, ratio) in enumerate(results) if ratio > 0.9]
        if leaked:
            print(
                f"警告: {len(leaked)} 個のマスで背景の除去が広がりすぎています "
                f"(キャラの色が背景と近い可能性があります)。\n"
                f"      --tolerance を下げるか、--keep-background で確認してください。",
                file=sys.stderr,
            )

    # 全マス共通の矩形で切り詰めてから、隙間なく並べ直す。
    left, top, right, bottom = union_bbox(cells)
    frame_w, frame_h = right - left, bottom - top
    sheet = Image.new("RGBA", (frame_w * COLS, frame_h * ROWS), (0, 0, 0, 0))
    for index, cell in enumerate(cells):
        row, col = divmod(index, COLS)
        sheet.paste(cell.crop((left, top, right, bottom)), (col * frame_w, row * frame_h))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"{out} を書き出しました ({sheet.width}x{sheet.height}, 1コマ {frame_w}x{frame_h})")


if __name__ == "__main__":
    main()
