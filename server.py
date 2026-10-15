#!/usr/bin/env python3
"""
AI答案採点システム (Grading App Server)
Python 3 標準ライブラリのみで動作する軽量ローカルWebサーバーです。
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # CORS & キャッシュ無効化ヘッダーを付与
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def main():
    os.chdir(DIRECTORY)
    # ポートが使用中の場合は別のポートを試行
    port = PORT
    max_tries = 10
    httpd = None

    for i in range(max_tries):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            httpd = socketserver.TCPServer(("", port), CustomHTTPRequestHandler)
            break
        except OSError:
            port += 1

    if not httpd:
        print(f"エラー: ポート {PORT}〜{port-1} がすべて使用中です。")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print(f"==================================================")
    print(f"  AI答案採点 Webアプリケーション")
    print(f"  ローカルサーバー起動完了: {url}")
    print(f"  終了するには Ctrl + C を押してください")
    print(f"==================================================")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nサーバーを停止しました。")
        httpd.server_close()

if __name__ == "__main__":
    main()
