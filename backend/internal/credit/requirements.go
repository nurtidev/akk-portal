package credit

import (
	"time"

	"akk-railway-backend/internal/store"
)

// DocReq — требование к документу на конкретном этапе.
// Каталог статичен (живёт в коде), а факт загрузки/подписания хранится в application_documents.
type DocReq struct {
	Key            string   // стабильный идентификатор требования
	Title          string   // человекочитаемое название
	Source         string   // gov | upload | sign
	Provenance     string   // поимённый источник для gov (КГД/ПКБ/ГБД ФЛ/…); пусто для upload/sign
	StageStatusKey string   // статус лестницы, к которому относится документ
	ProgramOnly    []string // пусто = для всех программ; иначе — только для перечисленных program_id
}

// Requirements — перечень документов по этапам (по нормативам П АКК 002-207-22).
// gov  — подтягивается из госисточников автоматически (считается verified);
// upload — заёмщик загружает файл;
// sign — заёмщик подписывает ЭЦП.
var Requirements = []DocReq{
	// new — Регистрация заявки
	{"id_card", "Удостоверение личности", "gov", "ГБД ФЛ", "new", nil},
	// Финотчётность из госбаз НЕ подтягивается (только благонадёжность/ПКБ) — заёмщик прикладывает сам.
	{"fin_statements", "Финансовая отчётность / налоговая декларация (за 2 года)", "upload", "", "expertise", nil},
	// expertise — На рассмотрении
	{"business_plan", "Бизнес-план / проектная смета", "upload", "", "expertise", nil},
	{"land_right", "Право на землю / договор аренды", "gov", "Регистр недвижимости", "expertise", nil},
	{"tax_clearance", "Справка об отсутствии налоговой задолженности (КГД)", "gov", "КГД", "expertise", nil},
	{"credit_history", "Кредитная история (ПКБ)", "gov", "ПКБ", "expertise", nil},
	// collateral_valuation — Оценка залога
	{"valuation_report", "Оценочное заключение по залогу", "upload", "", "collateral_valuation", nil},
	{"pledge_contract", "Договор залога", "sign", "", "collateral_valuation", nil},
	{"insurance_policy", "Страховой полис имущества", "upload", "", "collateral_valuation", nil},
	{"livestock_insurance", "Страхование скота", "upload", "", "collateral_valuation", []string{"igilik_bereke", "feedlot_poultry"}},
	// contract_signing — Договор
	{"loan_contract", "Договор займа (подписание)", "sign", "", "contract_signing", nil},
	{"pledge_signed", "Договор залога (подписание)", "sign", "", "contract_signing", nil},
	{"special_account", "Открытие спецсчёта для контроля расходов", "gov", "Спецсчёт АКК", "contract_signing", nil},
	// disbursed — Средства выданы
	{"drawdown_request", "Заявка на выборку средств", "sign", "", "disbursed", nil},
}

// RequirementTitle возвращает человекочитаемое название требования по ключу
// (для админ-панели). Если ключ не найден в каталоге — возвращает сам ключ.
func RequirementTitle(key string) string {
	for _, r := range Requirements {
		if r.Key == key {
			return r.Title
		}
	}
	return key
}

// StageLabel возвращает ярлык этапа лестницы по статусу (или сам статус, если не этап).
func StageLabel(status string) string {
	if l, ok := stageLabels[status]; ok {
		return l
	}
	return status
}

// stageLabels — ярлыки этапов лестницы (зеркало клиентских APP_STAGES).
var stageLabels = map[string]string{
	"new":                  "Регистрация заявки",
	"scoring_in_progress":  "Новая заявка",
	"expertise":            "На рассмотрении",
	"cc_approved":          "Одобрена",
	"collateral_valuation": "Оценка залога",
	"contract_signing":     "Договор",
	"disbursed":            "Средства выданы",
	"monitoring":           "Мониторинг",
	"completed":            "Завершена",
}

// requirementsFor возвращает требования, применимые к программе (фильтр по ProgramOnly).
func requirementsFor(programID string) []DocReq {
	out := make([]DocReq, 0, len(Requirements))
	for _, r := range Requirements {
		if len(r.ProgramOnly) == 0 {
			out = append(out, r)
			continue
		}
		for _, p := range r.ProgramOnly {
			if p == programID {
				out = append(out, r)
				break
			}
		}
	}
	return out
}

// hasRequirement сообщает, существует ли требование с таким ключом для программы.
func hasRequirement(programID, key string) bool {
	for _, r := range requirementsFor(programID) {
		if r.Key == key {
			return true
		}
	}
	return false
}

// buildDocumentsDTO собирает ответ GET /applications/:uid/documents:
// требования каталога, сгруппированные по этапам лестницы, с подмешанным статусом действий.
// vault — личное хранилище клиента: валидные документы переиспользуются (не нужно
// загружать заново), просроченные помечаются needs_refresh.
func buildDocumentsDTO(app store.Application, stored []store.AppDocument, vault []store.ClientDocument, now time.Time) map[string]any {
	// факт действия по requirement_key
	type act struct {
		status   string
		fileName *string
	}
	done := make(map[string]act, len(stored))
	for _, d := range stored {
		done[d.RequirementKey] = act{status: d.Status, fileName: d.FileName}
	}
	vaultByType := make(map[string]store.ClientDocument, len(vault))
	for _, v := range vault {
		vaultByType[v.DocType] = v
	}

	reqs := requirementsFor(app.ProgramID)
	byStage := make(map[string][]map[string]any)
	for _, r := range reqs {
		status := "required"
		var fileName *string
		if r.Source == "gov" {
			status = "verified" // госданные подтягиваются автоматически
		}
		if a, ok := done[r.Key]; ok {
			status = a.status
			fileName = a.fileName
		}
		doc := map[string]any{
			"requirement_key": r.Key,
			"title":           r.Title,
			"source":          r.Source,
			"provenance":      r.Provenance,
			"status":          status,
			"file_name":       fileName,
		}
		// Переиспользование из «Моих документов»: если не загружено в самой заявке,
		// а в хранилище есть подходящий тип — закрываем требование (или просим обновить).
		if _, uploaded := done[r.Key]; !uploaded {
			if v, ok := vaultByType[r.Key]; ok {
				if vaultStatus(v.ValidUntil, now) == VaultExpired {
					doc["status"] = "required"
					doc["needs_refresh"] = true
				} else {
					doc["status"] = "verified"
					doc["from_vault"] = true
				}
				if v.ValidUntil != nil {
					doc["valid_until"] = v.ValidUntil.Format(dateLayout)
				}
			}
		}
		byStage[r.StageStatusKey] = append(byStage[r.StageStatusKey], doc)
	}

	stages := make([]map[string]any, 0, len(store.StatusLadder))
	for i, key := range store.StatusLadder {
		stages = append(stages, map[string]any{
			"status_key":  key,
			"stage_index": i,
			"label":       stageLabels[key],
			"documents":   nonNilDocs(byStage[key]),
		})
	}

	return map[string]any{
		"application_uid":     app.UID.String(),
		"current_status":      app.Status,
		"current_stage_index": store.StatusIndex(app.Status),
		"stages":              stages,
	}
}

func nonNilDocs(d []map[string]any) []map[string]any {
	if d == nil {
		return []map[string]any{}
	}
	return d
}
