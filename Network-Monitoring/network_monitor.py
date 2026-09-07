import psutil
import socket
import threading
import time
from collections import defaultdict

PROTO = {socket.SOCK_STREAM: "TCP", socket.SOCK_DGRAM: "UDP"}

class NetworkMonitor:
    def __init__(self):
        self.running = False
        self.started_at = None
        self._lock = threading.Lock()
        self._previous = {}
        self._rates = defaultdict(lambda: {"sent": 0, "recv": 0})
        self._last_net = psutil.net_io_counters(pernic=True)
        self._last_time = time.time()

    def start(self):
        with self._lock:
            self.running = True
            if self.started_at is None:
                self.started_at = time.time()

    def stop(self):
        with self._lock:
            self.running = False

    @staticmethod
    def _addr(addr):
        if not addr:
            return ""
        return f"{addr.ip}:{addr.port}" if hasattr(addr, "ip") else str(addr)

    @staticmethod
    def _process(pid):
        if not pid:
            return "", ""
        try:
            p = psutil.Process(pid)
            return p.name(), p.exe()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, OSError):
            return "Access denied/ended", ""

    def connections(self):
        rows = []
        try:
            conns = psutil.net_connections(kind="inet")
        except psutil.Error:
            conns = []

        for c in conns:
            proto = PROTO.get(c.type, str(c.type))
            process, _ = self._process(c.pid)
            remote = self._addr(c.raddr)
            local = self._addr(c.laddr)
            rows.append({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "protocol": proto,
                "local_address": local,
                "remote_address": remote,
                "status": c.status or ("LISTEN" if c.type == socket.SOCK_STREAM and not c.raddr else ""),
                "pid": c.pid or "",
                "process": process,
                "bytes_sent": "",
                "bytes_recv": "",
            })
        rows.sort(key=lambda x: (x["process"], x["remote_address"]))
        return rows

    def _traffic(self):
        now = time.time()
        current = psutil.net_io_counters(pernic=True)
        dt = max(now - self._last_time, 0.001)
        total_sent = total_recv = 0
        interfaces = []
        for name, stat in current.items():
            old = self._last_net.get(name)
            if old:
                total_sent += max(0, stat.bytes_sent - old.bytes_sent)
                total_recv += max(0, stat.bytes_recv - old.bytes_recv)
            interfaces.append({
                "name": name,
                "bytes_sent": stat.bytes_sent,
                "bytes_recv": stat.bytes_recv,
                "is_up": bool(psutil.net_if_stats().get(name).isup) if name in psutil.net_if_stats() else False
            })
        self._last_net, self._last_time = current, now
        return {
            "upload_bps": int(total_sent / dt),
            "download_bps": int(total_recv / dt),
            "interfaces": interfaces
        }

    def snapshot(self):
        conns = self.connections()
        traffic = self._traffic()
        tcp = sum(x["protocol"] == "TCP" for x in conns)
        udp = sum(x["protocol"] == "UDP" for x in conns)
        established = sum(x["status"] == "ESTABLISHED" for x in conns)
        return {
            "monitoring": self.running,
            "uptime_seconds": int(time.time() - self.started_at) if self.started_at else 0,
            "connection_count": len(conns),
            "tcp": tcp,
            "udp": udp,
            "established": established,
            "upload_bps": traffic["upload_bps"],
            "download_bps": traffic["download_bps"],
            "interfaces": traffic["interfaces"],
            "connections": conns,
            "updated": time.strftime("%H:%M:%S")
        }
