"""Download one Overture Maps dataset, cut to the NYC area, as GeoParquet.

Usage (needs pyarrow):
    python3 scripts/fetch_overture.py transportation segment nyc_roads.parquet
    python3 scripts/fetch_overture.py base land_use nyc_land_use.parquet

Overture publishes the whole world as large Parquet files on a public Amazon
S3 bucket (no account needed). Each file stores a bounding box summary for
every chunk ("row group") of rows, so we read those summaries first and only
download the chunks that overlap NYC, instead of tens of gigabytes.
"""

import argparse
import os
import time
from urllib.parse import urlparse

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.fs as pafs
import pyarrow.parquet as pq

RELEASE = "2026-09-23.1"
W, S, E, N = -74.26, 40.49, -73.70, 40.92  # NYC bounding box


def s3():
    options = {"anonymous": True, "region": "us-west-2"}
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        p = urlparse(proxy)
        options["proxy_options"] = {"scheme": "http", "host": p.hostname, "port": p.port}
    return pafs.S3FileSystem(**options)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("theme")
    ap.add_argument("type")
    ap.add_argument("out")
    ap.add_argument("--release", default=RELEASE)
    args = ap.parse_args()

    fs = s3()
    base = f"overturemaps-us-west-2/release/{args.release}/theme={args.theme}/type={args.type}/"
    files = sorted(f.path for f in fs.get_file_info(pafs.FileSelector(base)) if f.type == pafs.FileType.File)
    tables, t0 = [], time.time()
    for n, path in enumerate(files):
        pf = pq.ParquetFile(path, filesystem=fs)
        md = pf.metadata
        cols = {md.schema.column(i).path: i for i in range(md.num_columns)}
        groups = []
        for g in range(md.num_row_groups):
            rg = md.row_group(g)
            st = {k: rg.column(cols[f"bbox.{k}"]).statistics for k in ("xmin", "xmax", "ymin", "ymax")}
            if st["xmin"].min < E and st["xmax"].max > W and st["ymin"].min < N and st["ymax"].max > S:
                groups.append(g)
        if not groups:
            continue
        t = pf.read_row_groups(groups)
        b = t.column("bbox")
        keep = pc.and_(
            pc.and_(pc.less(pc.struct_field(b, "xmin"), E), pc.greater(pc.struct_field(b, "xmax"), W)),
            pc.and_(pc.less(pc.struct_field(b, "ymin"), N), pc.greater(pc.struct_field(b, "ymax"), S)),
        )
        t = t.filter(keep)
        tables.append(t)
        print(f"[{n + 1}/{len(files)}] {t.num_rows} rows ({time.time() - t0:.0f}s)", flush=True)

    result = pa.concat_tables(tables, promote_options="default")
    pq.write_table(result, args.out)
    print(f"saved {result.num_rows} rows to {args.out}")


if __name__ == "__main__":
    main()
