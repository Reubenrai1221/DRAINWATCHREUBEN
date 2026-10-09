"""Pack NYC's streets and bridges into a small file the app can carry.

Usage (needs pyarrow):
    python3 scripts/build_roads.py nyc_roads.parquet src/data/nycBoroughs.json src/data/nycRoads.js

Input: Overture Maps road segments for NYC (built from OpenStreetMap; see
README → "Street map"). Output: a JavaScript module holding every drivable
street in a compact binary format, so the map can draw streets with no
outside map service, no API key and no internet.

How it stays small:
  1. Keep only roads cars use (no footpaths, bike paths or driveways), and
     only roads that touch the five boroughs (not New Jersey or Long Island).
  2. Simplify each line (Douglas-Peucker, ~1.5 m tolerance): drop points
     that don't change the shape you see, even zoomed all the way in.
  3. Store coordinates as whole numbers (1 unit = 0.00001°, about 1 m),
     each point as the small *difference* from the previous point.
  4. Write those numbers as variable-length bytes (small numbers take 1-2
     bytes instead of 8), then base64 so it fits in a JavaScript string.

Street names: the source splits every street at each intersection, which is
too short to fit a name. So for labels we join the pieces of each named street
back into long lines (matching shared end points), shorten the names the way
street signs and Google Maps do ("West 42nd Street" -> "W 42nd St"), and store
those lines separately.
"""

import base64
import json
import math
import re
import struct
import sys
from collections import defaultdict

import pyarrow.parquet as pq

# Drawn in this order (minor roads first, highways on top).
CLASSES = ["residential", "unclassified", "living_street", "tertiary", "secondary", "primary", "trunk", "motorway"]
SCALE = 100_000  # coordinates stored in units of 0.00001 degrees
ORIGIN = (-74.30, 40.45)  # southwest corner of the NYC area
TOLERANCE = 0.000015  # degrees, about 1.5 m
LABEL_TOLERANCE = 0.00004  # label lines don't need as much detail, about 4 m

WORDS = {
    "Street": "St", "Avenue": "Ave", "Boulevard": "Blvd", "Road": "Rd", "Place": "Pl",
    "Parkway": "Pkwy", "Expressway": "Expy", "Drive": "Dr", "Lane": "Ln", "Court": "Ct",
    "Terrace": "Ter", "Highway": "Hwy", "Turnpike": "Tpke", "Square": "Sq", "Plaza": "Plz",
    "Bridge": "Br", "Freeway": "Fwy", "Crescent": "Cres", "Saint": "St",
}
DIRECTIONS = {"North": "N", "South": "S", "East": "E", "West": "W"}


def abbreviate(name):
    words = name.split()
    out = []
    for i, w in enumerate(words):
        # "West 42nd Street" -> "W 42nd St", but "East Broadway" stays as is
        if i == 0 and w in DIRECTIONS and len(words) > 2:
            out.append(DIRECTIONS[w])
        elif i == len(words) - 1 and w in DIRECTIONS and len(words) > 2:
            out.append(DIRECTIONS[w])
        elif w in WORDS and i > 0:
            out.append(WORDS[w])
        else:
            out.append(w)
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def parse_wkb_lines(wkb):
    """Return a list of [(lng, lat), ...] lines from LineString/MultiLineString WKB."""
    def read_line(buf, off):
        order = "<" if buf[off] == 1 else ">"
        (gtype,) = struct.unpack_from(order + "I", buf, off + 1)
        (n,) = struct.unpack_from(order + "I", buf, off + 5)
        pts = struct.unpack_from(order + "d" * (2 * n), buf, off + 9)
        return gtype, list(zip(pts[0::2], pts[1::2])), off + 9 + 16 * n

    order = "<" if wkb[0] == 1 else ">"
    (gtype,) = struct.unpack_from(order + "I", wkb, 1)
    gtype %= 1000
    if gtype == 2:
        return [read_line(wkb, 0)[1]]
    if gtype == 5:
        (count,) = struct.unpack_from(order + "I", wkb, 5)
        off, lines = 9, []
        for _ in range(count):
            _, line, off = read_line(wkb, off)
            lines.append(line)
        return lines
    return []


def simplify(points, tol):
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = points[a], points[b]
        dx, dy = x2 - x1, y2 - y1
        length2 = dx * dx + dy * dy
        best, index = 0.0, None
        for i in range(a + 1, b):
            x, y = points[i]
            if length2 == 0:
                d2 = (x - x1) ** 2 + (y - y1) ** 2
            else:
                t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / length2))
                d2 = (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2
            if d2 > best:
                best, index = d2, i
        if index is not None and best > tol * tol:
            keep[index] = True
            stack.extend([(a, index), (index, b)])
    return [p for p, k in zip(points, keep) if k]


MASK_CELL = 0.0005  # degrees, about 50 m


def borough_mask(path):
    """Grid of cells (about 50 m) that are inside a borough, plus a 1-cell margin
    so roads along the shoreline are kept. Built row by row by finding where
    each row crosses the borough outlines (the "scanline" method)."""
    rings = [poly[0] for f in json.load(open(path))["features"] for poly in f["geometry"]["coordinates"]]
    edges = [(a, b) for ring in rings for a, b in zip(ring, ring[1:] + ring[:1])]
    inside = set()
    rows = int((41.0 - ORIGIN[1]) / MASK_CELL)
    for r in range(rows):
        y = ORIGIN[1] + (r + 0.5) * MASK_CELL
        xs = sorted(x1 + (y - y1) * (x2 - x1) / (y2 - y1) for (x1, y1), (x2, y2) in edges if (y1 > y) != (y2 > y))
        for left, right in zip(xs[0::2], xs[1::2]):
            for c in range(int((left - ORIGIN[0]) / MASK_CELL), int((right - ORIGIN[0]) / MASK_CELL) + 1):
                inside.add((c, r))
    return {(c + dc, r + dr) for c, r in inside for dc in (-1, 0, 1) for dr in (-1, 0, 1)}


def in_nyc(line, mask):
    return any((int((x - ORIGIN[0]) / MASK_CELL), int((y - ORIGIN[1]) / MASK_CELL)) in mask for x, y in line)


def varint(n, out):
    n = (n << 1) ^ (n >> 63)  # zigzag: small negatives become small positives
    while n >= 0x80:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    out.append(n)


def merge_named(pieces):
    """Join street pieces that share an end point into long lines.

    pieces: list of (name, class_rank, [(x, y), ...]) with integer coordinates.
    Returns the same shape, with pieces of the same street joined together.
    """
    by_name = defaultdict(list)
    for name, rank, line in pieces:
        by_name[name].append((rank, line))
    merged = []
    for name, items in by_name.items():
        ends = defaultdict(list)  # end point -> piece indexes touching it
        for i, (_, line) in enumerate(items):
            ends[line[0]].append(i)
            ends[line[-1]].append(i)
        used = [False] * len(items)

        def heading(a, b):
            return math.atan2(b[1] - a[1], b[0] - a[0])

        def grow(chain, rank):
            # Keep adding the connected piece that continues straightest.
            while True:
                tip, before = chain[-1], chain[-2]
                best, best_turn = None, math.radians(60)
                for j in ends[tip]:
                    if used[j]:
                        continue
                    line = items[j][1]
                    nxt = line if line[0] == tip else line[::-1]
                    turn = abs((heading(tip, nxt[1]) - heading(before, tip) + math.pi) % (2 * math.pi) - math.pi)
                    if turn < best_turn:
                        best, best_turn = (j, nxt), turn
                if best is None:
                    return rank
                used[best[0]] = True
                chain.extend(best[1][1:])
                rank = max(rank, items[best[0]][0])

        for i, (rank, line) in enumerate(items):
            if used[i]:
                continue
            used[i] = True
            chain = list(line)
            rank = grow(chain, rank)
            chain.reverse()
            rank = grow(chain, rank)
            merged.append((name, rank, chain))
    return merged


def encode_lines(lines, header):
    out = bytearray()
    for line in lines:
        for value in header(line):
            varint(value, out)
        pts = line[-1]
        varint(len(pts), out)
        px, py = 0, 0
        for x, y in pts:
            varint(x - px, out)
            varint(y - py, out)
            px, py = x, y
    return out


def main(src, boroughs, dst):
    mask = borough_mask(boroughs)
    table = pq.read_table(src, columns=["class", "road_flags", "geometry", "names"]).to_pylist()
    named_pieces = []
    out = bytearray()
    counts = {c: 0 for c in CLASSES}
    roads = bridges = points_in = points_out = 0
    for row in table:
        cls = row["class"]
        if cls not in CLASSES:
            continue
        flags = {v for f in (row["road_flags"] or []) for v in (f["values"] or [])}
        if "is_tunnel" in flags:
            continue  # tunnels are underground or underwater; don't draw them
        is_bridge = "is_bridge" in flags
        name = ((row.get("names") or {}).get("primary") or "").strip()
        for line in parse_wkb_lines(row["geometry"]):
            if not in_nyc(line, mask):
                continue
            points_in += len(line)
            line = simplify(line, TOLERANCE)
            q = [(round((x - ORIGIN[0]) * SCALE), round((y - ORIGIN[1]) * SCALE)) for x, y in line]
            q = [p for i, p in enumerate(q) if i == 0 or p != q[i - 1]]
            if len(q) < 2:
                continue
            if name:
                named_pieces.append((abbreviate(name), CLASSES.index(cls), q))
            varint(CLASSES.index(cls) * 2 + int(is_bridge), out)
            varint(len(q), out)
            px, py = 0, 0
            for x, y in q:
                varint(x - px, out)
                varint(y - py, out)
                px, py = x, y
            roads += 1
            bridges += is_bridge
            counts[cls] += 1
            points_out += len(q)

    # Street-name lines: join pieces, then simplify more (labels need less detail).
    merged = merge_named(named_pieces)
    tol = LABEL_TOLERANCE * SCALE
    merged = [(n, r, simplify(line, tol)) for n, r, line in merged]
    names = sorted({n for n, _, _ in merged})
    name_index = {n: i for i, n in enumerate(names)}
    label_bytes = encode_lines(merged, lambda m: (name_index[m[0]], m[1]))

    meta = {"classes": CLASSES, "scale": SCALE, "origin": ORIGIN, "roads": roads, "labels": len(merged)}
    data = base64.b64encode(bytes(out)).decode()
    label_data = base64.b64encode(bytes(label_bytes)).decode()
    with open(dst, "w") as f:
        f.write("// Generated by scripts/build_roads.py. Do not edit by hand.\n")
        f.write("// Road data © OpenStreetMap contributors (ODbL), via Overture Maps Foundation.\n")
        f.write(f"export const ROAD_META = {json.dumps(meta)};\n")
        f.write(f'export const ROAD_DATA = "{data}";\n')
        f.write(f"export const STREET_NAMES = {json.dumps(names, ensure_ascii=False)};\n")
        f.write(f'export const LABEL_DATA = "{label_data}";\n')
    print(f"{roads:,} road lines ({bridges:,} bridge pieces), {points_in:,} -> {points_out:,} points")
    print("by class:", counts)
    print(f"{len(names):,} street names on {len(merged):,} label lines (from {len(named_pieces):,} pieces)")
    print(f"roads {len(data)/1e6:.2f} MB, labels {len(label_data)/1e6:.2f} MB, names {len(json.dumps(names))/1e6:.2f} MB as text")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
