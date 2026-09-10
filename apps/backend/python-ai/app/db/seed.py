"""Idempotent development seed data for the CyberShield database."""
import json
import logging
import os
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.models import (
    AuditLog,
    Incident,
    LoginAttempt,
    Permission,
    Role,
    ScanHistory,
    User,
)

logger = logging.getLogger(__name__)


def seed_roles_and_permissions(session):
    """Seed default roles and permissions."""

    # Check if roles already exist
    existing_roles = session.query(Role).count()
    if existing_roles > 0:
        logger.info("Roles already exist, skipping role seeding")
        return

    # Define default permissions
    permissions_data = [
        # Dashboard permissions
        {"name": "view:dashboard", "resource": "dashboard", "action": "view", "description": "View dashboard"},

        # User management permissions
        {"name": "view:users", "resource": "users", "action": "view", "description": "View users"},
        {"name": "create:users", "resource": "users", "action": "create", "description": "Create users"},
        {"name": "update:users", "resource": "users", "action": "update", "description": "Update users"},
        {"name": "delete:users", "resource": "users", "action": "delete", "description": "Delete users"},

        # Role management permissions
        {"name": "view:roles", "resource": "roles", "action": "view", "description": "View roles"},
        {"name": "manage:roles", "resource": "roles", "action": "manage", "description": "Manage roles"},

        # Threat detection permissions
        {"name": "view:threats", "resource": "threats", "action": "view", "description": "View threats"},
        {"name": "analyze:threats", "resource": "threats", "action": "analyze", "description": "Analyze threats"},
        {"name": "respond:threats", "resource": "threats", "action": "respond", "description": "Respond to threats"},

        # Reports permissions
        {"name": "view:reports", "resource": "reports", "action": "view", "description": "View reports"},
        {"name": "create:reports", "resource": "reports", "action": "create", "description": "Create reports"},
        {"name": "export:reports", "resource": "reports", "action": "export", "description": "Export reports"},
    ]

    # Create permissions
    permissions = []
    for perm_data in permissions_data:
        permission = Permission(**perm_data)
        session.add(permission)
        permissions.append(permission)

    session.flush()
    logger.info(f"Created {len(permissions)} permissions")

    # Define default roles with their permissions
    roles_data = [
        {
            "name": "admin",
            "description": "Administrator with full access",
            "permissions": ["view:dashboard", "view:users", "create:users", "update:users", "delete:users",
                          "view:roles", "manage:roles", "view:threats", "analyze:threats", "respond:threats",
                          "view:reports", "create:reports", "export:reports"]
        },
        {
            "name": "analyst",
            "description": "Security analyst with threat analysis access",
            "permissions": ["view:dashboard", "view:threats", "analyze:threats", "respond:threats",
                          "view:reports", "create:reports", "export:reports"]
        },
        {
            "name": "viewer",
            "description": "Read-only access to dashboards and reports",
            "permissions": ["view:dashboard", "view:threats", "view:reports"]
        }
    ]

    # Create roles and assign permissions
    for role_data in roles_data:
        role = Role(name=role_data["name"], description=role_data["description"])
        session.add(role)

        # Assign permissions to role
        for perm_name in role_data["permissions"]:
            permission = session.query(Permission).filter(Permission.name == perm_name).first()
            if permission:
                role.permissions.append(permission)

    session.commit()
    logger.info(f"Created {len(roles_data)} roles")


def seed_users(session):
    """Seed one usable account for each built-in role."""

    users_data = [
        {
            "email": os.getenv("ADMIN_EMAIL", "admin@cybershield.ai"),
            "username": os.getenv("ADMIN_USERNAME", "admin"),
            "password": os.getenv("ADMIN_PASSWORD", "Admin123!"),
            "full_name": os.getenv("ADMIN_FULL_NAME", "CyberShield Administrator"),
            "role": "admin",
        },
        {
            "email": os.getenv("ANALYST_EMAIL", "analyst@cybershield.ai"),
            "username": os.getenv("ANALYST_USERNAME", "analyst"),
            "password": os.getenv("ANALYST_PASSWORD", "Analyst123!"),
            "full_name": os.getenv("ANALYST_FULL_NAME", "Maya Shrestha"),
            "role": "analyst",
        },
        {
            "email": os.getenv("VIEWER_EMAIL", "viewer@cybershield.ai"),
            "username": os.getenv("VIEWER_USERNAME", "viewer"),
            "password": os.getenv("VIEWER_PASSWORD", "Viewer123!"),
            "full_name": os.getenv("VIEWER_FULL_NAME", "Aarav Rai"),
            "role": "viewer",
        },
    ]

    roles = {role.name: role for role in session.query(Role).all()}
    created = 0
    for user_data in users_data:
        existing_user = session.query(User).filter(
            (User.email == user_data["email"]) | (User.username == user_data["username"])
        ).first()
        if existing_user:
            continue

        role = roles.get(user_data["role"])
        if role is None:
            raise RuntimeError(f"Required role is missing: {user_data['role']}")

        user = User(
            email=user_data["email"],
            username=user_data["username"],
            full_name=user_data["full_name"],
            hashed_password=get_password_hash(user_data["password"]),
            is_active=True,
            is_verified=True,
        )
        user.roles.append(role)
        session.add(user)
        created += 1

    session.commit()
    logger.info("Created %s development users", created)


def seed_operational_data(session):
    """Seed representative SOC activity without creating live auth tokens."""

    users = {user.username: user for user in session.query(User).all()}
    admin = users.get("admin")
    analyst = users.get("analyst")
    if admin is None or analyst is None:
        raise RuntimeError("Admin and analyst users are required before operational seeding")

    # Models currently use naive UTC DateTime columns, so normalize before insert.
    now = datetime.now(UTC).replace(tzinfo=None)

    if session.query(ScanHistory).count() == 0:
        session.add_all([
            ScanHistory(
                user_id=analyst.id,
                url="https://portal.cybershield.ai/login",
                is_phishing=False,
                confidence=0.97,
                risk_score=4,
                risk_level="low",
                model_version="phishing-xgb-1.0",
                scan_duration_ms=41,
                created_at=now - timedelta(hours=2),
            ),
            ScanHistory(
                user_id=analyst.id,
                url="http://secure-account-review.example/verify",
                is_phishing=True,
                confidence=0.94,
                risk_score=92,
                risk_level="critical",
                model_version="phishing-xgb-1.0",
                scan_duration_ms=55,
                created_at=now - timedelta(hours=5),
            ),
            ScanHistory(
                user_id=admin.id,
                url="https://updates.example.org/security-advisory",
                is_phishing=False,
                confidence=0.88,
                risk_score=18,
                risk_level="low",
                model_version="phishing-xgb-1.0",
                scan_duration_ms=38,
                created_at=now - timedelta(days=1),
            ),
            ScanHistory(
                user_id=analyst.id,
                url="http://invoice-payment-check.example/download",
                is_phishing=True,
                confidence=0.86,
                risk_score=84,
                risk_level="high",
                model_version="phishing-xgb-1.0",
                scan_duration_ms=63,
                created_at=now - timedelta(days=2),
            ),
        ])

    if session.query(Incident).count() == 0:
        session.add_all([
            Incident(
                title="Credential phishing campaign detected",
                description="Multiple users received links imitating the employee sign-in portal.",
                severity="critical",
                status="in_progress",
                source="phishing-detector",
                affected_systems="identity,email-gateway",
                assigned_to_id=analyst.id,
                created_by_id=admin.id,
                created_at=now - timedelta(hours=6),
                updated_at=now - timedelta(hours=1),
            ),
            Incident(
                title="Suspicious outbound network traffic",
                description="A workstation contacted a newly registered external domain.",
                severity="high",
                status="open",
                source="network-monitor",
                affected_systems="finance-ws-17",
                assigned_to_id=analyst.id,
                created_by_id=admin.id,
                created_at=now - timedelta(days=1, hours=3),
                updated_at=now - timedelta(days=1, hours=2),
            ),
            Incident(
                title="Critical dependency vulnerability remediated",
                description="The exposed package was upgraded and the service was rescanned.",
                severity="high",
                status="resolved",
                source="vulnerability-manager",
                affected_systems="public-api",
                assigned_to_id=analyst.id,
                created_by_id=admin.id,
                created_at=now - timedelta(days=4),
                updated_at=now - timedelta(days=2),
                resolved_at=now - timedelta(days=2),
            ),
            Incident(
                title="Malicious attachment quarantined",
                description="The endpoint scanner isolated a document containing a downloader.",
                severity="medium",
                status="closed",
                source="malware-classifier",
                affected_systems="hr-laptop-04",
                assigned_to_id=analyst.id,
                created_by_id=admin.id,
                created_at=now - timedelta(days=7),
                updated_at=now - timedelta(days=6),
                resolved_at=now - timedelta(days=6),
            ),
        ])

    if session.query(LoginAttempt).count() == 0:
        session.add_all([
            LoginAttempt(
                user_id=admin.id,
                email=admin.email,
                ip_address="127.0.0.1",
                user_agent="CyberShield seed data",
                success=True,
                created_at=now - timedelta(hours=8),
            ),
            LoginAttempt(
                user_id=analyst.id,
                email=analyst.email,
                ip_address="127.0.0.1",
                user_agent="CyberShield seed data",
                success=True,
                created_at=now - timedelta(hours=7),
            ),
        ])

    if session.query(AuditLog).count() == 0:
        session.add_all([
            AuditLog(
                user_id=admin.id,
                action="database.seeded",
                resource_type="system",
                details=json.dumps({"database": "cybershield", "revision": "003"}),
                ip_address="127.0.0.1",
                user_agent="CyberShield database seeder",
                created_at=now,
            ),
            AuditLog(
                user_id=analyst.id,
                action="incident.assigned",
                resource_type="incident",
                resource_id=1,
                details=json.dumps({"source": "phishing-detector", "severity": "critical"}),
                ip_address="127.0.0.1",
                user_agent="CyberShield database seeder",
                created_at=now - timedelta(hours=5),
            ),
            AuditLog(
                user_id=analyst.id,
                action="scan.completed",
                resource_type="phishing_scan",
                resource_id=2,
                details=json.dumps({"result": "phishing", "risk_score": 92}),
                ip_address="127.0.0.1",
                user_agent="CyberShield database seeder",
                created_at=now - timedelta(hours=5),
            ),
        ])

    session.commit()
    logger.info("Seeded representative scans, incidents, login attempts, and audit logs")


def run_seeds():
    """Run all seeders."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        logger.info("Starting database seeding...")
        seed_roles_and_permissions(session)
        seed_users(session)
        seed_operational_data(session)
        logger.info("Database seeding completed successfully")
    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seeds()
