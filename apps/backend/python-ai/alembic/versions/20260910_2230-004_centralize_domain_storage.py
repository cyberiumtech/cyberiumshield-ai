"""Centralize detector, monitoring, incident, and model storage.

Revision ID: 004
Revises: 003
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def _timestamps():
    return [
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    ]


def upgrade() -> None:
    op.create_table('security_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('source', sa.String(100), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False, server_default='info'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        *_timestamps(),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'))
    for column in ('user_id', 'event_type', 'source', 'severity', 'occurred_at'):
        op.create_index(f'ix_security_events_{column}', 'security_events', [column])

    op.create_table('network_monitoring_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('protocol', sa.String(20)),
        sa.Column('local_address', sa.String(255)),
        sa.Column('remote_address', sa.String(255)),
        sa.Column('connection_status', sa.String(40)),
        sa.Column('process_id', sa.Integer()),
        sa.Column('process_name', sa.String(255)),
        sa.Column('bytes_sent', sa.Integer()),
        sa.Column('bytes_received', sa.Integer()),
        sa.Column('payload', sa.JSON()),
        sa.Column('observed_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))
    for column in ('protocol', 'remote_address', 'connection_status', 'observed_at'):
        op.create_index(f'ix_network_monitoring_records_{column}', 'network_monitoring_records', [column])

    op.create_table('vulnerability_assets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.String(255), nullable=False),
        sa.Column('owner', sa.String(255)),
        sa.Column('environment', sa.String(50), nullable=False, server_default='Production'),
        sa.Column('notes', sa.Text()), *_timestamps())
    op.create_index('ix_vulnerability_assets_address', 'vulnerability_assets', ['address'])

    op.create_table('vulnerability_scans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('asset_id', sa.Integer()), sa.Column('started_at', sa.DateTime()),
        sa.Column('finished_at', sa.DateTime()), sa.Column('status', sa.String(40)),
        sa.Column('ports', sa.Text()), sa.Column('open_ports', sa.JSON()),
        sa.ForeignKeyConstraint(['asset_id'], ['vulnerability_assets.id'], ondelete='CASCADE'))
    op.create_index('ix_vulnerability_scans_asset_id', 'vulnerability_scans', ['asset_id'])
    op.create_index('ix_vulnerability_scans_status', 'vulnerability_scans', ['status'])

    op.create_table('vulnerability_findings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('asset_id', sa.Integer()), sa.Column('scan_id', sa.Integer()),
        sa.Column('cve', sa.String(64)), sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text()), sa.Column('port', sa.Integer()),
        sa.Column('protocol', sa.String(20)), sa.Column('service', sa.String(255)),
        sa.Column('banner', sa.Text()), sa.Column('severity', sa.String(20)),
        sa.Column('cvss', sa.Float(), nullable=False, server_default='0'),
        sa.Column('kev', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('status', sa.String(40), nullable=False, server_default='Open'),
        sa.Column('due_date', sa.DateTime()), sa.Column('assigned_to', sa.String(255)),
        sa.Column('remediation', sa.Text()), sa.Column('notes', sa.Text()),
        sa.Column('source', sa.String(100)), sa.Column('payload', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['asset_id'], ['vulnerability_assets.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['scan_id'], ['vulnerability_scans.id'], ondelete='SET NULL'))
    for column in ('asset_id', 'scan_id', 'cve', 'severity', 'status', 'created_at'):
        op.create_index(f'ix_vulnerability_findings_{column}', 'vulnerability_findings', [column])

    op.create_table('vulnerability_scan_findings',
        sa.Column('id', sa.Integer(), primary_key=True), sa.Column('asset_id', sa.Integer()),
        sa.Column('scan_id', sa.Integer()), sa.Column('port', sa.Integer()),
        sa.Column('protocol', sa.String(20)), sa.Column('service', sa.String(255)),
        sa.Column('banner', sa.Text()), sa.Column('risk_score', sa.Float(), nullable=False, server_default='0'),
        sa.Column('risk_level', sa.String(20), nullable=False, server_default='Info'),
        sa.Column('detected_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['asset_id'], ['vulnerability_assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scan_id'], ['vulnerability_scans.id'], ondelete='CASCADE'))
    for column in ('asset_id', 'scan_id', 'risk_level', 'detected_at'):
        op.create_index(f'ix_vulnerability_scan_findings_{column}', 'vulnerability_scan_findings', [column])

    op.create_table('threat_intelligence_observations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('indicator', sa.String(2048), nullable=False),
        sa.Column('indicator_type', sa.String(50), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('verdict', sa.String(30), nullable=False),
        sa.Column('result', sa.JSON(), nullable=False), *_timestamps())
    for column in ('indicator_type', 'verdict', 'created_at'):
        op.create_index(f'ix_threat_intelligence_observations_{column}', 'threat_intelligence_observations', [column])

    detector_specs = {
        'malware_scans': [sa.Column('filename', sa.String(512), nullable=False), sa.Column('sha256', sa.String(64))],
        'phishing_scans': [sa.Column('url', sa.Text(), nullable=False)],
        'email_spam_scans': [sa.Column('sender', sa.String(512)), sa.Column('subject', sa.String(512))],
    }
    for table, domain_columns in detector_specs.items():
        op.create_table(table,
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer()), *domain_columns,
            sa.Column('verdict', sa.String(40), nullable=False),
            sa.Column('score', sa.Float(), nullable=False, server_default='0'),
            sa.Column('confidence', sa.Float()), sa.Column('model_name', sa.String(255)),
            sa.Column('model_version', sa.String(100)), sa.Column('result', sa.JSON(), nullable=False),
            sa.Column('scanned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'))
        for column in ('user_id', 'verdict', 'scanned_at'):
            op.create_index(f'ix_{table}_{column}', table, [column])
    op.create_index('ix_malware_scans_filename', 'malware_scans', ['filename'])
    op.create_index('ix_malware_scans_sha256', 'malware_scans', ['sha256'])

    op.create_table('incident_field_notes',
        sa.Column('id', sa.String(64), primary_key=True), sa.Column('user_id', sa.Integer()),
        sa.Column('title', sa.String(255), nullable=False), sa.Column('description', sa.Text(), nullable=False),
        sa.Column('author', sa.String(255), nullable=False), sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('status', sa.String(30), nullable=False), sa.Column('category', sa.String(100), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=False), sa.Column('affected_systems', sa.JSON(), nullable=False),
        sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'))
    for column in ('user_id', 'severity', 'status', 'category', 'created_at'):
        op.create_index(f'ix_incident_field_notes_{column}', 'incident_field_notes', [column])

    op.create_table('incident_solutions',
        sa.Column('id', sa.String(64), primary_key=True), sa.Column('incident_id', sa.String(64), nullable=False),
        sa.Column('user_id', sa.Integer()), sa.Column('author', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False), sa.Column('helpful_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['incident_id'], ['incident_field_notes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'))
    op.create_index('ix_incident_solutions_incident_id', 'incident_solutions', ['incident_id'])
    op.create_index('ix_incident_solutions_user_id', 'incident_solutions', ['user_id'])

    op.create_table('incident_analytics_snapshots',
        sa.Column('id', sa.Integer(), primary_key=True), sa.Column('metrics', sa.JSON(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))
    op.create_index('ix_incident_analytics_snapshots_generated_at', 'incident_analytics_snapshots', ['generated_at'])

    op.create_table('model_artifacts',
        sa.Column('id', sa.Integer(), primary_key=True), sa.Column('domain', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False), sa.Column('version', sa.String(100), nullable=False),
        sa.Column('framework', sa.String(100)), sa.Column('checksum_sha256', sa.String(64), nullable=False, unique=True),
        sa.Column('content_type', sa.String(100)), sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('artifact', mysql.LONGBLOB()), sa.Column('metadata_json', sa.JSON()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')), *_timestamps())
    for column in ('domain', 'name', 'is_active'):
        op.create_index(f'ix_model_artifacts_{column}', 'model_artifacts', [column])


def downgrade() -> None:
    for table in (
        'model_artifacts', 'incident_analytics_snapshots', 'incident_solutions', 'incident_field_notes',
        'email_spam_scans', 'phishing_scans', 'malware_scans', 'threat_intelligence_observations',
        'vulnerability_scan_findings', 'vulnerability_findings', 'vulnerability_scans', 'vulnerability_assets',
        'network_monitoring_records', 'security_events'):
        op.drop_table(table)
