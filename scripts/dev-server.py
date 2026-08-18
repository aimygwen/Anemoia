#!/usr/bin/env python3
"""
Local static server with SPA fallback.

Python's http.server returns 404 for clean URLs (/work, /insights, …).
This serves index.html for those routes so reload matches GitHub Pages behavior.
"""

from __future__ import annotations

import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PORT = 7100
DEFAULT_HOST = "127.0.0.1"
LEGAL_PAGES = {
    "imprint": "imprint.html",
    "legal": "imprint.html",
}


class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path_only = self.path.split("?", 1)[0]
        local_path = self.translate_path(path_only)

        leaf = path_only.rstrip("/").split("/")[-1].lower()
        if leaf in LEGAL_PAGES:
            query = self.path.partition("?")[2]
            self.path = "/" + LEGAL_PAGES[leaf] + ("?" + query if query else "")
            return super().do_GET()

        if os.path.isdir(local_path):
            index_path = os.path.join(local_path, "index.html")
            if os.path.isfile(index_path):
                return super().do_GET()

        if os.path.isfile(local_path):
            return super().do_GET()

        basename = os.path.basename(path_only.rstrip("/"))
        if basename and "." in basename:
            return super().do_GET()

        self.path = "/index.html" + (self.path.partition("?")[1] and "?" + self.path.partition("?")[2] or "")
        return super().do_GET()

    def log_message(self, format, *args):
        sys.stdout.write("%s - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))


def main() -> int:
    host = DEFAULT_HOST
    port = DEFAULT_PORT
    args = sys.argv[1:]
    if args:
        port = int(args[0])
    if len(args) > 1:
        host = args[1]

    os.chdir(ROOT)
    try:
        server = http.server.ThreadingHTTPServer((host, port), SPARequestHandler)
    except OSError as err:
        sys.stderr.write(
            "Could not bind %s:%d (%s).\n"
            "Stop any plain `python3 -m http.server %d` first, then run `npm run dev` again.\n"
            % (host, port, err, port)
        )
        return 1

    print("Anemoia SPA dev server: http://%s:%d/" % (host, port))
    print("Reload works on /work, /insights, /me, /contact.")
    print("(Do not use `python3 -m http.server` — it 404s on SPA routes.)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
