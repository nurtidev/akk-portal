// Admin-запросы к заявкам: без скоупа клиента (видны все заявки всех заёмщиков).
// Используются админ-панелью кредитного администратора. Сами по себе доступ не
// ограничивают — авторизацию делает admin-middleware на уровне HTTP.
package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// AdminApplication — заявка с данными заёмщика для админ-списка/карточки.
type AdminApplication struct {
	Application
	ClientName  string
	ClientPhone string
	ClientIIN   string
}

const adminAppSelect = `
	SELECT a.uid, a.number, a.client_uid, a.program_id, a.loan_purpose,
	       a.requested_amount, a.onboarding, a.status, a.admin_comment, a.created_at,
	       c.last_name, c.first_name, c.middle_name, c.phone, c.iin
	  FROM applications a
	  JOIN clients c ON c.uid = a.client_uid`

func scanAdminApp(row pgx.Row) (AdminApplication, error) {
	var a AdminApplication
	var last, first, middle string
	err := row.Scan(&a.UID, &a.Number, &a.ClientUID, &a.ProgramID, &a.LoanPurpose,
		&a.Amount, &a.Onboarding, &a.Status, &a.AdminComment, &a.CreatedAt,
		&last, &first, &middle, &a.ClientPhone, &a.ClientIIN)
	if errors.Is(err, pgx.ErrNoRows) {
		return AdminApplication{}, ErrNotFound
	}
	if err != nil {
		return AdminApplication{}, fmt.Errorf("store: scan admin application: %w", err)
	}
	a.ClientName = Client{LastName: last, FirstName: first, MiddleName: middle}.FullName()
	return a, nil
}

// ListAllApplications возвращает ВСЕ заявки всех клиентов (новые сверху).
// Если status != "" — фильтрует по статусу.
func (s *Store) ListAllApplications(ctx context.Context, status string) ([]AdminApplication, error) {
	q := adminAppSelect
	args := []any{}
	if status != "" {
		q += ` WHERE a.status = $1`
		args = append(args, status)
	}
	q += ` ORDER BY a.created_at DESC`

	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("store: list all applications: %w", err)
	}
	defer rows.Close()

	var out []AdminApplication
	for rows.Next() {
		a, err := scanAdminApp(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// GetApplicationAdmin возвращает заявку по uid БЕЗ проверки владельца (для админа).
func (s *Store) GetApplicationAdmin(ctx context.Context, uid uuid.UUID) (AdminApplication, error) {
	return scanAdminApp(s.pool.QueryRow(ctx, adminAppSelect+` WHERE a.uid = $1`, uid))
}

// SetApplicationStatusAdmin меняет статус и комментарий заявки без скоупа клиента.
// Возвращает обновлённую заявку с данными заёмщика.
func (s *Store) SetApplicationStatusAdmin(ctx context.Context, uid uuid.UUID, status, comment string) (AdminApplication, error) {
	_, err := s.pool.Exec(ctx,
		`UPDATE applications SET status=$2, admin_comment=$3 WHERE uid=$1`, uid, status, comment)
	if err != nil {
		return AdminApplication{}, fmt.Errorf("store: set status admin: %w", err)
	}
	return s.GetApplicationAdmin(ctx, uid)
}

// ListAppDocumentsAdmin возвращает документы заявки без проверки владельца.
func (s *Store) ListAppDocumentsAdmin(ctx context.Context, appUID uuid.UUID) ([]AppDocument, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, application_uid, requirement_key, status, file_name, uploaded_at, created_at
		  FROM application_documents WHERE application_uid=$1
		 ORDER BY created_at`, appUID)
	if err != nil {
		return nil, fmt.Errorf("store: list app documents admin: %w", err)
	}
	defer rows.Close()

	var out []AppDocument
	for rows.Next() {
		var d AppDocument
		if err := rows.Scan(&d.ID, &d.ApplicationUID, &d.RequirementKey, &d.Status,
			&d.FileName, &d.UploadedAt, &d.CreatedAt); err != nil {
			return nil, fmt.Errorf("store: scan app document admin: %w", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// CountApplicationsByStatus возвращает количество заявок по каждому статусу (для дашборда).
func (s *Store) CountApplicationsByStatus(ctx context.Context) (map[string]int, error) {
	rows, err := s.pool.Query(ctx, `SELECT status, count(*) FROM applications GROUP BY status`)
	if err != nil {
		return nil, fmt.Errorf("store: count by status: %w", err)
	}
	defer rows.Close()

	out := map[string]int{}
	for rows.Next() {
		var st string
		var n int
		if err := rows.Scan(&st, &n); err != nil {
			return nil, fmt.Errorf("store: scan count: %w", err)
		}
		out[st] = n
	}
	return out, rows.Err()
}
