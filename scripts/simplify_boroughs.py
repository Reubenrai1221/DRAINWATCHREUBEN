"""Shrink a NYC borough-boundary GeoJSON so it can ship inside the app.

Usage:
    python3 scripts/simplify_boroughs.py <input.geojson> src/data/nycBoroughs.json

What it does (no extra libraries needed):
  1. Drops tiny islands smaller than MIN_AREA (they're invisible at city zoom).
  2. Simplifies each outline with the Douglas-Peucker algorithm: it removes
     points that sit within TOLERANCE of a straight line between neighbors,
     so the shape looks the same but has far fewer points.
  3. Rounds coordinates to 5 decimals (about 1 meter).

This is the same "simplified geometry" idea we'll use for the much larger
flood map files later.
"""

import json
import sys

TOLERANCE = 0.0002  # degrees, about 20 m
MIN_AREA = 0.00002  # square degrees, about 0.17 km²


def perpendicular_distance(p, a, b):
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return ((x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2) ** 0.5


def douglas_peucker(points, tolerance):
    # Iterative version (recursion gets too deep on long coastlines).
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        best, index = 0.0, None
        for i in range(start + 1, end):
            d = perpendicular_distance(points[i], points[start], points[end])
            if d > best:
                best, index = d, i
        if index is not None and best > tolerance:
            keep[index] = True
            stack.extend([(start, index), (index, end)])
    return [p for p, k in zip(points, keep) if k]


def ring_area(ring):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:]))) / 2


def main(src, dst):
    data = json.load(open(src))
    before = after = 0
    features = []
    for feature in data["features"]:
        geom = feature["geometry"]
        polygons = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        out = []
        for polygon in polygons:
            outer = polygon[0]
            before += sum(len(r) for r in polygon)
            if ring_area(outer) < MIN_AREA:
                continue
            simple = douglas_peucker(outer, TOLERANCE)
            if len(simple) < 4:
                continue
            after += len(simple)
            out.append([[[round(x, 5), round(y, 5)] for x, y in simple]])
        features.append({
            "type": "Feature",
            "properties": {"name": feature["properties"]["name"]},
            "geometry": {"type": "MultiPolygon", "coordinates": out},
        })
    json.dump({"type": "FeatureCollection", "features": features}, open(dst, "w"), separators=(",", ":"))
    print(f"{before:,} points -> {after:,} points")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
