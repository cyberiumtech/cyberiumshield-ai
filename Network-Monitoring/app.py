from flask import Flask, render_template, jsonify, Response
import csv, io, time
from network_monitor import NetworkMonitor

app = Flask(__name__)
monitor = NetworkMonitor()

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
    app.run(host="127.0.0.1", port=5000, debug=False)
