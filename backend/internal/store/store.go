// Package store — доступ к Postgres для прототипа.
// Схема создаётся на старте (CREATE TABLE IF NOT EXISTS) — это временная демо-БД,
// поэтому без шифрования ИИН и без миграций-инструментов. В прод как есть не переносить.
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound — запись не найдена.
var ErrNotFound = errors.New("not found")

// Store оборачивает пул соединений.
type Store struct {
	pool *pgxpool.Pool
}

// New открывает пул и применяет схему.
func New(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("store: connect: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("store: ping: %w", err)
	}
	s := &Store{pool: pool}
	if err := s.migrate(ctx); err != nil {
		return nil, err
	}
	return s, nil
}

// Close закрывает пул.
func (s *Store) Close() { s.pool.Close() }

const schema = `
CREATE TABLE IF NOT EXISTS clients (
    uid         UUID PRIMARY KEY,
    iin_hash    TEXT NOT NULL UNIQUE,
    iin         TEXT NOT NULL,
    last_name   TEXT NOT NULL DEFAULT '',
    first_name  TEXT NOT NULL DEFAULT '',
    middle_name TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_codes (
    uid          UUID PRIMARY KEY,
    iin          TEXT NOT NULL,
    phone        TEXT NOT NULL,
    code         TEXT NOT NULL,
    purpose      TEXT NOT NULL,
    attempts     INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    verified     BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_codes_iin_purpose ON sms_codes(iin, purpose, created_at DESC);

CREATE SEQUENCE IF NOT EXISTS application_number_seq START 1;

CREATE TABLE IF NOT EXISTS applications (
    uid              UUID PRIMARY KEY,
    number           TEXT NOT NULL UNIQUE,
    client_uid       UUID NOT NULL REFERENCES clients(uid),
    program_id       TEXT NOT NULL DEFAULT '',
    loan_purpose     TEXT NOT NULL DEFAULT '',
    requested_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    onboarding       JSONB NOT NULL DEFAULT '{}',
    status           TEXT NOT NULL DEFAULT 'new',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_client ON applications(client_uid);

CREATE TABLE IF NOT EXISTS application_documents (
    id              UUID PRIMARY KEY,
    application_uid UUID NOT NULL REFERENCES applications(uid),
    requirement_key TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'uploaded',
    file_name       TEXT,
    uploaded_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (application_uid, requirement_key)
);
CREATE INDEX IF NOT EXISTS idx_app_documents_app ON application_documents(application_uid);
`

func (s *Store) migrate(ctx context.Context) error {
	if _, err := s.pool.Exec(ctx, schema); err != nil {
		return fmt.Errorf("store: migrate: %w", err)
	}
	return nil
}

// --- Clients -------------------------------------------------------------

// Client — зарегистрированный пользователь прототипа.
type Client struct {
	UID        uuid.UUID
	IIN        string
	LastName   string
	FirstName  string
	MiddleName string
	Phone      string
}

// FullName собирает ФИО в одну строку.
func (c Client) FullName() string {
	name := c.LastName
	if c.FirstName != "" {
		name += " " + c.FirstName
	}
	if c.MiddleName != "" {
		name += " " + c.MiddleName
	}
	return name
}

// GetClientByIINHash ищет клиента по хэшу ИИН.
func (s *Store) GetClientByIINHash(ctx context.Context, iinHash string) (Client, error) {
	return s.scanClient(s.pool.QueryRow(ctx,
		`SELECT uid, iin, last_name, first_name, middle_name, phone
		   FROM clients WHERE iin_hash=$1 AND is_active`, iinHash))
}

// GetClientByUID ищет клиента по uid.
func (s *Store) GetClientByUID(ctx context.Context, uid uuid.UUID) (Client, error) {
	return s.scanClient(s.pool.QueryRow(ctx,
		`SELECT uid, iin, last_name, first_name, middle_name, phone
		   FROM clients WHERE uid=$1 AND is_active`, uid))
}

func (s *Store) scanClient(row pgx.Row) (Client, error) {
	var c Client
	err := row.Scan(&c.UID, &c.IIN, &c.LastName, &c.FirstName, &c.MiddleName, &c.Phone)
	if errors.Is(err, pgx.ErrNoRows) {
		return Client{}, ErrNotFound
	}
	if err != nil {
		return Client{}, fmt.Errorf("store: scan client: %w", err)
	}
	return c, nil
}

// UpsertClient создаёт или обновляет клиента по хэшу ИИН. Возвращает актуальную запись.
func (s *Store) UpsertClient(ctx context.Context, iinHash string, c Client) (Client, error) {
	c.UID = uuid.New()
	return s.scanClient(s.pool.QueryRow(ctx, `
		INSERT INTO clients (uid, iin_hash, iin, last_name, first_name, middle_name, phone)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (iin_hash) DO UPDATE SET
			last_name   = EXCLUDED.last_name,
			first_name  = EXCLUDED.first_name,
			middle_name = EXCLUDED.middle_name,
			phone       = EXCLUDED.phone,
			is_active   = TRUE
		RETURNING uid, iin, last_name, first_name, middle_name, phone`,
		c.UID, iinHash, c.IIN, c.LastName, c.FirstName, c.MiddleName, c.Phone))
}

// --- SMS codes -----------------------------------------------------------

// SMSCode — строка таблицы sms_codes.
type SMSCode struct {
	UID         uuid.UUID
	IIN         string
	Phone       string
	Code        string
	Purpose     string
	Attempts    int
	MaxAttempts int
	Verified    bool
	ExpiresAt   time.Time
	CreatedAt   time.Time
}

// SaveSMSCode сохраняет новый код.
func (s *Store) SaveSMSCode(ctx context.Context, c SMSCode) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO sms_codes (uid, iin, phone, code, purpose, attempts, max_attempts, verified, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		c.UID, c.IIN, c.Phone, c.Code, c.Purpose, c.Attempts, c.MaxAttempts, c.Verified, c.ExpiresAt)
	if err != nil {
		return fmt.Errorf("store: save sms code: %w", err)
	}
	return nil
}

// LatestSMSCode возвращает последний код для (iin, purpose).
func (s *Store) LatestSMSCode(ctx context.Context, iin, purpose string) (SMSCode, error) {
	var c SMSCode
	err := s.pool.QueryRow(ctx, `
		SELECT uid, iin, phone, code, purpose, attempts, max_attempts, verified, expires_at, created_at
		  FROM sms_codes WHERE iin=$1 AND purpose=$2
		 ORDER BY created_at DESC LIMIT 1`, iin, purpose).
		Scan(&c.UID, &c.IIN, &c.Phone, &c.Code, &c.Purpose, &c.Attempts, &c.MaxAttempts,
			&c.Verified, &c.ExpiresAt, &c.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return SMSCode{}, ErrNotFound
	}
	if err != nil {
		return SMSCode{}, fmt.Errorf("store: latest sms code: %w", err)
	}
	return c, nil
}

// UpdateSMSCode обновляет счётчик попыток и флаг verified.
func (s *Store) UpdateSMSCode(ctx context.Context, c SMSCode) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE sms_codes SET attempts=$2, verified=$3 WHERE uid=$1`, c.UID, c.Attempts, c.Verified)
	if err != nil {
		return fmt.Errorf("store: update sms code: %w", err)
	}
	return nil
}

// CountRecentSMS считает коды для ИИН за период (rate-limit).
func (s *Store) CountRecentSMS(ctx context.Context, iin string, since time.Time) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM sms_codes WHERE iin=$1 AND created_at >= $2`, iin, since).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("store: count sms: %w", err)
	}
	return n, nil
}

// --- Applications --------------------------------------------------------

// Application — заявка прототипа.
type Application struct {
	UID         uuid.UUID
	Number      string
	ClientUID   uuid.UUID
	ProgramID   string
	LoanPurpose string
	Amount      float64
	Onboarding  json.RawMessage
	Status      string
	CreatedAt   time.Time
}

// CreateApplication вставляет заявку, генерируя номер AKK-<год>-NNNNNN.
func (s *Store) CreateApplication(ctx context.Context, a Application) (Application, error) {
	a.UID = uuid.New()
	if len(a.Onboarding) == 0 {
		a.Onboarding = json.RawMessage(`{}`)
	}
	year := time.Now().Year()
	var seq int64
	if err := s.pool.QueryRow(ctx, `SELECT nextval('application_number_seq')`).Scan(&seq); err != nil {
		return Application{}, fmt.Errorf("store: app seq: %w", err)
	}
	a.Number = fmt.Sprintf("AKK-%d-%06d", year, seq)
	a.Status = "new"

	err := s.pool.QueryRow(ctx, `
		INSERT INTO applications (uid, number, client_uid, program_id, loan_purpose, requested_amount, onboarding, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING created_at`,
		a.UID, a.Number, a.ClientUID, a.ProgramID, a.LoanPurpose, a.Amount, a.Onboarding, a.Status).
		Scan(&a.CreatedAt)
	if err != nil {
		return Application{}, fmt.Errorf("store: create application: %w", err)
	}
	return a, nil
}

// StatusLadder — клиентская проекция движения заявки (порядок = прогресс).
// Ключи — представительные статусы реального workflow credit-backend (smart10/smart30),
// сводимые маппером okaps_menu_status к 7 клиентским этапам:
// Регистрация → Новая заявка → На рассмотрении → Одобрена → Средства выданы → Мониторинг → Завершена.
// В прод поле = реальный workflow_status из Temporal; здесь — демо-лестница для ручного показа.
var StatusLadder = []string{
	"new",                  // Регистрация заявки
	"scoring_in_progress",  // Новая заявка
	"expertise",            // На рассмотрении
	"cc_approved",          // Одобрена
	"collateral_valuation", // Оценка залога
	"contract_signing",     // Договор
	"disbursed",            // Средства выданы
	"monitoring",           // Мониторинг
	"completed",            // Завершена
}

// StatusIndex возвращает позицию статуса в лестнице (или -1, если это не этап лестницы).
func StatusIndex(status string) int {
	for i, s := range StatusLadder {
		if s == status {
			return i
		}
	}
	return -1
}

// StatusRejected — терминальный статус отказа (ветка вне основной лестницы).
const StatusRejected = "rejected"

// NextStatus возвращает следующий этап лестницы; на последнем этапе и в отказе — тот же статус.
func NextStatus(cur string) string {
	if cur == StatusRejected {
		return cur // отказ терминален
	}
	for i, s := range StatusLadder {
		if s == cur {
			if i+1 < len(StatusLadder) {
				return StatusLadder[i+1]
			}
			return cur
		}
	}
	// неизвестный статус → начинаем с первого этапа
	return StatusLadder[0]
}

// ValidStatus сообщает, допустим ли статус (этап лестницы или отказ).
func ValidStatus(s string) bool {
	if s == StatusRejected {
		return true
	}
	for _, x := range StatusLadder {
		if x == s {
			return true
		}
	}
	return false
}

// GetApplication возвращает заявку клиента по uid (с проверкой владельца).
func (s *Store) GetApplication(ctx context.Context, uid, clientUID uuid.UUID) (Application, error) {
	var a Application
	err := s.pool.QueryRow(ctx, `
		SELECT uid, number, client_uid, program_id, loan_purpose, requested_amount, onboarding, status, created_at
		  FROM applications WHERE uid=$1 AND client_uid=$2`, uid, clientUID).
		Scan(&a.UID, &a.Number, &a.ClientUID, &a.ProgramID, &a.LoanPurpose,
			&a.Amount, &a.Onboarding, &a.Status, &a.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Application{}, ErrNotFound
	}
	if err != nil {
		return Application{}, fmt.Errorf("store: get application: %w", err)
	}
	return a, nil
}

// SetApplicationStatus меняет статус заявки клиента и возвращает обновлённую запись.
func (s *Store) SetApplicationStatus(ctx context.Context, uid, clientUID uuid.UUID, status string) (Application, error) {
	var a Application
	err := s.pool.QueryRow(ctx, `
		UPDATE applications SET status=$3
		 WHERE uid=$1 AND client_uid=$2
		RETURNING uid, number, client_uid, program_id, loan_purpose, requested_amount, onboarding, status, created_at`,
		uid, clientUID, status).
		Scan(&a.UID, &a.Number, &a.ClientUID, &a.ProgramID, &a.LoanPurpose,
			&a.Amount, &a.Onboarding, &a.Status, &a.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Application{}, ErrNotFound
	}
	if err != nil {
		return Application{}, fmt.Errorf("store: set status: %w", err)
	}
	return a, nil
}

// ClearApplications удаляет все заявки и их документы (разовая очистка демо).
// Клиентов/аккаунты не трогает. Возвращает число удалённых заявок.
func (s *Store) ClearApplications(ctx context.Context) (int64, error) {
	if _, err := s.pool.Exec(ctx, `DELETE FROM application_documents`); err != nil {
		return 0, fmt.Errorf("store: clear application_documents: %w", err)
	}
	ct, err := s.pool.Exec(ctx, `DELETE FROM applications`)
	if err != nil {
		return 0, fmt.Errorf("store: clear applications: %w", err)
	}
	// Сбрасываем нумерацию, чтобы демо начиналось с AKK-<год>-000001.
	_, _ = s.pool.Exec(ctx, `ALTER SEQUENCE application_number_seq RESTART WITH 1`)
	return ct.RowsAffected(), nil
}

// ListApplications возвращает заявки клиента (новые сверху).
func (s *Store) ListApplications(ctx context.Context, clientUID uuid.UUID) ([]Application, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT uid, number, client_uid, program_id, loan_purpose, requested_amount, onboarding, status, created_at
		  FROM applications WHERE client_uid=$1 ORDER BY created_at DESC`, clientUID)
	if err != nil {
		return nil, fmt.Errorf("store: list applications: %w", err)
	}
	defer rows.Close()

	var out []Application
	for rows.Next() {
		var a Application
		if err := rows.Scan(&a.UID, &a.Number, &a.ClientUID, &a.ProgramID, &a.LoanPurpose,
			&a.Amount, &a.Onboarding, &a.Status, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("store: scan application: %w", err)
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// --- Application documents ----------------------------------------------

// AppDocument — действие пользователя по требованию (загрузка/подписание).
// Каталог требований (название, источник, этап) живёт в коде; здесь — только факт действия.
type AppDocument struct {
	ID             uuid.UUID
	ApplicationUID uuid.UUID
	RequirementKey string
	Status         string
	FileName       *string
	UploadedAt     *time.Time
	CreatedAt      time.Time
}

// ListAppDocuments возвращает загруженные документы заявки (с проверкой владельца через JOIN).
func (s *Store) ListAppDocuments(ctx context.Context, appUID, clientUID uuid.UUID) ([]AppDocument, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT d.id, d.application_uid, d.requirement_key, d.status, d.file_name, d.uploaded_at, d.created_at
		  FROM application_documents d
		  JOIN applications a ON a.uid = d.application_uid
		 WHERE d.application_uid=$1 AND a.client_uid=$2`, appUID, clientUID)
	if err != nil {
		return nil, fmt.Errorf("store: list app documents: %w", err)
	}
	defer rows.Close()

	var out []AppDocument
	for rows.Next() {
		var d AppDocument
		if err := rows.Scan(&d.ID, &d.ApplicationUID, &d.RequirementKey, &d.Status,
			&d.FileName, &d.UploadedAt, &d.CreatedAt); err != nil {
			return nil, fmt.Errorf("store: scan app document: %w", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// UpsertAppDocument помечает требование как загруженное (идемпотентно по requirement_key).
// Сначала проверяет владельца заявки, затем INSERT ... ON CONFLICT.
func (s *Store) UpsertAppDocument(ctx context.Context, appUID, clientUID uuid.UUID, reqKey, fileName string) (AppDocument, error) {
	if _, err := s.GetApplication(ctx, appUID, clientUID); err != nil {
		return AppDocument{}, err // ErrNotFound пробрасывается
	}
	var d AppDocument
	var fn *string
	if fileName != "" {
		fn = &fileName
	}
	err := s.pool.QueryRow(ctx, `
		INSERT INTO application_documents (id, application_uid, requirement_key, status, file_name, uploaded_at)
		VALUES ($1,$2,$3,'uploaded',$4, now())
		ON CONFLICT (application_uid, requirement_key)
		DO UPDATE SET status='uploaded', file_name=EXCLUDED.file_name, uploaded_at=now()
		RETURNING id, application_uid, requirement_key, status, file_name, uploaded_at, created_at`,
		uuid.New(), appUID, reqKey, fn).
		Scan(&d.ID, &d.ApplicationUID, &d.RequirementKey, &d.Status, &d.FileName, &d.UploadedAt, &d.CreatedAt)
	if err != nil {
		return AppDocument{}, fmt.Errorf("store: upsert app document: %w", err)
	}
	return d, nil
}
