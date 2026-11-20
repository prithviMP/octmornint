from app.models import Question


def grade_selection(question: Question, selected_option_id: str | None) -> bool:
    if selected_option_id is None:
        return False
    return selected_option_id == question.correct_option_id


def score_answers(
    questions: list[Question],
    answers_by_qid: dict[str, str | None],
) -> tuple[int, int, int, list[dict]]:
    correct = 0
    items: list[dict] = []
    for q in questions:
        selected = answers_by_qid.get(q.id)
        is_correct = grade_selection(q, selected)
        if is_correct:
            correct += 1
        items.append(
            {
                "question_id": q.id,
                "stem": q.stem,
                "options": q.options,
                "selected_option_id": selected,
                "correct_option_id": q.correct_option_id,
                "is_correct": is_correct,
                "explanation": q.explanation,
            }
        )
    total = len(questions)
    percent = round(100 * correct / total) if total else 0
    return correct, total, percent, items
