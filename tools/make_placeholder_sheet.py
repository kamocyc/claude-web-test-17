#!/usr/bin/env python3
"""assets/character.png のプレースホルダを生成する。

本物のスプライトシートが用意できるまでの仮素材。
本番の素材と同じ「8列 x 4行 (下/上/右/左)」の並びで出力するので、
差し替えるときはこのファイルを上書きするだけでよい。

    python3 tools/make_placeholder_sheet.py
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

FRAME_W, FRAME_H = 48, 64
COLS, ROWS = 8, 4
DIRECTIONS = ["down", "up", "right", "left"]

HAIR = (242, 140, 176, 255)
HAIR_DARK = (206, 104, 142, 255)
SKIN = (255, 226, 210, 255)
DRESS = (238, 234, 242, 255)  # 純白は避ける (背景の白と区別できなくなるため)
DRESS_SHADE = (208, 196, 214, 255)
TRIM = (232, 118, 158, 255)
SHOE = (186, 88, 124, 255)
EYE = (86, 168, 200, 255)


def box(draw: ImageDraw.ImageDraw, x0, y0, x1, y1, color) -> None:
    """右端・下端を含まない矩形 (座標計算をドット単位で考えやすくするため)."""
    if x1 <= x0 or y1 <= y0:
        return
    draw.rectangle([x0, y0, x1 - 1, y1 - 1], fill=color)


def draw_character(draw: ImageDraw.ImageDraw, ox: int, oy: int, direction: str, step: int) -> None:
    phase = 2 * math.pi * step / COLS
    swing = math.sin(phase)          # -1..1 の往復。step=0 で 0 (直立)
    bob = round(abs(swing))          # 歩くたびに体が 1px 上下する

    cx = ox + FRAME_W // 2
    ground = oy + 62 - bob
    side = direction in ("right", "left")

    # 縦の配置 (48x64 のコマに収まるよう固定)。
    head_top = oy + 4 - bob
    head_h = 22
    torso_top = head_top + head_h - 2
    skirt_top = torso_top + 7
    leg_top = ground - 11

    # --- 脚と靴 (奥から手前の順に描く) ---
    if side:
        front = round(swing * 4)
        for dx in (-front, front):
            box(draw, cx - 3 + dx, leg_top, cx + 3 + dx, ground - 3, SKIN)
            box(draw, cx - 4 + dx, ground - 3, cx + 4 + dx, ground, SHOE)
    else:
        lift = round(swing * 2)
        box(draw, cx - 7, leg_top - lift, cx - 2, ground - 3 - lift, SKIN)
        box(draw, cx - 8, ground - 3 - lift, cx - 1, ground - lift, SHOE)
        box(draw, cx + 2, leg_top + lift, cx + 7, ground - 3 + lift, SKIN)
        box(draw, cx + 1, ground - 3 + lift, cx + 8, ground + lift, SHOE)

    # --- 胴とスカート (下に向かって広がる台形) ---
    box(draw, cx - 6, torso_top, cx + 6, skirt_top, DRESS)
    box(draw, cx - 6, skirt_top - 2, cx + 6, skirt_top, TRIM)
    skirt_h = max(1, leg_top + 2 - skirt_top)
    for y in range(skirt_top, skirt_top + skirt_h):
        t = (y - skirt_top) / skirt_h
        half = round(6 + t * 7)
        box(draw, cx - half, y, cx + half, y + 1, DRESS if t < 0.8 else DRESS_SHADE)

    # --- 腕 (脚と逆位相に振る) ---
    if side:
        arm = -round(swing * 3)
        box(draw, cx - 2 + arm, torso_top + 1, cx + 3 + arm, torso_top + 10, SKIN)
    else:
        lift = round(swing * 2)
        box(draw, cx - 10, torso_top + 1 + lift, cx - 6, torso_top + 10 + lift, SKIN)
        box(draw, cx + 6, torso_top + 1 - lift, cx + 10, torso_top + 10 - lift, SKIN)

    # --- 頭 ---
    if direction == "up":
        # 後ろ姿は顔が見えない。髪だけを描く。
        box(draw, cx - 10, head_top, cx + 10, head_top + head_h + 6, HAIR)
        box(draw, cx - 10, head_top + head_h, cx + 10, head_top + head_h + 6, HAIR_DARK)
        return

    if side:
        face_x = 3 if direction == "right" else -3
        box(draw, cx - 10, head_top, cx + 10, head_top + head_h, HAIR)
        box(draw, cx - 5 + face_x, head_top + 6, cx + 9 + face_x, head_top + 19, SKIN)
        box(draw, cx - 11, head_top + 2, cx + 2, head_top + head_h + 8, HAIR)  # 後ろに垂れる髪
        box(draw, cx + 3 + face_x, head_top + 10, cx + 5 + face_x, head_top + 14, EYE)
    else:
        box(draw, cx - 10, head_top, cx + 10, head_top + head_h + 4, HAIR)
        box(draw, cx - 7, head_top + 7, cx + 7, head_top + 20, SKIN)
        box(draw, cx - 10, head_top, cx + 10, head_top + 8, HAIR)              # 前髪
        box(draw, cx - 5, head_top + 11, cx - 2, head_top + 15, EYE)
        box(draw, cx + 2, head_top + 11, cx + 5, head_top + 15, EYE)


def build_sheet() -> Image.Image:
    sheet = Image.new("RGBA", (FRAME_W * COLS, FRAME_H * ROWS), (0, 0, 0, 0))
    for row, direction in enumerate(DIRECTIONS):
        for col in range(COLS):
            # 左向きは右向きを左右反転して作る。
            source = "right" if direction == "left" else direction
            cell = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
            draw_character(ImageDraw.Draw(cell), 0, 0, source, col)
            if direction == "left":
                cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
            sheet.paste(cell, (col * FRAME_W, row * FRAME_H))
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-o", "--out", default="assets/character.png")
    args = parser.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet = build_sheet()
    sheet.save(out)
    print(f"{out} を書き出しました ({sheet.width}x{sheet.height}, 1コマ {FRAME_W}x{FRAME_H})")


if __name__ == "__main__":
    main()
