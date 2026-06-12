// web/src/data/loan-documents.ts
// Мок-каталог документов по программам АКК для PDF-чеклиста.
// Содержание основано на backend/internal/credit/requirements.go и PROGRAM_DETAILS.requirements.
// НЕ дублирует programs.ts — только дополняет данными для чеклиста.

export interface DocItem {
  key: string;
  title: string; // Russian title
  titleKk: string; // Kazakh title
  required: boolean; // false = рекомендуется/может потребоваться
}

export interface DocCategory {
  key: string;
  title: string;
  titleKk: string;
  items: DocItem[];
}

export type ProgramChecklist = DocCategory[];

const COMMON_PERSONAL: DocCategory = {
  key: 'personal',
  title: 'Личные документы',
  titleKk: 'Жеке құжаттар',
  items: [
    {
      key: 'id_card',
      title: 'Удостоверение личности (обе стороны)',
      titleKk: 'Жеке куәлік (екі жағы)',
      required: true,
    },
    {
      key: 'iin',
      title: 'ИИН / копия свидетельства ИИН',
      titleKk: 'ЖСН / ЖСН куәлігінің көшірмесі',
      required: true,
    },
    {
      key: 'reg_docs',
      title: 'Документы о регистрации (свидетельство ИП / учредительные документы ЮЛ)',
      titleKk: 'Тіркеу құжаттары (ЖК куәлігі / заңды тұлға құжаттары)',
      required: true,
    },
  ],
};

const COMMON_FARM: DocCategory = {
  key: 'farm',
  title: 'Документы по хозяйству и залогу',
  titleKk: 'Шаруашылық және кепіл құжаттары',
  items: [
    {
      key: 'land_right',
      title: 'Документ на право землепользования (собственность или аренда)',
      titleKk: 'Жерді пайдалану құқығы (меншік немесе жалға алу)',
      required: true,
    },
    {
      key: 'valuation_report',
      title: 'Оценочное заключение по залоговому имуществу',
      titleKk: 'Кепілге берілген мүлікке бағалау қорытындысы',
      required: true,
    },
    {
      key: 'insurance_policy',
      title: 'Страховой полис имущества (оформляется при одобрении)',
      titleKk: 'Мүлік сақтандыру полисі (мақұлданған кезде рәсімделеді)',
      required: true,
    },
  ],
};

const COMMON_FINANCIAL: DocCategory = {
  key: 'financial',
  title: 'Финансовые документы',
  titleKk: 'Қаржылық құжаттар',
  items: [
    {
      key: 'fin_statements',
      title: 'Финансовая отчётность (или налоговая декларация) за последние 2 года',
      titleKk: 'Соңғы 2 жылдың қаржылық есебі (немесе салық декларациясы)',
      required: true,
    },
    {
      key: 'tax_clearance',
      title: 'Справка об отсутствии налоговой задолженности (КГД)',
      titleKk: 'Салық берешегінің жоқтығы туралы анықтама (МКК)',
      required: true,
    },
    {
      key: 'credit_history',
      title: 'Кредитная история (ПКБ/ГКБ — запрашивается с согласия заёмщика)',
      titleKk: 'Несие тарихы (ПКБ/ҒКБ — қарыз алушының келісімімен сұратылады)',
      required: true,
    },
  ],
};

const COMMON_CONSENTS: DocCategory = {
  key: 'consents',
  title: 'Согласия и формы',
  titleKk: 'Келісімдер мен нысандар',
  items: [
    {
      key: 'consent_personal',
      title: 'Согласие на обработку персональных данных',
      titleKk: 'Дербес деректерді өңдеуге келісім',
      required: true,
    },
    {
      key: 'consent_gbdfl',
      title: 'Согласие на запрос сведений из ГБД ФЛ',
      titleKk: 'ЖТ МДҚ-дан мәліметтер сұратуға келісім',
      required: true,
    },
    {
      key: 'consent_pkb',
      title: 'Согласие на запрос кредитной истории (ПКБ/ГКБ)',
      titleKk: 'Несие тарихын сұратуға келісім (ПКБ/ҒКБ)',
      required: true,
    },
    {
      key: 'application_form',
      title: 'Заявление-анкета заёмщика',
      titleKk: 'Қарыз алушының өтінім-сауалнамасы',
      required: true,
    },
  ],
};

// Упрощённый список для микрокредита Іскер
const ISKER_SPECIFIC: DocCategory = {
  key: 'isker_specific',
  title: 'Специфика Іскер (микрокредит)',
  titleKk: 'Іскер ерекшеліктері (микронесие)',
  items: [
    {
      key: 'bastau_cert',
      title: 'Сертификат «Бастау Бизнес» (если нет действующего бизнеса)',
      titleKk: '«Бастау Бизнес» сертификаты (жұмыс істейтін бизнес болмаса)',
      required: false,
    },
    {
      key: 'business_desc',
      title: 'Описание бизнес-идеи / мини-бизнес-план',
      titleKk: 'Бизнес-идея сипаттамасы / шағын бизнес-жоспар',
      required: true,
    },
  ],
};

// Расширенный список для инвестиционных программ (Агробизнес, Агробизнес 2.0)
const INVESTMENT_SPECIFIC: DocCategory = {
  key: 'investment_specific',
  title: 'Для инвестиционных проектов',
  titleKk: 'Инвестициялық жобалар үшін',
  items: [
    {
      key: 'business_plan',
      title: 'Бизнес-план / технико-экономическое обоснование (ТЭО)',
      titleKk: 'Бизнес-жоспар / техникалық-экономикалық негіздеме (ТЭН)',
      required: true,
    },
    {
      key: 'project_permits',
      title: 'Разрешительные документы по направлению деятельности',
      titleKk: 'Қызмет бағыты бойынша рұқсат беретін құжаттар',
      required: true,
    },
    {
      key: 'suppliers',
      title: 'Договоры с поставщиками / коммерческие предложения',
      titleKk: 'Жеткізушілермен шарттар / коммерциялық ұсыныстар',
      required: false,
    },
    {
      key: 'market_analysis',
      title: 'Рынок сбыта: договоры / письма о намерениях',
      titleKk: 'Өткізу нарығы: шарттар / ниет хаттары',
      required: false,
    },
  ],
};

// Специфика посевной (Кең дала 2)
const VPRIR_SPECIFIC: DocCategory = {
  key: 'vprir_specific',
  title: 'Для ВПРиУР (посевная)',
  titleKk: 'КЕжЖЖЖ үшін (егіс науқаны)',
  items: [
    {
      key: 'sowing_plan',
      title: 'Структура посевных площадей / план сева',
      titleKk: 'Егіс алқаптарының құрылымы / егіс жоспары',
      required: true,
    },
    {
      key: 'agro_expense_norm',
      title: 'Нормативный расчёт затрат на 1 га',
      titleKk: '1 гектарға шығын нормативтік есебі',
      required: true,
    },
    {
      key: 'damu_guarantee',
      title: 'Документы для гарантии «Даму» (если нужна гарантия до 1,5 млрд ₸)',
      titleKk: '«Даму» кепілдігі үшін құжаттар (1,5 млрд ₸-ге дейін кепілдік қажет болса)',
      required: false,
    },
  ],
};

// Специфика животноводства (Игілік/Береке)
const LIVESTOCK_SPECIFIC: DocCategory = {
  key: 'livestock_specific',
  title: 'Для племенного животноводства',
  titleKk: 'Асыл тұқымды мал шаруашылығы үшін',
  items: [
    {
      key: 'livestock_account',
      title: 'Учётный номер объекта производства в ИСЖ',
      titleKk: 'ИСЖ-дегі өндіріс объектісінің есептік нөмірі',
      required: true,
    },
    {
      key: 'iszhib_records',
      title: 'Выписка о поголовье из ИСЖИБ (ИС животных и биоресурсов)',
      titleKk: 'ИСЖИБ-тен мал басы туралы үзінді',
      required: true,
    },
    {
      key: 'livestock_insurance',
      title: 'Страхование приобретаемого скота',
      titleKk: 'Сатып алынатын малды сақтандыру',
      required: true,
    },
    {
      key: 'import_contract',
      title: 'Контракт на поставку импортного скота (или предварительный)',
      titleKk: 'Импорттық мал жеткізу шарты (немесе алдын ала)',
      required: true,
    },
    {
      key: 'pasture_docs',
      title: 'Документы на пастбища / договоры аренды',
      titleKk: 'Жайылымдарға құжаттар / жалдау шарттары',
      required: true,
    },
  ],
};

// Специфика откорма
const FEEDLOT_SPECIFIC: DocCategory = {
  key: 'feedlot_specific',
  title: 'Для откормплощадок и птицефабрик',
  titleKk: 'Бордақылау алаңдары мен құс фабрикалары үшін',
  items: [
    {
      key: 'feedlot_capacity',
      title: 'Документы на скотоместа (мощность): от 500 голов КРС или 1000 МРС',
      titleKk: 'Мал орны (қуаттылық) құжаттары: 500 бас ІҚМ немесе 1000 ұсақ малдан',
      required: true,
    },
    {
      key: 'feed_supply',
      title: 'Кормовая база: земельные документы или договоры на закуп кормов',
      titleKk: 'Жем-шөп базасы: жер құжаттары немесе жем-шөп сатып алу шарттары',
      required: true,
    },
    {
      key: 'livestock_insurance_feedlot',
      title: 'Страхование поголовья на откорм',
      titleKk: 'Бордақыланатын мал басын сақтандыру',
      required: true,
    },
  ],
};

// Маппинг: programId → список категорий документов
export const LOAN_DOCUMENTS: Record<string, ProgramChecklist> = {
  ken_dala_2: [
    COMMON_PERSONAL,
    VPRIR_SPECIFIC,
    {
      ...COMMON_FARM,
      items: [
        {
          key: 'land_right',
          title:
            'Документ на право землепользования (под посев, в собственности или долгосрочной аренде)',
          titleKk:
            'Жерді пайдалану құқығы (егіс үшін, меншік немесе ұзақмерзімді жалда)',
          required: true,
        },
        {
          key: 'valuation_report',
          title: 'Оценочное заключение по залоговому имуществу',
          titleKk: 'Кепілге берілген мүлікке бағалау қорытындысы',
          required: true,
        },
        {
          key: 'insurance_policy',
          title: 'Страхование залогового имущества',
          titleKk: 'Кепіл мүлкін сақтандыру',
          required: true,
        },
      ],
    },
    COMMON_FINANCIAL,
    COMMON_CONSENTS,
  ],
  agrobusiness: [
    COMMON_PERSONAL,
    INVESTMENT_SPECIFIC,
    COMMON_FARM,
    COMMON_FINANCIAL,
    COMMON_CONSENTS,
  ],
  igilik_bereke: [
    COMMON_PERSONAL,
    LIVESTOCK_SPECIFIC,
    COMMON_FINANCIAL,
    COMMON_CONSENTS,
  ],
  isker: [
    COMMON_PERSONAL,
    ISKER_SPECIFIC,
    {
      key: 'farm_simplified',
      title: 'Документы по залогу (при наличии)',
      titleKk: 'Кепіл құжаттары (болған жағдайда)',
      items: [
        {
          key: 'collateral_any',
          title: 'Документы на залоговое имущество (при его наличии)',
          titleKk: 'Кепілге берілген мүлік құжаттары (болған жағдайда)',
          required: false,
        },
      ],
    },
    COMMON_FINANCIAL,
    COMMON_CONSENTS,
  ],
  feedlot_poultry: [
    COMMON_PERSONAL,
    FEEDLOT_SPECIFIC,
    COMMON_FARM,
    COMMON_FINANCIAL,
    COMMON_CONSENTS,
  ],
  agrobusiness_2: [
    COMMON_PERSONAL,
    INVESTMENT_SPECIFIC,
    COMMON_FARM,
    COMMON_FINANCIAL,
    COMMON_CONSENTS,
  ],
};

// Запасной список для неизвестных программ
export const DEFAULT_CHECKLIST: ProgramChecklist = [
  COMMON_PERSONAL,
  COMMON_FARM,
  COMMON_FINANCIAL,
  COMMON_CONSENTS,
];

export function getChecklist(programId: string): ProgramChecklist {
  return LOAN_DOCUMENTS[programId] ?? DEFAULT_CHECKLIST;
}
