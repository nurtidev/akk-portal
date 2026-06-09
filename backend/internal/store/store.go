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
