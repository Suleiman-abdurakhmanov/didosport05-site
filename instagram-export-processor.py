#!/usr/bin/env python3
"""
Instagram export processor.
Reads unzipped Instagram data export folders and produces feed-data.json
extending the existing site feed.

Usage:
  python3 instagram-export-processor.py \\
      --source /var/www/didosport05.ru/_export/posts \\
      --existing /var/www/didosport05.ru/feed-data.json \\
      --output /var/www/didosport05.ru/feed-data.json \\
      --images-dir /var/www/didosport05.ru/instagram_archive \\
      --public-url-prefix /instagram_archive

Categories are detected from caption keywords (same logic as the cron syncer).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

# ----- category detection (mirrors the cron logic) -----
CATEGORY_KEYWORDS = {
    "wrestling": [
        "вольная борьба", "вольной борьбы", "вольную борьбу", "борьба",
        "борца", "борцу", "борцом", "борец", "борцы",
        "кубок по вольной", "первенство по вольной", "чемпионат по борьбе",
        "грэпплинг", "грэплинг", "grappling", "grepling",
        "абдулрашидов", "абдулаев", "султанахмедов", "магомедов",
        "олимпийский чемпион", "чемпион мира", "чемпион европы",
    ],
    "mma": ["mma", "мма", "ufc", "pfl", "aca", "fight nights", "fng", "eagle"],
    "grappling": ["грэпплинг", "grappling", "no-gi", "no gi", "submission"],
    "muay_thai": ["муай-тай", "тайский бокс", "muay thai", "кикбоксинг", "k-1"],
    "volleyball": ["волейбол", "волейбола", "волейболу", "волейбольный"],
    "football": ["футбол", "футбола", "футбольный", "спартак", "цска"],
    "community": [
        "турнир", "соревнования", "соревнование", "памяти", "кубок",
        "первенство", "чемпионат", "сборы", "сбор", "лагерь",
        "дидо спорт", "цунтинский", "цугни", "дидоев",
        "сообщество", "поздравляем", "награда", "приз",
        "день рождения", "юбилей", "открытие", "закрытие",
    ],
}


def detect_category(caption: str) -> str:
    if not caption:
        return "community"
    low = caption.lower()
    # Priority order matters: mma/wrestling before generic 'tournament'
    for cat in ("mma", "muay_thai", "volleyball", "football", "grappling", "wrestling"):
        for kw in CATEGORY_KEYWORDS[cat]:
            if kw in low:
                return cat
    return "community"


# ----- export parsing -----

def parse_json_post(jf: Path) -> dict | None:
    """Parse a single .json sidecar produced by Instagram export."""
    try:
        with jf.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as exc:
        print(f"  ! skip {jf.name}: {exc}", file=sys.stderr)
        return None

    media = data.get("media", [{}])[0] if isinstance(data.get("media"), list) else data
    uri = media.get("uri") or ""
    creation_ts = media.get("creation_timestamp")
    caption = data.get("title", "") or ""
    if isinstance(creation_ts, (int, float)):
        date_iso = datetime.utcfromtimestamp(creation_ts).strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        date_iso = str(creation_ts or "")

    shortcode = data.get("shortcode") or jf.stem
    likes = data.get("like_count") or 0
    comments = data.get("comment_count") or 0

    # try several relative URI candidates
    candidates = []
    if uri:
        candidates.append(uri.lstrip("/"))
        # also try stripping 'content/' prefix
        candidates.append(re.sub(r"^content/", "", uri.lstrip("/")))
    candidates.append(shortcode)

    return {
        "code": shortcode,
        "url": f"https://www.instagram.com/p/{shortcode}/",
        "date": date_iso,
        "caption": caption,
        "category": detect_category(caption),
        "like_count": likes,
        "comment_count": comments,
        "_image_candidates": candidates,
    }


def find_image_for_post(post: dict, source_root: Path) -> Path | None:
    """Find the actual image/video file for a post in the unzipped export."""
    media_dir = source_root / "media"
    for cand in post["_image_candidates"]:
        for ext in (".jpg", ".jpeg", ".png", ".webp", ".mp4"):
            full = media_dir / f"{cand}{ext}"
            if full.exists():
                return full
        # also try as directory (videos often have separate folder)
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            for sub in media_dir.rglob(f"{cand}{ext}"):
                return sub
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="Unzipped export root (folder containing media/ and posts_1.json etc.)")
    ap.add_argument("--existing", required=True, help="Path to current feed-data.json")
    ap.add_argument("--output", required=True, help="Where to write the merged feed-data.json")
    ap.add_argument("--images-dir", required=True, help="Directory to copy media into (public)")
    ap.add_argument("--public-url-prefix", default="/instagram_archive", help="Public URL prefix for images")
    ap.add_argument("--max-posts", type=int, default=2500, help="Cap on total posts after merge")
    args = ap.parse_args()

    source = Path(args.source)
    images_dir = Path(args.images_dir)
    images_dir.mkdir(parents=True, exist_ok=True)

    # 1) parse all post_*.json files
    posts_files = sorted(source.rglob("posts_*.json")) + sorted(source.rglob("posts.json"))
    if not posts_files:
        print(f"No posts_*.json found under {source}", file=sys.stderr)
        sys.exit(1)

    new_posts: list[dict] = []
    skipped = 0
    for jf in posts_files:
        post = parse_json_post(jf)
        if not post:
            continue
        img = find_image_for_post(post, source)
        if not img:
            skipped += 1
            continue

        # copy media to public images dir under shortcode folder
        dest_dir = images_dir / post["code"]
        dest_dir.mkdir(exist_ok=True)
        dest_file = dest_dir / img.name
        if not dest_file.exists():
            shutil.copy2(img, dest_file)

        post["image"] = f"{args.public_url_prefix.rstrip('/')}/{post['code']}/{img.name}"
        post.pop("_image_candidates", None)
        new_posts.append(post)

    print(f"Parsed {len(new_posts)} posts, {skipped} skipped (no media)", file=sys.stderr)

    # 2) merge with existing
    if Path(args.existing).exists():
        with open(args.existing, "r", encoding="utf-8") as fh:
            existing = json.load(fh)
    else:
        existing = []

    seen = {p.get("code") or p.get("url") for p in existing}
    added = 0
    for np in new_posts:
        if np["code"] in seen:
            continue
        existing.insert(0, np)  # newest first
        seen.add(np["code"])
        added += 1

    # cap
    if len(existing) > args.max_posts:
        existing = existing[:args.max_posts]

    # strip media fields we don't need
    for p in existing:
        p.pop("carousel_images", None)
        p.pop("_image_candidates", None)

    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(existing, fh, ensure_ascii=False, separators=(",", ":"))

    cats: dict[str, int] = {}
    for p in existing:
        cats[p.get("category", "community")] = cats.get(p.get("category", "community"), 0) + 1
    print(f"Added {added} new posts. Total now: {len(existing)}. Categories: {cats}", file=sys.stderr)


if __name__ == "__main__":
    main()
