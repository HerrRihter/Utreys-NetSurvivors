# The game's local server: python tools/serve.py [port]  (default 8930), then open http://127.0.0.1:<port>/live/index.html
# Python's plain `http.server` keeps a listen queue of 5, so the page's ~200 parallel texture loads get "connection refused" and the
# dev hot-reload poll can stall. This one is threaded, queues 256 connections and sends no-cache headers (edits show on reload).
import http.server, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a):
        pass                                      # quiet: the hot-reload poll would flood the console

class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8930
print(f'serving http://127.0.0.1:{port}/live/index.html')
Server(('127.0.0.1', port), Handler).serve_forever()
