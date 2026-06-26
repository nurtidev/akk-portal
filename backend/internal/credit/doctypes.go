package credit

import "time"

// DocTypeMeta — тип документа личного хранилища «Мои документы».
// Reusable=true → документ хранится на уровне клиента и переиспользуется между
// заявками (не нужно собирать стопку заново). ValidityDays — срок годности:
// 0 = бессрочно (действует по сроку самого документа).
type DocTypeMeta struct {
	Key          string `json:"key"`
	Title        string `json:"title"`
	Source       string `json:"source"`        // gov | upload | sign
	ValidityDays int    `json:"validity_days"` // 0 = бессрочно
	Reusable     bool   `json:"reusable"`
}

// VaultDocTypes — каталог переиспользуемых документов клиента.
// ВНИМАНИЕ: validity_days — консервативные ДЕФОЛТЫ.
// TODO: сверить точные сроки справок с регламентом П АКК 002-207-22
// (особенно tax_clearance/credit_history/income_ref — короткоживущие справки).
var VaultDocTypes = []DocTypeMeta{
	{Key: "id_card", Title: "Удостоверение личности", Source: "gov", ValidityDays: 0, Reusable: true},
	{Key: "reg_docs", Title: "Документы о регистрации (ИП/ЮЛ)", Source: "upload", ValidityDays: 0, Reusable: true},
	{Key: "land_right", Title: "Документ на право землепользования", Source: "gov", ValidityDays: 0, Reusable: true},
	{Key: "fin_statements", Title: "Финансовая отчётность / налоговая декларация (за 2 года)", Source: "upload", ValidityDays: 365, Reusable: true},
	{Key: "income_ref", Title: "Справка о доходах", Source: "upload", ValidityDays: 30, Reusable: true},
	{Key: "tax_clearance", Title: "Справка об отсутствии налоговой задолженности (КГД)", Source: "gov", ValidityDays: 30, Reusable: true},
	{Key: "credit_history", Title: "Кредитная история (ПКБ/ГКБ)", Source: "gov", ValidityDays: 30, Reusable: true},
	{Key: "consent_pd", Title: "Согласие на обработку персональных данных", Source: "sign", ValidityDays: 365, Reusable: true},
}

// vaultDocType возвращает метаданные типа по ключу.
func vaultDocType(key string) (DocTypeMeta, bool) {
	for _, d := range VaultDocTypes {
		if d.Key == key {
			return d, true
		}
	}
	return DocTypeMeta{}, false
}

// Статусы документа в хранилище (для UI-бейджей).
const (
	VaultMissing  = "missing"  // нет в хранилище
	VaultValid    = "valid"    // действует
	VaultExpiring = "expiring" // истекает скоро (<= порога)
	VaultExpired  = "expired"  // просрочен — обновить
)

// expiringThresholdDays — за сколько дней до конца помечаем «истекает».
const expiringThresholdDays = 7

// vaultStatus вычисляет статус по сроку действия относительно now.
// validUntil == nil трактуется как бессрочный (valid).
func vaultStatus(validUntil *time.Time, now time.Time) string {
	if validUntil == nil {
		return VaultValid
	}
	switch {
	case now.After(*validUntil):
		return VaultExpired
	case now.AddDate(0, 0, expiringThresholdDays).After(*validUntil):
		return VaultExpiring
	default:
		return VaultValid
	}
}

// computeValidUntil возвращает дату окончания действия по типу и дате выдачи.
// Для бессрочных (ValidityDays==0) — nil.
func computeValidUntil(meta DocTypeMeta, issuedAt time.Time) *time.Time {
	if meta.ValidityDays <= 0 {
		return nil
	}
	v := issuedAt.AddDate(0, 0, meta.ValidityDays)
	return &v
}
