// Package ai — ассистивное извлечение ключевых полей документа через Claude (vision).
// Бизнес-правило: результат ВСЕГДА требует подтверждения человеком — мы ничего не
// принимаем в заявку молча. Без ANTHROPIC_API_KEY функция выключена (ErrNotConfigured).
package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// ErrNotConfigured — ANTHROPIC_API_KEY не задан, ИИ-распознавание недоступно.
var ErrNotConfigured = errors.New("ai: not configured")

// Amount — денежная сумма из документа (метка + значение строкой, без парсинга чисел).
type Amount struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// Fields — извлечённые поля документа. Ассистивно: показываются на подтверждение.
type Fields struct {
	DocumentType string   `json:"document_type"`
	FullName     string   `json:"full_name"`
	IIN          string   `json:"iin"`
	IssueDate    string   `json:"issue_date"`
	Period       string   `json:"period"`
	Issuer       string   `json:"issuer"`
	Amounts      []Amount `json:"amounts"`
	Confidence   float64  `json:"confidence"`
}

// Extractor — обёртка над Claude Messages API для извлечения полей.
type Extractor struct {
	client anthropic.Client
	model  anthropic.Model
}

// NewExtractor читает ANTHROPIC_API_KEY (+ опц. ANTHROPIC_MODEL) из окружения.
// Возвращает nil, если ключ не задан — вызывающий трактует это как «не настроено».
func NewExtractor() *Extractor {
	key := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY"))
	if key == "" {
		return nil
	}
	model := anthropic.Model(strings.TrimSpace(os.Getenv("ANTHROPIC_MODEL")))
	if model == "" {
		model = anthropic.ModelClaudeHaiku4_5 // дёшево и достаточно для OCR-извлечения
	}
	return &Extractor{
		client: anthropic.NewClient(option.WithAPIKey(key)),
		model:  model,
	}
}

const systemPrompt = `Ты извлекаешь ключевые поля из отсканированного документа заёмщика (Казахстан): ` +
	`удостоверение личности, справки, налоговые декларации, страховые полисы и т.п. ` +
	`Возвращай результат ТОЛЬКО через инструмент extract_fields. ` +
	`Бери лишь то, что реально видно в документе — ничего не выдумывай. ` +
	`Если поля нет — верни пустую строку. ИИН — ровно 12 цифр. Даты — в формате YYYY-MM-DD. ` +
	`confidence — твоя общая уверенность в распознавании от 0 до 1.`

// Схема извлечения. strict tool use требует additionalProperties:false и перечисления
// всех ключей в required (необязательные поля модель отдаёт пустой строкой).
var (
	extractProperties = map[string]any{
		"document_type": map[string]any{"type": "string", "description": "Тип документа, напр. «Справка о доходах»."},
		"full_name":     map[string]any{"type": "string", "description": "ФИО владельца документа, или пустая строка."},
		"iin":           map[string]any{"type": "string", "description": "ИИН (12 цифр), или пустая строка."},
		"issue_date":    map[string]any{"type": "string", "description": "Дата документа в формате YYYY-MM-DD, или пустая строка."},
		"period":        map[string]any{"type": "string", "description": "Отчётный период, если есть (напр. «2024–2025»), иначе пустая строка."},
		"issuer":        map[string]any{"type": "string", "description": "Кем выдан документ, или пустая строка."},
		"amounts": map[string]any{
			"type":        "array",
			"description": "Ключевые денежные суммы документа: метка + значение строкой.",
			"items": map[string]any{
				"type":                 "object",
				"additionalProperties": false,
				"properties": map[string]any{
					"label": map[string]any{"type": "string"},
					"value": map[string]any{"type": "string"},
				},
				"required": []string{"label", "value"},
			},
		},
		"confidence": map[string]any{"type": "number", "description": "Уверенность распознавания от 0 до 1."},
	}
	extractRequired = []string{"document_type", "full_name", "iin", "issue_date", "period", "issuer", "amounts", "confidence"}
)

// Extract отправляет файл (image/* или application/pdf) в Claude и возвращает поля.
func (e *Extractor) Extract(ctx context.Context, contentType string, data []byte) (Fields, error) {
	b64 := base64.StdEncoding.EncodeToString(data)

	var fileBlock anthropic.ContentBlockParamUnion
	switch {
	case contentType == "application/pdf":
		fileBlock = anthropic.ContentBlockParamUnion{OfDocument: &anthropic.DocumentBlockParam{
			Source: anthropic.DocumentBlockParamSourceUnion{
				OfBase64: &anthropic.Base64PDFSourceParam{Data: b64},
			},
		}}
	case strings.HasPrefix(contentType, "image/"):
		fileBlock = anthropic.NewImageBlockBase64(contentType, b64)
	default:
		return Fields{}, fmt.Errorf("ai: unsupported content type %q", contentType)
	}

	tool := anthropic.ToolParam{
		Name:        "extract_fields",
		Description: anthropic.String("Сохранить извлечённые ключевые поля документа."),
		Strict:      anthropic.Bool(true),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties:  extractProperties,
			Required:    extractRequired,
			ExtraFields: map[string]any{"additionalProperties": false},
		},
	}

	resp, err := e.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:      e.model,
		MaxTokens:  1024,
		System:     []anthropic.TextBlockParam{{Text: systemPrompt}},
		Tools:      []anthropic.ToolUnionParam{{OfTool: &tool}},
		ToolChoice: anthropic.ToolChoiceParamOfTool("extract_fields"),
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				fileBlock,
				anthropic.NewTextBlock("Извлеки ключевые поля из этого документа."),
			),
		},
	})
	if err != nil {
		return Fields{}, fmt.Errorf("ai: messages: %w", err)
	}

	for _, block := range resp.Content {
		if block.Type == "tool_use" {
			var f Fields
			if err := json.Unmarshal(block.Input, &f); err != nil {
				return Fields{}, fmt.Errorf("ai: parse tool input: %w", err)
			}
			return sanitize(f), nil
		}
	}
	return Fields{}, errors.New("ai: модель не вернула extract_fields")
}

// sanitize чистит строковые поля: иногда модель (особенно на пустых полях)
// вместо пустой строки протекает служебными токенами формата tool-call
// («<…parameter…>», теги). Такие значения обнуляем, остальное — тримим.
func sanitize(f Fields) Fields {
	f.DocumentType = cleanField(f.DocumentType)
	f.FullName = cleanField(f.FullName)
	f.IIN = cleanField(f.IIN)
	f.IssueDate = cleanField(f.IssueDate)
	f.Period = cleanField(f.Period)
	f.Issuer = cleanField(f.Issuer)
	out := f.Amounts[:0]
	for _, a := range f.Amounts {
		a.Label, a.Value = cleanField(a.Label), cleanField(a.Value)
		if a.Label != "" || a.Value != "" {
			out = append(out, a)
		}
	}
	f.Amounts = out
	return f
}

// cleanField обнуляет значение со следами tool-call-разметки, иначе тримит пробелы.
func cleanField(s string) string {
	s = strings.TrimSpace(s)
	low := strings.ToLower(s)
	if strings.ContainsAny(s, "<>") || strings.Contains(low, "antml") || strings.Contains(low, "parameter name") {
		return ""
	}
	return s
}
