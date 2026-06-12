// web/src/lib/pdf-checklist.ts
// Клиентская генерация PDF-чеклиста документов.
// Используется через dynamic import при клике (не тянет jsPDF в основной бандл).
// ВАЖНО: весь код выполняется в браузере — Date.now(), fetch() и window — доступны.

import type { ProgramChecklist } from '@/data/loan-documents';

export interface ChecklistPdfOptions {
  programId: string;
  programTitle: string;
  programCategory: string;
  rate: number;
  rateRange?: string;
  maxAmount: number;
  maxTerm: number;
  checklist: ProgramChecklist;
  locale: 'ru' | 'kk' | 'en';
}

// Локализованные строки для PDF
const PDF_STRINGS = {
  ru: {
    orgName: 'АО «Аграрная кредитная корпорация»',
    title: 'Чеклист документов',
    subtitle: 'для подачи заявки по программе',
    programParams: 'Параметры программы',
    rate: 'Ставка',
    amount: 'Макс. сумма',
    term: 'Макс. срок',
    months: 'мес.',
    required: 'обязательно',
    optional: 'может потребоваться',
    disclaimer:
      'Демонстрационный документ. Точный перечень документов уточняйте у менеджера по тел. 1408 или в ближайшем филиале АКК.',
    generated: 'Сформирован',
  },
  kk: {
    orgName: '«Аграрлық кредиттік корпорация» АҚ',
    title: 'Құжаттар тізімі',
    subtitle: 'бағдарлама бойынша өтінім беру үшін',
    programParams: 'Бағдарлама параметрлері',
    rate: 'Мөлшерлеме',
    amount: 'Ең жоғары сома',
    term: 'Ең ұзақ мерзім',
    months: 'ай',
    required: 'міндетті',
    optional: 'қажет болуы мүмкін',
    disclaimer:
      'Демонстрациялық құжат. Дәл құжаттар тізімін 1408 телефоны немесе жақын АКК филиалы арқылы нақтылаңыз.',
    generated: 'Жасалды',
  },
  en: {
    orgName: 'АО «Аграрная кредитная корпорация»',
    title: 'Чеклист документов',
    subtitle: 'для подачи заявки по программе',
    programParams: 'Параметры программы',
    rate: 'Ставка',
    amount: 'Макс. сумма',
    term: 'Макс. срок',
    months: 'мес.',
    required: 'обязательно',
    optional: 'может потребоваться',
    disclaimer:
      'Демонстрационный документ. Точный перечень документов уточняйте у менеджера по тел. 1408 или в ближайшем филиале АКК.',
    generated: 'Сформирован',
  },
} as const;

function fmtAmountPdf(n: number): string {
  if (n >= 1_000_000_000)
    return (
      (n / 1_000_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млрд ₸'
    );
  if (n >= 1_000_000)
    return (
      (n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' млн ₸'
    );
  return n.toLocaleString('ru-RU') + ' ₸';
}

export async function generateChecklistPdf(opts: ChecklistPdfOptions): Promise<void> {
  // Dynamic import — не тянем jsPDF в основной бандл
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // --- Загружаем и регистрируем кириллический шрифт ---
  // Шрифт хранится в /public/fonts/Roboto-Regular.ttf
  // Fetch выполняется в браузере — path относительный от origin
  let fontLoaded = false;
  try {
    const fontResp = await fetch('/fonts/Roboto-Regular.ttf');
    if (fontResp.ok) {
      const fontBuffer = await fontResp.arrayBuffer();
      const fontBase64 = btoa(
        new Uint8Array(fontBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          '',
        ),
      );
      doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');
      fontLoaded = true;
    }
  } catch {
    // Если шрифт не загрузился — продолжаем с дефолтным; кириллица может не отобразиться
    console.warn('[PDF] Font load failed, falling back to default font');
  }

  if (!fontLoaded) {
    doc.setFont('Helvetica');
  }

  const s = PDF_STRINGS[opts.locale] ?? PDF_STRINGS.ru;
  const PRIMARY_RGB: [number, number, number] = [7, 102, 61];
  const GRAY_RGB: [number, number, number] = [100, 100, 100];
  const DARK_RGB: [number, number, number] = [30, 30, 30];
  const LIGHT_GREEN_RGB: [number, number, number] = [235, 247, 241];

  const pageW = 210;
  const pageH = 297;
  const ML = 15; // margin left
  const MR = 15; // margin right
  const contentW = pageW - ML - MR;
  let y = 0;

  // --- Шапка ---
  doc.setFillColor(...PRIMARY_RGB);
  doc.rect(0, 0, pageW, 28, 'F');

  // Логотип-текст АКК
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(s.orgName, ML, 10);

  // Название документа
  doc.setFontSize(14);
  doc.text(s.title, ML, 19);
  doc.setFontSize(9);
  doc.text(`${s.subtitle} «${opts.programTitle}»`, ML, 25);

  y = 36;

  // --- Блок параметров программы ---
  doc.setFillColor(...LIGHT_GREEN_RGB);
  doc.roundedRect(ML, y, contentW, 20, 2, 2, 'F');
  doc.setTextColor(...PRIMARY_RGB);
  doc.setFontSize(8);
  doc.text(s.programParams + ':', ML + 4, y + 5);

  doc.setTextColor(...DARK_RGB);
  doc.setFontSize(8);
  const rateStr = opts.rateRange
    ? `${opts.rateRange} (${opts.rate}%)`
    : `${opts.rate}%`;
  doc.text(`${s.rate}: ${rateStr}`, ML + 4, y + 11);
  doc.text(`${s.amount}: ${fmtAmountPdf(opts.maxAmount)}`, ML + 4 + contentW * 0.35, y + 11);
  doc.text(`${s.term}: ${opts.maxTerm} ${s.months}`, ML + 4 + contentW * 0.7, y + 11);
  doc.text(opts.programCategory, ML + 4, y + 17);

  y += 26;

  // --- Список документов по категориям ---
  let pageNum = 1;

  const drawFooter = (page: number) => {
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageH - 18, pageW, 18, 'F');
    doc.setTextColor(...GRAY_RGB);
    doc.setFontSize(6.5);
    doc.text(s.disclaimer, ML, pageH - 11, { maxWidth: contentW - 20 });
    const now = new Date();
    const dateStr = `${s.generated}: ${now.toLocaleDateString('ru-RU')}`;
    doc.text(dateStr, pageW - MR, pageH - 6, { align: 'right' });
    doc.text(String(page), pageW / 2, pageH - 6, { align: 'center' });
  };

  const checkNewPage = (neededHeight: number) => {
    if (y + neededHeight > pageH - 25) {
      drawFooter(pageNum);
      doc.addPage();
      pageNum++;
      y = 15;
    }
  };

  const drawCheckbox = (cx: number, cy: number) => {
    doc.setDrawColor(...PRIMARY_RGB);
    doc.setLineWidth(0.3);
    doc.rect(cx, cy - 3, 4, 4);
  };

  for (const category of opts.checklist) {
    checkNewPage(14);

    // Заголовок категории
    doc.setFillColor(...PRIMARY_RGB);
    doc.roundedRect(ML, y, contentW, 8, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    const catTitle = opts.locale === 'kk' ? category.titleKk : category.title;
    doc.text(catTitle, ML + 4, y + 5.5);
    y += 11;

    for (const item of category.items) {
      const itemTitle = opts.locale === 'kk' ? item.titleKk : item.title;
      // Wrap text to measure height
      const lines = doc.splitTextToSize(itemTitle, contentW - 16);
      const itemH = lines.length * 4.5 + 5;
      checkNewPage(itemH);

      // Чекбокс-квадратик (пустой — для ручной отметки)
      drawCheckbox(ML + 2, y + 2);

      // Текст документа
      doc.setTextColor(...DARK_RGB);
      doc.setFontSize(8);
      doc.text(lines, ML + 8, y + 2);

      // Метка необязательности
      if (!item.required) {
        doc.setTextColor(...GRAY_RGB);
        doc.setFontSize(6.5);
        doc.text(`(${s.optional})`, ML + 8, y + itemH - 2.5);
      }

      y += itemH;
    }

    y += 3; // отступ между категориями
  }

  // Нижний колонтитул последней страницы
  drawFooter(pageNum);

  // --- Скачиваем PDF ---
  const fileName = `AKK-checklist-${opts.programId}.pdf`;
  doc.save(fileName);
}
