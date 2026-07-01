// =====================================================
// ГОЛДЕН-ФИКСТУРА: легаси-функции из index.html, скопированы ДОСЛОВНО.
// Назначение — эталон для golden-тестов трека A: вывод новых TS-функций
// сверяется с этим легаси-кодом на сетке входов. Расхождение = баг переноса.
//
// НЕ редактировать логику. Единственные правки против оригинала:
//   - вынесены зависимости (PROGRAMS/QUESTIONS/FAJR_NORMS) как локальные данные;
//   - DOM-зависимые функции (scoredPrograms/effectiveMaxTerm/calculateStress)
//     параметризованы answers/state вместо обращения к глобальному `state`,
//     чтобы их можно было вызывать чисто (расчётная часть осталась дословной);
//   - track()/renderAnalytics() и прочий UI выкинуты — здесь только расчёты.
//   - module.exports в конце.
//
// Источник: index.html строки ≈2389–3060 и ≈3868–3968.
// =====================================================

// ---- Данные: PROGRAMS (≈2389–2505) ----
const PROGRAMS = [
  { id: 'ken_dala', title: 'Кең дала', category: 'Посевная · через КТ', hidden: true,
    org: 'АО «Аграрная кредитная корпорация»',
    description: 'Финансирование оборотных средств на весенне-полевые и уборочные работы. Программа ориентирована на финансовые институты — прямые заёмщики получают финансирование через кредитные товарищества, МФО, БВУ или РИЦ.',
    rate: 1.5, rateNote: '1,5% годовых для финучреждений. Прямые заёмщики получают финансирование через КТ/МФО/БВУ/РИЦ — конечная ставка устанавливается посредником.',
    maxAmount: 10000000000, maxTerm: 18, scheduleType: 'biannual_winter',
    scheduleNote: 'Срок до 10 марта года, следующего за годом проведения финансируемых ВПРиУР.',
    hard: [{ q: 'purpose', v: ['__never__'] }],
    soft: [],
    indirectOnly: true
  },
  { id: 'ken_dala_2', title: 'Кең дала 2', category: 'Посевная и уборка',
    org: 'АО «Аграрная кредитная корпорация»',
    description: 'Финансирование весенне-полевых и уборочных работ под гарантию АО «ФРП «Даму». Погашение двумя платежами — после уборки урожая и в марте.',
    rate: 5, rateNote: '5% годовых (ГЭСВ от 5%) для прямых заёмщиков, 1,5% для финучреждений. Сумма рассчитывается по нормативу затрат на 1 га посевной площади, но не более 1,5 млрд ₸ под гарантию Даму (покрытие 85% суммы займа).',
    maxAmount: 1500000000, maxTerm: 18, scheduleType: 'biannual_winter',
    scheduleNote: 'Для прямых заёмщиков: 50% — до 05 декабря года финансирования, 50% — до 05 марта следующего года. Через КТ/МФО/РИЦ/СПК — 10/10.',
    hard: [{ q: 'purpose', v: ['vprir'] }, { q: 'sector', v: ['plant', 'processing'] }],
    soft: [
      { q: 'experience', v: ['3plus'], w: 40 },
      { q: 'experience', v: ['1-3'], w: 20 },
      { q: 'sector', v: ['plant'], w: 25 },
      { q: 'amount', v: ['20-100m', '100-500m', '500m-plus'], w: 35 }
    ],
    featured: true
  },
  { id: 'agrobusiness', title: 'Агробизнес', category: 'Инвестиции',
    org: 'АО «Аграрная кредитная корпорация»',
    description: 'Универсальная программа на основные средства, СМР и пополнение оборотных средств. Финансирование за счёт собственных и привлечённых средств АКК.',
    rate: 21.5, rateRange: 'НБРК+7,5%', rateTip: 'Базовая ставка Нацбанка (НБ РК) + 7,5%. Итог зависит от ставки Нацбанка — на начало 2026 это около 21,5%. Дешевле — 5% за счёт облигационного займа.',
    rateNote: 'Базовая ставка НБ РК + 7,5% годовых для прямых заёмщиков (≈21,5% на 01.2026, собственные/привлечённые средства АКК). Альтернативно — 5% годовых за счёт облигационного займа. ОС/СМР — до 144 мес (по РБ), ПОС — до 48 мес, облигационный заём — до 12 мес. Универсальная программа: подходит и для покупки биоактивов (МРС, лошади, верблюды и др.), когда специализированные программы (Игілік/Береке) не подходят.',
    maxAmount: 15000000000, maxTerm: 144, scheduleType: 'annual',
    scheduleNote: 'Погашение не реже одного раза в год. Срок зависит от цели: ОС/СМР по РБ — до 144 мес, ОС/СМР по СС/ПС/ЭПВ/ДКЗ — до 120 мес, ПОС — 24 мес (возобновляемая КЛ) или 48 мес (невозобновляемая), ПОС по ПСС — до 12 мес.',
    termByPurpose: { investments: 144, working: 48 },
    hard: [{ q: 'purpose', v: ['investments', 'working', 'livestock'] }, { q: 'sector', v: ['plant', 'animal', 'poultry', 'processing'] }],
    soft: [
      { q: 'experience', v: ['3plus'], w: 35 },
      { q: 'experience', v: ['1-3'], w: 20 },
      { q: 'amount', v: ['100-500m', '500m-plus'], w: 30 },
      { q: 'amount', v: ['20-100m'], w: 20 },
      { q: 'sector', v: ['processing', 'animal'], w: 15 },
      { q: 'animalType', v: ['MRS', 'HORSE', 'CAMEL'], w: 20 }
    ]
  },
  { id: 'igilik_bereke', title: 'Игілік и Береке', category: 'Племенной скот КРС',
    org: 'АО «Аграрная кредитная корпорация»',
    description: 'Покупка племенного поголовья КРС (импортного или отечественного). Игілік — от 100 до 499 голов, Береке — от 500 голов (требуется опыт от 2 лет). Мясное и молочное направления.',
    rate: 6, rateNote: '6% годовых (ГЭСВ от 6%) для прямых заёмщиков, 3% для КТ/БВУ/СПК (маржа не более 3%). Субсидированная ставка по средствам республиканского бюджета. Только КРС.',
    maxAmount: 5000000000, maxTerm: 108, scheduleType: 'annual',
    scheduleNote: 'Срок — до 108 мес. Льготный период по погашению основного долга и вознаграждения — до 36 мес. График — по Приложению №3.',
    hard: [
      { q: 'purpose', v: ['livestock'] },
      { q: 'sector', v: ['animal'] },
      { q: 'animalType', v: ['KRS'] },
      { q: 'heads', v: ['100-499', '500plus'] }
    ],
    soft: [
      { q: 'experience', v: ['3plus'], w: 50 },
      { q: 'experience', v: ['1-3'], w: 25 },
      { q: 'amount', v: ['100-500m', '500m-plus'], w: 35 },
      { q: 'amount', v: ['20-100m'], w: 20 },
      { q: 'animalType', v: ['KRS'], w: 20 }
    ],
    hasStressTest: true
  },
  { id: 'isker', title: 'Іскер', category: 'Микрокредит',
    org: 'АО «Аграрная кредитная корпорация»',
    description: 'Микрокредиты для начинающих фермеров, сельских предпринимателей и стартапов. До 8 000 МРП (~34,6 млн ₸ на 2026), упрощённые требования к опыту.',
    rate: 6, rateNote: '6% годовых (ГЭСВ от 6%) для прямых заёмщиков, 4% — для членов малообеспеченных и/или многодетных семей. Лимит — 8 000 МРП (≈ 34,6 млн ₸ при МРП на 2026 году 4 325 ₸). Срок: до 60 мес для большинства целей, до 84 мес — для животноводства.',
    maxAmount: 34600000, maxTerm: 84, scheduleType: 'annual',
    termByPurpose: { vprir: 60, feedlot: 60, investments: 60, working: 60, micro: 60 },
    scheduleNote: 'Погашение не реже одного раза в год. Возможен индивидуальный график для микрокредитования.',
    hard: [{ q: 'amount', v: ['under-20m', '20-100m'] }],
    soft: [
      { q: 'amount', v: ['under-20m'], w: 35 },
      { q: 'amount', v: ['20-100m'], w: 15 },
      { q: 'purpose', v: ['micro', 'vprir', 'livestock'], w: 30 },
      { q: 'location', v: ['village', 'small-town'], w: 25 },
      { q: 'experience', v: ['startup', 'under-1', '1-3'], w: 25 },
      { q: 'sector', v: ['animal', 'plant', 'services'], w: 20 },
      { q: 'animalType', v: ['MRS', 'HORSE', 'CAMEL'], w: 20 }
    ]
  },
  { id: 'feedlot_poultry', title: 'Откормплощадки и птицефабрики', category: 'Откорм и птицефабрики',
    org: 'Программа «Агробизнес животноводство», направление 2',
    description: 'Финансирование откормочных площадок КРС и МРС, а также птицефабрик мясного и яичного направления. Источник — привлечённые субсидируемые средства (ПСС).',
    rate: 5, rateNote: '5% годовых (ГЭСВ от 5%) для прямых заёмщиков, 1,5% для финучреждений. Субсидированная ставка по ПСС.',
    maxAmount: 15000000000, maxTerm: 36, scheduleType: 'annual',
    scheduleNote: 'Кредитная линия до 36 месяцев; срок отдельного транша до 12 месяцев. Погашение по графику Кредитного комитета — не позднее срока обращения облигаций/срока привлечения ПСС.',
    hard: [{ q: 'purpose', v: ['feedlot'] }],
    soft: [
      { q: 'experience', v: ['3plus'], w: 40 },
      { q: 'experience', v: ['1-3'], w: 20 },
      { q: 'sector', v: ['poultry', 'animal'], w: 25 },
      { q: 'amount', v: ['100-500m', '500m-plus'], w: 30 },
      { q: 'amount', v: ['20-100m'], w: 20 }
    ]
  },
  { id: 'agrobusiness_2', title: 'Агробизнес 2.0', category: 'Льготные инвестиции',
    org: 'АО «Аграрная кредитная корпорация»',
    description: 'Льготное долгосрочное кредитование инвестиционных проектов сельхозпроизводителей. Самый длинный срок среди программ АКК — до 15 лет.',
    rate: 12.6, rateNote: '12,6% годовых (ГЭСВ от 12,6%) для прямых заёмщиков. Через БВУ — 2% годовых (номинальная ставка для конечных заёмщиков не более 12,6%). Инвестиционные цели (ОС/СМР) — до 180 мес, пополнение оборотных средств (ПОС) — до 48 мес.',
    maxAmount: 15000000000, maxTerm: 180, scheduleType: 'annual',
    scheduleNote: 'Погашение не реже одного раза в год по графику бизнес-плана. Возможен льготный период по решению Кредитного комитета.',
    termByPurpose: { investments: 180, working: 48 },
    hard: [{ q: 'purpose', v: ['investments', 'working'] }],
    soft: [
      { q: 'experience', v: ['3plus'], w: 45 },
      { q: 'experience', v: ['1-3'], w: 20 },
      { q: 'amount', v: ['500m-plus'], w: 35 },
      { q: 'amount', v: ['100-500m'], w: 25 },
      { q: 'sector', v: ['processing', 'animal', 'plant'], w: 20 }
    ]
  },
  { id: 'aquaculture', title: 'Аквакультура', category: 'Рыбоводство',
    org: 'Программа «Агробизнес животноводство», направление «Аквакультура»',
    description: 'Финансирование рыбоводных хозяйств (аквакультуры): основные средства и СМР. Направление программы «Агробизнес животноводство» за счёт средств республиканского бюджета.',
    rate: 6, rateNote: '6% годовых (ГЭСВ от 6%) для прямых заёмщиков, 3% для КТ/БВУ/СПК (маржа не более 3%). Источник — республиканский бюджет. Минимальная мощность — от 7 тонн в год.',
    maxAmount: 5000000000, maxTerm: 108, scheduleType: 'annual',
    scheduleNote: 'Срок — до 108 мес. Льготный период по погашению основного долга и вознаграждения — до 36 мес.',
    hard: [{ q: 'purpose', v: ['__never__'] }],
    soft: []
  },
  { id: 'zhailau', title: 'Жайлау', category: 'Фермы-репродукторы · через КТ',
    org: 'Программа «Агробизнес животноводство», направление «Жайлау»',
    description: 'Создание новых ферм-репродукторов КРС (от 300 голов) или овец (от 1000 голов). Финансирование через КТ, БВУ и СПК за счёт средств республиканского бюджета.',
    rate: 3, rateNote: '3% годовых (ГЭСВ от 3%) для конечных заёмщиков через КТ/БВУ/СПК (маржа не более 3%). Источник — республиканский бюджет. На конечного заёмщика: до 350 млн ₸ (КРС) / 200 млн ₸ (овцы).',
    maxAmount: 350000000, maxTerm: 120, scheduleType: 'annual',
    scheduleNote: 'Срок — до 120 мес. Льготный период по погашению основного долга и вознаграждения — до 24 мес. Создание новых ферм-репродукторов: от 300 голов КРС / от 1000 овец.',
    hard: [{ q: 'purpose', v: ['__never__'] }],
    soft: [],
    indirectOnly: true
  },
  { id: 'greenhouse_garden', title: 'Тепличные хозяйства и сады', category: 'Теплицы и сады',
    org: 'Программа «Агробизнес», направление тепличные хозяйства/сады',
    description: 'Пополнение оборотных средств для тепличных хозяйств и садов. Источник — привлечённые субсидируемые средства (ПСС), под гарантию «Даму».',
    rate: 5, rateNote: '5% годовых (ГЭСВ от 5%) для прямых заёмщиков, 1,5% для финучреждений (БВУ/МФО/РИЦ, маржа не более 3,5%). Источник — ПСС. Обеспечение — гарантия «Даму» на 85% либо залог.',
    maxAmount: 15000000000, maxTerm: 36, scheduleType: 'annual',
    termByPurpose: { working: 36 },
    scheduleNote: 'Кредитная линия до 36 мес, отдельный транш до 15 мес. Только пополнение оборотных средств (ПОС). Сумма — до 25% от собственного капитала АКК.',
    hard: [{ q: 'purpose', v: ['__never__'] }],
    soft: []
  }
];

// ---- Данные: QUESTIONS + условные вопросы (≈2659–2746) ----
const QUESTIONS = [
  { key: 'purpose', short: 'Цель', title: 'Что хотите профинансировать?', hint: 'Выберите основную цель кредита',
    options: [
      { value: 'vprir', label: 'Весенне-полевые и уборочные работы', desc: 'ВПРиУР: семена, ГСМ, удобрения, средства защиты' },
      { value: 'livestock', label: 'Покупка скота', desc: 'КРС, МРС, лошади, верблюды — племенной или товарный' },
      { value: 'feedlot', label: 'Откорм или птицеводство', desc: 'Откормочные площадки, птицефабрики' },
      { value: 'investments', label: 'Инвестиции, покупка основных средств', desc: 'Оборудование, техника, СМР, расширение' },
      { value: 'working', label: 'Пополнение оборотных средств', desc: 'ПОС: сырьё, переработка, межсезонье' },
      { value: 'micro', label: 'Микрокредит, стартап', desc: 'Небольшая сумма до 35 млн ₸' }
    ]
  },
  { key: 'sector', short: 'Отрасль', title: 'Ваша основная отрасль?',
    options: [
      { value: 'plant', label: 'Растениеводство' },
      { value: 'animal', label: 'Животноводство' },
      { value: 'poultry', label: 'Птицеводство или откорм' },
      { value: 'processing', label: 'Переработка сельхозпродукции' },
      { value: 'services', label: 'Услуги, торговля, прочее' }
    ]
  },
  { key: 'experience', short: 'Опыт', title: 'Сколько лет ведёте деятельность?',
    options: [
      { value: 'startup', label: 'Только открываюсь' },
      { value: 'under-1', label: 'До 1 года' },
      { value: '1-3', label: '1 – 3 года' },
      { value: '3plus', label: 'Более 3 лет' }
    ]
  },
  { key: 'location', short: 'Регион', title: 'Где находитесь?',
    options: [
      { value: 'village', label: 'Село' },
      { value: 'small-town', label: 'Малый город (до 50 тыс. жителей)' },
      { value: 'regional-center', label: 'Областной центр' },
      { value: 'metro', label: 'Алматы, Астана, Шымкент, Актау, Атырау' }
    ]
  },
  { key: 'amount', short: 'Сумма', title: 'Какая сумма нужна?',
    options: [
      { value: 'under-20m', label: 'До 20 млн ₸' },
      { value: '20-100m', label: '20 – 100 млн ₸' },
      { value: '100-500m', label: '100 – 500 млн ₸' },
      { value: '500m-plus', label: 'Более 500 млн ₸' }
    ]
  }
];

const ANIMAL_TYPE_Q = {
  key: 'animalType', short: 'Вид', title: 'Какой вид животных планируете приобрести?',
  hint: 'Влияет на подбор программы и нормативы стресс-теста',
  options: [
    { value: 'KRS', label: 'КРС', desc: 'Крупный рогатый скот — мясное или молочное направление' },
    { value: 'MRS', label: 'МРС', desc: 'Мелкий рогатый скот — овцы, козы' },
    { value: 'HORSE', label: 'Лошади', desc: 'Коневодство' },
    { value: 'CAMEL', label: 'Верблюды', desc: 'Верблюдоводство' }
  ]
};

const HEADS_Q = {
  key: 'heads', short: 'Головы', title: 'Сколько голов планируете приобрести?',
  options: [
    { value: 'under-100', label: 'До 100 голов' },
    { value: '100-499', label: '100 – 499 голов' },
    { value: '500plus', label: '500 голов и более' }
  ]
};

const PURPOSE_TO_SECTOR = {
  vprir: 'plant',
  livestock: 'animal',
  feedlot: 'poultry'
};

const REGION_PURPOSES = ['feedlot', 'working', 'micro'];

// ---- Данные: FAJR_NORMS (≈2751–2811) ----
const FAJR_NORMS = {
  KRS: {
    label: 'КРС (мясное/молочное)',
    cowShare: 0.5,
    milkPerDay: 8,
    lactationDays: 305,
    milkPricePerL: 90,
    avgWeightSale: 400,
    meatPricePerKg: 1500,
    saleShare: 0.15,
    yearlyFeedCost: 350000,
    yearlyVetCost: 3000,
    yearlyOther: 100000,
    pastureHaPerHead: 3,
    minBarnSqmPerHead: 3
  },
  MRS: {
    label: 'МРС (овцы, козы)',
    cowShare: 0,
    milkPerDay: 0,
    lactationDays: 0,
    milkPricePerL: 0,
    avgWeightSale: 45,
    meatPricePerKg: 2200,
    saleShare: 0.25,
    yearlyFeedCost: 45000,
    yearlyVetCost: 800,
    yearlyOther: 15000,
    pastureHaPerHead: 0.5,
    minBarnSqmPerHead: 1
  },
  HORSE: {
    label: 'Лошади',
    cowShare: 0,
    milkPerDay: 0,
    lactationDays: 0,
    milkPricePerL: 0,
    avgWeightSale: 380,
    meatPricePerKg: 2500,
    saleShare: 0.12,
    yearlyFeedCost: 280000,
    yearlyVetCost: 4000,
    yearlyOther: 80000,
    pastureHaPerHead: 3,
    minBarnSqmPerHead: 3
  },
  CAMEL: {
    label: 'Верблюды',
    cowShare: 0,
    milkPerDay: 0,
    lactationDays: 0,
    milkPricePerL: 0,
    avgWeightSale: 450,
    meatPricePerKg: 2200,
    saleShare: 0.10,
    yearlyFeedCost: 220000,
    yearlyVetCost: 4500,
    yearlyOther: 90000,
    pastureHaPerHead: 3,
    minBarnSqmPerHead: 3
  }
};

// ---- format helpers (≈2865–2897) ----
function fmtAmount(v) {
  if (v >= 1e9) return (Math.round(v / 1e8) / 10).toLocaleString('ru-RU') + ' млрд ₸';
  if (v >= 1e6) return Math.round(v / 1e6).toLocaleString('ru-RU') + ' млн ₸';
  if (v >= 1e3) return Math.round(v / 1e3).toLocaleString('ru-RU') + ' тыс ₸';
  return Math.round(v).toLocaleString('ru-RU') + ' ₸';
}
function declension(n, one, few, many) {
  const m = Math.abs(n) % 100;
  if (m >= 11 && m <= 14) return many;
  const r = m % 10;
  if (r === 1) return one;
  if (r >= 2 && r <= 4) return few;
  return many;
}

// ---- getQuestions (≈2898–2916), параметризован answers ----
function getQuestions(answers) {
  const purpose = answers.purpose;
  const base = QUESTIONS.filter(function (q) {
    if (q.key === 'sector') return !purpose || !PURPOSE_TO_SECTOR[purpose];
    if (q.key === 'location') return !purpose || REGION_PURPOSES.includes(purpose);
    return true;
  });
  if (purpose === 'livestock') {
    const livestockQs = [ANIMAL_TYPE_Q];
    livestockQs.push(HEADS_Q);
    return base.concat(livestockQs);
  }
  return base;
}

// ---- optionLabel/questionShort (≈2918–2938) ----
const ALL_QUESTIONS = QUESTIONS.concat([ANIMAL_TYPE_Q, HEADS_Q]);
function questionByKey(key) {
  for (let i = 0; i < ALL_QUESTIONS.length; i++) {
    if (ALL_QUESTIONS[i].key === key) return ALL_QUESTIONS[i];
  }
  return null;
}
function optionLabel(key, value) {
  const q = questionByKey(key);
  if (!q) return value;
  for (let i = 0; i < q.options.length; i++) {
    if (q.options[i].value === value) return q.options[i].label;
  }
  return value;
}
function questionShort(key) {
  const q = questionByKey(key);
  return q ? q.short : key;
}

// ---- explainProgram / scoreProgram (≈2944–2992) ----
function explainProgram(prog, answers) {
  const passedHard = prog.hard.every(function (rule) {
    return rule.v.includes(answers[rule.q]);
  });
  const byQ = {};
  const order = [];
  prog.soft.forEach(function (rule) {
    if (!byQ[rule.q]) { byQ[rule.q] = []; order.push(rule.q); }
    byQ[rule.q].push(rule);
  });
  const softFactors = [];
  order.forEach(function (q) {
    const have = answers[q];
    if (have == null) return;
    let maxW = 0;
    let matched = null;
    byQ[q].forEach(function (r) {
      if (r.w > maxW) maxW = r.w;
      if (matched == null && r.v.includes(have)) matched = r;
    });
    const bestValues = [];
    byQ[q].forEach(function (r) {
      if (r.w !== maxW) return;
      r.v.forEach(function (v) { if (bestValues.indexOf(v) === -1) bestValues.push(v); });
    });
    softFactors.push({
      q: q,
      short: questionShort(q),
      label: optionLabel(q, have),
      w: matched ? matched.w : 0,
      maxW: maxW,
      bestLabel: bestValues.map(function (v) { return optionLabel(q, v); }).join(' или ')
    });
  });
  const rawScore = softFactors.reduce(function (s, f) { return s + f.w; }, 0);
  return {
    passedHard: passedHard,
    softFactors: softFactors,
    rawScore: rawScore,
    score: passedHard ? Math.min(100, rawScore) : null
  };
}

function scoreProgram(prog, answers) {
  return explainProgram(prog, answers).score;
}

function pickInitialTerm(maxT) {
  const opts = [12, 24, 36, 48, 60, 84];
  for (let i = opts.length - 1; i >= 0; i--) {
    if (opts[i] <= maxT) return opts[i];
  }
  return maxT;
}

// effectiveMaxTerm (≈3001–3006), параметризован answers
function effectiveMaxTerm(p, answers) {
  if (p.termByPurpose && answers.purpose && p.termByPurpose[answers.purpose]) {
    return Math.min(p.maxTerm, p.termByPurpose[answers.purpose]);
  }
  return p.maxTerm;
}

// calculateSchedule (≈3008–3053)
function calculateSchedule(program, amount, termMonths) {
  const rate = program.rate;
  if (program.scheduleType === 'biannual_winter') {
    const r = rate / 100 / 12;
    const half = amount / 2;
    const monthsToDec = 8;
    const monthsDecToMar = 3;
    const intDec = amount * r * monthsToDec;
    const intMar = half * r * monthsDecToMar;
    return {
      type: 'biannual',
      payments: [
        { label: '05 декабря', amount: half + intDec, interest: intDec, note: 'после уборки урожая' },
        { label: '05 марта', amount: half + intMar, interest: intMar, note: 'окончательный расчёт' }
      ],
      total: amount + intDec + intMar,
      overpay: intDec + intMar
    };
  }
  const years = Math.max(1, Math.round(termMonths / 12));
  const annualPrincipal = amount / years;
  let totalInterest = 0;
  let remaining = amount;
  const yearly = [];
  for (let y = 1; y <= years; y++) {
    const yearInterest = remaining * rate / 100;
    totalInterest += yearInterest;
    yearly.push({
      year: y,
      principal: annualPrincipal,
      interest: yearInterest,
      payment: annualPrincipal + yearInterest
    });
    remaining -= annualPrincipal;
  }
  return {
    type: 'annual',
    years: years,
    yearly: yearly,
    firstYearPayment: yearly[0].payment,
    lastYearPayment: yearly[yearly.length - 1].payment,
    avgPayment: (amount + totalInterest) / years,
    total: amount + totalInterest,
    overpay: totalInterest
  };
}

// scoredPrograms (≈3055–3060), параметризован answers
function scoredPrograms(answers) {
  return PROGRAMS
    .map(function (p) { return { program: p, score: scoreProgram(p, answers) }; })
    .filter(function (x) { return x.score !== null && x.score >= 20; })
    .sort(function (a, b) { return b.score - a.score; });
}

// ---- calculateStress (≈3868–3968) ----
// Параметризован: вместо global state/selectedProgram передаём program, calc, stress.
// Расчётная часть и формулы — дословны. Текст вердиктов сохранён.
function calculateStress(p, calc, stress) {
  const c = calc;
  const sch = calculateSchedule(p, c.amount, c.term);

  const animalType = stress.animalType || 'KRS';
  const norms = FAJR_NORMS[animalType] || FAJR_NORMS.KRS;

  const existing = Number(stress.existingHerd) || 0;
  const planned = Number(stress.plannedHerd) || 0;
  const pastures = Number(stress.pasturesHa) || 0;
  const barn = Number(stress.barnSqm) || 0;
  const existingDebtsMonthly = Number(stress.existingDebtsMonthly) * 1000 || 0;
  const annualRevenue = Number(stress.annualRevenue) * 1e6 || 0;

  const totalHerd = existing + planned;

  const cowCount = Math.round(totalHerd * norms.cowShare);
  const milkRevenue = cowCount * norms.milkPerDay * norms.lactationDays * norms.milkPricePerL;

  const meatRevenue = Math.round(totalHerd * norms.saleShare) * norms.avgWeightSale * norms.meatPricePerKg;

  const expectedIncome = milkRevenue + meatRevenue + annualRevenue;
  const yearlyCosts = totalHerd * (norms.yearlyFeedCost + norms.yearlyVetCost + norms.yearlyOther);
  const netIncome = expectedIncome - yearlyCosts;

  const yearlyPayment = sch.firstYearPayment;
  const existingDebtsYearly = existingDebtsMonthly * 12;
  const totalYearlyPayment = yearlyPayment + existingDebtsYearly;

  const ratio = netIncome > 0 ? (totalYearlyPayment / netIncome) * 100 : 999;

  const pastureNeeded = totalHerd * norms.pastureHaPerHead;
  const pastureOk = pastures >= pastureNeeded;
  const barnNeeded = totalHerd * norms.minBarnSqmPerHead;
  const barnOk = barn >= barnNeeded;

  let verdict;
  if (!pastureOk) {
    verdict = {
      level: 'warn',
      icon: '!',
      title: 'Недостаточно пастбищ',
      text: 'Для стада ' + totalHerd + ' голов (' + norms.label + ') нужно минимум ' +
        pastureNeeded.toFixed(0) + ' га пастбищ (норматив ' + norms.pastureHaPerHead +
        ' га/голову). У вас ' + pastures + ' га. Менеджер уточнит варианты — аренда у соседних хозяйств, договоры о совместной деятельности.'
    };
  } else if (!barnOk) {
    verdict = {
      level: 'warn',
      icon: '!',
      title: 'Недостаточно помещений',
      text: 'Для стада ' + totalHerd + ' голов нужно минимум ' + barnNeeded.toFixed(0) +
        ' м² помещений (норматив ' + norms.minBarnSqmPerHead + ' м²/голову). У вас ' + barn +
        ' м². Часть займа может пойти на СМР — обсудите с менеджером.'
    };
  } else if (ratio < 30) {
    verdict = {
      level: 'ok',
      icon: '✓',
      title: 'Платёж комфортный',
      text: 'Совокупный годовой платёж' + (existingDebtsYearly > 0 ? ' (включая текущие обязательства)' : '') +
        ' составляет около ' + ratio.toFixed(0) + '% от ожидаемого чистого дохода — это безопасный уровень. Скорее всего проект пройдёт финансовую экспертизу.'
    };
  } else if (ratio < 50) {
    verdict = {
      level: 'warn',
      icon: '!',
      title: 'Платёж напряжённый',
      text: 'Совокупный годовой платёж — около ' + ratio.toFixed(0) + '% дохода. Это рабочий уровень, но менеджер попросит подтвердить резервы и обсудит график с льготным периодом. Может потребоваться более длинный срок.'
    };
  } else {
    verdict = {
      level: 'bad',
      icon: '✕',
      title: 'Платёж может быть тяжёлым',
      text: 'Совокупный годовой платёж — около ' + ratio.toFixed(0) + '% дохода. Это высокая нагрузка. Рекомендуем рассмотреть программу с меньшей суммой или более длинным сроком, либо обсудить с менеджером возможность льготного периода.'
    };
  }

  return {
    verdict: verdict,
    animalLabel: norms.label,
    expectedIncome: expectedIncome,
    yearlyCosts: yearlyCosts,
    netIncome: netIncome,
    yearlyPayment: yearlyPayment,
    existingDebtsYearly: existingDebtsYearly,
    totalYearlyPayment: totalYearlyPayment,
    ratio: ratio,
    pastureNeeded: pastureNeeded,
    pastureOk: pastureOk,
    barnNeeded: barnNeeded,
    barnOk: barnOk,
    totalHerd: totalHerd
  };
}

module.exports = {
  PROGRAMS,
  QUESTIONS,
  ANIMAL_TYPE_Q,
  HEADS_Q,
  FAJR_NORMS,
  fmtAmount,
  declension,
  getQuestions,
  optionLabel,
  questionShort,
  explainProgram,
  scoreProgram,
  pickInitialTerm,
  effectiveMaxTerm,
  calculateSchedule,
  scoredPrograms,
  calculateStress
};
