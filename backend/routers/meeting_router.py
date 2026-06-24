from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
import datetime
import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/tenants/{tenant_id}/meetings",
    tags=["Meetings"]
)

# ==========================================
# 1. SCHEDULE A MEETING
# ==========================================
@router.post("/", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    tenant_id: int,
    meeting_in: schemas.MeetingCreate,
    current_user_id: int = 1,  # Replace with actual Auth dependency
    db: Session = Depends(get_db)
):
    # Verify project exists and belongs to the tenant
    proj_stmt = select(models.Project).where(
        models.Project.id == meeting_in.project_id,
        models.Project.tenant_id == tenant_id
    )
    project = db.execute(proj_stmt).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    new_meeting = models.Meeting(
        tenant_id=tenant_id,
        project_id=meeting_in.project_id,
        title=meeting_in.title,
        description=meeting_in.description,
        start_time=meeting_in.start_time,
        end_time=meeting_in.end_time,
        created_by=current_user_id,
        status="SCHEDULED"
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    # Automatically add the creator as an attendee
    creator_attendee = models.MeetingAttendee(
        tenant_id=tenant_id,
        meeting_id=new_meeting.id,
        user_id=current_user_id,
        attendance_status="ACCEPTED"
    )
    db.add(creator_attendee)
    db.commit()

    return new_meeting

# ==========================================
# 2. LIST MEETINGS (Optional Project Filter)
# ==========================================
@router.get("/", response_model=List[schemas.MeetingResponse])
def list_meetings(
    tenant_id: int,
    project_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    stmt = select(models.Meeting).where(models.Meeting.tenant_id == tenant_id)
    if project_id:
        stmt = stmt.where(models.Meeting.project_id == project_id)
    
    meetings = db.execute(stmt.offset(skip).limit(limit)).scalars().all()
    return meetings

# ==========================================
# 3. GET SPECIFIC MEETING
# ==========================================
@router.get("/{meeting_id}", response_model=schemas.MeetingResponse)
def get_meeting(
    tenant_id: int,
    meeting_id: int,
    db: Session = Depends(get_db)
):
    stmt = select(models.Meeting).where(
        models.Meeting.id == meeting_id,
        models.Meeting.tenant_id == tenant_id
    )
    meeting = db.execute(stmt).scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting

# ==========================================
# 4. UPDATE/CANCEL MEETING
# ==========================================
@router.patch("/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting(
    tenant_id: int,
    meeting_id: int,
    meeting_update: schemas.MeetingUpdate,
    db: Session = Depends(get_db)
):
    stmt = select(models.Meeting).where(
        models.Meeting.id == meeting_id,
        models.Meeting.tenant_id == tenant_id
    )
    meeting = db.execute(stmt).scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    update_data = meeting_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(meeting, key, value)

    db.commit()
    db.refresh(meeting)
    return meeting

@router.delete("/{meeting_id}", status_code=status.HTTP_200_OK)
def cancel_meeting(
    tenant_id: int,
    meeting_id: int,
    db: Session = Depends(get_db)
):
    stmt = select(models.Meeting).where(
        models.Meeting.id == meeting_id,
        models.Meeting.tenant_id == tenant_id
    )
    meeting = db.execute(stmt).scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    meeting.status = "CANCELLED"
    db.commit()
    return {"detail": "Meeting cancelled successfully"}

# ==========================================
# 5. MEETING ATTENDEES
# ==========================================
@router.post("/{meeting_id}/attendees", response_model=schemas.MeetingAttendeeResponse)
def add_attendee(
    tenant_id: int,
    meeting_id: int,
    attendee_in: schemas.MeetingAttendeeCreate,
    db: Session = Depends(get_db)
):
    # Check if already added
    stmt = select(models.MeetingAttendee).where(
        models.MeetingAttendee.meeting_id == meeting_id,
        models.MeetingAttendee.user_id == attendee_in.user_id
    )
    if db.execute(stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already an attendee")

    new_attendee = models.MeetingAttendee(
        tenant_id=tenant_id,
        meeting_id=meeting_id,
        user_id=attendee_in.user_id,
        attendance_status="INVITED"
    )
    db.add(new_attendee)
    db.commit()
    db.refresh(new_attendee)
    return new_attendee

@router.get("/{meeting_id}/attendees", response_model=List[schemas.MeetingAttendeeResponse])
def list_attendees(
    tenant_id: int,
    meeting_id: int,
    db: Session = Depends(get_db)
):
    stmt = select(models.MeetingAttendee).where(
        models.MeetingAttendee.meeting_id == meeting_id,
        models.MeetingAttendee.tenant_id == tenant_id
    )
    return db.execute(stmt).scalars().all()

@router.delete("/{meeting_id}/attendees/{user_id}")
def remove_attendee(
    tenant_id: int,
    meeting_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    stmt = select(models.MeetingAttendee).where(
        models.MeetingAttendee.meeting_id == meeting_id,
        models.MeetingAttendee.user_id == user_id,
        models.MeetingAttendee.tenant_id == tenant_id
    )
    attendee = db.execute(stmt).scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendee not found")

    db.delete(attendee)
    db.commit()
    return {"detail": "Attendee removed"}

# ==========================================
# 6. MEETING NOTES
# ==========================================
@router.post("/{meeting_id}/notes", response_model=schemas.MeetingNoteResponse)
def add_meeting_notes(
    tenant_id: int,
    meeting_id: int,
    notes_in: schemas.MeetingNoteCreate,
    current_user_id: int = 1, # Replace with Auth dependency
    db: Session = Depends(get_db)
):
    new_note = models.MeetingNote(
        tenant_id=tenant_id,
        meeting_id=meeting_id,
        notes=notes_in.notes,
        created_by=current_user_id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.get("/{meeting_id}/notes", response_model=List[schemas.MeetingNoteResponse])
def get_meeting_notes(
    tenant_id: int,
    meeting_id: int,
    db: Session = Depends(get_db)
):
    stmt = select(models.MeetingNote).where(
        models.MeetingNote.meeting_id == meeting_id,
        models.MeetingNote.tenant_id == tenant_id
    )
    return db.execute(stmt).scalars().all()

# ==========================================
# 7. AI MEETING SUMMARY (Placeholder implementation)
# ==========================================
@router.post("/{meeting_id}/summary", response_model=schemas.AIMeetingSummaryResponse)
def generate_ai_summary(
    tenant_id: int,
    meeting_id: int,
    db: Session = Depends(get_db)
):
    """
    In a real-world scenario, this endpoint would trigger an LLM (like Claude/OpenAI)
    to process the Meeting Notes or audio transcript and extract action items and risks.
    For this phase, we generate a mock placeholder.
    """
    # Check if summary already exists
    existing_stmt = select(models.AIMeetingSummary).where(models.AIMeetingSummary.meeting_id == meeting_id)
    if db.execute(existing_stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Summary already generated for this meeting")

    # Fetch notes to "summarize"
    notes_stmt = select(models.MeetingNote).where(models.MeetingNote.meeting_id == meeting_id)
    notes = db.execute(notes_stmt).scalars().all()
    
    if not notes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No notes available to summarize.")

    # Placeholder AI Logic
    mock_summary = "The team discussed the upcoming release and finalized the API contract."
    mock_action_items = "- Backend team to implement endpoints\n- QA team to prepare test cases"
    mock_risks = "- Tight deadline for UAT"
    mock_decisions = "- We will use JWT for authentication."

    ai_summary = models.AIMeetingSummary(
        tenant_id=tenant_id,
        meeting_id=meeting_id,
        summary=mock_summary,
        action_items=mock_action_items,
        risks=mock_risks,
        decisions=mock_decisions
    )
    db.add(ai_summary)
    db.commit()
    db.refresh(ai_summary)
    return ai_summary

@router.get("/{meeting_id}/summary", response_model=schemas.AIMeetingSummaryResponse)
def get_ai_summary(
    tenant_id: int,
    meeting_id: int,
    db: Session = Depends(get_db)
):
    stmt = select(models.AIMeetingSummary).where(
        models.AIMeetingSummary.meeting_id == meeting_id,
        models.AIMeetingSummary.tenant_id == tenant_id
    )
    summary = db.execute(stmt).scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI Summary not generated yet")
    return summary