package store

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// --- FAQ: голоса «Полезен ли ответ?» -------------------------------------

// FaqStat — агрегат по одному вопросу FAQ.
type FaqStat struct {
	ItemKey string
	Helpful int // сколько отметили «полезно»
	Total   int // всего голосов
}

// Percent — доля полезных голосов (0..100). При отсутствии голосов — 0.
func (s FaqStat) Percent() int {
	if s.Total == 0 {
		return 0
	}
	return int((float64(s.Helpful)/float64(s.Total))*100 + 0.5)
}

// RecordFaqVote фиксирует голос устройства за один вопрос (upsert: повторный
// голос того же устройства переписывает прежний) и возвращает свежий агрегат.
func (s *Store) RecordFaqVote(ctx context.Context, itemKey, voter string, helpful bool) (FaqStat, error) {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO faq_votes (id, item_key, voter, helpful)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (item_key, voter)
		DO UPDATE SET helpful = EXCLUDED.helpful, updated_at = now()`,
		uuid.New(), itemKey, voter, helpful)
	if err != nil {
		return FaqStat{}, fmt.Errorf("store: record faq vote: %w", err)
	}
	stats, err := s.FaqStats(ctx, []string{itemKey})
	if err != nil {
		return FaqStat{}, err
	}
	if st, ok := stats[itemKey]; ok {
		return st, nil
	}
	return FaqStat{ItemKey: itemKey}, nil
}

// FaqStats возвращает агрегаты по набору ключей (только те, за которые голосовали).
func (s *Store) FaqStats(ctx context.Context, keys []string) (map[string]FaqStat, error) {
	out := make(map[string]FaqStat, len(keys))
	if len(keys) == 0 {
		return out, nil
	}
	rows, err := s.pool.Query(ctx, `
		SELECT item_key,
		       COUNT(*) FILTER (WHERE helpful) AS helpful,
		       COUNT(*)                        AS total
		FROM faq_votes
		WHERE item_key = ANY($1)
		GROUP BY item_key`, keys)
	if err != nil {
		return nil, fmt.Errorf("store: faq stats: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var st FaqStat
		if err := rows.Scan(&st.ItemKey, &st.Helpful, &st.Total); err != nil {
			return nil, fmt.Errorf("store: faq stats scan: %w", err)
		}
		out[st.ItemKey] = st
	}
	return out, rows.Err()
}

// --- Обращения в поддержку -----------------------------------------------

// SupportQuestion — вопрос из блока «Не нашли ответ?».
type SupportQuestion struct {
	UID       uuid.UUID
	ItemKey   string
	Scope     string
	Question  string
	Contact   string
	Locale    string
	Status    string
	CreatedAt time.Time
}

// Статусы обращения.
const (
	SupportStatusNew      = "new"
	SupportStatusResolved = "resolved"
)

// CreateSupportQuestion сохраняет обращение (status=new).
func (s *Store) CreateSupportQuestion(ctx context.Context, q SupportQuestion) (SupportQuestion, error) {
	q.UID = uuid.New()
	q.Status = SupportStatusNew
	row := s.pool.QueryRow(ctx, `
		INSERT INTO support_questions (uid, item_key, scope, question, contact, locale, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at`,
		q.UID, q.ItemKey, q.Scope, q.Question, q.Contact, q.Locale, q.Status)
	if err := row.Scan(&q.CreatedAt); err != nil {
		return SupportQuestion{}, fmt.Errorf("store: create support question: %w", err)
	}
	return q, nil
}

// ListSupportQuestions отдаёт обращения (опц. фильтр по статусу), новые сверху.
func (s *Store) ListSupportQuestions(ctx context.Context, status string) ([]SupportQuestion, error) {
	q := `SELECT uid, item_key, scope, question, contact, locale, status, created_at
	      FROM support_questions`
	args := []any{}
	if status != "" {
		q += ` WHERE status = $1`
		args = append(args, status)
	}
	q += ` ORDER BY created_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("store: list support questions: %w", err)
	}
	defer rows.Close()
	var out []SupportQuestion
	for rows.Next() {
		var sq SupportQuestion
		if err := rows.Scan(&sq.UID, &sq.ItemKey, &sq.Scope, &sq.Question, &sq.Contact, &sq.Locale, &sq.Status, &sq.CreatedAt); err != nil {
			return nil, fmt.Errorf("store: list support questions scan: %w", err)
		}
		out = append(out, sq)
	}
	return out, rows.Err()
}

// SetSupportQuestionStatus меняет статус обращения (new|resolved).
func (s *Store) SetSupportQuestionStatus(ctx context.Context, uid uuid.UUID, status string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE support_questions SET status = $2 WHERE uid = $1`, uid, status)
	if err != nil {
		return fmt.Errorf("store: set support question status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CountSupportQuestionsByStatus — счётчики обращений по статусам (для админки).
func (s *Store) CountSupportQuestionsByStatus(ctx context.Context) (map[string]int, error) {
	rows, err := s.pool.Query(ctx, `SELECT status, COUNT(*) FROM support_questions GROUP BY status`)
	if err != nil {
		return nil, fmt.Errorf("store: count support questions: %w", err)
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var st string
		var n int
		if err := rows.Scan(&st, &n); err != nil {
			return nil, fmt.Errorf("store: count support questions scan: %w", err)
		}
		out[st] = n
	}
	return out, rows.Err()
}
