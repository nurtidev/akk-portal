# Картинки для ленты «АКК в цифрах» (ImpactMarquee)

Карточка = фото 16:9 сверху + текст под ним (как на карточках программ).
Компонент ищет `/img/impact/<key>.jpg`. Пока файла нет — зелёный градиент-фолбэк.

**Стиль и промты** — в [`docs/IMAGE_PROMPTS.md`](../../../../docs/IMAGE_PROMPTS.md)
→ раздел «Лента «АКК в цифрах»». Фотореалистично, «золотой час», как img/programs/*.jpg.

Файлы: `meat.jpg`, `oil.jpg`, `greenhouses.jpg`, `borrowers.jpg`, `bread.jpg`, `budget.jpg`.
Формат: JPG 16:9, ширина ≥1600px, ≤400 КБ (прогнать через squoosh / `sips -Z 2000`).
