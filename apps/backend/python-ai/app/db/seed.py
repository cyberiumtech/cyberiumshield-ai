"""Database seeding for initial data."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import User, Role, Permission, user_roles
from app.core.security import get_password_hash
from app.core.config import settings
import logging

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


def seed_admin_user(session):
    """Seed admin user from environment variables."""

    # Get admin credentials from env
    admin_email = os.getenv("ADMIN_EMAIL", "admin@cyberiumshield.local")
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_full_name = os.getenv("ADMIN_FULL_NAME", "System Administrator")

    # Check if admin already exists
    existing_admin = session.query(User).filter(
        (User.email == admin_email) | (User.username == admin_username)
    ).first()

    if existing_admin:
        logger.info(f"Admin user already exists: {existing_admin.email}")
        return

    # Get admin role
    admin_role = session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        logger.error("Admin role not found. Run seed_roles_and_permissions first.")
        return

    # Create admin user
    admin_user = User(
        email=admin_email,
        username=admin_username,
        full_name=admin_full_name,
        hashed_password=get_password_hash(admin_password),
        is_active=True,
        is_verified=True,
    )

    admin_user.roles.append(admin_role)
    session.add(admin_user)
    session.commit()

    logger.info(f"Created admin user: {admin_email} / {admin_username}")
    logger.info(f"Admin password: {admin_password}")


def run_seeds():
    """Run all seeders."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        logger.info("Starting database seeding...")
        seed_roles_and_permissions(session)
        seed_admin_user(session)
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
