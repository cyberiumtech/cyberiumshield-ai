from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text, Float, JSON, LargeBinary
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

# Association table for many-to-many relationship between users and roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)

# Association table for many-to-many relationship between roles and permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Password reset fields
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_token_expires = Column(DateTime, nullable=True)

    # Account lockout fields
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    refresh_tokens = relationship('RefreshToken', back_populates='user', cascade='all, delete-orphan')
    login_attempts = relationship('LoginAttempt', back_populates='user', cascade='all, delete-orphan')


class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship('User', secondary=user_roles, back_populates='roles')
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')


class Permission(Base):
    __tablename__ = 'permissions'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    resource = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')


class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = Column(String(500), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship('User', back_populates='refresh_tokens')


class LoginAttempt(Base):
    __tablename__ = 'login_attempts'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    success = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship('User', back_populates='login_attempts')


# Enums for status fields
class IncidentStatus(str, enum.Enum):
    """Incident status enum."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentSeverity(str, enum.Enum):
    """Incident severity enum."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ScanHistory(Base):
    __tablename__ = 'scan_history'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    url = Column(Text, nullable=False)
    is_phishing = Column(Boolean, nullable=False)
    confidence = Column(Float, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(20), nullable=False)
    model_version = Column(String(50), nullable=True)
    scan_duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship('User')


class Incident(Base):
    __tablename__ = 'incidents'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, default='medium')
    status = Column(String(20), nullable=False, default='open', index=True)
    source = Column(String(100), nullable=True)
    affected_systems = Column(Text, nullable=True)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    created_by = relationship('User', foreign_keys=[created_by_id])


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship('User')


class SecurityEvent(Base):
    """Normalized security-center event with the full source payload retained."""
    __tablename__ = 'security_events'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    source = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default='info', index=True)
    title = Column(String(255), nullable=False)
    payload = Column(JSON, nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NetworkMonitoringRecord(Base):
    __tablename__ = 'network_monitoring_records'

    id = Column(Integer, primary_key=True)
    protocol = Column(String(20), nullable=True, index=True)
    local_address = Column(String(255), nullable=True)
    remote_address = Column(String(255), nullable=True, index=True)
    connection_status = Column(String(40), nullable=True, index=True)
    process_id = Column(Integer, nullable=True)
    process_name = Column(String(255), nullable=True)
    bytes_sent = Column(Integer, nullable=True)
    bytes_received = Column(Integer, nullable=True)
    payload = Column(JSON, nullable=True)
    observed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class VulnerabilityAsset(Base):
    __tablename__ = 'vulnerability_assets'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False, index=True)
    owner = Column(String(255), nullable=True)
    environment = Column(String(50), nullable=False, default='Production')
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class VulnerabilityScan(Base):
    __tablename__ = 'vulnerability_scans'

    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey('vulnerability_assets.id', ondelete='CASCADE'), nullable=True, index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(40), nullable=True, index=True)
    ports = Column(Text, nullable=True)
    open_ports = Column(JSON, nullable=True)


class VulnerabilityFinding(Base):
    __tablename__ = 'vulnerability_findings'

    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey('vulnerability_assets.id', ondelete='SET NULL'), nullable=True, index=True)
    scan_id = Column(Integer, ForeignKey('vulnerability_scans.id', ondelete='SET NULL'), nullable=True, index=True)
    cve = Column(String(64), nullable=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=True)
    service = Column(String(255), nullable=True)
    banner = Column(Text, nullable=True)
    severity = Column(String(20), nullable=True, index=True)
    cvss = Column(Float, nullable=False, default=0)
    kev = Column(Boolean, nullable=False, default=False)
    status = Column(String(40), nullable=False, default='Open', index=True)
    due_date = Column(DateTime, nullable=True)
    assigned_to = Column(String(255), nullable=True)
    remediation = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(100), nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ThreatIntelligenceObservation(Base):
    __tablename__ = 'threat_intelligence_observations'

    id = Column(Integer, primary_key=True)
    indicator = Column(String(2048), nullable=False)
    indicator_type = Column(String(50), nullable=False, index=True)
    risk_score = Column(Integer, nullable=False)
    verdict = Column(String(30), nullable=False, index=True)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class DetectorScanMixin:
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    verdict = Column(String(40), nullable=False, index=True)
    score = Column(Float, nullable=False, default=0)
    confidence = Column(Float, nullable=True)
    model_name = Column(String(255), nullable=True)
    model_version = Column(String(100), nullable=True)
    result = Column(JSON, nullable=False)
    scanned_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class MalwareScan(DetectorScanMixin, Base):
    __tablename__ = 'malware_scans'
    filename = Column(String(512), nullable=False, index=True)
    sha256 = Column(String(64), nullable=True, index=True)


class PhishingScan(DetectorScanMixin, Base):
    __tablename__ = 'phishing_scans'
    url = Column(Text, nullable=False)


class EmailSpamScan(DetectorScanMixin, Base):
    __tablename__ = 'email_spam_scans'
    sender = Column(String(512), nullable=True)
    subject = Column(String(512), nullable=True)


class IncidentFieldNote(Base):
    __tablename__ = 'incident_field_notes'

    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    author = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False, index=True)
    status = Column(String(30), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    tags = Column(JSON, nullable=False)
    affected_systems = Column(JSON, nullable=False)
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    solutions = relationship('IncidentSolution', back_populates='incident', cascade='all, delete-orphan')


class IncidentSolution(Base):
    __tablename__ = 'incident_solutions'

    id = Column(String(64), primary_key=True)
    incident_id = Column(String(64), ForeignKey('incident_field_notes.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    author = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    helpful_count = Column(Integer, nullable=False, default=0)
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    incident = relationship('IncidentFieldNote', back_populates='solutions')


class IncidentAnalyticsSnapshot(Base):
    __tablename__ = 'incident_analytics_snapshots'

    id = Column(Integer, primary_key=True)
    metrics = Column(JSON, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class ModelArtifact(Base):
    """Versioned model artifact. Binary content is optional for externally stored models."""
    __tablename__ = 'model_artifacts'

    id = Column(Integer, primary_key=True)
    domain = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    version = Column(String(100), nullable=False)
    framework = Column(String(100), nullable=True)
    checksum_sha256 = Column(String(64), nullable=False, unique=True)
    content_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=False)
    artifact = Column(LargeBinary(length=4294967295), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
