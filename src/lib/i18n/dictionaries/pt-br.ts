/**
 * src/lib/i18n/dictionaries/pt-br.ts
 *
 * Brazilian Portuguese content dictionary for TradCopilot's SEO surface.
 *
 * IMPORTANT: This is NOT a machine translation. Content is written for
 * native Brazilian Portuguese search intent based on keyword research:
 *  - "análise técnica com IA"
 *  - "assistente de trading com IA"
 *  - "análise gráfica com inteligência artificial"
 *  - "diário de trading"
 *  - "gestão de risco no trading"
 *  - "indicadores técnicos"
 *  - "suporte e resistência"
 *
 * Product terminology (TradCopilot, RSI, MACD, EMA, ATR, VWAP) is
 * preserved verbatim — traders use these English abbreviations globally.
 */

import type { Dictionary } from "./en";

export const dictionary: Dictionary = {
  common: {
    siteName: "TradCopilot",
    siteTagline: "Copiloto de Trading com IA para Análise de Cripto & Forex",
    startFree: "Criar Conta Gratuita",
    startFreeNoCard: "Comece grátis — sem cartão de crédito",
    seePricing: "Ver Planos",
    comparePlans: "Comparar planos",
    readDisclaimer: "Ler Aviso Legal",
    learnMore: "Saiba Mais",
    readFullFaq: "Leia o FAQ completo",
    viewFeatures: "Veja Como Funciona",
    backToHome: "Voltar ao Início",
    disclaimerShort:
      "Análise educacional — não constitui aconselhamento financeiro. Trading envolve risco substancial de perda.",
    nav: {
      howItWorks: "Como funciona",
      pricing: "Preços",
      faq: "FAQ",
      features: "Recursos",
      guides: "Guias",
    },
    footer: {
      product: "Produto",
      guidesAndCompare: "Guias & Comparações",
      legalAndTrust: "Legal & Confiança",
      copyright: "© {year} TradCopilot Inc. Todos os direitos reservados.",
      readOnlyDisclaimer:
        "Terminal analítico somente leitura. Não constitui aconselhamento financeiro.",
    },
  },

  home: {
    meta: {
      title:
        "TradCopilot | Copiloto de Trading com IA para Análise de Cripto & Forex",
      description:
        "Copiloto de trading com IA para day traders de cripto e forex: análise técnica ao vivo com RSI, MACD, EMA e ATR, diário de sessão automatizado, proteções comportamentais e ferramentas de risco. Plano gratuito disponível.",
      keywords: [
        "copiloto de trading com IA",
        "assistente de trading IA",
        "análise gráfica de cripto",
        "análise de mercado forex",
        "disciplina de trading",
      ],
    },
    h1: "Execute seu plano de trading com",
    h1Italic: "disciplina institucional.",
    subtitle:
      "Telemetria de gráficos em tempo real, diário de sessão persistente e proteções de risco automatizadas em um espaço de trabalho focado.",
    faqHeading: "Perguntas frequentes sobre o terminal",
    faqSubheading: "05 / PERGUNTAS",
  },

  aiTradingCopilot: {
    meta: {
      title:
        "O Que É um Copiloto de Trading com IA? Definição, Capacidades e Limites",
      description:
        "Um copiloto de trading com IA é um software que usa inteligência artificial para ajudar você a analisar mercados e melhorar suas decisões — sem operar por você. Como a categoria funciona, o que pode e não pode fazer, e como o TradCopilot implementa isso.",
      keywords: [
        "o que é copiloto de trading IA",
        "copiloto de trading com IA",
        "assistente de trading IA",
        "ferramenta de análise de mercado IA",
        "análise gráfica com IA",
      ],
    },
    eyebrow: "GUIA DA CATEGORIA",
    h1: "O que é um",
    h1Italic: "copiloto de trading com IA?",
    intro:
      "Um copiloto de trading com IA é um software que usa modelos de inteligência artificial para ajudar você a analisar mercados e melhorar suas decisões de trading — sem operar por você. Ele lê gráficos e dados de mercado, explica setups em linguagem simples, mantém memória das suas sessões anteriores e treina disciplina, enquanto você mantém o controle total de cada ordem.",
    definitionHeading: "A categoria, com precisão",
    definitionBody:
      'A palavra "copiloto" tem um significado real aqui. Copilotos de aviação não substituem pilotos — eles monitoram instrumentos, verificam decisões e alertam antes que erros se tornem acidentes.',
    limitsHeading: "O que um copiloto de trading com IA não pode fazer",
    faqHeading: "Perguntas comuns sobre copilotos de trading com IA",
    faqs: [
      {
        question: "Um copiloto de trading com IA executa ordens?",
        answer:
          "Um copiloto, por definição, não deveria. Ele analisa, explica, registra e alerta enquanto você mantém o controle total da execução. O TradCopilot em particular não possui nenhuma funcionalidade de execução de ordens, não custodia fundos e nunca se conecta a corretoras ou exchanges.",
      },
      {
        question:
          "Qual a diferença entre um copiloto de trading com IA e um robô de trading?",
        answer:
          "Um robô automatiza decisões e coloca ordens em seu nome. Um copiloto faz o oposto: melhora a qualidade das suas decisões — leituras objetivas de indicadores, análise estruturada de setups, alertas comportamentais — mas o humano permanece como executor.",
      },
      {
        question:
          "Um copiloto de trading com IA pode prever para onde o preço vai?",
        answer:
          "Nenhum sistema honesto vai afirmar isso. Mercados são incertos, e qualquer sistema prometendo previsões garantidas deve ser tratado como um sinal de alerta.",
      },
    ],
  },

  aiChartAnalysis: {
    meta: {
      title:
        "Análise Gráfica com IA para Cripto & Forex — Como Funciona",
      description:
        "Análise gráfica com IA que calcula RSI, MACD, EMA, VWAP e suporte/resistência a partir de candles ao vivo, depois explica o setup através de uma corrida multi-modelo de IA.",
      keywords: [
        "análise gráfica com IA",
        "análise técnica com inteligência artificial",
        "ferramenta de análise de gráficos cripto",
        "suporte e resistência automatizado",
      ],
    },
    eyebrow: "Como o motor funciona",
    h1: "Análise gráfica com IA baseada em dados reais de candlestick",
    intro:
      "Análise gráfica com IA é o uso de modelos de aprendizado de máquina para interpretar gráficos de preço — lendo momentum, estrutura de tendência, volatilidade e níveis-chave, e depois explicando o que eles implicam em linguagem simples.",
    instrumentLayerHeading: "O que o motor de análise calcula",
    judgmentLayerHeading: "De indicadores a um setup estruturado",
    pipelineHeading: "Como o pipeline multi-modelo funciona",
    coverageHeading: "Timeframes e mercados",
    responsibleHeading: "Lendo uma análise com responsabilidade",
    faqHeading: "Perguntas frequentes",
    ctaHeading: "Veja funcionando em um gráfico ao vivo",
    ctaBody:
      "Execute uma análise em BTC, EUR/USD ou qualquer um dos nove instrumentos e inspecione a telemetria — preço exato, timestamp exato, todas as tags visíveis.",
  },

  cryptoMarketAnalysis: {
    meta: {
      title:
        "Análise de Mercado Cripto com IA — Análise ao Vivo de BTC, ETH & SOL",
      description:
        "Como o TradCopilot analisa mercados cripto: dados de candles da Binance em tempo real para BTC, ETH e SOL, RSI/MACD/EMA/ATR/VWAP calculados no servidor, taxas de funding, Fear & Greed e alertas de movimentos bruscos.",
      keywords: [
        "análise de mercado cripto",
        "análise de criptomoedas com IA",
        "ferramenta de análise BTC",
        "análise técnica ethereum",
        "assistente cripto IA",
      ],
    },
    eyebrow: "MERCADOS · CRIPTO",
    h1: "Análise de mercado cripto com IA em",
    h1Italic: "candles ao vivo.",
    intro:
      "O mercado cripto nunca fecha, então sua análise não deveria rodar com dados desatualizados. O TradCopilot calcula toda a leitura técnica a partir de streams de candles em tempo real de BTC, ETH e SOL — depois explica o setup em linguagem simples, registra a sessão e protege suas regras de risco 24 horas por dia.",
    liveDataHeading: "Feeds em tempo real, não capturas de tela",
    analysisHeading: "De indicadores a um setup escrito",
    sentimentHeading: "Camadas de sentimento feitas para este mercado",
    safetyHeading: "Somente leitura, por design",
    faqHeading: "Perguntas sobre análise cripto",
    faqs: [
      {
        question: "Quais instrumentos cripto o TradCopilot analisa?",
        answer:
          "BTC/USD, ETH/USD e SOL/USD atualmente. Preços são transmitidos em tempo real dos feeds públicos de WebSocket da Binance, e cada análise informa o preço e timestamp exatos utilizados.",
      },
      {
        question:
          "O TradCopilot precisa das minhas chaves de API da exchange?",
        answer:
          "Não. Os candles cripto vêm de streams de dados de mercado públicos que não exigem autenticação. O TradCopilot nunca se conecta à sua conta de exchange, não pode executar ordens e não custodia fundos.",
      },
      {
        question: "Quão rápidas são as análises com IA?",
        answer:
          "Múltiplos provedores de IA rodam em paralelo e a primeira resposta estruturada válida vence, então uma análise típica retorna em poucos segundos.",
      },
    ],
    ctaHeading: "Analise BTC com dados ao vivo em menos de um minuto",
  },

  forexMarketAnalysis: {
    meta: {
      title:
        "Análise de Mercado Forex com IA — Setups de EUR/USD, GBP/USD & USD/JPY",
      description:
        "Como o TradCopilot analisa forex: candles do TwelveData para pares principais, ouro e índices, análise por sessão, dimensionamento de posição preciso em lotes, e setups de IA explicados em linguagem simples.",
      keywords: [
        "análise de mercado forex",
        "análise de forex com IA",
        "ferramenta de análise eurusd",
        "análise técnica forex IA",
        "dimensionamento de posição forex",
      ],
    },
    eyebrow: "MERCADOS · FOREX",
    h1: "Análise de mercado forex com IA,",
    h1Italic: "sessão por sessão.",
    intro:
      "Forex se move por sessões, não apenas por candles. O TradCopilot calcula toda a leitura técnica dos pares principais a partir de dados de candles ao vivo, sabe se Ásia, Londres ou Nova York está em jogo, dimensiona suas posições até o lote — e explica cada setup em linguagem que você pode usar ou descartar.",
    coverageHeading: "Pares principais, ouro e índices em um espaço de trabalho",
    analysisHeading: "Setups estruturados, não comentários vagos",
    riskMathHeading: "Dimensionamento de posição preciso em lotes",
    safetyHeading: "Sem conexões com corretoras. Nunca.",
    faqHeading: "Perguntas sobre análise forex",
    faqs: [
      {
        question: "Quais instrumentos forex o TradCopilot analisa?",
        answer:
          "EUR/USD, GBP/USD e USD/JPY atualmente, além de ouro (XAU/USD), NASDAQ e S&P 500 — servidos via TwelveData.",
      },
      {
        question:
          "O TradCopilot se conecta à minha corretora de forex?",
        answer:
          "Não. O TradCopilot é estritamente somente leitura: nunca se conecta a uma corretora, não pode executar ordens e não custodia fundos.",
      },
      {
        question:
          "Ele calcula o tamanho da posição em lotes?",
        answer:
          "Sim. A calculadora de risco retorna lotes padrão, mini e micro a partir do seu saldo, percentual de risco, entrada e stop.",
      },
    ],
    ctaHeading: "Execute uma análise em EUR/USD agora",
  },

  tradingJournal: {
    meta: {
      title:
        "Diário de Trading com IA — Registro Automatizado de Sessões & Memória Comportamental",
      description:
        "Diário de trading automatizado que registra entradas, saídas, emoções e erros. Alimenta suas últimas 20 operações no contexto da IA para detectar revenge trading e overtrading.",
      keywords: [
        "diário de trading com IA",
        "diário de operações automatizado",
        "ferramenta de psicologia de trading",
        "detector de revenge trading",
        "diário de trades cripto",
        "registro de operações forex",
      ],
    },
    h1: "Diário de Trading com IA",
    intro:
      "Diário de trading automatizado que registra entradas, saídas, emoções e erros — depois alimenta seu histórico em cada análise futura.",
  },

  riskManagement: {
    meta: {
      title:
        "Ferramentas de Gestão de Risco — Dimensionamento de Posição & Proteções Comportamentais",
      description:
        "Calculadora de dimensionamento de posição com suporte a alavancagem e saída em lotes forex, além de alertas comportamentais para revenge trading e overtrading. Somente leitura — alerta, nunca bloqueia.",
      keywords: [
        "calculadora de tamanho de posição",
        "gestão de risco no trading",
        "revenge trading",
        "overtrading",
        "relação risco recompensa",
      ],
    },
    h1: "Gestão de Risco & Proteções Comportamentais",
    intro:
      "Dimensionamento de posição, alertas comportamentais e ferramentas de risco para trading disciplinado.",
  },

  tradingAlerts: {
    meta: {
      title:
        "Alertas de Trading — Níveis de Preço, Extremos de RSI & Cruzamentos de Tendência",
      description:
        "Configure alertas técnicos em pares cripto e forex: limites de preço, níveis de RSI sobrecomprado/sobrevendido, cruzamentos de EMA e notificações de picos de volatilidade.",
      keywords: [
        "alertas de trading",
        "alertas de preço cripto",
        "alertas técnicos forex",
        "alerta de RSI",
        "alertas de cruzamento EMA",
      ],
    },
    h1: "Alertas de Trading",
    intro:
      "Níveis de preço, extremos de RSI, cruzamentos de EMA e notificações de volatilidade para cripto e forex.",
  },

  features: {
    meta: {
      title: "Recursos — Capacidades Completas do Terminal de Trading com IA",
      description:
        "Todas as capacidades do TradCopilot: análise gráfica com IA, diário de trading, proteções comportamentais, dimensionamento de posição, backtesting, alertas, pulso de mercado e notícias.",
      keywords: [
        "recursos de trading com IA",
        "recursos do terminal de trading",
        "ferramenta de trading cripto",
      ],
    },
    h1: "Todos os Recursos",
  },

  pricing: {
    meta: {
      title: "Preços — Plano Gratuito & Pro Terminal por $7,49/mês",
      description:
        "Comece grátis com 5 análises por dia, sem cartão. Upgrade para Pro por $7,49/mês para análises e alertas ilimitados, analytics de performance e relatórios semanais.",
      keywords: [
        "tradcopilot preços",
        "custo de ferramenta de trading IA",
        "preço de ferramenta de análise cripto",
      ],
    },
    h1: "Escolha Seu Plano",
    subtitle:
      "Comece grátis. Faça upgrade quando precisar. Cancele a qualquer momento.",
  },

  faq: {
    meta: {
      title:
        "Perguntas Frequentes — FAQ do Terminal TradCopilot & Arquitetura",
      description:
        "Respostas completas sobre a análise gráfica com IA do TradCopilot, matemática de indicadores, diário de sessão, proteções de risco, preços e modelo de segurança somente leitura.",
      keywords: [
        "tradcopilot faq",
        "perguntas sobre trading IA",
        "como copiloto de trading IA funciona",
      ],
    },
    h1: "Perguntas",
    h1Italic: "Frequentes.",
    subtitle:
      "Respostas claras e transparentes sobre como o TradCopilot funciona, nossa corrida multi-modelo de IA, cálculos de indicadores, segurança e cobrança.",
    faqs: [
      {
        question: "Como o TradCopilot analisa dados de mercado?",
        answer:
          "O TradCopilot calcula indicadores técnicos diretamente de dados de candlestick ao vivo — feeds em tempo real da Binance para BTC, ETH e SOL, e TwelveData para pares forex, ouro e índices.",
      },
      {
        question:
          "Preciso conectar minha corretora ou compartilhar chaves de exchange?",
        answer:
          "Não. O TradCopilot é estritamente somente leitura: não se conecta à sua corretora ou contas de exchange, não custodia fundos e não pode executar ordens.",
      },
      {
        question: "Quanto custa o TradCopilot?",
        answer:
          "O plano Free custa $0 para sempre e inclui 5 análises gráficas com IA por dia. O Pro Terminal custa $7,49 por mês com análises e alertas ilimitados.",
      },
      {
        question:
          "O TradCopilot executa operações ou dá aconselhamento financeiro?",
        answer:
          "Não em nenhum dos dois casos. Não há execução de ordens em nenhum lugar do produto — é uma estação analítica apenas, e sua saída é informação educacional, não aconselhamento de investimento.",
      },
    ],
  },

  guides: {
    meta: {
      title:
        "Guias de Trading — Dimensionamento de Posição, Disciplina, Suporte & Resistência",
      description:
        "Guias práticos de trading focados em matemática para day traders de cripto e forex: fórmulas de dimensionamento de posição, sistemas de disciplina, mapeamento de suporte e resistência, indicadores técnicos e análise multi-timeframe.",
      keywords: [
        "guias de trading",
        "educação cripto e forex",
        "dimensionamento de posição",
        "disciplina de trading",
        "guias de análise técnica",
      ],
    },
    h1: "Guias de trading que respeitam",
    h1Italic: "a matemática.",
    subtitle:
      "Curtos, práticos e baseados nos mesmos cálculos que o TradCopilot executa em candles ao vivo. Conteúdo educacional apenas — não constitui aconselhamento financeiro.",
    entries: [
      {
        name: "O Guia Completo de Dimensionamento de Posição",
        summary:
          "Matemática de risco fracionário fixo, aritmética de distância de stop, exposição de alavancagem e conversão de lotes forex padrão/mini/micro — com exemplos resolvidos para BTC/USD e EUR/USD.",
        tag: "GESTÃO DE RISCO",
      },
      {
        name: "Um Sistema Prático para Disciplina no Trading",
        summary:
          "Por que a disciplina falha durante drawdowns, como construir um conjunto de regras escritas que você realmente consegue seguir, e como o diário mais proteções pré-trade transformam intenções em hábitos.",
        tag: "PSICOLOGIA",
      },
      {
        name: "Suporte & Resistência Que Funciona",
        summary:
          "Como mapear níveis objetivamente a partir de máximas e mínimas de swing em vez de traçar a olho — o mesmo método baseado em swing que o TradCopilot calcula automaticamente em candles ao vivo.",
        tag: "ESTRUTURA DE MERCADO",
      },
      {
        name: "RSI, MACD, EMA, ATR & VWAP Explicados",
        summary:
          "O que cada indicador mede, como é calculado, onde pode enganar, e como eles se encaixam em uma leitura estruturada de um gráfico.",
        tag: "INDICADORES",
      },
      {
        name: "Análise Multi-Timeframe, Passo a Passo",
        summary:
          "Como alinhar um viés de timeframe maior com entradas de timeframe menor, quais pares de timeframe funcionam para day trading, e os erros que fazem a análise MTF contradizer a si mesma.",
        tag: "WORKFLOW",
      },
    ],
    ctaHeading: "Pratique cada conceito em gráficos ao vivo",
    ctaBody:
      "O TradCopilot calcula esses mesmos indicadores de dados de cripto e forex em tempo real — depois registra a sessão e protege suas regras de risco. Plano gratuito disponível.",
  },
};
