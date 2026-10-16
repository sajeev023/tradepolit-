/**
 * src/lib/i18n/dictionaries/es.ts
 *
 * Spanish content dictionary for TradCopilot's SEO surface.
 * Targets both Spain and Latin America (neutral Spanish).
 *
 * IMPORTANT: This is NOT a machine translation. Content is written for
 * native Spanish search intent based on keyword research:
 *  - "análisis técnico con IA"
 *  - "asistente de trading con IA"
 *  - "análisis de gráficos con inteligencia artificial"
 *  - "diario de trading"
 *  - "gestión de riesgo en trading"
 *  - "indicadores técnicos"
 *  - "soporte y resistencia"
 *
 * Product terminology (TradCopilot, RSI, MACD, EMA, ATR, VWAP) is
 * preserved verbatim — traders use these English abbreviations globally.
 */

import type { Dictionary } from "./en";

export const dictionary: Dictionary = {
  common: {
    siteName: "TradCopilot",
    siteTagline: "Copiloto de Trading con IA para Análisis de Cripto & Forex",
    startFree: "Crear Cuenta Gratuita",
    startFreeNoCard: "Empieza gratis — sin tarjeta de crédito",
    seePricing: "Ver Precios",
    comparePlans: "Comparar planes",
    readDisclaimer: "Leer Aviso Legal",
    learnMore: "Más Información",
    readFullFaq: "Lee el FAQ completo",
    viewFeatures: "Mira Cómo Funciona",
    backToHome: "Volver al Inicio",
    disclaimerShort:
      "Análisis educativo — no constituye asesoramiento financiero. El trading conlleva un riesgo sustancial de pérdida.",
    nav: {
      howItWorks: "Cómo funciona",
      pricing: "Precios",
      faq: "FAQ",
      features: "Funciones",
      guides: "Guías",
    },
    footer: {
      product: "Producto",
      guidesAndCompare: "Guías & Comparaciones",
      legalAndTrust: "Legal & Confianza",
      copyright: "© {year} TradCopilot Inc. Todos los derechos reservados.",
      readOnlyDisclaimer:
        "Terminal analítico de solo lectura. No constituye asesoramiento financiero.",
    },
  },

  home: {
    meta: {
      title:
        "TradCopilot | Copiloto de Trading con IA para Análisis de Cripto & Forex",
      description:
        "Copiloto de trading con IA para day traders de cripto y forex: análisis técnico en vivo con RSI, MACD, EMA y ATR, diario de sesión automatizado, protecciones de comportamiento y herramientas de riesgo. Plan gratuito incluido.",
      keywords: [
        "copiloto de trading con IA",
        "asistente de trading IA",
        "herramienta de análisis de gráficos cripto",
        "análisis de mercado forex",
        "disciplina de trading",
      ],
    },
    h1: "Ejecuta tu plan de trading con",
    h1Italic: "disciplina institucional.",
    subtitle:
      "Telemetría de gráficos en tiempo real, diario de sesión persistente y protecciones de riesgo automatizadas en un espacio de trabajo enfocado.",
    faqHeading: "Preguntas frecuentes sobre el terminal",
    faqSubheading: "05 / PREGUNTAS",
  },

  aiTradingCopilot: {
    meta: {
      title:
        "¿Qué Es un Copiloto de Trading con IA? Definición, Capacidades y Límites",
      description:
        "Un copiloto de trading con IA es un software que utiliza inteligencia artificial para ayudarte a analizar mercados y mejorar tus decisiones — sin operar por ti. Cómo funciona la categoría, qué puede y qué no puede hacer, y cómo TradCopilot lo implementa.",
      keywords: [
        "qué es un copiloto de trading IA",
        "copiloto de trading con IA",
        "asistente de trading IA",
        "herramienta de análisis de mercado IA",
        "análisis de gráficos con IA",
      ],
    },
    eyebrow: "GUÍA DE CATEGORÍA",
    h1: "¿Qué es un",
    h1Italic: "copiloto de trading con IA?",
    intro:
      "Un copiloto de trading con IA es un software que utiliza modelos de inteligencia artificial para ayudarte a analizar mercados y mejorar tus decisiones de trading — sin operar por ti. Lee gráficos y datos de mercado, explica setups en lenguaje sencillo, mantiene memoria de tus sesiones anteriores y entrena disciplina, mientras tú mantienes el control total de cada orden.",
    definitionHeading: "La categoría, con precisión",
    definitionBody:
      'La palabra "copiloto" tiene un significado real aquí. Los copilotos de aviación no reemplazan a los pilotos — monitorizan instrumentos, verifican decisiones y alertan antes de que los errores se conviertan en accidentes.',
    limitsHeading: "Lo que un copiloto de trading con IA no puede hacer",
    faqHeading: "Preguntas comunes sobre copilotos de trading con IA",
    faqs: [
      {
        question: "¿Un copiloto de trading con IA ejecuta operaciones?",
        answer:
          "Un copiloto, por definición, no debería. Analiza, explica, registra y alerta mientras tú mantienes el control total de la ejecución. TradCopilot en particular no tiene ninguna funcionalidad de ejecución de órdenes, no custodia fondos y nunca se conecta a brokers o exchanges.",
      },
      {
        question:
          "¿Cuál es la diferencia entre un copiloto de trading con IA y un bot de trading?",
        answer:
          "Un bot automatiza decisiones y coloca órdenes en tu nombre. Un copiloto hace lo opuesto: mejora la calidad de tus decisiones — lecturas objetivas de indicadores, análisis estructurado de setups, alertas de comportamiento — pero el humano sigue siendo el ejecutor.",
      },
      {
        question:
          "¿Un copiloto de trading con IA puede predecir hacia dónde irá el precio?",
        answer:
          "Ningún sistema honesto va a afirmar eso. Los mercados son inciertos, y cualquier sistema que prometa predicciones garantizadas debe ser tratado como una señal de alerta.",
      },
    ],
  },

  aiChartAnalysis: {
    meta: {
      title:
        "Análisis de Gráficos con IA para Cripto & Forex — Cómo Funciona",
      description:
        "Análisis de gráficos con IA que calcula RSI, MACD, EMA, VWAP y soporte/resistencia a partir de velas en vivo, luego explica el setup a través de una carrera multi-modelo de IA.",
      keywords: [
        "análisis de gráficos con IA",
        "análisis técnico con inteligencia artificial",
        "herramienta de análisis de gráficos cripto",
        "soporte y resistencia automatizado",
      ],
    },
    eyebrow: "Cómo funciona el motor",
    h1: "Análisis de gráficos con IA basado en datos reales de velas",
    intro:
      "El análisis de gráficos con IA es el uso de modelos de aprendizaje automático para interpretar gráficos de precios — leyendo momentum, estructura de tendencia, volatilidad y niveles clave, y luego explicando lo que implican en lenguaje sencillo.",
    instrumentLayerHeading: "Lo que el motor de análisis calcula",
    judgmentLayerHeading: "De indicadores a un setup estructurado",
    pipelineHeading: "Cómo funciona el pipeline multi-modelo",
    coverageHeading: "Temporalidades y mercados",
    responsibleHeading: "Leyendo un análisis de forma responsable",
    faqHeading: "Preguntas frecuentes",
    ctaHeading: "Míralo funcionar en un gráfico en vivo",
    ctaBody:
      "Ejecuta un análisis en BTC, EUR/USD o cualquiera de los nueve instrumentos e inspecciona la telemetría — precio exacto, timestamp exacto, todas las etiquetas visibles.",
  },

  cryptoMarketAnalysis: {
    meta: {
      title:
        "Análisis de Mercado Cripto con IA — Análisis en Vivo de BTC, ETH & SOL",
      description:
        "Cómo TradCopilot analiza mercados cripto: datos de velas de Binance en tiempo real para BTC, ETH y SOL, RSI/MACD/EMA/ATR/VWAP calculados en servidor, tasas de funding, Fear & Greed y alertas de movimientos bruscos.",
      keywords: [
        "análisis de mercado cripto",
        "análisis de criptomonedas con IA",
        "herramienta de análisis BTC",
        "análisis técnico ethereum",
        "asistente cripto IA",
      ],
    },
    eyebrow: "MERCADOS · CRIPTO",
    h1: "Análisis de mercado cripto con IA en",
    h1Italic: "velas en vivo.",
    intro:
      "El mercado cripto nunca cierra, así que tu análisis no debería funcionar con datos desactualizados. TradCopilot calcula toda la lectura técnica a partir de streams de velas en tiempo real de BTC, ETH y SOL — luego explica el setup en lenguaje sencillo, registra la sesión y protege tus reglas de riesgo las 24 horas.",
    liveDataHeading: "Feeds en tiempo real, no capturas de pantalla",
    analysisHeading: "De indicadores a un setup escrito",
    sentimentHeading: "Capas de sentimiento diseñadas para este mercado",
    safetyHeading: "Solo lectura, por diseño",
    faqHeading: "Preguntas sobre análisis cripto",
    faqs: [
      {
        question: "¿Qué instrumentos cripto analiza TradCopilot?",
        answer:
          "BTC/USD, ETH/USD y SOL/USD actualmente. Los precios se transmiten en tiempo real desde los feeds públicos de WebSocket de Binance, y cada análisis indica el precio y timestamp exactos utilizados.",
      },
      {
        question:
          "¿TradCopilot necesita mis claves de API del exchange?",
        answer:
          "No. Las velas cripto provienen de streams de datos de mercado públicos que no requieren autenticación. TradCopilot nunca se conecta a tu cuenta del exchange, no puede ejecutar órdenes y no custodia fondos.",
      },
      {
        question: "¿Qué tan rápidos son los análisis con IA?",
        answer:
          "Múltiples proveedores de IA corren en paralelo y la primera respuesta estructurada válida gana, así que un análisis típico retorna en pocos segundos.",
      },
    ],
    ctaHeading: "Analiza BTC con datos en vivo en menos de un minuto",
  },

  forexMarketAnalysis: {
    meta: {
      title:
        "Análisis de Mercado Forex con IA — Setups de EUR/USD, GBP/USD & USD/JPY",
      description:
        "Cómo TradCopilot analiza forex: velas de TwelveData para pares principales, oro e índices, análisis por sesión, dimensionamiento de posición preciso en lotes, y setups de IA explicados en lenguaje sencillo.",
      keywords: [
        "análisis de mercado forex",
        "análisis de forex con IA",
        "herramienta de análisis eurusd",
        "análisis técnico forex IA",
        "dimensionamiento de posición forex",
      ],
    },
    eyebrow: "MERCADOS · FOREX",
    h1: "Análisis de mercado forex con IA,",
    h1Italic: "sesión por sesión.",
    intro:
      "Forex se mueve por sesiones, no solo por velas. TradCopilot calcula toda la lectura técnica de los pares principales a partir de datos de velas en vivo, sabe si Asia, Londres o Nueva York está en juego, dimensiona tus posiciones hasta el lote — y explica cada setup en un lenguaje que puedes usar o descartar.",
    coverageHeading:
      "Pares principales, oro e índices en un espacio de trabajo",
    analysisHeading: "Setups estructurados, no comentarios vagos",
    riskMathHeading: "Dimensionamiento de posición preciso en lotes",
    safetyHeading: "Sin conexiones al broker. Nunca.",
    faqHeading: "Preguntas sobre análisis forex",
    faqs: [
      {
        question: "¿Qué instrumentos forex analiza TradCopilot?",
        answer:
          "EUR/USD, GBP/USD y USD/JPY actualmente, además de oro (XAU/USD), NASDAQ y S&P 500 — servidos a través de TwelveData.",
      },
      {
        question:
          "¿TradCopilot se conecta a mi broker de forex?",
        answer:
          "No. TradCopilot es estrictamente de solo lectura: nunca se conecta a un broker, no puede ejecutar órdenes y no custodia fondos.",
      },
      {
        question:
          "¿Puede calcular el tamaño de posición en lotes?",
        answer:
          "Sí. La calculadora de riesgo retorna lotes estándar, mini y micro a partir de tu balance, porcentaje de riesgo, entrada y stop.",
      },
    ],
    ctaHeading: "Ejecuta un análisis en EUR/USD ahora mismo",
  },

  tradingJournal: {
    meta: {
      title:
        "Diario de Trading con IA — Registro Automatizado de Sesiones & Memoria de Comportamiento",
      description:
        "Diario de trading automatizado que registra entradas, salidas, emociones y errores. Alimenta tus últimas 20 operaciones en el contexto de IA para detectar revenge trading y overtrading.",
      keywords: [
        "diario de trading con IA",
        "diario de operaciones automatizado",
        "herramienta de psicología de trading",
        "detector de revenge trading",
        "diario de trades cripto",
        "registro de operaciones forex",
      ],
    },
    h1: "Diario de Trading con IA",
    intro:
      "Diario de trading automatizado que registra entradas, salidas, emociones y errores — luego alimenta tu historial en cada análisis futuro.",
  },

  riskManagement: {
    meta: {
      title:
        "Herramientas de Gestión de Riesgo — Dimensionamiento de Posición & Protecciones de Comportamiento",
      description:
        "Calculadora de dimensionamiento de posición con soporte de apalancamiento y salida en lotes forex, más alertas de comportamiento para revenge trading y overtrading. Solo lectura — alerta, nunca bloquea.",
      keywords: [
        "calculadora de tamaño de posición",
        "gestión de riesgo en trading",
        "revenge trading",
        "overtrading",
        "relación riesgo recompensa",
      ],
    },
    h1: "Gestión de Riesgo & Protecciones de Comportamiento",
    intro:
      "Dimensionamiento de posición, alertas de comportamiento y herramientas de riesgo para trading disciplinado.",
  },

  tradingAlerts: {
    meta: {
      title:
        "Alertas de Trading — Niveles de Precio, Extremos de RSI & Cruces de Tendencia",
      description:
        "Configura alertas técnicas en pares cripto y forex: umbrales de precio, niveles de RSI sobrecomprado/sobrevendido, cruces de EMA y notificaciones de picos de volatilidad.",
      keywords: [
        "alertas de trading",
        "alertas de precio cripto",
        "alertas técnicas forex",
        "alerta de RSI",
        "alertas de cruce EMA",
      ],
    },
    h1: "Alertas de Trading",
    intro:
      "Niveles de precio, extremos de RSI, cruces de EMA y notificaciones de volatilidad para cripto y forex.",
  },

  features: {
    meta: {
      title:
        "Funciones — Capacidades Completas del Terminal de Trading con IA",
      description:
        "Todas las capacidades de TradCopilot: análisis de gráficos con IA, diario de trading, protecciones de comportamiento, dimensionamiento de posición, backtesting, alertas, pulso de mercado y noticias.",
      keywords: [
        "funciones de trading con IA",
        "funciones del terminal de trading",
        "herramienta de trading cripto",
      ],
    },
    h1: "Todas las Funciones",
  },

  pricing: {
    meta: {
      title: "Precios — Plan Gratuito & Pro Terminal por $7,49/mes",
      description:
        "Empieza gratis con 5 análisis por día, sin tarjeta. Mejora a Pro por $7,49/mes para análisis y alertas ilimitados, analíticas de rendimiento e informes semanales.",
      keywords: [
        "tradcopilot precios",
        "costo de herramienta de trading IA",
        "precio de herramienta de análisis cripto",
      ],
    },
    h1: "Elige Tu Plan",
    subtitle:
      "Empieza gratis. Mejora cuando lo necesites. Cancela en cualquier momento.",
  },

  faq: {
    meta: {
      title:
        "Preguntas Frecuentes — FAQ del Terminal TradCopilot & Arquitectura",
      description:
        "Respuestas completas sobre el análisis de gráficos con IA de TradCopilot, matemática de indicadores, diario de sesión, protecciones de riesgo, precios y modelo de seguridad de solo lectura.",
      keywords: [
        "tradcopilot faq",
        "preguntas sobre trading IA",
        "cómo funciona copiloto de trading IA",
      ],
    },
    h1: "Preguntas",
    h1Italic: "Frecuentes.",
    subtitle:
      "Respuestas claras y transparentes sobre cómo funciona TradCopilot, nuestra carrera multi-modelo de IA, cálculos de indicadores, seguridad y facturación.",
    faqs: [
      {
        question: "¿Cómo analiza TradCopilot los datos de mercado?",
        answer:
          "TradCopilot calcula indicadores técnicos directamente de datos de velas en vivo — feeds en tiempo real de Binance para BTC, ETH y SOL, y TwelveData para pares forex, oro e índices.",
      },
      {
        question:
          "¿Necesito conectar mi broker o compartir claves del exchange?",
        answer:
          "No. TradCopilot es estrictamente de solo lectura: no se conecta a tu broker o cuentas del exchange, no custodia fondos y no puede ejecutar órdenes.",
      },
      {
        question: "¿Cuánto cuesta TradCopilot?",
        answer:
          "El plan Free cuesta $0 para siempre e incluye 5 análisis de gráficos con IA por día. Pro Terminal cuesta $7,49 por mes con análisis y alertas ilimitados.",
      },
      {
        question:
          "¿TradCopilot ejecuta operaciones o da asesoramiento financiero?",
        answer:
          "No en ninguno de los dos casos. No hay ejecución de órdenes en ninguna parte del producto — es una estación analítica solamente, y su salida es información educativa, no asesoramiento de inversión.",
      },
    ],
  },

  guides: {
    meta: {
      title:
        "Guías de Trading — Dimensionamiento de Posición, Disciplina, Soporte & Resistencia",
      description:
        "Guías prácticas de trading enfocadas en matemáticas para day traders de cripto y forex: fórmulas de dimensionamiento de posición, sistemas de disciplina, mapeo de soporte y resistencia, indicadores técnicos y análisis multi-temporalidad.",
      keywords: [
        "guías de trading",
        "educación cripto y forex",
        "dimensionamiento de posición",
        "disciplina de trading",
        "guías de análisis técnico",
      ],
    },
    h1: "Guías de trading que respetan",
    h1Italic: "las matemáticas.",
    subtitle:
      "Cortas, prácticas y basadas en los mismos cálculos que TradCopilot ejecuta en velas en vivo. Contenido educativo solamente — no constituye asesoramiento financiero.",
    entries: [
      {
        name: "La Guía Completa de Dimensionamiento de Posición",
        summary:
          "Matemática de riesgo fraccional fijo, aritmética de distancia de stop, exposición de apalancamiento y conversión de lotes forex estándar/mini/micro — con ejemplos resueltos para BTC/USD y EUR/USD.",
        tag: "GESTIÓN DE RIESGO",
      },
      {
        name: "Un Sistema Práctico para la Disciplina en Trading",
        summary:
          "Por qué la disciplina falla durante drawdowns, cómo construir un conjunto de reglas escritas que realmente puedas seguir, y cómo el diario más protecciones pre-trade convierten intenciones en hábitos.",
        tag: "PSICOLOGÍA",
      },
      {
        name: "Soporte & Resistencia Que Funciona",
        summary:
          "Cómo mapear niveles objetivamente a partir de máximos y mínimos de swing en lugar de trazarlos a ojo — el mismo método basado en swing que TradCopilot calcula automáticamente en velas en vivo.",
        tag: "ESTRUCTURA DE MERCADO",
      },
      {
        name: "RSI, MACD, EMA, ATR & VWAP Explicados",
        summary:
          "Qué mide cada indicador, cómo se calcula, dónde puede engañar, y cómo encajan juntos en una lectura estructurada de un gráfico.",
        tag: "INDICADORES",
      },
      {
        name: "Análisis Multi-Temporalidad, Paso a Paso",
        summary:
          "Cómo alinear un sesgo de temporalidad mayor con entradas de temporalidad menor, qué pares de temporalidades funcionan para day trading, y los errores que hacen que el análisis MTF se contradiga a sí mismo.",
        tag: "WORKFLOW",
      },
    ],
    ctaHeading: "Practica cada concepto en gráficos en vivo",
    ctaBody:
      "TradCopilot calcula estos mismos indicadores de datos de cripto y forex en tiempo real — luego registra la sesión y protege tus reglas de riesgo. Plan gratuito incluido.",
  },
};
