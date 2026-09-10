import psutil
import socket
import threading
import time
from database import save_connections

PROTO = {socket.SOCK_STREAM: "TCP", socket.SOCK_DGRAM: "UDP"}

class NetworkMonitor:
    def __init__(self):
        self.running = False
        self.started_at = None
        self._lock = threading.Lock()
        self._last_snapshot = None
        try:
            self._last_net = psutil.net_io_counters(pernic=True)
        except (psutil.Error, OSError):
            self._last_net = {}
        self._last_time = time.time()
        self._last_persisted = 0.0

    def start(self):
        with self._lock:
            if not self.running:
                self.started_at = time.time()
                try:
                    self._last_net = psutil.net_io_counters(pernic=True)
                except (psutil.Error, OSError):
                    self._last_net = {}
                self._last_time = time.time()
            self.running = True

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
        try:
            current = psutil.net_io_counters(pernic=True)
            stats = psutil.net_if_stats()
        except (psutil.Error, OSError):
            current = {}
            stats = {}
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
                "is_up": bool(stats.get(name).isup) if name in stats else False
            })
        self._last_net, self._last_time = current, now
        return {
            "upload_bps": int(total_sent / dt),
            "download_bps": int(total_recv / dt),
            "interfaces": interfaces
        }

    def snapshot(self):
        with self._lock:
            running = self.running
            started_at = self.started_at
            cached = self._last_snapshot

        if not running and cached is not None:
            return {**cached, "monitoring": False, "upload_bps": 0, "download_bps": 0}

        conns = self.connections()
        if running and time.time() - self._last_persisted >= 10:
            try:
                save_connections(conns)
                self._last_persisted = time.time()
            except Exception:
                # Monitoring stays available during a temporary database outage.
                pass
        traffic = self._traffic()
        tcp = sum(x["protocol"] == "TCP" for x in conns)
        udp = sum(x["protocol"] == "UDP" for x in conns)
        established = sum(x["status"] == "ESTABLISHED" for x in conns)
        snapshot = {
            "monitoring": running,
            "uptime_seconds": int(time.time() - started_at) if running and started_at else 0,
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
        with self._lock:
            self._last_snapshot = snapshot
        return snapshot
