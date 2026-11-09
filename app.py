"""愤怒的小鸟 —— Flask 后端

本地运行:
    python app.py
云端运行（腾讯云 CloudBase 云托管）由 Dockerfile 启动。
"""

import json
import os
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = Path(os.environ.get("DATA_DIR", str(BASE_DIR / "data")))
SCORE_FILE = DATA_DIR / "scores.json"
MAX_ENTRIES = 10

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

_lock = Lock()
_scores = None


def _load_scores():
    """读取排行榜。文件不存在或不可写时退化为内存存储。"""
    global _scores
    if _scores is not None:
        return _scores
    try:
        with open(SCORE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        _scores = data if isinstance(data, list) else []
    except (OSError, ValueError):
        _scores = []
    return _scores


def _save_scores(scores):
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        tmp = SCORE_FILE.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(scores, f, ensure_ascii=False, indent=2)
        os.replace(tmp, SCORE_FILE)
    except OSError:
        # 云端容器文件系统可能只读，此时仅保留内存中的榜单
        pass


@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/healthz")
def healthz():
    return jsonify(status="ok", service="angry-birds")


@app.route("/api/leaderboard")
def leaderboard():
    with _lock:
        scores = sorted(_load_scores(), key=lambda s: s.get("score", 0), reverse=True)
    return jsonify(scores[:MAX_ENTRIES])


@app.route("/api/score", methods=["POST"])
def submit_score():
    payload = request.get_json(silent=True) or {}
    try:
        score = int(payload.get("score", 0))
        level = int(payload.get("level", 1))
    except (TypeError, ValueError):
        return jsonify(error="score/level 必须是数字"), 400

    score = max(0, min(score, 999999))
    level = max(1, min(level, 99))
    name = str(payload.get("name") or "无名小鸟").strip()[:12] or "无名小鸟"

    with _lock:
        scores = _load_scores()
        scores.append({"name": name, "score": score, "level": level})
        scores.sort(key=lambda s: s.get("score", 0), reverse=True)
        del scores[MAX_ENTRIES:]
        _save_scores(scores)
        result = scores

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f" * 愤怒的小鸟服务已启动: http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
