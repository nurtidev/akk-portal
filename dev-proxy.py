#!/usr/bin/env python3
"""
Локальный dev-прокси для связки прототипа akk-railway с credit-backend (Go auth).

Зачем: прототип — статический index.html. Чтобы он мог логиниться в реальный
бэкенд без проблем с CORS, поднимаем same-origin прокси:
  - всё под /api/*           -> форвардится на credit-backend (AKK_BACKEND)
  - / и /index.html          -> отдаётся index.html с подключённым слоем авторизации
  - /__auth-integration.js   -> слой реальной авторизации
  - остальное                -> статика из папки прототипа

index.html на диске НЕ меняется — интеграционный <script> внедряется на лету.

Запуск:
  AKK_BACKEND=http://localhost:3110 python3 dev-proxy.py
  AKK_BACKEND=https://<dev-host> AKK_PORT=8080 python3 dev-proxy.py

Переменные окружения:
  AKK_BACKEND  базовый URL credit-backend (по умолчанию http://localhost:3110)
  AKK_PORT     порт локального прокси (по умолчанию 8080)
Никаких секретов здесь нет — ИИН/пароль вводятся в UI в рантайме.
"""
import os
import sys
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.environ.get("AKK_BACKEND", "http://localhost:3110").rstrip("/")
PORT = int(os.environ.get("AKK_PORT", "8080"))

# Заголовки, которые нельзя пробрасывать как есть (hop-by-hop / пересчитываемые).
HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length",
    "accept-encoding",  # просим backend без gzip, чтобы не разбирать сжатие
}

INJECT = (
    "\n<script>window.AKK_API_BASE='/api/v1/auth';"
    "window.AKK_BACKEND_LABEL=" + repr(BACKEND) + ";</script>\n"
    "<script src=\"/__auth-integration.js\"></script>\n"
)


class Handler(BaseHTTPRequestHandler):
    server_version = "akk-dev-proxy/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("[proxy] " + (fmt % args) + "\n")

    # --- проксирование API ---
    def _proxy(self):
        target = BACKEND + self.path
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length) if length else None

        fwd = {}
        for k, v in self.headers.items():
            if k.lower() in HOP_BY_HOP:
                continue
            fwd[k] = v

        req = urllib.request.Request(target, data=body, method=self.command)
        for k, v in fwd.items():
            req.add_header(k, v)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                self._relay(resp.status, resp.headers, resp.read())
        except urllib.error.HTTPError as e:
            # backend ответил ошибкой (401/429/...) — пробрасываем как есть
            self._relay(e.code, e.headers, e.read())
        except Exception as e:  # noqa: BLE001
            msg = ("proxy error -> %s: %s" % (target, e)).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def _relay(self, status, headers, payload):
        self.send_response(status)
        for k, v in headers.items():
            if k.lower() in HOP_BY_HOP or k.lower() == "content-length":
                continue
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if payload:
            self.wfile.write(payload)

    # --- статика ---
    def _serve_file(self, path, inject=False):
        try:
            with open(path, "rb") as f:
                data = f.read()
        except FileNotFoundError:
            self.send_error(404, "Not found")
            return
        if inject and b"</body>" in data:
            data = data.replace(b"</body>", INJECT.encode("utf-8") + b"</body>", 1)
        ctype = self._ctype(path)
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    @staticmethod
    def _ctype(path):
        if path.endswith(".html"):
            return "text/html; charset=utf-8"
        if path.endswith(".js"):
            return "application/javascript; charset=utf-8"
        if path.endswith(".css"):
            return "text/css; charset=utf-8"
        if path.endswith((".jpg", ".jpeg")):
            return "image/jpeg"
        if path.endswith(".png"):
            return "image/png"
        if path.endswith(".svg"):
            return "image/svg+xml"
        return "application/octet-stream"

    def _route(self):
        p = self.path.split("?", 1)[0]
        if p.startswith("/api/"):
            return self._proxy()
        if p in ("/", "/index.html"):
            return self._serve_file(os.path.join(ROOT, "index.html"), inject=True)
        # защита от выхода за пределы папки
        rel = p.lstrip("/")
        full = os.path.normpath(os.path.join(ROOT, rel))
        if not full.startswith(ROOT):
            return self.send_error(403, "Forbidden")
        return self._serve_file(full)

    def do_GET(self):
        self._route()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        self.send_error(405, "Method not allowed")

    def do_PUT(self):
        self.do_POST()

    def do_DELETE(self):
        self.do_POST()

    def do_OPTIONS(self):
        # same-origin: preflight обычно не нужен, но отвечаем дружелюбно
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()


def main():
    print("=" * 60)
    print(" akk-railway  <->  credit-backend  (local dev proxy)")
    print("=" * 60)
    print(" Прототип:   http://localhost:%d" % PORT)
    print(" Backend:    %s" % BACKEND)
    print(" Auth base:  /api/v1/auth  ->  %s/api/v1/auth" % BACKEND)
    print(" Ctrl+C для остановки")
    print("=" * 60)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[proxy] stopped")
