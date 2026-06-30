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
-- Отметка «уведомления просмотрены до» (лёгкая модель read/unread без таблицы
-- уведомлений: непрочитано = событие новее этой метки). NULL = ещё не открывал.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notifications_seen_at TIMESTAMPTZ;

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
    admin_comment    TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_client ON applications(client_uid);
-- Колонка комментария кредитного администратора (доработка/отказ). ADD ... IF NOT EXISTS
-- для БД, созданных до появления админ-панели.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_comment TEXT NOT NULL DEFAULT '';
-- Момент последней смены статуса (для лёгкой модели read/unread уведомлений).
ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

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

-- Личное хранилище документов клиента («Мои документы»): переиспользуются
-- между заявками, со сроком действия (valid_until NULL = бессрочно).
CREATE TABLE IF NOT EXISTS client_documents (
    id          UUID PRIMARY KEY,
    client_uid  UUID NOT NULL REFERENCES clients(uid),
    doc_type    TEXT NOT NULL,
    file_name   TEXT,
    issued_at   TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_uid, doc_type)
);
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_uid);
-- Реальный файл документа хранится прямо в БД (bytea) — у прототипа нет внешнего
-- S3/MinIO, а ФС на Railway эфемерна. ADD ... IF NOT EXISTS для БД до появления загрузки.
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS file_data    BYTEA;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS file_size    BIGINT;
-- Метод подписи для sign-документов (согласие на ПД и т.п.): ecp | sms.
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS sign_method  TEXT;
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

// NotificationsSeenAt возвращает отметку «уведомления просмотрены до» (nil = ещё не открывал).
func (s *Store) NotificationsSeenAt(ctx context.Context, clientUID uuid.UUID) (*time.Time, error) {
	var seen *time.Time
	err := s.pool.QueryRow(ctx,
		`SELECT notifications_seen_at FROM clients WHERE uid=$1`, clientUID).Scan(&seen)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("store: notifications seen at: %w", err)
	}
	return seen, nil
}

// MarkNotificationsSeen ставит отметку просмотра уведомлений в now().
func (s *Store) MarkNotificationsSeen(ctx context.Context, clientUID uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE clients SET notifications_seen_at=now() WHERE uid=$1`, clientUID)
	if err != nil {
		return fmt.Errorf("store: mark notifications seen: %w", err)
	}
	return nil
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
	// AdminComment — комментарий администратора (доработка/отказ). Заполняется только
	// admin-запросами (см. admin.go); клиентские SELECT его не выбирают и оставляют "".
	AdminComment string
	CreatedAt    time.Time
	UpdatedAt    time.Time // момент последней смены статуса (для «непрочитанных»)
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

// Статусы вне основной лестницы (ветки отказа/отмены/доработки).
const (
	StatusRejected  = "rejected"  // отказ (скоринг/КК) — терминальный
	StatusCancelled = "cancelled" // самостоятельная отмена заёмщиком — терминальный
	StatusRework    = "rework"    // возврат на доработку администратором — НЕ терминальный
)

// terminalStatuses — конечные состояния заявки: дальнейшего движения нет.
// completed — финал основной лестницы; rejected/cancelled — ветки выхода.
var terminalStatuses = map[string]bool{
	StatusRejected:  true,
	StatusCancelled: true,
	"completed":     true,
}

// IsTerminal сообщает, находится ли заявка в конечном состоянии.
func IsTerminal(status string) bool { return terminalStatuses[status] }

// cancellableStatuses — этапы, на которых заёмщик может сам отменить заявку
// (до решения кредитного комитета: регистрация, скоринг, рассмотрение).
var cancellableStatuses = map[string]bool{
	"new":                 true,
	"scoring_in_progress": true,
	"expertise":           true,
}

// CanCancel сообщает, допустима ли самостоятельная отмена заёмщиком на текущем этапе.
func CanCancel(status string) bool { return cancellableStatuses[status] }

// NextStatus возвращает следующий этап лестницы; на последнем этапе и в терминале — тот же статус.
func NextStatus(cur string) string {
	if IsTerminal(cur) {
		return cur // отказ/отмена/финал терминальны
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

// ValidStatus сообщает, допустим ли статус (этап лестницы или ветка отказа/отмены/доработки).
func ValidStatus(s string) bool {
	if s == StatusRejected || s == StatusCancelled || s == StatusRework {
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
		UPDATE applications SET status=$3, updated_at=now()
		 WHERE uid=$1 AND client_uid=$2
		RETURNING uid, number, client_uid, program_id, loan_purpose, requested_amount, onboarding, status, created_at, updated_at`,
		uid, clientUID, status).
		Scan(&a.UID, &a.Number, &a.ClientUID, &a.ProgramID, &a.LoanPurpose,
			&a.Amount, &a.Onboarding, &a.Status, &a.CreatedAt, &a.UpdatedAt)
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
		SELECT uid, number, client_uid, program_id, loan_purpose, requested_amount, onboarding, status, created_at, updated_at
		  FROM applications WHERE client_uid=$1 ORDER BY created_at DESC`, clientUID)
	if err != nil {
		return nil, fmt.Errorf("store: list applications: %w", err)
	}
	defer rows.Close()

	var out []Application
	for rows.Next() {
		var a Application
		if err := rows.Scan(&a.UID, &a.Number, &a.ClientUID, &a.ProgramID, &a.LoanPurpose,
			&a.Amount, &a.Onboarding, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
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

// --- Client documents (личное хранилище «Мои документы») -----------------

// ClientDocument — документ в личном хранилище клиента (переиспользуемый).
type ClientDocument struct {
	ID          uuid.UUID
	ClientUID   uuid.UUID
	DocType     string
	FileName    *string
	ContentType *string
	FileSize    *int64
	HasFile     bool    // в БД лежат байты файла (file_data IS NOT NULL)
	SignMethod  *string // метод подписи для sign-документов: ecp | sms
	IssuedAt    *time.Time
	ValidUntil  *time.Time // nil = бессрочно
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// ListClientDocuments возвращает все документы хранилища клиента.
// Байты файла (file_data) НЕ выбираются — только факт наличия (has_file) и метаданные.
func (s *Store) ListClientDocuments(ctx context.Context, clientUID uuid.UUID) ([]ClientDocument, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, client_uid, doc_type, file_name, content_type, file_size,
		       (file_data IS NOT NULL) AS has_file, sign_method, issued_at, valid_until, created_at, updated_at
		  FROM client_documents WHERE client_uid=$1 ORDER BY doc_type`, clientUID)
	if err != nil {
		return nil, fmt.Errorf("store: list client documents: %w", err)
	}
	defer rows.Close()

	var out []ClientDocument
	for rows.Next() {
		var d ClientDocument
		if err := rows.Scan(&d.ID, &d.ClientUID, &d.DocType, &d.FileName, &d.ContentType,
			&d.FileSize, &d.HasFile, &d.SignMethod, &d.IssuedAt, &d.ValidUntil, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, fmt.Errorf("store: scan client document: %w", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// UpsertClientDocument создаёт/обновляет документ хранилища (идемпотентно по doc_type).
func (s *Store) UpsertClientDocument(ctx context.Context, clientUID uuid.UUID, docType, fileName string, issuedAt, validUntil *time.Time) (ClientDocument, error) {
	var fn *string
	if fileName != "" {
		fn = &fileName
	}
	var d ClientDocument
	err := s.pool.QueryRow(ctx, `
		INSERT INTO client_documents (id, client_uid, doc_type, file_name, issued_at, valid_until, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6, now())
		ON CONFLICT (client_uid, doc_type)
		DO UPDATE SET file_name=EXCLUDED.file_name, issued_at=EXCLUDED.issued_at,
		              valid_until=EXCLUDED.valid_until, updated_at=now()
		RETURNING id, client_uid, doc_type, file_name, issued_at, valid_until, created_at, updated_at`,
		uuid.New(), clientUID, docType, fn, issuedAt, validUntil).
		Scan(&d.ID, &d.ClientUID, &d.DocType, &d.FileName, &d.IssuedAt, &d.ValidUntil, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return ClientDocument{}, fmt.Errorf("store: upsert client document: %w", err)
	}
	return d, nil
}

// UpsertClientDocumentFile сохраняет реальный файл документа (байты + content-type)
// в БД, идемпотентно по doc_type. Перезаписывает прежний файл при повторной загрузке.
func (s *Store) UpsertClientDocumentFile(ctx context.Context, clientUID uuid.UUID, docType, fileName, contentType string, data []byte, issuedAt, validUntil *time.Time) (ClientDocument, error) {
	var fn, ct *string
	if fileName != "" {
		fn = &fileName
	}
	if contentType != "" {
		ct = &contentType
	}
	size := int64(len(data))
	var d ClientDocument
	err := s.pool.QueryRow(ctx, `
		INSERT INTO client_documents (id, client_uid, doc_type, file_name, content_type, file_size, file_data, issued_at, valid_until, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
		ON CONFLICT (client_uid, doc_type)
		DO UPDATE SET file_name=EXCLUDED.file_name, content_type=EXCLUDED.content_type,
		              file_size=EXCLUDED.file_size, file_data=EXCLUDED.file_data,
		              issued_at=EXCLUDED.issued_at, valid_until=EXCLUDED.valid_until, updated_at=now()
		RETURNING id, client_uid, doc_type, file_name, content_type, file_size,
		          (file_data IS NOT NULL), issued_at, valid_until, created_at, updated_at`,
		uuid.New(), clientUID, docType, fn, ct, size, data, issuedAt, validUntil).
		Scan(&d.ID, &d.ClientUID, &d.DocType, &d.FileName, &d.ContentType, &d.FileSize,
			&d.HasFile, &d.IssuedAt, &d.ValidUntil, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return ClientDocument{}, fmt.Errorf("store: upsert client document file: %w", err)
	}
	return d, nil
}

// SignClientDocument помечает sign-документ подписанным выбранным методом (ecp|sms),
// идемпотентно по doc_type. Файл при этом не нужен — фиксируем сам факт подписи.
func (s *Store) SignClientDocument(ctx context.Context, clientUID uuid.UUID, docType, method string, issuedAt, validUntil *time.Time) (ClientDocument, error) {
	var d ClientDocument
	err := s.pool.QueryRow(ctx, `
		INSERT INTO client_documents (id, client_uid, doc_type, sign_method, issued_at, valid_until, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6, now())
		ON CONFLICT (client_uid, doc_type)
		DO UPDATE SET sign_method=EXCLUDED.sign_method, issued_at=EXCLUDED.issued_at,
		              valid_until=EXCLUDED.valid_until, updated_at=now()
		RETURNING id, client_uid, doc_type, file_name, content_type, file_size,
		          (file_data IS NOT NULL), sign_method, issued_at, valid_until, created_at, updated_at`,
		uuid.New(), clientUID, docType, method, issuedAt, validUntil).
		Scan(&d.ID, &d.ClientUID, &d.DocType, &d.FileName, &d.ContentType, &d.FileSize,
			&d.HasFile, &d.SignMethod, &d.IssuedAt, &d.ValidUntil, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return ClientDocument{}, fmt.Errorf("store: sign client document: %w", err)
	}
	return d, nil
}

// GetClientDocumentFile возвращает байты файла документа клиента (для превью/скачивания).
// ErrNotFound, если документа нет или у него ещё не загружен файл.
func (s *Store) GetClientDocumentFile(ctx context.Context, clientUID uuid.UUID, docType string) (fileName, contentType string, data []byte, err error) {
	var fn, ct *string
	err = s.pool.QueryRow(ctx, `
		SELECT file_name, content_type, file_data
		  FROM client_documents WHERE client_uid=$1 AND doc_type=$2`, clientUID, docType).
		Scan(&fn, &ct, &data)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", nil, ErrNotFound
	}
	if err != nil {
		return "", "", nil, fmt.Errorf("store: get client document file: %w", err)
	}
	if len(data) == 0 {
		return "", "", nil, ErrNotFound
	}
	name, mime := "", "application/octet-stream"
	if fn != nil {
		name = *fn
	}
	if ct != nil && *ct != "" {
		mime = *ct
	}
	return name, mime, data, nil
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
