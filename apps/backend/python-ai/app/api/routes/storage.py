"""Central persistence API for CyberShield domain records."""
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies.auth import get_optional_user
from app.db.models import (
    EmailSpamScan, IncidentAnalyticsSnapshot, IncidentFieldNote, IncidentSolution,
    MalwareScan, NetworkMonitoringRecord, PhishingScan, SecurityEvent,
    ThreatIntelligenceObservation, User,
)
from app.db.session import get_db

router = APIRouter()
DetectorKind = Literal['malware', 'phishing', 'email-spam']


class DetectorRecord(BaseModel):
    result: dict[str, Any]


class SecurityEventInput(BaseModel):
    event_type: str = Field(min_length=1, max_length=100)
    source: str = Field(min_length=1, max_length=100)
    severity: str = Field(default='info', max_length=20)
    title: str = Field(min_length=1, max_length=255)
    payload: Optional[dict[str, Any]] = None
    occurred_at: Optional[datetime] = None


class NetworkRecordInput(BaseModel):
    protocol: Optional[str] = None
    local_address: Optional[str] = None
    remote_address: Optional[str] = None
    status: Optional[str] = None
    pid: Optional[int] = None
    process: Optional[str] = None
    bytes_sent: Optional[int] = None
    bytes_recv: Optional[int] = None
    payload: Optional[dict[str, Any]] = None
    observed_at: Optional[datetime] = None


class IncidentInput(BaseModel):
    id: Optional[str] = Field(default=None, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    author: str = Field(min_length=1, max_length=255)
    severity: str = Field(min_length=1, max_length=20)
    status: str = Field(min_length=1, max_length=30)
    category: str = Field(min_length=1, max_length=100)
    tags: list[str] = Field(default_factory=list)
    affectedSystems: list[str] = Field(default_factory=list)
    demo: bool = False
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class IncidentPatch(BaseModel):
    severity: Optional[str] = Field(default=None, max_length=20)
    status: Optional[str] = Field(default=None, max_length=30)
    tags: Optional[list[str]] = None
    affectedSystems: Optional[list[str]] = None


class SolutionInput(BaseModel):
    id: Optional[str] = Field(default=None, max_length=64)
    author: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    helpfulCount: int = Field(default=0, ge=0)
    demo: bool = False
    createdAt: Optional[datetime] = None


def _dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00')).replace(tzinfo=None)
        except ValueError:
            pass
    return datetime.utcnow()


def _scan_model(kind: DetectorKind):
    return {'malware': MalwareScan, 'phishing': PhishingScan, 'email-spam': EmailSpamScan}[kind]


def _scan_to_dict(row: Any) -> dict[str, Any]:
    result = dict(row.result or {})
    result['id'] = str(row.id)
    if 'scannedAt' not in result:
        result['scannedAt'] = row.scanned_at.isoformat() + 'Z'
    return result


@router.get('/scans/{kind}')
def list_scans(kind: DetectorKind, limit: int = Query(25, ge=1, le=200), db: Session = Depends(get_db)):
    model = _scan_model(kind)
    return [_scan_to_dict(row) for row in db.query(model).order_by(model.id.desc()).limit(limit).all()]


@router.post('/scans/{kind}', status_code=status.HTTP_201_CREATED)
def create_scan(kind: DetectorKind, body: DetectorRecord, current_user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    value = body.result
    common = dict(
        user_id=current_user.id if current_user else None,
        verdict=str(value.get('classification') or value.get('prediction') or value.get('verdict') or 'unknown')[:40],
        score=float(value.get('threat_score') or value.get('score') or value.get('phishing_probability', 0) * 100 or 0),
        confidence=float(value.get('confidence') or 0),
        model_name=str(value.get('model') or value.get('method') or '')[:255] or None,
        model_version=str(value.get('model_version') or '')[:100] or None,
        result=value,
        scanned_at=_dt(value.get('scannedAt') or value.get('timestamp')),
    )
    if kind == 'malware':
        info = value.get('file_info') if isinstance(value.get('file_info'), dict) else {}
        row = MalwareScan(filename=str(value.get('filename') or 'unknown')[:512], sha256=info.get('sha256'), **common)
    elif kind == 'phishing':
        row = PhishingScan(url=str(value.get('url') or ''), **common)
    else:
        row = EmailSpamScan(sender=str(value.get('sender') or '')[:512], subject=str(value.get('subject') or '')[:512], **common)
    db.add(row); db.commit(); db.refresh(row)
    return _scan_to_dict(row)


@router.delete('/scans/{kind}', status_code=status.HTTP_204_NO_CONTENT)
def clear_scans(kind: DetectorKind, db: Session = Depends(get_db)):
    db.query(_scan_model(kind)).delete(synchronize_session=False); db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post('/security-events', status_code=status.HTTP_201_CREATED)
def create_security_event(body: SecurityEventInput, current_user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    row = SecurityEvent(user_id=current_user.id if current_user else None, event_type=body.event_type,
        source=body.source, severity=body.severity, title=body.title, payload=body.payload,
        occurred_at=body.occurred_at or datetime.utcnow())
    db.add(row); db.commit(); db.refresh(row)
    return {'id': row.id, 'created_at': row.created_at}


@router.get('/security-events')
def list_security_events(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    rows = db.query(SecurityEvent).order_by(SecurityEvent.occurred_at.desc()).limit(limit).all()
    return [{'id': r.id, 'event_type': r.event_type, 'source': r.source, 'severity': r.severity,
             'title': r.title, 'payload': r.payload, 'occurred_at': r.occurred_at} for r in rows]


@router.post('/network', status_code=status.HTTP_201_CREATED)
def create_network_record(body: NetworkRecordInput, db: Session = Depends(get_db)):
    row = NetworkMonitoringRecord(protocol=body.protocol, local_address=body.local_address,
        remote_address=body.remote_address, connection_status=body.status, process_id=body.pid,
        process_name=body.process, bytes_sent=body.bytes_sent, bytes_received=body.bytes_recv,
        payload=body.payload, observed_at=body.observed_at or datetime.utcnow())
    db.add(row); db.commit(); db.refresh(row)
    return {'id': row.id, 'observed_at': row.observed_at}


@router.get('/threat-intelligence')
def list_threat_observations(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    rows = db.query(ThreatIntelligenceObservation).order_by(ThreatIntelligenceObservation.id.desc()).limit(limit).all()
    output = []
    for row in rows:
        result = dict(row.result or {})
        result['id'] = row.id
        output.append(result)
    return output


@router.post('/threat-intelligence', status_code=status.HTTP_201_CREATED)
def create_threat_observation(body: dict[str, Any], db: Session = Depends(get_db)):
    row = ThreatIntelligenceObservation(indicator=str(body.get('indicator') or '')[:2048],
        indicator_type=str(body.get('indicatorType') or 'unknown')[:50], risk_score=int(body.get('riskScore') or 0),
        verdict=str(body.get('verdict') or 'unknown')[:30], result=body, created_at=_dt(body.get('checkedAt')))
    db.add(row); db.commit(); db.refresh(row)
    return {'id': row.id}


def _solution(row: IncidentSolution) -> dict[str, Any]:
    return {'id': row.id, 'author': row.author, 'body': row.body,
            'createdAt': row.created_at.isoformat() + 'Z', 'helpfulCount': row.helpful_count,
            'helpfulByBrowser': False, 'demo': row.is_demo}


def _incident(row: IncidentFieldNote) -> dict[str, Any]:
    return {'id': row.id, 'title': row.title, 'description': row.description, 'author': row.author,
            'severity': row.severity, 'status': row.status, 'category': row.category,
            'tags': row.tags or [], 'affectedSystems': row.affected_systems or [],
            'createdAt': row.created_at.isoformat() + 'Z', 'updatedAt': row.updated_at.isoformat() + 'Z',
            'solutions': [_solution(item) for item in sorted(row.solutions, key=lambda x: x.created_at)],
            'demo': row.is_demo}


@router.get('/incidents')
def list_incidents(db: Session = Depends(get_db)):
    rows = db.query(IncidentFieldNote).options(joinedload(IncidentFieldNote.solutions)).order_by(IncidentFieldNote.updated_at.desc()).all()
    return [_incident(row) for row in rows]


@router.post('/incidents', status_code=status.HTTP_201_CREATED)
def create_incident(body: IncidentInput, current_user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    incident_id = body.id or f'INC-{uuid4().hex[:12].upper()}'
    if db.get(IncidentFieldNote, incident_id):
        raise HTTPException(status_code=409, detail='Incident already exists')
    row = IncidentFieldNote(id=incident_id, user_id=current_user.id if current_user else None,
        title=body.title.strip(), description=body.description.strip(), author=body.author.strip(),
        severity=body.severity, status=body.status, category=body.category,
        tags=[x.strip() for x in body.tags if x.strip()],
        affected_systems=[x.strip() for x in body.affectedSystems if x.strip()], is_demo=body.demo,
        created_at=body.createdAt or datetime.utcnow(), updated_at=body.updatedAt or datetime.utcnow())
    db.add(row); db.commit(); db.refresh(row)
    return _incident(row)


@router.patch('/incidents/{incident_id}')
def update_incident(incident_id: str, body: IncidentPatch, db: Session = Depends(get_db)):
    row = db.get(IncidentFieldNote, incident_id)
    if not row: raise HTTPException(status_code=404, detail='Incident not found')
    for field in ('severity', 'status'):
        value = getattr(body, field)
        if value is not None: setattr(row, field, value)
    if body.tags is not None: row.tags = body.tags
    if body.affectedSystems is not None: row.affected_systems = body.affectedSystems
    row.updated_at = datetime.utcnow(); db.commit(); db.refresh(row)
    return _incident(row)


@router.post('/incidents/{incident_id}/solutions', status_code=status.HTTP_201_CREATED)
def create_solution(incident_id: str, body: SolutionInput, current_user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    incident = db.get(IncidentFieldNote, incident_id)
    if not incident: raise HTTPException(status_code=404, detail='Incident not found')
    row = IncidentSolution(id=body.id or f'SOL-{uuid4().hex[:12].upper()}', incident_id=incident_id,
        user_id=current_user.id if current_user else None, author=body.author.strip(), body=body.body.strip(),
        helpful_count=body.helpfulCount, is_demo=body.demo, created_at=body.createdAt or datetime.utcnow())
    incident.updated_at = datetime.utcnow(); db.add(row); db.commit(); db.refresh(row)
    return _solution(row)


@router.post('/incidents/{incident_id}/solutions/{solution_id}/helpful')
def mark_helpful(incident_id: str, solution_id: str, db: Session = Depends(get_db)):
    row = db.query(IncidentSolution).filter_by(id=solution_id, incident_id=incident_id).first()
    if not row: raise HTTPException(status_code=404, detail='Solution not found')
    row.helpful_count += 1; db.commit()
    return {'helpfulCount': row.helpful_count}


@router.post('/incident-analytics', status_code=status.HTTP_201_CREATED)
def store_analytics(metrics: dict[str, Any], db: Session = Depends(get_db)):
    row = IncidentAnalyticsSnapshot(metrics=metrics); db.add(row); db.commit(); db.refresh(row)
    return {'id': row.id, 'generated_at': row.generated_at}
