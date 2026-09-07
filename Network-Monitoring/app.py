from flask import Flask, render_template, jsonify, Response, request
import csv, io, os
from werkzeug.exceptions import HTTPException
from network_monitor import NetworkMonitor

app = Flask(__name__)
monitor = NetworkMonitor()


@app.after_request
def add_response_headers(response):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    origin = request.headers.get("Origin", "")
    if origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    if isinstance(error, HTTPException):
        return error
    return jsonify({"ok": False, "error": "The network monitor could not read host network data."}), 500

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/status")
def status():
    return jsonify(monitor.snapshot())

@app.route("/api/start", methods=["POST"])
def start():
    monitor.start()
    return jsonify({"ok": True, "monitoring": monitor.running})

@app.route("/api/stop", methods=["POST"])
def stop():
    monitor.stop()
    return jsonify({"ok": True, "monitoring": monitor.running})

@app.route("/api/export")
def export_csv():
    data = monitor.connections()
    output = io.StringIO()
    fields = ["timestamp","protocol","local_address","remote_address","status","pid","process","bytes_sent","bytes_recv"]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for row in data:
        writer.writerow({k: row.get(k, "") for k in fields})
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=network_connections.csv"}
    )

if __name__ == "__main__":
    monitor.start()
    port = int(os.environ.get("NETWORK_MONITOR_PORT", "5003"))
    app.run(host="127.0.0.1", port=port, debug=False)
