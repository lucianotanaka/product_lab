from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.base import BaseRepository
from app.models.backlog import BacklogItem


router = APIRouter()


WSJF_ALLOWED_SCORES = {0, 1, 2, 3, 5, 8, 13, 21}
DIMENSION_CODES = {"business_value", "time_criticality", "risk_reduction", "job_size"}


def calc_wsjf(bv: int, tc: int, rr: int, js: int) -> float:
    cost_of_delay = bv + tc + rr
    if js <= 0:
        return 0.0
    return round(cost_of_delay / js, 1)


class WsjfOptionOut(BaseModel):
    option_id: int
    option_label: str
    option_value: Optional[str] = None
    score_value: Optional[int] = None
    justification_template: Optional[str] = None
    display_order: int = 0


class WsjfQuestionOut(BaseModel):
    question_id: int
    question_text: str
    help_text: Optional[str] = None
    question_type: str
    display_order: int = 0
    options: List[WsjfOptionOut]


class WsjfDimensionOut(BaseModel):
    dimension_id: int
    code: str
    label: str
    description: Optional[str] = None
    display_order: int = 0
    is_required: bool = True
    questions: List[WsjfQuestionOut]


class WsjfTemplateOut(BaseModel):
    template_id: int
    name: str
    description: Optional[str] = None
    scale_type: str
    is_active: bool
    is_default: bool
    dimensions: List[WsjfDimensionOut]


class WsjfAssessmentAnswerIn(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None
    answer_text: Optional[str] = None
    derived_dimension_code: str
    derived_score: int
    justification_snapshot: Optional[str] = None


class WsjfAssessmentSaveIn(BaseModel):
    template_id: int
    summary_justification: Optional[str] = None
    rationale_markdown: Optional[str] = None
    status: str = "final"
    created_by: Optional[str] = None
    answers: List[WsjfAssessmentAnswerIn]


class WsjfAssessmentAnswerOut(BaseModel):
    answer_id: int
    question_id: int
    selected_option_id: Optional[int] = None
    answer_text: Optional[str] = None
    derived_dimension_code: Optional[str] = None
    derived_score: Optional[int] = None
    justification_snapshot: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class WsjfHistoryOut(BaseModel):
    history_id: int
    version_number: int
    changed_by: Optional[str] = None
    change_reason: Optional[str] = None
    created_at: datetime
    snapshot_json: dict


class WsjfAssessmentOut(BaseModel):
    assessment_id: int
    product_id: Optional[int] = None
    backlog_item_id: int
    template_id: int
    status: str
    business_value_score: int
    time_criticality_score: int
    risk_reduction_score: int
    job_size_score: int
    cost_of_delay: float
    wsjf_score: float
    summary_justification: Optional[str] = None
    rationale_markdown: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    answers: List[WsjfAssessmentAnswerOut] = []
    history: List[WsjfHistoryOut] = []


def _ensure_backlog_item(db: Session, item_id: int) -> BacklogItem:
    return BaseRepository(BacklogItem, db).get_or_404(item_id)


def _validate_answers(answers: List[WsjfAssessmentAnswerIn]) -> None:
    if not answers:
        raise HTTPException(status_code=400, detail="At least one WSJF answer is required")

    for answer in answers:
        if answer.derived_dimension_code not in DIMENSION_CODES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid WSJF dimension: {answer.derived_dimension_code}",
            )
        if answer.derived_score not in WSJF_ALLOWED_SCORES - {0}:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid WSJF score: {answer.derived_score}",
            )


def _load_template(db: Session, template_id: Optional[int] = None) -> WsjfTemplateOut:
    params = {}
    where_clause = "t.is_active = TRUE"
    if template_id is not None:
        where_clause += " AND t.template_id = :template_id"
        params["template_id"] = template_id
    else:
        where_clause += " AND t.is_default = TRUE"

    template_row = db.execute(
        text(
            f"""
            SELECT
                t.template_id,
                t.name,
                t.description,
                t.scale_type,
                t.is_active,
                t.is_default
            FROM wsjf_templates t
            WHERE {where_clause}
            ORDER BY t.template_id
            LIMIT 1
            """
        ),
        params,
    ).mappings().first()

    if not template_row:
        raise HTTPException(status_code=404, detail="WSJF template not found")

    dimension_rows = db.execute(
        text(
            """
            SELECT
                d.dimension_id,
                d.code,
                d.label,
                d.description,
                d.display_order,
                d.is_required
            FROM wsjf_template_dimensions d
            WHERE d.template_id = :template_id
            ORDER BY d.display_order ASC, d.dimension_id ASC
            """
        ),
        {"template_id": template_row["template_id"]},
    ).mappings().all()

    question_rows = db.execute(
        text(
            """
            SELECT
                q.question_id,
                q.dimension_id,
                q.question_text,
                q.help_text,
                q.question_type,
                q.display_order
            FROM wsjf_template_questions q
            INNER JOIN wsjf_template_dimensions d
              ON d.dimension_id = q.dimension_id
            WHERE d.template_id = :template_id
              AND q.is_active = TRUE
            ORDER BY d.display_order ASC, q.display_order ASC, q.question_id ASC
            """
        ),
        {"template_id": template_row["template_id"]},
    ).mappings().all()

    option_rows = db.execute(
        text(
            """
            SELECT
                o.option_id,
                o.question_id,
                o.option_label,
                o.option_value,
                o.score_value,
                o.justification_template,
                o.display_order
            FROM wsjf_question_options o
            INNER JOIN wsjf_template_questions q
              ON q.question_id = o.question_id
            INNER JOIN wsjf_template_dimensions d
              ON d.dimension_id = q.dimension_id
            WHERE d.template_id = :template_id
              AND o.is_active = TRUE
            ORDER BY q.display_order ASC, o.display_order ASC, o.option_id ASC
            """
        ),
        {"template_id": template_row["template_id"]},
    ).mappings().all()

    options_by_question: dict[int, List[WsjfOptionOut]] = {}
    for row in option_rows:
        options_by_question.setdefault(row["question_id"], []).append(
            WsjfOptionOut(
                option_id=row["option_id"],
                option_label=row["option_label"],
                option_value=row["option_value"],
                score_value=row["score_value"],
                justification_template=row["justification_template"],
                display_order=row["display_order"],
            )
        )

    questions_by_dimension: dict[int, List[WsjfQuestionOut]] = {}
    for row in question_rows:
        questions_by_dimension.setdefault(row["dimension_id"], []).append(
            WsjfQuestionOut(
                question_id=row["question_id"],
                question_text=row["question_text"],
                help_text=row["help_text"],
                question_type=row["question_type"],
                display_order=row["display_order"],
                options=options_by_question.get(row["question_id"], []),
            )
        )

    dimensions = [
        WsjfDimensionOut(
            dimension_id=row["dimension_id"],
            code=row["code"],
            label=row["label"],
            description=row["description"],
            display_order=row["display_order"],
            is_required=row["is_required"],
            questions=questions_by_dimension.get(row["dimension_id"], []),
        )
        for row in dimension_rows
    ]

    return WsjfTemplateOut(
        template_id=template_row["template_id"],
        name=template_row["name"],
        description=template_row["description"],
        scale_type=template_row["scale_type"],
        is_active=template_row["is_active"],
        is_default=template_row["is_default"],
        dimensions=dimensions,
    )


def _load_assessment(db: Session, assessment_id: int) -> WsjfAssessmentOut:
    assessment_row = db.execute(
        text(
            """
            SELECT
                a.assessment_id,
                a.product_id,
                a.backlog_item_id,
                a.template_id,
                a.status,
                a.business_value_score,
                a.time_criticality_score,
                a.risk_reduction_score,
                a.job_size_score,
                a.cost_of_delay,
                a.wsjf_score,
                a.summary_justification,
                a.rationale_markdown,
                a.created_by,
                a.updated_by,
                a.created_at,
                a.updated_at,
                a.completed_at
            FROM wsjf_assessments a
            WHERE a.assessment_id = :assessment_id
            """
        ),
        {"assessment_id": assessment_id},
    ).mappings().first()

    if not assessment_row:
        raise HTTPException(status_code=404, detail="WSJF assessment not found")

    answer_rows = db.execute(
        text(
            """
            SELECT
                aa.answer_id,
                aa.question_id,
                aa.selected_option_id,
                aa.answer_text,
                aa.derived_dimension_code,
                aa.derived_score,
                aa.justification_snapshot,
                aa.created_at,
                aa.updated_at
            FROM wsjf_assessment_answers aa
            WHERE aa.assessment_id = :assessment_id
            ORDER BY aa.answer_id ASC
            """
        ),
        {"assessment_id": assessment_id},
    ).mappings().all()

    history_rows = db.execute(
        text(
            """
            SELECT
                h.history_id,
                h.version_number,
                h.snapshot_json,
                h.changed_by,
                h.change_reason,
                h.created_at
            FROM wsjf_assessment_history h
            WHERE h.assessment_id = :assessment_id
            ORDER BY h.version_number DESC
            """
        ),
        {"assessment_id": assessment_id},
    ).mappings().all()

    return WsjfAssessmentOut(
        assessment_id=assessment_row["assessment_id"],
        product_id=assessment_row["product_id"],
        backlog_item_id=assessment_row["backlog_item_id"],
        template_id=assessment_row["template_id"],
        status=assessment_row["status"],
        business_value_score=assessment_row["business_value_score"],
        time_criticality_score=assessment_row["time_criticality_score"],
        risk_reduction_score=assessment_row["risk_reduction_score"],
        job_size_score=assessment_row["job_size_score"],
        cost_of_delay=float(assessment_row["cost_of_delay"] or 0),
        wsjf_score=float(assessment_row["wsjf_score"] or 0),
        summary_justification=assessment_row["summary_justification"],
        rationale_markdown=assessment_row["rationale_markdown"],
        created_by=assessment_row["created_by"],
        updated_by=assessment_row["updated_by"],
        created_at=assessment_row["created_at"],
        updated_at=assessment_row["updated_at"],
        completed_at=assessment_row["completed_at"],
        answers=[
            WsjfAssessmentAnswerOut(
                answer_id=row["answer_id"],
                question_id=row["question_id"],
                selected_option_id=row["selected_option_id"],
                answer_text=row["answer_text"],
                derived_dimension_code=row["derived_dimension_code"],
                derived_score=row["derived_score"],
                justification_snapshot=row["justification_snapshot"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in answer_rows
        ],
        history=[
            WsjfHistoryOut(
                history_id=row["history_id"],
                version_number=row["version_number"],
                snapshot_json=row["snapshot_json"],
                changed_by=row["changed_by"],
                change_reason=row["change_reason"],
                created_at=row["created_at"],
            )
            for row in history_rows
        ],
    )


@router.get("/templates/default", response_model=WsjfTemplateOut)
def get_default_template(db: Session = Depends(get_db)):
    return _load_template(db)


@router.get("/templates/{template_id}", response_model=WsjfTemplateOut)
def get_template(template_id: int, db: Session = Depends(get_db)):
    return _load_template(db, template_id)


@router.get("/backlog/{item_id}", response_model=Optional[WsjfAssessmentOut])
def get_latest_assessment_for_backlog(item_id: int, db: Session = Depends(get_db)):
    _ensure_backlog_item(db, item_id)
    row = db.execute(
        text(
            """
            SELECT a.assessment_id
            FROM wsjf_assessments a
            WHERE a.backlog_item_id = :item_id
            ORDER BY
                CASE WHEN a.status = 'final' THEN 0 ELSE 1 END,
                a.created_at DESC,
                a.assessment_id DESC
            LIMIT 1
            """
        ),
        {"item_id": item_id},
    ).mappings().first()

    if not row:
        return None

    return _load_assessment(db, row["assessment_id"])


@router.post("/backlog/{item_id}", response_model=WsjfAssessmentOut, status_code=status.HTTP_201_CREATED)
def save_assessment_for_backlog(item_id: int, body: WsjfAssessmentSaveIn, db: Session = Depends(get_db)):
    backlog_item = _ensure_backlog_item(db, item_id)
    _validate_answers(body.answers)

    template_row = db.execute(
        text(
            """
            SELECT t.template_id
            FROM wsjf_templates t
            WHERE t.template_id = :template_id
              AND t.is_active = TRUE
            """
        ),
        {"template_id": body.template_id},
    ).mappings().first()
    if not template_row:
        raise HTTPException(status_code=404, detail="WSJF template not found")

    score_by_dimension = {code: 0 for code in DIMENSION_CODES}
    for answer in body.answers:
        score_by_dimension[answer.derived_dimension_code] = max(
            score_by_dimension[answer.derived_dimension_code],
            answer.derived_score,
        )

    business_value = score_by_dimension["business_value"]
    time_criticality = score_by_dimension["time_criticality"]
    risk_reduction = score_by_dimension["risk_reduction"]
    job_size = score_by_dimension["job_size"]
    cost_of_delay = business_value + time_criticality + risk_reduction
    wsjf_score = calc_wsjf(business_value, time_criticality, risk_reduction, job_size)
    completed_at = datetime.utcnow() if body.status == "final" else None

    if body.status == "final":
        db.execute(
            text(
                """
                UPDATE wsjf_assessments
                SET status = 'archived'
                WHERE backlog_item_id = :item_id
                  AND status = 'final'
                """
            ),
            {"item_id": item_id},
        )

    insert_assessment = db.execute(
        text(
            """
            INSERT INTO wsjf_assessments (
                product_id,
                backlog_item_id,
                template_id,
                status,
                business_value_score,
                time_criticality_score,
                risk_reduction_score,
                job_size_score,
                cost_of_delay,
                wsjf_score,
                summary_justification,
                rationale_markdown,
                created_by,
                updated_by,
                completed_at
            )
            VALUES (
                :product_id,
                :backlog_item_id,
                :template_id,
                :status,
                :business_value_score,
                :time_criticality_score,
                :risk_reduction_score,
                :job_size_score,
                :cost_of_delay,
                :wsjf_score,
                :summary_justification,
                :rationale_markdown,
                :created_by,
                :updated_by,
                :completed_at
            )
            RETURNING assessment_id
            """
        ),
        {
            "product_id": backlog_item.product_id,
            "backlog_item_id": backlog_item.item_id,
            "template_id": body.template_id,
            "status": body.status,
            "business_value_score": business_value,
            "time_criticality_score": time_criticality,
            "risk_reduction_score": risk_reduction,
            "job_size_score": job_size,
            "cost_of_delay": cost_of_delay,
            "wsjf_score": wsjf_score,
            "summary_justification": body.summary_justification,
            "rationale_markdown": body.rationale_markdown,
            "created_by": body.created_by,
            "updated_by": body.created_by,
            "completed_at": completed_at,
        },
    ).mappings().first()

    assessment_id = insert_assessment["assessment_id"]

    for answer in body.answers:
        db.execute(
            text(
                """
                INSERT INTO wsjf_assessment_answers (
                    assessment_id,
                    question_id,
                    selected_option_id,
                    answer_text,
                    derived_dimension_code,
                    derived_score,
                    justification_snapshot
                )
                VALUES (
                    :assessment_id,
                    :question_id,
                    :selected_option_id,
                    :answer_text,
                    :derived_dimension_code,
                    :derived_score,
                    :justification_snapshot
                )
                """
            ),
            {
                "assessment_id": assessment_id,
                "question_id": answer.question_id,
                "selected_option_id": answer.selected_option_id,
                "answer_text": answer.answer_text,
                "derived_dimension_code": answer.derived_dimension_code,
                "derived_score": answer.derived_score,
                "justification_snapshot": answer.justification_snapshot,
            },
        )

    history_version = db.execute(
        text(
            """
            SELECT COALESCE(MAX(h.version_number), 0) + 1 AS next_version
            FROM wsjf_assessment_history h
            WHERE h.assessment_id = :assessment_id
            """
        ),
        {"assessment_id": assessment_id},
    ).mappings().first()["next_version"]

    snapshot_json = {
        "template_id": body.template_id,
        "status": body.status,
        "business_value_score": business_value,
        "time_criticality_score": time_criticality,
        "risk_reduction_score": risk_reduction,
        "job_size_score": job_size,
        "cost_of_delay": cost_of_delay,
        "wsjf_score": wsjf_score,
        "summary_justification": body.summary_justification,
        "rationale_markdown": body.rationale_markdown,
        "answers": [answer.model_dump() for answer in body.answers],
    }

    db.execute(
        text(
            """
            INSERT INTO wsjf_assessment_history (
                assessment_id,
                version_number,
                snapshot_json,
                changed_by,
                change_reason
            )
            VALUES (
                :assessment_id,
                :version_number,
                CAST(:snapshot_json AS JSONB),
                :changed_by,
                :change_reason
            )
            """
        ),
        {
            "assessment_id": assessment_id,
            "version_number": history_version,
            "snapshot_json": __import__("json").dumps(snapshot_json),
            "changed_by": body.created_by,
            "change_reason": "Initial assessment saved",
        },
    )

    backlog_item.wsjf_business_value = business_value
    backlog_item.wsjf_time_criticality = time_criticality
    backlog_item.wsjf_risk_reduction = risk_reduction
    backlog_item.wsjf_job_size = job_size
    backlog_item.wsjf_score = wsjf_score
    db.add(backlog_item)
    db.commit()

    return _load_assessment(db, assessment_id)
