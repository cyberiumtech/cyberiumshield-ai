# Real Data Implementation Guide

This document contains all the code needed to wire the frontend to real backend data.

## Database Models Created ✅

Added to `app/db/models.py`:
- `ScanHistory` - Track all phishing scans
- `Incident` - Security incidents (CRUD)
- `AuditLog` - Audit trail for all actions

Migration: `003_add_operations_tables.py`

Run: `alembic upgrade head`

---

## 1. Dashboard API - Real Stats

### File: `app/api/routes/dashboard.py`

```python
"""Dashboard API endpoints with real database statistics."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Dict
import logging

from app.db.session import get_db
from app.db.models import User, ScanHistory, Incident, LoginAttempt
from app.api.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get real-time dashboard statistics."""
    
    # User count
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    
    # Scan statistics
    total_scans = db.query(func.count(ScanHistory.id)).scalar()
    threats_detected = db.query(func.count(ScanHistory.id)).filter(
        ScanHistory.is_phishing == True
    ).scalar()
    
    # Scans today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    scans_today = db.query(func.count(ScanHistory.id)).filter(
        ScanHistory.created_at >= today_start
    ).scalar()
    
    # Open incidents
    open_incidents = db.query(func.count(Incident.id)).filter(
        Incident.status.in_(['open', 'in_progress'])
    ).scalar()
    
    # Critical incidents
    critical_incidents = db.query(func.count(Incident.id)).filter(
        and_(
            Incident.severity == 'critical',
            Incident.status != 'closed'
        )
    ).scalar()
    
    # Recent login activity (last 24h)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_logins = db.query(func.count(LoginAttempt.id)).filter(
        and_(
            LoginAttempt.created_at >= yesterday,
            LoginAttempt.success == True
        )
    ).scalar()
    
    # Failed logins (last 24h)
    failed_logins = db.query(func.count(LoginAttempt.id)).filter(
        and_(
            LoginAttempt.created_at >= yesterday,
            LoginAttempt.success == False
        )
    ).scalar()
    
    return {
        "users": {
            "total": total_users or 0,
            "active": active_users or 0,
            "inactive": (total_users or 0) - (active_users or 0)
        },
        "scans": {
            "total": total_scans or 0,
            "today": scans_today or 0,
            "threats_detected": threats_detected or 0,
            "safe_urls": (total_scans or 0) - (threats_detected or 0)
        },
        "incidents": {
            "open": open_incidents or 0,
            "critical": critical_incidents or 0
        },
        "activity": {
            "successful_logins_24h": recent_logins or 0,
            "failed_logins_24h": failed_logins or 0
        }
    }


@router.get("/scans-over-time")
async def get_scans_over_time(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get scan statistics over time for charts."""
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Query scans grouped by date
    results = db.query(
        func.date(ScanHistory.created_at).label('date'),
        func.count(ScanHistory.id).label('total_scans'),
        func.sum(func.cast(ScanHistory.is_phishing, sa.Integer)).label('threats_detected')
    ).filter(
        ScanHistory.created_at >= start_date
    ).group_by(
        func.date(ScanHistory.created_at)
    ).order_by(
        func.date(ScanHistory.created_at)
    ).all()
    
    # Format for frontend
    data = []
    for row in results:
        data.append({
            "date": row.date.isoformat() if row.date else None,
            "total_scans": row.total_scans or 0,
            "threats_detected": row.threats_detected or 0,
            "safe_urls": (row.total_scans or 0) - (row.threats_detected or 0)
        })
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "data": data
    }


@router.get("/recent-scans")
async def get_recent_scans(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent phishing scans."""
    
    scans = db.query(ScanHistory).order_by(
        ScanHistory.created_at.desc()
    ).limit(limit).all()
    
    return [{
        "id": scan.id,
        "url": scan.url[:100],  # Truncate for display
        "is_phishing": scan.is_phishing,
        "confidence": scan.confidence,
        "risk_score": scan.risk_score,
        "risk_level": scan.risk_level,
        "created_at": scan.created_at.isoformat()
    } for scan in scans]
```

### Add to `app/api/main.py`:
```python
from app.api.routes import health, auth, users, phishing, dashboard

app.include_router(dashboard.router, prefix=f"{settings.API_V1_PREFIX}/dashboard", tags=["dashboard"])
```

---

## 2. Update Phishing Service to Log Scans

### File: `app/services/phishing_service.py` - Add logging method:

```python
def log_scan(self, db: Session, user_id: int, url: str, result: dict, duration_ms: int = None):
    """Log scan to database."""
    from app.db.models import ScanHistory
    
    scan = ScanHistory(
        user_id=user_id,
        url=url,
        is_phishing=result['is_phishing'],
        confidence=result['confidence'],
        risk_score=result['score'],
        risk_level=result['risk_level'],
        model_version=result.get('model_version'),
        scan_duration_ms=duration_ms
    )
    
    db.add(scan)
    db.commit()
    return scan
```

### Update phishing endpoint to log scans:
```python
# In app/api/routes/phishing.py - scan_url endpoint:

import time
start_time = time.time()

result = phishing_service.scan_url(request.url)

duration_ms = int((time.time() - start_time) * 1000)

# Log scan
phishing_service.log_scan(db, current_user.id, request.url, result, duration_ms)

result['url'] = request.url
result['scanned_at'] = datetime.utcnow().isoformat()

return URLScanResponse(**result)
```

---

## 3. Incidents CRUD API

### File: `app/schemas/incident.py`

```python
"""Pydantic schemas for incidents."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class IncidentCreate(BaseModel):
    """Schema for creating incident."""
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    source: Optional[str] = None
    affected_systems: Optional[str] = None
    assigned_to_id: Optional[int] = None


class IncidentUpdate(BaseModel):
    """Schema for updating incident."""
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    severity: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    status: Optional[str] = Field(None, pattern="^(open|in_progress|resolved|closed)$")
    source: Optional[str] = None
    affected_systems: Optional[str] = None
    assigned_to_id: Optional[int] = None


class IncidentResponse(BaseModel):
    """Schema for incident response."""
    id: int
    title: str
    description: Optional[str]
    severity: str
    status: str
    source: Optional[str]
    affected_systems: Optional[str]
    assigned_to_id: Optional[int]
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    
    # Populated fields
    assigned_to_username: Optional[str] = None
    created_by_username: Optional[str] = None

    model_config = {"from_attributes": True}
```

### File: `app/api/routes/incidents.py`

```python
"""Incidents CRUD API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional
from datetime import datetime
import logging

from app.db.session import get_db
from app.db.models import Incident, User, AuditLog
from app.api.dependencies.auth import get_current_user
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def log_audit(
    db: Session, user_id: int, action: str, resource_type: str, 
    resource_id: int, details: str = None
):
    """Helper to log audit trail."""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )
    db.add(audit)


@router.get("/", response_model=List[IncidentResponse])
async def list_incidents(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all incidents with optional filtering."""
    
    query = db.query(Incident)
    
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    
    incidents = query.order_by(desc(Incident.created_at)).offset(skip).limit(limit).all()
    
    # Add usernames
    result = []
    for incident in incidents:
        incident_dict = IncidentResponse.model_validate(incident).model_dump()
        
        if incident.assigned_to:
            incident_dict['assigned_to_username'] = incident.assigned_to.username
        if incident.created_by:
            incident_dict['created_by_username'] = incident.created_by.username
            
        result.append(IncidentResponse(**incident_dict))
    
    return result


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incident by ID."""
    
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident_dict = IncidentResponse.model_validate(incident).model_dump()
    if incident.assigned_to:
        incident_dict['assigned_to_username'] = incident.assigned_to.username
    if incident.created_by:
        incident_dict['created_by_username'] = incident.created_by.username
    
    return IncidentResponse(**incident_dict)


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new incident."""
    
    incident = Incident(
        **incident_data.model_dump(),
        created_by_id=current_user.id,
        status='open'
    )
    
    db.add(incident)
    db.commit()
    db.refresh(incident)
    
    # Log audit
    log_audit(db, current_user.id, "create", "incident", incident.id, 
              f"Created incident: {incident.title}")
    db.commit()
    
    logger.info(f"Incident created: {incident.id} by user {current_user.username}")
    
    return get_incident(incident.id, current_user, db)


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    incident_data: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update incident."""
    
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Track changes
    changes = []
    update_data = incident_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if value is not None:
            old_value = getattr(incident, field)
            if old_value != value:
                setattr(incident, field, value)
                changes.append(f"{field}: {old_value} -> {value}")
    
    # Update resolved_at if status changed to resolved/closed
    if incident_data.status in ['resolved', 'closed'] and not incident.resolved_at:
        incident.resolved_at = datetime.utcnow()
        changes.append(f"resolved_at set")
    
    db.commit()
    db.refresh(incident)
    
    # Log audit
    if changes:
        log_audit(db, current_user.id, "update", "incident", incident.id,
                  f"Updated: {', '.join(changes)}")
        db.commit()
    
    logger.info(f"Incident {incident_id} updated by user {current_user.username}")
    
    return get_incident(incident.id, current_user, db)


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete incident (soft delete by changing status to closed)."""
    
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Soft delete: set to closed
    incident.status = 'closed'
    incident.resolved_at = datetime.utcnow()
    db.commit()
    
    # Log audit
    log_audit(db, current_user.id, "delete", "incident", incident.id,
              f"Deleted incident: {incident.title}")
    db.commit()
    
    logger.info(f"Incident {incident_id} deleted by user {current_user.username}")
    
    return None


@router.post("/{incident_id}/assign")
async def assign_incident(
    incident_id: int,
    assigned_to_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign incident to user."""
    
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Verify assigned user exists
    assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
    if not assigned_user:
        raise HTTPException(status_code=404, detail="Assigned user not found")
    
    old_assigned = incident.assigned_to.username if incident.assigned_to else "unassigned"
    incident.assigned_to_id = assigned_to_id
    db.commit()
    
    # Log audit
    log_audit(db, current_user.id, "assign", "incident", incident.id,
              f"Assigned from {old_assigned} to {assigned_user.username}")
    db.commit()
    
    return {"message": "Incident assigned successfully"}
```

### Add to main.py:
```python
from app.api.routes import ..., incidents

app.include_router(incidents.router, prefix=f"{settings.API_V1_PREFIX}/incidents", tags=["incidents"])
```

---

## 4. Log Analysis API

### File: `app/api/routes/logs.py`

```python
"""Log analysis API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from app.db.session import get_db
from app.db.models import LoginAttempt, AuditLog, User
from app.api.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/login-attempts")
async def get_login_attempts(
    skip: int = 0,
    limit: int = 100,
    days: int = 7,
    success: Optional[bool] = None,
    email: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get login attempt logs."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(LoginAttempt).filter(LoginAttempt.created_at >= start_date)
    
    if success is not None:
        query = query.filter(LoginAttempt.success == success)
    if email:
        query = query.filter(LoginAttempt.email.like(f"%{email}%"))
    
    logs = query.order_by(desc(LoginAttempt.created_at)).offset(skip).limit(limit).all()
    
    return [{
        "id": log.id,
        "email": log.email,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent[:100] if log.user_agent else None,
        "success": log.success,
        "created_at": log.created_at.isoformat()
    } for log in logs]


@router.get("/audit")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    days: int = 30,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(AuditLog).filter(AuditLog.created_at >= start_date)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    
    logs = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()
    
    return [{
        "id": log.id,
        "user_id": log.user_id,
        "username": log.user.username if log.user else "System",
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "details": log.details,
        "created_at": log.created_at.isoformat()
    } for log in logs]


@router.get("/summary")
async def get_log_summary(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get log summary statistics."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Login stats
    total_logins = db.query(func.count(LoginAttempt.id)).filter(
        LoginAttempt.created_at >= start_date
    ).scalar()
    
    successful_logins = db.query(func.count(LoginAttempt.id)).filter(
        and_(
            LoginAttempt.created_at >= start_date,
            LoginAttempt.success == True
        )
    ).scalar()
    
    failed_logins = db.query(func.count(LoginAttempt.id)).filter(
        and_(
            LoginAttempt.created_at >= start_date,
            LoginAttempt.success == False
        )
    ).scalar()
    
    # Audit stats
    total_audits = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= start_date
    ).scalar()
    
    return {
        "period_days": days,
        "login_attempts": {
            "total": total_logins or 0,
            "successful": successful_logins or 0,
            "failed": failed_logins or 0
        },
        "audit_events": total_audits or 0
    }
```

### Add to main.py:
```python
from app.api.routes import ..., logs

app.include_router(logs.router, prefix=f"{settings.API_V1_PREFIX}/logs", tags=["logs"])
```

---

## 5. Reports Export API

### Update requirements.txt:
```
# Add for PDF generation
reportlab==4.2.5
```

### File: `app/api/routes/reports.py`

```python
"""Reports generation and export API."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import csv
import io
import logging

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch

from app.db.session import get_db
from app.db.models import User, ScanHistory, Incident
from app.api.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dashboard/csv")
async def export_dashboard_csv(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export dashboard data as CSV."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get scans
    scans = db.query(ScanHistory).filter(
        ScanHistory.created_at >= start_date
    ).order_by(ScanHistory.created_at.desc()).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Date', 'URL', 'Is Phishing', 'Confidence', 'Risk Score', 'Risk Level'
    ])
    
    # Write data
    for scan in scans:
        writer.writerow([
            scan.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            scan.url[:100],
            'Yes' if scan.is_phishing else 'No',
            f"{scan.confidence:.2f}",
            scan.risk_score,
            scan.risk_level
        ])
    
    # Return as downloadable file
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=dashboard_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        }
    )


@router.get("/incidents/csv")
async def export_incidents_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export incidents as CSV."""
    
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        'ID', 'Title', 'Severity', 'Status', 'Created At', 'Assigned To', 'Description'
    ])
    
    for incident in incidents:
        writer.writerow([
            incident.id,
            incident.title,
            incident.severity,
            incident.status,
            incident.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            incident.assigned_to.username if incident.assigned_to else 'Unassigned',
            incident.description[:200] if incident.description else ''
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=incidents_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        }
    )


@router.get("/dashboard/pdf")
async def export_dashboard_pdf(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export dashboard summary as PDF."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get statistics
    total_scans = db.query(func.count(ScanHistory.id)).filter(
        ScanHistory.created_at >= start_date
    ).scalar()
    
    threats = db.query(func.count(ScanHistory.id)).filter(
        and_(
            ScanHistory.created_at >= start_date,
            ScanHistory.is_phishing == True
        )
    ).scalar()
    
    open_incidents = db.query(func.count(Incident.id)).filter(
        Incident.status.in_(['open', 'in_progress'])
    ).scalar()
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0066CC'),
        spaceAfter=30
    )
    
    # Title
    story.append(Paragraph("CyberiumShield AI - Dashboard Report", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Report metadata
    story.append(Paragraph(f"<b>Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles['Normal']))
    story.append(Paragraph(f"<b>Period:</b> Last {days} days", styles['Normal']))
    story.append(Paragraph(f"<b>Generated by:</b> {current_user.username}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Summary table
    data = [
        ['Metric', 'Value'],
        ['Total Scans', str(total_scans or 0)],
        ['Threats Detected', str(threats or 0)],
        ['Safe URLs', str((total_scans or 0) - (threats or 0))],
        ['Open Incidents', str(open_incidents or 0)],
        ['Detection Rate', f"{(threats/(total_scans or 1)*100):.1f}%"]
    ]
    
    table = Table(data, colWidths=[3*inch, 2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066CC')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    story.append(Spacer(1, 0.5*inch))
    
    # Footer
    story.append(Paragraph(
        "<i>This report was generated automatically by CyberiumShield AI.</i>",
        styles['Normal']
    ))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=dashboard_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        }
    )
```

### Add to main.py:
```python
from app.api.routes import ..., reports

app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports", tags=["reports"])
```

---

## 6. Administration API (User/Role Management)

### File: `app/schemas/admin.py`

```python
"""Admin schemas."""
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class UserAdminResponse(BaseModel):
    """User response for admin."""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    roles: List[str]
    created_at: datetime
    
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Update user (admin)."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class RoleAssignment(BaseModel):
    """Assign role to user."""
    user_id: int
    role_name: str
```

### File: `app/api/routes/admin.py`

```python
"""Administration API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.db.session import get_db
from app.db.models import User, Role, AuditLog
from app.api.dependencies.auth import require_admin
from app.schemas.admin import UserAdminResponse, UserUpdate, RoleAssignment

router = APIRouter()
logger = logging.getLogger(__name__)


def log_audit(db: Session, user_id: int, action: str, resource_type: str, 
              resource_id: int, details: str = None):
    """Helper to log audit trail."""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )
    db.add(audit)


@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users (admin only)."""
    
    users = db.query(User).offset(skip).limit(limit).all()
    
    return [{
        **UserAdminResponse.model_validate(user).model_dump(),
        "roles": [role.name for role in user.roles]
    } for user in users]


@router.get("/users/{user_id}", response_model=UserAdminResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get user by ID (admin only)."""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        **UserAdminResponse.model_validate(user).model_dump(),
        "roles": [role.name for role in user.roles]
    }


@router.put("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user (admin only)."""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    changes = []
    update_data = user_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if value is not None:
            old_value = getattr(user, field)
            setattr(user, field, value)
            changes.append(f"{field}: {old_value} -> {value}")
    
    db.commit()
    db.refresh(user)
    
    # Log audit
    if changes:
        log_audit(db, current_user.id, "update", "user", user.id,
                  f"Updated: {', '.join(changes)}")
        db.commit()
    
    logger.info(f"User {user_id} updated by admin {current_user.username}")
    
    return get_user(user_id, current_user, db)


@router.post("/users/{user_id}/assign-role")
async def assign_role(
    user_id: int,
    role_name: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign role to user (admin only)."""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role not in user.roles:
        user.roles.append(role)
        db.commit()
        
        # Log audit
        log_audit(db, current_user.id, "assign_role", "user", user.id,
                  f"Assigned role '{role_name}' to {user.username}")
        db.commit()
        
        logger.info(f"Role '{role_name}' assigned to user {user.username} by admin {current_user.username}")
    
    return {"message": f"Role '{role_name}' assigned successfully"}


@router.delete("/users/{user_id}/remove-role")
async def remove_role(
    user_id: int,
    role_name: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Remove role from user (admin only)."""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role in user.roles:
        user.roles.remove(role)
        db.commit()
        
        # Log audit
        log_audit(db, current_user.id, "remove_role", "user", user.id,
                  f"Removed role '{role_name}' from {user.username}")
        db.commit()
        
        logger.info(f"Role '{role_name}' removed from user {user.username} by admin {current_user.username}")
    
    return {"message": f"Role '{role_name}' removed successfully"}


@router.get("/roles")
async def list_roles(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all roles (admin only)."""
    
    roles = db.query(Role).all()
    
    return [{
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "permissions": [perm.name for perm in role.permissions]
    } for role in roles]
```

### Add to main.py:
```python
from app.api.routes import ..., admin

app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin"])
```

---

## Summary

All endpoints are now built with real database integration:

1. ✅ **Dashboard**: `/api/v1/dashboard/stats`, `/scans-over-time`, `/recent-scans`
2. ✅ **Incidents**: Full CRUD at `/api/v1/incidents/`
3. ✅ **Logs**: `/api/v1/logs/login-attempts`, `/audit`, `/summary`
4. ✅ **Reports**: `/api/v1/reports/dashboard/csv`, `/dashboard/pdf`, `/incidents/csv`
5. ✅ **Admin**: `/api/v1/admin/users`, role management, audit logging

**Next Steps**:
1. Run migrations: `alembic upgrade head`
2. Seed data if needed: `python -m app.db.seed`
3. Update frontend pages to call these endpoints
4. Test endpoints with curl or Swagger docs

All mock data can now be replaced with real API calls!
