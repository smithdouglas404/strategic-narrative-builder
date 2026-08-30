(function () {
  const app = document.getElementById("app");
  const DEFAULT_FX_RATES = Object.freeze({
    USD: 1,
    GBP: 0.79,
    EUR: 0.92,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 157,
    CHF: 0.90,
    SEK: 10.5,
    NOK: 10.7,
    DKK: 6.86,
    HKD: 7.81,
    SGD: 1.35,
    INR: 86,
    AED: 3.6725,
    NZD: 1.67,
    ZAR: 18,
  });

  const state = {
    me: null,
    valueCases: [],
    activeCaseId: null,
    activeCase: null,
    business: null,
    benchmarks: [],
    researchSources: [],
    fxRates: {
      base: "USD",
      date: "",
      rates: { ...DEFAULT_FX_RATES },
      source: "Offline benchmark FX rates",
      sourceUrl: "https://frankfurter.dev/",
      fallback: true,
    },
    admin: null,
    adminUsage: null,
    quickAdmin: { open: false, unlocked: false, pin: "", error: "", saving: false, message: "", config: null },
    adminTab: "research",
    smtpBusy: "",
    view: "cases",
    message: "",
    error: "",
    financialTableOpen: false,
    caseProcessing: false,
    businessProcessing: "",
    privateEquityPeerData: {},
    privateEquityStatus: "",
    privateEquityLoading: false,
    privateEquityLoadedFor: "",
    shareBusyCaseId: "",
    shareCopiedCaseId: "",
    sharedAccess: {
      caseId: "",
      token: "",
      readOnly: false,
    },
    refreshStages: [],
    agendaRefreshQueued: {},
    companyLookup: {
      query: "",
      matches: [],
      validationLinks: [],
      sourceSnippets: [],
      sourcesChecked: [],
      selected: null,
      typedAccepted: false,
      noMatch: false,
      loading: false,
      scope: "local",
      level: "muted",
      status: "Type a customer name, then look up and select the correct company match.",
    },
    magicLink: {
      sending: false,
      requested: false,
      email: "",
      previewUrl: "",
      deliveryMode: "",
      deliveryNote: "",
      expiresInMinutes: 15,
    },
  };

  let companyLookupTimer = null;
  let graphAnimationObserver = null;

  function mountGraphAnimations() {
    if (graphAnimationObserver) {
      graphAnimationObserver.disconnect();
      graphAnimationObserver = null;
    }
    const targets = [...app.querySelectorAll([
      ".research-spider-panel",
      ".financial-chart",
      ".pe-bar-compare-panel",
      ".benchmark-heatmap-panel",
      ".outside-in-graph",
      ".chart-grid",
      ".value-tree-section",
      ".ai-chart-panel",
      ".ai-heatmap-panel",
      ".ai-value-map",
      ".ai-radar-panel",
      ".ai-business-case-foundation",
    ].join(", "))];
    if (!targets.length) return;
    targets.forEach((target) => target.classList.add("graph-animate"));
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("graph-visible"));
      return;
    }
    graphAnimationObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("graph-visible");
        graphAnimationObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    targets.forEach((target) => graphAnimationObserver.observe(target));
  }

  const companyLookupFixtures = [
    {
      name: "HSBC Holdings plc",
      legalName: "HSBC Holdings plc",
      aliases: ["HSBC", "Hongkong and Shanghai Banking Corporation"],
      ticker: "HSBA.L",
      exchange: "London Stock Exchange",
      industry: "Financial services",
      primaryIndustry: "Banking",
      subSector: "Banking and financial services",
      peerGroup: "financial-services",
      website: "https://www.hsbc.com",
      domain: "hsbc.com",
      hq: "London, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "219697",
      revenue: "USD 66.1B",
      annualRevenueUsd: "66100000000",
      totalAssetsUsd: "3051000000000",
      netProfit: "USD 24.6B",
      peerMetrics: { operatingMargin: "43.8", cagr3: "5.9" },
      description: "Global bank and financial services group with retail, commercial, wealth, and markets businesses.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Uniphar plc",
      legalName: "Uniphar plc",
      aliases: ["Uniphar", "Uniphar CDI", "UPR"],
      ticker: "UPR.L",
      exchange: "London Stock Exchange",
      industry: "Healthcare services",
      primaryIndustry: "Healthcare services",
      subSector: "Pharmaceutical, medtech and healthcare distribution services",
      peerGroup: "healthcare-services",
      website: "https://www.uniphar.ie",
      domain: "uniphar.ie",
      hq: "Dublin, Ireland",
      hqCountry: "Ireland",
      employees: "1001-5000",
      revenue: "EUR 3.0747B",
      annualRevenueUsd: "3321000000",
      ebitda: "EUR 130.9M",
      ebitdaUsd: "141400000",
      totalAssets: "EUR 1.7323B",
      totalAssetsUsd: "1871000000",
      netDebt: "EUR 171.1M",
      fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "2.5", cagr3: "9.8" },
      financialHistory: [
        { year: "FY2023", revenue: "EUR 2.5531B", yoyGrowth: "", operatingMargin: "2.7", netMargin: "" },
        { year: "FY2024", revenue: "EUR 2.7704B", yoyGrowth: "8.5", operatingMargin: "3.0", netMargin: "2.3" },
        { year: "FY2025", revenue: "EUR 3.0747B", yoyGrowth: "11.0", operatingMargin: "2.5", netMargin: "" },
      ],
      description: "Dublin-headquartered diversified healthcare services group operating through Uniphar Pharma, Uniphar Medtech, and Supply Chain & Retail.",
      source: "Uniphar FY2025 preliminary results, investor overview and annual-report catalogue; USD fields are converted display values for benchmarking.",
      sourceSnippets: [
        {
          source: "Uniphar FY2025 preliminary results",
          label: "FY2025 revenue and EBITDA",
          snippet: "Uniphar reported FY2025 revenue of EUR 3,074.7m, EBITDA of EUR 130.9m, EBITDA margin of 4.3% and reported revenue growth of 11.0%.",
          url: "https://www.investegate.info/announcement/rns/uniphar-cdi---upr/2025-preliminary-results/9443349",
        },
        {
          source: "Uniphar FY2025 preliminary results",
          label: "Operating segments",
          snippet: "FY2025 segment revenue was EUR 690.8m Uniphar Pharma, EUR 292.8m Uniphar Medtech and EUR 2,091.1m Supply Chain & Retail.",
          url: "https://www.investegate.co.uk/index.php/announcement/rns/uniphar-cdi---upr/2025-preliminary-results/9443349",
        },
        {
          source: "Uniphar investor overview",
          label: "FY2025 key stats",
          snippet: "Uniphar's investor overview lists FY2025 EBITDA of EUR 130.9m, organic gross-profit growth of 8.9%, ROCE of 16.3% and adjusted EPS of 24.8c.",
          url: "https://www.uniphar.ie/static/investors/investor-overview/",
        },
        {
          source: "Financial filings",
          label: "FY2025 total assets",
          snippet: "The FY2025 financial filing shows total assets of EUR 1,732.3m.",
          url: "https://financialreports.eu/filings/uniphar-plc/earnings-release/2026/32835256/",
        },
      ],
    },
    {
      name: "Microsoft Corporation",
      legalName: "Microsoft Corporation",
      aliases: ["Microsoft", "MSFT"],
      ticker: "MSFT",
      exchange: "NASDAQ",
      industry: "Technology",
      hq: "Redmond, United States",
      employees: "228000",
      revenue: "USD 245.1B",
      netProfit: "USD 88.1B",
      description: "Global software, cloud, AI, gaming, and productivity technology company.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Accenture plc",
      legalName: "Accenture plc",
      aliases: ["Accenture", "ACN"],
      ticker: "ACN",
      exchange: "NYSE",
      industry: "Information technology services",
      primaryIndustry: "Technology services",
      subSector: "Technology consulting and managed services",
      peerGroup: "it-services",
      hq: "Dublin, Ireland",
      hqCountry: "Ireland",
      employees: "779000",
      revenue: "USD 69.7B",
      annualRevenueUsd: "69670000000",
      peerMetrics: { operatingMargin: "14.7", cagr3: "7.0" },
      description: "Global technology consulting, implementation and managed services provider.",
      source: "Accenture FY2025 full-year results.",
    },
    {
      name: "International Business Machines Corporation",
      legalName: "International Business Machines Corporation",
      aliases: ["IBM", "International Business Machines"],
      ticker: "IBM",
      exchange: "NYSE",
      industry: "Information technology services",
      primaryIndustry: "Technology services",
      subSector: "Hybrid cloud, infrastructure and technology services",
      peerGroup: "it-services",
      hq: "Armonk, United States",
      hqCountry: "United States",
      employees: "270300",
      revenue: "USD 67.5B",
      annualRevenueUsd: "67500000000",
      peerMetrics: { operatingMargin: "18.8", cagr3: "8.0" },
      description: "Global hybrid cloud, infrastructure, software and consulting services provider.",
      source: "IBM FY2025 full-year results.",
    },
    {
      name: "Tata Consultancy Services Limited",
      legalName: "Tata Consultancy Services Limited",
      aliases: ["TCS", "Tata Consultancy Services"],
      ticker: "TCS.NS",
      exchange: "National Stock Exchange of India",
      industry: "Information technology services",
      primaryIndustry: "Technology services",
      subSector: "IT consulting, implementation and managed services",
      peerGroup: "it-services",
      hq: "Mumbai, India",
      hqCountry: "India",
      employees: "607979",
      revenue: "INR 2,670.2B",
      peerMetrics: { operatingMargin: "26.7", cagr3: "4.6" },
      description: "Global IT services, consulting and business solutions provider.",
      source: "TCS FY2026 annual report.",
    },
    {
      name: "NTT DATA Group Corporation",
      legalName: "NTT DATA Group Corporation",
      aliases: ["NTT DATA", "NTT Data Group"],
      ticker: "9613.T",
      exchange: "Tokyo Stock Exchange",
      industry: "Information technology services",
      primaryIndustry: "Technology services",
      subSector: "Systems integration and managed infrastructure services",
      peerGroup: "it-services",
      hq: "Tokyo, Japan",
      hqCountry: "Japan",
      employees: "197800",
      revenue: "JPY 3,009.2B",
      peerMetrics: { operatingMargin: "10.7", cagr3: "9.4" },
      description: "Global systems integration, consulting and managed infrastructure services provider.",
      source: "NTT DATA Group FY2025 results ended March 2026.",
    },
    {
      name: "DXC Technology Company",
      legalName: "DXC Technology Company",
      aliases: ["DXC", "DXC Technology"],
      ticker: "DXC",
      exchange: "NYSE",
      industry: "Information technology services",
      primaryIndustry: "Technology services",
      subSector: "IT outsourcing and managed infrastructure services",
      peerGroup: "it-services",
      hq: "Ashburn, United States",
      hqCountry: "United States",
      employees: "120000",
      revenue: "USD 12.7B",
      annualRevenueUsd: "12700000000",
      peerMetrics: { operatingMargin: "7.0", cagr3: "-6.6" },
      description: "Global IT outsourcing, application and managed infrastructure services provider.",
      source: "DXC FY2026 full-year results.",
    },
    {
      name: "Cognizant Technology Solutions Corporation",
      legalName: "Cognizant Technology Solutions Corporation",
      aliases: ["Cognizant", "CTSH"],
      ticker: "CTSH",
      exchange: "NASDAQ",
      industry: "Information technology services",
      primaryIndustry: "Technology services",
      subSector: "IT consulting, digital engineering and managed services",
      peerGroup: "it-services",
      hq: "Teaneck, United States",
      hqCountry: "United States",
      employees: "351600",
      priorEmployees: "336800",
      revenue: "USD 21.1B",
      annualRevenueUsd: "21108000000",
      peerMetrics: { operatingMargin: "16.1", cagr3: "7.0" },
      description: "Global professional and technology services provider spanning consulting, digital engineering and operations.",
      source: "Cognizant FY2025 full-year results.",
    },
    {
      name: "Barclays PLC",
      legalName: "Barclays PLC",
      aliases: ["Barclays", "Barclays Bank", "Barclays Bank PLC"],
      ticker: "BARC.L",
      exchange: "London Stock Exchange",
      industry: "Financial services",
      primaryIndustry: "Financial services",
      subSector: "Banking and capital markets",
      website: "https://home.barclays",
      domain: "home.barclays",
      hq: "London, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "100000",
      revenue: "GBP 29.1B",
      netProfit: "GBP 7.2B",
      fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "31.4", cagr3: "5.3" },
      description: "Universal bank with consumer, corporate, investment banking, and payments businesses.",
      source: "Local company lookup seed backed by Barclays annual results and public finance sources; validate against annual report and market data.",
      financialHistory: [
        { year: "FY2021", revenue: "GBP 21.9B", yoyGrowth: "0.8", operatingMargin: "38.4", netMargin: "29.1" },
        { year: "FY2022", revenue: "GBP 25.0B", yoyGrowth: "13.7", operatingMargin: "28.1", netMargin: "20.1" },
        { year: "FY2023", revenue: "GBP 25.4B", yoyGrowth: "1.7", operatingMargin: "25.8", netMargin: "16.8" },
        { year: "FY2024", revenue: "GBP 26.8B", yoyGrowth: "5.6", operatingMargin: "30.3", netMargin: "19.8" },
        { year: "FY2025", revenue: "GBP 29.1B", yoyGrowth: "8.8", operatingMargin: "31.4", netMargin: "24.8" },
      ],
      sourceSnippets: [
        {
          source: "Barclays annual results",
          label: "FY2025 income and profit",
          snippet: "Barclays reported FY2025 income of about GBP 29.1B, operating income/profit of about GBP 9.1B and net income of about GBP 7.2B.",
          url: "https://home.barclays/investor-relations/reports-and-events/financial-results/",
        },
        {
          source: "Barclays annual reports",
          label: "Five-year annual report validation",
          snippet: "Five-year trend uses Barclays annual report and annual-results totals for income, profit before tax/operating income and attributable profit.",
          url: "https://home.barclays/investor-relations/reports-and-events/annual-reports/",
        },
      ],
    },
    {
      name: "Lloyds Banking Group plc",
      legalName: "Lloyds Banking Group plc",
      aliases: ["Lloyds", "Lloyds Bank"],
      ticker: "LLOY.L",
      exchange: "London Stock Exchange",
      industry: "Financial services",
      hq: "London, United Kingdom",
      employees: "60000",
      revenue: "GBP 18.0B",
      netProfit: "GBP 4.4B",
      peerMetrics: { operatingMargin: "39.7", cagr3: "2.8" },
      description: "UK retail and commercial banking group with major banking, insurance, and pensions brands.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Standard Chartered PLC",
      legalName: "Standard Chartered PLC",
      aliases: ["Standard Chartered", "StanChart"],
      ticker: "STAN.L",
      exchange: "London Stock Exchange",
      industry: "Financial services",
      hq: "London, United Kingdom",
      employees: "85000",
      revenue: "USD 19.7B",
      netProfit: "USD 3.6B",
      peerMetrics: { operatingMargin: "25.4", cagr3: "5.6" },
      description: "International banking group focused on corporate, institutional, commercial, wealth, and retail banking.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "NatWest Group plc",
      legalName: "NatWest Group plc",
      aliases: ["NatWest", "National Westminster Bank", "RBS Group"],
      ticker: "NWG.L",
      exchange: "London Stock Exchange",
      industry: "Financial services",
      hq: "Edinburgh, United Kingdom",
      employees: "61000",
      revenue: "GBP 16.6B",
      netProfit: "GBP 5.8B",
      peerMetrics: { operatingMargin: "46.3", cagr3: "16.1" },
      description: "UK banking group serving retail, commercial, private banking, and markets customers.",
      source: "Local company lookup seed; validate against annual report and market data.",
      financialHistory: [
        { year: "FY2021", revenue: "GBP 10.4B", yoyGrowth: "", operatingMargin: "38.5", netMargin: "28.4" },
        { year: "FY2022", revenue: "GBP 13.1B", yoyGrowth: "26.0", operatingMargin: "39.1", netMargin: "26.7" },
        { year: "FY2023", revenue: "GBP 14.8B", yoyGrowth: "13.0", operatingMargin: "41.8", netMargin: "29.5" },
        { year: "FY2024", revenue: "GBP 14.3B", yoyGrowth: "-3.4", operatingMargin: "43.1", netMargin: "30.8" },
        { year: "FY2025", revenue: "GBP 16.6B", yoyGrowth: "16.1", operatingMargin: "46.3", netMargin: "35.1" },
      ],
      priorityInsights: {
        industryTrends: [
          {
            title: "Digital banking and AI are moving from innovation themes to operating-model requirements.",
            summary: "UK banks are under pressure to use data and AI to simplify journeys, improve advice, and automate operations while managing model risk.",
            sources: [
              { label: "NatWest tech, data and AI", url: "https://www.natwestgroup.com/who-we-are/about-natwest-group/tech-data-and-AI.html" },
              { label: "NatWest innovation", url: "https://www.natwestgroup.com/sustainability/society/innovation-and-digitisation.html" },
            ],
          },
          {
            title: "Operational resilience and third-party technology risk remain board-level priorities.",
            summary: "Regulators expect financial firms to prove important business services can stay within impact tolerances through disruption.",
            sources: [
              { label: "FCA operational resilience", url: "https://www.fca.org.uk/firms/operational-resilience" },
              { label: "Bank of England PRA", url: "https://www.bankofengland.co.uk/prudential-regulation" },
            ],
          },
          {
            title: "Margin pressure and deposit competition are making productivity a strategic battleground.",
            summary: "Traditional banks need lower cost-to-serve and better digital adoption to protect returns as customer behaviour and rate sensitivity shift.",
            sources: [
              { label: "Results centre", url: "https://investors.natwestgroup.com/results-centre.aspx" },
              { label: "Investment case", url: "https://investors.natwestgroup.com/our-investment-case" },
            ],
          },
        ],
        businessPriorities: [
          {
            title: "Build a simple, safe and more customer-focused bank.",
            summary: "NatWest's investor positioning points to simplification, safety, customer focus, and disciplined growth as core priorities.",
            sources: [
              { label: "Investment case", url: "https://investors.natwestgroup.com/our-investment-case" },
              { label: "Annual report", url: "https://investors.natwestgroup.com/annual-report.aspx" },
            ],
          },
          {
            title: "Use technology, data and AI to improve customer outcomes and productivity.",
            summary: "Technology investment should connect customer experience, risk control, colleague productivity, and scalable digital service delivery.",
            sources: [
              { label: "Tech, data and AI", url: "https://www.natwestgroup.com/who-we-are/about-natwest-group/tech-data-and-AI.html" },
              { label: "Innovation", url: "https://www.natwestgroup.com/sustainability/society/innovation-and-digitisation.html" },
            ],
          },
          {
            title: "Protect trust through resilience, financial-crime controls, privacy and responsible governance.",
            summary: "Trust is central to a retail and commercial bank; resilience, conduct, data protection, and financial-crime controls underpin the growth story.",
            sources: [
              { label: "Annual report", url: "https://investors.natwestgroup.com/annual-report.aspx" },
              { label: "Results centre", url: "https://investors.natwestgroup.com/results-centre.aspx" },
            ],
          },
        ],
      },
      researchFirmPriorities: [
        {
          firm: "Gartner",
          priority: "Operationalize AI, data and resilience as governed business capabilities.",
          signal: "Gartner's 2026 technology trends point technology leaders toward AI readiness, data, cybersecurity, cloud and operating-model decisions that can be executed at scale.",
          implication: "For NatWest, modernization should be framed around governed AI adoption, resilient service delivery, and measurable productivity rather than isolated pilots.",
          sources: [
            { label: "Gartner 2026 tech trends", url: "https://www.gartner.com/en/articles/top-technology-trends-2026" },
          ],
        },
        {
          firm: "Forrester",
          priority: "Prove trust and customer value before scaling new digital investments.",
          signal: "Forrester's 2026 predictions emphasize a shift from hype to trusted outcomes, evidence-based decisions, transparency and measurable business value.",
          implication: "Prioritize use cases that improve customer trust, reduce friction, and show defensible value in risk, cost, revenue or service metrics.",
          sources: [
            { label: "Forrester Predictions 2026", url: "https://www.forrester.com/predictions/" },
          ],
        },
        {
          firm: "McKinsey",
          priority: "Move with precision and speed to defend customer primacy.",
          signal: "McKinsey's 2026 banking review highlights strong recent economics, customer ownership pressure, fintech and neobank acceleration, and AI's faster pace of disruption.",
          implication: "Strengthen customer ownership with faster execution, sharper segment strategies, and digital journeys that reduce the opportunity for competitors to intermediate the relationship.",
          sources: [
            { label: "McKinsey Global Banking 2026", url: "https://www.mckinsey.com/industries/financial-services/our-insights/global-banking-annual-review" },
          ],
        },
        {
          firm: "Deloitte",
          priority: "Industrialize AI while modernizing data, payments and financial-crime defenses.",
          signal: "Deloitte's 2026 banking outlook points to AI at scale, brittle data infrastructure, stablecoin disruption, margin pressure and faster financial-crime threats.",
          implication: "Connect AI investment to data modernization, payments strategy, resilience, fraud controls and operating efficiency so transformation supports both growth and control.",
          sources: [
            { label: "Deloitte banking outlook 2026", url: "https://www.deloitte.com/us/en/insights/industry/financial-services/financial-services-industry-outlooks/banking-industry-outlook.html" },
          ],
        },
        {
          firm: "Accenture",
          priority: "Use AI to deepen relationships, not only reduce cost.",
          signal: "Accenture's banking trends frame generative AI as a force that reshapes roles, cloud, data, customer conversations, pricing, core modernization and operating efficiency.",
          implication: "Prioritize AI use cases that improve advice, loyalty and productivity while modernizing core platforms and engineering practices.",
          sources: [
            { label: "Accenture banking trends", url: "https://www.accenture.com/us-en/insights/banking/top-10-trends-banking" },
          ],
        },
        {
          firm: "Capgemini",
          priority: "Shift toward intelligent banking and relationship-led experiences.",
          signal: "Capgemini's World Retail Banking Report highlights intelligent banking, customer experience, data and AI as levers for more relevant digital and human engagement.",
          implication: "Build the priority story around personalized journeys, better banker tools, data-driven engagement and service experiences that feel connected across channels.",
          sources: [
            { label: "Capgemini retail banking report", url: "https://www.capgemini.com/insights/research-library/world-retail-banking-report/" },
          ],
        },
        {
          firm: "PwC",
          priority: "Anticipate disruption across AI, DeFi, embedded finance, cyber and regulation.",
          signal: "PwC's financial services research points to breakthrough technology, decentralized finance, embedded finance, new entrants, customer expectations, cyber threats and regulatory shifts.",
          implication: "Treat modernization, cyber resilience and product innovation as connected priorities, with governance strong enough to keep pace with market disruption.",
          sources: [
            { label: "PwC financial services", url: "https://www.pwc.com/gx/en/industries/financial-services.html" },
          ],
        },
        {
          firm: "BCG",
          priority: "Turn AI disruption into growth through modern operations and digital transformation.",
          signal: "BCG's financial institutions research emphasizes AI disruption, modernized operations, digital transformation, payments, fintech pressure and evolving customer demand.",
          implication: "Use the narrative to connect growth, fintech defense, payments innovation and operating modernization into one transformation agenda.",
          sources: [
            { label: "BCG financial institutions", url: "https://www.bcg.com/industries/financial-institutions/overview" },
          ],
        },
      ],
    },
    {
      name: "BT Group plc",
      legalName: "BT Group plc",
      aliases: ["BT", "British Telecom"],
      ticker: "BT-A.L",
      exchange: "London Stock Exchange",
      industry: "Telecommunications",
      hq: "London, United Kingdom",
      employees: "97000",
      revenue: "GBP 20.8B",
      netProfit: "GBP 0.9B",
      description: "Telecommunications group providing connectivity, networks, consumer, enterprise, and wholesale services.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "easyJet plc",
      legalName: "easyJet plc",
      aliases: ["easyJet", "Easy Jet", "EZJ"],
      ticker: "EZJ.L",
      companyNumber: "03959649",
      exchange: "London Stock Exchange",
      industry: "Airlines",
      primaryIndustry: "Airlines",
      subSector: "European low-cost and short-haul passenger airline",
      peerGroup: "european-airlines",
      website: "https://corporate.easyjet.com",
      domain: "corporate.easyjet.com",
      hq: "Luton, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "19224",
      priorEmployees: "17797",
      revenue: "GBP 10.106B",
      annualRevenueUsd: "13540000000",
      ebitda: "GBP 1.446B",
      ebitdaUsd: "1938000000",
      totalAssets: "GBP 11.507B",
      totalAssetsUsd: "15420000000",
      netProfit: "GBP 494M",
      fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "7.0", cagr3: "9.0" },
      financialHistory: [
        { year: "FY2021", revenue: "GBP 1.458B", yoyGrowth: "-51.5", operatingMargin: "-71.1", netMargin: "-58.8" },
        { year: "FY2022", revenue: "GBP 5.769B", yoyGrowth: "295.7", operatingMargin: "0.1", netMargin: "-2.9" },
        { year: "FY2023", revenue: "GBP 8.171B", yoyGrowth: "41.6", operatingMargin: "5.8", netMargin: "4.0" },
        { year: "FY2024", revenue: "GBP 9.309B", yoyGrowth: "13.9", operatingMargin: "6.4", netMargin: "4.9" },
        { year: "FY2025", revenue: "GBP 10.106B", yoyGrowth: "8.6", operatingMargin: "7.0", netMargin: "4.9" },
      ],
      description: "European low-cost airline group combining short-haul passenger services with a growing package-holidays business.",
      source: "easyJet FY2025 Annual Report and Accounts.",
      sourceSnippets: [{ source: "easyJet Annual Report", label: "Five-year financial summary", snippet: "FY2025 revenue was GBP 10,106m and headline EBIT was GBP 703m; the report also presents comparable FY2021-FY2024 results.", url: "https://s203.q4cdn.com/522538739/files/doc_financials/2025/ar/easyJetARA25_DIGITAL_sm.pdf" }],
    },
    {
      name: "Ryanair Holdings plc",
      legalName: "Ryanair Holdings plc",
      aliases: ["Ryanair"], ticker: "RYA.IR", exchange: "Euronext Dublin / Nasdaq",
      industry: "Airlines", primaryIndustry: "Airlines", subSector: "European ultra-low-cost airline", peerGroup: "european-airlines",
      hq: "Dublin, Ireland", hqCountry: "Ireland", employees: "27076", priorEmployees: "24498", revenue: "EUR 13.95B", netProfit: "EUR 1.612B", fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "11.0", cagr3: "3.8" }, description: "European ultra-low-cost airline group.", source: "Ryanair FY2025 Annual Report.",
    },
    {
      name: "Wizz Air Holdings Plc",
      legalName: "Wizz Air Holdings Plc",
      aliases: ["Wizz Air"], ticker: "WIZZ.L", exchange: "London Stock Exchange",
      industry: "Airlines", primaryIndustry: "Airlines", subSector: "European ultra-low-cost airline", peerGroup: "european-airlines",
      hq: "Budapest, Hungary", hqCountry: "Hungary", employees: "8146", priorEmployees: "7928", revenue: "EUR 5.268B", netProfit: "EUR 213.9M", fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "3.2", cagr3: "3.8" }, description: "European ultra-low-cost airline focused on Central and Eastern Europe.", source: "Wizz Air FY2025 Annual Report.",
    },
    {
      name: "Jet2 plc",
      legalName: "Jet2 plc",
      aliases: ["Jet2", "Jet2holidays"], ticker: "JET2.L", exchange: "London Stock Exchange",
      industry: "Airlines", primaryIndustry: "Airlines", subSector: "UK leisure airline and package holidays", peerGroup: "european-airlines",
      hq: "Leeds, United Kingdom", hqCountry: "United Kingdom", employees: "15205", priorEmployees: "14053", revenue: "GBP 7.174B", netProfit: "GBP 446.8M", fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "6.2", cagr3: "14.7" }, description: "UK leisure airline and vertically integrated package-holidays group.", source: "Jet2 FY2025 Annual Report.",
    },
    {
      name: "Norwegian Air Shuttle ASA",
      legalName: "Norwegian Air Shuttle ASA",
      aliases: ["Norwegian", "Norwegian Air"], ticker: "NAS.OL", exchange: "Oslo Stock Exchange",
      industry: "Airlines", primaryIndustry: "Airlines", subSector: "Nordic low-cost and regional airline", peerGroup: "european-airlines",
      hq: "Fornebu, Norway", hqCountry: "Norway", employees: "8992", priorEmployees: "8754", revenue: "NOK 37.646B", netProfit: "NOK 2.708B", fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "9.9", cagr3: "8.3" }, description: "Nordic low-cost airline group including Wideroe regional operations.", source: "Norwegian FY2025 Annual Report.",
    },
    {
      name: "International Consolidated Airlines Group S.A.",
      legalName: "International Consolidated Airlines Group S.A.",
      aliases: ["IAG", "International Airlines Group"], ticker: "IAG.L", exchange: "London Stock Exchange / Bolsa de Madrid",
      industry: "Airlines", primaryIndustry: "Airlines", subSector: "European network and short-haul airline group", peerGroup: "european-airlines",
      hq: "London, United Kingdom", hqCountry: "United Kingdom", employees: "75871", priorEmployees: "73498", revenue: "EUR 33.213B", netProfit: "EUR 3.342B", fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "15.1", cagr3: "6.0" }, description: "European airline group whose carriers include British Airways, Iberia, Vueling and Aer Lingus.", source: "IAG FY2025 Annual Report.",
    },
    {
      name: "Shell plc",
      legalName: "Shell plc",
      aliases: ["Shell", "Royal Dutch Shell"],
      ticker: "SHEL.L",
      exchange: "London Stock Exchange",
      industry: "Energy",
      hq: "London, United Kingdom",
      employees: "103000",
      revenue: "USD 316.6B",
      netProfit: "USD 19.4B",
      description: "Integrated energy company spanning upstream, downstream, chemicals, trading, renewables, and energy solutions.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Tesco PLC",
      legalName: "Tesco PLC",
      aliases: ["Tesco"],
      ticker: "TSCO.L",
      exchange: "London Stock Exchange",
      industry: "Retail",
      peerGroup: "uk-retail",
      hq: "Welwyn Garden City, United Kingdom",
      employees: "330000",
      revenue: "GBP 68.2B",
      netProfit: "GBP 1.2B",
      peerMetrics: { operatingMargin: "4.2", cagr3: "6.0" },
      description: "Food-led retailer with stores, online grocery, wholesale, loyalty, and banking services.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Marks and Spencer Group plc",
      legalName: "Marks and Spencer Group plc",
      aliases: ["Marks & Spencer", "Marks and Spencers", "M&S", "MKS"],
      ticker: "MKS.L",
      exchange: "London Stock Exchange",
      industry: "Retail",
      primaryIndustry: "Retail",
      subSector: "Food, clothing and home retail",
      website: "https://www.marksandspencer.com",
      domain: "marksandspencer.com",
      peerGroup: "uk-retail",
      hq: "London, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "63000",
      revenue: "GBP 13.8B",
      netProfit: "GBP 0.3B",
      peerMetrics: { operatingMargin: "7.1", cagr3: "8.3" },
      description: "UK retailer focused on clothing, home, food, and omnichannel retail.",
      source: "Local company lookup seed backed by public annual-results snippets; validate against latest annual report and market data.",
      financialHistory: [
        { year: "FY2021", revenue: "GBP 9.2B", yoyGrowth: "", operatingMargin: "0.5", netMargin: "-2.2" },
        { year: "FY2022", revenue: "GBP 10.9B", yoyGrowth: "18.9", operatingMargin: "5.6", netMargin: "2.8" },
        { year: "FY2023", revenue: "GBP 11.9B", yoyGrowth: "9.6", operatingMargin: "4.9", netMargin: "3.1" },
        { year: "FY2024", revenue: "GBP 13.0B", yoyGrowth: "9.3", operatingMargin: "6.5", netMargin: "3.3" },
        { year: "FY2025", revenue: "GBP 13.8B", yoyGrowth: "6.0", operatingMargin: "7.1", netMargin: "2.1" },
      ],
    },
    {
      name: "J Sainsbury plc",
      legalName: "J Sainsbury plc",
      aliases: ["Sainsbury", "Sainsbury's", "Sainsburys", "J Sainsbury"],
      ticker: "SBRY.L",
      exchange: "London Stock Exchange",
      industry: "Retail",
      peerGroup: "uk-retail",
      hq: "London, United Kingdom",
      employees: "140000",
      revenue: "GBP 33.6B",
      netProfit: "GBP 0.4B",
      peerMetrics: { operatingMargin: "3.0", cagr3: "4.1" },
      description: "UK supermarket and general merchandise retailer spanning grocery, convenience, Argos, and digital channels.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Next plc",
      legalName: "Next plc",
      aliases: ["Next", "NEXT"],
      ticker: "NXT.L",
      exchange: "London Stock Exchange",
      industry: "Retail",
      peerGroup: "uk-retail",
      hq: "Enderby, United Kingdom",
      employees: "50000",
      revenue: "GBP 6.9B",
      netProfit: "GBP 0.9B",
      peerMetrics: { operatingMargin: "18.5", cagr3: "12.0" },
      description: "UK clothing, footwear, homeware, online, and brand-platform retailer.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Associated British Foods plc",
      legalName: "Associated British Foods plc",
      aliases: ["ABF", "Primark", "Associated British Foods"],
      ticker: "ABF.L",
      exchange: "London Stock Exchange",
      industry: "Retail",
      peerGroup: "uk-retail",
      hq: "London, United Kingdom",
      employees: "138000",
      revenue: "GBP 20.1B",
      netProfit: "GBP 1.4B",
      peerMetrics: { operatingMargin: "8.8", cagr3: "5.0" },
      description: "Diversified group including Primark retail, grocery, ingredients, agriculture, and sugar businesses.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "Kingfisher plc",
      legalName: "Kingfisher plc",
      aliases: ["Kingfisher", "B&Q", "Screwfix"],
      ticker: "KGF.L",
      exchange: "London Stock Exchange",
      industry: "Retail",
      peerGroup: "uk-retail",
      hq: "London, United Kingdom",
      employees: "78000",
      revenue: "GBP 12.8B",
      netProfit: "GBP 0.3B",
      peerMetrics: { operatingMargin: "4.5", cagr3: "-0.4" },
      description: "Home-improvement retailer operating B&Q, Screwfix, Castorama, Brico Depot, and related digital channels.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "B&M European Value Retail S.A.",
      legalName: "B&M European Value Retail S.A.",
      aliases: ["B&M", "B and M", "BM Retail"],
      ticker: "BME.L",
      exchange: "London Stock Exchange",
      industry: "Retail",
      peerGroup: "uk-retail",
      hq: "Luxembourg / United Kingdom",
      employees: "38000",
      revenue: "GBP 5.6B",
      netProfit: "GBP 0.3B",
      peerMetrics: { operatingMargin: "10.2", cagr3: "5.8" },
      description: "Value retailer operating discount general merchandise and grocery stores across the UK and France.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
    {
      name: "N Brown Group plc",
      legalName: "N Brown Group plc",
      aliases: ["N Brown", "N-Brown", "NBrown", "JD Williams", "Simply Be", "Jacamo", "BWNG"],
      ticker: "BWNG.L",
      exchange: "Formerly London Stock Exchange; taken private in 2025",
      industry: "Retail",
      primaryIndustry: "Retail",
      subSector: "Online fashion, home and financial-services retail",
      website: "https://www.nbrown.co.uk",
      domain: "nbrown.co.uk",
      peerGroup: "online-retail",
      hq: "Manchester, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "Validate current filing",
      revenue: "GBP 600.9M",
      annualRevenueUsd: "760000000",
      ebitdaUsd: "60400000",
      totalAssetsUsd: "",
      netProfit: "GBP 0.8M",
      fiscalYear: "FY2024",
      peerMetrics: { operatingMargin: "4.5", cagr3: "-6.0" },
      description: "Manchester-headquartered online retailer behind JD Williams, Simply Be and Jacamo, focused on fashion, home and financial-services retail.",
      source: "Local fallback profile from public FY2024 results; Perplexity should refresh against annual report, investor relations and press releases when configured.",
      sourceSnippets: [
        {
          source: "Public FY2024 results snippet",
          label: "FY2024 revenue and adjusted EBITDA",
          snippet: "N Brown reported FY2024 revenue of GBP 600.9M, adjusted EBITDA of GBP 47.6M and pretax profit of GBP 5.3M.",
          url: "https://www.nbrown.co.uk/investors/",
        },
        {
          source: "Company website",
          label: "N Brown investor relations",
          snippet: "N Brown Group is an online retailer with brands including JD Williams, Simply Be and Jacamo.",
          url: "https://www.nbrown.co.uk/investors/",
        },
      ],
    },
    {
      name: "The Very Group Limited",
      legalName: "The Very Group Limited",
      aliases: ["The Very Group", "Very Group", "Very.co.uk", "Littlewoods"],
      ticker: "",
      exchange: "Private company",
      industry: "Online retail",
      primaryIndustry: "Retail",
      subSector: "Multi-category online retail and consumer finance",
      peerGroup: "online-retail",
      website: "https://www.theverygroup.com",
      domain: "theverygroup.com",
      hq: "Liverpool, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "3100",
      revenue: "GBP 2.1B",
      ebitda: "GBP 307.1M",
      fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "", cagr3: "" },
      description: "UK multi-category online retailer operating Very and Littlewoods, with consumer finance supporting its digital retail proposition.",
      source: "The Very Group FY2025 annual report and official investor results.",
      sourceSnippets: [
        {
          source: "The Very Group FY2025 annual report",
          label: "Digital retail operating model",
          snippet: "The group describes its primary model as a user-centric ecommerce platform, with flexible payment options supporting retail customers.",
          url: "https://www.theverygroup.com/files/Results/2025/eoy/the-very-group-fy25-annual-report.pdf",
        },
      ],
    },
    {
      name: "AO World plc",
      legalName: "AO World plc",
      aliases: ["AO World", "AO.com"],
      ticker: "AO.L",
      exchange: "London Stock Exchange",
      industry: "Online retail",
      primaryIndustry: "Retail",
      subSector: "Online electricals and recommerce",
      peerGroup: "online-retail",
      hq: "Bolton, United Kingdom",
      hqCountry: "United Kingdom",
      revenue: "GBP 1.2B",
      fiscalYear: "FY2026",
      peerMetrics: { operatingMargin: "", cagr3: "11.4" },
      description: "UK online electricals retailer with logistics, recycling and recommerce operations.",
      source: "AO World FY2026 annual results.",
    },
    {
      name: "ASOS plc",
      legalName: "ASOS plc",
      aliases: ["ASOS"],
      ticker: "ASC.L",
      exchange: "London Stock Exchange",
      industry: "Online retail",
      primaryIndustry: "Retail",
      subSector: "Online fashion retail",
      peerGroup: "online-retail",
      hq: "London, United Kingdom",
      hqCountry: "United Kingdom",
      revenue: "GBP 2.5B",
      ebitda: "GBP 131.6M",
      fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "", cagr3: "-12.0" },
      description: "Global online fashion retailer serving digitally native customers through owned and partner brands.",
      source: "ASOS FY2025 annual report.",
    },
    {
      name: "THG plc",
      legalName: "THG plc",
      aliases: ["THG", "The Hut Group"],
      ticker: "THG.L",
      exchange: "London Stock Exchange",
      industry: "Online retail",
      primaryIndustry: "Retail",
      subSector: "Online beauty, nutrition and ecommerce services",
      peerGroup: "online-retail",
      hq: "Manchester, United Kingdom",
      hqCountry: "United Kingdom",
      revenue: "GBP 1.7B",
      ebitda: "GBP 76.6M",
      fiscalYear: "FY2025",
      peerMetrics: { operatingMargin: "4.5", cagr3: "1.7" },
      description: "Digital consumer brands group spanning online beauty, nutrition and ecommerce services.",
      source: "THG FY2025 financial performance release.",
    },
    {
      name: "Coventry Building Society",
      legalName: "Coventry Building Society",
      aliases: ["Coventry Building Society", "Coventry BS", "CBS"],
      ticker: "",
      exchange: "Companies House / Mutual",
      industry: "Financial services",
      primaryIndustry: "Financial services",
      subSector: "Building society, mortgages and savings",
      website: "https://www.coventrybuildingsociety.co.uk",
      domain: "coventrybuildingsociety.co.uk",
      hq: "Coventry, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "Validate current filing",
      revenue: "Validate current filing",
      netProfit: "Validate current filing",
      description: "UK building society providing savings, mortgage, and financial services.",
      source: "Local public company index; validate against annual report, Companies House and market data.",
      sourceSnippets: [
        {
          source: "Local public company index",
          label: "Company identity",
          snippet: "Coventry Building Society is a UK building society in financial services. Validate revenue and latest filings before client use.",
          url: "https://www.coventrybuildingsociety.co.uk/",
        },
      ],
    },
    {
      name: "Aviva plc",
      legalName: "Aviva plc",
      aliases: ["Aviva", "AVIVA", "Aviva PLC", "AV.L"],
      ticker: "AV.L",
      exchange: "London Stock Exchange",
      industry: "Insurance",
      primaryIndustry: "Financial services",
      subSector: "Insurance, wealth and retirement",
      website: "https://www.aviva.com",
      domain: "aviva.com",
      peerGroup: "insurance",
      hq: "London, United Kingdom",
      hqCountry: "United Kingdom",
      employees: "25000",
      revenue: "GBP 18.1B",
      netProfit: "GBP 1.2B",
      totalAssetsUsd: "475000000000",
      peerMetrics: { operatingMargin: "9.8", cagr3: "4.2" },
      description: "UK-headquartered insurance, wealth and retirement group serving retail, workplace and commercial customers.",
      source: "Local company lookup seed backed by public annual-results patterns; validate against Aviva annual report and investor materials.",
      financialHistory: [
        { year: "FY2020", revenue: "GBP 16.3B", yoyGrowth: "", operatingMargin: "7.4", netMargin: "4.8" },
        { year: "FY2021", revenue: "GBP 17.3B", yoyGrowth: "6.1", operatingMargin: "7.9", netMargin: "5.5" },
        { year: "FY2022", revenue: "GBP 17.0B", yoyGrowth: "-1.7", operatingMargin: "8.1", netMargin: "4.9" },
        { year: "FY2023", revenue: "GBP 17.2B", yoyGrowth: "1.2", operatingMargin: "8.5", netMargin: "5.7" },
        { year: "FY2024", revenue: "GBP 18.1B", yoyGrowth: "5.2", operatingMargin: "9.8", netMargin: "6.6" },
      ],
      sourceSnippets: [
        {
          source: "Local public company index",
          label: "Company identity",
          snippet: "Aviva plc is a UK-headquartered insurance, wealth and retirement group listed in London as AV.L. Validate latest financials against the annual report.",
          url: "https://www.aviva.com/investors/",
        },
      ],
    },
    {
      name: "Legal & General Group plc",
      legalName: "Legal & General Group plc",
      aliases: ["Legal and General", "L&G", "Legal & General", "LGEN"],
      ticker: "LGEN.L",
      exchange: "London Stock Exchange",
      industry: "Insurance",
      peerGroup: "insurance",
      hq: "London, United Kingdom",
      employees: "12000",
      revenue: "GBP 11.9B",
      netProfit: "GBP 0.5B",
      peerMetrics: { operatingMargin: "8.8", cagr3: "2.6" },
      description: "UK financial services group focused on insurance, retirement, asset management and institutional investment.",
      source: "Local public company index; validate against annual report and market data.",
    },
    {
      name: "Prudential plc",
      legalName: "Prudential plc",
      aliases: ["Prudential", "PRU"],
      ticker: "PRU.L",
      exchange: "London Stock Exchange",
      industry: "Insurance",
      peerGroup: "insurance",
      hq: "London, United Kingdom",
      employees: "15000",
      revenue: "USD 14.7B",
      netProfit: "USD 1.7B",
      peerMetrics: { operatingMargin: "11.5", cagr3: "7.2" },
      description: "Insurance and asset-management group focused on Asian and African growth markets.",
      source: "Local public company index; validate against annual report and market data.",
    },
    {
      name: "Phoenix Group Holdings plc",
      legalName: "Phoenix Group Holdings plc",
      aliases: ["Phoenix Group", "PHNX"],
      ticker: "PHNX.L",
      exchange: "London Stock Exchange",
      industry: "Insurance",
      peerGroup: "insurance",
      hq: "London, United Kingdom",
      employees: "8000",
      revenue: "GBP 8.5B",
      netProfit: "GBP 0.4B",
      peerMetrics: { operatingMargin: "7.9", cagr3: "3.4" },
      description: "Long-term savings and retirement business serving UK customers through pensions, life and savings brands.",
      source: "Local public company index; validate against annual report and market data.",
    },
    {
      name: "Admiral Group plc",
      legalName: "Admiral Group plc",
      aliases: ["Admiral", "ADM"],
      ticker: "ADM.L",
      exchange: "London Stock Exchange",
      industry: "Insurance",
      peerGroup: "insurance",
      hq: "Cardiff, United Kingdom",
      employees: "11000",
      revenue: "GBP 4.8B",
      netProfit: "GBP 0.4B",
      peerMetrics: { operatingMargin: "13.4", cagr3: "8.1" },
      description: "UK insurance group focused on motor, home, travel and personal finance products.",
      source: "Local public company index; validate against annual report and market data.",
    },
    {
      name: "Amazon.com Inc.",
      legalName: "Amazon.com Inc.",
      aliases: ["Amazon", "AWS"],
      ticker: "AMZN",
      exchange: "NASDAQ",
      industry: "Technology and retail",
      peerGroup: "technology",
      hq: "Seattle, United States",
      employees: "1525000",
      revenue: "USD 638.0B",
      netProfit: "USD 59.2B",
      description: "Global e-commerce, cloud, advertising, logistics, and digital services company.",
      source: "Local company lookup seed; validate against annual report and market data.",
    },
  ];

  function isExampleBankName(value) {
    return /\bexample\s+bank\b/i.test(String(value || ""));
  }

  function isDemoCompany(company) {
    return isExampleBankName(company && (company.name || company.legalName || company.company || ""));
  }

  function publicCompanyFixtures() {
    return companyLookupFixtures.filter((company) => !isDemoCompany(company));
  }

  const themeOptions = ["Growth", "Cost-Efficiency", "Digital-Tech", "ESG", "Risk", "People"];
  const signalOptions = ["Competitor move", "Partnership", "M&A", "Leadership change"];

  const tableDefs = {
    financialTrends: [
      { key: "year", label: "Year" },
      { key: "revenue", label: "Revenue" },
      { key: "yoyGrowth", label: "YoY Growth %" },
      { key: "operatingMargin", label: "Operating Margin %" },
      { key: "netMargin", label: "Net Margin %" },
    ],
    marketTriggers: [
      { key: "source", label: "Analyst Source" },
      { key: "publicationDate", label: "Publication Date", type: "date" },
      { key: "whyItMatters", label: "Why It Matters", wide: true },
      { key: "sourceLink", label: "Source Link", wide: true },
    ],
    marketShare: [
      { key: "company", label: "Company" },
      { key: "share", label: "Market Share %" },
    ],
    peers: [
      { key: "enabled", label: "On", type: "checkbox" },
      { key: "company", label: "Peer" },
      { key: "revenue", label: "Revenue" },
      { key: "employees", label: "Employees" },
      { key: "totalProfit", label: "Total Profit" },
      { key: "operatingMargin", label: "Operating Margin %" },
      { key: "netMargin", label: "Net Margin %" },
      { key: "cagr3", label: "3-Year CAGR %" },
    ],
    benchmarkNotes: [
      { key: "industry", label: "Industry" },
      { key: "financial", label: "Financial Benchmarks", wide: true },
      { key: "operational", label: "Operational Benchmarks", wide: true },
      { key: "customerMarket", label: "Customer / Market Benchmarks", wide: true },
    ],
    signalScan: [
      { key: "date", label: "Date", type: "date" },
      { key: "headline", label: "Headline", wide: true },
      { key: "signalType", label: "Signal Type", options: signalOptions },
      { key: "summary", label: "Summary", wide: true },
      { key: "sourceLink", label: "Source Link", wide: true },
    ],
    csuiteQuotes: [
      { key: "executiveName", label: "Executive Name" },
      { key: "title", label: "Title" },
      { key: "priorityTheme", label: "Priority Theme", options: themeOptions },
      { key: "quote", label: "Verbatim Quote", wide: true },
      { key: "source", label: "Source" },
      { key: "date", label: "Date", type: "date" },
    ],
  };

  const emptyRows = {
    financialTrends: {
      year: "",
      revenue: "",
      yoyGrowth: "",
      operatingMargin: "",
      netMargin: "",
    },
    marketTriggers: { source: "", publicationDate: "", whyItMatters: "", sourceLink: "" },
    marketShare: { company: "", share: "" },
    peers: {
      enabled: true,
      company: "",
      revenue: "",
      employees: "",
      totalProfit: "",
      operatingMargin: "",
      netMargin: "",
      cagr3: "",
    },
    benchmarkNotes: { industry: "", financial: "", operational: "", customerMarket: "" },
    signalScan: { date: "", headline: "", signalType: "Competitor move", summary: "", sourceLink: "" },
    csuiteQuotes: {
      executiveName: "",
      title: "",
      priorityTheme: "Growth",
      quote: "",
      source: "",
      date: "",
    },
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function attr(value) {
    return escapeHtml(value).replace(/\n/g, " ");
  }

  function normalizeLookupQuery(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9& ]+/g, " ")
      .replace(/\b(ag|co|corp|corporation|group|holdings|inc|incorporated|limited|llc|ltd|plc|sa|se)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function lookupToken(token) {
    return token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token;
  }

  function lookupTokens(value) {
    const stopwords = new Set(["a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "the", "to", "with"]);
    return new Set(
      normalizeLookupQuery(value)
        .split(" ")
        .filter((token) => token && !stopwords.has(token))
        .map(lookupToken)
    );
  }

  function resetCompanyLookup() {
    if (companyLookupTimer) window.clearTimeout(companyLookupTimer);
    state.companyLookup = {
      query: "",
      matches: [],
      validationLinks: [],
      sourceSnippets: [],
      sourcesChecked: [],
      selected: null,
      typedAccepted: false,
      noMatch: false,
      loading: false,
      scope: "local",
      level: "muted",
      status: "Type a customer name, then look up and select the correct company match.",
    };
  }

  function setCompanyLookupStatus(status, level) {
    state.companyLookup.status = status;
    state.companyLookup.level = level || "muted";
  }

  function selectedCompanyStillCurrent(companyName) {
    const selected = state.companyLookup.selected;
    return !!selected && normalizeLookupQuery(selected.name) === normalizeLookupQuery(companyName);
  }

  function companySearchUrls(query, ticker) {
    const name = encodeURIComponent(query || "");
    const symbol = encodeURIComponent(ticker || query || "");
    const chatgptPrompt = encodeURIComponent(`Company Name: ${query || ""}. Return a concise company profile with official company name, stock ticker or CIK if available, exchange if publicly listed, website/domain, HQ country, primary industry, sub-sector, latest annual revenue with fiscal year and currency, annual revenue USD, EBITDA USD, total assets USD, operating margin, net margin, employees, top industry peers, annual report links, investor relations links, Companies House record if UK, and source links for every value. Also return a five-year financial_history array by querying each full fiscal year from annual reports, Yahoo Finance, Google Finance or Google results. Each row must include year, revenue, yoy_growth, operating_margin and net_margin. If a value is unavailable, say unavailable.`);
    return [
      { label: "ChatGPT Company Name", url: `https://chatgpt.com/?q=${chatgptPrompt}` },
      { label: "Open Bing", url: `https://www.bing.com/search?q=${name}+company+profile+revenue+industry` },
      { label: "Companies House", url: `https://find-and-update.company-information.service.gov.uk/search?q=${name}` },
      { label: "Open Google", url: `https://www.google.com/search?q=${name}+company+profile` },
      { label: "Open Yahoo", url: `https://finance.yahoo.com/lookup?s=${symbol}` },
      { label: "Google Finance", url: `https://www.google.com/search?q=${symbol}+Google+Finance` },
      { label: "Open Wikidata", url: `https://www.wikidata.org/w/index.php?search=${name}` },
    ];
  }

  function domainFromUrl(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
      const parsed = new URL(text.includes("://") ? text : `https://${text}`);
      return parsed.hostname.replace(/^www\./i, "");
    } catch (_) {
      return text.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
    }
  }

  function scoreCompanyFixture(query, company) {
    const normalizedQuery = normalizeLookupQuery(query);
    if (!normalizedQuery) return { confidence: 0, reason: "No search text entered." };
    const ticker = String(company.ticker || "").toLowerCase();
    const tickerCompact = ticker.replace(/[^a-z0-9]/g, "");
    const tickerRoot = ticker.split(".")[0].replace(/[^a-z0-9]/g, "");
    const names = [company.name, company.legalName, ...(company.aliases || [])].map(normalizeLookupQuery);
    const compact = normalizedQuery.replace(/\s+/g, "");

    if (ticker && [tickerCompact, tickerRoot].includes(compact)) {
      return { confidence: 98, reason: "Ticker match." };
    }
    if (names.includes(normalizedQuery)) {
      return { confidence: 96, reason: "Exact company-name match." };
    }
    if (names.some((name) => name.includes(normalizedQuery))) {
      return { confidence: 86, reason: "Company name contains the search text." };
    }

    const queryTokens = lookupTokens(query);
    const tokenThreshold = Math.min(2, queryTokens.size);
    const overlap = Math.max(
      0,
      ...[company.name, company.legalName, ...(company.aliases || [])].map((name) => {
        const tokens = lookupTokens(name);
        return Array.from(queryTokens).filter((token) => tokens.has(token)).length;
      })
    );
    if (tokenThreshold && overlap >= tokenThreshold) {
      return { confidence: Math.min(78, 42 + overlap * 16), reason: "Partial token match." };
    }
    return { confidence: 0, reason: "No meaningful match." };
  }

  function localCompanyLookup(query) {
    const matches = publicCompanyFixtures()
      .map((company) => {
        const score = scoreCompanyFixture(query, company);
        return {
          ...company,
          aliases: undefined,
          id: normalizeLookupQuery(company.name).replace(/\s+/g, "-") || company.ticker,
          confidence: score.confidence,
          matchReason: score.reason,
          validationLinks: companySearchUrls(company.name, company.ticker),
          sourceSnippets: Array.isArray(company.sourceSnippets) ? company.sourceSnippets : [],
          financialRows: buildCompanyFinancialRows(company),
          priorityInsights: company.priorityInsights || buildPriorityInsights(company),
          researchFirmPriorities: mergeResearchFirmPriorities(company.researchFirmPriorities, company),
        };
      })
      .filter((company) => company.confidence >= 35)
      .sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name))
      .slice(0, 6);

    return {
      query,
      matches,
      scope: "local",
      sourceSnippets: [],
      validationLinks: companySearchUrls(query),
      sourcesChecked: [
        { source: "OpenAI", enabled: false },
        { source: "Perplexity", enabled: false },
        { source: "SEC EDGAR", enabled: false },
        { source: "Companies House", enabled: true, web_fallback: true },
        { source: "Yahoo Finance", enabled: true },
        { source: "Google Search snippets", enabled: true },
        { source: "Local company index", enabled: true },
      ],
      message: matches.length
        ? "Select the right company match before profile, revenue, benchmarks, and analysis refresh."
        : "No local match found. Use the typed company only after validating the public search links.",
    };
  }

  function lookupMatchMergeKey(match) {
    const ticker = normalizeLookupQuery(match && (match.ticker || match.cik || match.companyNumber));
    if (ticker) return `ticker:${ticker}`;
    return `name:${normalizeLookupQuery(match && (match.name || match.legalName))}`;
  }

  function lookupMatchNames(match) {
    return [match && match.name, match && match.legalName, ...((match && match.aliases) || [])]
      .map(normalizeLookupQuery)
      .filter(Boolean);
  }

  function sameLookupCompany(left, right) {
    const leftTicker = normalizeLookupQuery(left && (left.ticker || left.cik || left.companyNumber));
    const rightTicker = normalizeLookupQuery(right && (right.ticker || right.cik || right.companyNumber));
    if (leftTicker && rightTicker && leftTicker === rightTicker) return true;
    const leftNames = new Set(lookupMatchNames(left));
    return lookupMatchNames(right).some((name) => leftNames.has(name));
  }

  function mergeCompanyLookupMatches(primaryMatches, fallbackMatches) {
    const byKey = new Map();
    [...(primaryMatches || []), ...(fallbackMatches || [])].forEach((match) => {
      if (!match) return;
      const existingEntry = Array.from(byKey.entries()).find((entry) => sameLookupCompany(entry[1], match));
      const key = existingEntry ? existingEntry[0] : lookupMatchMergeKey(match);
      if (!key || key === "name:") return;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...match });
        return;
      }
      const existingScore = lookupProfileCompleteness(existing);
      const matchScore = lookupProfileCompleteness(match);
      const primary = matchScore > existingScore ? { ...match } : { ...existing };
      const secondary = matchScore > existingScore ? existing : match;
      byKey.set(key, mergeLookupProfileFields(primary, secondary));
    });
    return Array.from(byKey.values())
      .sort((a, b) =>
        Number(b.confidence || 0) - Number(a.confidence || 0) ||
        lookupProfileCompleteness(b) - lookupProfileCompleteness(a) ||
        String(a.name || "").localeCompare(String(b.name || ""))
      )
      .slice(0, 8);
  }

  function currencyTokenToCode(value) {
    const token = String(value || "").trim().toUpperCase();
    if (token === "\u00A3") return "GBP";
    if (token === "\u20AC") return "EUR";
    if (token === "$" || token === "US$") return "USD";
    if (token === "A$") return "AUD";
    if (token === "C$") return "CAD";
    return /^[A-Z]{3}$/.test(token) ? token : "";
  }

  function parseCurrencyMetric(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text || isValidationPlaceholder(text)) return null;
    const matches = [...text.matchAll(/(?:(A\$|C\$|US\$|GBP|USD|EUR|AUD|CAD|JPY|CHF|SEK|NOK|DKK|HKD|SGD|INR|AED|NZD|ZAR|\u00A3|\$|\u20AC)\s*)?([0-9][0-9,]*(?:\.\d+)?)\s*(T|TN|TRILLION|B|BN|BILLION|M|MN|MILLION|K|THOUSAND)?/gi)];
    const selected = matches.find((match) => match[1] || match[3]) ||
      matches.find((match) => Number(String(match[2] || "").replace(/,/g, "")) >= 1000000) ||
      matches[0];
    if (!selected) return null;
    const amount = parseFloat(String(selected[2] || "").replace(/,/g, ""));
    if (!Number.isFinite(amount)) return null;
    const suffix = String(selected[3] || "").toUpperCase();
    let billions = amount;
    if (/^(T|TN|TRILLION)$/.test(suffix)) billions = amount * 1000;
    if (/^(M|MN|MILLION)$/.test(suffix)) billions = amount / 1000;
    if (/^(K|THOUSAND)$/.test(suffix)) billions = amount / 1000000;
    if (!suffix && Math.abs(amount) >= 1000000) billions = amount / 1000000000;
    return {
      billions,
      currency: currencyTokenToCode(selected[1]) || currencyCode(text),
    };
  }

  function parseCurrencyAmount(value) {
    const metric = parseCurrencyMetric(value);
    return metric && Number.isFinite(metric.billions) ? metric.billions : null;
  }

  function annualRevenueUsdPlainNumber(value) {
    const text = String(value || "").trim();
    if (!text || isValidationPlaceholder(text)) return "";
    const billions = parseCurrencyAmount(text);
    if (billions == null || !Number.isFinite(billions)) return "";
    return String(Math.round(billions * 1000000000));
  }

  function lookupRevenueFromText(value) {
    const text = String(value || "").replace(/\s+/g, " ");
    const patterns = [
      /(?:revenue|total revenue|annual revenue|latest annual revenue)(?:\s+(?:was|of|reached|rose to|at|:))?\s*(GBP|USD|EUR|Â£|\$|â‚¬)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(trillion|tn|t|billion|bn|b|million|mn|m)/i,
      /(GBP|USD|EUR|Â£|\$|â‚¬)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(trillion|tn|t|billion|bn|b|million|mn|m)[^.]{0,100}(?:revenue|total revenue|annual revenue)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const code = ({ "Â£": "GBP", "$": "USD", "â‚¬": "EUR" }[match[1]] || match[1]).toUpperCase();
      const amount = Number(String(match[2]).replace(/,/g, ""));
      const scale = String(match[3] || "").toLowerCase();
      if (!Number.isFinite(amount)) continue;
      const suffix = /^(trillion|tn|t)$/.test(scale) ? "T" : /^(million|mn|m)$/.test(scale) ? "M" : "B";
      return `${code} ${amount.toFixed(1)}${suffix}`;
    }
    return "";
  }

  function lookupAnnualRevenueUsdFromText(value) {
    const text = String(value || "").replace(/\s+/g, " ");
    const patterns = [
      /(?:annual revenue|revenue|latest annual revenue)[^.;|]{0,40}(?:USD|\$)[^0-9]{0,12}([0-9][0-9,]*(?:\.\d+)?)\s*(trillion|tn|t|billion|bn|b|million|mn|m)?/i,
      /(?:USD|\$)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(trillion|tn|t|billion|bn|b|million|mn|m)[^.]{0,100}(?:annual revenue|revenue)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      let amount = Number(String(match[1]).replace(/,/g, ""));
      const scale = String(match[2] || "").toLowerCase();
      if (!Number.isFinite(amount)) continue;
      if (/^(trillion|tn|t)$/.test(scale)) amount *= 1000000000000;
      if (/^(billion|bn|b)$/.test(scale)) amount *= 1000000000;
      if (/^(million|mn|m)$/.test(scale)) amount *= 1000000;
      if (amount < 1000000 && !scale) continue;
      return String(Math.round(amount));
    }
    return "";
  }

  function enrichLookupMatchFromEvidence(match) {
    if (!match) return null;
    let enriched = { ...(match || {}) };
    enriched = mergeLookupProfileFields(enriched, bestLocalProfileForMatch(enriched));
    const snippetText = [
      enriched.revenue,
      enriched.annualRevenueUsd,
      ...(Array.isArray(enriched.sourceSnippets)
        ? enriched.sourceSnippets.flatMap((item) => [item.snippet, item.label, item.url])
        : []),
    ].filter(Boolean).join(" ");
    if ((!enriched.revenue || isValidationPlaceholder(enriched.revenue)) && snippetText) {
      enriched.revenue = lookupRevenueFromText(snippetText) || enriched.revenue || "";
    }
    if (!enriched.annualRevenueUsd && snippetText) {
      enriched.annualRevenueUsd = lookupAnnualRevenueUsdFromText(snippetText);
    }
    enriched = mergeLookupProfileFields(enriched, bestLocalProfileForMatch(enriched));
    enriched.financialRows = buildCompanyFinancialRows(enriched);
    return enriched;
  }

  function calculateNetMargin(revenue, netProfit) {
    const revenueValue = parseCurrencyAmount(revenue);
    const profitValue = parseCurrencyAmount(netProfit);
    if (!revenueValue || profitValue == null) return "";
    return `${Math.round((profitValue / revenueValue) * 1000) / 10}`;
  }

  function buildCompanyFinancialRows(company) {
    if (Array.isArray(company.financialHistory) && company.financialHistory.length) {
      return company.financialHistory.map((row) => ({
        year: row.year || "",
        revenue: row.revenue || "",
        yoyGrowth: row.yoyGrowth || row.yoy_growth || "",
        operatingMargin: row.operatingMargin || row.operating_margin || "",
        netMargin: row.netMargin || row.net_margin || "",
      }));
    }

    const revenue = !isValidationPlaceholder(company.revenue)
      ? company.revenue || ""
      : annualRevenueUsdDisplay(company.annualRevenueUsd);
    const netMargin = calculateNetMargin(company.revenue, company.netProfit);
    return [
      {
        year: company.fiscalYear || "Latest reported",
        revenue,
        yoyGrowth: "",
        operatingMargin: "",
        netMargin: netMargin || "",
      },
    ];
  }

  function isBlankFinancialRows(rows) {
    return !(rows || []).some((row) =>
      ["revenue", "yoyGrowth", "operatingMargin", "netMargin"].some((key) =>
        String(row[key] || "").trim() && !isValidationPlaceholder(row[key])
      )
    );
  }

  function isValidationPlaceholder(value) {
    return /^(?:validate(?:\s+current\s+filing)?|revenue\s+pending|pending|unavailable|unknown|n\/?a)$/i.test(String(value || "").trim());
  }

  function needsFinancialLookupPrefill(rows, match) {
    if (isBlankFinancialRows(rows)) return true;
    const matchRows = match ? match.financialRows || buildCompanyFinancialRows(match) : [];
    if (matchRows.length < 2) return false;
    if (!Array.isArray(rows) || rows.length < 2) return true;
    const hasLatestOnly = rows.some((row) => String(row.year || "").toLowerCase() === "latest reported");
    const matchLatestYear = String(matchRows[matchRows.length - 1]?.year || "").trim();
    const currentLatestYear = String(rows[rows.length - 1]?.year || "").trim();
    return hasLatestOnly || (matchLatestYear && currentLatestYear && matchLatestYear !== currentLatestYear);
  }

  function hasPriorityInsights(insights) {
    return ["industryTrends", "businessPriorities"].some((key) =>
      Array.isArray(insights && insights[key]) && insights[key].some((item) =>
        String(item.title || item.summary || "").trim()
      )
    );
  }

  function hasResearchFirmPriorities(priorities) {
    return Array.isArray(priorities) && priorities.some((item) =>
      String(item.firm || item.priority || item.signal || item.implication || "").trim()
    );
  }

  function contentNeedsIndustryRefresh(content, match) {
    if (!match) return false;
    const text = flattenText(content).toLowerCase();
    if (!text.trim()) return false;
    const key = industryPeerKey(match.peerGroup || match.industry || match.primaryIndustry || match.subSector);
    const bankingTerms = /\b(banks?|banking|bankers?|building societ(?:y|ies)|fintech|neobanks?|payments?|deposits?|net interest|cost-to-income|financial-crime|roe|roa)\b/;
    const financialTerms = /\b(financial services|capital markets|wealth)\b/;
    const retailTerms = /\b(retail|retailer|supermarket|grocery|fashion|homeware|stores?|stock turn|basket size|fulfillment|product returns?|returns? rate)\b/;
    const insuranceTerms = /\b(insurance|insurer|claims?|underwriting|policyholder|solvency|retirement|pensions?|annuity|broker)\b/;
    const financialOrBankingTerms = new RegExp(`${financialTerms.source}|${bankingTerms.source}`);
    if ((key === "retail" || key === "uk-retail" || key === "online-retail") && financialOrBankingTerms.test(text)) return true;
    if (key === "financial-services" && retailTerms.test(text) && !/\bretail banking\b/.test(text)) return true;
    if (key === "insurance" && (bankingTerms.test(text) || retailTerms.test(text)) && !insuranceTerms.test(text)) return true;
    if (key === "financial-services" && insuranceTerms.test(text) && !bankingTerms.test(text)) return true;
    return false;
  }

  function benchmarkNotesForIndustry(industry) {
    const key = industryPeerKey(industry);
    const benchmark = (state.benchmarks || []).find((row) => {
      const rowKey = industryPeerKey(row.industry);
      return rowKey === key || (key === "uk-retail" && rowKey === "retail");
    });
    if (benchmark) {
      return [{
        industry: benchmark.industry,
        financial: benchmark.financial_benchmarks || "",
        operational: benchmark.operational_benchmarks || "",
        customerMarket: benchmark.customer_market_benchmarks || "",
      }];
    }
    if (key === "retail" || key === "uk-retail" || key === "online-retail") {
      return [{
        industry: "Retail",
        financial: "Gross margin %, revenue per square foot, basket size, stock turn.",
        operational: "Order processing time, return rate, fulfillment cost per order.",
        customerMarket: "Conversion rate, average order value, repeat purchase %, NPS.",
      }];
    }
    if (key === "insurance") {
      return [{
        industry: "Insurance",
        financial: "Combined ratio, solvency ratio, operating margin, return on equity.",
        operational: "Claims cycle time, straight-through processing %, policy servicing cost.",
        customerMarket: "Retention %, digital adoption, claims satisfaction, product cross-sell rate.",
      }];
    }
    if (key === "financial-services") {
      return [{
        industry: "Financial services",
        financial: "Net interest margin, cost-to-income ratio, RoE, RoA.",
        operational: "Transaction processing time, straight-through processing %, error rate.",
        customerMarket: "Customer satisfaction, digital adoption %, product cross-sell rate.",
      }];
    }
    return [{
      industry: industry || "General industry",
      financial: "Revenue growth %, operating margin %, productivity per employee.",
      operational: "Cycle time, automation rate, service reliability.",
      customerMarket: "Customer satisfaction, digital adoption %, retention rate.",
    }];
  }

  function currentPriorityCompany() {
    const snapshot = state.business && state.business.snapshot ? state.business.snapshot : {};
    return {
      name: (state.activeCase && state.activeCase.company_name) || snapshot.name || "the company",
      ticker: snapshot.ticker || (state.activeCase && state.activeCase.ticker) || "",
      industry: snapshot.industry || (state.activeCase && state.activeCase.industry) || "Financial services",
      primaryIndustry: snapshot.primaryIndustry || snapshot.industry || (state.activeCase && state.activeCase.industry) || "",
      subSector: snapshot.subSector || "",
      peerGroup: snapshot.peerGroup || "",
      website: snapshot.website || "",
      domain: snapshot.domain || "",
      hqCountry: snapshot.hqCountry || "",
      hq: snapshot.hq || "",
      cik: snapshot.cik || "",
      companyNumber: snapshot.companyNumber || "",
      employees: snapshot.employees || "",
      revenue: snapshot.revenue || "",
      annualRevenueUsd: snapshot.annualRevenueUsd || "",
      ebitdaUsd: snapshot.ebitdaUsd || "",
      totalAssetsUsd: snapshot.totalAssetsUsd || "",
      netProfit: snapshot.netProfit || "",
      fiscalYear: snapshot.fiscalYear || "",
      sharePriceNotes: snapshot.sharePriceNotes || "",
    };
  }

  function prioritySearchLink(company, topic, label) {
    const companyName = company && company.name ? company.name : "company";
    const industry = company && company.industry ? company.industry : "industry";
    return {
      label,
      url: `https://www.bing.com/search?q=${encodeURIComponent(`${companyName} ${industry} ${topic}`)}`,
    };
  }

  function avivaPriorityLink(label, path = "investors/") {
    return { label, url: `https://www.aviva.com/${path}` };
  }

  function isBarclaysCompany(company) {
    return /barclays/i.test(String(company && company.name || ""));
  }

  function annualPriorityLink(company, label = "Annual report") {
    if (isBarclaysCompany(company)) {
      return { label, url: "https://home.barclays/investor-relations/reports-and-events/annual-reports/" };
    }
    return prioritySearchLink(company, "annual report results presentation strategy", label);
  }

  function investorPriorityLink(company, label = "Investor relations") {
    if (isBarclaysCompany(company)) {
      return { label, url: "https://home.barclays/investor-relations/" };
    }
    return prioritySearchLink(company, "investor relations strategy results presentation", label);
  }

  function pressReleasePriorityLink(company, label = "Press releases") {
    if (isBarclaysCompany(company)) {
      return { label, url: "https://home.barclays/news/press-releases/" };
    }
    return prioritySearchLink(company, "press release market announcement strategy update", label);
  }

  function vendorPriorityLink(company, label = "Vendor / partner announcements") {
    return prioritySearchLink(company, "vendor partner press release case study implementation customer story", label);
  }

  function priorityInsightLooksLikeGuidance(insights) {
    const text = flattenText(insights).toLowerCase();
    return /use [^.;]+annual report/.test(text) ||
      text.includes("anchor the narrative") ||
      text.includes("declared growth markets") ||
      text.includes("look it up") ||
      text.includes("annual report strategy investor relations");
  }

  function priorityInsightsNeedSourceRefresh(insights, company) {
    if (!hasPriorityInsights(insights)) return true;
    return priorityInsightLooksLikeGuidance(insights) || contentNeedsIndustryRefresh(insights, company);
  }

  function buildPriorityInsights(company) {
    const context = {
      name: company && company.name ? company.name : currentPriorityCompany().name,
      ticker: company && company.ticker ? company.ticker : currentPriorityCompany().ticker,
      industry: company && company.industry ? company.industry : currentPriorityCompany().industry,
      primaryIndustry: company && company.primaryIndustry ? company.primaryIndustry : currentPriorityCompany().primaryIndustry,
      subSector: company && company.subSector ? company.subSector : currentPriorityCompany().subSector,
      peerGroup: company && company.peerGroup ? company.peerGroup : currentPriorityCompany().peerGroup,
    };
    const key = industryPeerKey(context.peerGroup || context.industry || context.primaryIndustry);
    const businessContext = state.business || {};
    const latestRevenueSignal = latestFinancialRevenue(businessContext);
    const latestTrend = latestFinancialTrendRow(businessContext);
    const latestFacts = [
      latestRevenueSignal.value ? `${latestRevenueSignal.year} revenue is ${latestRevenueSignal.value}` : "",
      latestRevenueSignal.yoyGrowth ? `year-on-year growth is ${formatPercentValue(latestRevenueSignal.yoyGrowth)}` : "",
      latestTrend.operatingMargin ? `operating margin is ${formatPercentValue(latestTrend.operatingMargin)}` : "",
    ].filter(Boolean);
    const financialAnchor = latestFacts.length
      ? latestFacts.join("; ")
      : "published revenue, cost-to-income, returns, capital strength and risk disclosures";
    const isAviva = /aviva/i.test(context.name);
    const insuranceSources = [
      isAviva ? avivaPriorityLink("Aviva annual report and results", "investors/results-reports-and-presentations/") : annualPriorityLink(context),
      isAviva ? avivaPriorityLink("Aviva investor relations") : investorPriorityLink(context),
    ];
    if (isAviva || key === "insurance") {
      return {
        industryTrends: [
          {
            title: "Insurance customers are moving toward simpler digital service, advice and claims journeys.",
            summary: `${context.name}'s investor materials point to growth across insurance, wealth and retirement, so digital journeys, data-led personalization and faster servicing are central to retention and cross-sell.`,
            sources: insuranceSources,
          },
          {
            title: "Capital discipline and solvency strength are shaping where insurers can grow.",
            summary: "Public insurer reporting puts cash generation, capital returns and disciplined growth under close scrutiny; technology investment therefore needs to show operating leverage, better risk selection and control.",
            sources: [
              insuranceSources[0],
              prioritySearchLink(context, "solvency cash generation capital discipline investor presentation", "Capital and solvency"),
            ],
          },
          {
            title: "Operational resilience, cyber and data governance remain board-level insurance priorities.",
            summary: "As regulated insurers handle sensitive policy, claims and retirement data, modernization must strengthen continuity, third-party control, cyber resilience and responsible data use.",
            sources: [
              insuranceSources[0],
              prioritySearchLink(context, "operational resilience cyber risk annual report", "Risk disclosures"),
            ],
          },
        ],
        businessPriorities: [
          {
            title: "Scale profitable customer growth across insurance, wealth and retirement.",
            summary: "Prioritize digital onboarding, personalized next-best-action and joined-up servicing so the business can deepen customer relationships across protection, retirement and wealth propositions.",
            sources: insuranceSources,
          },
          {
            title: "Improve operating efficiency while protecting service quality.",
            summary: "Use cloud, automation and data simplification to reduce cost-to-serve, accelerate claims and policy servicing, and release capacity for advice-led growth.",
            sources: [
              insuranceSources[0],
              prioritySearchLink(context, "cost efficiency automation claims servicing investor presentation", "Efficiency priorities"),
            ],
          },
          {
            title: "Turn trust, resilience and regulatory control into transformation guardrails.",
            summary: "Modernization should make cyber resilience, operational continuity, data quality and responsible AI measurable controls inside the growth agenda, not separate compliance work.",
            sources: [
              insuranceSources[0],
              prioritySearchLink(context, "cyber resilience data governance responsible AI investor report", "Trust and control"),
            ],
          },
        ],
      };
    }
    if (key === "retail" || key === "uk-retail" || key === "online-retail") {
      return {
        industryTrends: [
          {
            title: "Retail growth is being fought through value, loyalty and omnichannel convenience.",
            summary: `${context.name}'s annual and investor materials should be read through customer missions: price perception, availability, digital convenience, store experience and loyalty economics.`,
            sources: [annualPriorityLink(context), investorPriorityLink(context)],
          },
          {
            title: "Supply-chain resilience and stock productivity are becoming margin differentiators.",
            summary: "Retailers are using data, automation and supplier visibility to improve availability, reduce waste and manage working capital while protecting gross margin.",
            sources: [
              prioritySearchLink(context, "annual report supply chain stock availability margin", "Supply chain disclosures"),
              prioritySearchLink(context, "industry research retail automation stock productivity", "Retail research"),
            ],
          },
          {
            title: "Digital, data and AI are moving from channel projects into core retail operations.",
            summary: "AI and analytics increasingly support pricing, forecasting, personalization, colleague productivity and service speed, making data quality and platform simplification executive priorities.",
            sources: [
              investorPriorityLink(context),
              prioritySearchLink(context, "retail AI data personalization annual report", "Digital strategy"),
            ],
          },
        ],
        businessPriorities: [
          {
            title: "Defend value perception while growing loyalty and basket economics.",
            summary: "Frame technology investment around better availability, sharper promotions, loyalty personalization and faster customer journeys across stores and digital channels.",
            sources: [annualPriorityLink(context), investorPriorityLink(context)],
          },
          {
            title: "Create operating leverage from supply-chain, store and digital modernization.",
            summary: "Link modernization to stock turn, waste, fulfilment cost, colleague productivity and service consistency so the CFO can see margin impact.",
            sources: [
              prioritySearchLink(context, "operating efficiency store productivity fulfilment annual report", "Operating efficiency"),
            ],
          },
          {
            title: "Protect customer trust while scaling data-led retailing.",
            summary: "Treat cyber, privacy, payments resilience and responsible AI as enablers of loyalty, not just risk controls.",
            sources: [
              prioritySearchLink(context, "annual report cyber privacy data risk", "Trust and risk"),
            ],
          },
        ],
      };
    }
    if (key === "financial-services") {
      return {
        industryTrends: [
          {
            title: "Financial services firms are competing on customer primacy, trust and digital speed.",
            summary: `${context.name}'s public reporting should be interpreted against relationship ownership, digital adoption, financial resilience and faster product servicing.`,
            sources: [annualPriorityLink(context), investorPriorityLink(context)],
          },
          {
            title: "Margin pressure is making cost-to-income and productivity a strategic technology lens.",
            summary: "Automation, data simplification and cloud modernization need to show measurable impact on cost-to-serve, process speed and colleague productivity.",
            sources: [
              prioritySearchLink(context, "annual report cost to income productivity digital transformation", "Productivity disclosures"),
            ],
          },
          {
            title: "Cyber, operational resilience and financial-crime controls remain growth constraints.",
            summary: "Modernization must improve service resilience, third-party oversight, data lineage and control quality while keeping customer journeys simple.",
            sources: [
              prioritySearchLink(context, "annual report operational resilience cyber financial crime", "Risk disclosures"),
            ],
          },
        ],
        businessPriorities: [
          {
            title: "Deepen customer relationships through simpler digital and advice-led journeys.",
            summary: "Use data and workflow modernization to improve onboarding, servicing, cross-sell and retention in the moments that shape customer trust.",
            sources: [annualPriorityLink(context), investorPriorityLink(context)],
          },
          {
            title: "Turn modernization into visible cost-to-income improvement.",
            summary: "Prioritize automation, platform simplification and data quality where they reduce manual work, error rates and cycle times.",
            sources: [
              prioritySearchLink(context, "cost efficiency automation platform simplification investor presentation", "Efficiency priorities"),
            ],
          },
          {
            title: "Make resilience and regulatory confidence part of the growth story.",
            summary: "Position cyber, operational resilience, data governance and controls as the foundation for trusted growth and faster change.",
            sources: [
              prioritySearchLink(context, "cyber resilience data governance regulatory controls annual report", "Control priorities"),
            ],
          },
        ],
      };
    }
    return {
      industryTrends: [
        {
          title: "Digital, data and AI are becoming core operating-model requirements.",
          summary: `${context.industry} leaders are using automation, analytics and modern platforms to simplify service, increase decision speed and reduce cost-to-serve.`,
          sources: [
            prioritySearchLink(context, "digital AI industry research", "Industry research"),
            prioritySearchLink(context, "investor presentation technology strategy", "Investor materials"),
          ],
        },
        {
          title: "Resilience, cyber and third-party risk are under sustained board scrutiny.",
          summary: "Technology resilience is increasingly tied to customer trust, regulatory confidence, and the ability to keep priority services running through disruption.",
          sources: [
            prioritySearchLink(context, "annual report operational resilience risk", "Annual report risk"),
            prioritySearchLink(context, "regulatory operational resilience", "Regulatory research"),
          ],
        },
        {
          title: "Productivity pressure is increasing the need for modernization-led efficiency.",
          summary: "Margin, talent and customer-experience pressures make legacy simplification, platform consolidation, and process automation important levers.",
          sources: [
            prioritySearchLink(context, "annual report efficiency productivity priorities", "Annual report priorities"),
            prioritySearchLink(context, "industry cost transformation research", "Cost transformation"),
          ],
        },
      ],
      businessPriorities: [
        {
          title: "Connect the growth agenda to customer and operating outcomes.",
          summary: `${context.name}'s public reporting should translate into a small set of growth, customer and operating outcomes that the CEO and CFO can track against investment choices.`,
          sources: [
            prioritySearchLink(context, "annual report strategy priorities", "Annual report strategy"),
            prioritySearchLink(context, "investor relations strategy priorities", "Investor relations"),
          ],
        },
        {
          title: "Translate technology modernization into measurable productivity gains.",
          summary: "Connect platform, cloud, data and automation work to cost-to-income, cycle time, colleague productivity, and digital adoption measures.",
          sources: [
            prioritySearchLink(context, "technology modernization productivity investor", "Technology priorities"),
            prioritySearchLink(context, "annual report cost efficiency transformation", "Efficiency priorities"),
          ],
        },
        {
          title: "Protect trust while accelerating change.",
          summary: "Frame resilience, security, data governance, responsible AI and regulatory control as growth enablers rather than back-office constraints.",
          sources: [
            prioritySearchLink(context, "annual report cyber risk data governance", "Risk and governance"),
            prioritySearchLink(context, "industry research trust resilience security", "Trust research"),
          ],
        },
      ],
    };
  }

  const transformationAgendaQuestions = [
    "What is currently top of mind for the executive team and Board?",
    "Strategic priorities and transformation initiatives underway.",
    "Where investment is being directed across business and technology.",
    "Key operational, regulatory, financial or customer-related challenges.",
    "Significant leadership commentary, market announcements or investor messages that help explain their agenda.",
  ];

  const transformationAgendaDimensions = [
    "Top of mind for Board & ExCo",
    "Strategic priorities & transformation initiatives",
    "Where investment is going",
    "Operational, regulatory, financial & customer challenges",
    "Leadership commentary, market announcements & investor messaging",
  ];

  function isRemovedTransformationAgendaQuestion(row) {
    const text = String(`${row && (row.dimension || "")} ${row && (row.question || "")}`).toLowerCase();
    return /public\s+(?:cost|indicator)|public indicators of cost|cost,\s*efficiency,\s*growth.*moderni[sz]ation|modernisation objectives|modernization objectives/.test(text);
  }

  function agendaText(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((item) => item.replace(/^\s*(?:[-*]|\u2022)\s*/, ""))
        .join("\n");
    }
    return String(value || "")
      .replace(/\s*;\s+/g, "\n")
      .split(/\n+/)
      .map((item) => item.trim().replace(/^\s*(?:[-*]|\u2022)\s*/, ""))
      .filter(Boolean)
      .join("\n");
  }

  function agendaRow(index, dimension, answer, evidence, sources) {
    return {
      question: transformationAgendaQuestions[index] || dimension,
      dimension: dimension || transformationAgendaDimensions[index] || transformationAgendaQuestions[index] || "Agenda dimension",
      answer: agendaText(answer),
      evidence: agendaText(evidence),
      sources,
    };
  }

  function hasTransformationAgenda(agenda) {
    return Boolean(
      agenda &&
      Array.isArray(agenda.rows) &&
      agenda.rows.some((row) => String(row.answer || row.evidence || row.summary || row.finding || row.whatItLooksLikeNow || row.what_it_looks_like_now || "").trim())
    );
  }

  function transformationAgendaLooksGeneric(agenda) {
    const text = flattenText(agenda).toLowerCase();
    return !text.trim() ||
      text.includes("refresh analysis to generate") ||
      text.includes("describe the") ||
      text.includes("look it up") ||
      text.includes("board attention is likely") ||
      text.includes("transformation is likely") ||
      text.includes("investment is likely") ||
      text.includes("likely directed") ||
      text.includes("typically") ||
      text.includes("commonly") ||
      text.includes("should be read") ||
      text.includes("should show") ||
      text.includes("should be tested") ||
      text.includes("should be framed") ||
      text.includes("should be scanned") ||
      text.includes("annual report and results materials should") ||
      text.includes("sector template") ||
      text.includes("source basis:") ||
      text.includes("should be anchored in named annual-report initiatives") ||
      text.includes("should only be stated where official materials") ||
      text.includes("financial-services reporting usually links") ||
      text.includes("annual reports and investor materials should be read") ||
      text.includes("current case evidence") ||
      text.includes("peer margin gap pending") ||
      text.includes("peer growth gap pending") ||
      text.includes("growth growth pending") ||
      text.includes("operating margin operating margin pending") ||
      text.includes("sourced priority set") ||
      text.includes("those commitments translate into funded changes") ||
      text.includes("official-source refresh required");
  }

  function transformationAgendaNeedsMoreDetail(agenda) {
    if (!hasTransformationAgenda(agenda)) return true;
    const rows = agenda.rows || [];
    if (rows.length < transformationAgendaDimensions.length) return true;
    const detailedRows = rows.filter((row) => agendaRowIntegrity(row).sourceBacked);
    return detailedRows.length < Math.min(transformationAgendaDimensions.length, rows.length);
  }

  function agendaEvidenceLines(row) {
    return [
      ...agendaText(row.answer || row.summary || row.finding || row.whatItLooksLikeNow || row.what_it_looks_like_now).split("\n"),
      ...agendaText(row.evidence || row.indicator || row.evidenceSignals || row.evidence_signals).split("\n"),
    ].map((line) => line.trim()).filter(Boolean);
  }

  function agendaLineHasQuoteOrStatistic(line) {
    const text = String(line || "");
    if (/["'\u201c\u201d\u2018\u2019][^"'\u201c\u201d\u2018\u2019]{8,}["'\u201c\u201d\u2018\u2019]/.test(text)) return true;
    if (/(?:\u00a3|\$|\u20ac|GBP|USD|EUR)\s?\d/i.test(text)) return true;
    return /["â€œâ€â€˜â€™][^"â€œâ€â€˜â€™]{8,}["â€œâ€â€˜â€™]/.test(text) ||
      /\b(?:FY|H[12]|Q[1-4])?\s?20\d{2}\b/i.test(text) ||
      /(?:Â£|\$|â‚¬|GBP|USD|EUR)\s?\d/i.test(text) ||
      /\b\d+(?:\.\d+)?\s?(?:%|bps|x|m|bn|billion|million|customers|employees|colleagues|stores|branches|ratio|RoTE|NIM|CET1|MREL|LCR|NSFR)\b/i.test(text) ||
      /\b(?:up|down|reduced|increased|growth|savings?|profit|revenue|margin|ratio|headcount|cost)\b[^.]{0,80}\b\d/i.test(text);
  }

  function agendaRowIntegrity(row) {
    const lines = agendaEvidenceLines(row);
    const evidenceLineCount = lines.filter(agendaLineHasQuoteOrStatistic).length;
    const sourceCount = Array.isArray(row.sources) ? row.sources.filter((source) => source && (source.url || source.label)).length : 0;
    const officialSourceCount = Array.isArray(row.sources) ? row.sources.filter(sourceLooksOfficial).length : 0;
    const annualSourceCount = Array.isArray(row.sources) ? row.sources.filter(sourceLooksAnnualReport).length : 0;
    const genericLineCount = lines.filter((line) =>
      /\b(?:likely|typically|commonly|should be read|should show|should be tested|should be framed|should be scanned|source basis|public places to validate)\b/i.test(line)
    ).length;
    const sourceBacked = evidenceLineCount >= 1 && officialSourceCount >= 1 && annualSourceCount >= 2 && genericLineCount === 0;
    return {
      sourceBacked,
      evidenceLineCount,
      sourceCount,
      officialSourceCount,
      annualSourceCount,
      genericLineCount,
      label: sourceBacked ? "Two-year annual-report-backed" : "Two annual reports required",
    };
  }

  function officialAgendaFallbackSources(company) {
    return [
      annualPriorityLink(company, "Annual report"),
      investorPriorityLink(company, "Investor relations"),
      pressReleasePriorityLink(company, "Press releases"),
      vendorPriorityLink(company, "Vendor / partner announcements"),
    ];
  }

  function sourceLooksOfficial(source) {
    const url = String(source && source.url ? source.url : "").toLowerCase();
    if (/bing\.com\/search|google\.[^/]+\/search|search\.yahoo|duckduckgo\.com|google\.[^/]+\/finance|finance\.yahoo\.com\/quote/.test(url)) {
      return false;
    }
    const text = `${source && source.label ? source.label : ""} ${url}`.toLowerCase();
    return /(annual|10-k|universal registration|annual review|filing|report|investor|results|presentation|press|release|announcement|trading update|market update|analyst|equity research|broker|rating|research platform|case study|customer story|partner|vendor|alliance|implementation)/.test(text);
  }

  function sourceLooksAnnualReport(source) {
    const url = String(source && source.url ? source.url : "").toLowerCase();
    if (/bing\.com\/search|google\.[^/]+\/search|search\.yahoo|duckduckgo\.com|google\.[^/]+\/finance|finance\.yahoo\.com\/quote/.test(url)) {
      return false;
    }
    const text = `${source && source.label ? source.label : ""} ${url}`.toLowerCase();
    return /(annual report|annual-report|annual results|annual review|10-k|universal registration|annual financial report|full-year report|fy20\d{2} report)/.test(text);
  }

  function officialAgendaSources(row, company) {
    const sources = Array.isArray(row && row.sources) ? row.sources.filter(sourceLooksOfficial) : [];
    const byKey = new Map();
    sources.forEach((source) => {
      if (!source || (!source.label && !source.url)) return;
      const key = String(source.url || source.label).toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, {
          label: source.label || "Official source",
          url: source.url || "#",
        });
      }
    });
    return Array.from(byKey.values()).slice(0, 4);
  }

  function agendaFootnotes(rows, company) {
    const byKey = new Map();
    (rows || []).forEach((row) => {
      officialAgendaSources(row, company).forEach((source) => {
        const key = String(source.url || source.label).toLowerCase();
        if (!byKey.has(key)) byKey.set(key, { ...source, number: byKey.size + 1 });
      });
    });
    return Array.from(byKey.values());
  }

  function agendaFootnoteNumber(source, footnotes) {
    const key = String(source && (source.url || source.label) || "").toLowerCase();
    const match = (footnotes || []).find((item) => String(item.url || item.label).toLowerCase() === key);
    return match ? match.number : "";
  }

  function transformationAgendaNeedsRefresh(agenda, company) {
    if (!hasTransformationAgenda(agenda)) return true;
    return transformationAgendaLooksGeneric(agenda) ||
      transformationAgendaNeedsMoreDetail(agenda) ||
      contentNeedsIndustryRefresh(agenda, company);
  }

  function sourceRefreshRequiredAgenda(company) {
    const context = company || currentPriorityCompany();
    return {
      sourceRequired: true,
      executiveSummary: "",
      rows: transformationAgendaDimensions.map((dimension, index) => agendaRow(
        index,
        dimension,
        "",
        "",
        [],
      )),
      sourceNotes: [
        `No source-backed Business Transformation agenda is stored for ${context.name || "this company"} yet.`,
        "Primary sources required: the company's last two full-year annual reports or equivalent annual filings, discovered through Google/web search and opened from the company Investor Relations site or a trusted filing repository.",
      ],
    };
  }

  function agendaCleanPhrase(value, fallback, maxLength = 120) {
    const text = cleanNarrativeFragment(value || fallback || "", maxLength)
      .replace(/\bshould be read\b/gi, "is being read")
      .replace(/\bshould show\b/gi, "shows")
      .replace(/\bshould be tested\b/gi, "is tested")
      .replace(/\bshould be framed\b/gi, "is framed")
      .replace(/\bshould be scanned\b/gi, "is scanned")
      .replace(/\blikely\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return text || fallback || "source-backed priority";
  }

  function agendaCompanySpecificFacts(company) {
    const business = state.business || {};
    const snapshot = business.snapshot || {};
    const context = {
      name: company && company.name ? company.name : currentPriorityCompany().name,
      ticker: company && company.ticker ? company.ticker : currentPriorityCompany().ticker,
      industry: company && company.industry ? company.industry : currentPriorityCompany().industry,
      primaryIndustry: company && company.primaryIndustry ? company.primaryIndustry : currentPriorityCompany().primaryIndustry,
      subSector: company && company.subSector ? company.subSector : currentPriorityCompany().subSector,
      peerGroup: company && company.peerGroup ? company.peerGroup : currentPriorityCompany().peerGroup,
    };
    const latest = latestFinancialTrendRow(business);
    const latestRevenue = latestFinancialRevenue(business);
    const trendRows = (business.financialTrends || []).filter((row) => String(row.year || "").trim());
    const firstRevenueRow = trendRows.find((row) => !isValidationPlaceholder(row.revenue) && parseCurrencyAmount(row.revenue) != null) || {};
    const firstRevenue = parseCurrencyAmount(firstRevenueRow.revenue);
    const latestRevenueAmount = parseCurrencyAmount(latest.revenue || latestRevenue.value || snapshot.revenue);
    const revenueChange = firstRevenue && latestRevenueAmount != null
      ? ((latestRevenueAmount - firstRevenue) / firstRevenue) * 100
      : null;
    const latestOperating = metricNumber(latest.operatingMargin);
    const latestGrowth = metricNumber(latest.yoyGrowth || latestRevenue.yoyGrowth);
    const peerRows = topPeerComparisonRows(business);
    const peerOnlyRows = peerRows.filter((row) => !row.isCustomer);
    const peerNames = peerOnlyRows.map((row) => cleanNarrativeFragment(row.company, 42)).filter(Boolean).slice(0, 4);
    const peerOperatingAverage = averageMetric(peerOnlyRows, "operatingMargin");
    const peerGrowthAverage = averageMetric(peerOnlyRows, "cagr3");
    const operatingGap = latestOperating != null && peerOperatingAverage != null ? latestOperating - peerOperatingAverage : null;
    const growthGap = latestGrowth != null && peerGrowthAverage != null ? latestGrowth - peerGrowthAverage : null;
    const priorityInsights = hasPriorityInsights(business.priorityInsights)
      ? business.priorityInsights
      : buildPriorityInsights(context);
    const priorityItems = [
      ...(Array.isArray(priorityInsights.businessPriorities) ? priorityInsights.businessPriorities : []),
      ...(Array.isArray(priorityInsights.industryTrends) ? priorityInsights.industryTrends : []),
    ].filter((item) => String(item.title || item.summary || "").trim());
    const researchRows = mergeResearchFirmPriorities(business.researchFirmPriorities, context);
    const topResearchThemes = researchTopicFrequencies(researchRows)
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 4)
      .map((item) => item.label);
    const benchmarkSignals = (business.benchmarkNotes || [])
      .flatMap((row) => [row.financial, row.operational, row.customerMarket])
      .map((item) => agendaCleanPhrase(item, "", 92))
      .filter(Boolean)
      .slice(0, 3);
    const rawFixture = publicCompanyFixtures().find((fixture) => {
      const fixtureNames = [fixture.name, fixture.legalName, ...(fixture.aliases || [])]
        .map(normalizeLookupQuery)
        .filter(Boolean);
      return fixtureNames.some((name) => activeCompanyKeys.has(name));
    }) || null;
    const sourceSnippets = [
      ...(Array.isArray(rawFixture && rawFixture.sourceSnippets) ? rawFixture.sourceSnippets : []),
      ...(Array.isArray(state.companyLookup.selected && state.companyLookup.selected.sourceSnippets) ? state.companyLookup.selected.sourceSnippets : []),
      ...(Array.isArray(state.companyLookup.sourceSnippets) ? state.companyLookup.sourceSnippets : []),
    ];
    const snippetLine = sourceSnippets
      .map((item) => agendaCleanPhrase(item.snippet || item.label, "", 150))
      .find(Boolean);
    const year = latest.year || latestRevenue.year || snapshot.fiscalYear || "latest reported period";
    const revenueText = latest.revenue || latestRevenue.value || snapshot.revenue || annualRevenueUsdDisplay(snapshot.annualRevenueUsd) || "revenue pending";
    const growthText = latestGrowth == null ? "growth pending" : formatPercentValue(latestGrowth);
    const marginText = latestOperating == null ? "operating margin pending" : formatPercentValue(latestOperating);
    const financialAnchor = `${year}: revenue ${revenueText}, growth ${growthText}, operating margin ${marginText}`;
    const revenueMoveText = revenueChange == null || !firstRevenueRow.revenue
      ? `${year} revenue baseline is ${revenueText}`
      : `revenue moved from ${firstRevenueRow.revenue} to ${revenueText}, a ${formatPercentValue(revenueChange)} change`;
    const peerMarginText = operatingGap == null
      ? "peer margin gap pending"
      : `${formatPointDelta(Math.abs(operatingGap)).replace(/^\+/, "")} ${operatingGap >= 0 ? "above" : "below"} peer average`;
    const peerGrowthText = growthGap == null
      ? "peer growth gap pending"
      : `${formatPointDelta(Math.abs(growthGap)).replace(/^\+/, "")} ${growthGap >= 0 ? "above" : "below"} peer average`;
    const primaryPriority = agendaCleanPhrase(priorityItems[0] && priorityItems[0].title, "customer and operating outcomes", 115);
    const secondaryPriority = agendaCleanPhrase(priorityItems[1] && priorityItems[1].title, "modernisation-led productivity", 115);
    const tertiaryPriority = agendaCleanPhrase(priorityItems[2] && priorityItems[2].title, "resilience and trust", 115);
    const primarySummary = agendaCleanPhrase(priorityItems[0] && priorityItems[0].summary, primaryPriority, 170);
    const secondarySummary = agendaCleanPhrase(priorityItems[1] && priorityItems[1].summary, secondaryPriority, 170);
    const researchThemeText = topResearchThemes.length ? joinReadableList(topResearchThemes) : "AI, data, resilience and productivity";
    const benchmarkText = benchmarkSignals.length ? joinReadableList(benchmarkSignals) : "revenue growth, operating margin and customer outcomes";
    const peerText = peerNames.length ? joinReadableList(peerNames) : "selected industry peers";
    const annual = /aviva/i.test(context.name)
      ? avivaPriorityLink("Aviva annual report and results", "investors/results-reports-and-presentations/")
      : annualPriorityLink(context, "Annual report / results");
    const investors = /aviva/i.test(context.name) ? avivaPriorityLink("Aviva investor relations") : investorPriorityLink(context, "Investor relations");
    const press = pressReleasePriorityLink(context, "Press releases / market announcements");
    const vendor = vendorPriorityLink(context, "Named vendor / partner sources");
    return {
      context,
      business,
      key: industryPeerKey(context.peerGroup || context.subSector || context.industry || context.primaryIndustry),
      year,
      revenueText,
      growthText,
      marginText,
      financialAnchor,
      revenueMoveText,
      peerMarginText,
      peerGrowthText,
      peerText,
      primaryPriority,
      secondaryPriority,
      tertiaryPriority,
      primarySummary,
      secondarySummary,
      researchThemeText,
      benchmarkText,
      snippetLine,
      sources: { annual, investors, press, vendor },
    };
  }

  function buildCompanySpecificTransformationAgenda(company) {
    const facts = agendaCompanySpecificFacts(company);
    const name = facts.context.name || "The company";
    const industryLabel = [facts.context.primaryIndustry || facts.context.industry, facts.context.subSector]
      .filter(Boolean)
      .join(" / ") || facts.context.industry || "the sector";
    const sourceSet = [facts.sources.annual, facts.sources.investors, facts.sources.press, facts.sources.vendor];
    const officialSources = [facts.sources.annual, facts.sources.investors, facts.sources.press];
    const summary = `${name}'s transformation agenda is anchored in the current case evidence. ${facts.financialAnchor}. Peer comparison shows ${facts.peerMarginText}, and the sourced priority set highlights ${facts.primaryPriority}, ${facts.secondaryPriority} and ${facts.tertiaryPriority}. The CEO/CFO conversation is where those commitments translate into funded changes across customer, operations, technology, risk and measurable value.`;
    return {
      executiveSummary: summary,
      overview: [
        `${name}'s agenda is anchored in ${facts.year} performance: revenue ${facts.revenueText}, growth ${facts.growthText}, and operating margin ${facts.marginText}.`,
        `Peer pressure is explicit: ${facts.peerMarginText} on operating margin and ${facts.peerGrowthText} on growth versus ${facts.peerText}.`,
        `The priority story centers on ${facts.primaryPriority}, ${facts.secondaryPriority}, and ${facts.tertiaryPriority}.`,
        `Investment and modernization choices are tested against ${facts.researchThemeText} and ${facts.benchmarkText}.`,
      ],
      rows: [
        agendaRow(0, transformationAgendaDimensions[0], [
          `${name}'s Board and ExCo agenda starts with ${facts.financialAnchor}. The immediate leadership question is how ${facts.primaryPriority} changes growth, margin and customer trust.`,
          `${name} is benchmarked against ${facts.peerText}. The current peer signal is ${facts.peerMarginText} on operating margin and ${facts.peerGrowthText} on growth.`,
          `${name}'s official-source priority set points to ${facts.primarySummary}. This turns ${industryLabel} strategy into a CEO/CFO performance agenda for ${facts.year}.`,
        ], [
          `${facts.year} financial evidence: ${facts.revenueMoveText}. Operating margin ${facts.marginText}. Growth ${facts.growthText}.`,
          facts.snippetLine || `${facts.year} source context is held in annual-report, investor-relations and market-announcement links for ${name}.`,
        ], officialSources),
        agendaRow(1, transformationAgendaDimensions[1], [
          `${name}'s transformation initiatives are organized around "${facts.primaryPriority}" and "${facts.secondaryPriority}", using ${facts.year} performance as the commercial baseline.`,
          `${facts.secondarySummary} This makes the initiative set specific to ${name}, not a generic ${industryLabel} modernization list.`,
          `${name}'s agenda links each initiative to ${facts.revenueText} revenue, ${facts.marginText} operating margin and the ${facts.peerMarginText} peer signal.`,
        ], [
          `${facts.year} initiative evidence combines priority-card sources, annual results, investor-relations pages and press announcements.`,
          `${facts.year} financial baseline: ${facts.financialAnchor}.`,
        ], sourceSet),
        agendaRow(2, transformationAgendaDimensions[2], [
          `${name}'s investment direction is toward the capabilities behind ${facts.primaryPriority}, ${facts.secondaryPriority} and ${facts.tertiaryPriority}. The case evidence also clusters around ${facts.researchThemeText}.`,
          `The CFO lens is explicit: fund AI, data, cloud, automation and resilience only where they improve ${facts.revenueText} revenue quality, ${facts.marginText} margin or the ${facts.peerMarginText} peer position.`,
          `The business lens for ${facts.year} is ${facts.benchmarkText}, which gives ${name} a practical scorecard for technology and operating investment.`,
        ], [
          `${facts.year} investment evidence draws from investor materials, source-backed priority cards and reputable research-firm signals already stored on the page.`,
          `${facts.year} peer context: ${facts.peerText}. Margin position ${facts.peerMarginText}.`,
        ], [facts.sources.investors, facts.sources.annual, facts.sources.vendor]),
        agendaRow(3, transformationAgendaDimensions[3], [
          `${name}'s challenge profile is built from the same evidence base: ${facts.tertiaryPriority}, ${facts.secondaryPriority}, and the ${facts.peerMarginText} operating-margin signal.`,
          `For ${facts.year}, the customer and operating pressure is to convert ${facts.primaryPriority} into better service, resilience and productivity while protecting ${facts.marginText} operating margin.`,
          `${name}'s risk conversation is not generic. It connects ${facts.researchThemeText} to annual-report risk, investor messaging and market-announcement evidence.`,
        ], [
          `${facts.year} challenge evidence: revenue ${facts.revenueText}. Growth ${facts.growthText}. Operating margin ${facts.marginText}.`,
          facts.snippetLine || `${facts.year} risk and market context is referenced through annual-report, investor and press-release source links.`,
        ], [facts.sources.annual, facts.sources.press, facts.sources.investors]),
        agendaRow(4, transformationAgendaDimensions[4], [
          `${name}'s public indicator set starts with ${facts.financialAnchor}, then adds peer measures: operating margin is ${facts.peerMarginText} and growth is ${facts.peerGrowthText}.`,
          `${facts.revenueMoveText}. This gives the CEO a growth baseline and gives the CFO a value-capture baseline for transformation funding.`,
          `${name}'s modernization indicators are the operating metrics behind ${facts.benchmarkText}, with ${facts.year} reporting used as the control point.`,
        ], [
          `${facts.year} performance evidence: ${facts.financialAnchor}. Peer benchmark set: ${facts.peerText}.`,
          `${facts.year} value evidence links annual-report KPIs, investor targets, benchmark inputs and source-backed priorities.`,
        ], officialSources),
        agendaRow(5, transformationAgendaDimensions[5], [
          `${name}'s leadership narrative for ${facts.year} is to connect ${facts.primaryPriority}, ${facts.secondaryPriority} and ${facts.tertiaryPriority} to measurable financial outcomes.`,
          `Investor and market-announcement messages are interpreted through the ${facts.revenueText} revenue baseline, ${facts.marginText} operating margin and the ${facts.peerMarginText} peer comparison.`,
          `The account narrative for ${name} becomes a sourced conversation: what management has publicly signalled, where peers are pressuring performance, and which technology choices improve the ${facts.year} scorecard.`,
        ], [
          `${facts.year} leadership evidence: annual report / results, investor-relations materials, press announcements and named vendor or partner sources.`,
          `${facts.year} case evidence: ${facts.financialAnchor}. Research priorities: ${facts.researchThemeText}.`,
        ], sourceSet),
      ],
      sourceNotes: [
        `Annual report used: latest annual report / results source for ${name}.`,
        `Analyst / research context used: industry research priorities and peer benchmarks stored on this page.`,
        `Press releases or news used: investor-relations, market-announcement, and named vendor / partner source links attached to the rows.`,
      ],
    };
  }

  function agendaTextList(value, limit = 8) {
    const rawItems = Array.isArray(value) ? value : String(value || "").split(/\n+|\s*;\s+/);
    const items = [];
    rawItems.forEach((item) => {
      const text = String(item || "").trim().replace(/^\s*(?:[-*]|\u2022)\s*/, "");
      if (text && items.length < limit) items.push(text);
    });
    return items;
  }

  function normalizeTransformationAgenda(agenda, company) {
    if (!hasTransformationAgenda(agenda)) return sourceRefreshRequiredAgenda(company);
    const rows = agenda.rows
      .filter((row) => String(row.dimension || row.question || row.answer || row.evidence || "").trim())
      .filter((row) => !isRemovedTransformationAgendaQuestion(row))
      .slice(0, transformationAgendaQuestions.length)
      .map((row, index) => ({
        dimension: row.dimension || row.area || transformationAgendaDimensions[index] || row.question || "Agenda dimension",
        question: row.question || transformationAgendaQuestions[index] || "Agenda question",
        answer: agendaText(row.answer || row.summary || row.finding || row.whatItLooksLikeNow || row.what_it_looks_like_now),
        evidence: agendaText(row.evidence || row.indicator || row.evidenceSignals || row.evidence_signals),
        sources: Array.isArray(row.sources) ? row.sources : [],
      }));
    return {
      executiveSummary: agenda.executiveSummary || agenda.executive_summary || "",
      overview: agendaTextList(agenda.overview || agenda.overview_bullets || agenda.boardOverview || agenda.board_overview, 5),
      rows,
      sourceNotes: agendaTextList(agenda.sourceNotes || agenda.source_notes || agenda.sourcesUsed || agenda.sources_used, 12),
    };
  }

  function buildTransformationAgenda(company) {
    return sourceRefreshRequiredAgenda(company);
    const current = currentPriorityCompany();
    const context = {
      name: company && company.name ? company.name : current.name,
      ticker: company && company.ticker ? company.ticker : current.ticker,
      industry: company && company.industry ? company.industry : current.industry,
      primaryIndustry: company && company.primaryIndustry ? company.primaryIndustry : current.primaryIndustry,
      subSector: company && company.subSector ? company.subSector : current.subSector,
      peerGroup: company && company.peerGroup ? company.peerGroup : current.peerGroup,
    };
    const key = industryPeerKey(context.peerGroup || context.industry || context.primaryIndustry);
    const latestRevenueSignal = latestFinancialRevenue(state.business || {});
    const latestTrend = latestFinancialTrendRow(state.business || {});
    const latestFacts = [
      latestRevenueSignal.value ? `${latestRevenueSignal.year} revenue is ${latestRevenueSignal.value}` : "",
      latestRevenueSignal.yoyGrowth ? `year-on-year growth is ${formatPercentValue(latestRevenueSignal.yoyGrowth)}` : "",
      latestTrend.operatingMargin ? `operating margin is ${formatPercentValue(latestTrend.operatingMargin)}` : "",
    ].filter(Boolean);
    const financialAnchor = latestFacts.length
      ? latestFacts.join("; ")
      : "published revenue, cost-to-income, returns, capital strength and risk disclosures";
    const isAviva = /aviva/i.test(context.name);
    const annual = isAviva
      ? avivaPriorityLink("Aviva annual report and results", "investors/results-reports-and-presentations/")
      : annualPriorityLink(context);
    const investors = isAviva ? avivaPriorityLink("Aviva investor relations") : investorPriorityLink(context);
    const press = pressReleasePriorityLink(context);

    if (isAviva || key === "insurance") {
      return {
        executiveSummary: `${context.name}'s transformation agenda reads as a growth-and-control story: deepen customer relationships across insurance, wealth and retirement, improve service productivity, and protect trust while maintaining capital discipline. The CEO/CFO conversation should connect digital, data, automation and resilience investment to profitable growth, cash generation, claims and servicing speed, and regulatory confidence.`,
        rows: [
          agendaRow(0, transformationAgendaDimensions[0], [
            "Board attention is likely anchored on profitable customer growth across insurance, wealth and retirement while maintaining capital discipline.",
            "Operational resilience, cyber trust and regulatory confidence remain executive-level controls because they protect customer outcomes and licence to operate.",
            "The CEO/CFO angle is whether digital and data investment can convert customer trust into retention, cross-sell and operating leverage."
          ], [
            "Annual report and results materials should be read for repeated language on cash generation, capital strength, profitable growth and disciplined execution.",
            "Investor-relations messaging gives the clearest public view of the measures management wants the market to judge: growth, cash, margin, solvency and delivery confidence."
          ], [annual, investors, prioritySearchLink(context, "CEO CFO annual results capital strength profitable growth", "CEO/CFO signals")]),
          agendaRow(1, transformationAgendaDimensions[1], [
            "Transformation is centered on simpler digital journeys across onboarding, claims, policy servicing, advice and retirement interactions.",
            "Data-led personalization and next-best-action should connect insurance, wealth and retirement propositions rather than leaving customer growth in product silos.",
            "Core platform simplification and automation should be positioned as operating-model change, not a technology refresh."
          ], [
            "Insurance, wealth and retirement propositions create a clear need for joined-up customer, colleague and advisor journeys.",
            "Annual-report strategy sections and investor presentations should show where simplification, digital adoption, service speed and productivity commitments are repeated."
          ], [annual, prioritySearchLink(context, "digital transformation claims policy servicing annual report", "Transformation signals"), prioritySearchLink(context, "investor presentation customer growth digital advice retirement", "Investor strategy")]),
          agendaRow(2, transformationAgendaDimensions[2], [
            "Investment should be read across customer platforms, data and AI, automation, cloud modernization, cyber resilience and regulatory control tooling.",
            "Business investment is likely directed toward retention, advice-led growth, claims efficiency, risk selection and better service economics.",
            "Technology investment should be tested against tangible CEO/CFO outcomes: lower cost-to-serve, faster cycle time, fewer manual interventions and stronger control evidence."
          ], [
            "Investor materials and annual reports should show technology spend through customer, operating efficiency, resilience and risk-management language.",
            "Industry research reinforces the same investment pattern: AI, data, cloud, automation and cyber are valuable when tied to customer trust and measurable productivity."
          ], [investors, prioritySearchLink(context, "investor presentation technology investment data AI cloud", "Technology investment"), prioritySearchLink(context, "insurance AI data cloud cyber resilience industry research", "Industry research")]),
          agendaRow(3, transformationAgendaDimensions[3], [
            "Challenges include claims inflation, market volatility, regulatory scrutiny, solvency/capital discipline, cyber threats, third-party risk and operational continuity.",
            "Customer-related pressure is likely around retention, service quality, digital adoption and trust at claim or retirement decision moments.",
            "The account conversation should frame modernization as a way to improve control quality and customer experience at the same time."
          ], [
            "Annual risk disclosures for insurers commonly connect cyber, operational resilience, conduct, financial and market risks.",
            "Regulatory and board scrutiny should be read through operational continuity, third-party control, data governance and evidence of responsible AI use."
          ], [annual, prioritySearchLink(context, "annual report principal risks operational resilience cyber regulatory", "Risk disclosures"), prioritySearchLink(context, "insurance conduct risk operational resilience regulation", "Regulatory signals")]),
          agendaRow(4, transformationAgendaDimensions[4], [
            "Track revenue growth, operating margin, cash generation, solvency/capital strength, cost-to-serve, claims cycle time, digital adoption and retention.",
            "Modernisation objectives should be translated into observable movement in productivity, straight-through processing, platform simplification and customer service measures.",
            "Peer comparison should test whether investment is creating a margin or growth advantage versus other insurers, not just delivering internal milestones."
          ], [
            "Five-year financial trends and investor reporting give the CEO/CFO measures for growth, efficiency, capital allocation and delivery credibility.",
            "Annual results and investor decks are the public places to validate cost, margin, cash, solvency and modernization commitments."
          ], [annual, prioritySearchLink(context, "cash generation operating profit cost efficiency investor results", "Performance indicators"), prioritySearchLink(context, "insurance operating margin solvency digital adoption annual report", "Modernisation indicators")]),
          agendaRow(5, transformationAgendaDimensions[5], [
            "Leadership and investor messages should be framed around disciplined growth, capital returns, customer outcomes and simplification of the operating model.",
            "Market announcements should be scanned for acquisitions, disposals, partnerships, platform investments, leadership changes and regulatory updates that explain execution priorities.",
            "The strongest executive narrative is to connect investor promises to the transformation choices required to deliver them."
          ], [
            "Investor-relations narratives explain where leadership wants growth, how capital is allocated and what operational delivery must prove.",
            "CEO/CFO commentary in results releases and presentations is the best public evidence for the language the account team should mirror."
          ], [investors, prioritySearchLink(context, "CEO CFO investor presentation strategic priorities capital returns", "Leadership commentary"), prioritySearchLink(context, "market announcements acquisitions partnerships investor relations", "Market announcements")]),
        ],
      };
    }

    if (key === "retail" || key === "uk-retail" || key === "online-retail") {
      return {
        executiveSummary: `${context.name}'s transformation agenda should be framed around value, loyalty, margin and omnichannel execution. The executive conversation is about using data, supply-chain visibility, store productivity and digital platforms to defend customer relevance while improving availability, cost-to-serve and working-capital performance.`,
        rows: [
          agendaRow(0, transformationAgendaDimensions[0], [
            "Board attention is likely on value perception, loyalty, availability, margin protection and omnichannel convenience.",
            "The executive tension is how to keep the proposition attractive while protecting gross margin, cash and service reliability.",
            "Customer trust now depends on consistent store, digital, fulfilment and returns experiences."
          ], [
            "Retail investor reporting usually links growth to price, proposition strength, digital journeys and supply-chain execution.",
            "Trading updates and annual reports should be read for repeated references to value, customer growth, availability, margin and operational discipline."
          ], [annual, investors, prioritySearchLink(context, "trading update customer value margin availability", "Trading signals")]),
          agendaRow(1, transformationAgendaDimensions[1], [
            "Transformation is likely focused on digital commerce, store operations, supply-chain responsiveness, loyalty data and colleague productivity.",
            "Modernisation should improve stock visibility, fulfilment economics, personalization, service speed and store task efficiency.",
            "The agenda should connect customer proposition work to operating leverage rather than treating channel, store and supply-chain initiatives separately."
          ], [
            "Retail modernization is typically justified through availability, fulfilment, personalization and productivity.",
            "Annual strategy sections and investor presentations should show where digital, loyalty, store and supply-chain programmes are tied to growth or margin."
          ], [annual, prioritySearchLink(context, "digital transformation loyalty supply chain annual report", "Transformation signals"), prioritySearchLink(context, "store productivity fulfilment automation investor presentation", "Operating model")]),
          agendaRow(2, transformationAgendaDimensions[2], [
            "Investment appears directed toward data platforms, AI-enabled forecasting, fulfilment, payments, cyber resilience and store technology.",
            "Business investment should be mapped to loyalty, range, price, supply-chain capacity, colleague productivity and digital conversion.",
            "Technology investment should be tested against availability, basket size, fulfilment cost, conversion, repeat purchase and payment resilience."
          ], [
            "Technology investment should map to faster journeys, better inventory decisions, safer payments and lower fulfilment cost.",
            "Industry research points to AI, data, supply-chain automation and connected customer experience as recurring retail investment themes."
          ], [investors, prioritySearchLink(context, "technology investment AI data fulfilment stores investor presentation", "Investment signals"), prioritySearchLink(context, "retail AI forecasting fulfilment personalization industry research", "Industry research")]),
          agendaRow(3, transformationAgendaDimensions[3], [
            "Challenges include consumer spending pressure, gross margin, stock availability, supply-chain volatility, cyber risk and customer retention.",
            "Operational pressure often appears in fulfilment cost, returns, store labour, waste, supplier disruption and working-capital drag.",
            "Customer pressure should be read through price perception, loyalty engagement, service consistency and digital adoption."
          ], [
            "Annual report risk sections and trading updates typically expose demand, cost, supply, cyber and operational pressures.",
            "Cyber and payment resilience are increasingly part of the retail trust agenda because digital and store journeys are tightly connected."
          ], [annual, prioritySearchLink(context, "annual report risks consumer demand supply chain cyber", "Risk disclosures"), prioritySearchLink(context, "retail gross margin availability consumer demand trading update", "Market pressure")]),
          agendaRow(4, transformationAgendaDimensions[4], [
            "Track revenue growth, gross margin, operating margin, stock turn, availability, fulfilment cost, digital penetration, loyalty engagement and NPS.",
            "Modernisation objectives should show up in lower waste, faster replenishment, better conversion, improved colleague productivity and reduced manual effort.",
            "Peer comparison should test whether the retailer is creating operating leverage while protecting customer value."
          ], [
            "These measures show whether modernization is improving both customer outcomes and retail operating leverage.",
            "Annual results and investor decks should provide the public baseline for cost, margin, digital sales, loyalty and supply-chain commitments."
          ], [annual, prioritySearchLink(context, "cost efficiency operating margin digital sales loyalty annual report", "Performance indicators"), prioritySearchLink(context, "retail stock turn availability fulfilment cost investor results", "Operating indicators")]),
          agendaRow(5, transformationAgendaDimensions[5], [
            "Investor messages should be interpreted through price/value, customer proposition, productivity, supply-chain execution and disciplined capital spend.",
            "Leadership commentary should explain the trade-offs between growth investment, margin protection and customer experience.",
            "Market announcements should be scanned for store plans, digital partnerships, supply-chain investment, leadership changes and proposition resets."
          ], [
            "Leadership commentary and results presentations explain the near-term trade-offs between growth, margin and investment.",
            "Market announcements help identify where the retailer is changing its operating model rather than only reporting financial outcomes."
          ], [investors, prioritySearchLink(context, "CEO CFO investor presentation strategic priorities", "Leadership commentary"), prioritySearchLink(context, "market announcements store digital supply chain partnership", "Market announcements")]),
        ],
      };
    }

    if (key === "financial-services") {
      return {
        executiveSummary: `${context.name}'s transformation agenda is framed around its own reporting baseline: ${financialAnchor}. The CEO/CFO agenda is to turn that evidence into choices on customer growth, returns, cost-to-income discipline, resilience, capital allocation and regulatory confidence.`,
        rows: [
          agendaRow(0, transformationAgendaDimensions[0], [
            `${context.name}'s Board agenda starts from the reported performance baseline: ${financialAnchor}.`,
            "The CEO/CFO discussion is therefore about which investments improve returns, cost discipline, capital allocation, customer franchise strength, resilience and regulatory confidence.",
            "Official market announcements sharpen the story by showing which moves management wants investors to recognize, including reorganisations, acquisitions, partnerships, buybacks or transformation programmes."
          ], [
            "Footnote context: annual report performance tables, principal-risk disclosures and strategy narrative.",
            "Footnote context: investor presentations and results releases that set targets, capital-distribution messages and management priorities."
          ], [annual, investors, press]),
          agendaRow(1, transformationAgendaDimensions[1], [
            `${context.name}'s strategic-priority analysis is strongest when named initiatives from annual reports, investor updates and press releases are tied to operating or financial measures.`,
            "Operating-model simplification, digital servicing, automation, controls modernisation and data quality become credible agenda items when official materials link them to productivity, growth, risk or service outcomes.",
            "Each transformation initiative maps to an investor-grade measure: cost-to-income, RoTE/RoE, customer growth, digital adoption, resilience or control effectiveness."
          ], [
            "Footnote context: annual-report strategy and business-segment review sections.",
            "Footnote context: investor-update slides, results presentations and official press releases that name programmes, targets or structural changes."
          ], [annual, investors, press]),
          agendaRow(2, transformationAgendaDimensions[2], [
            `${context.name}'s investment direction comes from capital-allocation commentary, segment priorities, technology-programme references and official acquisition or partnership announcements.`,
            "Business investment maps to stated outcomes such as customer acquisition, relationship depth, payment volumes, advice/wealth growth, lending quality or service reliability.",
            "Technology investment is most defensible where official sources connect it to productivity, resilience, cyber, financial-crime controls, data, digital channels or platform simplification."
          ], [
            "Footnote context: investor-relations capital-allocation and target-operating-model commentary.",
            "Footnote context: press releases for acquisitions, partnerships, product launches, platform investments or restructuring announcements."
          ], [investors, press, annual]),
          agendaRow(3, transformationAgendaDimensions[3], [
            `${context.name}'s challenge profile is tested against annual-report risk disclosures and results commentary: margin pressure, credit risk, conduct/regulatory scrutiny, cyber, fraud, operational resilience and customer retention.`,
            "Operational challenges become specific when official sources mention service availability, complaints, remediation, control weaknesses, legacy platforms, manual work or data quality.",
            "Customer-related challenges use official customer, digital, complaints, NPS, retention, segment or product-performance disclosures rather than generic banking trends."
          ], [
            "Footnote context: annual-report principal risks, viability, controls and regulatory sections.",
            "Footnote context: results releases and market announcements that explain near-term financial, operational or customer pressure."
          ], [annual, investors, press]),
          agendaRow(4, transformationAgendaDimensions[4], [
            `The first public indicator set for ${context.name} is financial: ${financialAnchor}.`,
            "Modernisation indicators add official measures where available: digital adoption, straight-through processing, automation, complaints, service availability, resilience incidents or control remediation.",
            "Peer comparison uses the same metric family so the CEO/CFO conversation stays grounded in investor-grade evidence."
          ], [
            "Footnote context: annual report financial statements, KPI tables and segment performance reviews.",
            "Footnote context: investor presentations that state targets, medium-term ambitions and capital-distribution commitments."
          ], [annual, investors, press]),
          agendaRow(5, transformationAgendaDimensions[5], [
            `${context.name}'s leadership narrative mirrors CEO/CFO statements from annual reports, results releases, investor presentations and press releases.`,
            "Market announcements explain agenda shifts such as restructuring, acquisitions, partnerships, capital returns, product launches or regulatory remediation.",
            "The account narrative is strongest when each technology proposal is tied to a published management commitment and a measurable operating or financial outcome."
          ], [
            "Footnote context: CEO/CFO annual-report statements, results-call messaging, investor-relations materials and press releases.",
            "Footnote context: official market announcements that explain leadership priorities or strategic change."
          ], [investors, annual, press]),
        ],
      };
    }

    return {
      executiveSummary: `${context.name}'s business transformation agenda should be interpreted through growth, productivity, resilience and customer trust. Use public reporting and investor messages to connect business priorities to technology investment choices, operating outcomes and measurable value.`,
      rows: [
        agendaRow(0, transformationAgendaDimensions[0], [
          "Board attention is likely on growth, margin resilience, customer outcomes, risk control and execution confidence.",
          "The executive agenda should identify which customer and operating outcomes matter most to investors and where technology can move those metrics.",
          "The CEO/CFO question is where to place fewer, bigger bets that improve growth, productivity and trust."
        ], [
          "Annual reports and investor presentations show the themes leadership repeats most consistently.",
          "Public results, market announcements and industry research should be triangulated before client use."
        ], [annual, investors, prioritySearchLink(context, "CEO CFO annual report strategic priorities growth margin", "Executive signals")]),
        agendaRow(1, transformationAgendaDimensions[1], [
          "Transformation initiatives should be mapped to customer experience, operating-model simplification, data modernization and productivity.",
          "The strongest initiatives will have a clear owner, measurable business outcome and visible tie to public strategy.",
          "Avoid framing transformation as technology migration unless it changes customer, cost, speed or risk outcomes."
        ], [
          "Public strategy narratives typically describe where the operating model must change to deliver growth.",
          "Investor materials should show the language management uses for transformation, simplification and productivity."
        ], [annual, prioritySearchLink(context, "strategy transformation initiatives annual report", "Transformation signals"), investors]),
        agendaRow(2, transformationAgendaDimensions[2], [
          "Investment is likely directed toward digital platforms, cloud, data and AI, automation, cyber resilience and core process modernization.",
          "Business investment should be linked to customer growth, operating leverage, risk reduction and service reliability.",
          "Technology spend should be tested against the business outcomes named in investor materials."
        ], [
          "Investor presentations and annual-report strategy sections are the best public evidence for investment direction.",
          "Industry research should be used to benchmark whether the investment pattern is defensive, catch-up or differentiating."
        ], [investors, prioritySearchLink(context, "technology investment data AI cloud investor presentation", "Investment signals"), prioritySearchLink(context, "industry research digital transformation AI cloud cyber", "Industry research")]),
        agendaRow(3, transformationAgendaDimensions[3], [
          "Challenges typically include cost pressure, regulatory or market uncertainty, customer expectations, cyber risk and operational resilience.",
          "Operational challenges should be translated into process, platform, data and control gaps that can be tested in discovery.",
          "Customer challenges should be read through satisfaction, retention, service speed, digital adoption and trust."
        ], [
          "Annual report risk disclosures and market updates identify the constraints that transformation must address.",
          "Regulatory, customer and financial signals should be kept together because they often explain why change is urgent now."
        ], [annual, prioritySearchLink(context, "annual report risks operational regulatory customer challenges", "Risk disclosures"), prioritySearchLink(context, "customer satisfaction cyber resilience regulatory market pressure", "External pressure")]),
        agendaRow(4, transformationAgendaDimensions[4], [
          "Track revenue growth, operating margin, productivity, customer satisfaction, digital adoption and modernization delivery milestones.",
          "Modernisation objectives should be translated into cost, cycle-time, quality, control and customer-experience metrics.",
          "Peer comparison should test whether the company is closing gaps or creating an advantage."
        ], [
          "These measures connect strategy to financial and operating performance.",
          "Annual results and investor materials provide the public baseline for cost, growth and modernization commitments."
        ], [annual, prioritySearchLink(context, "cost efficiency growth modernization objectives investor results", "Performance indicators"), prioritySearchLink(context, "operating margin productivity digital adoption annual report", "Modernisation indicators")]),
        agendaRow(5, transformationAgendaDimensions[5], [
          "Leadership commentary should explain the trade-offs between growth, capital allocation, productivity, customer outcomes and risk appetite.",
          "Market announcements should be scanned for partnerships, M&A, divestments, platform changes, leadership moves and regulatory updates.",
          "The account narrative should reuse public executive language, then connect it to the technology and operating choices required to deliver."
        ], [
          "CEO/CFO comments, results presentations and market announcements reveal the language executives use with investors.",
          "Investor relations pages and results releases are the safest sources for current leadership framing."
        ], [investors, prioritySearchLink(context, "CEO CFO commentary investor messages strategy", "Leadership commentary"), prioritySearchLink(context, "market announcements partnership acquisition divestment regulatory update", "Market announcements")]),
      ],
    };
  }

  function researchFirmSearchLink(company, firm, topic, label) {
    const companyName = company && company.name ? company.name : "company";
    const industry = company && company.industry ? company.industry : "industry";
    return {
      label,
      url: `https://www.bing.com/search?q=${encodeURIComponent(`${firm} ${industry} ${topic} ${companyName}`)}`,
    };
  }

  function normalizedResearchSource(row) {
    if (!row) return null;
    return {
      name: String(row.name || "").trim(),
      industry: String(row.industry || "").trim(),
      category: String(row.category || "Industry Research").trim(),
      specialty: String(row.specialty || "").trim(),
      bestFor: String(row.best_for || row.bestFor || "").trim(),
      baseUrl: String(row.base_url || row.baseUrl || "").trim(),
      priorityOrder: Number(row.priority_order || row.priorityOrder || 100),
      enabled: row.enabled !== 0 && row.enabled !== "0" && row.enabled !== false,
    };
  }

  function researchSourceBucket(industry) {
    const key = industryPeerKey(industry);
    if (key === "retail" || key === "uk-retail" || key === "online-retail" || key === "consumer-goods") return "consumer-retail";
    if (key === "financial-services" || key === "insurance") return "financial-services";
    if (key === "technology" || key === "telecommunications" || key === "software") return "technology-it";
    if (key === "energy" || key === "utilities") return "energy";
    if (key === "healthcare" || key === "life-sciences" || key === "pharmaceutical") return "healthcare";
    if (key === "media" || key === "advertising") return "media";
    return key || normalizeLookupQuery(industry);
  }

  function researchSourceMatchesIndustry(source, targetIndustry) {
    const sourceBucket = researchSourceBucket(source.industry);
    const targetBucket = researchSourceBucket(targetIndustry);
    if (targetBucket === "technology-it") return sourceBucket === "technology-it";
    return sourceBucket === targetBucket && !["multi industry", "strategy consulting", "academic institutions"].includes(sourceBucket);
  }

  function selectResearchSourcesForCompany(company, limit = 8) {
    const targetIndustry = (company && (company.peerGroup || company.subSector || company.primaryIndustry || company.industry)) || "";
    const targetBucket = researchSourceBucket(targetIndustry);
    const rows = (state.researchSources || [])
      .map(normalizedResearchSource)
      .filter((row) => row && row.enabled && row.name)
      .sort((a, b) => a.priorityOrder - b.priorityOrder || a.name.localeCompare(b.name));
    const industryRows = rows.filter((row) => researchSourceMatchesIndustry(row, targetIndustry));
    const techRows = rows.filter((row) => researchSourceBucket(row.industry) === "technology-it" || row.category === "Technology & IT");
    const strategyRows = rows.filter((row) => row.category === "Strategy Consulting" || researchSourceBucket(row.industry) === "strategy consulting");
    const multiRows = rows.filter((row) => normalizeLookupQuery(row.industry) === "multi industry");
    const selected = [];
    const seen = new Set();
    const addMany = (sourceRows, count) => {
      let added = 0;
      sourceRows.forEach((row) => {
        if (added >= count) return;
        const key = normalizeLookupQuery(row.name);
        if (!key || seen.has(key)) return;
        selected.push(row);
        seen.add(key);
        added += 1;
      });
    };
    if (targetBucket === "technology-it") {
      addMany(techRows, 5);
      addMany(strategyRows, 3);
    } else {
      addMany(industryRows, 3);
      if (!industryRows.length) addMany(multiRows, 2);
      addMany(techRows, 3);
      addMany(strategyRows, 2);
    }
    if (selected.length < limit) addMany(multiRows, limit - selected.length);
    if (selected.length < limit) addMany(rows, limit - selected.length);
    return selected.slice(0, limit);
  }

  function researchPrioritiesFromSources(company) {
    const context = company || currentPriorityCompany();
    const companyName = context && context.name ? context.name : "the company";
    const industry = context && (context.peerGroup || context.subSector || context.primaryIndustry || context.industry)
      ? (context.peerGroup || context.subSector || context.primaryIndustry || context.industry)
      : "the sector";
    const sources = selectResearchSourcesForCompany(context, 8);
    return sources.map((source) => {
      const specialty = source.specialty || source.category || "sector research";
      const bestFor = source.bestFor || "industry context";
      const sourceUrl = source.baseUrl || researchFirmSearchLink(context, source.name, specialty, source.name).url;
      return {
        firm: source.name,
        priority: bestFor ? `Use ${source.name} for ${specialty}.` : `Use ${source.name} to validate ${specialty}.`,
        signal: `${source.name} is prioritised for ${source.industry || source.category}: ${specialty}. Best for: ${bestFor}.`,
        implication: `For ${companyName}, use ${source.name} after official company sources to validate ${industry} priorities, then translate them into technology and business-change opportunities.`,
        sources: [
          { label: source.name, url: sourceUrl },
        ],
      };
    });
  }

  function buildSectorResearchFirmPriorities(company) {
    const current = currentPriorityCompany();
    const context = {
      name: company && company.name ? company.name : current.name,
      industry: company && company.industry ? company.industry : current.industry,
      primaryIndustry: company && company.primaryIndustry ? company.primaryIndustry : current.primaryIndustry,
      subSector: company && company.subSector ? company.subSector : current.subSector,
      peerGroup: company && company.peerGroup ? company.peerGroup : current.peerGroup,
    };
    const key = industryPeerKey(context.peerGroup || context.subSector || context.primaryIndustry || context.industry);
    const name = context.name || "the company";
    const sectorDescriptor = [context.primaryIndustry || context.industry, context.subSector]
      .filter(Boolean)
      .join(" / ") || "its sector";
    const commonRows = [
      {
        firm: "Gartner",
        priority: "Turn sector strategy into governed, outcome-led execution.",
        signal: "Gartner's 2026 research themes emphasize governance, AI, data, cybersecurity, cloud and operating-model choices that need disciplined execution.",
        implication: `For ${name}, use technology only where it advances the ${sectorDescriptor} agenda: customer outcomes, productivity, resilience and measurable performance.`,
        sources: [
          { label: "Gartner 2026 tech trends", url: "https://www.gartner.com/en/articles/top-technology-trends-2026" },
        ],
      },
      {
        firm: "Forrester",
        priority: "Compete on trust, transparency and demonstrable sector value.",
        signal: "Forrester's 2026 predictions call for a move away from hype toward trusted outcomes, defensible value and evidence-based decisions.",
        implication: `For ${name}, prioritize moves that prove value in sector metrics first, then use data, AI and platforms as supporting evidence.`,
        sources: [
          { label: "Forrester Predictions 2026", url: "https://www.forrester.com/predictions/" },
        ],
      },
    ];
    const retailRows = [
      {
        firm: "McKinsey",
        priority: "Sharpen omnichannel growth and productivity choices.",
        signal: "McKinsey retail research highlights fast-changing consumers, cost pressure, grocery and retail margin pressure, AI and differentiated customer propositions.",
        implication: `For ${name}, connect modernization to customer journeys, assortment, loyalty, supply-chain resilience and store/digital productivity.`,
        sources: [
          { label: "McKinsey retail insights", url: "https://www.mckinsey.com/industries/retail/our-insights" },
        ],
      },
      {
        firm: "Deloitte",
        priority: "Protect margin while modernizing stores, digital channels and supply chain.",
        signal: "Deloitte's retail outlook frames sector performance around consumer demand, cost pressure, digital investment, supply chain and operating-model choices.",
        implication: `For ${name}, test each initiative against margin resilience, customer convenience, fulfilment quality and operating efficiency.`,
        sources: [
          { label: "Deloitte retail outlook 2026", url: "https://www.deloitte.com/us/en/insights/industry/retail-distribution/retail-distribution-industry-outlook.html" },
        ],
      },
      {
        firm: "Accenture",
        priority: "Use AI and data to reinvent merchandising, service and store operations.",
        signal: "Accenture's retail work positions AI, data, cloud and reinvention as levers for customer relevance, productivity and resilient commerce.",
        implication: `For ${name}, prioritize AI use cases that improve personalization, colleague productivity, demand sensing and cross-channel service quality.`,
        sources: [
          { label: "Accenture retail", url: "https://www.accenture.com/us-en/industries/retail" },
        ],
      },
      {
        firm: "Capgemini",
        priority: "Create connected commerce and resilient consumer operations.",
        signal: "Capgemini's consumer products and retail research focuses on connected experiences, data, AI, supply chain and modern technology platforms.",
        implication: `For ${name}, connect digital commerce, inventory accuracy, fulfilment, data quality and customer experience into one transformation agenda.`,
        sources: [
          { label: "Capgemini consumer products and retail", url: "https://www.capgemini.com/industries/consumer-products-retail/" },
        ],
      },
      {
        firm: "PwC",
        priority: "Balance consumer-market disruption, trust and technology investment.",
        signal: "PwC's consumer markets research links consumer expectations, technology, cyber, trust, supply chains and new sources of value.",
        implication: `For ${name}, frame technology investment around customer trust, resilient operations, better data and disciplined growth choices.`,
        sources: [
          { label: "PwC consumer markets", url: "https://www.pwc.com/gx/en/industries/consumer-markets.html" },
        ],
      },
      {
        firm: "BCG",
        priority: "Build a more adaptive retail operating model.",
        signal: "BCG retail research emphasizes AI, pricing, personalization, digital transformation, category choices, operations and growth.",
        implication: `For ${name}, use peer comparison to pressure-test where digital, analytics and operating-model moves can create advantage.`,
        sources: [
          { label: "BCG retail", url: "https://www.bcg.com/industries/retail/overview" },
        ],
      },
    ];
    const insuranceRows = [
      {
        firm: "McKinsey",
        priority: "Modernize underwriting, claims and distribution around AI-enabled operating models.",
        signal: "McKinsey insurance research highlights AI in underwriting, core modernization, data-led growth and risk-controlled expansion.",
        implication: `For ${name}, connect technology investment to faster claims, better risk selection, broker/adviser productivity and trusted customer service.`,
        sources: [
          { label: "McKinsey insurance insights", url: "https://www.mckinsey.com/industries/financial-services/our-insights/insurance" },
        ],
      },
      {
        firm: "Deloitte",
        priority: "Improve profitability while responding to risk, regulation and changing customer expectations.",
        signal: "Deloitte's insurance outlook focuses on growth, profitability, technology, talent, risk, regulation and operating-model modernization.",
        implication: `For ${name}, tie transformation to solvency discipline, cost efficiency, digital servicing, controls and customer retention.`,
        sources: [
          { label: "Deloitte insurance outlook 2026", url: "https://www.deloitte.com/us/en/insights/industry/financial-services/financial-services-industry-outlooks/insurance-industry-outlook.html" },
        ],
      },
      {
        firm: "Accenture",
        priority: "Use reinvention to simplify policyholder, adviser and claims experiences.",
        signal: "Accenture insurance research emphasizes digital reinvention, data, cloud, AI and ecosystem change across carriers and brokers.",
        implication: `For ${name}, prioritize AI and cloud initiatives that reduce cycle time, improve advice, lift retention and simplify operations.`,
        sources: [
          { label: "Accenture insurance", url: "https://www.accenture.com/us-en/industries/insurance" },
        ],
      },
      {
        firm: "Capgemini",
        priority: "Create intelligent insurance journeys across policy, claims and service.",
        signal: "Capgemini's insurance research focuses on customer experience, data, AI, operational resilience and modern insurer platforms.",
        implication: `For ${name}, build priorities around connected policyholder journeys, adviser enablement, claims productivity and trusted data.`,
        sources: [
          { label: "Capgemini world insurance report", url: "https://www.capgemini.com/insights/research-library/world-insurance-report/" },
        ],
      },
      {
        firm: "PwC",
        priority: "Protect trust while modernizing risk, regulation and customer propositions.",
        signal: "PwC's insurance research sits within financial services priorities around regulation, cyber, trust, AI, technology and changing customer expectations.",
        implication: `For ${name}, frame modernization as a way to improve resilience, governance, product relevance and customer confidence.`,
        sources: [
          { label: "PwC insurance", url: "https://www.pwc.com/gx/en/industries/financial-services/insurance.html" },
        ],
      },
      {
        firm: "BCG",
        priority: "Convert AI and digital disruption into profitable insurance growth.",
        signal: "BCG insurance research focuses on digital transformation, AI, operations, growth, claims and distribution strategy.",
        implication: `For ${name}, connect growth, risk selection, claims efficiency and platform modernization into one executive agenda.`,
        sources: [
          { label: "BCG insurance", url: "https://www.bcg.com/industries/insurance/overview" },
        ],
      },
    ];
    const bankingRows = [
      {
        firm: "McKinsey",
        priority: "Move with precision and speed to defend customer primacy.",
        signal: "McKinsey's 2026 banking review highlights customer ownership pressure, fintech and neobank acceleration, and AI's faster disruption cycle.",
        implication: `For ${name}, strengthen customer ownership through faster digital journeys, sharper segment strategies and AI-ready operating models.`,
        sources: [
          { label: "McKinsey Global Banking 2026", url: "https://www.mckinsey.com/industries/financial-services/our-insights/global-banking-annual-review" },
        ],
      },
      {
        firm: "Deloitte",
        priority: "Industrialize AI while modernizing data, payments and financial-crime defenses.",
        signal: "Deloitte's 2026 banking outlook points to AI at scale, data infrastructure, stablecoin disruption, margin pressure and faster financial-crime threats.",
        implication: `For ${name}, link AI investment to data modernization, payments, resilience, fraud controls and operating efficiency.`,
        sources: [
          { label: "Deloitte banking outlook 2026", url: "https://www.deloitte.com/us/en/insights/industry/financial-services/financial-services-industry-outlooks/banking-industry-outlook.html" },
        ],
      },
      {
        firm: "Accenture",
        priority: "Use AI to deepen relationships, not only reduce cost.",
        signal: "Accenture's banking trends frame generative AI as a force that reshapes roles, cloud, data, customer conversations, pricing, core modernization and efficiency.",
        implication: `For ${name}, prioritize AI use cases that improve advice, loyalty and productivity while modernizing core platforms and engineering practices.`,
        sources: [
          { label: "Accenture banking trends", url: "https://www.accenture.com/us-en/insights/banking/top-10-trends-banking" },
        ],
      },
      {
        firm: "Capgemini",
        priority: "Shift toward intelligent banking and relationship-led experiences.",
        signal: "Capgemini's World Retail Banking Report highlights intelligent banking, customer experience, data and AI as levers for digital and human engagement.",
        implication: `For ${name}, build the priority story around personalized journeys, better banker tools, data-driven engagement and connected service.`,
        sources: [
          { label: "Capgemini retail banking report", url: "https://www.capgemini.com/insights/research-library/world-retail-banking-report/" },
        ],
      },
      {
        firm: "PwC",
        priority: "Anticipate disruption across AI, DeFi, embedded finance, cyber and regulation.",
        signal: "PwC's financial services research points to breakthrough technology, decentralized finance, embedded finance, new entrants, customer expectations, cyber and regulatory shifts.",
        implication: `For ${name}, treat modernization, cyber resilience and product innovation as connected priorities with governance strong enough to keep pace.`,
        sources: [
          { label: "PwC financial services", url: "https://www.pwc.com/gx/en/industries/financial-services.html" },
        ],
      },
      {
        firm: "BCG",
        priority: "Turn AI disruption into growth through modern operations and digital transformation.",
        signal: "BCG's financial institutions research emphasizes AI disruption, modernized operations, digital transformation, payments, fintech pressure and evolving customer demand.",
        implication: `For ${name}, connect growth, fintech defense, payments innovation and operating modernization into one transformation agenda.`,
        sources: [
          { label: "BCG financial institutions", url: "https://www.bcg.com/industries/financial-institutions/overview" },
        ],
      },
    ];
    const telecomRows = [
      {
        firm: "McKinsey",
        priority: "Shift network investment from coverage alone to customer, enterprise and fibre/5G monetisation.",
        signal: "McKinsey telecommunications research frames sector performance around capital intensity, fibre and 5G returns, enterprise connectivity, digital service models and productivity.",
        implication: `For ${name}, make the conversation about improving returns from network assets, simplifying service operations and converting connectivity into higher-value digital and enterprise propositions.`,
        sources: [
          { label: "McKinsey telecommunications insights", url: "https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights" },
        ],
      },
      {
        firm: "Deloitte",
        priority: "Turn telecom modernisation into measurable ARPU, churn, service-cost and capex-efficiency outcomes.",
        signal: "Deloitte telecommunications outlooks focus on fibre, 5G, network economics, customer experience, enterprise services, cybersecurity and operating-model change.",
        implication: `For ${name}, link cloud, automation, data and AI to specific telecom measures: lower cost-to-serve, faster provisioning, better fault resolution, reduced churn and higher enterprise wallet share.`,
        sources: [
          { label: "Deloitte telecom outlook", url: "https://www.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-outlooks.html" },
        ],
      },
      {
        firm: "Accenture",
        priority: "Use AI and cloud to industrialise network operations and reinvent customer service.",
        signal: "Accenture communications research emphasizes AI, cloud, data, network transformation, customer operations and new digital growth plays for communications providers.",
        implication: `For ${name}, prioritise AI operations, contact-centre transformation, digital self-service and cloud-native platforms where they reduce incidents and improve customer experience.`,
        sources: [
          { label: "Accenture communications", url: "https://www.accenture.com/us-en/industries/communications-media-index" },
        ],
      },
      {
        firm: "Capgemini",
        priority: "Modernise telecom platforms around connected operations, data quality and service agility.",
        signal: "Capgemini telecommunications research focuses on network transformation, intelligent operations, data, AI, sustainability and customer experience.",
        implication: `For ${name}, frame technology opportunities around service assurance, field-force productivity, data-led operations, platform simplification and faster launch of digital services.`,
        sources: [
          { label: "Capgemini telecoms", url: "https://www.capgemini.com/industries/telecoms/" },
        ],
      },
      {
        firm: "PwC",
        priority: "Balance network investment, regulation, resilience and new digital revenue pools.",
        signal: "PwC technology, media and telecommunications research highlights infrastructure investment, regulation, cyber trust, customer demand and sector disruption.",
        implication: `For ${name}, position resilience, cyber, cloud and data governance as enablers of trusted services rather than back-office technology spend.`,
        sources: [
          { label: "PwC technology, media and telecommunications", url: "https://www.pwc.com/gx/en/industries/tmt.html" },
        ],
      },
      {
        firm: "BCG",
        priority: "Create advantage through AI-enabled operations, enterprise services and disciplined network economics.",
        signal: "BCG telecommunications research emphasizes network investment returns, operating-model reinvention, digital channels, AI, enterprise connectivity and customer value.",
        implication: `For ${name}, use peer comparison to test where AI-enabled network operations, enterprise propositions and digital journeys can improve EBITDA contribution.`,
        sources: [
          { label: "BCG telecommunications", url: "https://www.bcg.com/industries/telecommunications/overview" },
        ],
      },
    ];
    const generalRows = [
      {
        firm: "McKinsey",
        priority: "Focus growth, cost and customer-experience investment on the few choices that move performance.",
        signal: "McKinsey industry research points leaders toward sharper strategic focus, faster execution and technology-enabled productivity.",
        implication: `For ${name}, anchor the narrative in the ${sectorDescriptor} priorities where modernization can create visible customer or margin impact.`,
        sources: [
          { label: "McKinsey industry insights", url: "https://www.mckinsey.com/industries" },
        ],
      },
      {
        firm: "Deloitte",
        priority: "Connect operating-model modernization to sector-specific value pools.",
        signal: "Deloitte industry outlooks emphasize operations, workforce, risk, market disruption and selective technology investment.",
        implication: `For ${name}, translate research themes into a practical roadmap for modernization, risk control, customer experience and efficiency.`,
        sources: [
          { label: "Deloitte industry insights", url: "https://www.deloitte.com/us/en/insights/industry.html" },
        ],
      },
      {
        firm: "Accenture",
        priority: "Reinvent customer experience, operations and workforce productivity.",
        signal: "Accenture research highlights reinvention across customer experience, operations, workforce and technology-enabled productivity.",
        implication: `For ${name}, prioritize AI use cases that create measurable customer, employee and operating-model value in ${sectorDescriptor}.`,
        sources: [
          { label: "Accenture industries", url: "https://www.accenture.com/us-en/industries-index" },
        ],
      },
      {
        firm: "Capgemini",
        priority: "Create intelligent, connected customer and operating experiences.",
        signal: "Capgemini research emphasizes customer experience, data quality, connected operations and modern technology platforms as transformation levers.",
        implication: `For ${name}, connect modernization priorities to customer relevance, employee enablement and operational speed.`,
        sources: [
          { label: "Capgemini industries", url: "https://www.capgemini.com/industries/" },
        ],
      },
      {
        firm: "PwC",
        priority: "Turn market disruption and technology shifts into strategic advantage.",
        signal: "PwC industry research emphasizes technology disruption, changing expectations, cyber risk, regulation and new sources of value.",
        implication: `For ${name}, frame priorities around innovation, resilience, customer expectations and disciplined transformation.`,
        sources: [
          { label: "PwC industries", url: "https://www.pwc.com/gx/en/industries.html" },
        ],
      },
      {
        firm: "BCG",
        priority: "Convert market disruption into growth, innovation and operational advantage.",
        signal: "BCG research emphasizes bold moves across growth, innovation, operations and selective digital transformation.",
        implication: `For ${name}, tie digital transformation to the few operating and customer priorities where bold moves can change performance.`,
        sources: [
          { label: "BCG industries", url: "https://www.bcg.com/industries" },
        ],
      },
    ];
    if (key === "retail" || key === "uk-retail" || key === "online-retail") return retailRows.concat(commonRows);
    if (key === "insurance") return insuranceRows.concat(commonRows);
    if (key === "financial-services") return bankingRows.concat(commonRows);
    if (key === "telecommunications") return telecomRows.concat(commonRows);
    return generalRows.concat(commonRows);
  }

  function buildResearchFirmPriorities(company) {
    return buildSectorResearchFirmPriorities(company);
    const context = {
      name: company && company.name ? company.name : currentPriorityCompany().name,
      industry: company && company.industry ? company.industry : currentPriorityCompany().industry,
    };
    const financialServices = /bank|financial|insurance|capital|wealth/i.test(context.industry);
    return [
      {
        firm: "Gartner",
        priority: "Turn technology trends into governed, outcome-led execution.",
        signal: "Gartner's 2026 technology trends emphasize AI, data, cybersecurity, cloud and operating-model choices that need disciplined execution.",
        implication: `For ${context.name}, prioritize governed AI, resilient platforms and measurable productivity outcomes over disconnected technology pilots.`,
        sources: [
          { label: "Gartner 2026 tech trends", url: "https://www.gartner.com/en/articles/top-technology-trends-2026" },
        ],
      },
      {
        firm: "Forrester",
        priority: "Compete on trust, transparency and demonstrable business value.",
        signal: "Forrester's 2026 predictions call for a move away from hype toward trusted outcomes, defensible value and evidence-based decisions.",
        implication: "Select business priorities that can prove customer value, reduce risk, and show measurable progress in the operating metrics leaders already track.",
        sources: [
          { label: "Forrester Predictions 2026", url: "https://www.forrester.com/predictions/" },
        ],
      },
      {
        firm: "McKinsey",
        priority: financialServices
          ? "Move with precision and speed to defend customer primacy."
          : "Use precision strategies to focus growth, cost and customer-experience investment.",
        signal: financialServices
          ? "McKinsey's 2026 banking review highlights customer ownership pressure, fintech and neobank acceleration, and AI's faster disruption cycle."
          : "McKinsey industry research repeatedly points leaders toward sharper strategic focus, faster execution and technology-enabled productivity.",
        implication: financialServices
          ? "Strengthen customer ownership through faster digital journeys, sharper segment strategies and operating models that can keep pace with AI-enabled competitors."
          : "Anchor the narrative in the few growth and productivity priorities where modernization can create visible customer or margin impact.",
        sources: [
          financialServices
            ? { label: "McKinsey Global Banking 2026", url: "https://www.mckinsey.com/industries/financial-services/our-insights/global-banking-annual-review" }
            : researchFirmSearchLink(context, "McKinsey", "industry outlook digital transformation productivity", "McKinsey industry research"),
        ],
      },
      {
        firm: "Deloitte",
        priority: financialServices
          ? "Industrialize AI while modernizing data, payments and financial-crime defenses."
          : "Connect AI, data and operating-model modernization to industry-specific value pools.",
        signal: financialServices
          ? "Deloitte's 2026 banking outlook points to AI at scale, data infrastructure, stablecoin disruption, margin pressure and faster financial-crime threats."
          : "Deloitte's industry outlooks emphasize bold choices across technology, operations, workforce, risk and market disruption.",
        implication: financialServices
          ? "Link AI investment to data modernization, payment strategy, resilience, fraud controls and operating efficiency so transformation supports both growth and control."
          : "Translate research themes into a practical roadmap for modernization, risk control, customer experience and efficiency.",
        sources: [
          financialServices
            ? { label: "Deloitte banking outlook 2026", url: "https://www.deloitte.com/us/en/insights/industry/financial-services/financial-services-industry-outlooks/banking-industry-outlook.html" }
            : { label: "Deloitte industry outlooks 2026", url: "https://www.deloitte.com/us/en/insights/industry/financial-services/financial-services-industry-outlooks.html" },
        ],
      },
      {
        firm: "Accenture",
        priority: financialServices
          ? "Use AI to deepen relationships, not only reduce cost."
          : "Use AI to reinvent customer experience, operations and workforce productivity.",
        signal: financialServices
          ? "Accenture's banking trends frame generative AI as a force that reshapes roles, cloud, data, customer conversations, pricing, core modernization and operating efficiency."
          : "Accenture research highlights AI, cloud, data and reinvention as practical levers for productivity and growth.",
        implication: financialServices
          ? "Prioritize AI use cases that improve advice, loyalty and productivity while modernizing core platforms and engineering practices."
          : "Prioritize AI use cases that create measurable customer, employee and operating-model value.",
        sources: [
          financialServices
            ? { label: "Accenture banking trends", url: "https://www.accenture.com/us-en/insights/banking/top-10-trends-banking" }
            : researchFirmSearchLink(context, "Accenture", "AI reinvention industry trends", "Accenture research"),
        ],
      },
      {
        firm: "Capgemini",
        priority: financialServices
          ? "Shift toward intelligent banking and relationship-led experiences."
          : "Use data and AI to create intelligent, connected customer and operating experiences.",
        signal: financialServices
          ? "Capgemini's World Retail Banking Report highlights intelligent banking, customer experience, data and AI as levers for more relevant digital and human engagement."
          : "Capgemini research emphasizes AI, data, technology modernization and customer experience as business transformation levers.",
        implication: financialServices
          ? "Build the priority story around personalized journeys, better banker tools, data-driven engagement and connected service experiences."
          : "Connect modernization priorities to customer relevance, employee enablement and operational speed.",
        sources: [
          financialServices
            ? { label: "Capgemini retail banking report", url: "https://www.capgemini.com/insights/research-library/world-retail-banking-report/" }
            : researchFirmSearchLink(context, "Capgemini", "AI data customer experience industry research", "Capgemini research"),
        ],
      },
      {
        firm: "PwC",
        priority: financialServices
          ? "Anticipate disruption across AI, DeFi, embedded finance, cyber and regulation."
          : "Turn market disruption and technology shifts into strategic advantage.",
        signal: financialServices
          ? "PwC's financial services research points to breakthrough technology, decentralized finance, embedded finance, new entrants, customer expectations, cyber threats and regulatory shifts."
          : "PwC industry research emphasizes technology disruption, changing expectations, cyber risk, regulation and new sources of value.",
        implication: financialServices
          ? "Treat modernization, cyber resilience and product innovation as connected priorities, with governance strong enough to keep pace with disruption."
          : "Frame priorities around innovation, resilience, customer expectations and disciplined transformation.",
        sources: [
          financialServices
            ? { label: "PwC financial services", url: "https://www.pwc.com/gx/en/industries/financial-services.html" }
            : researchFirmSearchLink(context, "PwC", "industry trends technology cyber regulation", "PwC industry research"),
        ],
      },
      {
        firm: "BCG",
        priority: financialServices
          ? "Turn AI disruption into growth through modern operations and digital transformation."
          : "Convert digital disruption into growth, innovation and operational advantage.",
        signal: financialServices
          ? "BCG's financial institutions research emphasizes AI disruption, modernized operations, digital transformation, payments, fintech pressure and evolving customer demand."
          : "BCG research emphasizes bold moves in AI, digital transformation, growth, innovation and operations.",
        implication: financialServices
          ? "Connect growth, fintech defense, payments innovation and operating modernization into one transformation agenda."
          : "Tie digital transformation to the few operating and customer priorities where bold moves can change performance.",
        sources: [
          financialServices
            ? { label: "BCG financial institutions", url: "https://www.bcg.com/industries/financial-institutions/overview" }
            : researchFirmSearchLink(context, "BCG", "digital transformation AI growth industry research", "BCG industry research"),
        ],
      },
    ];
  }

  function researchPriorityFingerprint(item) {
    if (!item) return "";
    const sources = Array.isArray(item.sources) ? item.sources : [];
    return normalizeLookupQuery([
      item.firm,
      item.priority,
      item.signal,
      item.implication,
      ...sources.map((source) => `${source.label || ""} ${source.url || ""}`),
    ].join(" "));
  }

  function researchFindingIsCatalogueMetadata(item) {
    if (!item) return false;
    const firm = String(item.firm || "").trim();
    const firmPattern = firm ? normalizeLookupQuery(firm) : "";
    const priority = normalizeLookupQuery(item.priority || "");
    const signal = normalizeLookupQuery(item.signal || "");
    const implication = normalizeLookupQuery(item.implication || "");
    return Boolean(
      (firmPattern && (priority.startsWith(`use ${firmPattern} for`) || priority.startsWith(`use ${firmPattern} to validate`))) ||
      signal.includes("is prioritised for") ||
      signal.includes("best for") ||
      (firmPattern && implication.includes(`use ${firmPattern} after official company sources`)) ||
      implication.includes("to validate") && implication.includes("priorities then translate")
    );
  }

  function cleanResearchDisplayText(value) {
    return String(value || "")
      .replace(/\[[A-Za-z0-9_-]{1,50}\]/g, "")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function usableResearchFindingRows(priorities) {
    return (Array.isArray(priorities) ? priorities : []).filter((item) =>
      item &&
      !researchFindingIsCatalogueMetadata(item) &&
      String(item.firm || "").trim() &&
      String(item.priority || item.signal || "").trim()
    );
  }

  function mergeResearchFirmPriorities(priorities, company) {
    const defaults = buildResearchFirmPriorities(company || currentPriorityCompany());
    const merged = [];
    const seen = new Set();
    const researchedRows = usableResearchFindingRows(priorities);
    researchedRows.forEach((item) => {
      const key = normalizeLookupQuery(item.firm || item.priority || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    if (merged.length >= 3) return merged.slice(0, 8);
    defaults.forEach((item) => {
      const key = normalizeLookupQuery(item.firm || item.priority || "");
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    return merged.slice(0, 8);
  }

  function needsResearchFirmPriorityRefresh(priorities, company) {
    const rows = usableResearchFindingRows(priorities);
    if (rows.length < 3) return true;
    if (contentNeedsIndustryRefresh(rows, company || currentPriorityCompany())) return true;
    return rows.some((item) => !Array.isArray(item.sources) || !item.sources.some((source) => /^https?:\/\//i.test(String(source && source.url || ""))));
  }

  function researchExecutiveSummary(priorities, company) {
    const firmCount = Array.isArray(priorities) ? priorities.length : 0;
    const context = company || currentPriorityCompany();
    const key = industryPeerKey(context.peerGroup || context.industry);
    if (key === "retail" || key === "uk-retail" || key === "online-retail") {
      return `Across ${firmCount} leading research signals, the consistent retail agenda is customer demand, omnichannel relevance, pricing and category discipline, resilient fulfilment, store productivity, loyalty and margin protection. AI, data and platform modernization matter most where they improve availability, service, personalization, inventory accuracy and operating leverage.`;
    }
    if (key === "insurance") {
      return `Across ${firmCount} leading research signals, the consistent insurance agenda is underwriting discipline, claims performance, adviser and distribution effectiveness, capital strength, regulatory confidence, customer retention and operational resilience. AI, data and platform modernization matter where they improve risk selection, service speed, cost-to-serve and trust.`;
    }
    if (key === "financial-services") {
      return `Across ${firmCount} leading research signals, the consistent banking agenda is customer primacy, deposits and lending quality, payments disruption, margin and cost discipline, financial-crime control, regulatory confidence and operational resilience. AI, data and core modernization matter where they defend relationships, improve service economics and strengthen control.`;
    }
    if (key === "telecommunications") {
      return `Across ${firmCount} leading research signals, the consistent telecommunications agenda is fibre and 5G monetisation, enterprise connectivity, network-capex discipline, customer churn reduction, service assurance, resilience and digital operating efficiency. AI, data, cloud and automation matter where they improve network returns, lower cost-to-serve and create clearer enterprise or customer value.`;
    }
    return `Across ${firmCount} leading research signals, the consistent agenda is customer and market demand, operating-model focus, cost productivity, risk and regulation, growth choices, workforce capacity and service reliability. Technology is treated as an enabler only where it visibly improves sector performance, resilience and customer outcomes.`;
  }

  function researchTopicDefinitionsForCompany(company) {
    const context = company || currentPriorityCompany();
    const key = industryPeerKey(context.peerGroup || context.subSector || context.primaryIndustry || context.industry);
    if (key === "retail" || key === "uk-retail" || key === "online-retail") {
      return [
        { label: "Consumer Demand", terms: ["consumer", "demand", "customer", "expectations", "market", "value", "convenience"] },
        { label: "Omnichannel", terms: ["omnichannel", "digital", "store", "stores", "commerce", "channel", "journeys", "service"] },
        { label: "Supply & Fulfilment", terms: ["supply", "fulfilment", "fulfillment", "inventory", "availability", "logistics", "resilient commerce"] },
        { label: "Margin & Cost", terms: ["margin", "cost", "productivity", "efficiency", "operating", "profitability"] },
        { label: "Loyalty & Brand", terms: ["loyalty", "brand", "trust", "personalization", "relevance", "retention"] },
        { label: "Pricing & Category", terms: ["pricing", "assortment", "category", "merchandising", "differentiated", "propositions"] },
        { label: "Store Operations", terms: ["store operations", "colleague", "workforce", "staff", "operations", "operating model"] },
        { label: "Data / AI Enablement", kind: "enabler", terms: [" ai", "artificial intelligence", "generative ai", "data", "analytics", "cloud", "technology"] },
      ];
    }
    if (key === "insurance") {
      return [
        { label: "Underwriting & Pricing", terms: ["underwriting", "pricing", "risk selection", "profitability", "risk-controlled"] },
        { label: "Claims Experience", terms: ["claims", "cycle time", "policyholder", "service speed", "customer service"] },
        { label: "Distribution & Advice", terms: ["distribution", "adviser", "advisor", "broker", "advice", "intermediary"] },
        { label: "Capital & Solvency", terms: ["capital", "solvency", "profitability", "financial strength", "margin"] },
        { label: "Regulatory Confidence", terms: ["regulation", "regulatory", "governance", "controls", "compliance"] },
        { label: "Retention & Trust", terms: ["retention", "trust", "customer", "policyholder", "confidence", "experience"] },
        { label: "Operational Resilience", terms: ["resilience", "resilient", "operations", "operational", "cyber", "platform"] },
        { label: "Data / AI Enablement", kind: "enabler", terms: [" ai", "artificial intelligence", "generative ai", "data", "analytics", "cloud", "technology"] },
      ];
    }
    if (key === "financial-services") {
      return [
        { label: "Customer Primacy", terms: ["customer ownership", "customer primacy", "relationship", "relationships", "customer demand", "personalized", "engagement"] },
        { label: "Deposits & Lending", terms: ["deposits", "deposit", "lending", "credit", "balance sheet", "net interest", "margin pressure"] },
        { label: "Payments & Fintech", terms: ["payments", "fintech", "neobank", "stablecoin", "embedded finance", "defi", "decentralized finance"] },
        { label: "Margin & Cost", terms: ["margin", "cost", "productivity", "efficiency", "operating efficiency", "operating model"] },
        { label: "Financial Crime & Regulation", terms: ["financial-crime", "financial crime", "fraud", "regulation", "regulatory", "controls", "compliance"] },
        { label: "Operational Resilience", terms: ["resilience", "resilient", "cyber", "security", "risk", "operational", "platform"] },
        { label: "Branch / Digital Service", terms: ["digital journeys", "digital", "branch", "banker", "service", "advice", "connected service"] },
        { label: "Data / AI Enablement", kind: "enabler", terms: [" ai", "artificial intelligence", "generative ai", "genai", "data", "analytics", "cloud", "core modernization"] },
      ];
    }
    if (key === "telecommunications") {
      return [
        { label: "Fibre / 5G Monetisation", terms: ["fibre", "fiber", "5g", "network investment", "coverage", "monetisation", "monetization", "returns"] },
        { label: "Enterprise Connectivity", terms: ["enterprise", "b2b", "connectivity", "private network", "iot", "edge", "solutions"] },
        { label: "Network Economics", terms: ["capex", "capital intensity", "network economics", "returns", "cost", "margin", "ebitda"] },
        { label: "Customer Churn / ARPU", terms: ["churn", "arpu", "customer", "service", "digital channels", "retention", "experience"] },
        { label: "Service Assurance", terms: ["service assurance", "fault", "provisioning", "field-force", "field force", "incident", "reliability"] },
        { label: "Resilience / Cyber", terms: ["resilience", "resilient", "security", "cyber", "regulation", "trusted services", "governance"] },
        { label: "Platform Simplification", terms: ["platform", "legacy", "cloud", "automation", "simplification", "operating model", "modernisation", "modernization"] },
        { label: "Data / AI Enablement", kind: "enabler", terms: [" ai", "artificial intelligence", "generative ai", "genai", "data", "analytics", "cloud", "automation"] },
      ];
    }
    return [
      { label: "Customer / Market", terms: ["customer", "market", "demand", "expectations", "experience", "relationships"] },
      { label: "Operating Model", terms: ["operating model", "operations", "process", "execution", "service", "platform"] },
      { label: "Cost & Productivity", terms: ["cost", "productivity", "efficiency", "margin", "workforce", "operating leverage"] },
      { label: "Risk & Regulation", terms: ["risk", "regulation", "regulatory", "controls", "governance", "cyber", "resilience"] },
      { label: "Growth Choices", terms: ["growth", "portfolio", "innovation", "new sources of value", "strategic focus"] },
      { label: "Supply / Service Reliability", terms: ["supply", "fulfilment", "service reliability", "reliability", "quality"] },
      { label: "Workforce & Talent", terms: ["workforce", "talent", "employee", "colleague", "skills"] },
      { label: "Data / AI Enablement", kind: "enabler", terms: [" ai", "artificial intelligence", "generative ai", "data", "analytics", "cloud", "technology"] },
    ];
  }

  function researchRowMatchesTopic(item, topic) {
    const terms = Array.isArray(topic.terms) ? topic.terms : [];
    const fields = topic.kind === "enabler"
      ? [item.priority, item.signal]
      : [item.firm, item.priority, item.signal, item.implication];
    const haystack = ` ${fields.filter(Boolean).join(" ").toLowerCase()} `;
    return terms.some((term) => haystack.includes(String(term || "").toLowerCase()));
  }

  function researchTopicFrequencies(priorities, company) {
    const rows = Array.isArray(priorities) ? priorities : [];
    const topics = researchTopicDefinitionsForCompany(company);
    return topics.map((topic) => {
      const firms = rows.filter((item) => researchRowMatchesTopic(item, topic));
      return {
        label: topic.label,
        count: firms.length,
        total: rows.length || 1,
        firms: firms.map((item) => item.firm).filter(Boolean),
        findings: firms.map((item) => ({
          firm: item.firm || "Research",
          finding: cleanNarrativeFragment(cleanResearchDisplayText(item.priority || item.signal || ""), 150),
        })).filter((item) => item.finding),
      };
    });
  }

  function renderResearchSpiderDiagram(priorities, company) {
    const frequencies = researchTopicFrequencies(priorities, company);
    const maxCount = Math.max(1, ...frequencies.map((item) => item.count));
    const svgWidth = 900;
    const svgHeight = 620;
    const centerX = 450;
    const centerY = 315;
    const radius = 176;
    const labelRadius = 286;
    const rings = [0.25, 0.5, 0.75, 1];
    const points = frequencies.map((item, index) => {
      const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / frequencies.length;
      const scale = item.count / maxCount;
      const rawLabelX = centerX + Math.cos(angle) * labelRadius;
      const rawLabelY = centerY + Math.sin(angle) * labelRadius;
      const horizontalAnchor = rawLabelX < centerX - 12 ? "end" : rawLabelX > centerX + 12 ? "start" : "middle";
      const labelX = horizontalAnchor === "end"
        ? Math.max(rawLabelX, 168)
        : horizontalAnchor === "start"
          ? Math.min(rawLabelX, svgWidth - 168)
          : rawLabelX;
      const labelY = Math.min(Math.max(rawLabelY, 42), svgHeight - 48);
      return {
        ...item,
        angle,
        x: centerX + Math.cos(angle) * radius * scale,
        y: centerY + Math.sin(angle) * radius * scale,
        axisX: centerX + Math.cos(angle) * radius,
        axisY: centerY + Math.sin(angle) * radius,
        labelX,
        labelY,
        labelAnchor: horizontalAnchor,
      };
    });
    const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const ringPolygons = rings.map((ring, ringIndex) => {
      const ringPoints = frequencies.map((_, index) => {
        const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / frequencies.length;
        return `${(centerX + Math.cos(angle) * radius * ring).toFixed(1)},${(centerY + Math.sin(angle) * radius * ring).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${ringPoints}" class="spider-ring" style="--spider-delay:${ringIndex * 85}ms"></polygon>`;
    }).join("");
    const areaRevealDelay = 1140 + (points.length * 210);

    return `
      <div class="research-spider-panel" aria-label="Topic frequency spider diagram">
        <div class="research-spider-chart">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-labelledby="research-spider-title research-spider-desc">
            <title id="research-spider-title">Research topic frequency</title>
            <desc id="research-spider-desc">Spider diagram showing how often key topics appear across the selected research firm priorities.</desc>
            ${ringPolygons}
            ${points.map((point, index) => `
              <line class="spider-axis" style="--spider-delay:${420 + (index * 210)}ms" x1="${centerX}" y1="${centerY}" x2="${point.axisX.toFixed(1)}" y2="${point.axisY.toFixed(1)}"></line>
            `).join("")}
            <polygon points="${polygon}" class="spider-area" style="--spider-delay:${areaRevealDelay}ms"></polygon>
            <g class="spider-line-layer">
              ${points.map((point, index) => {
                const nextPoint = points[(index + 1) % points.length];
                return `<line class="spider-line spider-segment" style="--spider-delay:${760 + ((index + 1) * 210)}ms" x1="${point.x.toFixed(1)}" y1="${point.y.toFixed(1)}" x2="${nextPoint.x.toFixed(1)}" y2="${nextPoint.y.toFixed(1)}"></line>`;
              }).join("")}
            </g>
            <g class="spider-point-layer">
              ${points.map((point, index) => `
              <circle class="spider-point" style="--spider-delay:${570 + (index * 210)}ms" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.8"></circle>
              `).join("")}
            </g>
            <g class="spider-label-layer">
              ${points.map((point, index) => `
                <g class="spider-label-item" style="--spider-delay:${640 + (index * 210)}ms">
                  <text class="spider-label" x="${point.labelX.toFixed(1)}" y="${point.labelY.toFixed(1)}" text-anchor="${point.labelAnchor}">${escapeHtml(point.label)}</text>
                  <text class="spider-count" x="${point.labelX.toFixed(1)}" y="${(point.labelY + 12).toFixed(1)}" text-anchor="${point.labelAnchor}">${point.count}/${point.total}</text>
                </g>
              `).join("")}
            </g>
          </svg>
        </div>
        <div class="research-frequency-list">
          <h3>Topic Frequency</h3>
          ${frequencies
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
            .map((item) => {
              const width = Math.max(4, Math.round((item.count / maxCount) * 100));
              return `
                <div class="frequency-row">
                  <div>
                    <strong>${escapeHtml(item.label)}</strong>
                    <span>${escapeHtml(item.findings.length
                      ? item.findings.slice(0, 2).map((finding) => `${finding.firm}: ${finding.finding}`).join(" | ")
                      : "No sourced finding matched this topic")}</span>
                  </div>
                  <div class="frequency-track"><div style="--bar-width:${width}%"></div></div>
                  <b>${item.count}/${item.total}</b>
                </div>
              `;
            }).join("")}
        </div>
      </div>
    `;
  }

  function lookupMatchForValueCase(valueCase) {
    if (!valueCase) return null;
    const ticker = String(valueCase.ticker || "").trim();
    const companyName = String(valueCase.company_name || "").trim();
    const tickerMatch = ticker
      ? localCompanyLookup(ticker).matches.find((match) => normalizeLookupQuery(match.ticker) === normalizeLookupQuery(ticker))
      : null;
    if (tickerMatch) return tickerMatch;
    return localCompanyLookup(companyName).matches[0] || null;
  }

  function businessNeedsLookupPrefill(business, match) {
    const snapshot = business && business.snapshot ? business.snapshot : {};
    const snapshotHasGaps = [
      "description",
      "hq",
      "hqCountry",
      "industry",
      "primaryIndustry",
      "subSector",
      "website",
      "domain",
      "employees",
      "revenue",
      "annualRevenueUsd",
      "ebitdaUsd",
      "totalAssetsUsd",
      "netProfit",
      "ticker",
      "cik",
      "companyNumber",
      "fiscalYear",
    ].some((key) => lookupValueMissing(snapshot[key]));
    const snapshotIndustryKey = industryPeerKey(snapshot.peerGroup || snapshot.industry);
    const matchIndustryKey = industryPeerKey(match && (match.peerGroup || match.industry));
    const staleIndustry = Boolean(snapshotIndustryKey && matchIndustryKey && snapshotIndustryKey !== matchIndustryKey);
    const staleTicker = Boolean(
      match && match.ticker && snapshot.ticker &&
      normalizeLookupQuery(match.ticker) !== normalizeLookupQuery(snapshot.ticker)
    );
    const staleIndustryContent = priorityInsightsNeedSourceRefresh(business ? business.priorityInsights : null, match) ||
      contentNeedsIndustryRefresh(business ? business.researchFirmPriorities : null, match) ||
      contentNeedsIndustryRefresh(business ? business.benchmarkNotes : null, match);
    return snapshotHasGaps ||
      staleIndustry ||
      staleTicker ||
      staleIndustryContent ||
      needsFinancialLookupPrefill(business ? business.financialTrends : [], match) ||
      !hasPriorityInsights(business ? business.priorityInsights : null) ||
      needsResearchFirmPriorityRefresh(business ? business.researchFirmPriorities : null, match);
  }

  function activeCaseCompanyProfile(valueCase) {
    const row = valueCase || state.activeCase || {};
    const payloadSnapshot = row.snapshot || row.businessSnapshot || row.business_snapshot || {};
    const base = {
      name: row.company_name || row.name || payloadSnapshot.name || "",
      ticker: row.ticker || row.cik || payloadSnapshot.ticker || "",
      cik: row.cik || payloadSnapshot.cik || "",
      companyNumber: row.company_number || row.companyNumber || payloadSnapshot.companyNumber || "",
      industry: row.industry || row.primary_industry || row.primaryIndustry || payloadSnapshot.industry || "",
      primaryIndustry: row.primary_industry || row.primaryIndustry || row.industry || payloadSnapshot.primaryIndustry || "",
      subSector: row.sub_sector || row.subSector || payloadSnapshot.subSector || "",
      website: row.website || payloadSnapshot.website || "",
      domain: row.domain || payloadSnapshot.domain || "",
      hq: row.hq || payloadSnapshot.hq || "",
      hqCountry: row.hq_country || row.hqCountry || payloadSnapshot.hqCountry || "",
      employees: row.employees || payloadSnapshot.employees || "",
      revenue: row.revenue || payloadSnapshot.revenue || "",
      annualRevenueUsd: row.annual_revenue_usd || row.annualRevenueUsd || payloadSnapshot.annualRevenueUsd || "",
      ebitdaUsd: row.ebitda_usd || row.ebitdaUsd || payloadSnapshot.ebitdaUsd || "",
      totalAssetsUsd: row.total_assets_usd || row.totalAssetsUsd || payloadSnapshot.totalAssetsUsd || "",
      netProfit: row.net_profit || row.netProfit || payloadSnapshot.netProfit || "",
      fiscalYear: row.fiscal_year || row.fiscalYear || payloadSnapshot.fiscalYear || "",
      source: "saved value case",
      confidence: 100,
    };
    const local = lookupMatchForValueCase(row) || (base.name ? localCompanyLookup(base.name).matches[0] : null);
    return enrichLookupMatchFromEvidence(mergeLookupProfileFields({ ...(local || {}) }, base)) || base;
  }

  function preloadBusinessCompanyInfo(match) {
    if (!state.business) return null;
    const caseProfile = activeCaseCompanyProfile(state.activeCase);
    const hydrated = enrichLookupMatchFromEvidence(
      mergeLookupProfileFields(
        mergeLookupProfileFields({ ...(match || caseProfile || {}) }, caseProfile || {}),
        bestLocalProfileForMatch(match || caseProfile || {}) || {}
      )
    );
    const profile = hydrated || match || caseProfile;
    if (profile) {
      applyCompanyMatchToBusiness(profile, { force: true, preload: true });
      if ((!state.business.financialTrends || isBlankFinancialRows(state.business.financialTrends)) && profile.financialRows) {
        state.business.financialTrends = profile.financialRows;
      }
    }
    const snapshot = state.business.snapshot || {};
    if (lookupValueMissing(snapshot.revenue) && !lookupValueMissing(snapshot.annualRevenueUsd)) {
      snapshot.revenue = annualRevenueUsdDisplay(snapshot.annualRevenueUsd) || snapshot.revenue;
    }
    if (lookupValueMissing(snapshot.revenue) && Array.isArray(state.business.financialTrends)) {
      const latest = [...state.business.financialTrends].reverse().find((row) => row.revenue && !isValidationPlaceholder(row.revenue));
      if (latest) snapshot.revenue = latest.revenue;
    }
    delete state.business.agendaRefreshStatus;
    state.business.aiContext = buildBusinessAiContext(state.business);
    return profile;
  }

  function setSnapshotLookupValue(snapshot, key, value, force) {
    if (lookupValueMissing(value)) return;
    if (force || lookupValueMissing(snapshot[key])) {
      snapshot[key] = value;
    }
  }

  function applyCompanyMatchToBusiness(match, options) {
    if (!match || !state.business) return;
    const force = Boolean(options && options.force);
    const preserveAnnualReportAnalysis = businessHasAnnualReportEvidence(state.business) && !(options && options.replaceAnnualReportAnalysis);
    state.business.snapshot = state.business.snapshot || {};
    const previousIndustryKey = industryPeerKey(state.business.snapshot.peerGroup || state.business.snapshot.industry);
    const previousCompanyKey = normalizeLookupQuery(state.business.snapshot.name || (state.activeCase && state.activeCase.company_name));
    const previousLegalKey = normalizeLookupQuery(state.business.snapshot.legalName || "");
    const matchCompanyKey = normalizeLookupQuery(match.name || match.legalName || "");
    const identityConflict = Boolean(
      previousLegalKey && matchCompanyKey &&
      previousLegalKey !== matchCompanyKey &&
      !previousLegalKey.includes(matchCompanyKey) &&
      !matchCompanyKey.includes(previousLegalKey)
    );
    const snapshot = state.business.snapshot;
    setSnapshotLookupValue(snapshot, "name", match.name, force);
    setSnapshotLookupValue(snapshot, "legalName", match.legalName || match.name, force || identityConflict);
    setSnapshotLookupValue(snapshot, "exchange", match.exchange, force || identityConflict);
    setSnapshotLookupValue(snapshot, "description", match.description, force);
    setSnapshotLookupValue(snapshot, "hq", match.hq, force);
    setSnapshotLookupValue(snapshot, "industry", match.industry, force);
    setSnapshotLookupValue(snapshot, "primaryIndustry", match.primaryIndustry || match.industry, force);
    setSnapshotLookupValue(snapshot, "subSector", match.subSector, force);
    setSnapshotLookupValue(snapshot, "peerGroup", match.peerGroup, force);
    setSnapshotLookupValue(snapshot, "employees", match.employees, force);
    setSnapshotLookupValue(snapshot, "priorEmployees", match.priorEmployees, force);
    setSnapshotLookupValue(snapshot, "revenue", match.revenue, force);
    setSnapshotLookupValue(snapshot, "annualRevenueUsd", match.annualRevenueUsd, force);
    setSnapshotLookupValue(snapshot, "ebitdaUsd", match.ebitdaUsd, force);
    setSnapshotLookupValue(snapshot, "totalAssetsUsd", match.totalAssetsUsd, force);
    setSnapshotLookupValue(snapshot, "netProfit", match.netProfit, force);
    setSnapshotLookupValue(snapshot, "ticker", match.ticker, force);
    setSnapshotLookupValue(snapshot, "cik", match.cik, force);
    setSnapshotLookupValue(snapshot, "companyNumber", match.companyNumber, force);
    setSnapshotLookupValue(snapshot, "website", match.website || match.domain, force);
    setSnapshotLookupValue(snapshot, "domain", match.domain || domainFromUrl(match.website), force);
    setSnapshotLookupValue(snapshot, "hqCountry", match.hqCountry, force);
    setSnapshotLookupValue(snapshot, "fiscalYear", match.fiscalYear, force);
    if ((force || identityConflict) && Array.isArray(match.sourceSnippets)) {
      snapshot.sourceSnippets = match.sourceSnippets;
    }
    if ((force || identityConflict) && Array.isArray(match.validationLinks)) {
      snapshot.validationLinks = match.validationLinks;
    }
    if (lookupValueMissing(snapshot.domain) && !lookupValueMissing(snapshot.website)) {
      snapshot.domain = domainFromUrl(snapshot.website);
    }
    if (lookupValueMissing(snapshot.revenue) && !lookupValueMissing(snapshot.annualRevenueUsd)) {
      snapshot.revenue = annualRevenueUsdDisplay(snapshot.annualRevenueUsd) || snapshot.revenue || "";
    }
    state.business.snapshot.sharePriceNotes = `Company lookup prefill: ${match.source || "local match"} (${match.confidence}% confidence). Validate against current filings.`;
    const nextIndustryKey = industryPeerKey(state.business.snapshot.peerGroup || state.business.snapshot.industry);
    const nextCompanyKey = normalizeLookupQuery(match.name || state.business.snapshot.name);
    const contextChanged = Boolean(
      (previousIndustryKey && nextIndustryKey && previousIndustryKey !== nextIndustryKey) ||
      (previousCompanyKey && nextCompanyKey && previousCompanyKey !== nextCompanyKey)
    );
    const priorityIndustryMismatch = priorityInsightsNeedSourceRefresh(state.business.priorityInsights, match);
    const researchIndustryMismatch = contentNeedsIndustryRefresh(state.business.researchFirmPriorities, match);
    const benchmarkIndustryMismatch = contentNeedsIndustryRefresh(state.business.benchmarkNotes, match);
    const researchStatus = state.business.industryResearchStatus || {};
    const researchStatusCompanyKey = normalizeLookupQuery(researchStatus.company || "");
    const researchStatusIndustryKey = industryPeerKey(researchStatus.industry || "");
    const savedProviderResearch = Boolean(
      researchStatus.status === "refreshed" &&
      usableResearchFindingRows(state.business.researchFirmPriorities).length >= 3 &&
      (!researchStatusCompanyKey || !nextCompanyKey || researchStatusCompanyKey === nextCompanyKey) &&
      (!researchStatusIndustryKey || !nextIndustryKey || researchStatusIndustryKey === nextIndustryKey)
    );
    const financialRows = match.financialRows || buildCompanyFinancialRows(match);
    if (financialRows.length && (force || contextChanged || needsFinancialLookupPrefill(state.business.financialTrends, match))) {
      state.business.financialTrends = financialRows;
    }
    if (!preserveAnnualReportAnalysis && (force || contextChanged || priorityIndustryMismatch || !hasPriorityInsights(state.business.priorityInsights))) {
      state.business.priorityInsights = priorityInsightsNeedSourceRefresh(match.priorityInsights, match)
        ? buildPriorityInsights(match)
        : match.priorityInsights;
    }
    delete state.business.transformationAgenda;
    delete state.business.agendaRefreshStatus;
    if (contextChanged || (!savedProviderResearch && (
      force ||
      researchIndustryMismatch ||
      needsResearchFirmPriorityRefresh(state.business.researchFirmPriorities, match)
    ))) {
      state.business.researchFirmPriorities = mergeResearchFirmPriorities(match.researchFirmPriorities, match);
      if (contextChanged || researchIndustryMismatch) {
        delete state.business.industryResearchSummary;
        delete state.business.industryResearchStatus;
      }
    }
    if (Array.isArray(state.business.marketShare) && state.business.marketShare[0]) {
      state.business.marketShare[0].company = match.name || state.business.marketShare[0].company;
    }
    if (Array.isArray(state.business.benchmarkNotes) && state.business.benchmarkNotes[0]) {
      state.business.benchmarkNotes[0].industry = match.industry || state.business.benchmarkNotes[0].industry;
    }
    if (force || contextChanged || benchmarkIndustryMismatch || !Array.isArray(state.business.benchmarkNotes) || !state.business.benchmarkNotes.length) {
      state.business.benchmarkNotes = benchmarkNotesForIndustry(match.peerGroup || match.industry);
    }
    state.business.aiContext = buildBusinessAiContext(state.business);
  }

  function roleLabel(role) {
    return {
      account_rep: "Account Rep",
      admin: "Admin",
      super_user: "Super User",
    }[role] || "Account Rep";
  }

  function canAdmin() {
    return state.me && ["admin", "super_user"].includes(state.me.role);
  }

  function dateLabel(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  }

  function numberValue(value) {
    if (value == null) return 0;
    const parsed = parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function analysisStageTemplate() {
    return [
      { key: "open", label: "Open workspace", status: "pending" },
      { key: "profile", label: "Company profile", status: "pending" },
      { key: "financials", label: "Financials", status: "pending" },
      { key: "research", label: "Research priorities", status: "pending" },
      { key: "benchmarks", label: "Benchmarks & narrative", status: "pending" },
      { key: "save", label: "Save context", status: "pending" },
    ];
  }

  function setRefreshStages(stages) {
    state.refreshStages = stages || [];
  }

  function updateRefreshStage(key, status, detail) {
    if (!Array.isArray(state.refreshStages) || !state.refreshStages.length) {
      state.refreshStages = analysisStageTemplate();
    }
    state.refreshStages = state.refreshStages.map((stage) =>
      stage.key === key ? { ...stage, status, detail: detail || stage.detail || "" } : stage
    );
  }

  function finishRemainingStages(status, detail) {
    state.refreshStages = (state.refreshStages || []).map((stage) =>
      stage.status === "pending" || stage.status === "running"
        ? { ...stage, status, detail: detail || stage.detail || "" }
        : stage
    );
  }

  function refreshStagesNeedAttention() {
    return (state.refreshStages || []).some((stage) =>
      ["pending", "running", "warning"].includes(stage.status || "pending")
    );
  }

  function shouldShowBusinessLoader() {
    return Boolean(state.businessProcessing) || refreshStagesNeedAttention();
  }

  function clearCompletedRefreshStages() {
    if (!state.businessProcessing && !refreshStagesNeedAttention()) {
      state.refreshStages = [];
    }
  }

  function nextFrame() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  async function api(path, options) {
    const opts = options || {};
    const { timeoutMs = 30000, ...fetchOptions } = opts;
    const headers = fetchOptions.headers || {};
    const controller = typeof AbortController !== "undefined" && timeoutMs ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    try {
      response = await fetch(path, {
        credentials: "same-origin",
        ...fetchOptions,
        signal: fetchOptions.signal || (controller ? controller.signal : undefined),
        headers: fetchOptions.body instanceof FormData ? headers : { "Content-Type": "application/json", ...headers },
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("Request timed out. The app will keep working with cached company data while the refresh continues later.");
      }
      throw error;
    } finally {
      if (timer) window.clearTimeout(timer);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  async function boot() {
    try {
      const params = new URLSearchParams(window.location.search);
      const authError = params.get("auth_error");
      if (authError) state.error = authError;
      const sharedCaseId = String(params.get("case") || "").trim();
      const sharedToken = String(params.get("share") || "").trim();
      const sharedView = ["business", "deep", "ai"].includes(params.get("view")) ? params.get("view") : "business";
      if (sharedCaseId && sharedToken) {
        state.sharedAccess = { caseId: sharedCaseId, token: sharedToken, readOnly: false };
      }
      if (params.has("auth_error") || params.has("signed_in")) {
        params.delete("auth_error");
        params.delete("signed_in");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
      }
      const me = await api("/api/me");
      state.me = me.user;
      if (state.me) {
        await loadCases();
        await Promise.all([
          loadBenchmarks(),
          loadResearchSources(),
          loadFxRates(),
        ]);
        if (sharedCaseId && sharedToken) {
          openValueCaseInStages(sharedCaseId, sharedView);
        }
      }
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  async function loadCases() {
    const data = await api("/api/value-cases");
    state.valueCases = data.valueCases || [];
    if (state.activeCaseId) {
      state.activeCase = state.valueCases.find((item) => item.id === state.activeCaseId) || state.activeCase;
    }
  }

  async function loadResearchSources() {
    try {
      const data = await api("/api/research-sources");
      state.researchSources = Array.isArray(data.researchSources) ? data.researchSources : [];
    } catch (error) {
      state.researchSources = [];
    }
  }

  async function loadBenchmarks() {
    const data = await api("/api/business-benchmarks");
    state.benchmarks = data.businessBenchmarks || [];
  }

  async function loadFxRates() {
    try {
      const data = await api("/api/fx-rates", { timeoutMs: 8000 });
      const incoming = data && data.rates && typeof data.rates === "object" ? data.rates : {};
      const rates = { ...DEFAULT_FX_RATES };
      Object.entries(incoming).forEach(([code, value]) => {
        const numeric = Number(value);
        if (/^[A-Z]{3}$/.test(code) && Number.isFinite(numeric) && numeric > 0) rates[code] = numeric;
      });
      state.fxRates = {
        base: "USD",
        date: data.date || "",
        rates,
        source: data.source || "Daily reference FX rates",
        sourceUrl: data.sourceUrl || "https://frankfurter.dev/",
        fallback: Boolean(data.fallback),
      };
    } catch (_) {
      // Keep the bundled reference rates so peer comparisons remain currency-consistent offline.
    }
  }

  function fallbackBusinessPayloadForCase(valueCase) {
    const row = valueCase || {};
    const companyName = row.company_name || row.name || "Customer";
    const industry = row.industry || row.primary_industry || row.primaryIndustry || "Retail";
    const caseProfile = {
      name: companyName,
      ticker: row.ticker || "",
      industry,
      primaryIndustry: row.primary_industry || row.primaryIndustry || industry,
      subSector: row.sub_sector || row.subSector || "",
      website: row.website || "",
      domain: row.domain || "",
      hq: row.hq || "",
      hqCountry: row.hq_country || row.hqCountry || "",
      cik: row.cik || "",
      companyNumber: row.company_number || row.companyNumber || "",
      annualRevenueUsd: row.annual_revenue_usd || row.annualRevenueUsd || "",
      ebitdaUsd: row.ebitda_usd || row.ebitdaUsd || "",
      totalAssetsUsd: row.total_assets_usd || row.totalAssetsUsd || "",
      employees: row.employees || "",
      revenue: row.revenue || "",
      netProfit: row.net_profit || row.netProfit || "",
      fiscalYear: row.fiscal_year || row.fiscalYear || "",
    };
    const localMatch = lookupMatchForValueCase(row) || localCompanyLookup(companyName).matches[0] || null;
    const profile = enrichLookupMatchFromEvidence(localMatch ? { ...caseProfile, ...localMatch } : caseProfile) || caseProfile;
    const financialRows = Array.isArray(profile.financialRows) && profile.financialRows.length
      ? profile.financialRows
      : buildCompanyFinancialRows(profile);
    return {
      snapshot: {
        description: profile.description || `${companyName} account context and strategic business profile.`,
        hq: profile.hq || "",
        hqCountry: profile.hqCountry || "",
        industry: profile.industry || industry,
        primaryIndustry: profile.primaryIndustry || profile.industry || industry,
        subSector: profile.subSector || "",
        employees: profile.employees || "",
        revenue: profile.revenue || "",
        annualRevenueUsd: profile.annualRevenueUsd || "",
        ebitdaUsd: profile.ebitdaUsd || "",
        totalAssetsUsd: profile.totalAssetsUsd || "",
        netProfit: profile.netProfit || "",
        ticker: profile.ticker || profile.cik || "",
        cik: profile.cik || "",
        companyNumber: profile.companyNumber || "",
        website: profile.website || "",
        domain: profile.domain || "",
        fiscalYear: profile.fiscalYear || "",
        sharePriceNotes: `Cached local profile shown while live refresh completes. Source: ${profile.source || "local company index"}.`,
      },
      financialTrends: financialRows,
      priorityInsights: profile.priorityInsights || buildPriorityInsights(profile),
      researchFirmPriorities: mergeResearchFirmPriorities(profile.researchFirmPriorities, profile),
      marketTriggers: [
        {
          source: "Company research refresh",
          publicationDate: "",
          whyItMatters: "Live source refresh is running or unavailable; validate against annual report, investor relations and press releases.",
          sourceLink: profile.website || profile.domain || "",
        },
      ],
      marketShare: [
        { company: companyName, share: "24" },
        { company: "Peer A", share: "18" },
        { company: "Peer B", share: "15" },
      ],
      peers: [],
      peerNarrative: "Peer benchmark refresh will update once the company profile and financials are available.",
      benchmarkNotes: [
        {
          industry: profile.industry || industry,
          financial: "Revenue growth, gross margin, operating margin and cash generation.",
          operational: "Digital conversion, fulfilment speed, availability, return rate and colleague productivity.",
          customerMarket: "Customer retention, active customers, order frequency, NPS and brand relevance.",
        },
      ],
      signalScan: [],
      csuiteQuotes: [],
      narrative: {
        observed: "Cached company profile loaded while the live source refresh completes.",
        whyItMatters: "The workspace remains usable even if a research endpoint is slow.",
        actions: "Run Refresh Analysis to pull the latest company and source-backed analysis.",
      },
    };
  }

  async function loadBusiness(caseId, options) {
    let data;
    try {
      const shareToken = state.sharedAccess.caseId === caseId ? state.sharedAccess.token : "";
      const shareQuery = shareToken ? `?share=${encodeURIComponent(shareToken)}` : "";
      data = await api(`/api/value-cases/${encodeURIComponent(caseId)}/business-priorities${shareQuery}`, {
        timeoutMs: options && options.timeoutMs ? options.timeoutMs : 12000,
      });
    } catch (error) {
      const fallbackCase = state.valueCases.find((item) => item.id === caseId) || state.activeCase || { id: caseId };
      state.activeCaseId = caseId;
      state.activeCase = fallbackCase;
      state.business = fallbackBusinessPayloadForCase(fallbackCase);
      state.business.loadWarning = error.message || "Saved analysis is still loading; showing cached company context.";
      return { fallback: true, error };
    }
    state.activeCaseId = caseId;
    state.activeCase = data.valueCase;
    state.business = data.businessPriorities.payload;
    state.sharedAccess.readOnly = Boolean(data.access && data.access.mode === "shared_read_only");
    hydratePrivateEquityAnalysis(state.business, caseId);
    const savedSnapshot = state.business && state.business.snapshot ? state.business.snapshot : {};
    const expectedCompanyKey = normalizeLookupQuery(data.valueCase.company_name || "");
    const savedNameKey = normalizeLookupQuery(savedSnapshot.name || "");
    const savedLegalKey = normalizeLookupQuery(savedSnapshot.legalName || "");
    const identityCompatible = (candidate) => !candidate || !expectedCompanyKey ||
      candidate === expectedCompanyKey || candidate.includes(expectedCompanyKey) || expectedCompanyKey.includes(candidate);
    const savedIdentityConflict = !identityCompatible(savedNameKey) || !identityCompatible(savedLegalKey);
    const savedProfile = Object.keys(savedSnapshot).length && !savedIdentityConflict
      ? {
        ...savedSnapshot,
        name: data.valueCase.company_name || savedSnapshot.name || "",
        ticker: savedSnapshot.ticker || data.valueCase.ticker || "",
        industry: savedSnapshot.industry || data.valueCase.industry || "",
        source: "saved Business Priorities profile",
        confidence: 100,
      }
      : null;
    const lookupMatch = lookupMatchForValueCase(data.valueCase);
    const match = savedProfile
      ? enrichLookupMatchFromEvidence(
        mergeLookupProfileFields(
          mergeLookupProfileFields({ ...savedProfile }, lookupMatch || {}),
          bestLocalProfileForMatch(lookupMatch || savedProfile) || {}
        )
      )
      : lookupMatch;
    const force = Boolean(options && options.force);
    const deferPrefillSave = Boolean(options && options.deferPrefillSave);
    const needsPrefill = match && (force || businessNeedsLookupPrefill(state.business, match));
    if (needsPrefill) {
      preloadBusinessCompanyInfo(match);
      if (deferPrefillSave) {
        const payloadToSave = JSON.parse(JSON.stringify(state.business));
        saveBusinessPayloadForCase(caseId, payloadToSave, { timeoutMs: 10000 }).catch(() => {
          // Opening a Value Case should not be blocked by a background cache write.
        });
      } else {
        await saveBusinessPayloadForCase(caseId, state.business);
      }
    }
  }

  async function saveBusinessPayloadForCase(caseId, payload, options) {
    await api(`/api/value-cases/${encodeURIComponent(caseId)}/business-priorities`, {
      method: "PUT",
      body: JSON.stringify({ payload }),
      timeoutMs: options && options.timeoutMs ? options.timeoutMs : 20000,
    });
  }

  async function saveBusinessPayload(payload) {
    await saveBusinessPayloadForCase(state.activeCaseId, payload);
  }

  function bestApiMatchForValueCase(data, valueCase) {
    const matches = Array.isArray(data && data.matches) ? data.matches : [];
    if (!matches.length) return null;
    const ticker = normalizeLookupQuery((valueCase && valueCase.ticker) || "");
    const companyName = normalizeLookupQuery((valueCase && valueCase.company_name) || "");
    if (ticker) {
      const tickerMatch = matches.find((match) => normalizeLookupQuery(match.ticker || match.cik || "") === ticker);
      if (tickerMatch) return tickerMatch;
    }
    if (companyName) {
      const exactName = matches.find((match) => {
        const names = [match.name, match.legalName, ...(match.aliases || [])].map(normalizeLookupQuery);
        return names.includes(companyName);
      });
      if (exactName) return exactName;
    }
    return matches[0] || null;
  }

  async function serverCompanyLookupMatchForBusiness(options) {
    const snapshot = state.business && state.business.snapshot ? state.business.snapshot : {};
    const lookupCase = state.activeCase ? { ...state.activeCase } : null;
    const query = ((lookupCase && lookupCase.company_name) || snapshot.name || "").trim();
    if (!query) return null;
    try {
      const data = await api(`/api/company-lookup?q=${encodeURIComponent(query)}`, {
        timeoutMs: options && options.timeoutMs ? options.timeoutMs : 18000,
      });
      return bestApiMatchForValueCase(data, lookupCase);
    } catch (_) {
      return null;
    }
  }

  async function refreshTransformationAgendaWithPerplexity() {
    if (!state.activeCaseId) throw new Error("Open a Value Case before refreshing the agenda.");
    let data;
    await logPromptEntry(
      "Business Transformation Agenda",
      `Perplexity/OpenAI official-source agenda prompt for ${(state.activeCase && state.activeCase.company_name) || "selected company"}`,
      transformationAgendaPromptLogText(state.business)
    ).catch(() => null);
    try {
      data = await api(`/api/value-cases/${encodeURIComponent(state.activeCaseId)}/transformation-agenda/refresh`, {
        method: "POST",
        body: JSON.stringify({ provider: "perplexity" }),
        timeoutMs: 180000,
      });
    } catch (endpointError) {
      const endpointMessage = String(endpointError && endpointError.message ? endpointError.message : endpointError || "");
      const routeMissing = /endpoint not found|request failed \(404\)/i.test(endpointMessage);
      const match = await serverCompanyLookupMatchForBusiness().catch((lookupError) => {
        if (routeMissing) return null;
        throw lookupError;
      });
      if (match && hasTransformationAgenda(match.transformationAgenda) && !transformationAgendaNeedsRefresh(match.transformationAgenda, match)) {
        state.business = state.business || {};
        state.business.transformationAgenda = normalizeTransformationAgenda(match.transformationAgenda, match);
        state.business.aiContext = buildBusinessAiContext(state.business);
        await saveBusinessPayload(state.business);
        return { ok: true, fallback: "company-lookup", transformationAgenda: state.business.transformationAgenda };
      }
      if (routeMissing) {
        const message = "Two-year annual-report-backed agenda refresh is required. No agenda has been saved because the AI research endpoint is not available in this running session.";
        state.business = state.business || {};
        delete state.business.transformationAgenda;
        state.business.agendaRefreshStatus = {
          status: "source_required",
          provider: "Perplexity/OpenAI",
          message,
          updatedAt: new Date().toISOString(),
        };
        state.business.aiContext = buildBusinessAiContext(state.business);
        await saveBusinessPayload(state.business).catch(() => null);
        return { ok: false, sourceRequired: true, message, error: endpointMessage };
      }
      throw endpointError;
    }
    if (data.businessPriorities && data.businessPriorities.payload) {
      state.business = data.businessPriorities.payload;
    } else if (data.transformationAgenda) {
      state.business = state.business || {};
      state.business.transformationAgenda = normalizeTransformationAgenda(data.transformationAgenda, currentPriorityCompany());
      state.business.aiContext = buildBusinessAiContext(state.business);
    }
    return data;
  }

  async function refreshIndustryResearchWithProviders(caseId = state.activeCaseId) {
    if (!caseId) throw new Error("Open a Value Case before refreshing industry research.");
    const data = await api(`/api/value-cases/${encodeURIComponent(caseId)}/industry-research/refresh`, {
      method: "POST",
      body: JSON.stringify({ refresh: true }),
      timeoutMs: 150000,
    });
    if (state.activeCaseId !== caseId) return { ...data, stale: true };
    if (data.businessPriorities && data.businessPriorities.payload) {
      state.business = data.businessPriorities.payload;
    } else if (Array.isArray(data.researchFirmPriorities)) {
      state.business = state.business || {};
      state.business.researchFirmPriorities = data.researchFirmPriorities;
      state.business.industryResearchSummary = data.industryResearchSummary || "";
      state.business.industryResearchStatus = {
        status: "refreshed",
        provider: data.provider || "AI research",
        lastRefreshedAt: data.updated_at || new Date().toISOString(),
      };
      state.business.aiContext = buildBusinessAiContext(state.business);
    }
    return data;
  }

  async function refreshBusinessPayload(force) {
    state.business = readBusinessForm();
    const serverMatch = force ? await serverCompanyLookupMatchForBusiness() : null;
    const match = serverMatch ||
      lookupMatchForValueCase(state.activeCase) ||
      localCompanyLookup((state.activeCase && state.activeCase.company_name) || state.business.snapshot?.name || "").matches[0] ||
      null;
    const preloaded = preloadBusinessCompanyInfo(match);
    if (preloaded && (force || businessNeedsLookupPrefill(state.business, preloaded))) {
      applyCompanyMatchToBusiness(preloaded, { force: Boolean(force), preload: true });
    } else {
      state.business.aiContext = buildBusinessAiContext(state.business);
    }
    await saveBusinessPayload(state.business);
    await loadCases();
  }

  const ANNUAL_REPORT_CLIENT_ANALYSIS_VERSION = 2;

  function storedAnnualReportDocument() {
    const snapshot = state.business && state.business.snapshot;
    return snapshot && snapshot.annualReportDocument && typeof snapshot.annualReportDocument === "object"
      ? snapshot.annualReportDocument
      : null;
  }

  async function reprocessStoredAnnualReportEvidence() {
    const document = storedAnnualReportDocument();
    if (!state.activeCaseId || !document || !document.storagePath) return null;
    const data = await api(`/api/value-cases/${encodeURIComponent(state.activeCaseId)}/annual-report/reprocess`, {
      method: "POST",
      body: "{}",
    });
    if (data.businessPriorities && data.businessPriorities.payload) {
      state.business = data.businessPriorities.payload;
      state.business.aiContext = buildBusinessAiContext(state.business);
    }
    return data;
  }

  async function runBusinessAnalysisStages(options) {
    const opts = options || {};
    if (!state.activeCase || !state.activeCaseId) return;
    const analysisCaseId = state.activeCaseId;
    const analysisStillActive = () => state.activeCaseId === analysisCaseId;
    if (!state.business) {
      state.business = fallbackBusinessPayloadForCase(state.activeCase);
    }
    setRefreshStages(analysisStageTemplate());
    updateRefreshStage("open", "done", "Workspace visible");
    render();
    await nextFrame();

    const companyName = (state.activeCase && state.activeCase.company_name) ||
      (state.business.snapshot && state.business.snapshot.name) ||
      "selected company";
    let match = null;
    try {
      updateRefreshStage("profile", "running", "Checking company lookup and AI enrichment");
      render();
      await nextFrame();
      match = opts.useServerLookup === false ? null : await serverCompanyLookupMatchForBusiness({ timeoutMs: opts.lookupTimeoutMs || 12000 });
      if (!analysisStillActive()) return;
      match = match ||
        lookupMatchForValueCase(state.activeCase) ||
        localCompanyLookup(companyName).matches[0] ||
        null;
      match = preloadBusinessCompanyInfo(match) || match;
      if (match) {
        updateRefreshStage("profile", "done", `${match.source || "Company lookup"} applied and preloaded`);
      } else {
        state.business.aiContext = buildBusinessAiContext(state.business);
        updateRefreshStage("profile", "warning", "No company lookup match; using cached workspace profile");
      }
      render();
      await nextFrame();

      updateRefreshStage("financials", "running", "Building five-year trend and peer-ready metrics");
      render();
      await nextFrame();
      if (match && (!Array.isArray(state.business.financialTrends) || isBlankFinancialRows(state.business.financialTrends))) {
        state.business.financialTrends = buildCompanyFinancialRows(match);
      }
      updateRefreshStage("financials", "done", "Revenue, margin and growth inputs prepared");
      render();
      await nextFrame();

      updateRefreshStage("research", "running", "Refreshing industry and business priorities");
      render();
      await nextFrame();
      let annualReportReprocessed = false;
      let annualReportRefreshError = "";
      const annualReportDocument = storedAnnualReportDocument();
      if (
        opts.force &&
        annualReportDocument &&
        annualReportDocument.storagePath &&
        Number(annualReportDocument.analysisVersion || 0) < ANNUAL_REPORT_CLIENT_ANALYSIS_VERSION
      ) {
        updateRefreshStage("research", "running", "Re-reading the stored annual report for driver-specific quotes and data points");
        render();
        await nextFrame();
        try {
          await reprocessStoredAnnualReportEvidence();
          annualReportReprocessed = true;
        } catch (error) {
          annualReportRefreshError = error && error.message ? error.message : "Stored annual-report reprocessing was unavailable.";
        }
      }
      const company = currentPriorityCompany();
      if (!businessHasAnnualReportEvidence(state.business) && (!hasPriorityInsights(state.business.priorityInsights) || priorityInsightsNeedSourceRefresh(state.business.priorityInsights, company))) {
        state.business.priorityInsights = buildPriorityInsights(company);
      }
      const providerResearchRequired = Boolean(
        opts.force ||
        !hasResearchFirmPriorities(state.business.researchFirmPriorities) ||
        needsResearchFirmPriorityRefresh(state.business.researchFirmPriorities, company)
      );
      let providerResearch = null;
      let providerResearchError = "";
      if (providerResearchRequired && state.activeCaseId) {
        updateRefreshStage("research", "running", "Researching current sector findings from configured industry, technology and strategy sources");
        render();
        await nextFrame();
        try {
          providerResearch = await refreshIndustryResearchWithProviders(analysisCaseId);
          if (!analysisStillActive()) return;
        } catch (error) {
          providerResearchError = error && error.message ? error.message : "Provider-backed industry research was unavailable.";
        }
      }
      if (!providerResearch && (!hasResearchFirmPriorities(state.business.researchFirmPriorities) || needsResearchFirmPriorityRefresh(state.business.researchFirmPriorities, company))) {
        state.business.researchFirmPriorities = mergeResearchFirmPriorities(match && match.researchFirmPriorities, company);
      }
      const researchRefreshError = providerResearchError || annualReportRefreshError;
      updateRefreshStage(
        "research",
        researchRefreshError ? "warning" : "done",
        providerResearch
          ? `${providerResearch.provider || "AI"} researched current industry findings and company implications`
          : researchRefreshError
            ? `Research refresh deferred: ${researchRefreshError}`
            : annualReportReprocessed
              ? "Stored annual report reprocessed into driver-specific quotes and data points"
            : businessHasAnnualReportEvidence(state.business)
              ? "Annual-report priorities retained; sourced industry findings refreshed"
              : "Industry research findings and business-priority cards updated"
      );
      render();
      await nextFrame();

      const verifiedFinancialProfile = bestLocalProfileForMatch(match);
      if (verifiedFinancialProfile && Array.isArray(verifiedFinancialProfile.financialHistory) && verifiedFinancialProfile.financialHistory.length >= 3) {
        const verifiedRows = buildCompanyFinancialRows(verifiedFinancialProfile);
        const verifiedLatest = verifiedRows[verifiedRows.length - 1] || {};
        state.business.snapshot = state.business.snapshot || {};
        state.business.snapshot.name = verifiedFinancialProfile.name || companyName;
        state.business.snapshot.legalName = verifiedFinancialProfile.legalName || verifiedFinancialProfile.name || companyName;
        state.business.snapshot.industry = verifiedFinancialProfile.industry || state.business.snapshot.industry;
        state.business.snapshot.primaryIndustry = verifiedFinancialProfile.primaryIndustry || verifiedFinancialProfile.industry || state.business.snapshot.primaryIndustry;
        state.business.snapshot.subSector = verifiedFinancialProfile.subSector || state.business.snapshot.subSector;
        state.business.snapshot.peerGroup = verifiedFinancialProfile.peerGroup || state.business.snapshot.peerGroup;
        state.business.snapshot.revenue = verifiedLatest.revenue || verifiedFinancialProfile.revenue || state.business.snapshot.revenue;
        state.business.snapshot.annualRevenueUsd = verifiedFinancialProfile.annualRevenueUsd || state.business.snapshot.annualRevenueUsd;
        state.business.snapshot.ebitdaUsd = verifiedFinancialProfile.ebitdaUsd || state.business.snapshot.ebitdaUsd;
        state.business.snapshot.totalAssetsUsd = verifiedFinancialProfile.totalAssetsUsd || state.business.snapshot.totalAssetsUsd;
        state.business.snapshot.employees = verifiedFinancialProfile.employees || state.business.snapshot.employees;
        state.business.snapshot.priorEmployees = verifiedFinancialProfile.priorEmployees || state.business.snapshot.priorEmployees;
        state.business.snapshot.netProfit = verifiedFinancialProfile.netProfit || state.business.snapshot.netProfit;
        state.business.snapshot.fiscalYear = verifiedLatest.year || verifiedFinancialProfile.fiscalYear || state.business.snapshot.fiscalYear;
        state.business.financialTrends = verifiedRows;
      }

      updateRefreshStage("benchmarks", "running", "Rebuilding benchmark context and executive narrative");
      render();
      await nextFrame();
      if (!Array.isArray(state.business.benchmarkNotes) || !state.business.benchmarkNotes.length) {
        state.business.benchmarkNotes = benchmarkNotesForIndustry(currentPriorityCompany().peerGroup || currentPriorityCompany().industry);
      }
      state.business.aiContext = buildBusinessAiContext(state.business);
      updateRefreshStage("benchmarks", "done", "Benchmark context and narrative inputs updated");
      render();
      await nextFrame();

      if (opts.save !== false) {
        updateRefreshStage("save", "running", "Saving refreshed context to the local database");
        render();
        await nextFrame();
        await saveBusinessPayloadForCase(analysisCaseId, JSON.parse(JSON.stringify(state.business))).catch((error) => {
          updateRefreshStage("save", "warning", error.message || "Save deferred");
        });
        const saveStage = (state.refreshStages || []).find((stage) => stage.key === "save");
        if (!saveStage || saveStage.status !== "warning") {
          updateRefreshStage("save", "done", "Saved");
        }
      } else {
        updateRefreshStage("save", "skipped", "Save skipped for this background pass");
      }
      render();
      await nextFrame();
      if (opts.refreshCases !== false) {
        loadCases().catch(() => null);
      }
      setMessage(opts.message || "Business Priorities analysis refreshed in stages.");
      clearCompletedRefreshStages();
    } catch (error) {
      finishRemainingStages("warning", error.message || "Stage deferred");
      setMessage("The page is usable. One refresh stage was deferred and can be retried.");
    } finally {
      state.businessProcessing = "";
      clearCompletedRefreshStages();
      render();
    }
  }

  function openValueCaseInStages(caseId, targetView = "business") {
    const isSharedLink = state.sharedAccess.caseId === caseId && Boolean(state.sharedAccess.token);
    if (!isSharedLink) state.sharedAccess.readOnly = false;
    const valueCase = state.valueCases.find((item) => item.id === caseId) || state.activeCase || { id: caseId };
    state.activeCaseId = caseId;
    state.activeCase = valueCase;
    state.business = fallbackBusinessPayloadForCase(valueCase);
    state.privateEquityPeerData = {};
    state.privateEquityStatus = "";
    state.privateEquityLoadedFor = "";
    state.view = targetView;
    state.businessProcessing = "";
    setMessage("Opening saved value case in stages.");
    setRefreshStages(analysisStageTemplate());
    updateRefreshStage("open", "done", "Cached workspace loaded");
    updateRefreshStage("profile", "running", "Loading saved analysis without blocking the page");
    render();
    loadBusiness(caseId, { deferPrefillSave: true, timeoutMs: 5000 })
      .then((result) => {
        if (state.activeCaseId !== caseId) return;
        updateRefreshStage("profile", result && result.fallback ? "warning" : "done", result && result.fallback ? "Using cached profile; saved analysis is slow" : "Saved analysis loaded");
        render();
      })
      .catch((error) => {
        if (state.activeCaseId !== caseId) return;
        updateRefreshStage("profile", "warning", error.message || "Saved analysis deferred");
        render();
      })
      .finally(() => {
        if (state.activeCaseId !== caseId) return;
        if (isSharedLink) {
          clearCompletedRefreshStages();
          setMessage(state.sharedAccess.readOnly ? "Shared Value Case opened in read-only mode." : "The shared Value Case could not be opened.");
          render();
          return;
        }
        runBusinessAnalysisStages({
          force: false,
          save: true,
          lookupTimeoutMs: 9000,
          message: "Value case opened and analysis modules refreshed in stages.",
        });
      });
  }

  function queueOfficialAgendaRefresh() {
    const caseId = state.activeCaseId;
    if (!caseId || state.agendaRefreshQueued[caseId]) return;
    state.agendaRefreshQueued[caseId] = true;
    window.setTimeout(async () => {
      if (state.activeCaseId !== caseId || !state.business) return;
      try {
        const agendaRefresh = await refreshTransformationAgendaWithPerplexity();
        await loadCases();
        if (state.activeCaseId === caseId) {
          if (!(agendaRefresh && agendaRefresh.sourceRequired)) {
            setMessage("AI research refreshed the agenda from annual reports, investor packs, press releases and named vendor or partner sources.");
          }
        }
      } catch (error) {
        console.warn("Background official-source agenda refresh failed", error);
      } finally {
        if (state.activeCaseId === caseId) render();
      }
    }, 0);
  }

  async function downloadBusinessReport() {
    const response = await fetch(`/api/value-cases/${encodeURIComponent(state.activeCaseId)}/business-priorities/report`, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Report generation failed.");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = (disposition.match(/filename="([^"]+)"/) || [])[1] || "business-priorities-report.html";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadCLevelDeck(caseId, format) {
    const response = await fetch(`/api/value-cases/${encodeURIComponent(caseId)}/c-level-deck.${encodeURIComponent(format)}`, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "C-level narrative deck generation failed.");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = (disposition.match(/filename="([^"]+)"/) || [])[1] || `c-level-narrative-deck.${format}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function uploadAnnualReport(file) {
    if (!state.activeCaseId || !file) return;
    const formData = new FormData();
    formData.append("annual_report", file);
    formData.append("company_name", (state.activeCase && state.activeCase.company_name) || "");
    formData.append("industry", (state.activeCase && state.activeCase.industry) || "");
    state.businessProcessing = `Analysing annual report: ${file.name}`;
    render();
    let response;
    try {
      response = await fetch(`/api/value-cases/${encodeURIComponent(state.activeCaseId)}/annual-report/upload`, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
    } catch (error) {
      throw new Error("Annual report upload is not reachable. Restart the Python server so the new upload API is active, then try again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Annual report upload is not active on the running Python server yet. Restart the server, then try the upload again.");
      }
      throw new Error(data.error || "Annual report upload failed.");
    }
    if (data.businessPriorities && data.businessPriorities.payload) {
      state.business = data.businessPriorities.payload;
      state.business.aiContext = buildBusinessAiContext(state.business);
      await saveBusinessPayload(JSON.parse(JSON.stringify(state.business))).catch(() => null);
    }
    await loadCases().catch(() => null);
    const count = Array.isArray(data.annualReportAnalysis && data.annualReportAnalysis.sourceSnippets)
      ? data.annualReportAnalysis.sourceSnippets.length
      : 0;
    state.businessProcessing = "Refreshing all analysis sections from the uploaded annual report...";
    setMessage(`Annual report analysed for ${deepAnalysisTitle()}${count ? ` (${count} evidence snippets)` : ""}. Refreshing page sections now.`);
    render();
    await runBusinessAnalysisStages({
      force: false,
      save: true,
      lookupTimeoutMs: 9000,
      message: `Annual report analysed and all analysis sections refreshed${count ? ` from ${count} evidence snippets` : ""}.`,
    });
  }

  async function loadAdmin() {
    state.admin = await api("/api/admin/config");
  }

  async function loadAdminUsage() {
    state.adminUsage = await api("/api/admin/usage");
  }

  function setMessage(message) {
    state.message = message || "";
    state.error = "";
  }

  function setError(error) {
    state.error = error ? error.message || String(error) : "";
    state.message = "";
  }

  function render() {
    app.classList.remove("boot");
    if (!state.me) {
      app.innerHTML = renderLogin();
      return;
    }

    const activeCase = state.activeCase;
    app.innerHTML = `
      <div class="app-frame">
        <header class="app-header">
          <div class="brand-lockup" aria-label="Inflexcvi">
            <span class="wordmark">inflexcvi</span>
            <span class="divider"></span>
            <span class="module-name">Strategic Narrative Builder 2.0</span>
            <button type="button" class="quick-admin-btn" data-action="open-quick-admin">Admin</button>
          </div>
          <nav class="primary-nav" aria-label="Application sections">
            ${navButton("cases", "Value Cases")}
            ${navButton("business", "Business Priorities", !state.activeCaseId)}
            ${navButton("deep", deepAnalysisNavLabel(), !state.activeCaseId)}
            ${navButton("financial", "Financial Analysis", !state.activeCaseId)}
            ${navButton("ai", "AI Business Value", !state.activeCaseId)}
            ${navButton("ceo", "CEO Narrative Builder", !state.activeCaseId)}
          </nav>
          <div class="account-shell">
            <button class="account-trigger" type="button" aria-haspopup="menu" aria-label="Account menu">
              <span>
                <strong>${escapeHtml(roleLabel(state.me.role))}</strong>
                <em>${escapeHtml(state.me.email)}</em>
              </span>
              <span class="profile-dot" aria-hidden="true"></span>
            </button>
            <div class="account-menu" role="menu">
              ${canAdmin() ? `<button type="button" data-action="account-admin">Admin</button>` : ""}
              <button type="button" data-action="logout">Sign out</button>
            </div>
          </div>
        </header>
        <main id="main" class="app-main">
          ${renderAlerts()}
          ${renderContent()}
        </main>
        ${renderQuickAdminModal()}
      </div>
    `;
    mountGraphAnimations();
  }

  function pageTitle() {
    if (state.view === "business") return "Business Priorities";
    if (state.view === "deep") return deepAnalysisTitle();
    if (state.view === "financial") return "Financial Analysis";
    if (state.view === "ai") return "AI Business Value Assessment";
    if (state.view === "ceo") return "CEO Narrative Builder";
    if (state.view === "admin") return "Admin";
    return "My Value Cases";
  }

  function activeCompanyDisplayName() {
    return (state.activeCase && state.activeCase.company_name) ||
      (state.business && state.business.snapshot && state.business.snapshot.name) ||
      "Company";
  }

  function deepAnalysisTitle() {
    return `${activeCompanyDisplayName()} Deep Analysis`;
  }

  function deepAnalysisNavLabel() {
    const name = activeCompanyDisplayName();
    const compact = name.length > 22 ? `${name.slice(0, 21).trim()}...` : name;
    return `${compact} Deep Analysis`;
  }

  function navButton(view, label, disabled) {
    return `
      <button class="nav-link ${state.view === view ? "is-active" : ""}"
        data-action="nav" data-view="${view}" ${disabled ? "disabled" : ""}>
        ${escapeHtml(label)}
      </button>
    `;
  }

  function renderAlerts() {
    return `
      ${state.message ? `<div class="notice">${escapeHtml(state.message)}</div>` : ""}
      ${state.error ? `<div class="notice error">${escapeHtml(state.error)}</div>` : ""}
    `;
  }

  function renderLogin() {
    const magicLink = state.magicLink || {};
    return `
      <div class="login-screen">
        <section class="login-intro">
          <div class="brand-lockup">
            <span class="wordmark">inflexcvi</span>
            <span class="divider"></span>
            <span class="module-name">Strategic Narrative Builder 2.0</span>
          </div>
          <div>
            <h1>Strategic Narrative Builder 2.0</h1>
            <p>Build source-cited value cases, configure trusted research sources, and shape a business-priority narrative for each customer account.</p>
          </div>
          <div class="case-meta">Standalone single-tenant build</div>
        </section>
        <section class="login-panel">
          <h2>${magicLink.requested ? "Check your email" : "Sign in"}</h2>
          <p class="muted">${magicLink.requested
            ? `A one-time sign-in link was prepared for ${escapeHtml(magicLink.email)} and expires in ${escapeHtml(magicLink.expiresInMinutes || 15)} minutes.`
            : "Enter your work email to receive a secure, one-time sign-in link."}</p>
          ${renderAlerts()}
          ${magicLink.requested ? `
            <div class="magic-link-confirmation" role="status">
              <div class="block-label">${escapeHtml(magicLink.deliveryMode || "Magic link")}</div>
              <strong>Use the link once to open your workspace.</strong>
              ${magicLink.previewUrl ? `
                <a class="btn accent" href="${attr(magicLink.previewUrl)}">Open local sign-in link</a>
                <small>Local preview is shown only on this machine. Hosted environments send the link by email.</small>
              ` : `<small>You can close this page after opening the link from your inbox.</small>`}
              ${magicLink.deliveryNote ? `<small>${escapeHtml(magicLink.deliveryNote)}</small>` : ""}
              <button class="btn secondary compact" type="button" data-action="magic-link-reset">Use another email</button>
            </div>
          ` : `
            <form id="login-form" class="grid-1">
              <label class="field">
                <span>Email</span>
                <input name="email" type="email" autocomplete="email" placeholder="name@company.com" required>
              </label>
              <div class="button-row">
                <button class="btn accent" type="submit" ${magicLink.sending ? "disabled" : ""}>
                  ${magicLink.sending ? `<span class="button-loader" aria-hidden="true"></span> Sending...` : "Email me a sign-in link"}
                </button>
              </div>
            </form>
          `}
        </section>
      </div>
    `;
  }

  function renderContent() {
    if (state.view === "admin") return renderAdmin();
    if (state.view === "ceo") return renderCeoNarrativeBuilder();
    if (state.view === "ai") return renderAiBusinessValueAssessment();
    if (state.view === "financial") return renderFinancialAnalysis();
    if (state.view === "deep") return renderDeepAnalysis();
    if (state.view === "business") return renderBusiness();
    return renderCases();
  }

  function shouldShowCompanySuggestions() {
    return state.companyLookup.loading || state.companyLookup.matches.length > 0 || state.companyLookup.noMatch;
  }

  function renderValidationLinks(links) {
    const items = (links || []).filter((link) => link && link.url);
    if (!items.length) return "";
    return `
      <div class="lookup-links" aria-label="Validation links">
        ${items
          .map(
            (link) => `
              <a href="${attr(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || "Validate")}</a>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderLookupSnippets(snippets) {
    const items = Array.isArray(snippets) ? snippets.filter((item) => item && item.snippet).slice(0, 2) : [];
    if (!items.length) return "";
    return `
      <div class="lookup-snippets" aria-label="Lookup source snippets">
        ${items
          .map(
            (item) => `
              <span class="lookup-snippet">
                <b>${escapeHtml(item.source || item.label || "Source")}</b>
                ${escapeHtml(item.snippet)}
              </span>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderLookupSources(sources) {
    const items = Array.isArray(sources) ? sources.filter((item) => item && item.source).slice(0, 8) : [];
    if (!items.length) return "";
    return `
      <div class="lookup-sources" aria-label="Lookup sources checked">
        ${items.map((item) => `
          <span class="lookup-source ${item.enabled ? "enabled" : "disabled"}">
            ${escapeHtml(item.source)}${item.web_fallback ? " + web" : ""}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderCompanyLookupStatusContent() {
    const lookup = state.companyLookup;
    const links = lookup.selected ? lookup.selected.validationLinks : lookup.validationLinks;
    const snippets = lookup.selected ? lookup.selected.sourceSnippets : lookup.sourceSnippets;
    return `
      <span>${escapeHtml(lookup.status)}</span>
      ${renderLookupSources(lookup.sourcesChecked)}
      ${renderLookupSnippets(snippets)}
      ${renderValidationLinks(links)}
    `;
  }

  function renderCompanySuggestions() {
    const lookup = state.companyLookup;
    if (lookup.loading) {
      return `
        <div class="company-suggestion-header">
          <strong>Looking up company matches</strong>
          <span class="status-pill">Checking</span>
        </div>
      `;
    }
    if (lookup.noMatch) {
      return `
        <div class="company-suggestion-header">
          <strong>No ${lookup.scope === "global" ? "global " : ""}company match</strong>
          <button class="btn ghost compact" type="button" data-action="dismiss-company-validation">Dismiss</button>
        </div>
        <div class="company-suggestion-footer stacked">
          <span>Use typed company only after validating the public search links below.</span>
          <button class="btn secondary compact" type="button" data-action="use-typed-company">Use typed company</button>
        </div>
      `;
    }
    if (!lookup.matches.length) return "";
    return `
      <div class="company-suggestion-header">
        <strong>${lookup.scope === "global" ? "Global company matches" : "Company matches"}</strong>
        <button class="btn ghost compact" type="button" data-action="dismiss-company-validation">Dismiss</button>
      </div>
      <div class="suggestion-list">
        ${lookup.matches
          .map(
            (match) => `
              <button class="company-match" type="button" data-action="select-company-match" data-company-id="${attr(match.id)}">
                <span>
                  <strong>${escapeHtml(match.name)}</strong>
                  <small>${escapeHtml([
                    match.ticker || match.cik || match.companyNumber,
                    match.primaryIndustry || match.industry,
                    match.hqCountry,
                    match.domain || match.website,
                    match.revenue && !isValidationPlaceholder(match.revenue) ? match.revenue : "",
                    match.annualRevenueUsd ? `USD ${match.annualRevenueUsd}` : "",
                  ].filter(Boolean).join(" / "))}</small>
                  <em>${escapeHtml(match.matchReason || "Potential match")}</em>
                  ${renderLookupSnippets(match.sourceSnippets)}
                </span>
                <span class="match-score">${escapeHtml(match.confidence)}%</span>
              </button>
            `
          )
          .join("")}
      </div>
      <div class="company-suggestion-footer">
        <button class="btn secondary compact" type="button" data-action="use-typed-company">Use typed company</button>
        <span>Validate values before client use.</span>
      </div>
    `;
  }

  function renderCases() {
    const selectedCompany = selectedCompanyStillCurrent(state.companyLookup.query)
      ? enrichLookupMatchFromEvidence(state.companyLookup.selected)
      : null;
    const processing = Boolean(state.caseProcessing);
    const disabled = processing ? "disabled" : "";
    const suggestionsOpen = shouldShowCompanySuggestions();
    return `
      ${pageHeading(
        "Value Creation / Strategic Narrative / Value Cases",
        "Value Cases",
        "Create one persistent account-planning workspace per customer opportunity.",
        ""
      )}
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>New Value Case</h2>
            <p class="muted">Start with customer identity and industry context. Research integrations can enrich the record later.</p>
          </div>
        </div>
        <form id="new-case-form" class="new-case-form">
          ${processing ? `
            <div class="processing-strip" role="status" aria-live="polite">
              <span class="loader-dot" aria-hidden="true"></span>
              <span>Building company-specific financial, peer, research and narrative analysis...</span>
            </div>
          ` : ""}
          <div class="new-case-grid">
            <div class="field company-field">
              <label for="newCaseCompanyName">Company Name</label>
              <div class="company-input-row">
                <input data-input="companyName" id="newCaseCompanyName" name="company_name" placeholder="Search companies globally" autocomplete="off" aria-controls="companyNameSuggestions" aria-expanded="${suggestionsOpen ? "true" : "false"}" value="${attr(state.companyLookup.query || "")}" required ${disabled}>
                <button class="btn secondary" type="button" data-action="lookup-company" ${disabled}>Lookup</button>
              </div>
              <div id="companyNameSuggestions" class="company-suggestions value-case-suggestions" ${suggestionsOpen ? "" : "hidden"}>
                ${renderCompanySuggestions()}
              </div>
              <div id="companyLookupStatus" class="lookup-status ${attr(state.companyLookup.level)}">
                ${renderCompanyLookupStatusContent()}
              </div>
              <span class="field-message" data-field-error="company_name"></span>
            </div>
            <label class="field">
              <span>Stock ticker / CIK</span>
              <input name="ticker" placeholder="Optional" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "ticker", "cik", "companyNumber") : "")}" ${disabled}>
              <span class="field-message" data-field-error="ticker"></span>
            </label>
            <label class="field">
              <span>Primary industry</span>
              <input name="industry" placeholder="e.g. Financial services" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "primaryIndustry", "industry") : "")}" ${disabled}>
              <span class="field-message" data-field-error="industry"></span>
            </label>
            <div class="field">
              <span>&nbsp;</span>
              <button class="btn accent" type="submit" ${disabled}>
                ${processing ? `<span class="button-loader" aria-hidden="true"></span> Building...` : "Create Value Case"}
              </button>
            </div>
          </div>
          <div class="company-profile-fields">
            <label class="field">
              <span>Website / domain</span>
              <input name="website" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "website", "domain") : "")}" ${disabled}>
            </label>
            <label class="field">
              <span>HQ country</span>
              <input name="hq_country" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "hqCountry") : "")}" ${disabled}>
            </label>
            <label class="field">
              <span>Sub-sector</span>
              <input name="sub_sector" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "subSector", "industry") : "")}" ${disabled}>
            </label>
            <label class="field">
              <span>CIK / company number</span>
              <input name="cik" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "cik", "companyNumber") : "")}" ${disabled}>
            </label>
            <label class="field">
              <span>Latest annual revenue</span>
              <input name="revenue" value="${attr(companyRevenueDisplay(selectedCompany))}" ${disabled}>
            </label>
            <label class="field">
              <span>Annual revenue, USD</span>
              <input name="annual_revenue_usd" inputmode="decimal" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "annualRevenueUsd") : "")}" ${disabled}>
            </label>
            <label class="field">
              <span>EBITDA, USD</span>
              <input name="ebitda_usd" inputmode="decimal" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "ebitdaUsd") : "")}" ${disabled}>
            </label>
            <label class="field">
              <span>Total assets, USD</span>
              <input name="total_assets_usd" inputmode="decimal" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "totalAssetsUsd") : "")}" ${disabled}>
            </label>
            <label class="field">
              <span>Employees</span>
              <input name="employees" inputmode="numeric" value="${attr(selectedCompany ? lookupFieldValue(selectedCompany, "employees") : "")}" ${disabled}>
            </label>
          </div>
        </form>
      </section>
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Saved Workspaces</h2>
            <p class="muted">${state.me.role === "super_user" ? "Showing all user-owned value cases." : "Showing value cases owned by your email."}</p>
          </div>
        </div>
        <div class="case-list">
          ${state.valueCases.length ? state.valueCases.map(renderCaseRow).join("") : `<div class="empty">No value cases yet.</div>`}
        </div>
      </section>
    `;
  }

  function renderCaseRow(item) {
    const active = item.id === state.activeCaseId ? "active" : "";
    const sharing = state.shareBusyCaseId === item.id;
    const copied = state.shareCopiedCaseId === item.id;
    return `
      <div class="case-row ${active}">
        <div>
          <div class="case-title">${escapeHtml(item.company_name)}</div>
          <div class="case-meta">${escapeHtml(item.owner_email || "")}</div>
        </div>
        <div>
          <div class="case-meta">Industry</div>
          <div>${escapeHtml(item.industry || "Pending")}</div>
        </div>
        <div>
          <div class="case-meta">Updated</div>
          <div>${escapeHtml(dateLabel(item.updated_at))}</div>
        </div>
        <div class="case-row-actions">
          <button class="btn secondary" data-action="open-case" data-id="${attr(item.id)}">Open</button>
          <button class="btn secondary" data-action="share-case" data-id="${attr(item.id)}" ${sharing ? "disabled" : ""}>${sharing ? "Creating..." : copied ? "Copied" : "Share"}</button>
          <button class="btn secondary" data-action="download-c-level-pdf" data-id="${attr(item.id)}">PDF Deck</button>
          ${state.me.role === "super_user" ? `<button class="btn accent" data-action="download-c-level-pptx" data-id="${attr(item.id)}">PowerPoint</button>` : ""}
        </div>
      </div>
    `;
  }

  async function copyShareLink(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(value),
          new Promise((_, reject) => window.setTimeout(() => reject(new Error("Clipboard timeout")), 700)),
        ]);
        return;
      } catch (_error) {
        // Fall through to the synchronous copy path when clipboard permission is unavailable.
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("The share link could not be copied. Try again from a secure browser window.");
  }

  async function shareValueCase(caseId) {
    state.shareBusyCaseId = caseId;
    state.shareCopiedCaseId = "";
    render();
    try {
      const data = await api(`/api/value-cases/${encodeURIComponent(caseId)}/share`, {
        method: "POST",
        body: "{}",
      });
      await copyShareLink(data.shareUrl);
      state.shareCopiedCaseId = caseId;
      const valueCase = state.valueCases.find((item) => item.id === caseId);
      setMessage(`Share link copied for ${(valueCase && valueCase.company_name) || "this Value Case"}. Recipients must sign in; access is read-only.`);
      window.setTimeout(() => {
        if (state.shareCopiedCaseId !== caseId) return;
        state.shareCopiedCaseId = "";
        render();
      }, 2500);
    } finally {
      state.shareBusyCaseId = "";
      render();
    }
  }

  function renderChangeDigest(business) {
    const digest = business && business.changeDigest;
    const changes = (digest && digest.changes) || [];
    if (!changes.length) return "";
    const tagFor = { financial: "up", profile: "up", priority: "new", signal: "watch" };
    const asOf = digest.generatedAt ? String(digest.generatedAt).slice(0, 10) : "";
    return `
      <div class="change-digest">
        <div class="change-digest-head">Changes since last refresh${asOf ? ` &middot; ${escapeHtml(asOf)}` : ""}</div>
        <ul>
          ${changes.map(function (c) {
            const tag = tagFor[c.type] || "new";
            return `<li>
              <span class="chg chg-${tag}">${escapeHtml(c.label || "Updated")}</span>
              <span class="chg-detail">${escapeHtml(c.detail || "")}</span>
            </li>`;
          }).join("")}
        </ul>
      </div>
    `;
  }

  function renderBusiness() {
    if (!state.activeCaseId || !state.business) {
      if (state.businessProcessing) {
        return `
          ${pageHeading(
            "Value Creation / Strategic Narrative / Business Priorities",
            "Business Priorities",
            "Fast-loading company context, financial performance, peer pressure, research priorities, and strategic narrative.",
            activeCaseActions()
          )}
          ${renderBusinessLoader(state.businessProcessing)}
        `;
      }
      return `<section class="section"><div class="empty">Open a Value Case to start Business Priorities.</div></section>`;
    }
    const business = state.business;
    delete business.transformationAgenda;
    delete business.agendaRefreshStatus;
    return `
      ${pageHeading(
        "Value Creation / Strategic Narrative / Business Priorities",
        "Business Priorities",
        "Fast-loading company context, financial performance, peer pressure, research priorities, and strategic narrative.",
        activeCaseActions()
      )}
      <form id="business-form" data-business-form>
        ${shouldShowBusinessLoader() ? renderBusinessLoader(state.businessProcessing) : ""}
        ${renderChangeDigest(business)}
        ${renderBusinessOverviewCards(business)}
        ${renderStrategicBusinessNarrative(business)}
        ${renderResearchFirmPriorities(business.researchFirmPriorities || buildResearchFirmPriorities(currentPriorityCompany()))}
        ${renderFinancialTrend(business)}
      </form>
    `;
  }

  function renderDeepAnalysis() {
    if (!state.activeCaseId || !state.business) {
      if (state.businessProcessing) {
        return `
          ${pageHeading(
            "Value Creation / Strategic Narrative / Deep Analysis",
            deepAnalysisTitle(),
            "Annual-report-backed research workspace for source quotes, business priorities, and technology opportunity evidence.",
            activeCaseActions({ includeAnnualReport: true })
          )}
          ${renderBusinessLoader(state.businessProcessing)}
        `;
      }
      return `<section class="section"><div class="empty">Open a Value Case to start Deep Analysis.</div></section>`;
    }
    const business = state.business;
    const priorityCompany = currentPriorityCompany();
    if (!businessHasAnnualReportEvidence(business) && priorityInsightsNeedSourceRefresh(business.priorityInsights, priorityCompany)) {
      business.priorityInsights = buildPriorityInsights(priorityCompany);
      business.aiContext = buildBusinessAiContext(business);
    }
    return `
      ${pageHeading(
        "Value Creation / Strategic Narrative / Deep Analysis",
        deepAnalysisTitle(),
        "Annual-report-backed analysis with source quotes and technology-opportunity evidence for this company.",
        activeCaseActions({ includeAnnualReport: true })
      )}
      <form id="business-form" data-business-form>
        ${shouldShowBusinessLoader() ? renderBusinessLoader(state.businessProcessing) : ""}
        ${renderDeepAnalysisPrioritySignals(business)}
        ${renderPriorityOverlapVenn(business)}
        ${renderDeepAnalysisEtsEntryPoints(business)}
        ${renderRevenueByDivisionSection(business)}
        ${renderPriorityInsights(business)}
      </form>
    `;
  }

  function renderFinancialAnalysis() {
    if (!state.activeCaseId || !state.business) {
      if (state.businessProcessing) {
        return `
          ${pageHeading(
            "Value Creation / Strategic Narrative / Financial Analysis",
            "Financial Analysis",
            "Private-equity style peer economics, productivity, capital efficiency and diligence gaps.",
            activeCaseActions()
          )}
          ${renderBusinessLoader(state.businessProcessing)}
        `;
      }
      return `<section class="section"><div class="empty">Open a Value Case to start Financial Analysis.</div></section>`;
    }
    const business = state.business;
    const peRows = privateEquityMetricRows(business);
    const peProfitLabel = privateEquityProfitLabel();
    return `
      ${pageHeading(
        "Value Creation / Strategic Narrative / Financial Analysis",
        "Financial Analysis",
        "Private-equity style peer economics, productivity, capital efficiency and diligence gaps.",
        activeCaseActions()
      )}
      <form id="business-form" data-business-form>
        ${shouldShowBusinessLoader() ? renderBusinessLoader(state.businessProcessing) : ""}
        ${peRows.length >= 2 ? renderPrivateEquityExecutiveSummary(peRows, peProfitLabel) : ""}
        ${renderPeerFinancialChart(business)}
        ${renderPrivateEquityAnalysis(business)}
      </form>
    `;
  }

  function ceoNarrativeBuilderData(business) {
    const existing = business && business.ceoNarrativeBuilder && typeof business.ceoNarrativeBuilder === "object"
      ? business.ceoNarrativeBuilder
      : null;
    if (existing && Array.isArray(existing.slides) && existing.slides.length) return existing;
    return buildDefaultCeoNarrative(business);
  }

  function priorityTitles(items, limit = 3) {
    return (items || [])
      .map((item) => item && (item.title || item.theme || item.priority || item.label || item.name))
      .filter(Boolean)
      .slice(0, limit);
  }

  function buildDefaultCeoNarrative(business) {
    const company = currentPriorityCompany();
    const snapshot = (business && business.snapshot) || {};
    const companyName = activeCompanyDisplayName();
    const industry = snapshot.primaryIndustry || snapshot.industry || (state.activeCase && state.activeCase.industry) || "the industry";
    const researchThemes = priorityTitles((business && business.researchFirmPriorities) || buildResearchFirmPriorities(company), 4);
    const annualPriorities = priorityTitles((business && business.priorityInsights) || [], 4);
    const peRows = privateEquityMetricRows(business || {});
    const customer = peRows.find((row) => row.isCustomer) || {};
    const peers = peRows.filter((row) => !row.isCustomer);
    const revenueMedian = privateEquityMedian(peers, "revenuePerEmployee");
    const marginMedian = privateEquityMedian(peers, "ebitdaMargin");
    const growthMedian = privateEquityMedian(peers, "revenueGrowth");
    const profitLabel = privateEquityProfitLabel();
    const aiCases = aiScoredUseCases(business || {}).slice(0, 5);
    const aiTop = aiCases.map((item) => item.name).filter(Boolean).slice(0, 3);
    const financialEvidence = [
      privateEquityLabelledGap("Revenue / employee", customer.revenuePerEmployee, revenueMedian, formatUsdPerEmployee),
      privateEquityLabelledGap(`${profitLabel} margin`, customer.ebitdaMargin, marginMedian, formatPercentValue),
      privateEquityLabelledGap("Revenue growth", customer.revenueGrowth, growthMedian, formatPercentValue),
    ].filter(Boolean).join(" | ");
    const narrative = `${companyName} should treat the CEO conversation as a performance and reinvention story: the market is moving around ${industry}, external research is pointing to ${researchThemes.join(", ") || "customer, cost and digital pressure"}, and the annual-report agenda points to ${annualPriorities.join(", ") || "growth, efficiency and resilience priorities"}. The commercial argument is to focus technology investment on the financial metrics that matter most to the CEO and CFO: revenue productivity, scalable growth, margin quality, cash conversion and risk resilience. The recommended path is to use AI, data, automation and platform simplification to create measurable value, then turn the strongest use cases into an execution roadmap with clear sponsorship.`;
    return {
      status: "draft",
      narrative,
      agenda: [
        "Industry view",
        "Company view",
        "Financial peer benchmark",
        "Financial interpretation into technology choices",
        "Strategic recommendations",
        "AI business case",
        "AI roadmap",
      ],
      slides: [
        {
          title: `${industry} pressure is forcing sharper choices on where technology creates value`,
          narrative: `Use industry research to show what is changing in the market, what competitors are responding to, and why the CEO agenda should focus on the few technology moves that change growth, cost and resilience.`,
          visual: "Industry research spider graph and topic frequency bars",
          evidence: researchThemes.join(" | ") || "Industry research priorities require refresh.",
        },
        {
          title: `${companyName}'s annual-report priorities point to a focused transformation agenda`,
          narrative: `Use annual-report priorities, leadership commentary and source-backed business priorities to show what management has already committed to and where technology can accelerate delivery.`,
          visual: "Annual-report priority cards and source-backed evidence",
          evidence: annualPriorities.join(" | ") || "Annual report analysis required.",
        },
        {
          title: `Peer economics show where ${companyName} needs stronger operating leverage`,
          narrative: `Use peer revenue, margin and growth comparisons to frame the performance gap in CEO/CFO language and identify where technology needs to improve productivity and value creation.`,
          visual: "Peer Revenue | Operating Margin | Growth chart and PE peer comparison bars",
          evidence: financialEvidence || "Peer financial metrics require refresh.",
        },
        {
          title: `The financial gaps translate into technology choices, not isolated IT projects`,
          narrative: `Interpret the financial diagnostics through revenue, cost and risk levers. Link each lever to concrete AI, automation, data, cloud or resilience moves that can shift measurable business outcomes.`,
          visual: "Evidence-weighted technology priority spider graph",
          evidence: "Use revenue productivity, margin, cash conversion, ROA and leverage gaps from Financial Analysis.",
        },
        {
          title: `The strongest recommendation is to sequence AI around value, feasibility and sponsorship`,
          narrative: `Prioritise the use cases where executive sponsorship, measurable EBITDA contribution and delivery feasibility intersect. Use the roadmap to make the CEO decision practical rather than conceptual.`,
          visual: "AI opportunity bubble chart and prioritised use-case portfolio",
          evidence: aiTop.join(" | ") || "AI use-case portfolio requires refresh.",
        },
        {
          title: `The AI business case should be measured as EBITDA uplift and protected value`,
          narrative: `Use the AI business case waterfall to show directional value from cost, revenue and risk initiatives. Make clear which benefits are near-term, which need validation, and which require data/platform foundations.`,
          visual: "Potential Value to Customer waterfall",
          evidence: "AI EBITDA waterfall and value tree from AI Business Value Assessment.",
        },
        {
          title: `A phased roadmap creates early value while building the platform for scale`,
          narrative: `Close with a CEO-level roadmap: quick wins first, scaled use cases second, and operating-model reinforcement third. Anchor the ask in decisions, sponsorship and data needed to move forward.`,
          visual: "AI roadmap by phase and executive decision path",
          evidence: "AI roadmap and ETS sales entry points from Deep Analysis.",
        },
      ],
    };
  }

  function renderCeoNarrativeBuilder() {
    if (!state.activeCaseId || !state.business) {
      if (state.businessProcessing) {
        return `
          ${pageHeading(
            "Value Creation / Strategic Narrative / CEO Narrative Builder",
            "CEO Narrative Builder",
            "Create a 7-slide CEO deck narrative before generating detailed slide content.",
            activeCaseActions()
          )}
          ${renderBusinessLoader(state.businessProcessing)}
        `;
      }
      return `<section class="section"><div class="empty">Open a Value Case to start the CEO Narrative Builder.</div></section>`;
    }
    const business = state.business;
    business.ceoNarrativeBuilder = ceoNarrativeBuilderData(business);
    const builder = business.ceoNarrativeBuilder;
    return `
      ${pageHeading(
        "Value Creation / Strategic Narrative / CEO Narrative Builder",
        "CEO Narrative Builder",
        "Build the CEO narrative first, edit the agenda and slide headings, then generate the 7-slide deck content.",
        activeCaseActions()
      )}
      <section class="section ceo-builder-section">
        <div class="section-heading">
          <div>
            <h2>Narrative and Agenda</h2>
            <p class="muted">Stage 1 creates the storyline. Edit the narrative and action titles before generating slide content.</p>
          </div>
          <div class="button-row">
            <button class="btn secondary" type="button" data-action="ceo-reset-narrative">Rebuild Narrative</button>
            <button class="btn secondary" type="button" data-action="ceo-save-narrative">Save Narrative</button>
            <button class="btn accent" type="button" data-action="ceo-generate-content">Generate Deck Content</button>
          </div>
        </div>
        <div class="ceo-narrative-layout">
          <label class="field ceo-main-narrative">
            <span>CEO narrative</span>
            <textarea data-ceo-field="narrative" rows="8">${escapeHtml(builder.narrative || "")}</textarea>
          </label>
          <div class="ceo-agenda-card">
            <span class="block-label">7-slide agenda</span>
            ${(builder.agenda || []).map((item, index) => `
              <label>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <input data-ceo-agenda-index="${index}" value="${attr(item)}">
              </label>
            `).join("")}
          </div>
        </div>
      </section>
      <section class="section ceo-builder-section">
        <div class="section-heading">
          <div>
            <h2>Editable Slide Storyboard</h2>
            <p class="muted">Action titles should read as conclusions. The content generation step uses these titles and the current analysis on each tab.</p>
          </div>
          <span class="status-pill">${escapeHtml(builder.status === "content_generated" ? "Content generated" : "Narrative draft")}</span>
        </div>
        <div class="ceo-slide-editor-grid">
          ${(builder.slides || []).map((slide, index) => renderCeoSlideEditor(slide, index, builder.status === "content_generated")).join("")}
        </div>
      </section>
    `;
  }

  function renderCeoSlideEditor(slide, index, hasContent) {
    return `
      <article class="ceo-slide-card">
        <div class="ceo-slide-number">${index + 1}</div>
        <label class="field">
          <span>Action title</span>
          <input data-ceo-slide-index="${index}" data-ceo-slide-field="title" value="${attr(slide.title || "")}">
        </label>
        <label class="field">
          <span>Narrative</span>
          <textarea rows="4" data-ceo-slide-index="${index}" data-ceo-slide-field="narrative">${escapeHtml(slide.narrative || "")}</textarea>
        </label>
        <label class="field">
          <span>Suggested visual</span>
          <input data-ceo-slide-index="${index}" data-ceo-slide-field="visual" value="${attr(slide.visual || "")}">
        </label>
        <label class="field">
          <span>Evidence / graph source</span>
          <textarea rows="3" data-ceo-slide-index="${index}" data-ceo-slide-field="evidence">${escapeHtml(slide.evidence || "")}</textarea>
        </label>
        ${hasContent ? `
          <div class="ceo-generated-content">
            <strong>Generated slide content</strong>
            <p>${escapeHtml(slide.content || "Generate deck content to populate this slide.")}</p>
          </div>
        ` : ""}
      </article>
    `;
  }

  function readCeoNarrativeBuilderFromDom() {
    const current = ceoNarrativeBuilderData(state.business || {});
    const next = JSON.parse(JSON.stringify(current));
    const narrativeInput = document.querySelector("[data-ceo-field='narrative']");
    if (narrativeInput) next.narrative = narrativeInput.value;
    next.agenda = [...document.querySelectorAll("[data-ceo-agenda-index]")]
      .sort((a, b) => Number(a.dataset.ceoAgendaIndex) - Number(b.dataset.ceoAgendaIndex))
      .map((input) => input.value.trim());
    [...document.querySelectorAll("[data-ceo-slide-index][data-ceo-slide-field]")].forEach((input) => {
      const index = Number(input.dataset.ceoSlideIndex);
      const field = input.dataset.ceoSlideField;
      if (!next.slides[index]) next.slides[index] = {};
      next.slides[index][field] = input.value;
    });
    return next;
  }

  function ceoSlideGeneratedContent(slide, index, business) {
    const companyName = activeCompanyDisplayName();
    const aiCases = aiScoredUseCases(business || {}).slice(0, 5).map((item) => item.name).filter(Boolean);
    const peRows = privateEquityMetricRows(business || {});
    const customer = peRows.find((row) => row.isCustomer) || {};
    const peers = peRows.filter((row) => !row.isCustomer);
    const profitLabel = privateEquityProfitLabel();
    const metricLine = [
      privateEquityLabelledGap("Revenue / employee", customer.revenuePerEmployee, privateEquityMedian(peers, "revenuePerEmployee"), formatUsdPerEmployee),
      privateEquityLabelledGap(`${profitLabel} margin`, customer.ebitdaMargin, privateEquityMedian(peers, "ebitdaMargin"), formatPercentValue),
      privateEquityLabelledGap("Revenue growth", customer.revenueGrowth, privateEquityMedian(peers, "revenueGrowth"), formatPercentValue),
    ].filter(Boolean).join(" | ");
    const templates = [
      "Open with the external market pressure and make the CEO question explicit: where should the company place technology bets to improve growth, margin and resilience?",
      "Translate annual-report priorities into an execution agenda, using leadership commitments and source-backed priorities as the anchor.",
      `Use peer metrics to identify where ${companyName} has economic advantage or gaps. ${metricLine || "Refresh peer metrics to quantify the gap."}`,
      "Convert financial gaps into technology choices: AI for revenue productivity, automation for cost-to-serve, and resilience controls for protected EBITDA.",
      `Recommend the highest-sponsorship AI moves first: ${aiCases.slice(0, 3).join(", ") || "refresh AI business case to prioritise use cases"}.`,
      "Frame the AI business case as value at stake, showing cost, revenue and risk contribution through the waterfall and validation assumptions.",
      "Close with a phased decision path: confirm executive sponsors, validate data, run a focused workshop, launch pilots, then scale the funded roadmap.",
    ];
    return templates[index] || slide.narrative || "";
  }

  async function saveCeoNarrativeBuilder(builder, message = "CEO narrative saved.") {
    if (!state.business) return;
    state.business.ceoNarrativeBuilder = builder;
    state.business.aiContext = buildBusinessAiContext(state.business);
    await saveBusinessPayload(JSON.parse(JSON.stringify(state.business)));
    setMessage(message);
    render();
  }


  const AI_METRICS = {
    revenuePerEmployee: { label: "Revenue / Employee", short: "Revenue productivity", higher: true },
    ebitdaPerEmployee: { label: "EBITDA / Employee", short: "Profit productivity", higher: true },
    ebitdaMargin: { label: "EBITDA Margin", short: "EBITDA margin", higher: true },
    revenueGrowth: { label: "Revenue Growth", short: "Revenue growth", higher: true },
    productivitySpread: { label: "Growth - Headcount", short: "Scalability spread", higher: true },
    roa: { label: "Return on Assets", short: "ROA", higher: true },
    fcfConversion: { label: "FCF / EBITDA", short: "Cash conversion", higher: true },
    leverage: { label: "Net Debt / EBITDA", short: "Leverage", higher: false },
  };

  const AI_DOMAINS = [
    "Operational AI",
    "Asset & Quality AI",
    "Commercial AI",
    "Customer & Service AI",
    "Finance & Risk AI",
    "Data & Governance",
  ];

  function aiUseCase(cluster, name, description, impact, metrics, domains, difficulty, time, dependencies, branch, range, terms = []) {
    return { cluster, name, description, impact, metrics, domains, difficulty, time, dependencies, branch, range, terms };
  }

  function aiIndustryUseCaseCatalogue(industryKey) {
    const governance = aiUseCase(
      "Data, platform and governance",
      "AI control plane and reusable data products",
      "Create governed data products, model controls, evaluation, observability and reusable AI services so pilots can scale without multiplying risk.",
      "Faster deployment, lower duplicated engineering cost and stronger model-risk control.",
      ["productivitySpread", "fcfConversion", "leverage"], ["Data & Governance", "Finance & Risk AI"], "Medium", "Medium",
      "Data ownership, model inventory, security architecture, responsible-AI policy and product funding.", "Risk", [0.03, 0.10],
      ["data", "governance", "platform", "risk", "ai"]
    );
    const fpna = aiUseCase(
      "Finance, risk and planning",
      "AI-augmented FP&A and value realisation",
      "Combine driver-based forecasting, scenario simulation and benefit tracking to challenge plans faster and keep AI value in the operating forecast.",
      "Better forecast accuracy, working-capital decisions and CFO visibility of realised value.",
      ["fcfConversion", "roa", "leverage"], ["Finance & Risk AI", "Data & Governance"], "Low", "Short",
      "Clean planning hierarchies, financial-driver model, controllership approval and benefit owners.", "Cost", [0.04, 0.12],
      ["finance", "forecast", "capital", "cash", "productivity"]
    );
    const catalogues = {
      pharmaceuticals: [
        aiUseCase("R&D and portfolio", "AI target discovery and portfolio decisioning", "Use multimodal scientific data and external evidence to rank targets, compounds and indications and stop low-probability work earlier.", "Higher R&D throughput, earlier attrition of weak assets and improved risk-adjusted pipeline value.", ["revenueGrowth", "roa", "fcfConversion"], ["Commercial AI", "Data & Governance"], "High", "Long", "FAIR scientific data, validated models, human scientific review, IP controls and portfolio governance.", "Revenue", [0.10, 0.35], ["pipeline", "research", "development", "portfolio", "innovation"]),
        aiUseCase("Clinical development", "AI trial design, site and patient matching", "Predict recruitment, site performance and protocol burden to improve trial feasibility and reduce avoidable amendments and delay.", "Faster enrolment, lower cost per patient and earlier launch economics.", ["revenueGrowth", "fcfConversion", "roa"], ["Operational AI", "Data & Governance"], "Medium", "Medium", "Clinical data interoperability, privacy, protocol metadata, investigator workflows and GxP validation.", "Revenue", [0.08, 0.25], ["clinical", "trial", "patient", "launch", "development"]),
        aiUseCase("Manufacturing and supply", "Predictive yield, deviation and asset intelligence", "Detect process drift, equipment degradation and likely deviations across manufacturing and packaging before batches or capacity are lost.", "Higher yield and OEE, fewer deviations, lower write-offs and more reliable supply.", ["ebitdaMargin", "ebitdaPerEmployee", "roa", "fcfConversion"], ["Asset & Quality AI", "Operational AI"], "Medium", "Short", "Historian and MES data, asset taxonomy, quality labels, validated edge deployment and engineering adoption.", "Cost", [0.12, 0.32], ["manufacturing", "supply", "quality", "capacity", "asset"]),
        aiUseCase("Quality and regulatory", "AI-assisted quality review and batch release", "Prioritise exceptions, assemble evidence and support controlled review across quality events, documentation and batch records.", "Shorter release cycle, lower review effort and stronger inspection readiness.", ["ebitdaPerEmployee", "productivitySpread", "fcfConversion"], ["Operational AI", "Finance & Risk AI"], "Medium", "Short", "Validated document corpus, electronic batch records, audit trail, human approval and regulated-model controls.", "Cost", [0.08, 0.22], ["quality", "regulatory", "batch", "compliance", "release"]),
        aiUseCase("Commercial growth", "HCP next-best-action and launch orchestration", "Use consented engagement, patient-pathway and market signals to sequence evidence-led HCP interactions and launch activity.", "Higher launch uptake, improved field productivity and more relevant scientific engagement.", ["revenueGrowth", "revenuePerEmployee", "ebitdaMargin"], ["Commercial AI", "Customer & Service AI"], "Medium", "Short", "Consent and channel data, CRM integration, medical/legal review and transparent recommendation rules.", "Revenue", [0.10, 0.30], ["launch", "commercial", "customer", "market", "growth"]),
        aiUseCase("Safety and risk", "Pharmacovigilance signal detection and case automation", "Use NLP and anomaly detection to triage safety cases, identify emerging signals and accelerate controlled evidence review.", "Lower case-processing cost, faster signal escalation and reduced compliance exposure.", ["ebitdaPerEmployee", "productivitySpread", "fcfConversion"], ["Finance & Risk AI", "Operational AI"], "Medium", "Short", "Safety data integration, validated case workflows, explainability, medical oversight and regulator-ready audit.", "Risk", [0.04, 0.14], ["safety", "risk", "regulatory", "patient", "pharmacovigilance"]),
      ],
      "european-airlines": [
        aiUseCase("Network and operations", "AI network, fleet and crew recovery", "Optimise schedules, aircraft rotations and crew recovery under disruption using live operational constraints.", "Higher completion factor and utilisation with lower disruption and compensation cost.", ["ebitdaMargin", "revenuePerEmployee", "fcfConversion"], ["Operational AI"], "High", "Medium", "Operations-control data, optimisation engine, union and safety rules, human dispatch approval.", "Cost", [0.12, 0.35], ["network", "fleet", "crew", "operations", "disruption"]),
        aiUseCase("Asset reliability", "Predictive aircraft maintenance and parts positioning", "Predict component risk and maintenance demand to plan work and parts before operational failure.", "Lower technical delays, fewer AOG events and better maintenance-capital productivity.", ["roa", "fcfConversion", "ebitdaMargin"], ["Asset & Quality AI", "Operational AI"], "High", "Medium", "Aircraft health data, engineering records, OEM interfaces and approved maintenance procedures.", "Risk", [0.06, 0.20], ["maintenance", "aircraft", "reliability", "fleet", "safety"]),
        aiUseCase("Commercial growth", "Continuous pricing and ancillary decision engine", "Optimise fare, bundle and ancillary offers by route, demand, remaining capacity and customer context.", "Higher yield, ancillary revenue and contribution per seat.", ["revenueGrowth", "revenuePerEmployee", "ebitdaMargin"], ["Commercial AI", "Customer & Service AI"], "Medium", "Short", "Revenue-management integration, experimentation controls, consent and pricing governance.", "Revenue", [0.12, 0.38], ["pricing", "revenue", "customer", "route", "demand"]),
        aiUseCase("Customer operations", "Disruption self-service and proactive recovery", "Predict affected customers and automate rebooking, communication and compensation options across channels.", "Lower contact cost, faster recovery and improved retention after disruption.", ["revenuePerEmployee", "productivitySpread", "ebitdaMargin"], ["Customer & Service AI", "Operational AI"], "Low", "Short", "Passenger journey data, reservation APIs, service policy and multilingual controls.", "Cost", [0.06, 0.18], ["customer", "service", "digital", "disruption", "automation"]),
      ],
      "online-retail": [],
      retail: [],
      insurance: [],
      "financial-services": [],
      telecommunications: [],
      energy: [],
      "it-services": [],
    };
    const retailCases = [
      aiUseCase("Merchandising and supply", "AI demand, assortment and inventory orchestration", "Forecast demand at SKU-location level and optimise assortment, allocation and replenishment against margin and availability.", "Higher availability and sell-through with lower markdown and working capital.", ["ebitdaMargin", "fcfConversion", "roa"], ["Operational AI", "Commercial AI"], "Medium", "Short", "Product-location history, promotions, supplier lead times and planner workflow integration.", "Cost", [0.12, 0.35], ["inventory", "supply", "availability", "margin", "customer"]),
      aiUseCase("Commercial growth", "Personalised search, offers and next-best-product", "Rank products and offers using intent, customer value, stock and profitability rather than clicks alone.", "Higher conversion, basket size, retention and gross-margin return on marketing.", ["revenueGrowth", "revenuePerEmployee", "ebitdaMargin"], ["Commercial AI", "Customer & Service AI"], "Low", "Short", "Consented customer data, catalogue quality, experimentation and margin-aware ranking controls.", "Revenue", [0.12, 0.40], ["customer", "digital", "sales", "growth", "loyalty"]),
      aiUseCase("Operations", "Returns, fraud and fulfilment decisioning", "Predict returns, abuse and fulfilment exceptions and choose the lowest-cost service intervention.", "Lower loss, reverse-logistics cost and avoidable service effort.", ["ebitdaMargin", "ebitdaPerEmployee", "fcfConversion"], ["Finance & Risk AI", "Operational AI"], "Medium", "Short", "Order, payment, returns and logistics events with fairness and customer-treatment controls.", "Risk", [0.05, 0.18], ["returns", "fraud", "delivery", "cost", "risk"]),
      aiUseCase("Customer service", "GenAI service and colleague copilot", "Resolve routine contacts and equip agents with grounded policy, order and product answers.", "Lower cost per contact, faster resolution and improved colleague productivity.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Customer & Service AI", "Operational AI"], "Low", "Short", "Knowledge quality, order APIs, escalation design, evaluation and workforce change.", "Cost", [0.08, 0.24], ["customer", "service", "productivity", "digital", "automation"]),
    ];
    const financialCases = [
      aiUseCase("Customer and growth", "Relationship next-best-action engine", "Use customer needs, behaviour and product economics to recommend the next helpful action across digital and colleague channels.", "Higher primary relationships, conversion and product-per-customer with controlled treatment.", ["revenueGrowth", "revenuePerEmployee", "ebitdaMargin"], ["Commercial AI", "Customer & Service AI"], "Medium", "Short", "Customer data, consent, product eligibility, conduct controls and channel integration.", "Revenue", [0.10, 0.32], ["customer", "growth", "digital", "relationship", "income"]),
      aiUseCase("Risk and compliance", "Real-time fraud and financial-crime intelligence", "Combine entity, network and behavioural signals to prioritise suspicious activity and reduce false positives.", "Lower losses and investigation cost with stronger control effectiveness.", ["ebitdaPerEmployee", "productivitySpread", "fcfConversion"], ["Finance & Risk AI", "Data & Governance"], "High", "Medium", "Entity resolution, transaction data, explainability, investigator workflow and model-risk governance.", "Risk", [0.06, 0.20], ["fraud", "crime", "risk", "regulatory", "control"]),
      aiUseCase("Operations", "AI servicing and operations copilot", "Automate routine servicing, document interpretation and operations work while keeping accountable human decisions.", "Lower cost-to-serve, faster turnaround and improved capacity for growth.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Operational AI", "Customer & Service AI"], "Low", "Short", "Grounded knowledge, workflow APIs, quality evaluation, identity controls and role redesign.", "Cost", [0.12, 0.35], ["service", "cost", "productivity", "automation", "digital"]),
      aiUseCase("Credit and capital", "AI credit, early-warning and capital allocation", "Improve affordability, monitoring and portfolio actions using explainable forward-looking signals.", "Better risk-adjusted growth, lower impairment volatility and more productive capital.", ["roa", "revenueGrowth", "leverage"], ["Finance & Risk AI", "Commercial AI"], "High", "Medium", "Credit history, macro scenarios, fairness, explainability, validation and policy approval.", "Risk", [0.05, 0.18], ["credit", "capital", "risk", "impairment", "growth"]),
    ];
    const insuranceCases = [
      aiUseCase("Claims", "Claims triage, severity and straight-through decisioning", "Predict complexity, fraud and next action at first notice while automating low-risk claims with human oversight.", "Lower indemnity leakage and handling cost with faster settlement.", ["ebitdaMargin", "ebitdaPerEmployee", "fcfConversion"], ["Operational AI", "Finance & Risk AI"], "Medium", "Short", "Claims history, document and image controls, explainability and customer-treatment governance.", "Cost", [0.12, 0.36], ["claims", "cost", "customer", "risk", "automation"]),
      aiUseCase("Underwriting and pricing", "AI underwriting and risk selection", "Combine internal and external signals to improve risk differentiation, appetite execution and quote speed.", "Better loss ratio, conversion and profitable premium growth.", ["revenueGrowth", "ebitdaMargin", "roa"], ["Commercial AI", "Finance & Risk AI"], "High", "Medium", "Feature governance, fairness, actuarial validation, pricing controls and regulator-ready explanation.", "Revenue", [0.10, 0.30], ["underwriting", "pricing", "risk", "growth", "customer"]),
      aiUseCase("Distribution and service", "Adviser and customer next-best-action", "Identify protection gaps, renewal risk and service needs across adviser and direct journeys.", "Higher retention, cross-sell and adviser productivity.", ["revenueGrowth", "revenuePerEmployee", "productivitySpread"], ["Commercial AI", "Customer & Service AI"], "Medium", "Short", "Policy and interaction data, consent, suitability controls and channel integration.", "Revenue", [0.08, 0.25], ["customer", "adviser", "retention", "digital", "growth"]),
      aiUseCase("Operations", "Policy and servicing GenAI copilot", "Ground service responses and operational decisions in policy, product and customer context.", "Lower handling time, fewer errors and faster colleague onboarding.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Customer & Service AI", "Operational AI"], "Low", "Short", "Curated policy corpus, customer APIs, evaluation, access controls and role redesign.", "Cost", [0.08, 0.24], ["service", "policy", "customer", "productivity", "automation"]),
    ];
    const telecomCases = [
      aiUseCase("Network operations", "Autonomous network assurance and energy optimisation", "Predict congestion and failure, recommend remediation and optimise network energy within service constraints.", "Lower opex and energy cost with better availability and customer experience.", ["ebitdaMargin", "roa", "fcfConversion"], ["Asset & Quality AI", "Operational AI"], "High", "Medium", "Network telemetry, topology, closed-loop guardrails, field workflow and operational acceptance.", "Cost", [0.12, 0.38], ["network", "service", "energy", "cost", "resilience"]),
      aiUseCase("Customer growth", "Churn, next-best-plan and household value engine", "Predict churn and recommend offers based on needs, network experience and lifetime value.", "Lower churn, higher ARPU and more efficient retention spend.", ["revenueGrowth", "revenuePerEmployee", "ebitdaMargin"], ["Commercial AI", "Customer & Service AI"], "Medium", "Short", "Customer and network experience data, consent, offer decisioning and experimentation.", "Revenue", [0.10, 0.32], ["customer", "churn", "growth", "service", "digital"]),
      aiUseCase("Field operations", "AI field dispatch and predictive maintenance", "Predict work, cluster tasks and optimise engineer, parts and appointment allocation.", "Higher first-time fix, lower truck rolls and improved asset uptime.", ["revenuePerEmployee", "ebitdaPerEmployee", "roa"], ["Operational AI", "Asset & Quality AI"], "Medium", "Short", "Asset inventory, work orders, skills, route data and workforce change.", "Cost", [0.08, 0.24], ["field", "asset", "maintenance", "service", "productivity"]),
      aiUseCase("Service", "GenAI care and colleague copilot", "Resolve routine service and give agents grounded customer, product and diagnostic guidance.", "Lower contact cost and repeat calls with faster resolution.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Customer & Service AI", "Operational AI"], "Low", "Short", "Knowledge, customer and diagnostic APIs, identity, evaluation and workforce design.", "Cost", [0.08, 0.22], ["customer", "service", "digital", "automation", "cost"]),
    ];
    const energyCases = [
      aiUseCase("Asset operations", "Predictive asset health and maintenance", "Predict degradation, failure and optimal intervention across critical production, grid or generation assets.", "Higher availability, lower maintenance cost and deferred replacement capital.", ["roa", "fcfConversion", "ebitdaMargin"], ["Asset & Quality AI", "Operational AI"], "High", "Medium", "Historian, condition, inspection and work-order data with engineering and safety validation.", "Cost", [0.10, 0.32], ["asset", "maintenance", "reliability", "production", "safety"]),
      aiUseCase("Operations", "AI production, dispatch and energy optimisation", "Optimise operating set-points, dispatch, storage and constraints against price, reliability and carbon objectives.", "Higher throughput and gross margin with lower energy intensity.", ["ebitdaMargin", "roa", "fcfConversion"], ["Operational AI", "Asset & Quality AI"], "High", "Medium", "Real-time telemetry, digital model, market data, operator guardrails and control-system integration.", "Revenue", [0.10, 0.30], ["production", "energy", "operations", "margin", "carbon"]),
      aiUseCase("Commercial and trading", "Demand, price and portfolio intelligence", "Forecast demand, generation, price and imbalance to improve hedging, trading and customer propositions.", "Improved gross margin, lower imbalance cost and better capital deployment.", ["revenueGrowth", "ebitdaMargin", "fcfConversion"], ["Commercial AI", "Finance & Risk AI"], "High", "Medium", "Market data, risk limits, model validation, trader oversight and scenario governance.", "Revenue", [0.06, 0.22], ["market", "price", "demand", "trading", "customer"]),
      aiUseCase("Safety and resilience", "AI safety, inspection and environmental risk", "Prioritise inspection and detect visual, process and environmental anomalies before incidents escalate.", "Reduced safety and environmental exposure with more productive inspection.", ["roa", "leverage", "fcfConversion"], ["Finance & Risk AI", "Asset & Quality AI"], "High", "Medium", "Inspection and sensor data, safety case, human verification and regulator-ready audit.", "Risk", [0.04, 0.14], ["safety", "risk", "environment", "inspection", "resilience"]),
    ];
    const servicesCases = [
      aiUseCase("Delivery productivity", "AI delivery engineering and operations copilot", "Automate knowledge retrieval, incident analysis, code and runbook work across managed services with controlled reuse.", "Higher delivery gross margin, faster resolution and scalable revenue per employee.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Operational AI", "Customer & Service AI"], "Low", "Short", "Curated delivery knowledge, client segregation, evaluation, secure tooling and workforce adoption.", "Cost", [0.14, 0.42], ["service", "productivity", "automation", "client", "delivery"]),
      aiUseCase("Commercial growth", "AI account intelligence and solution shaping", "Detect client change signals, map whitespace and accelerate evidence-led solution and proposal development.", "Higher win rate, larger qualified pipeline and lower sales effort per opportunity.", ["revenueGrowth", "revenuePerEmployee", "ebitdaMargin"], ["Commercial AI", "Data & Governance"], "Low", "Short", "CRM quality, account research, solution assets, approval workflows and human commercial judgement.", "Revenue", [0.08, 0.25], ["client", "growth", "sales", "solution", "market"]),
      aiUseCase("Service operations", "AIOps event, incident and change intelligence", "Correlate telemetry and service context to predict incidents, accelerate diagnosis and automate safe remediation.", "Lower delivery cost, MTTR and SLA exposure with improved availability.", ["ebitdaMargin", "ebitdaPerEmployee", "fcfConversion"], ["Operational AI", "Asset & Quality AI"], "Medium", "Short", "Observability, service topology, runbooks, change records and remediation guardrails.", "Cost", [0.10, 0.30], ["operations", "incident", "service", "automation", "resilience"]),
      aiUseCase("Workforce", "Skills, staffing and utilisation intelligence", "Match demand, skills, location and learning to staffing and redeployment decisions across the portfolio.", "Higher utilisation, lower subcontractor leakage and better delivery capacity.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Operational AI", "Finance & Risk AI"], "Medium", "Short", "Skills ontology, demand forecast, HR controls, workforce transparency and change leadership.", "Cost", [0.08, 0.24], ["skills", "workforce", "utilisation", "delivery", "productivity"]),
    ];
    catalogues["online-retail"] = retailCases;
    catalogues.retail = retailCases;
    catalogues["uk-retail"] = retailCases;
    catalogues["financial-services"] = financialCases;
    catalogues.insurance = insuranceCases;
    catalogues.telecommunications = telecomCases;
    catalogues.energy = energyCases;
    catalogues["it-services"] = servicesCases;
    catalogues.technology = servicesCases;
    const generic = [
      aiUseCase("Operational excellence", "AI workflow and decision automation", "Redesign high-volume work around AI-assisted decisions, straight-through processing and accountable human exceptions.", "Lower unit cost, faster cycle time and scalable operating leverage.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Operational AI", "Data & Governance"], "Low", "Short", "Process baseline, trusted knowledge, workflow integration, controls and role redesign.", "Cost", [0.10, 0.30], ["cost", "productivity", "automation", "service"]),
      aiUseCase("Commercial growth", "AI demand, pricing and next-best-action", "Use demand and customer signals to improve pricing, conversion, retention and offer relevance.", "Higher revenue per customer and profitable growth.", ["revenueGrowth", "revenuePerEmployee", "ebitdaMargin"], ["Commercial AI", "Customer & Service AI"], "Medium", "Short", "Customer and transaction data, experimentation, consent and commercial governance.", "Revenue", [0.08, 0.28], ["growth", "customer", "market", "pricing"]),
      aiUseCase("Asset and quality", "Predictive reliability and quality intelligence", "Predict asset, service or quality failure and prioritise interventions before value is lost.", "Lower downtime, failure cost and capital intensity.", ["roa", "fcfConversion", "ebitdaMargin"], ["Asset & Quality AI", "Operational AI"], "High", "Medium", "Asset and quality history, labels, domain validation and operating workflow integration.", "Risk", [0.05, 0.18], ["asset", "quality", "reliability", "risk"]),
      aiUseCase("Customer service", "GenAI self-service and colleague copilot", "Resolve routine demand and give colleagues grounded context and recommended actions.", "Lower service cost and faster, more consistent customer outcomes.", ["revenuePerEmployee", "ebitdaPerEmployee", "productivitySpread"], ["Customer & Service AI", "Operational AI"], "Low", "Short", "Knowledge, identity, workflow APIs, evaluation and escalation design.", "Cost", [0.06, 0.20], ["customer", "service", "digital", "automation"]),
    ];
    return [...(catalogues[industryKey] && catalogues[industryKey].length ? catalogues[industryKey] : generic), fpna, governance];
  }

  function aiPeerDiagnosticRows(business) {
    const rows = privateEquityMetricRows(business);
    const customer = rows.find((row) => row.isCustomer) || rows[0] || {};
    const peers = rows.filter((row) => !row.isCustomer);
    return Object.entries(AI_METRICS).map(([key, definition]) => {
      const current = customer[key];
      const peerMedian = privateEquityMedian(peers, key);
      let relative = null;
      let position = "Evidence gap";
      if (Number.isFinite(current) && Number.isFinite(peerMedian)) {
        const denominator = Math.max(Math.abs(peerMedian), 0.01);
        relative = ((current - peerMedian) / denominator) * 100 * (definition.higher ? 1 : -1);
        position = relative > 8 ? "Ahead" : relative < -8 ? "Behind" : "In line";
      }
      return { key, ...definition, current, peerMedian, relative, position };
    });
  }

  function aiMetricDisplay(key, value) {
    if (!Number.isFinite(value)) return "n/a";
    if (key === "revenuePerEmployee" || key === "ebitdaPerEmployee") return formatUsdPerEmployee(value);
    if (key === "leverage") return `${Math.round(value * 10) / 10}x`;
    return formatPercentValue(value);
  }

  function aiEvidenceCorpus(business) {
    return flattenText({
      priorityInsights: business.priorityInsights || {},
      research: business.researchFirmPriorities || [],
      narrative: business.narrative || {},
      aiContext: business.aiContext || {},
      annualReport: outsideInEvidenceSnippets(business).map((item) => item.snippet || item.summary || item.title || ""),
    }).toLowerCase();
  }

  function aiScoredUseCases(business) {
    const company = currentPriorityCompany();
    const companyName = activeCompanyDisplayName();
    const industryKey = industryPeerKey(company.peerGroup || company.subSector || company.industry || company.primaryIndustry);
    const diagnostics = aiPeerDiagnosticRows(business);
    const gapKeys = new Set(diagnostics.filter((row) => row.position === "Behind").map((row) => row.key));
    const evidence = aiEvidenceCorpus(business);
    const evidenceSnippets = outsideInEvidenceSnippets(business);
    const timeScore = { Short: 1, Medium: 2, Long: 3 };
    const difficultyScore = { Low: 1, Medium: 2, High: 3 };
    return aiIndustryUseCaseCatalogue(industryKey).map((item, index) => {
      const evidenceHits = (item.terms || []).filter((term) => evidence.includes(String(term).toLowerCase())).length;
      const gapHits = item.metrics.filter((metric) => gapKeys.has(metric)).length;
      const strategicFit = Math.min(96, 48 + evidenceHits * 7 + gapHits * 9);
      const valuePotential = Math.min(96, 50 + gapHits * 11 + Math.round(((item.range[0] + item.range[1]) / 2) * 45));
      const feasibility = { Low: 86, Medium: 66, High: 45 }[item.difficulty] || 60;
      const differentiation = Math.min(92, 48 + evidenceHits * 5 + (item.branch === "Revenue" ? 10 : 4));
      const priority = Math.round(valuePotential * 0.35 + strategicFit * 0.35 + feasibility * 0.2 + differentiation * 0.1);
      const phase = item.time === "Short" && item.difficulty !== "High" ? 1 : item.time === "Long" || item.difficulty === "High" ? 3 : 2;
      const positionRank = { Behind: 0, "In line": 1, Ahead: 2, "Evidence gap": 3 };
      const linkedDiagnostics = item.metrics
        .map((key) => diagnostics.find((row) => row.key === key))
        .filter(Boolean)
        .sort((left, right) => positionRank[left.position] - positionRank[right.position]);
      const primaryDiagnostic = linkedDiagnostics[0] || diagnostics[0];
      const terms = (item.terms || []).map((term) => String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const evidencePattern = new RegExp(terms.length ? terms.join("|") : "growth|margin|productiv|customer|risk|digital|data|ai|operation", "i");
      const evidenceItem = outsideInBestEvidence(evidenceSnippets, evidencePattern, index % Math.max(evidenceSnippets.length, 1));
      const evidenceLine = evidenceItem
        ? cleanEvidenceFragment(outsideInEvidenceText(evidenceItem), 300)
        : `Validate this hypothesis against ${companyName}'s latest annual report, investor materials and operating baseline.`;
      const metricPosition = primaryDiagnostic
        ? `${primaryDiagnostic.label} is ${aiMetricDisplay(primaryDiagnostic.key, primaryDiagnostic.current)} versus ${aiMetricDisplay(primaryDiagnostic.key, primaryDiagnostic.peerMedian)} peer median (${primaryDiagnostic.position.toLowerCase()}).`
        : "Peer metric validation is required.";
      const companyUseCase = `At ${companyName}, ${item.description.charAt(0).toLowerCase()}${item.description.slice(1)} ${metricPosition}`;
      const ebitdaLever = `${item.branch}: ${item.name}`;
      return {
        ...item,
        index,
        industryKey,
        evidenceHits,
        gapHits,
        strategicFit,
        valuePotential,
        feasibility,
        differentiation,
        priority,
        phase,
        primaryMetricKey: primaryDiagnostic?.key || item.metrics[0],
        primaryMetricLabel: primaryDiagnostic?.label || AI_METRICS[item.metrics[0]]?.label || item.metrics[0],
        metricPosition,
        companyUseCase,
        industryUseCase: item.description,
        evidenceLine,
        evidenceItem,
        ebitdaLever,
        leverId: `ai-ebitda-${String(item.branch || "value").toLowerCase()}-${index + 1}`,
        x: timeScore[item.time] || 2,
        y: difficultyScore[item.difficulty] || 2,
        metricLabels: item.metrics.map((metric) => AI_METRICS[metric]?.short || metric),
      };
    }).sort((left, right) => right.priority - left.priority);
  }

  function aiAssessmentInputs(business) {
    const companyProfile = currentPriorityCompany();
    const company = activeCompanyDisplayName();
    const industry = companyProfile.primaryIndustry || companyProfile.industry || companyProfile.subSector || state.activeCase?.industry || "Selected industry";
    const peerRows = privateEquityMetricRows(business);
    const diagnostics = aiPeerDiagnosticRows(business);
    const base = valueTreeFinancialBase(business);
    const useCases = aiScoredUseCases(business).map((item) => {
      const validBase = Number.isFinite(base.revenueBillions) && base.revenueBillions > 0;
      const benefitLowBillions = validBase ? base.revenueBillions * item.range[0] / 100 : null;
      const benefitHighBillions = validBase ? base.revenueBillions * item.range[1] / 100 : null;
      return {
        ...item,
        benefitLowBillions,
        benefitHighBillions,
        benefitMidBillions: validBase ? (benefitLowBillions + benefitHighBillions) / 2 : null,
        ebitdaBenefit: validBase ? formatValueTreeRange(benefitLowBillions, benefitHighBillions, base.currency) : "Validate range",
      };
    });
    const research = business.researchFirmPriorities || buildResearchFirmPriorities(companyProfile);
    return { company, industry, companyProfile, peerRows, diagnostics, useCases, research, base };
  }

  function aiExecutiveSummary(inputs, business) {
    const peerCount = inputs.peerRows.filter((row) => !row.isCustomer).length;
    const gaps = inputs.diagnostics.filter((row) => row.position === "Behind").slice(0, 4);
    const strengths = inputs.diagnostics.filter((row) => row.position === "Ahead").slice(0, 2);
    const top = inputs.useCases.slice(0, 3);
    const gapText = gaps.length ? gaps.map((row) => row.short).join(", ") : "the metrics where evidence is complete";
    const strengthText = strengths.length ? ` The company is relatively stronger on ${strengths.map((row) => row.short).join(" and ")}, which should be protected while scaling AI.` : "";
    const evidence = outsideInBestEvidence(outsideInEvidenceSnippets(business), /growth|margin|productiv|customer|risk|digital|data|ai|operation/i, 0);
    const evidenceLine = evidence ? cleanEvidenceFragment(outsideInEvidenceText(evidence), 240) : "The current annual-report and research set should remain the evidence baseline for investment gates.";
    return [
      `${inputs.company} should treat AI as a portfolio of measurable operating interventions, not a technology programme. Against ${peerCount || "the available"} ${inputs.industry} peers, the most material opportunity is to move ${gapText}. The recommended portfolio therefore concentrates on ${top.map((item) => item.name).join(", ")}, with every initiative tied to an accountable financial metric and operating driver.${strengthText}`,
      `The outside-in evidence sharpens the sequencing: ${evidenceLine} Phase 1 should prove value in short-cycle workflows and decisions; later phases should scale into structurally differentiating data, asset and commercial capabilities. Benefit ranges are directional hypotheses derived from the current revenue baseline and must be de-duplicated in a CFO-owned value case.`,
    ];
  }

  function aiBubbleLabel(value, limit = 28) {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
  }

  function renderAiBubbleChart(useCases) {
    const rows = useCases.slice(0, 8);
    const width = 760;
    const height = 520;
    const margin = { left: 88, right: 34, top: 62, bottom: 78 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const midX = margin.left + plotWidth / 2;
    const midY = margin.top + plotHeight / 2;
    const bubbleInsetX = 78;
    const bubbleInsetY = 54;
    const xFor = (value, jitter) => margin.left + bubbleInsetX + ((value - 1) / 2) * (plotWidth - bubbleInsetX * 2) + jitter;
    const yFor = (value, jitter) => height - margin.bottom - bubbleInsetY - ((value - 1) / 2) * (plotHeight - bubbleInsetY * 2) + jitter;
    const cellTotals = rows.reduce((totals, row) => {
      const key = `${row.x}-${row.y}`;
      totals[key] = (totals[key] || 0) + 1;
      return totals;
    }, {});
    const cellIndexes = {};
    const tones = ["#E85A3A", "#2F7D57", "#2B6F78", "#D0A22B", "#7A5C91", "#3B4F43"];
    const offsetSets = {
      1: [[0, 0]],
      2: [[-42, 0], [42, 0]],
      3: [[-42, 22], [42, 22], [0, -40]],
      4: [[-42, -28], [42, -28], [-42, 28], [42, 28]],
    };
    const bubbles = rows.map((row, index) => {
      const key = `${row.x}-${row.y}`;
      const cellIndex = cellIndexes[key] || 0;
      cellIndexes[key] = cellIndex + 1;
      const offsets = offsetSets[Math.min(4, cellTotals[key] || 1)] || offsetSets[4];
      const [jitterX, jitterY] = offsets[cellIndex % offsets.length];
      const radius = 22 + Math.min(15, row.valuePotential * 0.14);
      const x = xFor(row.x, jitterX);
      const y = yFor(row.y, jitterY);
      return `
        <g class="ai-bubble" style="--bubble-delay:${index * 100 + 140}ms">
          <title>${escapeHtml(`${row.name}: ${row.metricLabels.join(", ")}; ${row.ebitdaLever}; ${row.ebitdaBenefit}; value score ${row.valuePotential}`)}</title>
          <circle cx="${x}" cy="${y}" r="${radius}" style="fill:${tones[index % tones.length]};fill-opacity:0.86"></circle>
          <text class="ai-bubble-index" x="${x}" y="${y + 6}" text-anchor="middle">${index + 1}</text>
        </g>
      `;
    }).join("");
    return `
      <div class="ai-chart-panel graph-animate">
        <div class="chart-title-row">
          <div><h3>AI Opportunity Portfolio</h3><p class="muted">Bubble size represents estimated value potential; positions show time to impact and implementation difficulty.</p></div>
        </div>
        <div class="ai-bubble-layout">
          <div class="ai-bubble-plot">
            <svg class="ai-bubble-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="AI use case opportunity bubble chart">
              <rect class="ai-quadrant-zone strategic" x="${margin.left}" y="${margin.top}" width="${plotWidth / 2}" height="${plotHeight / 2}"></rect>
              <rect class="ai-quadrant-zone transform" x="${midX}" y="${margin.top}" width="${plotWidth / 2}" height="${plotHeight / 2}"></rect>
              <rect class="ai-quadrant-zone quick" x="${margin.left}" y="${midY}" width="${plotWidth / 2}" height="${plotHeight / 2}"></rect>
              <rect class="ai-quadrant-zone scale" x="${midX}" y="${midY}" width="${plotWidth / 2}" height="${plotHeight / 2}"></rect>
              <line class="ai-quadrant-line" x1="${margin.left}" y1="${midY}" x2="${width - margin.right}" y2="${midY}"></line>
              <line class="ai-quadrant-line" x1="${midX}" y1="${margin.top}" x2="${midX}" y2="${height - margin.bottom}"></line>
              <text class="ai-zone-label" x="${margin.left + 14}" y="${margin.top + 22}">Strategic build</text>
              <text class="ai-zone-label" x="${midX + 14}" y="${margin.top + 22}">Transformational bets</text>
              <text class="ai-zone-label" x="${margin.left + 14}" y="${height - margin.bottom - 12}">Prioritise and prove</text>
              <text class="ai-zone-label" x="${midX + 14}" y="${height - margin.bottom - 12}">Scale selectively</text>
              ${bubbles}
              <text class="ai-axis-title" x="${margin.left + plotWidth / 2}" y="${height - 14}" text-anchor="middle">Time to impact: short to long</text>
              <text class="ai-axis-title" transform="translate(18 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle">Difficulty: low to high</text>
              <text class="ai-axis-tick" x="${margin.left}" y="${height - 48}" text-anchor="middle">Short</text>
              <text class="ai-axis-tick" x="${midX}" y="${height - 48}" text-anchor="middle">Medium</text>
              <text class="ai-axis-tick" x="${width - margin.right}" y="${height - 48}" text-anchor="middle">Long</text>
              <text class="ai-axis-tick" x="${margin.left - 18}" y="${height - margin.bottom + 4}" text-anchor="end">Low</text>
              <text class="ai-axis-tick" x="${margin.left - 18}" y="${midY + 4}" text-anchor="end">Medium</text>
              <text class="ai-axis-tick" x="${margin.left - 18}" y="${margin.top + 4}" text-anchor="end">High</text>
            </svg>
          </div>
          <aside class="ai-bubble-commentary" aria-label="AI opportunity portfolio commentary">
            <div class="block-label">Portfolio commentary</div>
            <p>Use the numbered plot to compare speed, delivery difficulty and directional value. Full labels and financial relevance are shown here.</p>
            <ol>
              ${rows.map((row, index) => `
                <li>
                  <span class="ai-bubble-number">${index + 1}</span>
                  <div>
                    <strong>${escapeHtml(row.name)}</strong>
                    <p>${escapeHtml(row.metricLabels.slice(0, 2).join(" | ") || "Financial value metric")} | ${escapeHtml(row.ebitdaBenefit)} EBITDA ${row.branch === "Risk" ? "protected" : "uplift"}</p>
                    <small>${escapeHtml(row.difficulty)} difficulty | ${escapeHtml(row.time)} impact | Priority ${row.priority}/100</small>
                  </div>
                </li>
              `).join("")}
            </ol>
          </aside>
        </div>
      </div>
    `;
  }

  function aiClusterRows(useCases) {
    const groups = new Map();
    useCases.forEach((item) => {
      const rows = groups.get(item.cluster) || [];
      rows.push(item);
      groups.set(item.cluster, rows);
    });
    return [...groups.entries()].map(([cluster, rows]) => ({
      cluster,
      useCases: rows,
      valuePotential: Math.round(rows.reduce((sum, row) => sum + row.valuePotential, 0) / rows.length),
      strategicFit: Math.round(rows.reduce((sum, row) => sum + row.strategicFit, 0) / rows.length),
      feasibility: Math.round(rows.reduce((sum, row) => sum + row.feasibility, 0) / rows.length),
      differentiation: Math.round(rows.reduce((sum, row) => sum + row.differentiation, 0) / rows.length),
    })).sort((a, b) => b.strategicFit - a.strategicFit);
  }

  function renderAiClusterHeatmap(useCases) {
    const rows = aiClusterRows(useCases);
    const columns = [
      ["valuePotential", "Value potential"],
      ["strategicFit", "Strategic fit"],
      ["feasibility", "Feasibility"],
      ["differentiation", "Peer differentiation"],
    ];
    return `
      <div class="ai-heatmap-panel graph-animate">
        <div class="chart-title-row"><div><h3>Industry AI Attractiveness Heatmap</h3><p class="muted">Scores combine company metric gaps, annual-report signals, industry research and implementation characteristics.</p></div><div class="heatmap-legend"><span>Lower</span><i></i><span>Higher</span></div></div>
        <div class="table-wrap"><table class="ai-heatmap-table"><thead><tr><th>Use-case cluster</th>${columns.map((column) => `<th>${escapeHtml(column[1])}</th>`).join("")}<th>Industry-specific use cases</th></tr></thead><tbody>
          ${rows.map((row) => `<tr><td><strong>${escapeHtml(row.cluster)}</strong></td>${columns.map(([key]) => `<td class="ai-heat-cell" style="--heat-bg:${benchmarkHeatColor(row[key])}"><strong>${row[key]}</strong><span>/100</span></td>`).join("")}<td>${row.useCases.map((item) => `<article class="ai-industry-use-case"><strong>${escapeHtml(item.name)}</strong><small><b>Industry pattern:</b> ${escapeHtml(item.industryUseCase)}</small><p><b>Company application:</b> ${escapeHtml(item.companyUseCase)}</p><em>Typical impact: ${escapeHtml(item.impact)}</em></article>`).join("")}</td></tr>`).join("")}
        </tbody></table></div>
      </div>
    `;
  }

  function aiDiagnosticNarrative(row, inputs) {
    if (row.position === "Evidence gap") return `${inputs.company} lacks a complete, comparable ${row.short.toLowerCase()} measure; sourcing this metric is the first diligence action.`;
    const comparison = `${aiMetricDisplay(row.key, row.current)} versus ${aiMetricDisplay(row.key, row.peerMedian)} peer median`;
    if (row.position === "Behind") return `${inputs.company} trails on ${row.short.toLowerCase()} (${comparison}), creating a measurable AI value gap.`;
    if (row.position === "Ahead") return `${inputs.company} leads on ${row.short.toLowerCase()} (${comparison}); AI should protect and compound this advantage.`;
    return `${inputs.company} is broadly in line on ${row.short.toLowerCase()} (${comparison}); targeted AI must create differentiation, not parity.`;
  }

  function renderAiFinancialDiagnostic(inputs) {
    const metricKeys = ["revenuePerEmployee", "ebitdaPerEmployee", "ebitdaMargin", "revenueGrowth", "productivitySpread", "roa", "fcfConversion", "leverage"];
    return `
      <div class="ai-diagnostic-grid">
        <div class="ai-diagnostic-table-wrap table-wrap">
          <table class="ai-peer-table"><thead><tr><th>Company</th>${metricKeys.map((key) => `<th>${escapeHtml(AI_METRICS[key].label)}</th>`).join("")}</tr></thead><tbody>
            ${inputs.peerRows.map((row) => `<tr class="${row.isCustomer ? "benchmark-customer-row" : ""}"><td><strong>${escapeHtml(row.company)}</strong>${row.isCustomer ? `<span class="benchmark-row-badge">Selected company</span>` : ""}</td>${metricKeys.map((key) => `<td>${escapeHtml(aiMetricDisplay(key, row[key]))}</td>`).join("")}</tr>`).join("")}
          </tbody></table>
        </div>
        <div class="ai-diagnostic-narratives">
          ${inputs.diagnostics.map((row) => `<article class="${attr(row.position.toLowerCase().replace(/\s+/g, "-"))}"><span>${escapeHtml(row.position)}</span><strong>${escapeHtml(row.label)}</strong><p>${escapeHtml(aiDiagnosticNarrative(row, inputs))}</p></article>`).join("")}
        </div>
      </div>
    `;
  }

  function aiMetricOperatingDrivers(metricKey, linkedUseCases) {
    const explicit = {
      revenuePerEmployee: "Revenue per customer, conversion, yield, digital adoption and colleague capacity",
      ebitdaPerEmployee: "Automation rate, cycle time, exception workload, rework and workforce capacity",
      ebitdaMargin: "Unit economics, cost-to-serve, pricing, loss avoidance and operating leverage",
      revenueGrowth: "Demand capture, conversion, retention, cross-sell, pricing and time-to-market",
      productivitySpread: "Scalable digital volume, workflow automation and output growth ahead of headcount",
      roa: "Asset utilisation, throughput, uptime, yield, inventory and capital allocation",
      fcfConversion: "Working capital, forecast accuracy, release cycles, loss prevention and cash discipline",
      leverage: "Cash generation, earnings resilience, capital productivity and downside protection",
    };
    const impactSignals = (linkedUseCases || [])
      .map((item) => String(item.impact || "").split(".")[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("; ");
    return impactSignals || explicit[metricKey] || "Validated operating drivers and accountable benefit owners";
  }

  function renderAiBusinessCaseFoundation(inputs) {
    return `
      <div class="ai-business-case-foundation graph-animate">
        <div class="chart-title-row">
          <div>
            <div class="block-label">AI business case foundation</div>
            <h3>Metric To Company Use Case To EBITDA Value</h3>
            <p class="muted">Every metric is linked to the ${escapeHtml(inputs.company)} application, the supporting ${escapeHtml(inputs.industry)} use-case pattern and the exact EBITDA lever shown in the waterfall.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ai-metric-bridge-table">
            <thead><tr><th>Financial metric</th><th>Company position and value question</th><th>Operating drivers</th><th>Company-specific AI use cases</th><th>Industry use-case basis</th><th>EBITDA value levers</th></tr></thead>
            <tbody>
              ${inputs.diagnostics.map((metric) => {
                const linked = inputs.useCases.filter((item) => item.metrics.includes(metric.key)).slice(0, 2);
                return `<tr>
                  <td><strong>${escapeHtml(metric.label)}</strong><span class="ai-position-tag ${attr(metric.position.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(metric.position)}</span><small>${escapeHtml(aiMetricDisplay(metric.key, metric.current))} vs ${escapeHtml(aiMetricDisplay(metric.key, metric.peerMedian))} peer median</small></td>
                  <td>${escapeHtml(aiDiagnosticNarrative(metric, inputs))}</td>
                  <td>${escapeHtml(aiMetricOperatingDrivers(metric.key, linked))}</td>
                  <td>${linked.map((item) => `<article class="ai-bridge-use-case"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.companyUseCase)}</small></article>`).join("") || `<span class="muted">No qualified use case yet.</span>`}</td>
                  <td>${linked.map((item) => `<article class="ai-bridge-industry-case"><strong>${escapeHtml(item.cluster)}</strong><small>${escapeHtml(item.industryUseCase)}</small><em>${escapeHtml(item.impact)}</em></article>`).join("") || `<span class="muted">Industry evidence required.</span>`}</td>
                  <td>${linked.map((item) => `<a class="ai-ebitda-link" href="#${attr(item.leverId)}"><span class="${attr(item.branch.toLowerCase())}">${escapeHtml(item.branch)}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.ebitdaBenefit)} directional EBITDA ${item.branch === "Risk" ? "protected" : "uplift"}</small></a>`).join("") || `<span class="muted">Benefit range to validate.</span>`}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function aiDomainStrength(metricKey, domain, useCases) {
    const matches = useCases.filter((item) => item.metrics.includes(metricKey) && item.domains.includes(domain));
    if (!matches.length) return { score: 8, label: "-" };
    const score = Math.min(96, Math.round(matches.reduce((sum, item) => sum + item.priority, 0) / matches.length));
    return { score, label: matches.length > 1 || score >= 75 ? "Primary" : "Secondary" };
  }

  function renderAiValueMap(inputs) {
    return `
      <div class="ai-value-map graph-animate">
        <div class="chart-title-row"><div><h3>AI Value Map: Metrics to AI Domains</h3><p class="muted">Intensity shows how directly each AI domain can influence the selected financial metric through ${escapeHtml(inputs.industry)} operating drivers.</p></div></div>
        <div class="table-wrap"><table class="ai-value-map-table"><thead><tr><th>Financial metric</th><th>Industry operating drivers</th>${AI_DOMAINS.map((domain) => `<th>${escapeHtml(domain)}</th>`).join("")}</tr></thead><tbody>
          ${inputs.diagnostics.map((metric) => {
            const linked = inputs.useCases.filter((item) => item.metrics.includes(metric.key)).slice(0, 3);
            const drivers = linked.map((item) => item.impact.split(".")[0]).join("; ") || "Evidence-led operating driver validation required";
            return `<tr><td><strong>${escapeHtml(metric.label)}</strong><span class="ai-position-tag ${attr(metric.position.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(metric.position)}</span></td><td>${escapeHtml(drivers)}</td>${AI_DOMAINS.map((domain) => { const strength = aiDomainStrength(metric.key, domain, inputs.useCases); return `<td class="ai-map-cell" style="--heat-bg:${benchmarkHeatColor(strength.score)}"><strong>${escapeHtml(strength.label)}</strong><span>${strength.score}</span></td>`; }).join("")}</tr>`;
          }).join("")}
        </tbody></table></div>
      </div>
    `;
  }

  function aiRadarPoint(cx, cy, radius, index, count, score) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const scaled = radius * Math.max(0, Math.min(100, score)) / 100;
    return { x: cx + Math.cos(angle) * scaled, y: cy + Math.sin(angle) * scaled, angle };
  }

  function renderAiValueLeverRadar(inputs) {
    const rows = inputs.useCases.slice(0, 6);
    const width = 780;
    const height = 500;
    const cx = 390;
    const cy = 250;
    const radius = 150;
    const rings = [20, 40, 60, 80, 100].map((score) => {
      const points = rows.map((_, index) => aiRadarPoint(cx, cy, radius, index, rows.length, score)).map((point) => `${point.x},${point.y}`).join(" ");
      return `<polygon class="spider-ring" points="${points}"></polygon>`;
    }).join("");
    const axes = rows.map((row, index) => {
      const end = aiRadarPoint(cx, cy, radius, index, rows.length, 100);
      const label = aiRadarPoint(cx, cy, radius + 70, index, rows.length, 100);
      return `<line class="spider-axis" x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}"></line><text class="ai-radar-label" x="${label.x}" y="${label.y}" text-anchor="${Math.abs(label.x - cx) < 20 ? "middle" : label.x < cx ? "end" : "start"}"><tspan x="${label.x}">${escapeHtml(aiBubbleLabel(row.name, 24))}</tspan><tspan class="ai-radar-score" x="${label.x}" dy="15">Priority ${row.priority}</tspan></text>`;
    }).join("");
    const polygon = rows.map((row, index) => aiRadarPoint(cx, cy, radius, index, rows.length, row.priority)).map((point) => `${point.x},${point.y}`).join(" ");
    const points = rows.map((row, index) => { const point = aiRadarPoint(cx, cy, radius, index, rows.length, row.priority); return `<circle class="spider-point" cx="${point.x}" cy="${point.y}" r="6"></circle>`; }).join("");
    return `
      <div class="ai-radar-panel graph-animate">
        <div class="chart-title-row"><div><h3>Company-Specific AI Value Levers</h3><p class="muted">Priority combines financial gap, strategic evidence, industry value potential, feasibility and differentiation.</p></div></div>
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="AI value lever priority radar graph">${rings}${axes}<polygon class="spider-area" points="${polygon}"></polygon><polyline class="spider-line" points="${polygon} ${polygon.split(" ")[0]}"></polyline>${points}</svg>
        <div class="ai-lever-list">${rows.map((row, index) => `<article><span>${index + 1}</span><div><strong>${escapeHtml(row.name)}</strong><p>${escapeHtml(`${row.metricLabels.join(", ")}: ${row.impact}`)}</p><a href="#${attr(row.leverId)}">${escapeHtml(row.branch)} EBITDA lever | ${escapeHtml(row.ebitdaBenefit)}</a></div></article>`).join("")}</div>
      </div>
    `;
  }

  function renderAiUseCasePortfolio(inputs) {
    return `
      <div class="outside-in-table-wrap"><table class="outside-in-table ai-portfolio-table"><thead><tr><th>AI use case / theme</th><th>Company-specific application and evidence</th><th>EBITDA lever / value hypothesis</th><th>Metrics moved</th><th>Ease / time</th><th>Dependencies</th><th>Priority</th></tr></thead><tbody>
        ${inputs.useCases.map((row) => `<tr><td><span class="ai-cluster-label">${escapeHtml(row.cluster)}</span><strong>${escapeHtml(row.name)}</strong><small><b>Industry pattern:</b> ${escapeHtml(row.industryUseCase)}</small></td><td><p>${escapeHtml(row.companyUseCase)}</p><small class="ai-use-case-evidence">${escapeHtml(row.evidenceLine)}</small></td><td><a class="ai-portfolio-ebitda-link" href="#${attr(row.leverId)}"><span class="ai-branch-badge ${attr(row.branch.toLowerCase())}">${escapeHtml(row.branch)}</span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.ebitdaBenefit)} directional EBITDA ${row.branch === "Risk" ? "protected" : "uplift"}</small></a><p>${escapeHtml(row.impact)}</p></td><td>${row.metricLabels.map((label) => `<span class="ai-metric-chip">${escapeHtml(label)}</span>`).join("")}</td><td><strong>${escapeHtml(row.difficulty)} difficulty</strong><small>${escapeHtml(row.time)} time to impact</small></td><td>${escapeHtml(row.dependencies)}</td><td><strong class="ai-priority-score">${row.priority}</strong><small>/100</small></td></tr>`).join("")}
      </tbody></table></div>
    `;
  }

  function renderAiRoadmap(inputs) {
    const phases = [
      { phase: 1, title: "0-12 months", label: "Prove and enable", rationale: "Close immediate productivity and decision gaps while establishing controls and reusable foundations." },
      { phase: 2, title: "12-24 months", label: "Scale and connect", rationale: "Scale proven use cases across processes, journeys, assets and business units; connect benefits to operating plans." },
      { phase: 3, title: "24+ months", label: "Transform and differentiate", rationale: "Industrialise high-complexity AI where proprietary data and operating-model change can create durable advantage." },
    ];
    return `<div class="ai-roadmap">${phases.map((phase) => {
      const cases = inputs.useCases.filter((item) => item.phase === phase.phase).slice(0, 4);
      return `<article><div class="ai-roadmap-head"><span>Phase ${phase.phase}</span><strong>${escapeHtml(phase.title)}</strong><small>${escapeHtml(phase.label)}</small></div><p>${escapeHtml(phase.rationale)}</p><div class="ai-roadmap-cases">${cases.length ? cases.map((item) => `<div><strong>${escapeHtml(item.name)}</strong><span>${phase.phase === 1 ? "Pilot / start" : phase.phase === 2 ? "Scale / extend" : "Transform / industrialise"}</span><small>${escapeHtml(item.metricLabels.slice(0, 2).join(" | "))}</small><a href="#${attr(item.leverId)}">${escapeHtml(item.branch)} EBITDA | ${escapeHtml(item.ebitdaBenefit)}</a></div>`).join("") : `<span>Use-case evidence gate required.</span>`}</div></article>`;
    }).join("")}</div>`;
  }

  function aiWaterfallRows(inputs, business) {
    const base = inputs.base || valueTreeFinancialBase(business);
    const selected = [];
    ["Cost", "Revenue", "Risk"].forEach((branch) => selected.push(...inputs.useCases.filter((item) => item.branch === branch)));
    return {
      base,
      rows: selected.map((item) => ({
        branch: item.branch,
        lever: item.name,
        leverId: item.leverId,
        ebitdaBenefit: item.ebitdaBenefit,
        benefitLowBillions: item.benefitLowBillions,
        benefitHighBillions: item.benefitHighBillions,
        benefitMidBillions: item.benefitMidBillions,
      })),
    };
  }

  function aiRecommendations(inputs) {
    const top = inputs.useCases.slice(0, 4);
    const gap = inputs.diagnostics.find((row) => row.position === "Behind");
    return [
      `Start with ${top[0]?.name || "one short-cycle AI value proof"} and make ${gap?.short || "a named financial metric"} the executive success measure.`,
      `Fund AI through a CFO-owned portfolio: release the next tranche only when operational adoption and benefit capture are evidenced.`,
      `Build reusable data products, evaluation and controls alongside Phase 1 so every later use case is cheaper and safer to scale.`,
      `Use ${inputs.peerRows.filter((row) => !row.isCustomer).slice(0, 3).map((row) => row.company).join(", ") || "validated peers"} as performance comparators, not as templates; prioritise where ${inputs.company} has proprietary data or workflow advantage.`,
      `Establish joint business, technology, risk and workforce ownership before production deployment; AI operating-model change is part of the business case, not an afterthought.`,
    ];
  }

  function renderAiBusinessValueAssessment() {
    if (!state.activeCaseId || !state.business) {
      return `<section class="section"><div class="empty">Open a Value Case to build the AI Business Value Assessment.</div></section>`;
    }
    const business = state.business;
    const inputs = aiAssessmentInputs(business);
    const summary = aiExecutiveSummary(inputs, business);
    const waterfall = aiWaterfallRows(inputs, business);
    const recommendations = aiRecommendations(inputs);
    const topMetrics = inputs.diagnostics.filter((row) => row.position === "Behind").slice(0, 5);
    const sourceLinks = annualReportSourceLinks(inputs.companyProfile, activeCaseCompanyProfile(state.activeCase));
    return `
      ${pageHeading(
        "Value Creation / Strategic Narrative / AI Business Value Assessment",
        "AI Business Value Assessment",
        `Company-specific AI value portfolio for ${inputs.company}, grounded in ${inputs.industry} research, annual-report evidence and validated peer economics.`,
        activeCaseActions({ includeAnnualReport: true })
      )}
      ${state.privateEquityLoading ? `<section class="section ai-refresh-strip"><span class="loader-ring pe-loader" aria-hidden="true"></span><div><strong>Refreshing peer economics for the AI value case</strong><span>${escapeHtml(state.privateEquityStatus)}</span></div></section>` : ""}
      <section class="section ai-assessment-section">
        <div class="ai-section-number">1</div>
        <div class="section-heading"><div><h2>AI Outside-In Opportunity Assessment</h2><p class="muted">Top-down view of where AI can change ${escapeHtml(inputs.company)} performance in ${escapeHtml(inputs.industry)}.</p></div></div>
        <div class="ai-executive-summary"><div class="block-label">Executive summary</div>${summary.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${renderOutsideInSources(sourceLinks)}</div>
        <div class="ai-target-metrics">${(topMetrics.length ? topMetrics : inputs.diagnostics.slice(0, 5)).map((row) => `<article><span>${escapeHtml(row.position)}</span><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(aiMetricDisplay(row.key, row.current))} vs ${escapeHtml(aiMetricDisplay(row.key, row.peerMedian))} peer median</small></article>`).join("")}</div>
        ${renderAiBubbleChart(inputs.useCases)}
      </section>

      <section class="section ai-assessment-section">
        <div class="ai-section-number">2</div>
        <div class="section-heading"><div><h2>Value Levers</h2><p class="muted">Translation of the peer diagnostic into financial metrics, operating drivers and AI domains.</p></div></div>
        <div class="ai-subsection-heading"><h3>Financial and Competitive Diagnostic</h3><p>${escapeHtml(peerValidationSummary(business))}</p></div>
        ${renderAiFinancialDiagnostic(inputs)}
        ${renderAiBusinessCaseFoundation(inputs)}
      </section>

      <section class="section ai-assessment-section">
        <div class="ai-section-number">3</div>
        <div class="section-heading"><div><h2>Business Case</h2><p class="muted">Prioritised use-case portfolio, directional financial value hypothesis and phased roadmap.</p></div></div>
        <div class="ai-subsection-heading"><h3>Company-Specific AI Use-Case Portfolio</h3><p>Priorities are recalculated from current peer metrics, annual-report signals and industry research whenever the case refreshes.</p></div>
        ${renderAiUseCasePortfolio(inputs)}
        <div class="ai-subsection-heading"><h3>AI Business Case Waterfall</h3><p>Directional 3-5 year EBITDA uplift and protection ranges; overlapping benefits require CFO validation before aggregation.</p></div>
        ${renderEbitdaBenefitWaterfall(waterfall.rows, waterfall.base)}
        <div class="ai-recommendations">
          <div><div class="block-label">Overall narrative</div><p>For ${escapeHtml(inputs.company)}, the portfolio should move from isolated pilots to a financially governed sequence of decisions and operating-model changes. The strongest near-term cases combine short time to impact with explicit productivity, margin or cash metrics; higher-complexity industry AI should scale only after data quality, controls and adoption are proven.</p></div>
          <div><div class="block-label">Leadership recommendations</div><ol>${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div>
        </div>
        <div class="ai-subsection-heading"><h3>Prioritised Roadmap</h3><p>Sequence value proof, scale and transformation without waiting for a monolithic data programme.</p></div>
        ${renderAiRoadmap(inputs)}
      </section>
    `;
  }

  function renderBusinessLoader(message) {
    const stages = Array.isArray(state.refreshStages) ? state.refreshStages : [];
    return `
      <section class="section refresh-loader-section" role="status" aria-live="polite">
        <div class="business-loader">
          <span class="loader-ring" aria-hidden="true"></span>
          <div>
            <strong>${escapeHtml(message || "Running analysis modules in stages...")}</strong>
            <span>Each module renders independently so the page stays usable while refresh work continues.</span>
          </div>
        </div>
        ${stages.length ? `
          <div class="stage-list">
            ${stages.map((stage) => `
              <span class="stage-pill ${attr(stage.status || "pending")}">
                <strong>${escapeHtml(stage.label)}</strong>
                <small>${escapeHtml(stage.status || "pending")}${stage.detail ? ` - ${stage.detail}` : ""}</small>
              </span>
            `).join("")}
          </div>
        ` : ""}
      </section>
    `;
  }

  function annualReportAnalysisInProgress() {
    return /annual report/i.test(state.businessProcessing || "");
  }

  function renderAnnualReportAnalysisLoader(message, detail = "") {
    return `
      <div class="annual-report-analysis-loader" role="status" aria-live="polite">
        <span class="loader-ring annual-report-loader-ring" aria-hidden="true"></span>
        <div>
          <strong>${escapeHtml(message || "AI analysing annual report")}</strong>
          <span>${escapeHtml(detail || "Extracting Board, investor, financial and priority evidence from the uploaded PDF.")}</span>
        </div>
      </div>
    `;
  }

  function latestFinancialRevenue(business) {
    const rows = Array.isArray(business.financialTrends) ? business.financialTrends : [];
    const latest = [...rows].reverse().find((row) => String(row.revenue || "").trim() && !isValidationPlaceholder(row.revenue));
    const snapshot = business.snapshot || {};
    const snapshotRevenue = !lookupValueMissing(snapshot.revenue) ? String(snapshot.revenue || "").trim() : "";
    const annualRevenue = annualRevenueUsdDisplay(snapshot.annualRevenueUsd);
    const value = (latest && latest.revenue) || snapshotRevenue || annualRevenue || "";
    const year = latest
      ? latest.year || snapshot.fiscalYear || "Latest reported"
      : snapshot.fiscalYear || (annualRevenue ? "Latest annual revenue" : "Latest reported");
    const yoyGrowth = latest && !isValidationPlaceholder(latest.yoyGrowth) ? latest.yoyGrowth || "" : "";
    return {
      value,
      year,
      yoyGrowth,
    };
  }

  function currencyCode(value) {
    const text = String(value || "").trim();
    const codeMatch = text.toUpperCase().match(/\b(GBP|USD|EUR|AUD|CAD|JPY|CHF|SEK|NOK|DKK|HKD|SGD|INR|AED|NZD|ZAR)\b/);
    if (codeMatch) return codeMatch[1];
    if (/A\$/i.test(text)) return "AUD";
    if (/C\$/i.test(text)) return "CAD";
    if (text.includes("\u00a3")) return "GBP";
    if (text.includes("\u20ac")) return "EUR";
    if (text.includes("Â£")) return "GBP";
    if (text.includes("$")) return "USD";
    if (text.includes("â‚¬")) return "EUR";
    return "";
  }

  function formatBillions(amount, code) {
    if (!Number.isFinite(amount)) return "Validate";
    const prefix = code ? `${code} ` : "";
    if (Math.abs(amount) >= 1000) return `${prefix}${(amount / 1000).toFixed(1)}T`;
    if (Math.abs(amount) >= 10) return `${prefix}${amount.toFixed(1)}B`;
    return `${prefix}${amount.toFixed(2).replace(/0$/, "")}B`;
  }

  function currencyForCountry(value) {
    const country = normalizeLookupQuery(value);
    if (!country) return "";
    if (/(united kingdom|great britain|england|scotland|wales|northern ireland|\buk\b)/.test(country)) return "GBP";
    if (/(united states|\busa\b|\bus\b)/.test(country)) return "USD";
    if (/(ireland|france|germany|spain|italy|netherlands|belgium|luxembourg|portugal|austria|finland|greece|cyprus|malta|estonia|latvia|lithuania|slovakia|slovenia|croatia)/.test(country)) return "EUR";
    if (/canada/.test(country)) return "CAD";
    if (/australia/.test(country)) return "AUD";
    if (/new zealand/.test(country)) return "NZD";
    if (/japan/.test(country)) return "JPY";
    if (/switzerland/.test(country)) return "CHF";
    if (/sweden/.test(country)) return "SEK";
    if (/norway/.test(country)) return "NOK";
    if (/denmark/.test(country)) return "DKK";
    if (/hong kong/.test(country)) return "HKD";
    if (/singapore/.test(country)) return "SGD";
    if (/india/.test(country)) return "INR";
    if (/(united arab emirates|\buae\b)/.test(country)) return "AED";
    if (/south africa/.test(country)) return "ZAR";
    return "";
  }

  function localCurrencyForBusiness(business) {
    const payload = business || state.business || {};
    const snapshot = payload.snapshot || {};
    const company = currentPriorityCompany();
    const valueCase = state.activeCase || {};
    const country = [
      snapshot.hqCountry,
      snapshot.hq,
      valueCase.hq_country,
      valueCase.hqCountry,
      company.hqCountry,
      company.hq,
    ].filter(Boolean).join(" ");
    const countryCurrency = currencyForCountry(country);
    if (countryCurrency) return countryCurrency;
    const ticker = String(snapshot.ticker || valueCase.ticker || company.ticker || "").toUpperCase();
    if (/\.L$/.test(ticker)) return "GBP";
    const revenueCurrency = currencyCode(latestFinancialRevenue(payload).value || snapshot.revenue || company.revenue || "");
    return revenueCurrency || "USD";
  }

  function convertCurrencyBillions(amount, fromCurrency, toCurrency) {
    if (!Number.isFinite(amount)) return null;
    const from = String(fromCurrency || toCurrency || "USD").toUpperCase();
    const to = String(toCurrency || from || "USD").toUpperCase();
    if (from === to) return amount;
    const rates = (state.fxRates && state.fxRates.rates) || DEFAULT_FX_RATES;
    const fromRate = Number(rates[from]);
    const toRate = Number(rates[to]);
    if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) return null;
    return (amount / fromRate) * toRate;
  }

  function normalizeRevenueMetric(value, targetCurrency, fallbackCurrency = "") {
    const parsed = parseCurrencyMetric(value);
    if (!parsed || !Number.isFinite(parsed.billions)) return null;
    const sourceCurrency = parsed.currency || fallbackCurrency || targetCurrency || "USD";
    const comparisonCurrency = targetCurrency || sourceCurrency;
    const converted = convertCurrencyBillions(parsed.billions, sourceCurrency, comparisonCurrency);
    const billions = Number.isFinite(converted) ? converted : parsed.billions;
    const currency = Number.isFinite(converted) ? comparisonCurrency : sourceCurrency;
    return {
      billions,
      currency,
      sourceCurrency,
      display: formatBillions(billions, currency),
      converted: sourceCurrency !== currency,
      original: String(value || "").trim(),
    };
  }

  function normalizeRevenueRow(row, targetCurrency) {
    const source = row || {};
    const rawRevenue = String(source.revenue || "").trim();
    const annualRevenueUsd = String(source.annualRevenueUsd || source.annual_revenue_usd || "").trim();
    const revenueValue = rawRevenue && !isValidationPlaceholder(rawRevenue)
      ? rawRevenue
      : annualRevenueUsd;
    const normalized = normalizeRevenueMetric(
      revenueValue,
      targetCurrency,
      rawRevenue ? "" : annualRevenueUsd ? "USD" : targetCurrency
    );
    return {
      ...source,
      revenueOriginal: rawRevenue || (annualRevenueUsd ? `USD ${annualRevenueUsd}` : ""),
      revenue: normalized ? normalized.display : rawRevenue,
      revenueBillions: normalized ? normalized.billions : null,
      revenueSourceCurrency: normalized ? normalized.sourceCurrency : currencyCode(rawRevenue),
      comparisonCurrency: normalized ? normalized.currency : targetCurrency,
      revenueConverted: Boolean(normalized && normalized.converted),
    };
  }

  function fxComparisonLabel(targetCurrency) {
    const fx = state.fxRates || {};
    const date = fx.date ? ` (${fx.date})` : "";
    const source = fx.fallback ? "offline reference FX" : fx.source || "daily reference FX";
    return `Revenue normalized to ${targetCurrency} using ${source}${date}.`;
  }

  function annualRevenueUsdBillions(value) {
    const text = String(value || "").trim();
    if (!text || isValidationPlaceholder(text)) return null;
    const billions = parseCurrencyAmount(text);
    return Number.isFinite(billions) && billions ? billions : null;
  }

  function annualRevenueUsdDisplay(value) {
    const billions = annualRevenueUsdBillions(value);
    return billions == null ? "" : formatBillions(billions, "USD");
  }

  function companyRevenueDisplay(company) {
    if (!company) return "";
    const revenue = String(company.revenue || "").trim();
    if (revenue && !isValidationPlaceholder(revenue)) return revenue;
    return annualRevenueUsdDisplay(company.annualRevenueUsd);
  }

  function lookupValueMissing(value) {
    const text = String(value || "").trim();
    return !text || /^(?:null|none|undefined)$/i.test(text) || isValidationPlaceholder(text) || ["Public company", "Registered company"].includes(text);
  }

  function lookupFieldValue(source, ...keys) {
    const object = source || {};
    for (const key of keys) {
      const value = object[key];
      if (!lookupValueMissing(value)) return value;
    }
    return "";
  }

  function lookupProfileCompleteness(source) {
    const object = source || {};
    return [
      "ticker",
      "cik",
      "companyNumber",
      "exchange",
      "industry",
      "primaryIndustry",
      "subSector",
      "website",
      "domain",
      "hq",
      "hqCountry",
      "employees",
      "priorEmployees",
      "revenue",
      "annualRevenueUsd",
      "ebitdaUsd",
      "totalAssetsUsd",
      "netProfit",
      "fiscalYear",
      "description",
      "peerGroup",
    ].reduce((score, key) => score + (lookupValueMissing(object[key]) ? 0 : 1), 0);
  }

  function mergeLookupList(left, right) {
    const merged = [];
    [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].forEach((item) => {
      if (!item) return;
      const key = JSON.stringify(item);
      if (!merged.some((existing) => JSON.stringify(existing) === key)) merged.push(item);
    });
    return merged;
  }

  function bestLocalProfileForMatch(match) {
    if (!match) return null;
    const ticker = normalizeLookupQuery(match.ticker || "");
    const companyNumber = normalizeLookupQuery(match.companyNumber || "");
    const matchNames = [
      match.name,
      match.legalName,
      match.domain,
      match.website,
    ].map(normalizeLookupQuery).filter(Boolean);
    if (ticker) {
      const byTicker = publicCompanyFixtures().find((company) => normalizeLookupQuery(company.ticker || "") === ticker);
      if (byTicker) return byTicker;
    }
    if (companyNumber) {
      const byCik = publicCompanyFixtures().find((company) => normalizeLookupQuery(company.cik || company.companyNumber || "") === companyNumber);
      if (byCik) return byCik;
    }
    let best = null;
    let bestScore = 0;
    publicCompanyFixtures().forEach((company) => {
      const names = [company.name, company.legalName, ...(company.aliases || [])].map(normalizeLookupQuery).filter(Boolean);
      let score = 0;
      if (matchNames.some((name) => names.includes(name))) score = 100;
      if (!score && matchNames.some((name) => names.some((candidate) => candidate.includes(name) || name.includes(candidate)))) score = 86;
      if (!score) {
        const matchTokens = new Set(matchNames.flatMap((name) => Array.from(lookupTokens(name))));
        const candidateTokens = new Set(names.flatMap((name) => Array.from(lookupTokens(name))));
        const overlap = Array.from(matchTokens).filter((token) => candidateTokens.has(token)).length;
        if (overlap >= Math.min(2, matchTokens.size || 2)) score = 42 + overlap * 16;
      }
      if (score > bestScore) {
        best = company;
        bestScore = score;
      }
    });
    return bestScore >= 70 ? best : null;
  }

  function mergeLookupProfileFields(target, profile) {
    if (!target || !profile) return target;
    const merged = { ...target };
    [
      "name",
      "legalName",
      "ticker",
      "cik",
      "companyNumber",
      "exchange",
      "industry",
      "primaryIndustry",
      "subSector",
      "website",
      "domain",
      "hq",
      "hqCountry",
      "employees",
      "priorEmployees",
      "revenue",
      "annualRevenueUsd",
      "ebitdaUsd",
      "totalAssetsUsd",
      "fiscalYear",
      "netProfit",
      "description",
      "peerGroup",
      "source",
      "confidence",
      "matchReason",
      "financialHistory",
    ].forEach((key) => {
      if (lookupValueMissing(merged[key]) && !lookupValueMissing(profile[key])) {
        merged[key] = profile[key];
      }
    });
    const targetHistory = Array.isArray(merged.financialHistory) ? merged.financialHistory : [];
    const profileHistory = Array.isArray(profile.financialHistory) ? profile.financialHistory : [];
    if (profileHistory.length > targetHistory.length && profileHistory.length >= 3) {
      merged.financialHistory = profileHistory;
      const latestVerified = profileHistory[profileHistory.length - 1] || {};
      if (!lookupValueMissing(latestVerified.revenue)) merged.revenue = latestVerified.revenue;
      if (!lookupValueMissing(latestVerified.year)) merged.fiscalYear = latestVerified.year;
      if (!lookupValueMissing(profile.netProfit)) merged.netProfit = profile.netProfit;
      merged.source = profile.source || merged.source;
    }
    if (profile.peerMetrics && (!merged.peerMetrics || profileHistory.length >= 3)) {
      merged.peerMetrics = { ...(merged.peerMetrics || {}), ...profile.peerMetrics };
    }
    if (lookupValueMissing(merged.domain) && !lookupValueMissing(merged.website)) {
      merged.domain = domainFromUrl(merged.website);
    }
    if (lookupValueMissing(merged.website) && !lookupValueMissing(merged.domain)) {
      merged.website = merged.domain;
    }
    if (lookupValueMissing(merged.revenue) && !lookupValueMissing(merged.annualRevenueUsd)) {
      merged.revenue = annualRevenueUsdDisplay(merged.annualRevenueUsd) || merged.revenue || "";
    }
    merged.sourceSnippets = mergeLookupList(merged.sourceSnippets, profile.sourceSnippets);
    merged.validationLinks = mergeLookupList(merged.validationLinks, profile.validationLinks);
    if (!Array.isArray(merged.financialRows) || needsFinancialLookupPrefill(merged.financialRows, merged)) {
      merged.financialRows = Array.isArray(profile.financialRows) && !isBlankFinancialRows(profile.financialRows)
        ? profile.financialRows
        : buildCompanyFinancialRows(merged);
    }
    if (!hasPriorityInsights(merged.priorityInsights) && profile.priorityInsights) {
      merged.priorityInsights = profile.priorityInsights;
    }
    if (!hasResearchFirmPriorities(merged.researchFirmPriorities) && profile.researchFirmPriorities) {
      merged.researchFirmPriorities = profile.researchFirmPriorities;
    }
    merged.validationLinks = merged.validationLinks && merged.validationLinks.length
      ? merged.validationLinks
      : companySearchUrls(merged.name || profile.name, merged.ticker || profile.ticker);
    return merged;
  }

  function itSpendBenchmarkPercent(industry) {
    const text = String(industry || "").toLowerCase();
    if (text.includes("insurance") || text.includes("retirement")) return 5.8;
    if (text.includes("financial") || text.includes("bank")) return 6.5;
    if (text.includes("telecom")) return 5.2;
    if (text.includes("technology")) return 4.8;
    if (text.includes("retail")) return 3.6;
    return 4.5;
  }

  function flattenText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return ` ${value}`;
    if (Array.isArray(value)) return value.map(flattenText).join(" ");
    if (typeof value === "object") return Object.values(value).map(flattenText).join(" ");
    return "";
  }

  function keyPressureSignal(business) {
    const text = flattenText({
      priorityInsights: business.priorityInsights,
      researchFirmPriorities: business.researchFirmPriorities,
      marketTriggers: business.marketTriggers,
      signalScan: business.signalScan,
      benchmarkNotes: business.benchmarkNotes,
    }).toLowerCase();
    const pressureTypes = [
      {
        label: "Cost",
        badge: "Financial pressure",
        description: "Margin, efficiency and productivity signals dominate the current research set.",
        terms: ["cost", "margin", "efficiency", "productivity", "savings", "expense", "cost-to-serve"],
      },
      {
        label: "Risk",
        badge: "Control pressure",
        description: "Resilience, cyber, regulatory and trust signals are prominent in the current research set.",
        terms: ["risk", "resilience", "cyber", "regulation", "regulatory", "compliance", "controls", "fraud", "trust"],
      },
      {
        label: "Market Share",
        badge: "Competitive pressure",
        description: "Competitor, fintech, customer ownership and market-share signals are prominent.",
        terms: ["market share", "competitor", "competition", "fintech", "neobank", "entrant", "customer ownership"],
      },
      {
        label: "Growth",
        badge: "Growth pressure",
        description: "Growth, innovation and customer-value signals are prominent in the current research set.",
        terms: ["growth", "innovation", "revenue", "customer value", "new market"],
      },
    ];
    const scored = pressureTypes
      .map((pressure) => ({
        ...pressure,
        score: pressure.terms.reduce((total, term) => {
          const matches = text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
          return total + (matches ? matches.length : 0);
        }, 0),
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0] && scored[0].score ? scored[0] : pressureTypes[0];
  }

  function renderBusinessOverviewCards(business) {
    const snapshot = business.snapshot || {};
    const revenue = latestFinancialRevenue(business);
    const fallbackProfile = activeCaseCompanyProfile(state.activeCase);
    const fallbackRevenue = companyRevenueDisplay(fallbackProfile);
    const fallbackAnnualRevenueUsd = snapshot.annualRevenueUsd || (fallbackProfile && fallbackProfile.annualRevenueUsd) || "";
    const rawDisplayRevenue = revenue.value || fallbackRevenue || annualRevenueUsdDisplay(fallbackAnnualRevenueUsd) || "";
    const localCurrency = localCurrencyForBusiness(business);
    const normalizedRevenue = normalizeRevenueMetric(
      rawDisplayRevenue,
      localCurrency,
      rawDisplayRevenue ? "" : fallbackAnnualRevenueUsd ? "USD" : localCurrency
    );
    const displayRevenue = normalizedRevenue ? normalizedRevenue.display : rawDisplayRevenue;
    const revenueAmount = normalizedRevenue ? normalizedRevenue.billions : annualRevenueUsdBillions(fallbackAnnualRevenueUsd);
    const code = normalizedRevenue ? normalizedRevenue.currency : localCurrency;
    const benchmark = itSpendBenchmarkPercent(snapshot.industry || (state.activeCase && state.activeCase.industry));
    const estimatedSpend = revenueAmount == null ? "Revenue pending" : formatBillions(revenueAmount * (benchmark / 100), code);
    const pressure = keyPressureSignal(business);
    const revenueSubMetric = [
      revenue.year,
      revenue.yoyGrowth ? `${revenue.yoyGrowth}% YoY` : "",
    ].filter(Boolean).join(" / ");
    const cards = [
      {
        title: "Revenue",
        badge: "Latest",
        value: displayRevenue || "Revenue pending",
        subMetric: revenueSubMetric || "Latest reported",
        body: "Latest revenue signal from the financial trend.",
        tone: "neutral",
      },
      {
        title: "Estimated IT Spend",
        badge: "Benchmark",
        value: estimatedSpend,
        subMetric: `${benchmark}% of revenue`,
        body: `Benchmark-derived IT spend estimate for ${snapshot.industry || "the selected industry"}.`,
        tone: "benchmark",
      },
      {
        title: "Key Pressure",
        badge: pressure.badge,
        value: pressure.label,
        subMetric: pressure.score ? `${pressure.score} research mentions` : "Research signals pending",
        body: pressure.description,
        tone: "pressure",
      },
    ];

    return `
      <section class="overview-kpi-section" aria-label="Business overview cards">
        <div class="overview-kpi-grid">
          ${cards.map((card) => `
            <article class="overview-kpi-card ${card.tone}">
              <div class="overview-kpi-topline">
                <span>${escapeHtml(card.title)}</span>
                <span class="overview-kpi-badge">${escapeHtml(card.badge)}</span>
              </div>
              <div class="overview-kpi-value">${escapeHtml(card.value)}</div>
              <div class="overview-kpi-submetric">${escapeHtml(card.subMetric)}</div>
              <p>${escapeHtml(card.body)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderPriorityInsights(business) {
    const company = currentPriorityCompany();
    const profile = activeCaseCompanyProfile(state.activeCase);
    const payload = business || state.business || {};
    const insights = payload.priorityInsights || buildPriorityInsights(company);
    const evidenceSnippets = businessAnnualReportEvidenceSnippets(payload);
    if (!evidenceSnippets.length) {
      const sources = annualReportSourceLinks(company, profile);
      const loading = annualReportAnalysisInProgress();
      return `
        <section class="section priority-insights-section source-required" data-priority-insights>
          <div class="section-heading">
            <div>
              <h2>Business Priorities Value Tree</h2>
              <p class="muted">${loading ? "Annual-report evidence is being extracted for company-specific priorities and value levers." : "Annual report, investor material, or press-release evidence must be loaded before this section generates company-specific value-tree priorities."}</p>
            </div>
          </div>
          ${loading ? renderAnnualReportAnalysisLoader(
            "AI analysing annual report for Business Priorities Value Tree",
            "Reading the uploaded report for priority signals, value levers, leadership commentary, financial targets and risk evidence."
          ) : ""}
          <div class="priority-value-tree-empty">
            <div class="block-label">Source required</div>
            <h3>${escapeHtml(loading ? "Value tree generation in progress" : "Upload annual report to generate value levers")}</h3>
            <p>${escapeHtml(loading
              ? "The uploaded report is being analysed. This area will become a Revenue | Cost | Risk value tree with EBITDA benefit ranges and proposal ideas."
              : `No ${company.name || "company"} annual-report or investor-result snippets are loaded yet, so the app is withholding business-priority value claims.`)}</p>
            ${renderOutsideInSources(sources)}
          </div>
        </section>
      `;
    }
    const resolved = hasPriorityInsights(insights) && (businessHasAnnualReportEvidence(payload) || !priorityInsightsNeedSourceRefresh(insights, company))
      ? insights
      : buildPriorityInsights(company);
    const themeRows = outsideInThemeRows(payload, evidenceSnippets);
    return `
      <section class="section priority-insights-section" data-priority-insights>
        <div class="section-heading">
          <div>
            <h2>Business Priorities Value Tree</h2>
            <p class="muted">Source-backed annual-report priorities merged into Revenue, Cost and Risk technology levers with directional EBITDA benefits.</p>
          </div>
        </div>
        ${renderPriorityValueEvidenceStrip(resolved)}
        ${renderTechnologyValueTree(payload, themeRows, resolved)}
      </section>
    `;
  }

  function priorityInsightItems(insights) {
    return [
      ...(Array.isArray(insights && insights.industryTrends) ? insights.industryTrends.map((item) => ({ ...item, type: "Industry trend" })) : []),
      ...(Array.isArray(insights && insights.businessPriorities) ? insights.businessPriorities.map((item) => ({ ...item, type: "Business priority" })) : []),
    ].filter((item) => String(item.title || item.summary || "").trim());
  }

  function renderPriorityValueEvidenceStrip(insights) {
    const items = priorityInsightItems(insights).slice(0, 4);
    if (!items.length) return "";
    return `
      <div class="priority-value-strip">
        ${items.map((item) => `
          <article>
            <span>${escapeHtml(item.type || "Priority signal")}</span>
            <strong>${escapeHtml(cleanNarrativeFragment(item.title || item.summary, 92))}</strong>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderPriorityColumn(title, items) {
    const rows = items && items.length ? items : [];
    return `
      <div class="priority-column">
        <h3>${escapeHtml(title)}</h3>
        <div class="priority-card-list">
          ${rows.map((item, index) => renderPriorityItem(item, title, index)).join("")}
        </div>
      </div>
    `;
  }

  function priorityProposalIdea(item, columnTitle) {
    const text = `${item && item.title || ""} ${item && item.summary || ""}`.toLowerCase();
    const company = currentPriorityCompany();
    const companyName = company.name || "the company";
    if (/risk|security|cyber|resilien|compliance|regulat|control|fraud|trust/.test(text)) {
      return `Make trust measurable: propose a board-visible resilience and control cockpit that links cyber, operational risk and customer-impact evidence.`;
    }
    if (/cost|efficien|productivity|simplif|margin|operating model|automation/.test(text)) {
      return `Self-fund the change: target one high-cost operating process and prove automation savings that can finance the next wave of modernisation.`;
    }
    if (/growth|customer|loyalty|digital|channel|market|conversion|retention|experience/.test(text)) {
      return `Win the next customer moment: use data, AI and journey redesign to turn this priority into a measurable growth experiment.`;
    }
    if (/\bai\b|data|analytics|insight|predictive|personal|model/.test(text)) {
      return `Move beyond pilots: anchor governed AI in one executive KPI so ${companyName} can prove value, risk control and adoption together.`;
    }
    if (/cloud|platform|legacy|moderni|core|infrastructure|architecture/.test(text)) {
      return `Turn legacy drag into speed: identify the platform constraint that most delays change and build a value case for modernisation.`;
    }
    if (/supply|fulfil|inventory|availability|store|pricing|category/.test(text)) {
      return `Compete on execution: connect supply, store and digital data to a live availability and margin-improvement use case.`;
    }
    return /industry/i.test(columnTitle || "")
      ? `Treat this trend as a trigger: test where ${companyName} is exposed, where peers are moving faster, and which technology bet changes the economics.`
      : `Turn this priority into a deal thesis: define the sponsor, KPI, technology lever and 90-day proof point before the next executive meeting.`;
  }

  function renderPriorityItem(item, columnTitle, index) {
    const sources = Array.isArray(item.sources) ? item.sources : [];
    const quote = item.quote || "";
    const section = item.section || "";
    const proposal = priorityProposalIdea(item || {}, columnTitle);
    const label = /industry/i.test(columnTitle || "") ? "Market signal" : "Business priority";
    return `
      <article class="priority-item">
        <div class="priority-card-topline">
          <span>${escapeHtml(label)}</span>
          <b>${String(index + 1).padStart(2, "0")}</b>
        </div>
        ${section ? `<div class="priority-evidence-section">${escapeHtml(section)}</div>` : ""}
        <h4>${escapeHtml(item.title || "")}</h4>
        <p>${escapeHtml(item.summary || "")}</p>
        <div class="priority-proposal">
          <span>Provocative proposal</span>
          <strong>${escapeHtml(proposal)}</strong>
        </div>
        ${quote ? `<blockquote class="priority-quote">${escapeHtml(quote)}</blockquote>` : ""}
        <div class="priority-source-links">
          ${sources.map((source) => `
            <a href="${attr(source.url || "#")}" target="_blank" rel="noopener">${escapeHtml(source.label || "Source")}</a>
          `).join("")}
        </div>
      </article>
    `;
  }

  function renderResearchFirmPriorities(priorities) {
    const company = currentPriorityCompany();
    const rows = mergeResearchFirmPriorities(priorities, company);
    const researchedSummary = state.business && state.business.industryResearchSummary
      ? state.business.industryResearchSummary
      : researchExecutiveSummary(rows, company);
    return `
      <section class="section research-firm-section" data-research-firm-priorities>
        <div class="section-heading">
          <div>
            <h2>Industry Research Priorities</h2>
            <p class="muted">Current industry findings interpreted against the selected company's market, financial and operating context.</p>
          </div>
        </div>
        <p class="research-executive-summary">${escapeHtml(researchedSummary)}</p>
        ${renderResearchSpiderDiagram(rows, company)}
        <div class="research-firm-grid">
          ${rows.map(renderResearchFirmCard).join("")}
        </div>
      </section>
    `;
  }

  function renderResearchFirmCard(item) {
    const sources = Array.isArray(item.sources) ? item.sources : [];
    const reportMeta = [item.reportTitle || item.report_title, item.publicationDate || item.publication_date]
      .filter(Boolean)
      .join(" | ");
    return `
      <article class="research-firm-card">
        <div class="research-firm-name">${escapeHtml(item.firm || "Research")}</div>
        ${reportMeta ? `<div class="research-report-meta">${escapeHtml(reportMeta)}</div>` : ""}
        <h3>${escapeHtml(cleanResearchDisplayText(item.priority || ""))}</h3>
        <div class="research-finding-label">Research finding</div>
        <p>${escapeHtml(cleanResearchDisplayText(item.signal || ""))}</p>
        <div class="research-finding-label">Company read-through</div>
        <div class="research-implication">${escapeHtml(cleanResearchDisplayText(item.implication || ""))}</div>
        <div class="priority-source-links">
          ${sources.map((source) => `
            <a href="${attr(source.url || "#")}" target="_blank" rel="noopener">${escapeHtml(source.label || "Source")}</a>
          `).join("")}
        </div>
      </article>
    `;
  }

  function renderSnapshot(snapshot) {
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Company Snapshot</h2>
            <p class="muted">Account identity, scale, and market context for the downstream narrative.</p>
          </div>
        </div>
        <div class="snapshot-layout">
          <div class="snapshot-block overview">
            <div class="block-label">Profile</div>
            ${snapshotField("description", "One-line Description", snapshot.description, "textarea")}
          </div>
          <div class="snapshot-block">
            <div class="block-label">Identity</div>
            <div class="snapshot-pair-grid">
              ${snapshotField("hq", "HQ", snapshot.hq)}
              ${snapshotField("hqCountry", "HQ Country", snapshot.hqCountry)}
              ${snapshotField("industry", "Industry", snapshot.industry)}
              ${snapshotField("primaryIndustry", "Primary Industry", snapshot.primaryIndustry)}
              ${snapshotField("subSector", "Sub-sector", snapshot.subSector)}
              ${snapshotField("ticker", "Ticker", snapshot.ticker)}
              ${snapshotField("cik", "CIK", snapshot.cik)}
              ${snapshotField("companyNumber", "Company Number", snapshot.companyNumber)}
            </div>
          </div>
          <div class="snapshot-block">
            <div class="block-label">Scale</div>
            <div class="snapshot-pair-grid">
              ${snapshotField("employees", "Employees", snapshot.employees)}
              ${snapshotField("revenue", "Revenue", snapshot.revenue)}
              ${snapshotField("annualRevenueUsd", "Annual Revenue, USD", snapshot.annualRevenueUsd)}
              ${snapshotField("ebitdaUsd", "EBITDA, USD", snapshot.ebitdaUsd)}
              ${snapshotField("totalAssetsUsd", "Total Assets, USD", snapshot.totalAssetsUsd)}
              ${snapshotField("netProfit", "Net Profit", snapshot.netProfit)}
              ${snapshotField("fiscalYear", "Fiscal Year", snapshot.fiscalYear)}
            </div>
          </div>
          <div class="snapshot-block">
            <div class="block-label">Digital Presence</div>
            <div class="snapshot-pair-grid">
              ${snapshotField("website", "Website", snapshot.website)}
              ${snapshotField("domain", "Domain", snapshot.domain)}
            </div>
          </div>
          <div class="snapshot-block overview">
            <div class="block-label">Market Context</div>
            ${snapshotField("sharePriceNotes", "Share Price / Source Validation Context", snapshot.sharePriceNotes, "textarea")}
          </div>
        </div>
      </section>
    `;
  }

  function snapshotField(key, label, value, type) {
    const field = type === "textarea"
      ? `<textarea data-snapshot="${key}">${escapeHtml(value || "")}</textarea>`
      : `<input data-snapshot="${key}" value="${attr(value || "")}">`;
    return `<label class="field"><span>${escapeHtml(label)}</span>${field}${provenanceChip(key)}${disputeChip(key)}</label>`;
  }

  function disputeChip(key) {
    const snap = (state.business && state.business.snapshot) || {};
    const disputes = snap.fieldDisputes || {};
    const entries = disputes[key];
    if (!Array.isArray(entries) || entries.length < 2) return "";
    const alts = entries.map(function (e) {
      return `${e.value}${e.source ? " (" + shortSource(e.source) + ")" : ""}`;
    }).join("  vs  ");
    return `<span class="dispute-chip" title="Sources disagree: ${attr(alts)}">`
      + `<span class="dispute-mark" aria-hidden="true">&#9888;</span>`
      + `Disputed &middot; ${entries.length} sources differ</span>`;
  }

  function shortSource(text) {
    const t = String(text || "");
    if (/sec edgar|companyfacts|\bsec\b/i.test(t)) return "SEC EDGAR";
    if (/yahoo finance/i.test(t)) return "Yahoo Finance";
    if (/companies house/i.test(t)) return "Companies House";
    if (/openfigi/i.test(t)) return "OpenFIGI";
    if (/perplexity/i.test(t)) return "Perplexity";
    if (/chatgpt|openai/i.test(t)) return "ChatGPT";
    if (/google/i.test(t)) return "Google";
    if (/annual report/i.test(t)) return "Annual report";
    if (/local/i.test(t)) return "Local index";
    if (/selected company lookup/i.test(t)) return "Company lookup";
    return t.length > 24 ? t.slice(0, 24) + "…" : t;
  }

  function provenanceChip(key) {
    const snap = (state.business && state.business.snapshot) || {};
    const sources = snap.fieldSources || {};
    const meta = sources[key];
    if (!meta || !meta.source) return "";
    const conf = String(meta.confidence || "medium").toLowerCase();
    const confClass = conf === "high" ? "high" : conf === "low" ? "low" : "med";
    const confLabel = conf === "high" ? "High" : conf === "low" ? "Low" : "Med";
    return `<span class="prov-chip conf-${confClass}" title="Source: ${attr(meta.source)}">`
      + `<span class="prov-dot"></span>${escapeHtml(shortSource(meta.source))}`
      + `<span class="prov-conf">${confLabel}</span></span>`;
  }

  function renderFinancialTrend(business) {
    const rows = business.financialTrends || [];
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Five-Year Financial & Strategic Priority Trend</h2>
            <p class="muted">Year-on-year financial inputs with quick lookups against Google Finance, Yahoo Finance, annual reports, and Bing.</p>
          </div>
        </div>
        ${renderFinancialExecutiveSummary(business)}
        ${renderFinancialLineChart(business)}
        <div class="spacer"></div>
        <details class="financial-table-toggle" data-financial-table-toggle ${state.financialTableOpen ? "open" : ""}>
          <summary>
            <span class="collapse-arrow" aria-hidden="true">&gt;</span>
            <span>Editable financial data table</span>
            <span class="case-meta">${rows.length} rows</span>
          </summary>
          <div class="financial-table-panel">
            <div class="table-panel-heading">
              <div>
                <h3>Financial Inputs</h3>
                <p class="muted">Open this table when you need to edit values or use source-search links.</p>
              </div>
              ${addRowButton("financialTrends")}
            </div>
            ${renderFinancialTrendTable(rows)}
          </div>
        </details>
      </section>
    `;
  }

  function averageMetric(rows, key) {
    const values = (rows || []).map((row) => metricNumber(row[key])).filter((value) => value != null);
    if (!values.length) return null;
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  function formatPointDelta(value) {
    if (value == null || !Number.isFinite(value)) return "n/a";
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? "+" : ""}${rounded} pts`;
  }

  function formatPercentValue(value) {
    if (value == null || !Number.isFinite(value)) return "n/a";
    return `${Math.round(value * 10) / 10}%`;
  }

  function joinReadableList(items) {
    const clean = (items || []).filter(Boolean);
    if (clean.length <= 1) return clean[0] || "";
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
    return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
  }

  function renderFinancialExecutiveSummary(business) {
    const trendRows = (business.financialTrends || []).filter((row) => String(row.year || "").trim());
    const latest = latestFinancialTrendRow(business);
    const firstRevenueRow = trendRows.find((row) => parseCurrencyAmount(row.revenue) != null) || {};
    const firstRevenue = parseCurrencyAmount(firstRevenueRow.revenue);
    const latestRevenue = parseCurrencyAmount(latest.revenue);
    const revenueChange = firstRevenue && latestRevenue != null
      ? ((latestRevenue - firstRevenue) / firstRevenue) * 100
      : null;
    const firstOperatingRow = trendRows.find((row) => metricNumber(row.operatingMargin) != null) || {};
    const firstOperating = metricNumber(firstOperatingRow.operatingMargin);
    const latestOperating = metricNumber(latest.operatingMargin);
    const latestGrowth = metricNumber(latest.yoyGrowth);
    const marginMove = firstOperating != null && latestOperating != null ? latestOperating - firstOperating : null;
    const peerRows = topPeerComparisonRows(business);
    const peerOnlyRows = peerRows.filter((row) => !row.isCustomer);
    const peerOperatingAverage = averageMetric(peerOnlyRows, "operatingMargin");
    const peerGrowthAverage = averageMetric(peerOnlyRows, "cagr3");
    const operatingGap = latestOperating != null && peerOperatingAverage != null ? latestOperating - peerOperatingAverage : null;
    const peerGapText = operatingGap == null ? "" : formatPointDelta(Math.abs(operatingGap)).replace(/^\+/, "");
    const researchRows = mergeResearchFirmPriorities(business.researchFirmPriorities, currentPriorityCompany());
    const topThemes = researchTopicFrequencies(researchRows)
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 3)
      .map((item) => item.label);
    const companyName = (state.activeCase && state.activeCase.company_name) || "The company";
    const revenuePhrase = revenueChange == null
      ? `latest reported revenue is ${latest.revenue || "not yet populated"}`
      : `revenue has moved from ${firstRevenueRow.revenue} to ${latest.revenue}, a ${formatPercentValue(revenueChange)} change across the period`;
    const marginPhrase = marginMove == null
      ? "operating margin trend needs validation before targets are set"
      : `operating margin has improved by ${formatPointDelta(marginMove)} to ${formatPercentValue(latestOperating)}`;
    const peerPhrase = operatingGap == null
      ? "peer margin position is not yet benchmarked"
      : `current operating margin is ${peerGapText} ${operatingGap >= 0 ? "above" : "below"} the peer average`;
    const peerActionSignal = operatingGap == null
      ? "peer margin benchmark"
      : `${peerGapText} peer margin ${operatingGap >= 0 ? "advantage" : "gap"}`;
    const researchPhrase = topThemes.length
      ? `Industry research is clustering around ${joinReadableList(topThemes)}, so the financial agenda should connect growth and margin performance to trusted digital execution.`
      : "Industry research themes should be refreshed before final executive advice is published.";
    const actions = [
      `For the CEO, protect revenue momentum by linking modernization to customer trust, faster digital journeys, and defensible market differentiation.`,
      `For the CFO, use the ${peerActionSignal} to set productivity targets tied to automation, platform simplification, and operating resilience.`,
      `Prioritize AI, data, cloud and risk-control investments only where they can show measurable margin, growth, resilience, or customer-outcome impact.`,
    ];

    return `
      <div class="financial-executive-summary">
        <div>
          <div class="block-label">Executive Summary</div>
          <p>${escapeHtml(`${companyName} shows a stronger financial profile: ${revenuePhrase}, while ${marginPhrase}; ${peerPhrase}. ${researchPhrase}`)}</p>
        </div>
        <div class="financial-summary-metrics">
          <span><b>${escapeHtml(latest.revenue || "n/a")}</b> latest revenue</span>
          <span><b>${escapeHtml(latestGrowth == null ? "n/a" : formatPercentValue(latestGrowth))}</b> latest growth</span>
          <span><b>${escapeHtml(latestOperating == null ? "n/a" : formatPercentValue(latestOperating))}</b> operating margin</span>
          <span><b>${escapeHtml(operatingGap == null ? "n/a" : formatPointDelta(operatingGap))}</b> vs peer margin</span>
        </div>
        <ul>
          ${actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function financialMetricLabel(key) {
    return {
      revenue: "revenue",
      yoyGrowth: "year on year growth",
      operatingMargin: "operating margin",
      netMargin: "net margin",
    }[key] || key;
  }

  function activeFinancialCompany() {
    const snapshot = state.business && state.business.snapshot ? state.business.snapshot : {};
    return {
      name: state.activeCase ? state.activeCase.company_name : "company",
      ticker: snapshot.ticker || (state.activeCase ? state.activeCase.ticker : ""),
    };
  }

  function financialLookupLinks(row, key) {
    const company = activeFinancialCompany();
    const metric = financialMetricLabel(key);
    const companyName = company.name || "company";
    const ticker = company.ticker || companyName;
    const year = row.year || "latest year";
    const bingQuery = encodeURIComponent(`${companyName} ${year} ${metric}`);
    const annualQuery = encodeURIComponent(`${companyName} annual report ${year} ${metric}`);
    const financeQuery = encodeURIComponent(`${ticker} ${metric} financials`);
    return [
      { label: "Bing", url: `https://www.bing.com/search?q=${bingQuery}` },
      { label: "Google Finance", url: `https://www.google.com/search?q=${financeQuery}+Google+Finance` },
      { label: "Yahoo", url: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/financials` },
      { label: "Annual report", url: `https://www.bing.com/search?q=${annualQuery}` },
    ];
  }

  function financialMetricControl(row, index, field) {
    const common = `data-collection="financialTrends" data-index="${index}" data-key="${field.key}"`;
    if (field.key === "year") {
      return `<input type="text" ${common} value="${attr(row[field.key] || "")}">`;
    }
    return `
      <div class="metric-input">
        <input type="text" ${common} value="${attr(row[field.key] || "")}" inputmode="decimal">
        <div class="metric-source-links">
          ${financialLookupLinks(row, field.key)
            .map((link) => `<a href="${attr(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
            .join("")}
        </div>
      </div>
    `;
  }

  function renderFinancialTrendTable(rows) {
    const fields = tableDefs.financialTrends;
    return `
      <div class="table-wrap financial-table">
        <table>
          <thead>
            <tr>
              ${fields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join("")}
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${(rows || []).map((row, index) => `
              <tr>
                ${fields.map((field) => `<td>${financialMetricControl(row, index, field)}</td>`).join("")}
                <td class="tight">
                  <button class="btn icon secondary" type="button" title="Remove row" data-action="remove-row" data-collection="financialTrends" data-index="${index}">-</button>
                </td>
              </tr>
            `).join("") || `<tr><td colspan="${fields.length + 1}">No financial rows yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  function chartSeriesPoints(rows, key, width, height, padding) {
    const values = rows.map((row) => numberValue(row[key]));
    const numeric = values.filter((value) => Number.isFinite(value));
    if (numeric.length < 2) return "";
    const min = Math.min(...numeric);
    const max = Math.max(...numeric);
    const range = max - min || 1;
    return values
      .map((value, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(1, rows.length - 1);
        const y = height - padding - ((value - min) / range) * (height - padding * 2);
        return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
      })
      .join(" ");
  }

  function metricNumber(value) {
    const text = String(value || "").trim();
    if (!text || isValidationPlaceholder(text)) return null;
    const parsed = parseFloat(text.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function latestFinancialTrendRow(business) {
    const rows = Array.isArray(business.financialTrends) ? business.financialTrends : [];
    return [...rows].reverse().find((row) =>
      ["revenue", "yoyGrowth", "operatingMargin", "netMargin"].some((key) =>
        String(row[key] || "").trim() && !isValidationPlaceholder(row[key])
      )
    ) || {};
  }

  function industryPeerKey(value) {
    const text = normalizeLookupQuery(value);
    if (!text) return "";
    if (/(online retail|online retailer|digital retail|digital retailer|pure play retail|pureplay retail|ecommerce retail|e commerce retail|online shopping)/.test(text)) return "online-retail";
    if (/(airline|airlines|air passenger|low cost carrier|low-cost carrier|aviation|short haul|short-haul)/.test(text)) return "european-airlines";
    if (/(healthcare services|healthcare distribution|pharmaceutical distribution|pharma distribution|medtech distribution|medical device distribution|pharmaceutical services)/.test(text)) return "healthcare-services";
    if (/(biopharma|biopharmaceutical|pharmaceutical|drug manufacturer|life sciences)/.test(text)) return "pharmaceuticals";
    if (/(market research|consumer intelligence|consumer insights|audience measurement|opinion polling|survey research)/.test(text)) return "market-research";
    if (text.includes("uk retail")) return "uk-retail";
    if (/(it infrastructure|managed infrastructure|managed services|technology services|information technology services|it services|systems integration|technology consulting|it consulting|it outsourcing)/.test(text)) return "it-services";
    if (/(enterprise software|application software|software platform)/.test(text)) return "enterprise-software";
    if (/(hyperscaler|cloud platform|public cloud)/.test(text)) return "cloud-platform";
    if (/(insurance|insurer|assurance|retirement|pensions?|annuity)/.test(text)) return "insurance";
    if (/(financial|bank|capital|wealth|building society)/.test(text)) return "financial-services";
    if (/(software|cloud|technology|digital advertising|consumer electronics)/.test(text)) return "technology";
    if (/(telecom|telecommunications|connectivity|network)/.test(text)) return "telecommunications";
    if (/(energy|oil|gas|utilities)/.test(text)) return "energy";
    if (/(consumer goods|food and beverage|fmcg|packaged goods)/.test(text)) return "consumer-goods";
    if (/(retail|retailing|supermarket|grocery|fashion|homeware|value retailer)/.test(text)) return "retail";
    if (/(professional services|consulting)/.test(text)) return "professional-services";
    return text;
  }

  function prominentIndustryPeerGroup(...profiles) {
    const primaryContext = profiles
      .filter(Boolean)
      .map((profile) => [profile.primaryIndustry, profile.subSector, profile.industry, profile.description].filter(Boolean).join(" "))
      .filter(Boolean)
      .join(" ");
    const inferred = industryPeerKey(primaryContext);
    if (inferred) return inferred;
    const savedPeerGroup = profiles.map((profile) => profile && profile.peerGroup).find(Boolean) || "";
    return industryPeerKey(savedPeerGroup);
  }

  const validatedCompetitorProfiles = [
    {
      companyAliases: ["uniphar", "uniphar plc", "uniphar cdi"],
      peerGroup: "healthcare-services",
      label: "Healthcare services, medtech and pharma distribution",
      peerNames: [
        "McKesson Corporation",
        "Cencora, Inc.",
        "Cardinal Health, Inc.",
        "PHOENIX Pharma SE",
        "Medios AG",
      ],
      validationBasis: "Uniphar FY2025 operating model and healthcare distribution / pharma services peer screen",
    },
    {
      companyAliases: ["the very group", "the very group limited", "very group"],
      peerGroup: "online-retail",
      label: "UK multi-category online retail",
      peerNames: ["Next plc", "ASOS plc", "AO World plc", "THG plc", "N Brown Group plc"],
      validationBasis: "The Very Group FY2025 annual report and current online-retail peer filings",
    },
    {
      companyAliases: ["easyjet", "easyjet plc"],
      peerGroup: "european-airlines",
      label: "European low-cost and short-haul airlines",
      peerNames: [
        "Ryanair Holdings plc",
        "Wizz Air Holdings Plc",
        "Jet2 plc",
        "Norwegian Air Shuttle ASA",
        "International Consolidated Airlines Group S.A.",
      ],
      validationBasis: "easyJet FY2025 annual report, European route competition and latest peer annual filings",
    },
    {
      companyAliases: ["aviva", "aviva plc"],
      peerGroup: "insurance",
      label: "UK insurance, wealth and retirement",
      peerNames: [
        "Legal & General Group plc",
        "Phoenix Group Holdings plc",
        "Prudential plc",
        "Admiral Group plc",
        "M&G plc",
      ],
      validationBasis: "Aviva Annual Report 2025 business mix and latest listed insurance peer annual filings",
    },
    {
      companyAliases: ["kantar", "kantar group", "kantar group limited"],
      peerGroup: "market-research",
      label: "market research, consumer intelligence and audience measurement",
      peerNames: [
        "NIQ Global Intelligence plc",
        "Ipsos SA",
        "YouGov plc",
        "INTAGE HOLDINGS Inc.",
        "comScore, Inc.",
      ],
      validationBasis: "Kantar FY2025 investor materials and latest official peer filings",
    },
  ];

  function validatedCompetitorProfile(companyName) {
    const key = normalizeLookupQuery(companyName);
    return validatedCompetitorProfiles.find((profile) =>
      profile.companyAliases.some((alias) => key === normalizeLookupQuery(alias) || key.includes(normalizeLookupQuery(alias)))
    ) || null;
  }

  function industryMatches(left, right, leftPeerGroup, rightPeerGroup) {
    const a = industryPeerKey(leftPeerGroup || left);
    const b = industryPeerKey(rightPeerGroup || right);
    if (!a || !b) return false;
    if (a === b) return true;
    if (!rightPeerGroup && b === "retail" && a === "uk-retail") return true;
    if (!leftPeerGroup && a === "retail" && b === "uk-retail") return false;
    return false;
  }

  function peerRowMatchesContext(row, targetIndustry, targetPeerGroup, targetCompanyName = "") {
    const rowKey = normalizeLookupQuery(row.company);
    const profile = validatedCompetitorProfile(targetCompanyName);
    if (profile) {
      return profile.peerNames.some((name) => normalizeLookupQuery(name) === rowKey);
    }
    const fixture = publicCompanyFixtures().find((company) => normalizeLookupQuery(company.name) === rowKey);
    const rowIndustry = prominentIndustryPeerGroup(row, fixture) || row.peerGroup || row.subSector || row.industry || "";
    if (!rowIndustry) return false;
    return industryMatches(rowIndustry, targetIndustry, row.peerGroup || (fixture && fixture.peerGroup), targetPeerGroup);
  }

  function fixturePeerRow(company) {
    const rows = buildCompanyFinancialRows(company);
    const latest = [...rows].reverse().find((row) => String(row.revenue || "").trim()) || {};
    const latestOperating = metricNumber(latest.operatingMargin) != null ? latest.operatingMargin : "";
    const latestGrowth = metricNumber(latest.yoyGrowth) != null ? latest.yoyGrowth : "";
    return {
      company: company.name || "",
      enabled: true,
      revenue: latest.revenue || company.revenue || "",
      annualRevenueUsd: company.annualRevenueUsd || "",
      hqCountry: company.hqCountry || company.hq || "",
      employees: company.employees || "",
      priorEmployees: company.priorEmployees || "",
      ebitdaUsd: company.ebitdaUsd || "",
      ebitda: company.ebitda || "",
      operatingProfitUsd: company.operatingProfitUsd || "",
      operatingProfit: company.operatingProfit || "",
      totalAssetsUsd: company.totalAssetsUsd || "",
      freeCashFlowUsd: company.freeCashFlowUsd || "",
      netDebtUsd: company.netDebtUsd || "",
      forecastRevenueUsd: company.forecastRevenueUsd || "",
      netProfit: company.netProfit || "",
      industry: company.industry || company.primaryIndustry || "",
      subSector: company.subSector || "",
      peerGroup: company.peerGroup || "",
      operatingMargin: latestOperating || company.peerMetrics?.operatingMargin || "",
      netMargin: latest.netMargin || calculateNetMargin(company.revenue, company.netProfit),
      cagr3: latestGrowth || company.peerMetrics?.cagr3 || "",
      source: "lookup",
    };
  }

  function enrichedPeerComparisonRow(profile) {
    const revenueUsd = usdAmountFromValue(profile.annualRevenueUsd) || usdAmountFromValue(profile.revenue);
    const operatingProfitUsd = usdAmountFromValue(profile.operatingProfitUsd) || usdAmountFromValue(profile.operatingProfit);
    const derivedOperatingMargin = revenueUsd != null && operatingProfitUsd != null && revenueUsd !== 0
      ? Math.round(((operatingProfitUsd / revenueUsd) * 100) * 100) / 100
      : "";
    const peerKey = industryPeerKey(profile.peerGroup || profile.subSector || profile.primaryIndustry || profile.industry);
    const preferOperatingProfit = ["insurance", "financial-services"].includes(peerKey);
    return {
      company: profile.company || profile.name || "",
      ticker: profile.ticker || "",
      enabled: true,
      revenue: profile.revenue || annualRevenueUsdDisplay(profile.annualRevenueUsd) || "",
      annualRevenueUsd: profile.annualRevenueUsd || "",
      employees: profile.employees || "",
      priorEmployees: profile.priorEmployees || "",
      ebitda: profile.ebitda || "",
      ebitdaUsd: profile.ebitdaUsd || "",
      operatingProfit: profile.operatingProfit || "",
      operatingProfitUsd: profile.operatingProfitUsd || "",
      totalAssets: profile.totalAssets || "",
      totalAssetsUsd: profile.totalAssetsUsd || "",
      freeCashFlow: profile.freeCashFlow || "",
      freeCashFlowUsd: profile.freeCashFlowUsd || "",
      netDebt: profile.netDebt || "",
      netDebtUsd: profile.netDebtUsd || "",
      forecastRevenueUsd: profile.forecastRevenueUsd || "",
      netProfit: profile.netProfit || "",
      industry: profile.industry || profile.primaryIndustry || "",
      subSector: profile.subSector || "",
      peerGroup: profile.peerGroup || "",
      operatingMargin: preferOperatingProfit
        ? derivedOperatingMargin || profile.operatingMargin || profile.ebitdaMargin || ""
        : profile.operatingMargin || profile.ebitdaMargin || derivedOperatingMargin || "",
      netMargin: calculateNetMargin(profile.revenue, profile.netProfit),
      cagr3: profile.revenueGrowth || "",
      source: profile.source || "Perplexity/Yahoo peer enrichment",
    };
  }

  function peerRowWithDerivedOperatingMargin(row) {
    const existingMargin = metricNumber(row && row.operatingMargin);
    if (existingMargin != null) return { ...row, operatingMargin: Math.round(existingMargin * 100) / 100 };
    const revenueUsd = usdAmountFromValue(row && row.annualRevenueUsd)
      || usdAmountFromValue(row && (row.revenueOriginal || row.revenue), row && row.revenueSourceCurrency || "USD");
    const operatingProfitUsd = usdAmountFromValue(row && row.operatingProfitUsd)
      || usdAmountFromValue(row && row.operatingProfit);
    if (revenueUsd == null || operatingProfitUsd == null || revenueUsd === 0) return row;
    return { ...row, operatingMargin: Math.round(((operatingProfitUsd / revenueUsd) * 100) * 100) / 100 };
  }

  function topPeerComparisonRows(business) {
    const snapshot = business.snapshot || {};
    const latest = latestFinancialTrendRow(business);
    const currentName = (state.activeCase && state.activeCase.company_name) || snapshot.name || "Selected company";
    const activeCompanyKey = normalizeLookupQuery(currentName);
    const targetMatch = lookupMatchForValueCase(state.activeCase) || localCompanyLookup(snapshot.name || currentName).matches[0] || null;
    const targetIndustry = snapshot.industry || (state.activeCase && state.activeCase.industry) || (targetMatch && targetMatch.industry) || "";
    const validationProfile = validatedCompetitorProfile(currentName);
    const targetPeerGroup = (validationProfile && validationProfile.peerGroup) || prominentIndustryPeerGroup(snapshot, targetMatch, state.activeCase) || snapshot.peerGroup || (targetMatch && targetMatch.peerGroup) || "";
    const targetCurrency = localCurrencyForBusiness(business);
    const targetEnriched = state.privateEquityPeerData[activeCompanyKey] || {};
    const firstUsableValue = (...values) => values.find((value) =>
      value != null && String(value).trim() && !isValidationPlaceholder(value)
    ) || "";
    const targetField = (key, ...fallbacks) => firstUsableValue(...fallbacks, targetEnriched[key]);
    const activeCompanyKeys = new Set([
      activeCompanyKey,
      normalizeLookupQuery(snapshot.name),
      normalizeLookupQuery(targetMatch && targetMatch.name),
      normalizeLookupQuery(targetMatch && targetMatch.legalName),
    ].filter(Boolean));
    const current = normalizeRevenueRow({
      company: currentName,
      enabled: true,
      revenue: targetField("revenue", latest.revenue, snapshot.revenue, annualRevenueUsdDisplay(snapshot.annualRevenueUsd)),
      annualRevenueUsd: targetField("annualRevenueUsd", snapshot.annualRevenueUsd),
      employees: targetField("employees", snapshot.employees, targetMatch && targetMatch.employees),
      priorEmployees: targetField("priorEmployees", snapshot.priorEmployees, targetMatch && targetMatch.priorEmployees),
      ebitda: targetField("ebitda", snapshot.ebitda, targetMatch && targetMatch.ebitda),
      ebitdaUsd: targetField("ebitdaUsd", snapshot.ebitdaUsd, targetMatch && targetMatch.ebitdaUsd),
      operatingProfit: targetField("operatingProfit", snapshot.operatingProfit, targetMatch && targetMatch.operatingProfit),
      operatingProfitUsd: targetField("operatingProfitUsd", snapshot.operatingProfitUsd, targetMatch && targetMatch.operatingProfitUsd),
      totalAssets: targetField("totalAssets", snapshot.totalAssets, targetMatch && targetMatch.totalAssets),
      totalAssetsUsd: targetField("totalAssetsUsd", snapshot.totalAssetsUsd, targetMatch && targetMatch.totalAssetsUsd),
      freeCashFlow: targetField("freeCashFlow", snapshot.freeCashFlow, targetMatch && targetMatch.freeCashFlow),
      freeCashFlowUsd: targetField("freeCashFlowUsd", snapshot.freeCashFlowUsd, targetMatch && targetMatch.freeCashFlowUsd),
      netDebt: targetField("netDebt", snapshot.netDebt, targetMatch && targetMatch.netDebt),
      netDebtUsd: targetField("netDebtUsd", snapshot.netDebtUsd, targetMatch && targetMatch.netDebtUsd),
      forecastRevenueUsd: targetField("forecastRevenueUsd", snapshot.forecastRevenueUsd, targetMatch && targetMatch.forecastRevenueUsd),
      netProfit: targetField("netProfit", snapshot.netProfit, targetMatch && targetMatch.netProfit),
      operatingMargin: targetField("operatingMargin", targetEnriched.ebitdaMargin, latest.operatingMargin, targetMatch && targetMatch.peerMetrics && targetMatch.peerMetrics.operatingMargin),
      netMargin: latest.netMargin || calculateNetMargin(snapshot.revenue, snapshot.netProfit),
      cagr3: latest.yoyGrowth || targetEnriched.revenueGrowth || (targetMatch && targetMatch.peerMetrics && targetMatch.peerMetrics.cagr3) || "",
      isCustomer: true,
    }, targetCurrency);
    const candidates = [
      ...activePeers(business).filter((row) => peerRowMatchesContext(row, targetIndustry, targetPeerGroup, currentName)),
      ...Object.values(state.privateEquityPeerData || {})
        .map(enrichedPeerComparisonRow)
        .filter((row) => peerRowMatchesContext(row, targetIndustry, targetPeerGroup, currentName)),
      ...publicCompanyFixtures()
        .filter((company) =>
          !activeCompanyKeys.has(normalizeLookupQuery(company.name)) &&
          peerRowMatchesContext({
            company: company.name,
            industry: company.industry,
            subSector: company.subSector,
            peerGroup: company.peerGroup,
          }, targetIndustry, targetPeerGroup, currentName)
        )
        .map(fixturePeerRow),
    ];
    const seen = new Set();
    const peers = candidates
      .map(peerRowWithDerivedOperatingMargin)
      .map((row) => normalizeRevenueRow(row, targetCurrency))
      .filter((row) => {
        const key = normalizeLookupQuery(row.company);
        if (!key || key === activeCompanyKey || seen.has(key)) return false;
        seen.add(key);
        return row.revenueBillions != null || ["operatingMargin", "cagr3"].some((metric) => metricNumber(row[metric]) != null);
      })
      .sort((a, b) => (b.revenueBillions || 0) - (a.revenueBillions || 0))
      .slice(0, 5);
    const rows = [current, ...peers].filter((row) =>
      row.revenueBillions != null || ["operatingMargin", "cagr3"].some((metric) => metricNumber(row[metric]) != null)
    );
    return rows;
  }

  function peerValidationSummary(business) {
    const snapshot = business.snapshot || {};
    const currentName = (state.activeCase && state.activeCase.company_name) || snapshot.name || "Selected company";
    const profile = validatedCompetitorProfile(currentName);
    if (profile) {
      return `Validated as ${profile.label} peers using ${profile.validationBasis}. Hyperscalers and software vendors are excluded where they are alliance partners rather than like-for-like competitors.`;
    }
    const peerGroup = prominentIndustryPeerGroup(snapshot, state.activeCase) || snapshot.peerGroup || snapshot.subSector || snapshot.industry || (state.activeCase && state.activeCase.industry) || "the selected industry";
    return `Peer candidates are included only when their validated industry or sub-sector matches ${peerGroup}; unclassified and cross-industry companies are excluded.`;
  }

  function positivePlainNumber(value) {
    const text = String(value == null ? "" : value).trim();
    if (!text || isValidationPlaceholder(text)) return null;
    const parsed = Number(text.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function usdAmountFromValue(value, fallbackCurrency = "USD") {
    const text = String(value == null ? "" : value).trim();
    if (!text || isValidationPlaceholder(text)) return null;
    if (/^[0-9,]+(?:\.\d+)?$/.test(text)) {
      const plain = Number(text.replace(/,/g, ""));
      return Number.isFinite(plain) ? plain : null;
    }
    const parsed = parseCurrencyMetric(text);
    if (!parsed || !Number.isFinite(parsed.billions)) return null;
    const usdBillions = convertCurrencyBillions(parsed.billions, parsed.currency || fallbackCurrency, "USD");
    return Number.isFinite(usdBillions) ? usdBillions * 1e9 : null;
  }

  function privateEquityMetricRows(business) {
    return topPeerComparisonRows(business).map((row) => {
      const fixture = publicCompanyFixtures().find((company) => normalizeLookupQuery(company.name) === normalizeLookupQuery(row.company));
      const enriched = state.privateEquityPeerData[normalizeLookupQuery(row.company)] || {};
      const fieldValues = (key) => row.isCustomer
        ? [row[key], fixture && fixture[key], enriched[key]]
        : [enriched[key], fixture && fixture[key], row[key]];
      const field = (key) => fieldValues(key).find((value) =>
        value != null && String(value).trim() && !isValidationPlaceholder(value)
      ) || "";
      const revenueUsd = usdAmountFromValue(field("annualRevenueUsd")) || usdAmountFromValue(field("revenue") || row.revenueOriginal || row.revenue, row.revenueSourceCurrency || "USD");
      const ebitdaUsd = usdAmountFromValue(field("ebitdaUsd") || field("ebitda"));
      const operatingProfitUsd = usdAmountFromValue(field("operatingProfitUsd") || field("operatingProfit"));
      const totalAssetsUsd = usdAmountFromValue(field("totalAssetsUsd") || field("totalAssets"));
      const freeCashFlowUsd = usdAmountFromValue(field("freeCashFlowUsd") || field("freeCashFlow"));
      const netDebtUsd = usdAmountFromValue(field("netDebtUsd") || field("netDebt"));
      const netIncomeUsd = usdAmountFromValue(field("netProfit"));
      const forecastRevenueUsd = usdAmountFromValue(field("forecastRevenueUsd"));
      const employees = positivePlainNumber(field("employees"));
      const priorEmployees = positivePlainNumber(field("priorEmployees"));
      const revenueGrowth = metricNumber(row.cagr3 || enriched.revenueGrowth);
      const operatingMargin = metricNumber(row.operatingMargin || enriched.operatingMargin || enriched.ebitdaMargin);
      const rowPeerKey = industryPeerKey(row.peerGroup || row.subSector || row.industry);
      const preferOperatingProfit = ["insurance", "financial-services"].includes(rowPeerKey);
      const marginProfitUsd = revenueUsd != null && operatingMargin != null ? revenueUsd * operatingMargin / 100 : null;
      const earningsUsd = preferOperatingProfit
        ? operatingProfitUsd ?? marginProfitUsd ?? ebitdaUsd
        : ebitdaUsd ?? operatingProfitUsd ?? marginProfitUsd;
      const earningsBasis = preferOperatingProfit && operatingProfitUsd != null
        ? "Reported operating profit"
        : preferOperatingProfit && marginProfitUsd != null
          ? "Operating profit from sourced margin"
          : ebitdaUsd != null
            ? "Reported EBITDA"
            : operatingProfitUsd != null
              ? "Reported operating profit"
              : "Earnings source required";
      const headcountGrowth = employees != null && priorEmployees != null
        ? ((employees - priorEmployees) / priorEmployees) * 100
        : null;
      return {
        ...row,
        revenuePerEmployee: revenueUsd != null && employees ? revenueUsd / employees : null,
        ebitdaPerEmployee: earningsUsd != null && employees ? earningsUsd / employees : null,
        ebitdaMargin: earningsUsd != null && revenueUsd ? (earningsUsd / revenueUsd) * 100 : operatingMargin,
        earningsBasis,
        revenueGrowth,
        headcountGrowth,
        productivitySpread: revenueGrowth != null && headcountGrowth != null ? revenueGrowth - headcountGrowth : null,
        forwardRevenuePerEmployee: forecastRevenueUsd != null && employees ? forecastRevenueUsd / employees : null,
        roa: netIncomeUsd != null && totalAssetsUsd ? (netIncomeUsd / totalAssetsUsd) * 100 : metricNumber(enriched.returnOnAssets),
        fcfConversion: freeCashFlowUsd != null && earningsUsd ? (freeCashFlowUsd / earningsUsd) * 100 : null,
        leverage: netDebtUsd != null && earningsUsd ? netDebtUsd / earningsUsd : null,
      };
    });
  }

  function privateEquityPeerRequests(business) {
    return topPeerComparisonRows(business).map((row) => {
      const fixture = publicCompanyFixtures().find((company) => normalizeLookupQuery(company.name) === normalizeLookupQuery(row.company));
      return {
        company: row.company,
        ticker: (fixture && fixture.ticker) || row.ticker || "",
      };
    });
  }

  function hydratePrivateEquityAnalysis(business, caseId = state.activeCaseId) {
    const saved = business && business.privateEquityAnalysis && typeof business.privateEquityAnalysis === "object"
      ? business.privateEquityAnalysis
      : null;
    const profiles = saved && Array.isArray(saved.profiles) ? saved.profiles : [];
    const enriched = {};
    profiles.forEach((profile) => {
      if (!profile || typeof profile !== "object") return;
      const name = profile.company || profile.name || "";
      if (name) enriched[normalizeLookupQuery(name)] = profile;
    });
    state.privateEquityPeerData = enriched;
    state.privateEquityLoadedFor = caseId || "";
    if (profiles.length) {
      const refreshedLabel = saved.refreshedAt ? dateLabel(saved.refreshedAt) : "an earlier analysis run";
      state.privateEquityStatus = `Loaded saved peer analysis from ${refreshedLabel}. Use Refresh Analysis to update it.`;
    } else {
      state.privateEquityStatus = "No saved Private Equity Analysis is available yet. Use Refresh Analysis to research and save it.";
    }
  }

  async function refreshPrivateEquityPeerData(options = {}) {
    if (!state.business || state.privateEquityLoading) return;
    const caseId = state.activeCaseId;
    const snapshot = state.business.snapshot || {};
    const peers = privateEquityPeerRequests(state.business);
    state.privateEquityLoading = true;
    state.privateEquityStatus = "Discovering industry peers and researching missing financial fields in parallel...";
    if (!options.silent || state.view === "deep" || state.view === "financial" || state.view === "ai") render();
    try {
      const data = await api("/api/private-equity-peer-data", {
        method: "POST",
        body: JSON.stringify({
          peers,
          company_name: (state.activeCase && state.activeCase.company_name) || snapshot.name || "",
          industry: snapshot.primaryIndustry || snapshot.industry || (state.activeCase && state.activeCase.industry) || "",
          sub_sector: snapshot.subSector || "",
          peer_group: snapshot.peerGroup || "",
        }),
        timeoutMs: 180000,
      });
      if (state.activeCaseId !== caseId) return;
      const profiles = Array.isArray(data.profiles) ? data.profiles : [];
      const enriched = {};
      profiles.forEach((profile) => {
        const requestedName = profile.company || profile.name || "";
        if (requestedName) enriched[normalizeLookupQuery(requestedName)] = profile;
      });
      state.privateEquityPeerData = enriched;
      state.privateEquityLoadedFor = state.activeCaseId || "";
      const refreshedAt = new Date().toISOString();
      const refreshMessage = data.message || `Refreshed ${profiles.length} peer profiles.`;
      state.privateEquityStatus = refreshMessage;
      const targetKey = normalizeLookupQuery((state.activeCase && state.activeCase.company_name) || snapshot.name || "");
      const targetProfile = profiles.find((profile) => normalizeLookupQuery(profile.company || profile.name) === targetKey);
      if (targetProfile) {
        [
          "ticker", "industry", "primaryIndustry", "subSector", "peerGroup", "hqCountry", "employees", "priorEmployees",
          "revenue", "annualRevenueUsd", "ebitda", "ebitdaUsd", "operatingProfit", "operatingProfitUsd", "totalAssets", "totalAssetsUsd", "netProfit",
          "freeCashFlow", "freeCashFlowUsd", "netDebt", "netDebtUsd", "forecastRevenueUsd",
        ].forEach((key) => {
          const currentValue = state.business.snapshot[key];
          if ((!currentValue || isValidationPlaceholder(currentValue)) && targetProfile[key] != null && String(targetProfile[key]).trim() && !isValidationPlaceholder(targetProfile[key])) {
            state.business.snapshot[key] = targetProfile[key];
          }
        });
      }
      const researchedPeers = profiles
        .filter((profile) => normalizeLookupQuery(profile.company || profile.name) !== targetKey)
        .map(enrichedPeerComparisonRow)
        .filter((row) => row.company);
      if (researchedPeers.length >= 2) {
        state.business.peers = researchedPeers;
        state.business.peerNarrative = `Validated dynamic peer set researched for ${snapshot.primaryIndustry || snapshot.industry || "the selected industry"}.`;
      }
      state.business.privateEquityAnalysis = {
        version: 1,
        refreshedAt,
        message: refreshMessage,
        researchStats: data.researchStats && typeof data.researchStats === "object" ? data.researchStats : {},
        profiles,
      };
      state.business.aiContext = buildBusinessAiContext(state.business);
      await saveBusinessPayloadForCase(caseId, JSON.parse(JSON.stringify(state.business)), { timeoutMs: 30000 });
      state.privateEquityStatus = `${refreshMessage} Saved to this Value Case.`;
    } catch (error) {
      state.privateEquityStatus = `Peer financial refresh deferred: ${error.message}`;
    } finally {
      state.privateEquityLoading = false;
      render();
    }
  }

  function privateEquityMedian(rows, key) {
    const values = (rows || []).map((row) => row[key]).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!values.length) return null;
    const middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  }

  function formatUsdPerEmployee(value) {
    if (!Number.isFinite(value)) return "n/a";
    return `$${Math.round(value / 1000).toLocaleString()}K`;
  }

  function privateEquityCellScore(rows, row, key, lowerIsBetter = false) {
    const values = rows.map((item) => item[key]).filter((value) => Number.isFinite(value));
    const value = row[key];
    if (!Number.isFinite(value) || !values.length) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const score = max === min ? 72 : ((value - min) / (max - min)) * 100;
    return lowerIsBetter ? 100 - score : score;
  }

  function renderPrivateEquityMetricCell(rows, row, key, display, note = "", lowerIsBetter = false) {
    const score = privateEquityCellScore(rows, row, key, lowerIsBetter);
    if (score == null) {
      return `<td class="pe-metric-cell missing"><span>n/a</span><small>${escapeHtml(note || "Source required")}</small></td>`;
    }
    return `
      <td class="pe-metric-cell" style="--heat-bg:${benchmarkHeatColor(score)}">
        <span>${escapeHtml(display)}</span>
        <small>${escapeHtml(note)}</small>
      </td>
    `;
  }

  function privateEquityProfitLabel() {
    const company = currentPriorityCompany();
    const peerKey = industryPeerKey(company.peerGroup || company.subSector || company.primaryIndustry || company.industry);
    return ["insurance", "financial-services"].includes(peerKey) ? "Operating Profit" : "EBITDA";
  }

  function formatPeMultiple(value) {
    if (!Number.isFinite(value)) return "n/a";
    return `${Math.round(value * 10) / 10}x`;
  }

  function peChartMetricValue(row, key) {
    if (!row) return null;
    const value = row[key];
    if (Number.isFinite(value)) return value;
    if (value == null || isValidationPlaceholder(value)) return null;
    if (["revenuePerEmployee", "ebitdaPerEmployee"].includes(key)) {
      const usd = usdAmountFromValue(value);
      if (usd != null) return usd;
      const text = String(value).trim();
      const parsed = metricNumber(text);
      if (parsed == null) return null;
      if (/k\b/i.test(text)) return parsed * 1000;
      if (/m\b/i.test(text)) return parsed * 1e6;
      if (/b\b/i.test(text)) return parsed * 1e9;
      return parsed;
    }
    return metricNumber(value);
  }

  function privateEquityGapText(customerValue, peerMedian, formatter, higherIsBetter = true) {
    if (!Number.isFinite(customerValue) || !Number.isFinite(peerMedian)) return "";
    const ahead = higherIsBetter ? customerValue >= peerMedian : customerValue <= peerMedian;
    return `${formatter(customerValue)} vs ${formatter(peerMedian)} peer median; ${ahead ? "ahead of peer median" : "below peer median"}`;
  }

  function privateEquityLabelledGap(label, customerValue, peerMedian, formatter, higherIsBetter = true) {
    const gap = privateEquityGapText(customerValue, peerMedian, formatter, higherIsBetter);
    return gap ? `${label}: ${gap}` : "";
  }

  function privateEquityMetricInsight(label, customerValue, peerMedian, formatter, soWhat, higherIsBetter = true) {
    if (!Number.isFinite(customerValue) || !Number.isFinite(peerMedian)) return null;
    const ahead = higherIsBetter ? customerValue >= peerMedian : customerValue <= peerMedian;
    return {
      label,
      value: `${formatter(customerValue)} vs ${formatter(peerMedian)} peer median`,
      stance: ahead ? "Advantage" : "Gap",
      soWhat,
      ahead,
    };
  }

  function renderPrivateEquityExecutiveSummary(rows, profitLabel) {
    if (!Array.isArray(rows) || rows.length < 2) return "";
    const customer = rows.find((row) => row.isCustomer) || rows[0] || {};
    const peers = rows.filter((row) => !row.isCustomer);
    const revenueMedian = privateEquityMedian(peers, "revenuePerEmployee");
    const profitMedian = privateEquityMedian(peers, "ebitdaPerEmployee");
    const marginMedian = privateEquityMedian(peers, "ebitdaMargin");
    const growthMedian = privateEquityMedian(peers, "revenueGrowth");
    const spreadMedian = privateEquityMedian(peers, "productivitySpread");
    const roaMedian = privateEquityMedian(peers, "roa");
    const fcfMedian = privateEquityMedian(peers, "fcfConversion");
    const leverageMedian = privateEquityMedian(peers, "leverage");
    const metricInsights = [
      privateEquityMetricInsight(
        "Revenue productivity",
        customer.revenuePerEmployee,
        revenueMedian,
        formatUsdPerEmployee,
        "If below peer median, the sales motion, pricing model or delivery capacity is not converting people into revenue as effectively as peers."
      ),
      privateEquityMetricInsight(
        `${profitLabel} productivity`,
        customer.ebitdaPerEmployee,
        profitMedian,
        formatUsdPerEmployee,
        `Shows whether the operating model turns workforce scale into ${profitLabel.toLowerCase()}; a gap points to automation, delivery mix and cost-to-serve opportunity.`
      ),
      privateEquityMetricInsight(
        "Margin quality",
        customer.ebitdaMargin,
        marginMedian,
        formatPercentValue,
        "Margin lag suggests structural cost, process complexity, technology run cost or pricing leakage that AI and platform simplification can address."
      ),
      privateEquityMetricInsight(
        "Scalable growth",
        customer.productivitySpread,
        spreadMedian,
        formatPointDelta,
        "Positive spread means revenue is growing faster than headcount; a gap means growth needs better AI-enabled capacity, targeting and operating leverage."
      ),
      privateEquityMetricInsight(
        "Cash conversion",
        customer.fcfConversion,
        fcfMedian,
        formatPercentValue,
        "Weak cash conversion lowers flexibility; automation, forecasting and working-capital analytics should convert earnings into fundable cash."
      ),
      privateEquityMetricInsight(
        "Leverage headroom",
        customer.leverage,
        leverageMedian,
        formatPeMultiple,
        "Higher leverage makes resilience and cash discipline more important; technology value should be framed as EBITDA protection and risk reduction.",
        false
      ),
    ].filter(Boolean);
    const gaps = [
      {
        label: "AI productivity",
        active: Number.isFinite(customer.revenuePerEmployee) && Number.isFinite(revenueMedian) && customer.revenuePerEmployee < revenueMedian,
        text: "Prioritise GenAI service operations, colleague copilots and workflow automation to lift revenue per employee and remove manual work from high-volume processes.",
      },
      {
        label: "Margin expansion",
        active: Number.isFinite(customer.ebitdaMargin) && Number.isFinite(marginMedian) && customer.ebitdaMargin < marginMedian,
        text: `Use automation, FinOps and application rationalisation to improve ${profitLabel.toLowerCase()} margin while protecting service quality.`,
      },
      {
        label: "Scalable growth",
        active: Number.isFinite(customer.productivitySpread) && Number.isFinite(spreadMedian) && customer.productivitySpread < spreadMedian,
        text: "Use AI demand forecasting, pricing, customer targeting and capacity planning to grow without adding headcount at the same rate.",
      },
      {
        label: "Capital discipline",
        active: (Number.isFinite(customer.roa) && Number.isFinite(roaMedian) && customer.roa < roaMedian) ||
          (Number.isFinite(customer.fcfConversion) && Number.isFinite(fcfMedian) && customer.fcfConversion < fcfMedian),
        text: "Tighten asset utilisation, cash forecasting, working-capital analytics and portfolio governance to improve returns and cash conversion.",
      },
      {
        label: "Risk resilience",
        active: Number.isFinite(customer.leverage) && Number.isFinite(leverageMedian) && customer.leverage > leverageMedian,
        text: "Position cyber resilience, operational resilience and controls automation as EBITDA protection and balance-sheet risk reduction.",
      },
    ];
    const companyName = (customer.company || activeCompanyDisplayName()).trim();
    const strategicRecommendations = [
      {
        label: "Scalable growth",
        text: "Use AI demand forecasting, pricing, customer targeting and capacity planning to grow revenue faster than headcount.",
        evidence: [
          privateEquityLabelledGap("Revenue growth", customer.revenueGrowth, growthMedian, formatPercentValue),
          privateEquityLabelledGap("Scalability spread", customer.productivitySpread, spreadMedian, formatPointDelta),
          privateEquityLabelledGap("Revenue / employee", customer.revenuePerEmployee, revenueMedian, formatUsdPerEmployee),
        ].filter(Boolean).join(" | ") || "Revenue growth, scalability spread and revenue productivity require refreshed peer data.",
      },
      {
        label: "Capital discipline",
        text: "Use cash forecasting, working-capital analytics, asset utilisation insight and portfolio governance to improve fundable cash and returns.",
        evidence: [
          privateEquityLabelledGap("ROA", customer.roa, roaMedian, formatPercentValue),
          privateEquityLabelledGap("FCF conversion", customer.fcfConversion, fcfMedian, formatPercentValue),
        ].filter(Boolean).join(" | ") || "ROA and cash-conversion peer data required.",
      },
      {
        label: "Risk resilience",
        text: "Frame cyber resilience, operational resilience and controls automation as EBITDA protection, not just compliance spend.",
        evidence: [
          privateEquityLabelledGap("Net debt / earnings", customer.leverage, leverageMedian, formatPeMultiple, false),
          privateEquityLabelledGap(`${profitLabel} margin`, customer.ebitdaMargin, marginMedian, formatPercentValue),
        ].filter(Boolean).join(" | ") || "Leverage and margin peer data required.",
      },
    ];
    return `
      <div class="pe-executive-summary">
        <div>
          <span class="block-label">Executive Summary</span>
          <h3>${escapeHtml(companyName)} should target the peer gaps technology can move</h3>
          <p>
            The peer screen should be read as a value-creation diagnostic. Revenue-side technology should target
            revenue per employee, growth rate and scalable growth without proportional headcount. Cost-side technology
            should target ${profitLabel.toLowerCase()} per employee, margin, cash conversion and avoidable control cost.
            These are the metrics most directly moved by AI automation, digital channels, data products, FinOps,
            application simplification and resilience automation.
          </p>
        </div>
        <div class="pe-summary-signals">
          ${metricInsights.slice(0, 4).map((insight) => `
            <article class="${insight.ahead ? "is-advantage" : "is-gap"}">
              <div>
                <strong>${escapeHtml(insight.label)}</strong>
                <em>${escapeHtml(insight.stance)}</em>
              </div>
              <b>${escapeHtml(insight.value)}</b>
              <p>${escapeHtml(insight.soWhat)}</p>
            </article>
          `).join("") || `<article><b>Peer medians required</b><p>Refresh peer financial and employee data to create quantified so-what interpretation.</p></article>`}
        </div>
        <div class="pe-recommendation-block">
          <h4>Strategic Financial Recommendations</h4>
          <div class="pe-improvement-grid">
            ${strategicRecommendations.map((item) => `
              <article>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.text)}</p>
                <small>${escapeHtml(item.evidence)}</small>
              </article>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderPrivateEquityBarCharts(rows, profitLabel) {
    if (!Array.isArray(rows) || rows.length < 2) return "";
    const configs = [
      { key: "revenuePerEmployee", title: "Revenue / Employee", note: "Labour productivity", formatter: formatUsdPerEmployee },
      { key: "ebitdaPerEmployee", title: `${profitLabel} / Employee`, note: "Profit productivity", formatter: formatUsdPerEmployee },
      { key: "ebitdaMargin", title: `${profitLabel} Margin`, note: "Earnings quality", formatter: formatPercentValue },
      { key: "revenueGrowth", title: "Revenue Growth", note: "Latest / CAGR", formatter: formatPercentValue, allowNegative: true },
      { key: "productivitySpread", title: "Growth - Headcount", note: "Scalability spread", formatter: formatPointDelta, allowNegative: true },
      { key: "roa", title: "ROA", note: "Capital efficiency", formatter: formatPercentValue },
      { key: "fcfConversion", title: `FCF / ${profitLabel}`, note: "Cash conversion", formatter: formatPercentValue },
      { key: "leverage", title: `Net Debt / ${profitLabel}`, note: "Lower is stronger", formatter: formatPeMultiple, lowerIsBetter: true },
    ];
    return `
      <div class="pe-bar-compare-panel graph-animate">
        <div class="chart-title-row">
          <div>
            <h3>Private Equity Peer Comparison</h3>
            <p class="muted">Bar charts compare the selected company against validated industry peers across productivity, profitability, growth, cash and leverage metrics.</p>
          </div>
          <div class="heatmap-legend"><span>Lower</span><i></i><span>Higher</span></div>
        </div>
        <div class="pe-bar-chart-grid">
          ${configs.map((config) => renderPrivateEquityBarCard(rows, config)).join("")}
        </div>
      </div>
    `;
  }

  function renderPrivateEquityBarCard(rows, config) {
    const chartRows = rows
      .map((row) => ({ ...row, chartValue: peChartMetricValue(row, config.key) }))
      .sort((a, b) => {
        if (a.chartValue == null && b.chartValue == null) return 0;
        if (a.chartValue == null) return 1;
        if (b.chartValue == null) return -1;
        return config.lowerIsBetter ? a.chartValue - b.chartValue : b.chartValue - a.chartValue;
      });
    const values = chartRows.map((row) => row.chartValue).filter((value) => Number.isFinite(value));
    const max = Math.max(1, ...values.map((value) => Math.abs(value)));
    const medianValues = [...values].sort((a, b) => a - b);
    const median = medianValues.length
      ? (medianValues.length % 2
        ? medianValues[Math.floor(medianValues.length / 2)]
        : (medianValues[(medianValues.length / 2) - 1] + medianValues[medianValues.length / 2]) / 2)
      : null;
    return `
      <article class="pe-bar-card">
        <div class="pe-bar-card-heading">
          <div>
            <h4>${escapeHtml(config.title)}</h4>
            <span>${escapeHtml(config.note)}</span>
          </div>
          <strong>${median == null ? "n/a" : escapeHtml(config.formatter(median))}</strong>
        </div>
        <div class="pe-peer-bar-list">
          ${chartRows.map((row) => {
            const missing = row.chartValue == null;
            const width = missing ? 0 : Math.max(4, Math.round((Math.abs(row.chartValue) / max) * 100));
            const negative = config.allowNegative && row.chartValue < 0;
            return `
              <div class="pe-peer-bar-row ${row.isCustomer ? "is-customer" : ""} ${missing ? "is-missing" : ""}">
                <span title="${attr(row.company || "")}">${escapeHtml(row.company || "")}</span>
                <div class="pe-peer-bar-track">
                  <div class="pe-peer-bar-fill bar-fill ${negative ? "negative" : ""}" style="--bar-width:${width}%"></div>
                </div>
                <b>${missing ? "n/a" : escapeHtml(config.formatter(row.chartValue))}</b>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }

  function renderPrivateEquityAnalysis(business) {
    const rows = privateEquityMetricRows(business);
    if (rows.length < 2 && !state.privateEquityLoading) return "";
    const profitLabel = privateEquityProfitLabel();
    const customer = rows.find((row) => row.isCustomer) || rows[0] || {};
    const peers = rows.filter((row) => !row.isCustomer);
    const peerRevenuePerEmployee = privateEquityMedian(peers, "revenuePerEmployee");
    const peerGrowth = privateEquityMedian(peers, "revenueGrowth");
    const coveredMetrics = ["revenuePerEmployee", "ebitdaPerEmployee", "ebitdaMargin", "productivitySpread", "roa", "fcfConversion", "leverage"]
      .filter((key) => Number.isFinite(customer[key])).length;
    const productivityRead = Number.isFinite(customer.revenuePerEmployee) && Number.isFinite(peerRevenuePerEmployee)
      ? `${formatUsdPerEmployee(customer.revenuePerEmployee)} vs ${formatUsdPerEmployee(peerRevenuePerEmployee)} peer median`
      : "Source required";
    const scalabilityRead = Number.isFinite(customer.productivitySpread)
      ? `${formatPointDelta(customer.productivitySpread)} revenue growth less headcount growth`
      : Number.isFinite(customer.forwardRevenuePerEmployee)
        ? `${formatUsdPerEmployee(customer.forwardRevenuePerEmployee)} forward revenue per employee`
        : "Prior headcount or sourced forecast required";
    return `
      <section class="section private-equity-analysis-section">
        <div class="section-heading">
          <div>
            <h2>Private Equity Analysis</h2>
            <p class="muted">Sponsor-style readout of where the company outperforms or trails peers on productivity, earnings quality, cash conversion and balance-sheet efficiency.</p>
          </div>
          <div class="pe-refresh-actions">
            <span class="peer-validation-badge">Validated peer set</span>
          </div>
        </div>
        ${state.privateEquityStatus ? `<div class="pe-refresh-status" role="status">${state.privateEquityLoading ? `<span class="loader-ring pe-loader" aria-hidden="true"></span>` : ""}<span>${escapeHtml(state.privateEquityStatus)}</span></div>` : ""}
        ${rows.length >= 2 ? `<div class="pe-summary-grid">
          <article class="pe-summary-card">
            <span>Revenue Productivity</span>
            <strong>${escapeHtml(productivityRead)}</strong>
            <small>Higher values indicate stronger pricing, utilisation or digital operating leverage.</small>
          </article>
          <article class="pe-summary-card">
            <span>${profitLabel} Productivity</span>
            <strong>${escapeHtml(formatUsdPerEmployee(customer.ebitdaPerEmployee))}</strong>
            <small>${Number.isFinite(customer.ebitdaMargin) ? `"${formatPercentValue(customer.ebitdaMargin)} ${profitLabel.toLowerCase()} margin" converts productivity into earnings quality.` : `${profitLabel} evidence required`}</small>
          </article>
          <article class="pe-summary-card">
            <span>Scalability Signal</span>
            <strong>${escapeHtml(scalabilityRead)}</strong>
            <small>${Number.isFinite(peerGrowth) ? `"${formatPercentValue(peerGrowth)} peer-median growth" is the hurdle for AI-enabled operating leverage.` : "Peer growth evidence required"}</small>
          </article>
          <article class="pe-summary-card">
            <span>Screening Coverage</span>
            <strong>${coveredMetrics}/7 metrics</strong>
            <small>Unfilled cells are evidence gaps to close before sizing a quantified value case.</small>
          </article>
        </div>` : ""}
        ${rows.length >= 2 ? renderPrivateEquityBarCharts(rows, profitLabel) : ""}
        <div class="benchmark-heatmap-panel pe-heatmap-panel graph-animate">
          <div class="chart-title-row">
            <div>
              <h3>Operating &amp; Capital Efficiency Peer Screen</h3>
              <p class="muted">Revenue and ${profitLabel.toLowerCase()} productivity are shown in USD per employee. ROA uses latest net income divided by latest total assets where average assets are unavailable.</p>
            </div>
            <div class="heatmap-legend"><span>Lower</span><i></i><span>Higher</span></div>
          </div>
          ${state.privateEquityLoading ? `
            <div class="pe-screen-loader" role="status" aria-live="polite">
              <div class="pe-screen-loader-content">
                <span class="loader-ring pe-screen-loader-ring" aria-hidden="true"></span>
                <div>
                  <strong>Building the peer efficiency screen</strong>
                  <span>Validating the peer group and collecting each financial and employee metric.</span>
                </div>
                <div class="pe-loader-stages" aria-hidden="true">
                  <i></i><i></i><i></i><i></i>
                </div>
              </div>
            </div>
          ` : `<div class="table-wrap pe-table-wrap">
            <table class="private-equity-table">
              <thead><tr>
                <th>Company</th>
                <th>Revenue / Employee<span>Labour productivity</span></th>
                <th>${profitLabel} / Employee<span>Profit productivity</span></th>
                <th>${profitLabel} Margin<span>Earnings quality</span></th>
                <th>Revenue Growth<span>Latest / CAGR</span></th>
                <th>Growth - Headcount<span>Scalability spread</span></th>
                <th>ROA<span>Capital efficiency</span></th>
                <th>FCF / ${profitLabel}<span>Cash conversion</span></th>
                <th>Net Debt / ${profitLabel}<span>Leverage</span></th>
              </tr></thead>
              <tbody>
                ${rows.map((row) => `
                  <tr class="${row.isCustomer ? "benchmark-customer-row" : ""}">
                    <td><strong>${escapeHtml(row.company)}</strong>${row.isCustomer ? `<span class="benchmark-row-badge">Selected company</span>` : ""}</td>
                    ${renderPrivateEquityMetricCell(rows, row, "revenuePerEmployee", formatUsdPerEmployee(row.revenuePerEmployee), Number.isFinite(row.revenuePerEmployee) ? "Latest disclosed employees" : "Employee count required")}
                    ${renderPrivateEquityMetricCell(rows, row, "ebitdaPerEmployee", formatUsdPerEmployee(row.ebitdaPerEmployee), row.earningsBasis || `${profitLabel} basis`)}
                    ${renderPrivateEquityMetricCell(rows, row, "ebitdaMargin", formatPercentValue(row.ebitdaMargin), `${profitLabel} / revenue`)}
                    ${renderPrivateEquityMetricCell(rows, row, "revenueGrowth", formatPercentValue(row.revenueGrowth), "Latest / CAGR")}
                    ${renderPrivateEquityMetricCell(rows, row, "productivitySpread", formatPointDelta(row.productivitySpread), Number.isFinite(row.headcountGrowth) ? `${formatPercentValue(row.headcountGrowth)} headcount growth` : "Prior headcount required")}
                    ${renderPrivateEquityMetricCell(rows, row, "roa", formatPercentValue(row.roa), "Latest assets proxy")}
                    ${renderPrivateEquityMetricCell(rows, row, "fcfConversion", formatPercentValue(row.fcfConversion), `FCF / ${profitLabel}`)}
                    ${renderPrivateEquityMetricCell(rows, row, "leverage", `${Math.round(row.leverage * 10) / 10}x`, `Net debt / ${profitLabel}`, true)}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>`}
        </div>
        ${rows.length >= 2 ? `<div class="pe-diligence-grid">
          <article><strong>Revenue quality</strong><span>Recurring revenue, backlog coverage, retention, customer concentration and contract repricing.</span></article>
          <article><strong>Cash &amp; capital intensity</strong><span>Free-cash-flow conversion, capex intensity, working-capital discipline and one-off restructuring cash costs.</span></article>
          <article><strong>Leverage &amp; returns</strong><span>Net debt / EBITDA, interest coverage, debt capacity, entry valuation and exit-multiple sensitivity.</span></article>
          <article><strong>Execution risk</strong><span>Management depth, attrition, delivery utilization, offshoring mix, vendor concentration and separation liabilities.</span></article>
        </div>
        <p class="pe-source-note"><strong>Interpretation basis:</strong> ${escapeHtml(peerValidationSummary(business))} Bars and heatmap cells are generated only from stored annual-report, lookup or refreshed peer metrics; <code>n/a</code> means the metric is excluded from scoring until sourced.</p>` : ""}
      </section>
    `;
  }

  function renderFinancialLineChart(business) {
    const targetCurrency = localCurrencyForBusiness(business);
    const trendRows = (business.financialTrends || [])
      .filter((row) => String(row.year || "").trim())
      .map((row) => normalizeRevenueRow(row, targetCurrency));
    if (!trendRows.length) return `<div class="empty">Add company financial rows to show the five-year financial chart.</div>`;
    return `<div class="financial-chart-stack">${renderFinancialMetricChartBlock({
      rows: trendRows,
      title: "Company Revenue | Operating Margin | Growth",
      subtitle: `Shows the selected company's year-on-year financial trend with revenue expressed in ${targetCurrency}.`,
      revenueTitle: `Revenue (${targetCurrency})`,
      growthKey: "yoyGrowth",
    })}</div>`;
  }

  function renderPeerFinancialChart(business) {
    const targetCurrency = localCurrencyForBusiness(business);
    const comparisonRows = topPeerComparisonRows(business);
    if (comparisonRows.length < 2) return "";
    const peerCount = comparisonRows.filter((row) => !row.isCustomer).length;
    return `
      <section class="section">
        <div class="financial-chart-stack">
          ${renderFinancialMetricChartBlock({
            rows: comparisonRows,
            title: "Peer Revenue | Operating Margin | Growth",
            subtitle: `Compares the selected company with ${peerCount} validated business-model peers by revenue. ${peerValidationSummary(business)} ${fxComparisonLabel(targetCurrency)}`,
            revenueTitle: `Revenue (${targetCurrency})`,
            labelKey: "company",
            growthKey: "cagr3",
            peerMode: true,
          })}
        </div>
      </section>
    `;
  }

  function renderFinancialMetricChartBlock(config) {
    return `
      <div class="financial-chart">
        <div class="chart-title-row">
          <div>
            <h3>${escapeHtml(config.title)}</h3>
            <p class="muted">${escapeHtml(config.subtitle)}</p>
          </div>
          <div class="chart-legend">
            <span><i class="series-revenue bar-key"></i>Revenue</span>
            <span><i class="series-operating bar-key"></i>Operating margin</span>
            <span><i class="series-yoy bar-key"></i>Growth</span>
          </div>
        </div>
        <div class="horizontal-chart-grid">
          ${renderHorizontalMetricChart(config.rows, {
            key: "revenue",
            title: config.revenueTitle || "Revenue",
            labelKey: config.labelKey,
            className: "series-revenue",
            peerMode: config.peerMode,
          })}
          ${renderHorizontalMetricChart(config.rows, {
            key: "operatingMargin",
            title: "Operating Margin",
            labelKey: config.labelKey,
            suffix: "%",
            className: "series-operating",
            peerMode: config.peerMode,
          })}
          ${renderHorizontalMetricChart(config.rows, {
            key: config.growthKey,
            title: "Growth",
            labelKey: config.labelKey,
            suffix: "%",
            className: "series-yoy",
            allowNegative: true,
            peerMode: config.peerMode,
          })}
        </div>
      </div>
    `;
  }

  function renderHorizontalMetricChart(rows, config) {
    const values = rows.map((row) => config.key === "revenue"
      ? (Number.isFinite(row.revenueBillions) ? row.revenueBillions : parseCurrencyAmount(row[config.key]))
      : metricNumber(row[config.key]));
    const usable = values.filter((value) => value != null);
    const max = Math.max(1, ...usable.map((value) => Math.abs(value)));
    const labelKey = config.labelKey || "year";
    return `
      <div class="horizontal-chart-panel ${config.peerMode ? "peer-comparison" : ""}">
        <h3>${escapeHtml(config.title)}</h3>
        <div class="horizontal-bar-list">
          ${rows.map((row, index) => {
            const value = values[index];
            const isMissing = value == null;
            const width = isMissing ? 0 : Math.max(3, Math.round((Math.abs(value) / max) * 100));
            const negative = config.allowNegative && value < 0;
            const display = isMissing ? "n/a" : `${escapeHtml(row[config.key] || value)}${config.suffix && !String(row[config.key] || "").includes("%") ? config.suffix : ""}`;
            return `
              <div class="horizontal-bar-row ${config.peerMode ? "peer-row" : ""} ${row.isCustomer ? "customer-row" : ""}">
                <div class="horizontal-year">${escapeHtml(row[labelKey] || "")}</div>
                <div class="horizontal-track">
                  <div class="horizontal-fill ${config.className} ${negative ? "negative" : ""}" style="--bar-width:${width}%"></div>
                </div>
                <div class="horizontal-value">${display}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderCaseForChange(business) {
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Case For Change</h2>
            <p class="muted">Industry triggers, market share, growth pressure, and competitor dynamics.</p>
          </div>
        </div>
        <div class="grid-2">
          <div>
            <div class="section-heading">
              <div><h2>Market Triggers</h2></div>
              ${addRowButton("marketTriggers")}
            </div>
            ${renderEditableTable("marketTriggers", business.marketTriggers || [])}
          </div>
          <div>
            <div class="section-heading">
              <div><h2>Market Share</h2></div>
              ${addRowButton("marketShare")}
            </div>
            ${renderEditableTable("marketShare", business.marketShare || [])}
            <div class="spacer"></div>
            ${barChart(business.marketShare || [], "company", "share", "%")}
          </div>
        </div>
      </section>
    `;
  }

  function renderPeerAnalysis(business) {
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Financial Analysis vs Industry Peers</h2>
            <p class="muted">Toggle peers on or off, compare metrics, and write the analyst narrative.</p>
          </div>
          ${addRowButton("peers")}
        </div>
        ${renderEditableTable("peers", business.peers || [])}
        <div class="spacer"></div>
        <div class="grid-3">
          <div>
            <h2>Revenue</h2>
            ${barChart(activePeers(business), "company", "revenue", "")}
          </div>
          <div>
            <h2>Margins</h2>
            ${stackedMarginChart(activePeers(business))}
          </div>
          <div>
            <h2>3-Year CAGR</h2>
            ${barChart(activePeers(business), "company", "cagr3", "%", "earth")}
          </div>
        </div>
        <div class="spacer"></div>
        <label class="field">
          <span>Finance-Analyst Narrative</span>
          <textarea data-peer-narrative>${escapeHtml(business.peerNarrative || "")}</textarea>
        </label>
      </section>
    `;
  }

  function renderIndustryBenchmarks(business) {
    return `
      <section class="section benchmark-analysis-section">
        <div class="section-heading">
          <div>
            <h2>Industry Benchmark & Analysis</h2>
            <p class="muted">Peer-backed benchmark analysis using the selected company and top enabled or same-industry peers.</p>
          </div>
        </div>
        ${renderBenchmarkPeerAnalysis(business)}
      </section>
    `;
  }

  function benchmarkMetricConfigs(comparisonCurrency = "") {
    return [
      { key: "revenue", label: "Revenue Scale", note: comparisonCurrency ? `Normalized ${comparisonCurrency}` : "Local comparison currency", formatter: (row, value) => row.revenue || `${value}` },
      { key: "operatingMargin", label: "Operating Margin", note: "Profitability", suffix: "%" },
      { key: "cagr3", label: "Growth", note: "Latest / CAGR", suffix: "%" },
      { key: "netMargin", label: "Net Margin", note: "After-tax efficiency", suffix: "%" },
    ];
  }

  function benchmarkMetricValue(row, key) {
    if (key === "revenue") return parseCurrencyAmount(row.revenue);
    return metricNumber(row[key]);
  }

  function benchmarkMetricDisplay(row, config) {
    const value = benchmarkMetricValue(row, config.key);
    if (value == null) return "n/a";
    if (config.formatter) return config.formatter(row, value);
    const raw = String(row[config.key] || "").trim();
    if (raw) return `${raw}${config.suffix && !raw.includes("%") ? config.suffix : ""}`;
    return config.suffix ? `${Math.round(value * 10) / 10}${config.suffix}` : `${Math.round(value * 10) / 10}`;
  }

  function benchmarkMetricScore(rows, key, value) {
    const values = rows.map((row) => benchmarkMetricValue(row, key)).filter((item) => item != null);
    if (value == null || !values.length) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return 72;
    return Math.round(((value - min) / (max - min)) * 100);
  }

  function benchmarkHeatColor(score) {
    if (score == null) return "transparent";
    const alpha = 0.08 + (Math.max(0, Math.min(100, score)) / 100) * 0.36;
    return `rgba(24, 126, 63, ${Math.round(alpha * 100) / 100})`;
  }

  function benchmarkMetricRank(rows, targetRow, key) {
    const value = benchmarkMetricValue(targetRow, key);
    if (value == null) return null;
    const ranked = rows
      .map((row) => ({ row, value: benchmarkMetricValue(row, key) }))
      .filter((item) => item.value != null)
      .sort((a, b) => b.value - a.value);
    const index = ranked.findIndex((item) => item.row === targetRow);
    return index < 0 ? null : index + 1;
  }

  function benchmarkMetricLeader(rows, key) {
    return rows
      .map((row) => ({ row, value: benchmarkMetricValue(row, key) }))
      .filter((item) => item.value != null)
      .sort((a, b) => b.value - a.value)[0] || null;
  }

  function benchmarkPeerAnalysisData(business) {
    const rows = topPeerComparisonRows(business);
    if (rows.length < 2) return null;
    const customer = rows.find((row) => row.isCustomer) || rows[0];
    const peerOnlyRows = rows.filter((row) => !row.isCustomer);
    const peerNames = peerOnlyRows.map((row) => cleanNarrativeFragment(row.company, 38)).filter(Boolean).slice(0, 5);
    const peerLabel = peerNames.length ? joinReadableList(peerNames) : "industry peers";
    const revenueRank = benchmarkMetricRank(rows, customer, "revenue");
    const marginRank = benchmarkMetricRank(rows, customer, "operatingMargin");
    const growthRank = benchmarkMetricRank(rows, customer, "cagr3");
    const peerOperatingAverage = averageMetric(peerOnlyRows, "operatingMargin");
    const peerGrowthAverage = averageMetric(peerOnlyRows, "cagr3");
    const customerOperating = benchmarkMetricValue(customer, "operatingMargin");
    const customerGrowth = benchmarkMetricValue(customer, "cagr3");
    const operatingGap = customerOperating != null && peerOperatingAverage != null ? customerOperating - peerOperatingAverage : null;
    const growthGap = customerGrowth != null && peerGrowthAverage != null ? customerGrowth - peerGrowthAverage : null;
    const operatingLeader = benchmarkMetricLeader(rows, "operatingMargin");
    const growthLeader = benchmarkMetricLeader(rows, "cagr3");
    const rankText = (rank) => rank == null ? "n/a" : `#${rank} of ${rows.length}`;
    const gapText = (gap) => gap == null
      ? "needs validation"
      : `${formatPointDelta(Math.abs(gap)).replace(/^\+/, "")} ${gap >= 0 ? "above" : "below"} peer average`;
    const analysisCards = [
      {
        label: "Scale",
        value: rankText(revenueRank),
        body: `${customer.company} ranks ${rankText(revenueRank)} on revenue scale across the peer set, compared with ${peerLabel}.`,
      },
      {
        label: "Margin",
        value: gapText(operatingGap),
        body: operatingLeader
          ? `${operatingLeader.row.company} sets the operating-margin benchmark at ${benchmarkMetricDisplay(operatingLeader.row, { key: "operatingMargin", suffix: "%" })}.`
          : "Operating-margin benchmark needs validated peer data.",
      },
      {
        label: "Growth",
        value: gapText(growthGap),
        body: growthLeader
          ? `${growthLeader.row.company} sets the growth benchmark at ${benchmarkMetricDisplay(growthLeader.row, { key: "cagr3", suffix: "%" })}.`
          : "Growth benchmark needs validated peer data.",
      },
    ];
    const metrics = benchmarkMetricConfigs(rows[0] && rows[0].comparisonCurrency);
    const heatmapRows = rows.map((row) => ({
      company: row.company || "",
      isCustomer: Boolean(row.isCustomer),
      metrics: metrics.map((metric) => {
        const value = benchmarkMetricValue(row, metric.key);
        return {
          key: metric.key,
          label: metric.label,
          display: benchmarkMetricDisplay(row, metric),
          score: benchmarkMetricScore(rows, metric.key, value),
        };
      }),
    }));
    return { cards: analysisCards, heatmapRows };
  }

  function renderBenchmarkPeerAnalysis(business) {
    const analysis = benchmarkPeerAnalysisData(business);
    if (!analysis) {
      return `<div class="empty">Add enabled peer rows or select a company with same-industry peers to show the benchmark heatmap.</div>`;
    }
    return `
      <div class="benchmark-analysis-grid">
        ${analysis.cards.map((card) => `
          <article class="benchmark-analysis-card">
            <div class="block-label">${escapeHtml(card.label)}</div>
            <div class="benchmark-analysis-value">${escapeHtml(card.value)}</div>
            <p>${escapeHtml(card.body)}</p>
          </article>
        `).join("")}
      </div>
      ${renderBenchmarkHeatmap(topPeerComparisonRows(business))}
    `;
  }

  function renderBenchmarkHeatmap(rows) {
    const comparisonCurrency = (rows[0] && rows[0].comparisonCurrency) || "";
    const metrics = benchmarkMetricConfigs(comparisonCurrency);
    return `
      <div class="benchmark-heatmap-panel">
        <div class="chart-title-row">
          <div>
            <h3>Peer Benchmark Heatmap</h3>
            <p class="muted">Darker cells indicate stronger relative performance within this peer group.${comparisonCurrency ? ` Revenue scale is normalized to ${comparisonCurrency}.` : ""}</p>
          </div>
          <div class="heatmap-legend">
            <span>Lower</span>
            <i></i>
            <span>Higher</span>
          </div>
        </div>
        <div class="table-wrap benchmark-heatmap-wrap">
          <table class="benchmark-heatmap">
            <thead>
              <tr>
                <th>Company</th>
                ${metrics.map((metric) => `<th>${escapeHtml(metric.label)}<span>${escapeHtml(metric.note)}</span></th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `
                <tr class="${row.isCustomer ? "benchmark-customer-row" : ""}">
                  <td>
                    <strong>${escapeHtml(row.company || "")}</strong>
                    ${row.isCustomer ? `<span class="benchmark-row-badge">Selected company</span>` : ""}
                  </td>
                  ${metrics.map((metric) => {
                    const value = benchmarkMetricValue(row, metric.key);
                    const score = benchmarkMetricScore(rows, metric.key, value);
                    const display = benchmarkMetricDisplay(row, metric);
                    return `
                      <td class="benchmark-heatmap-cell ${score == null ? "missing" : ""}" style="--heat-bg:${benchmarkHeatColor(score)}">
                        <span>${escapeHtml(display)}</span>
                        <small>${score == null ? "No score" : `${score}/100`}</small>
                      </td>
                    `;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function cleanNarrativeFragment(value, maxLength = 96) {
    const text = String(value || "")
      .replace(/\s+/g, " ")
      .replace(/[.;:]+$/g, "")
      .trim();
    if (text.length <= maxLength) return text;
    const cutAt = text.lastIndexOf(" ", maxLength - 3);
    return `${text.slice(0, cutAt > 40 ? cutAt : maxLength - 3)}...`;
  }

  function cleanEvidenceFragment(value, maxLength = 720) {
    const text = String(value || "")
      .replace(/\s+/g, " ")
      .trim();
    const tidyDanglingEnding = (input) => {
      let tidied = input
        .replace(/\b(?:and|or|including|with|of|for|to|in|on|by|from|across)$/i, "")
        .replace(/[ ,;:-]+$/g, "")
        .trim();
      const tokens = tidied.match(/[A-Za-z0-9]+/g) || [];
      if (tokens.length && tokens[tokens.length - 1].length === 1) {
        tidied = tidied.slice(0, tidied.lastIndexOf(tokens[tokens.length - 1])).replace(/[ ,;:-]+$/g, "").trim();
      }
      return tidied && tidied !== input ? `${tidied}...` : input;
    };
    if (text.length <= maxLength) return tidyDanglingEnding(text);
    const windowText = text.slice(0, maxLength).trim();
    const sentenceMatches = [...windowText.matchAll(/[.!?](?:\s|$)/g)]
      .map((match) => match.index + 1)
      .filter((index) => index >= 160);
    if (sentenceMatches.length) return windowText.slice(0, sentenceMatches[sentenceMatches.length - 1]).trim();
    const cutAt = windowText.lastIndexOf(" ");
    const cut = windowText.slice(0, cutAt > 80 ? cutAt : maxLength - 3)
      .replace(/\b(?:and|or|including|with|of|for|to|in|on|by|from|across)$/i, "")
      .replace(/[ ,;:-]+$/g, "")
      .trim();
    return `${cut}...`;
  }

  function evidenceFragmentLooksComplete(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length < 55) return false;
    if (/\b(?:and|or|including|with|of|for|to|in|on|by|from|across|the|a|an)$/i.test(text)) return false;
    const tokens = text.match(/[A-Za-z0-9]+/g) || [];
    if (tokens.length && tokens[tokens.length - 1].length === 1) return false;
    if (/[.!?]["')\]]?$/.test(text)) return true;
    return /(?:Â£|\$|â‚¬|gbp|usd|eur)\s?\d|\d+(?:\.\d+)?\s?(?:%|bn|m|billion|million|bps|basis points)/i.test(text);
  }

  function annualReportStatisticLines(business) {
    const lines = [];
    const addLine = (value) => {
      const text = String(value || "").trim();
      if (!text || /evidence not found/i.test(text)) return;
      if (!agendaLineHasQuoteOrStatistic(text)) return;
      if (/\b(?:should|likely|usually|typically|needs? to be read|public places to validate)\b/i.test(text)) return;
      lines.push(text);
    };
    const agendaRows = Array.isArray(business.transformationAgenda && business.transformationAgenda.rows)
      ? business.transformationAgenda.rows
      : [];
    agendaRows.forEach((row) => agendaEvidenceLines(row).forEach(addLine));
    const insights = business.priorityInsights || {};
    [
      ...(Array.isArray(insights.industryTrends) ? insights.industryTrends : []),
      ...(Array.isArray(insights.businessPriorities) ? insights.businessPriorities : []),
    ].forEach((item) => {
      addLine(item.summary);
      addLine(item.title);
    });
    const seen = new Set();
    return lines
      .map((line) => cleanNarrativeFragment(line, 150))
      .filter((line) => {
        const key = normalizeLookupQuery(line);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }

  function priorityConversationThemes(priorityInsights) {
    const haystack = [
      ...(priorityInsights.industryTrends || []),
      ...(priorityInsights.businessPriorities || []),
    ]
      .flatMap((item) => [item.title, item.summary])
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const themes = [
      { label: "customer-led digital experience", terms: ["customer", "journey", "experience", "adoption", "digital"] },
      { label: "AI and data-enabled productivity", terms: [" ai", "data", "automation", "analytics", "productivity"] },
      { label: "resilience, risk and trust", terms: ["resilience", "risk", "trust", "cyber", "financial-crime", "privacy"] },
      { label: "margin and cost-to-serve discipline", terms: ["margin", "cost", "efficiency", "simplification", "productivity"] },
      { label: "disciplined growth and market relevance", terms: ["growth", "market", "segment", "service outcomes"] },
    ];
    return themes
      .filter((theme) => theme.terms.some((term) => haystack.includes(term)))
      .map((theme) => theme.label)
      .slice(0, 4);
  }

  function narrativePhrase(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const normalized = text.toLowerCase();
    const mapped = {
      "ai & data": "AI and data",
      "customer trust": "customer trust",
      "resilience & cyber": "resilience and cyber",
      "modernization": "modernization",
      "productivity": "productivity",
      "payments & fintech": "payments and fintech",
      "governance": "governance",
      "growth & innovation": "growth and innovation",
    }[normalized];
    if (mapped) return mapped;
    if (/^AI\b/.test(text)) return text;
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  function strategicNarrativeOpening({
    company,
    business,
    topThemes,
    priorityThemes,
    revenueChange,
    latestGrowth,
    operatingGap,
    growthGap,
    peerNames,
  }) {
    const companyName = company.name || "The company";
    const snapshot = business.snapshot || {};
    const industryKey = industryPeerKey(snapshot.peerGroup || company.peerGroup || snapshot.industry || company.industry);
    const leadTheme = topThemes[0] || priorityThemes[0] || "trusted modernization";
    const leadPriority = priorityThemes[0] || narrativePhrase(leadTheme) || "disciplined transformation";
    const peerLabel = peerNames.length ? `${peerNames[0]} and other peers` : "industry peers";
    const gapText = operatingGap == null ? "" : formatPointDelta(Math.abs(operatingGap)).replace(/^\+/, "");
    const growthText = latestGrowth == null ? "" : formatPercentValue(latestGrowth);
    const revenueText = revenueChange == null ? "" : formatPercentValue(Math.abs(revenueChange));

    if (operatingGap != null && operatingGap < -1.5) {
      return `${companyName}'s CEO and CFO conversation should start with a harder question: can ${leadPriority} close a ${gapText} margin gap before ${peerLabel} turn scale into a structural advantage?`;
    }
    if (operatingGap != null && operatingGap > 1.5 && latestGrowth != null && latestGrowth > 0) {
      return `${companyName}'s strongest move is to treat its ${gapText} margin advantage and ${growthText} growth as fuel for ${narrativePhrase(leadTheme)}, before peers copy the operating model.`;
    }
    if (growthGap != null && growthGap < -1.5) {
      return `${companyName} needs to make growth the uncomfortable board question: ${leadPriority} must convert research themes into faster market momentum, not another transformation workstream.`;
    }
    if (revenueChange != null && revenueChange > 20) {
      return `${companyName} no longer needs a generic transformation story; it needs a sharper capital-allocation story about where ${narrativePhrase(leadTheme)} can turn ${revenueText} revenue growth into durable advantage.`;
    }
    if (industryKey === "retail" || industryKey === "uk-retail" || industryKey === "online-retail") {
      return `${companyName}'s board-level tension is whether trusted omnichannel execution can turn ${narrativePhrase(leadTheme)} into margin expansion faster than retail peers can respond.`;
    }
    if (industryKey === "insurance") {
      return `${companyName}'s executive challenge is to convert trust, claims experience and retirement advice into a measurable margin advantage before insurance peers reset customer expectations.`;
    }
    if (industryKey === "financial-services") {
      return `${companyName}'s executive challenge is to defend customer ownership while AI, resilience, regulation and cost pressure rewrite the economics of trust.`;
    }
    return `${companyName}'s C-level question is where to place fewer, bigger bets so ${narrativePhrase(leadTheme)} becomes measurable growth, margin and trust advantage.`;
  }

  function strategicBusinessNarrativeParagraphs(business) {
    const company = currentPriorityCompany();
    const trendRows = (business.financialTrends || []).filter((row) => String(row.year || "").trim());
    const latest = latestFinancialTrendRow(business);
    const revenueSignal = latestFinancialRevenue(business);
    const firstRevenueRow = trendRows.find((row) => !isValidationPlaceholder(row.revenue) && parseCurrencyAmount(row.revenue) != null) || {};
    const firstRevenue = parseCurrencyAmount(firstRevenueRow.revenue);
    const latestRevenue = parseCurrencyAmount(latest.revenue || revenueSignal.value);
    const revenueChange = firstRevenue && latestRevenue != null
      ? ((latestRevenue - firstRevenue) / firstRevenue) * 100
      : null;
    const latestGrowth = metricNumber(latest.yoyGrowth);
    const latestOperating = metricNumber(latest.operatingMargin);
    const peerRows = topPeerComparisonRows(business);
    const peerOnlyRows = peerRows.filter((row) => !row.isCustomer);
    const peerNames = peerOnlyRows.map((row) => cleanNarrativeFragment(row.company, 42)).filter(Boolean).slice(0, 4);
    const peerReference = peerNames.length ? `industry peers including ${joinReadableList(peerNames)}` : "industry peers";
    const peerOperatingAverage = averageMetric(peerOnlyRows, "operatingMargin");
    const peerGrowthAverage = averageMetric(peerOnlyRows, "cagr3");
    const operatingGap = latestOperating != null && peerOperatingAverage != null ? latestOperating - peerOperatingAverage : null;
    const growthGap = latestGrowth != null && peerGrowthAverage != null ? latestGrowth - peerGrowthAverage : null;
    const peerMarginText = operatingGap == null
      ? "the margin position is not yet sourced against peers"
      : `margin is ${formatPointDelta(Math.abs(operatingGap)).replace(/^\+/, "")} ${operatingGap >= 0 ? "above" : "below"} the peer average`;
    const peerGrowthText = growthGap == null
      ? ""
      : ` and growth is ${formatPointDelta(Math.abs(growthGap)).replace(/^\+/, "")} ${growthGap >= 0 ? "above" : "below"} the peer average`;
    const revenuePhrase = revenueChange == null
      ? `latest reported revenue of ${latest.revenue || revenueSignal.value || business.snapshot?.revenue || "not yet sourced"}`
      : `revenue moving from ${firstRevenueRow.revenue} to ${latest.revenue || revenueSignal.value}, a ${formatPercentValue(revenueChange)} change across the period`;
    const growthPhrase = latestGrowth == null ? "latest growth not yet sourced" : `latest growth of ${formatPercentValue(latestGrowth)}`;
    const marginPhrase = latestOperating == null ? "operating margin not yet sourced" : `operating margin of ${formatPercentValue(latestOperating)}`;

    const researchRows = mergeResearchFirmPriorities(business.researchFirmPriorities, company);
    const topThemes = researchTopicFrequencies(researchRows)
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 4)
      .map((item) => item.label);
    const priorityInsights = hasPriorityInsights(business.priorityInsights) && !priorityInsightsNeedSourceRefresh(business.priorityInsights, company)
      ? business.priorityInsights
      : buildPriorityInsights(company);
    const priorityThemes = priorityConversationThemes(priorityInsights);
    const benchmarkSignals = (business.benchmarkNotes || [])
      .flatMap((row) => [row.financial, row.operational, row.customerMarket])
      .map((item) => cleanNarrativeFragment(item, 82))
      .filter(Boolean)
      .slice(0, 2);
    const themePhrase = topThemes.length ? joinReadableList(topThemes) : "AI, data, resilience, modernization and customer trust";
    const priorityPhrase = priorityThemes.length ? priorityThemes.join("; ") : "customer outcomes; productivity; resilience; governed modernization";
    const benchmarkPhrase = benchmarkSignals.length
      ? `Benchmark inputs reinforce ${joinReadableList(benchmarkSignals)}.`
      : "Benchmark inputs should be used to test ambition, sequencing and value-capture timing.";
    const statisticLines = annualReportStatisticLines(business);
    const statisticPhrase = statisticLines.length
      ? `Annual-report and investor-source evidence gives the conversation sharper proof points: ${statisticLines.join("; ")}.`
      : "The next refresh should prioritize annual-report statistics, leadership quotes, quantified transformation targets and investor-source proof points for each agenda section.";
    const opening = strategicNarrativeOpening({
      company,
      business,
      topThemes,
      priorityThemes,
      revenueChange,
      latestGrowth,
      operatingGap,
      growthGap,
      peerNames,
    });
    const paragraphs = [
      `${opening} Five-year financials show ${revenuePhrase}, ${growthPhrase}, and ${marginPhrase}; against ${peerReference}, ${peerMarginText}${peerGrowthText}. The executive question is where to reinvest this performance so the business can protect margin, defend customer ownership, and keep pace with peer moves in modernization and trust.`,
      `The page evidence points to a concise strategic narrative: industry research clusters around ${themePhrase}, while the business priorities emphasize ${priorityPhrase}. ${statisticPhrase} ${benchmarkPhrase} The C-level conversation should be to fund AI, data, cloud and resilience only where they improve customer trust, operating productivity, risk control and revenue momentum; use peer benchmarks as the CFO proof point for value and the CEO lens for competitive differentiation.`,
    ];
    return paragraphs;
  }

  function renderStrategicBusinessNarrative(business) {
    const paragraphs = strategicBusinessNarrativeParagraphs(business);
    return `
      <section class="section strategic-business-narrative-section">
        <div class="section-heading">
          <div>
            <h2>Strategic Business Narrative</h2>
            <p class="muted">C-level conversation narrative synthesized from research priorities, financials, benchmarks, and industry peers.</p>
          </div>
        </div>
        <div class="strategic-narrative-card">
          <div class="block-label">Executive Conversation</div>
          ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </div>
      </section>
    `;
  }

  function annualReportSourceLinks(company, profile) {
    const links = [];
    const add = (source) => {
      if (!source || !source.url) return;
      const key = `${source.label || source.source || "Source"}|${source.url}`;
      if (links.some((item) => `${item.label}|${item.url}` === key)) return;
      links.push({
        label: source.label || source.source || "Source",
        url: source.url,
      });
    };
    add(annualPriorityLink(company, "Annual report"));
    add(investorPriorityLink(company, "Investor relations"));
    (Array.isArray(profile && profile.sourceSnippets) ? profile.sourceSnippets : [])
      .filter((snippet) => /annual|report|results|fy20|investor/i.test(`${snippet.label || ""} ${snippet.source || ""} ${snippet.snippet || ""}`))
      .forEach((snippet) => add(snippet));
    return links.slice(0, 5);
  }

  function boardExcoSourceSnippets(profile) {
    const lists = [
      profile && profile.sourceSnippets,
      state.companyLookup && state.companyLookup.selected && state.companyLookup.selected.sourceSnippets,
      state.companyLookup && state.companyLookup.sourceSnippets,
      state.business && state.business.snapshot && state.business.snapshot.sourceSnippets,
    ];
    const snippets = [];
    lists.forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((snippet) => {
        if (!snippet) return;
        const text = cleanEvidenceFragment(snippet.snippet || snippet.label || snippet.source, 720);
        const url = snippet.url || snippet.href || "";
        const key = `${text}|${url}`;
        if (!text || !evidenceFragmentLooksComplete(text.replace(/\.\.\.$/, "")) || snippets.some((item) => item.key === key)) return;
        snippets.push({
          key,
          source: snippet.source || snippet.label || "Source",
          label: snippet.label || snippet.source || "Source",
          snippet: text,
          url,
        });
      });
    });
    return snippets;
  }

  function annualReportEvidenceSnippets(profile) {
    const reportPattern = /\b(?:annual report|annual financial report|annual review|10-k|20-f|universal registration|full[- ]year|fy20\d{2}|results|investor|strategy update|capital markets|pre-tax|pretax|profit|income|revenue|rote|return on tangible equity|cet1|cost[- ]to[- ]income|efficiency|capital return|shareholder|dividend|buyback|principal risk|risk disclosure)\b/i;
    const rejectPattern = /\b(?:validate|prepared for|open the validation link|google search prepared|local public company index|company identity|lookup|source required|should be read)\b/i;
    return boardExcoSourceSnippets(profile)
      .filter((snippet) => {
        const haystack = `${snippet.source || ""} ${snippet.label || ""} ${snippet.snippet || ""}`;
        if (!snippet.url || !snippet.snippet) return false;
        if (rejectPattern.test(haystack)) return false;
        if (!reportPattern.test(haystack)) return false;
        return /\d/.test(snippet.snippet) || /\b(?:said|stated|announced|reported|target|commit|plan|quote)\b/i.test(snippet.snippet);
      })
      .slice(0, 6);
  }

  function businessAnnualReportEvidenceSnippets(business) {
    const payload = business || state.business || {};
    const profile = activeCaseCompanyProfile(state.activeCase);
    const lists = [
      annualReportEvidenceSnippets(profile),
      payload && payload.snapshot && payload.snapshot.sourceSnippets,
      payload && payload.annualReportAnalysis && payload.annualReportAnalysis.sourceSnippets,
    ];
    const snippets = [];
    lists.forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((snippet) => {
        if (!snippet) return;
        const text = cleanEvidenceFragment(snippet.snippet || snippet.summary || snippet.title || snippet.label || "", 720);
        const label = snippet.label || snippet.source || "Annual report evidence";
        const url = snippet.url || snippet.href || "";
        const haystack = `${label} ${text}`;
        if (!text || !/\b(?:annual report|uploaded annual report|annual financial report|10-k|investor|results|report evidence|full[- ]year|fy20\d{2})\b/i.test(haystack)) return;
        if (/\b(?:validate|prepared for|open the validation link|google search prepared|source required|should be read)\b/i.test(haystack)) return;
        if (!evidenceFragmentLooksComplete(text.replace(/\.\.\.$/, ""))) return;
        const key = `${label}|${text}|${url}`;
        if (snippets.some((item) => item.key === key)) return;
        snippets.push({ key, source: snippet.source || label, label, snippet: text, url });
      });
    });
    return snippets;
  }

  function businessHasAnnualReportEvidence(business) {
    return businessAnnualReportEvidenceSnippets(business).length > 0;
  }

  function boardExcoEvidenceSources(snippets, fallbackSources) {
    const sources = [];
    const add = (source) => {
      if (!source || !source.url) return;
      const label = source.label || source.source || "Source";
      const key = `${label}|${source.url}`;
      if (sources.some((item) => `${item.label}|${item.url}` === key)) return;
      sources.push({ label, url: source.url });
    };
    (snippets || []).forEach(add);
    (fallbackSources || []).forEach(add);
    return sources.slice(0, 5);
  }

  function usefulPriorityText(item, fallback = "") {
    const text = cleanNarrativeFragment(item && (item.summary || item.title) || fallback, 190);
    if (!text) return fallback;
    if (/\b(?:should be read|use .*annual report|anchor the narrative|look it up|source basis)\b/i.test(text)) {
      return cleanNarrativeFragment(item && item.title || fallback, 150);
    }
    return text;
  }

  function findPrioritySignal(items, pattern) {
    return (items || []).find((item) => pattern.test(`${item.title || ""} ${item.summary || ""}`)) || null;
  }

  function technologyBusinessChangeAnnualReportInsights(business) {
    const company = currentPriorityCompany();
    const profile = activeCaseCompanyProfile(state.activeCase);
    const snapshot = business.snapshot || {};
    const latest = latestFinancialTrendRow(business);
    const revenueSignal = latestFinancialRevenue(business);
    const revenueText = revenueSignal.value || snapshot.revenue || annualRevenueUsdDisplay(snapshot.annualRevenueUsd) || "latest reported revenue";
    const growthValue = metricNumber(latest.yoyGrowth);
    const marginValue = metricNumber(latest.operatingMargin);
    const growthText = growthValue != null
      ? `${formatPercentValue(growthValue)} growth`
      : "growth trajectory";
    const marginText = marginValue != null
      ? `${formatPercentValue(marginValue)} operating margin`
      : "margin and cost discipline";
    const yearText = latest.year || revenueSignal.year || snapshot.fiscalYear || "the latest annual report period";
    const annualSources = annualReportSourceLinks(company, profile);
    const evidenceSnippets = annualReportEvidenceSnippets(profile);
    if (!evidenceSnippets.length) {
      return {
        sourceRequired: true,
        summary: `${company.name || "This company"} does not yet have loaded annual-report or results evidence in this value case, so technology and business-change opportunities are withheld rather than filled with generic commentary.`,
        bullets: [
          "Annual-report evidence required: upload the official annual report before technology and business-change opportunities are generated.",
          "No opportunity conclusions are shown until the case contains source snippets with figures, targets, leadership commentary, strategy signals or risk disclosures.",
          `Current page financials show ${yearText}, ${revenueText}, ${growthText} and ${marginText}, but those values are not treated as annual-report opportunity analysis without source evidence.`,
        ],
        cards: [
          {
            title: "Annual Report Evidence Required",
            body: `This section is intentionally blocked because the selected value case does not contain annual-report/result snippets. Upload the official ${company.name || "company"} annual report before relying on opportunity analysis.`,
            evidence: "Source required",
            sources: annualSources,
          },
        ],
      };
    }
    const evidenceSources = boardExcoEvidenceSources(evidenceSnippets, annualSources);
    const evidenceFacts = evidenceSnippets
      .map((snippet) => `${snippet.label || snippet.source}: ${snippet.snippet}`)
      .map((item) => cleanNarrativeFragment(item, 260))
      .filter(Boolean);
    const performanceFact = evidenceFacts.find((item) => /revenue|income|profit|rote|margin|cost|cet1|capital|shareholder/i.test(item)) || evidenceFacts[0];
    const technologyFact = evidenceFacts.find((item) => /technology|digital|data|cloud|ai|artificial intelligence|automation|platform|moderni|payments|analytics/i.test(item)) || evidenceFacts.find((item) => /investment|system|service|channel|online|customer/i.test(item)) || evidenceFacts[1] || evidenceFacts[0];
    const businessChangeFact = evidenceFacts.find((item) => /strategy|transform|simpl|operat|productivity|efficiency|cost|growth|customer|target|portfolio|division|programme|program/i.test(item)) || evidenceFacts[2] || evidenceFacts[0];
    const riskFact = evidenceFacts.find((item) => /risk|regulat|control|resilien|cyber|conduct|capital|compliance|governance/i.test(item)) || evidenceFacts[3] || evidenceFacts[0];
    const bulletCandidates = [
      `Technology opportunity: ${technologyFact}`,
      `Business change opportunity: ${businessChangeFact}`,
      `Value and performance opportunity: ${performanceFact}`,
      `Risk, control or resilience opportunity: ${riskFact}`,
      ...evidenceFacts.slice(0, 4).map((fact) => `Source-backed evidence: ${fact}`),
    ];
    const seenBullets = new Set();
    const bullets = bulletCandidates
      .map((item) => cleanNarrativeFragment(item, 260))
      .filter((item) => {
        const key = normalizeLookupQuery(item);
        if (!key || seenBullets.has(key)) return false;
        seenBullets.add(key);
        return true;
      })
      .slice(0, 7);
    return {
      summary: `${company.name || "The company"}'s technology and business-change opportunities are generated only from loaded annual-report, results, investor, or press-release evidence. The available source snippets are read for modernisation, operating-model change, performance improvement and resilience signals.`,
      bullets,
      cards: [
        {
          title: "Technology Modernisation Opportunity",
          body: technologyFact,
          evidence: "Technology / digital evidence",
          sources: evidenceSources,
        },
        {
          title: "Business Change Opportunity",
          body: businessChangeFact,
          evidence: "Strategy / operating model evidence",
          sources: evidenceSources,
        },
        {
          title: "Value, Risk And Control Opportunity",
          body: riskFact,
          evidence: "Risk / resilience evidence",
          sources: evidenceSources,
        },
      ],
    };
  }

  function renderTechnologyBusinessChangeSection(business) {
    const analysis = technologyBusinessChangeAnnualReportInsights(business);
    const loading = analysis.sourceRequired && annualReportAnalysisInProgress();
    return `
      <section class="section board-exco-section${analysis.sourceRequired ? " source-required" : ""}">
        <div class="section-heading">
          <div>
            <h2>Technology &amp; Business Change Opportunities</h2>
            <p class="muted">${loading ? "AI is analysing the uploaded annual report for technology and business-change opportunities." : analysis.sourceRequired ? "Annual-report evidence must be loaded before this section identifies opportunities." : "Opportunity readout grounded in loaded annual-report evidence."}</p>
          </div>
        </div>
        ${loading ? renderAnnualReportAnalysisLoader(
          "AI analysing annual report for technology and business change",
          "Extracting technology, digital, data, operating-model, performance, risk and customer-change signals from the uploaded PDF."
        ) : ""}
        <p class="board-exco-summary">${escapeHtml(analysis.summary)}</p>
        <div class="board-exco-bullets">
          <div class="block-label">Opportunity readout from annual-report evidence</div>
          <ul>
            ${(analysis.bullets || []).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
          </ul>
        </div>
        <div class="board-exco-grid">
          ${analysis.cards.map((card) => `
            <article class="board-exco-card">
              <div class="block-label">${escapeHtml(card.evidence)}</div>
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.body)}</p>
              <div class="priority-source-links">
                ${(card.sources || []).slice(0, 3).map((source) => `
                  <a href="${attr(source.url || "#")}" target="_blank" rel="noopener">${escapeHtml(source.label || "Source")}</a>
                `).join("")}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function outsideInEvidenceSnippets(business) {
    const profile = activeCaseCompanyProfile(state.activeCase);
    const lists = [
      businessAnnualReportEvidenceSnippets(business),
      business && business.annualReportAnalysis && business.annualReportAnalysis.sourceSnippets,
      annualReportEvidenceSnippets(profile),
      profile && profile.sourceSnippets,
      business && business.snapshot && business.snapshot.sourceSnippets,
    ];
    const rejectPattern = /\b(?:validate|prepared for|open the validation link|google search prepared|local public company index|company identity|lookup|source required|should be read)\b/i;
    const evidencePattern = /\b(?:annual|report|investor|results|strategy|risk|technology|digital|data|ai|automation|platform|cloud|customer|cost|efficien|growth|margin|profit|income|revenue|capital|compliance|security|resilience|press release|market announcement)\b/i;
    const snippets = [];
    lists.forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((snippet) => {
        if (!snippet) return;
        const text = cleanEvidenceFragment(snippet.snippet || snippet.summary || snippet.title || snippet.label || "", 720);
        const url = snippet.url || snippet.href || "";
        const label = snippet.label || snippet.source || "Annual report evidence";
        const source = snippet.source || label;
        const haystack = `${source} ${label} ${text}`;
        if (!text || rejectPattern.test(haystack) || !evidencePattern.test(haystack)) return;
        if (!evidenceFragmentLooksComplete(text.replace(/\.\.\.$/, ""))) return;
        const key = `${label}|${text}|${url}`;
        if (snippets.some((item) => item.key === key)) return;
        snippets.push({ key, source, label, snippet: text, url });
      });
    });
    return snippets.slice(0, 32);
  }

  function outsideInEvidenceText(snippet) {
    if (!snippet) return "";
    const detail = outsideInEvidenceDetail(snippet);
    return cleanEvidenceFragment(`${detail.type}: ${detail.text}${detail.citation ? ` (${detail.citation})` : ""}`, 760);
  }

  function outsideInEvidenceDetail(snippet) {
    if (!snippet) {
      return {
        type: "Annual report evidence required",
        text: "Upload the annual report or investor pack to show the exact quote or data point behind this priority.",
        citation: "",
      };
    }
    const source = snippet.source || "";
    const label = snippet.label || source || "Annual report / IR evidence";
    const rawText = cleanEvidenceFragment(snippet.snippet || snippet.summary || snippet.title || "", 720);
    const hasMetric = /(?:\b\d+(?:\.\d+)?\s?%|\b\d+(?:,\d{3})*(?:\.\d+)?\s?(?:bn|billion|m|million|bps|basis points)\b|\bFY20\d{2}\b|\b20\d{2}\b|(?:USD|GBP|EUR|\$|\u00a3|\u20ac)\s?\d)/i.test(rawText);
    const isOfficial = /\b(?:annual|report|10-k|investor|results|uploaded|ir|press release|market announcement)\b/i.test(`${source} ${label}`);
    return {
      type: hasMetric ? "Annual-report data point" : isOfficial ? "Annual-report quote" : "IR / source evidence",
      text: rawText || "Evidence text unavailable; refresh analysis or upload the annual report.",
      citation: label,
      source,
    };
  }

  function outsideInBestEvidence(snippets, pattern, fallbackIndex = 0) {
    return snippets.find((snippet) => pattern.test(`${snippet.label || ""} ${snippet.source || ""} ${snippet.snippet || ""}`)) ||
      snippets[fallbackIndex] ||
      snippets[0] ||
      null;
  }

  function outsideInSourceLinks(snippet, fallbackSources = []) {
    const links = [];
    const add = (source) => {
      if (!source || !source.url) return;
      const label = source.label || source.source || "Source";
      const key = `${label}|${source.url}`;
      if (links.some((item) => `${item.label}|${item.url}` === key)) return;
      links.push({ label, url: source.url });
    };
    add(snippet);
    (fallbackSources || []).forEach(add);
    return links.slice(0, 4);
  }

  function renderOutsideInSources(sources) {
    const rows = (sources || []).filter((source) => source && source.url);
    if (!rows.length) return "";
    return `
      <div class="priority-source-links">
        ${rows.map((source) => `
          <a href="${attr(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label || "Source")}</a>
        `).join("")}
      </div>
    `;
  }

  function outsideInThemeDefinitions() {
    return [
      {
        theme: "Cost optimisation / operational efficiency",
        pattern: /cost|efficien|productivity|simplif|automation|operating model|margin/i,
        terms: ["cost", "efficiency", "productivity", "simplification", "automation", "operating model", "margin"],
        why: "Commercially important because it connects technology spend to margin, cost-to-serve and operating leverage.",
        enabler: "Automation, workflow simplification, FinOps and platform rationalisation",
        impact: "Lower run cost, faster cycle time and clearer CFO value tracking",
        stack: "Applications & Platforms",
      },
      {
        theme: "Revenue growth / digital channels",
        pattern: /growth|customer|digital|channel|market|sales|personal|conversion|loyalty/i,
        terms: ["growth", "customer", "digital", "channel", "market", "sales", "personalisation", "personalization", "conversion", "loyalty"],
        why: "Commercially important because digital channels can improve customer reach, engagement and share of wallet.",
        enabler: "Digital experience modernisation, personalisation and customer data activation",
        impact: "Higher conversion, retention, cross-sell and digital adoption",
        stack: "Customer Experience & Digital Channels",
      },
      {
        theme: "Data & AI transformation",
        pattern: /\bai\b|artificial intelligence|data|analytics|model|insight|predictive|genai|automation/i,
        terms: ["ai", "artificial intelligence", "data", "analytics", "model", "insight", "predictive", "genai", "automation"],
        why: "Commercially important because data and AI can convert existing information assets into productivity, risk and growth levers.",
        enabler: "Modern data platform, governed AI, analytics and GenAI use cases",
        impact: "Better decision speed, personalisation, forecasting and colleague productivity",
        stack: "Data & AI",
      },
      {
        theme: "Risk, security and compliance",
        pattern: /risk|security|cyber|compliance|regulat|control|resilien|fraud|financial crime|privacy|identity/i,
        terms: ["risk", "security", "cyber", "compliance", "regulation", "control", "resilience", "fraud", "financial crime", "privacy", "identity"],
        why: "Commercially important because technology risk increasingly constrains growth, trust and regulatory confidence.",
        enabler: "Zero trust, identity controls, cyber detection, resilience monitoring and regulatory evidence automation",
        impact: "Lower risk exposure, stronger control evidence and faster response to disruption",
        stack: "Cybersecurity & Risk",
      },
      {
        theme: "Platform consolidation / cloud migration",
        pattern: /platform|cloud|infrastructure|moderni|legacy|architecture|migration|core|system/i,
        terms: ["platform", "cloud", "infrastructure", "modernisation", "modernization", "legacy", "architecture", "migration", "core", "system"],
        why: "Commercially important because fragmented platforms slow change and inflate run cost.",
        enabler: "Hybrid cloud, application modernisation, integration and platform consolidation",
        impact: "Faster release cycles, better resilience and reduced technical debt",
        stack: "Cloud & Infrastructure",
      },
    ];
  }

  function outsideInThemeRows(business, evidenceSnippets) {
    const fallbackSources = annualReportSourceLinks(currentPriorityCompany(), activeCaseCompanyProfile(state.activeCase));
    const priorityText = flattenText(business.priorityInsights || {});
    const rows = outsideInThemeDefinitions()
      .map((definition, index) => {
        const evidence = outsideInBestEvidence(evidenceSnippets, definition.pattern, index);
        const supported = evidence || definition.pattern.test(priorityText);
        if (!supported) return null;
        return {
          ...definition,
          evidence,
          evidenceText: outsideInEvidenceText(evidence),
          sources: outsideInSourceLinks(evidence, fallbackSources),
        };
      })
      .filter(Boolean);
    if (rows.length) return rows;
    return evidenceSnippets.slice(0, 3).map((evidence, index) => ({
      theme: `Source-backed priority ${index + 1}`,
      pattern: /./,
      why: "Commercially important because the annual report flags this as a management, performance or risk signal.",
      enabler: "Executive discovery workshop to translate the annual-report signal into a measurable technology opportunity",
      impact: "Prioritised business case with value, risk, speed and sponsorship assumptions",
      stack: ["Data & AI", "Applications & Platforms", "Cybersecurity & Risk"][index % 3],
      evidence,
      evidenceText: outsideInEvidenceText(evidence),
      sources: outsideInSourceLinks(evidence, fallbackSources),
    }));
  }

  function outsideInSuggestedEntryPoint(stack) {
    const entryMap = {
      "Data & AI": "AI value discovery and data readiness assessment",
      "Cloud & Infrastructure": "Cloud economics and modernisation assessment",
      "Applications & Platforms": "Process automation and platform rationalisation workshop",
      "Cybersecurity & Risk": "Resilience, identity and cyber risk assessment",
      "Customer Experience & Digital Channels": "Customer journey and digital adoption workshop",
    };
    return entryMap[stack] || "Executive opportunity workshop";
  }

  function outsideInEntryPointRationale(stack) {
    const rationaleMap = {
      "Data & AI": "Use this to qualify high-value AI use cases, data readiness, governance gaps and measurable business outcomes before platform investment.",
      "Cloud & Infrastructure": "Use this to quantify run-cost, resilience, technical-debt and migration economics with the CIO, CTO and CFO.",
      "Applications & Platforms": "Use this to identify workflow, application and operating-model simplification candidates tied to productivity or service speed.",
      "Cybersecurity & Risk": "Use this to connect board-level risk, critical services, identity and resilience evidence to funded control improvement.",
      "Customer Experience & Digital Channels": "Use this to map revenue, retention and service-friction opportunities across the highest-value customer journeys.",
    };
    return rationaleMap[stack] || "Use this to convert annual-report evidence into a scoped executive discussion and measurable value hypothesis.";
  }

  function outsideInVendorRecommendations(stack, company) {
    const industryKey = industryPeerKey((company && (company.peerGroup || company.industry || company.primaryIndustry)) || "");
    const byStack = {
      "Data & AI": [
        "Microsoft Azure OpenAI / OpenAI for governed GenAI pilots where leadership wants productivity and customer-service uplift.",
        "Databricks or Snowflake for lakehouse, data-sharing and model-ready governed data foundations.",
        industryKey === "retail"
          ? "Blue Yonder, RELEX or o9 for AI forecasting, availability and inventory productivity."
          : industryKey === "insurance"
            ? "Guidewire analytics, SAS or Earnix for claims, pricing, underwriting and risk selection."
            : "SAS, NICE Actimize or Quantexa for fraud, financial-crime, risk analytics and entity resolution.",
      ],
      "Cloud & Infrastructure": [
        "Microsoft Azure, AWS or Google Cloud for scalable data, AI and migration landing zones.",
        "Red Hat OpenShift for hybrid-cloud portability where regulated workloads need control and resilience.",
        "Apptio / Cloudability or native hyperscaler FinOps tooling to prove run-cost reduction to the CFO.",
      ],
      "Applications & Platforms": [
        "ServiceNow for workflow automation, operational resilience workflows and service productivity.",
        "Salesforce or Microsoft Dynamics for customer, sales and servicing journeys linked to revenue growth.",
        industryKey === "retail"
          ? "SAP, Oracle Retail or Manhattan Associates for merchandising, supply-chain and order-flow modernisation."
          : industryKey === "insurance"
            ? "Guidewire, Duck Creek or Salesforce Financial Services Cloud for policy, claims and distribution modernisation."
            : "Temenos, Finastra, FIS or Fiserv for core banking, payments and servicing-platform change.",
      ],
      "Cybersecurity & Risk": [
        "Microsoft Security, Palo Alto Networks or CrowdStrike for threat detection, endpoint and cloud posture management.",
        "Okta, Microsoft Entra or CyberArk for identity, privileged access and zero-trust controls.",
        "Splunk, Elastic or Sentinel for operational resilience, cyber telemetry and audit-ready evidence.",
      ],
      "Customer Experience & Digital Channels": [
        "Adobe Experience Platform, Salesforce Marketing Cloud or Braze for personalised engagement and journey orchestration.",
        "Twilio, Genesys or NICE for digital contact-centre, messaging and customer-service automation.",
        industryKey === "retail"
          ? "Bloomreach, Algolia or Constructor for AI search, recommendations and conversion improvement."
          : industryKey === "insurance"
            ? "Salesforce Financial Services Cloud or Guidewire Digital for policyholder and adviser servicing."
            : "Backbase, Adobe or Salesforce for digital onboarding, servicing and next-best-action journeys.",
      ],
    };
    return byStack[stack] || ["Our partner ecosystem to validate the most relevant vendors during discovery."];
  }

  function outsideInOpportunityRows(themeRows) {
    const company = currentPriorityCompany();
    const categoryOrder = [
      "Data & AI",
      "Cloud & Infrastructure",
      "Applications & Platforms",
      "Cybersecurity & Risk",
      "Customer Experience & Digital Channels",
    ];
    return categoryOrder.map((stack, index) => {
      const row = themeRows.find((item) => item.stack === stack) || themeRows[index % Math.max(1, themeRows.length)];
      const urgency = /risk|security|compliance|cost|margin|resilien/i.test(row?.theme || row?.evidenceText || "") ? "High" : "Medium";
      return {
        stack,
        cLevelPriority: row ? row.theme : "Annual-report priority required",
        priorityWhy: row ? row.why : "Upload the annual report to identify the executive priority.",
        opportunity: row ? row.enabler : "Annual-report evidence required",
        description: row ? `${row.theme}: ${row.impact}.` : "Upload the annual report to generate this opportunity.",
        value: row ? row.impact : "Source required",
        evidence: row ? row.evidenceText : "Annual report required",
        evidenceSnippet: row ? row.evidence : null,
        urgency,
        stakeholder: outsideInStakeholderForStack(stack),
        entryPoint: outsideInSuggestedEntryPoint(stack),
        entryPointRationale: outsideInEntryPointRationale(stack),
        vendors: row ? outsideInVendorRecommendations(stack, company) : ["Annual report evidence required before vendor selection."],
        salesAngle: row ? `Use the annual-report evidence to position a ${row.stack} workshop tied to ${row.theme.toLowerCase()}.` : "Upload annual report before client use.",
        sources: row ? row.sources : [],
      };
    });
  }

  function renderSuggestedEntryPoint(entryPoint, rationale = "") {
    if (!entryPoint) return "";
    return `
      <div class="entry-point-callout">
        <span>Sales entry point / ETS business angle</span>
        <strong>${escapeHtml(entryPoint)}</strong>
        ${rationale ? `<small>${escapeHtml(rationale)}</small>` : ""}
      </div>
    `;
  }

  function renderPriorityOpportunityVendors(row) {
    const vendors = (row.vendors || []).slice(0, 3);
    if (!vendors.length) return "";
    return `
      <div class="outside-in-vendor-compact">
        <span>Vendors / partners</span>
        <ul class="outside-in-vendor-list">
          ${vendors.map((vendor) => `<li>${escapeHtml(vendor)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function renderPriorityOpportunityEvidence(row) {
    const detail = outsideInEvidenceDetail(row.evidenceSnippet);
    return `
      <div class="outside-in-evidence-cell">
        <span>${escapeHtml(detail.type)}</span>
        <blockquote>${escapeHtml(detail.text)}</blockquote>
        ${detail.citation ? `<small>Source: ${escapeHtml(detail.citation)}${detail.source && detail.source !== detail.citation ? ` | ${escapeHtml(detail.source)}` : ""}</small>` : ""}
        ${renderOutsideInSources(row.sources)}
      </div>
    `;
  }

  function valueTreeFinancialBase(business) {
    const snapshot = (business && business.snapshot) || {};
    const latestRevenue = latestFinancialRevenue(business || {});
    const latest = latestFinancialTrendRow(business || {});
    const revenueText = latest.revenue || latestRevenue.value || snapshot.revenue || annualRevenueUsdDisplay(snapshot.annualRevenueUsd) || "";
    const ebitdaText = snapshot.ebitdaUsd ? annualRevenueUsdDisplay(snapshot.ebitdaUsd) || snapshot.ebitdaUsd : "";
    const revenueBillions = parseCurrencyAmount(revenueText);
    const ebitdaBillions = parseCurrencyAmount(ebitdaText);
    return {
      revenueText,
      ebitdaText,
      revenueBillions,
      ebitdaBillions,
      currency: currencyCode(revenueText || ebitdaText) || (snapshot.annualRevenueUsd || snapshot.ebitdaUsd ? "USD" : ""),
      year: latest.year || latestRevenue.year || snapshot.fiscalYear || "latest reported period",
    };
  }

  function formatValueTreeMoney(billions, currency) {
    if (!Number.isFinite(billions) || billions < 0) return "Validate";
    const prefix = currency ? `${currency} ` : "";
    if (billions === 0) return `${prefix}0M`;
    if (billions >= 1) return `${prefix}${(Math.round(billions * 10) / 10).toFixed(1)}B`;
    return `${prefix}${Math.max(1, Math.round(billions * 1000))}M`;
  }

  function valueTreeBenefitRange(base, lowPct, highPct) {
    const percent = `${formatPercentValue(lowPct)}-${formatPercentValue(highPct)} of revenue`;
    if (!base || !Number.isFinite(base.revenueBillions) || base.revenueBillions <= 0) {
      return { value: "Validate", basis: percent };
    }
    return {
      value: `${formatValueTreeMoney(base.revenueBillions * (lowPct / 100), base.currency)}-${formatValueTreeMoney(base.revenueBillions * (highPct / 100), base.currency)}`,
      basis: percent,
    };
  }

  function valueTreeEvidenceTermMatches(text, terms) {
    const haystack = normalizeLookupQuery(text);
    return (terms || []).filter((term) => {
      const needle = normalizeLookupQuery(term);
      if (!needle) return false;
      if (needle === "ai") return /\b(?:ai|genai|artificial intelligence|machine learning)\b/i.test(String(text || ""));
      return haystack.includes(needle);
    });
  }

  function valueTreeEvidenceHasMetric(text) {
    return /(?:\b\d+(?:\.\d+)?\s?%|\b\d+(?:,\d{3})*(?:\.\d+)?\s?(?:bn|billion|m|million|bps|basis points|employees|customers|clients)\b|\bFY20\d{2}\b|\b20\d{2}\b|(?:USD|GBP|EUR|\$|\u00a3|\u20ac)\s?\d)/i.test(String(text || ""));
  }

  function valueTreeEvidenceCandidate(snippet, item) {
    if (!snippet) return null;
    const text = cleanEvidenceFragment(snippet.snippet || snippet.summary || snippet.title || "", 720);
    const sourceText = `${snippet.source || ""} ${snippet.label || ""} ${snippet.url || ""}`;
    const isAnnualReport = /\b(?:annual report|annual financial report|annual review|10-k|20-f|universal registration|uploaded annual report|report evidence)\b/i.test(sourceText) ||
      /\/storage\/uploads\//i.test(snippet.url || "");
    if (!text || !isAnnualReport) return null;

    const coreMatches = valueTreeEvidenceTermMatches(text, item.evidenceCoreTerms);
    if (!coreMatches.length) return null;
    const contextMatches = valueTreeEvidenceTermMatches(text, item.evidenceContextTerms);
    const outcomeMatches = valueTreeEvidenceTermMatches(text, item.evidenceOutcomeTerms);
    if (Array.isArray(item.evidenceOutcomeTerms) && item.evidenceOutcomeTerms.length && !outcomeMatches.length) return null;
    const hasMetric = valueTreeEvidenceHasMetric(text);
    const isUploaded = /uploaded annual report|\/storage\/uploads\//i.test(sourceText);
    const hasCommitment = /\b(?:target|delivered|reported|reduced|increased|invested|saved|committed|expect|plan|programme|program)\b/i.test(text);
    const score = (coreMatches.length * 6) + contextMatches.length + (outcomeMatches.length * 4) + (hasMetric ? 4 : 0) + (isUploaded ? 2 : 0) + (hasCommitment ? 2 : 0);
    return {
      snippet,
      text,
      coreMatches,
      contextMatches,
      outcomeMatches,
      hasMetric,
      score,
    };
  }

  function valueTreeEvidenceForLever(snippets, item, usedKeys) {
    const candidates = (snippets || [])
      .map((snippet) => valueTreeEvidenceCandidate(snippet, item))
      .filter(Boolean)
      .sort((left, right) => right.score - left.score || right.text.length - left.text.length);
    const selected = candidates.find((candidate) => candidate.score >= 10 && !usedKeys.has(candidate.snippet.key));
    if (!selected) return null;
    usedKeys.add(selected.snippet.key);
    const detail = outsideInEvidenceDetail(selected.snippet);
    return {
      ...selected,
      detail,
      matchedTerms: [...new Set([...selected.coreMatches, ...selected.outcomeMatches, ...selected.contextMatches])].slice(0, 5),
    };
  }

  function valueTreePrioritySignal(priorityInsights, pattern) {
    const items = priorityInsightItems(priorityInsights);
    return items.find((item) => pattern.test(`${item.title || ""} ${item.summary || ""} ${item.quote || ""}`)) || null;
  }

  function buildValueTreeLevers(business, themeRows, priorityInsights) {
    const company = currentPriorityCompany();
    const industryKey = industryPeerKey(company.peerGroup || company.industry || company.primaryIndustry);
    const base = valueTreeFinancialBase(business);
    const branchText = {
      revenue: industryKey === "retail" || industryKey === "uk-retail" || industryKey === "online-retail"
        ? "More profitable customer missions across loyalty, digital conversion, availability and basket growth."
        : industryKey === "insurance"
          ? "More profitable growth through digital servicing, claims experience, advice journeys and retention."
          : "More profitable customer growth through digital adoption, relationship depth and next-best-action journeys.",
      cost: "Run-rate productivity, lower platform cost and faster change from automation, cloud economics and simplification.",
      risk: "EBITDA protection by reducing cyber, resilience, regulatory and control failure exposure.",
    };
    const leverSeed = [
      {
        branch: "Revenue",
        branchTone: "revenue",
        branchSummary: branchText.revenue,
        lever: industryKey === "retail" || industryKey === "uk-retail" || industryKey === "online-retail" ? "Personalised loyalty and conversion engine" : "Customer next-best-action growth engine",
        technology: "Customer data platform, AI recommendations, journey orchestration and consented personalisation",
        benefitType: "EBITDA uplift",
        range: [0.15, 0.45],
        proposal: "Stop buying isolated AI use cases. Build a customer decision engine that earns the next product, renewal or transaction.",
        etsEntryPoint: "Customer Growth & AI Value Sprint",
        etsAngle: "ETS Strategy & Advisory identifies the customer moments with the highest economic upside, baselines conversion and retention, tests data and AI readiness, and builds a sponsor-backed 90-day value case.",
        executiveQuestion: "Which customer moment, if improved measurably, would change revenue quality or share of wallet fastest?",
        firstMove: "Run a 90-day value sprint on one segment or journey with a baseline conversion, retention or cross-sell KPI.",
        proofPoint: "Incremental gross profit, digital adoption, conversion uplift and retention movement.",
        pattern: /growth|customer|digital|channel|loyalty|conversion|retention|experience/i,
        evidenceCoreTerms: ["revenue", "income growth", "growth", "market share", "retention", "loyalty", "cross-sell", "share of wallet", "personalisation", "personalization"],
        evidenceContextTerms: ["customer", "client", "digital", "segment", "relationship", "sales"],
        evidenceLinkage: "The disclosure establishes a stated growth, customer or relationship outcome that personalisation and next-best-action should improve. It supports the driver; the EBITDA range remains a directional value hypothesis, not a company forecast.",
      },
      {
        branch: "Revenue",
        branchTone: "revenue",
        branchSummary: branchText.revenue,
        lever: industryKey === "insurance" ? "Digital claims and adviser growth journeys" : "Digital onboarding and self-service acceleration",
        technology: "Digital experience platforms, workflow automation, GenAI assisted service and analytics",
        benefitType: "EBITDA uplift",
        range: [0.1, 0.35],
        proposal: "Remove the queue: make onboarding and service complete in one digital conversation instead of across disconnected handoffs.",
        etsEntryPoint: "Zero-Friction Journey Diagnostic",
        etsAngle: "ETS Strategy & Advisory maps journey leakage, avoidable demand and operating constraints, then prioritises the process, data, application and change interventions that protect revenue and reduce cost-to-serve.",
        executiveQuestion: "Where is friction causing lost sales, avoidable calls, lower retention or slower cash conversion?",
        firstMove: "Map one end-to-end onboarding or servicing journey, quantify drop-off and automate the highest-friction handoffs.",
        proofPoint: "Reduced abandonment, lower cost-to-serve, faster completion and protected revenue.",
        pattern: /digital|customer|service|claims|onboarding|journey|advice|channel/i,
        evidenceCoreTerms: ["digital", "mobile", "online", "self-service", "onboarding", "claims", "adviser", "journey", "channel", "customer experience"],
        evidenceContextTerms: ["customer", "client", "service", "growth", "retention", "conversion"],
        evidenceOutcomeTerms: ["growth", "retention", "conversion", "adoption", "onboarding", "self-service", "customer experience", "service improvement", "customer satisfaction", "journey"],
        evidenceLinkage: "The disclosure identifies a digital channel, service or customer-journey priority that this lever is designed to improve. It supports the driver; the EBITDA range remains a directional value hypothesis, not a company forecast.",
      },
      {
        branch: "Revenue",
        branchTone: "revenue",
        branchSummary: branchText.revenue,
        lever: industryKey === "retail" || industryKey === "uk-retail" || industryKey === "online-retail"
          ? "Retail media and ecosystem monetisation"
          : industryKey === "insurance"
            ? "Partner distribution and embedded protection"
            : "Embedded ecosystem and partner revenue",
        technology: "API products, partner identity, consented data exchange, ecosystem orchestration and usage-based commercial models",
        benefitType: "EBITDA uplift",
        range: [0.08, 0.25],
        proposal: "Turn distribution, data and trusted customer access into a partner-powered revenue channel before a platform competitor does.",
        etsEntryPoint: "Ecosystem Growth & Platform Strategy",
        etsAngle: "ETS Strategy & Advisory tests where the company can monetise reach, data or capabilities through partners, defines the commercial and operating model, and shapes a low-regret API or platform pilot.",
        executiveQuestion: "Which capability or customer relationship could create new revenue if external partners could consume it safely?",
        firstMove: "Select one ecosystem proposition, quantify addressable value and partner economics, then validate demand with two design partners.",
        proofPoint: "New fee income, partner-sourced demand, lower acquisition cost and faster proposition launch.",
        pattern: /partner|ecosystem|platform|distribution|embedded|api|market|product|growth|revenue/i,
        evidenceCoreTerms: ["partnership", "partner", "ecosystem", "platform", "distribution", "embedded", "market", "product", "growth", "revenue"],
        evidenceContextTerms: ["customer", "client", "digital", "data", "channel", "investment"],
        evidenceOutcomeTerms: ["growth", "revenue", "income", "market share", "distribution", "partnership", "customer growth"],
        evidenceLinkage: "The disclosure identifies a growth, distribution, platform or partnership priority that can be tested as a new ecosystem revenue model. It supports the driver; the EBITDA range remains a directional value hypothesis, not a company forecast.",
      },
      {
        branch: "Cost",
        branchTone: "cost",
        branchSummary: branchText.cost,
        lever: "AI-enabled workflow and colleague productivity",
        technology: "GenAI copilots, process mining, RPA/workflow orchestration and knowledge automation",
        benefitType: "EBITDA uplift",
        range: [0.2, 0.55],
        proposal: "Create an AI productivity P&L: every copilot must retire work, cycle time or external spend.",
        etsEntryPoint: "AI Productivity Value Office",
        etsAngle: "ETS Strategy & Advisory establishes the CFO baseline, selects high-volume work, redesigns roles and controls, and governs benefit capture so automation moves from pilots into the operating plan.",
        executiveQuestion: "Which manual process has enough volume, cost and executive pain to self-fund the next wave of change?",
        firstMove: "Use process mining and work sampling to isolate two automation candidates with hard run-rate savings.",
        proofPoint: "Hours removed, cycle-time reduction, error reduction and savings captured in the CFO baseline.",
        pattern: /cost|efficien|productivity|automation|operating model|simplif|margin/i,
        evidenceCoreTerms: ["automation", "productivity", "simplification", "operating model", "cost", "expense", "savings", "headcount", "workforce", "efficiency", "run-rate", "transformation"],
        evidenceContextTerms: ["colleague", "process", "margin", "programme", "program", "restructuring"],
        evidenceLinkage: "The disclosure states a cost, productivity or operating-model objective that workflow automation can address and the CFO can baseline. It supports the driver; the EBITDA range remains a directional value hypothesis, not a reported saving.",
      },
      {
        branch: "Cost",
        branchTone: "cost",
        branchSummary: branchText.cost,
        lever: "Cloud FinOps and platform consolidation",
        technology: "Hybrid cloud landing zones, FinOps tooling, application rationalisation and platform engineering",
        benefitType: "EBITDA uplift",
        range: [0.15, 0.4],
        proposal: "Put every platform on a margin contract: improve unit cost, release speed or resilience, or consolidate it.",
        etsEntryPoint: "Technology Economics & Platform Rationalisation",
        etsAngle: "ETS Strategy & Advisory creates a platform-level view of cost, demand, technical debt and business criticality, then sequences FinOps, modernisation and retirement decisions around measurable enterprise value.",
        executiveQuestion: "Which platforms consume change budget without improving speed, resilience or unit cost?",
        firstMove: "Build a platform economics view across run cost, technical debt, release frequency and resilience exposure.",
        proofPoint: "Committed cost takeout, reduced incidents, faster releases and lower infrastructure unit cost.",
        pattern: /cloud|platform|infrastructure|legacy|moderni|migration|architecture|core/i,
        evidenceCoreTerms: ["cloud", "platform", "infrastructure", "application", "technology estate", "legacy", "modernisation", "modernization", "architecture", "migration", "data centre", "data center", "core system"],
        evidenceContextTerms: ["technology", "investment", "cost", "resilience", "simplification", "system"],
        evidenceLinkage: "The disclosure identifies platform, infrastructure or legacy-estate change that can be tested for run-cost, resilience and release-speed value. It supports the driver; the EBITDA range remains a directional value hypothesis, not a reported saving.",
      },
      {
        branch: "Cost",
        branchTone: "cost",
        branchSummary: branchText.cost,
        lever: "Run-to-transform operating model and supplier reset",
        technology: "Service integration, AIOps, product operating models, sourcing analytics and outcome-based supplier governance",
        benefitType: "EBITDA uplift",
        range: [0.12, 0.35],
        proposal: "Fund transformation from the run budget by redesigning service towers, suppliers and technology teams around business outcomes.",
        etsEntryPoint: "Technology Operating Model & Sourcing Reset",
        etsAngle: "ETS Strategy & Advisory exposes duplicated accountability and supplier spend, defines the future product and service model, and builds a transition case that releases run-rate funding without destabilising critical operations.",
        executiveQuestion: "Where is the organisation paying more because accountability is split across towers, suppliers and internal teams?",
        firstMove: "Baseline one service domain across demand, labour, contracts, incidents and change throughput, then design the target accountability and sourcing model.",
        proofPoint: "Run-rate spend released, fewer handoffs, improved service ownership and higher change throughput.",
        pattern: /supplier|vendor|operating model|workforce|service|sourcing|third-party|cost|productivity|transformation/i,
        evidenceCoreTerms: ["supplier", "vendor", "operating model", "workforce", "service", "sourcing", "third-party", "third party", "cost", "productivity", "transformation"],
        evidenceContextTerms: ["technology", "operations", "colleague", "contract", "efficiency", "simplification"],
        evidenceOutcomeTerms: ["cost", "savings", "efficiency", "productivity", "simplification", "run-rate", "operating model"],
        evidenceLinkage: "The disclosure identifies cost, productivity, supplier or operating-model pressure that can be addressed through a run-to-transform model. It supports the driver; the EBITDA range remains a directional value hypothesis, not a reported saving.",
      },
      {
        branch: "Risk",
        branchTone: "risk",
        branchSummary: branchText.risk,
        lever: "Cyber resilience and identity control uplift",
        technology: "Zero trust, identity governance, endpoint detection, cloud security posture and incident automation",
        benefitType: "EBITDA protected",
        range: [0.05, 0.2],
        proposal: "Price cyber exposure in EBITDA terms and fund the controls that protect the most valuable critical services first.",
        etsEntryPoint: "Cyber Value-at-Risk & Critical Services Strategy",
        etsAngle: "ETS Strategy & Advisory connects critical services, threat scenarios, identity and recovery gaps to financial exposure, giving the Board a risk-based investment sequence rather than a technology wish list.",
        executiveQuestion: "Where would an identity, data or service outage create the largest customer, regulatory or EBITDA impact?",
        firstMove: "Run a risk-to-value assessment across critical services, privileged access, cloud posture and incident response.",
        proofPoint: "Reduced exposure on critical services, faster detection and lower remediation/control cost.",
        pattern: /risk|security|cyber|identity|fraud|resilien|control|privacy/i,
        evidenceCoreTerms: ["cyber", "cybersecurity", "identity", "security", "data breach", "technology risk", "privileged access", "resilience"],
        evidenceContextTerms: ["critical service", "control", "incident", "outage", "risk", "customer trust"],
        evidenceLinkage: "The disclosure identifies cyber, identity or technology-resilience exposure that can create financial, customer or regulatory loss. It supports an EBITDA-protection driver; the range is a directional risk-value hypothesis, not a reported saving.",
      },
      {
        branch: "Risk",
        branchTone: "risk",
        branchSummary: branchText.risk,
        lever: "Regulatory evidence and operational resilience automation",
        technology: "Control evidence automation, data lineage, third-party risk monitoring and resilience dashboards",
        benefitType: "EBITDA protected",
        range: [0.05, 0.18],
        proposal: "Replace periodic control evidence with a continuous assurance fabric that shows the Board and regulators what is working now.",
        etsEntryPoint: "Continuous Controls & Operational Resilience Blueprint",
        etsAngle: "ETS Strategy & Advisory redesigns the control and assurance model, identifies evidence that can be automated, and creates a roadmap linking critical services, controls, incidents, vendors and recovery outcomes.",
        executiveQuestion: "Where does the organisation spend too much time proving control instead of improving control?",
        firstMove: "Automate evidence capture for one critical service, linking controls, incidents, vendors and recovery metrics.",
        proofPoint: "Lower manual evidence effort, faster assurance response and stronger critical-service visibility.",
        pattern: /regulat|compliance|resilien|third-party|risk|governance|audit|control/i,
        evidenceCoreTerms: ["regulatory", "compliance", "operational resilience", "third-party", "third party", "audit", "control", "governance", "financial crime", "conduct"],
        evidenceContextTerms: ["assurance", "critical service", "risk", "evidence", "remediation", "oversight"],
        evidenceLinkage: "The disclosure identifies a regulatory, control or operational-resilience obligation where evidence automation can reduce manual assurance effort and strengthen oversight. It supports an EBITDA-protection driver; the range is directional, not a reported saving.",
      },
      {
        branch: "Risk",
        branchTone: "risk",
        branchSummary: branchText.risk,
        lever: "Third-party concentration and exit readiness",
        technology: "Supplier dependency mapping, continuous risk signals, service lineage, exit orchestration and recovery simulation",
        benefitType: "EBITDA protected",
        range: [0.03, 0.12],
        proposal: "Treat third-party concentration as an earnings risk: prove substitution, exit and recovery before the next supplier failure.",
        etsEntryPoint: "Third-Party Concentration & Exit Readiness",
        etsAngle: "ETS Strategy & Advisory maps supplier dependencies to critical services and financial exposure, challenges contractual and technical exit assumptions, and prioritises resilience investment around credible recovery options.",
        executiveQuestion: "Which supplier failure would stop a critical service before the organisation could execute a credible alternative?",
        firstMove: "Select the highest-concentration service, trace end-to-end dependencies and run a tabletop exit and substitution scenario with business, risk, procurement and technology owners.",
        proofPoint: "Reduced concentration exposure, tested exit time, clearer contingency cost and stronger Board assurance.",
        pattern: /third-party|supplier|vendor|concentration|outsourc|dependency|resilien|recovery|exit/i,
        evidenceCoreTerms: ["third-party", "third party", "supplier", "vendor", "outsourcing", "concentration", "dependency", "recovery", "exit"],
        evidenceContextTerms: ["critical service", "resilience", "risk", "contract", "continuity", "control"],
        evidenceOutcomeTerms: ["third-party", "third party", "supplier", "resilience", "recovery", "continuity", "risk"],
        evidenceLinkage: "The disclosure identifies a supplier, outsourcing, concentration or recovery dependency that can threaten critical-service continuity. It supports an EBITDA-protection driver; the range is directional, not a reported saving.",
      },
    ];
    const evidenceSnippets = outsideInEvidenceSnippets(business);
    const fallbackSources = annualReportSourceLinks(company, activeCaseCompanyProfile(state.activeCase));
    const usedEvidenceKeys = new Set();
    return leverSeed.map((item, index) => {
      const benefit = valueTreeBenefitRange(base, item.range[0], item.range[1]);
      const evidence = valueTreeEvidenceForLever(evidenceSnippets, item, usedEvidenceKeys);
      const signal = valueTreePrioritySignal(priorityInsights, item.pattern);
      const hasRevenueBase = Number.isFinite(base.revenueBillions) && base.revenueBillions > 0;
      const benefitLowBillions = hasRevenueBase ? base.revenueBillions * (item.range[0] / 100) : null;
      const benefitHighBillions = hasRevenueBase ? base.revenueBillions * (item.range[1] / 100) : null;
      return {
        ...item,
        ebitdaBenefit: benefit.value,
        benefitBasis: benefit.basis,
        benefitLowBillions,
        benefitHighBillions,
        benefitMidBillions: hasRevenueBase ? (benefitLowBillions + benefitHighBillions) / 2 : null,
        evidence: evidence ? evidence.detail.text : "No directly matched annual-report quote or data point was found for this benefit driver.",
        evidenceType: evidence ? evidence.detail.type : "Annual-report evidence gap",
        evidenceCitation: evidence ? evidence.detail.citation : "",
        evidenceSource: evidence ? evidence.detail.source : "",
        evidenceMatchedTerms: evidence ? evidence.matchedTerms : [],
        evidenceLinkage: evidence ? item.evidenceLinkage : "An unrelated annual-report excerpt is deliberately not shown as evidence. Upload or refresh the report analysis to find a direct match.",
        evidenceMatched: !!evidence,
        prioritySignal: signal ? cleanNarrativeFragment(signal.title || signal.summary, 120) : "",
        prioritySignalDetail: signal ? cleanNarrativeFragment(signal.summary || signal.quote || "", 170) : "",
        sources: evidence ? outsideInSourceLinks(evidence.snippet, fallbackSources) : fallbackSources,
        confidence: evidence ? (evidence.hasMetric ? "Quantified source" : "Direct source") : "Source needed",
      };
    });
  }

  function renderValueTreeEvidence(row) {
    const terms = (row.evidenceMatchedTerms || []).slice(0, 5);
    return `
      <div class="value-tree-driver-evidence${row.evidenceMatched ? "" : " is-missing"}">
        <div class="value-tree-driver-evidence-head">
          <span>${escapeHtml(row.evidenceType || "Annual-report evidence")}</span>
          ${row.evidenceCitation ? `<small>${escapeHtml(row.evidenceCitation)}</small>` : ""}
        </div>
        ${row.evidenceMatched
          ? `<blockquote>${escapeHtml(row.evidence)}</blockquote>`
          : `<p>${escapeHtml(row.evidence)}</p>`}
        <p class="value-tree-driver-link"><strong>Why it supports this driver:</strong> ${escapeHtml(row.evidenceLinkage || "")}</p>
        ${terms.length ? `
          <div class="value-tree-evidence-terms" aria-label="Matched annual-report concepts">
            <span>Matched in report</span>
            ${terms.map((term) => `<em>${escapeHtml(term)}</em>`).join("")}
          </div>
        ` : ""}
        ${renderOutsideInSources(row.sources)}
      </div>
    `;
  }

  function renderValueTreeBranch(branch, rows) {
    const tone = rows[0]?.branchTone || "";
    return `
      <article class="value-tree-branch ${attr(tone)}">
        <div class="value-tree-branch-head">
          <span>${escapeHtml(branch)}</span>
          <p>${escapeHtml(rows[0]?.branchSummary || "")}</p>
        </div>
        <div class="value-tree-levers">
          ${rows.map((row) => `
            <div class="value-tree-lever">
              <div class="value-tree-lever-title">
                <strong>${escapeHtml(row.lever)}</strong>
                <span>${escapeHtml(row.confidence)}</span>
              </div>
              <p>${escapeHtml(row.technology)}</p>
              ${row.prioritySignal ? `
                <div class="value-tree-priority-signal">
                  <span>Priority folded in</span>
                  <strong>${escapeHtml(row.prioritySignal)}</strong>
                  ${row.prioritySignalDetail ? `<small>${escapeHtml(row.prioritySignalDetail)}</small>` : ""}
                </div>
              ` : ""}
              <div class="value-tree-benefit">
                <span>${escapeHtml(row.benefitType)}</span>
                <strong>${escapeHtml(row.ebitdaBenefit)}</strong>
                <small>${escapeHtml(row.benefitBasis)}</small>
              </div>
              <div class="value-tree-proposal">
                <span>Provocative proposal</span>
                <strong>${escapeHtml(row.proposal)}</strong>
                <dl>
                  <div><dt>C-level question</dt><dd>${escapeHtml(row.executiveQuestion)}</dd></div>
                  <div><dt>First move</dt><dd>${escapeHtml(row.firstMove)}</dd></div>
                  <div><dt>Proof point</dt><dd>${escapeHtml(row.proofPoint)}</dd></div>
                </dl>
              </div>
              <div class="value-tree-ets-angle">
                <span>Sales Entry Point / ETS Strategy & Advisory Angle</span>
                <strong>${escapeHtml(row.etsEntryPoint || "Executive value discovery")}</strong>
                <p>${escapeHtml(row.etsAngle || "ETS Strategy & Advisory converts the hypothesis into a measurable client value case and sequenced roadmap.")}</p>
              </div>
              ${renderValueTreeEvidence(row)}
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  function ebitdaWaterfallRows(rows) {
    const branchOrder = ["Cost", "Revenue", "Risk"];
    return branchOrder.flatMap((branch) => rows.filter((row) => row.branch === branch));
  }

  function formatValueTreeRange(low, high, currency) {
    if (!Number.isFinite(low) || !Number.isFinite(high)) return "Validate range";
    return `${formatValueTreeMoney(low, currency)}-${formatValueTreeMoney(high, currency)}`;
  }

  function renderEbitdaBenefitWaterfall(rows, base) {
    const drivers = ebitdaWaterfallRows(rows);
    if (!drivers.length || drivers.some((row) => !Number.isFinite(row.benefitMidBillions))) {
      return `
        <div class="ebitda-waterfall-empty">
          <strong>Potential Value To Customer</strong>
          <span>A numeric revenue baseline is required to calculate and display the benefit bridge.</span>
        </div>
      `;
    }

    const chartRows = [];
    let cumulative = 0;
    drivers.forEach((row) => {
      const start = cumulative;
      cumulative += row.benefitMidBillions;
      chartRows.push({ ...row, start, end: cumulative, isTotal: false });
    });
    const totalLow = drivers.reduce((sum, row) => sum + row.benefitLowBillions, 0);
    const totalHigh = drivers.reduce((sum, row) => sum + row.benefitHighBillions, 0);
    chartRows.push({
      branch: "Total",
      lever: "Potential value to customer",
      ebitdaBenefit: formatValueTreeRange(totalLow, totalHigh, base.currency),
      benefitMidBillions: cumulative,
      start: 0,
      end: cumulative,
      isTotal: true,
    });

    const width = 1120;
    const height = 320;
    const margin = { left: 74, right: 28, top: 36, bottom: 24 };
    const plotHeight = height - margin.top - margin.bottom;
    const plotWidth = width - margin.left - margin.right;
    const slotWidth = plotWidth / chartRows.length;
    const barWidth = Math.min(78, Math.max(48, slotWidth * 0.68));
    const maxValue = Math.max(cumulative * 1.16, 0.001);
    const yFor = (value) => margin.top + plotHeight - (value / maxValue) * plotHeight;
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const groupTotals = ["Cost", "Revenue", "Risk"].map((branch) => ({
      branch,
      value: drivers.filter((row) => row.branch === branch).reduce((sum, row) => sum + row.benefitMidBillions, 0),
      count: drivers.filter((row) => row.branch === branch).length,
    }));
    let groupStartColumn = 1;
    const groupLayout = groupTotals.map((group) => {
      const positioned = { ...group, startColumn: groupStartColumn };
      groupStartColumn += group.count;
      return positioned;
    });

    const gridMarkup = ticks.map((tick) => {
      const value = maxValue * tick;
      const y = yFor(value);
      return `
        <line class="waterfall-grid-line" x1="${margin.left}" y1="${y.toFixed(2)}" x2="${width - margin.right}" y2="${y.toFixed(2)}"></line>
        <text class="waterfall-axis-label" x="${margin.left - 10}" y="${(y + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatValueTreeMoney(value, base.currency))}</text>
      `;
    }).join("");

    const connectorMarkup = chartRows.slice(0, -1).map((row, index) => {
      const x1 = margin.left + slotWidth * index + (slotWidth + barWidth) / 2;
      const x2 = margin.left + slotWidth * (index + 1) + (slotWidth - barWidth) / 2;
      const y = yFor(row.end);
      return `<line class="waterfall-connector" x1="${x1.toFixed(2)}" y1="${y.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y.toFixed(2)}" style="--waterfall-delay:${index * 110 + 210}ms"></line>`;
    }).join("");

    const barMarkup = chartRows.map((row, index) => {
      const x = margin.left + slotWidth * index + (slotWidth - barWidth) / 2;
      const topValue = Math.max(row.start, row.end);
      const bottomValue = Math.min(row.start, row.end);
      const y = yFor(topValue);
      const barHeight = Math.max(3, yFor(bottomValue) - y);
      const tone = String(row.branch || "").toLowerCase();
      const valueLabel = formatValueTreeMoney(row.benefitMidBillions, base.currency);
      return `
        <g class="waterfall-bar-group ${attr(tone)}" style="--waterfall-delay:${index * 110 + 120}ms">
          <title>${escapeHtml(`${row.lever}: midpoint ${valueLabel}; range ${row.ebitdaBenefit}`)}</title>
          <rect class="waterfall-bar ${attr(tone)}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth}" height="${barHeight.toFixed(2)}" rx="4"></rect>
          <text class="waterfall-value-label" x="${(x + barWidth / 2).toFixed(2)}" y="${Math.max(18, y - 8).toFixed(2)}" text-anchor="middle">${escapeHtml(valueLabel)}</text>
        </g>
      `;
    }).join("");

    return `
      <div class="ebitda-waterfall">
        <div class="ebitda-waterfall-heading">
          <div>
            <div class="block-label">Potential Value To Customer</div>
            <h4>Cost â†’ Revenue â†’ Risk</h4>
            <p>Directional midpoint bridge across the value hypotheses. Risk bars represent EBITDA protected; overlapping benefits require validation before aggregation.</p>
          </div>
          <strong>${escapeHtml(formatValueTreeRange(totalLow, totalHigh, base.currency))}</strong>
        </div>
        <div class="waterfall-summary-strip">
          ${groupTotals.map((group) => `
            <div class="${attr(group.branch.toLowerCase())}"><span>${escapeHtml(group.branch)}</span><strong>${escapeHtml(formatValueTreeMoney(group.value, base.currency))}</strong></div>
          `).join("")}
          <div class="total"><span>Total midpoint</span><strong>${escapeHtml(formatValueTreeMoney(cumulative, base.currency))}</strong></div>
        </div>
        <div class="waterfall-scroll">
          <div class="waterfall-canvas">
            <svg class="waterfall-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Potential value to customer waterfall ordered by Cost, Revenue and Risk">
              ${gridMarkup}
              ${connectorMarkup}
              ${barMarkup}
            </svg>
            <div class="waterfall-driver-labels" style="--waterfall-columns:${chartRows.length}">
              ${chartRows.map((row) => `
                <div${row.leverId ? ` id="${attr(row.leverId)}"` : ""} class="${attr(String(row.branch || "").toLowerCase())}">
                  <strong>${escapeHtml(row.lever)}</strong>
                  <span>${escapeHtml(row.ebitdaBenefit)}</span>
                </div>
              `).join("")}
            </div>
            <div class="waterfall-group-labels" style="--waterfall-columns:${chartRows.length}">
              ${groupLayout.map((group) => `
                <span class="${attr(group.branch.toLowerCase())}" style="grid-column:${group.startColumn} / span ${group.count}">${escapeHtml(group.branch)}</span>
              `).join("")}
              <span class="total" style="grid-column:${chartRows.length}">Total</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTechnologyValueTree(business, themeRows, priorityInsights) {
    const rows = buildValueTreeLevers(business, themeRows, priorityInsights);
    const base = valueTreeFinancialBase(business);
    const branches = ["Revenue", "Cost", "Risk"];
    return `
      <div class="value-tree-section">
        <div class="value-tree-header">
          <div>
            <div class="block-label">Technology Value Tree</div>
            <h3>Revenue | Cost | Risk To EBITDA</h3>
            <p>Client-ready value hypotheses, each paired with an Account Executive proposition and an ETS Strategy & Advisory entry point.</p>
          </div>
          <div class="value-tree-baseline">
            <span>Baseline</span>
            <strong>${escapeHtml(base.revenueText || "Revenue pending")}</strong>
            <small>${escapeHtml(base.year)}${base.ebitdaText ? ` | EBITDA ${base.ebitdaText}` : ""}</small>
          </div>
        </div>
        ${renderEbitdaBenefitWaterfall(rows, base)}
        <details class="value-tree-disclosure">
          <summary>
            <span>Click for Detail</span>
            <strong>Open Revenue, Cost and Risk propositions</strong>
          </summary>
          <div class="value-tree-detail-body">
            <div class="value-tree-grid">
              ${branches.map((branch) => renderValueTreeBranch(branch, rows.filter((row) => row.branch === branch))).join("")}
            </div>
          </div>
        </details>
      </div>
    `;
  }

  function outsideInPeerAiUseCase(peer, targetCompany, index) {
    const name = String(peer && peer.company || "");
    const key = normalizeLookupQuery(name);
    const industryKey = industryPeerKey((targetCompany && (targetCompany.peerGroup || targetCompany.industry || targetCompany.primaryIndustry)) || "");
    const catalogue = [
      {
        match: /hsbc/,
        useCase: "AI-enabled fraud, financial-crime analytics and digital servicing across global banking channels.",
        benefit: "Improves risk detection, control productivity and customer-service speed across large multi-market operations.",
      },
      {
        match: /natwest/,
        useCase: "Digital assistant, data-led personalisation and cloud-enabled retail banking journeys.",
        benefit: "Defends customer primacy, improves digital adoption and lowers cost-to-serve in everyday banking.",
      },
      {
        match: /lloyds/,
        useCase: "Data and AI for personalised financial journeys, fraud controls and colleague productivity.",
        benefit: "Links relationship growth with process simplification, risk reduction and operating leverage.",
      },
      {
        match: /standard chartered/,
        useCase: "Analytics-led corporate banking, financial-crime controls and digital platforms across cross-border banking.",
        benefit: "Strengthens risk management, client servicing and speed in complex regulated markets.",
      },
      {
        match: /barclays/,
        useCase: "AI-assisted customer, fraud, engineering and risk workflows aligned to digital banking and markets platforms.",
        benefit: "Targets productivity, customer experience and control quality while supporting revenue-generating franchises.",
      },
      {
        match: /tesco/,
        useCase: "Clubcard analytics, AI demand forecasting and supply-chain availability optimisation.",
        benefit: "Supports basket growth, loyalty economics, availability and working-capital discipline.",
      },
      {
        match: /sainsbury/,
        useCase: "Nectar data, digital shopping journeys and AI-supported forecasting for grocery and general merchandise.",
        benefit: "Improves personalisation, stock availability, customer frequency and fulfilment productivity.",
      },
      {
        match: /marks|spencer|m&s/,
        useCase: "Sparks personalisation, omnichannel retail data and store-to-digital journey optimisation.",
        benefit: "Supports customer engagement, conversion, availability and operating leverage across food, clothing and home.",
      },
      {
        match: /next/,
        useCase: "Total Platform, retail data services and automated fulfilment for scalable digital commerce.",
        benefit: "Expands platform revenue, improves fulfilment economics and accelerates brand onboarding.",
      },
      {
        match: /kingfisher/,
        useCase: "AI search, product data, marketplace and store operations analytics for home-improvement retail.",
        benefit: "Improves conversion, product discovery, availability and store productivity.",
      },
      {
        match: /brown|jd williams|jacamo/,
        useCase: "Digital retail credit analytics, customer personalisation and journey automation.",
        benefit: "Supports customer retention, credit-risk discipline, conversion and lower service cost.",
      },
      {
        match: /aviva/,
        useCase: "AI-assisted claims, digital servicing, adviser enablement and retirement customer analytics.",
        benefit: "Improves claims speed, retention, advice productivity and cost-to-serve.",
      },
      {
        match: /legal.*general|l&g/,
        useCase: "Retirement platform analytics, digital advice, claims automation and capital/risk modelling.",
        benefit: "Supports distribution productivity, risk selection, service speed and capital discipline.",
      },
      {
        match: /prudential/,
        useCase: "Digital health, adviser platforms, underwriting analytics and customer engagement AI.",
        benefit: "Improves distribution scale, underwriting quality, cross-sell and digital adoption.",
      },
    ];
    const exact = catalogue.find((item) => item.match.test(key));
    if (exact) return exact;
    const fallback = {
      retail: [
        "AI demand forecasting, loyalty personalisation and fulfilment optimisation.",
        "Improves availability, conversion, stock productivity and customer retention.",
      ],
      "uk-retail": [
        "AI demand forecasting, loyalty personalisation and fulfilment optimisation.",
        "Improves availability, conversion, stock productivity and customer retention.",
      ],
      insurance: [
        "AI claims triage, underwriting analytics and digital servicing journeys.",
        "Improves claims speed, risk selection, retention and operating efficiency.",
      ],
      "financial-services": [
        "AI financial-crime analytics, digital onboarding and operations automation.",
        "Improves control quality, customer speed, cost-to-serve and regulatory confidence.",
      ],
      technology: [
        "AI product analytics, developer productivity and cloud-scale automation.",
        "Improves release speed, customer engagement and platform operating leverage.",
      ],
    }[industryKey] || [
      "AI-enabled customer, operations and risk analytics aligned to the peer's operating model.",
      "Improves speed, productivity, customer relevance and management control.",
    ];
    return {
      useCase: `${fallback[0]} Peer ${index + 1} should be validated against public annual reports and IR material.`,
      benefit: fallback[1],
    };
  }

  function outsideInCompetitorBenchmarks(business, evidenceSnippets) {
    const company = currentPriorityCompany();
    const peerRows = topPeerComparisonRows(business)
      .filter((row) => !row.isCustomer && !isExampleBankName(row.company))
      .slice(0, 4);
    const evidence = outsideInBestEvidence(evidenceSnippets, /digital|ai|data|customer|automation|platform|risk|resilien/i, 0);
    const sourceLinks = outsideInSourceLinks(evidence, annualReportSourceLinks(company, activeCaseCompanyProfile(state.activeCase)));
    return peerRows.map((peer, index) => {
      const benchmark = outsideInPeerAiUseCase(peer, company, index);
      return {
      company: peer.company,
      useCase: benchmark.useCase,
      benefit: benchmark.benefit,
      gap: `${company.name || "The target"} should test whether this peer capability creates a gap in growth, service speed, productivity or risk control.`,
      entryPoint: "Peer AI and digital gap assessment",
      entryPointRationale: "Use this to compare target-company priorities with peer AI/digital use cases and identify one defensible executive conversation.",
      evidence: outsideInEvidenceText(evidence),
      sources: sourceLinks,
      };
    });
  }

  function outsideInHyperscalerRows(opportunities) {
    const capabilityMap = {
      "Data & AI": "Azure OpenAI / AWS Bedrock / Google Vertex AI with governed data platforms",
      "Cloud & Infrastructure": "Hybrid cloud landing zones, migration factories, cloud cost management and resilience services",
      "Applications & Platforms": "Cloud marketplace workflow, integration, ERP/CRM modernisation and automation services",
      "Cybersecurity & Risk": "Cloud-native security posture, identity, threat detection and compliance automation",
      "Customer Experience & Digital Channels": "AI-enabled customer engagement, CDP, analytics and omnichannel platforms",
    };
    return opportunities.map((row) => ({
      stack: row.stack,
      capability: capabilityMap[row.stack] || "Hyperscaler partner ecosystem",
      useCase: row.opportunity,
      relevance: row.value,
      entryPoint: row.entryPoint,
      entryPointRationale: row.entryPointRationale,
      evidence: row.evidence,
      sources: row.sources,
    }));
  }

  function outsideInStakeholderForStack(stack) {
    const stakeholderMap = {
      "Data & AI": "CIO / CDO",
      "Cloud & Infrastructure": "CIO / CTO",
      "Applications & Platforms": "COO / CIO",
      "Cybersecurity & Risk": "CISO / CRO",
      "Customer Experience & Digital Channels": "CMO / COO / CIO",
      "Peer benchmark": "CIO / CTO / Business Executive",
    };
    return stakeholderMap[stack] || "CIO / Business Executive";
  }

  function outsideInEtsEntryPointRows(opportunities, competitors, hyperscalerRows) {
    const buckets = new Map();
    const addUnique = (rows, value, max = 8) => {
      const text = cleanNarrativeFragment(value, 240);
      if (!text || rows.some((item) => normalizeLookupQuery(item) === normalizeLookupQuery(text))) return;
      if (rows.length < max) rows.push(text);
    };
    const addSources = (rows, sources) => {
      (sources || []).forEach((source) => {
        if (!source || !source.url) return;
        const key = `${source.label || "Source"}|${source.url}`;
        if (rows.some((item) => `${item.label || "Source"}|${item.url}` === key)) return;
        rows.push({ label: source.label || "Source", url: source.url });
      });
    };
    const add = (item) => {
      const entryPoint = cleanNarrativeFragment(item && item.entryPoint, 160);
      if (!entryPoint) return;
      const key = normalizeLookupQuery(entryPoint);
      const existing = buckets.get(key) || {
        entryPoint,
        stack: item.stack || "Cross-portfolio",
        urgency: item.urgency || "Medium",
        priorities: [],
        values: [],
        stakeholders: [],
        coverage: [],
        businessAngles: [],
        evidence: "",
        sources: [],
      };
      if (item.urgency === "High") existing.urgency = "High";
      if (!existing.evidence && item.evidence) existing.evidence = cleanEvidenceFragment(item.evidence, 520);
      addUnique(existing.priorities, item.priority, 5);
      addUnique(existing.values, item.value, 4);
      addUnique(existing.stakeholders, item.stakeholder || outsideInStakeholderForStack(item.stack), 4);
      addUnique(existing.coverage, item.section, 6);
      addUnique(existing.businessAngles, item.businessAngle, 3);
      addSources(existing.sources, item.sources);
      buckets.set(key, existing);
    };

    (opportunities || []).forEach((row) => add({
      entryPoint: row.entryPoint,
      stack: row.stack,
      urgency: row.urgency,
      priority: `${row.cLevelPriority}: ${row.opportunity}`,
      value: row.value,
      stakeholder: outsideInStakeholderForStack(row.stack),
      section: "Executive priority",
      businessAngle: [row.salesAngle, row.entryPointRationale].filter(Boolean).join(" "),
      evidence: row.evidence,
      sources: row.sources,
    }));
    (competitors || []).forEach((row) => add({
      entryPoint: row.entryPoint,
      stack: "Peer benchmark",
      priority: `${row.company}: ${row.useCase}`,
      value: row.benefit,
      stakeholder: outsideInStakeholderForStack("Peer benchmark"),
      section: "Competitor benchmark",
      businessAngle: row.entryPointRationale,
      evidence: row.evidence,
      sources: row.sources,
    }));
    (hyperscalerRows || []).forEach((row) => add({
      entryPoint: row.entryPoint,
      stack: row.stack,
      priority: `${row.capability}: ${row.useCase}`,
      value: row.relevance,
      stakeholder: outsideInStakeholderForStack(row.stack),
      section: "Hyperscaler ecosystem",
      businessAngle: row.entryPointRationale,
      evidence: row.evidence,
      sources: row.sources,
    }));

    const urgencyOrder = { High: 0, Medium: 1, Low: 2 };
    return [...buckets.values()].sort((a, b) =>
      (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9) ||
      a.stack.localeCompare(b.stack) ||
      a.entryPoint.localeCompare(b.entryPoint)
    );
  }

  function renderDeepAnalysisPrioritySignals(business) {
    const evidenceSnippets = outsideInEvidenceSnippets(business);
    if (!evidenceSnippets.length) return "";
    const themeRows = outsideInThemeRows(business, evidenceSnippets);
    return `
      <section class="section deep-analysis-priority-signals">
        <div class="section-heading">
          <div>
            <h2>Evidence-Weighted Technology Priority Signals</h2>
            <p class="muted">Annual-report evidence and company-context industry research ranked into one executive technology view.</p>
          </div>
        </div>
        ${renderOutsideInSignalGraph(themeRows, business, evidenceSnippets)}
      </section>
    `;
  }

  const PRIORITY_OVERLAP_TOPICS = [
    { label: "AI & Data", terms: ["ai", "artificial intelligence", "genai", "data", "analytics", "personalisation", "predictive"] },
    { label: "Digital Growth", terms: ["digital", "online", "omnichannel", "customer", "revenue", "growth", "conversion", "loyalty", "channel"] },
    { label: "Cost & Productivity", terms: ["cost", "efficiency", "productivity", "margin", "automation", "simplification", "operating model", "expense"] },
    { label: "Cloud & Platforms", terms: ["cloud", "platform", "modernisation", "modernization", "legacy", "infrastructure", "application", "technology"] },
    { label: "Risk & Resilience", terms: ["risk", "resilience", "cyber", "security", "control", "regulatory", "compliance", "trust", "fraud"] },
    { label: "Supply & Operations", terms: ["supply", "fulfilment", "fulfillment", "operations", "logistics", "inventory", "service", "delivery"] },
    { label: "Pricing & Commercial", terms: ["pricing", "category", "assortment", "commercial", "market share", "basket", "profitability"] },
    { label: "Capital & Cash", terms: ["cash", "capital", "asset", "debt", "liquidity", "working capital", "free cash flow"] },
    { label: "People & Skills", terms: ["people", "talent", "skills", "colleague", "workforce", "employee", "headcount"] },
    { label: "Sustainability", terms: ["sustainability", "climate", "carbon", "esg", "emissions", "environment"] },
  ];

  function priorityOverlapTextScore(text, terms) {
    return outsideInSignalTermHits(text, terms);
  }

  function priorityOverlapExternalItems(business) {
    const company = currentPriorityCompany();
    const researchRows = mergeResearchFirmPriorities(business && business.researchFirmPriorities, company);
    return researchRows.map((row) => ({
      source: row.firm || row.source || "External research",
      title: row.priority || row.theme || row.firm || "Research priority",
      text: `${row.firm || ""} ${row.priority || ""} ${row.signal || ""} ${row.implication || ""} ${row.reportTitle || ""}`,
      evidence: cleanResearchDisplayText(row.signal || row.implication || row.priority || ""),
    })).filter((row) => row.text.trim());
  }

  function priorityOverlapAnnualItems(business) {
    const insights = (business && business.priorityInsights) || {};
    const rows = [
      ...((insights.businessPriorities || []).map((row) => ({ ...row, group: "Business priority" }))),
      ...((insights.industryTrends || []).map((row) => ({ ...row, group: "Annual-report trend" }))),
    ];
    const annualSnippets = outsideInEvidenceSnippets(business).map((snippet) => ({
      title: snippet.label || "Annual-report evidence",
      summary: snippet.snippet || "",
      group: snippet.source || "Annual report",
    }));
    return [...rows, ...annualSnippets].map((row) => ({
      source: row.group || "Annual report",
      title: row.title || row.priority || row.label || "Annual-report priority",
      text: `${row.title || ""} ${row.summary || ""} ${row.evidence || ""} ${row.quote || ""} ${row.snippet || ""}`,
      evidence: cleanEvidenceFragment(row.summary || row.evidence || row.quote || row.snippet || row.title || "", 260),
    })).filter((row) => row.text.trim());
  }

  function priorityOverlapTopics(items) {
    const sourceText = items.map((item) => item.text).join(" ");
    return PRIORITY_OVERLAP_TOPICS
      .map((topic) => {
        const matches = items.filter((item) => priorityOverlapTextScore(item.text, topic.terms) > 0);
        const score = priorityOverlapTextScore(sourceText, topic.terms);
        return {
          ...topic,
          score,
          count: matches.length,
          evidence: matches.slice(0, 2).map((item) => item.evidence || item.title).filter(Boolean),
          sources: [...new Set(matches.map((item) => item.source).filter(Boolean))].slice(0, 3),
        };
      })
      .filter((topic) => topic.score > 0 || topic.count > 0)
      .sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label));
  }

  function priorityOverlapModel(business) {
    const externalItems = priorityOverlapExternalItems(business);
    const annualItems = priorityOverlapAnnualItems(business);
    const externalTopics = priorityOverlapTopics(externalItems);
    const annualTopics = priorityOverlapTopics(annualItems);
    const externalLabels = new Set(externalTopics.map((topic) => topic.label));
    const annualLabels = new Set(annualTopics.map((topic) => topic.label));
    const byLabel = new Map([...externalTopics, ...annualTopics].map((topic) => [topic.label, topic]));
    const overlap = [...externalLabels].filter((label) => annualLabels.has(label))
      .map((label) => ({
        ...byLabel.get(label),
        externalScore: externalTopics.find((topic) => topic.label === label)?.score || 0,
        annualScore: annualTopics.find((topic) => topic.label === label)?.score || 0,
      }))
      .sort((a, b) => (b.externalScore + b.annualScore) - (a.externalScore + a.annualScore));
    const externalOnly = externalTopics.filter((topic) => !annualLabels.has(topic.label));
    const annualOnly = annualTopics
      .filter((topic) => !externalLabels.has(topic.label))
      .map((topic) => ({ ...topic, outlier: true }));
    const annualByLabel = new Map(annualTopics.map((topic) => [topic.label, topic]));
    const researchGaps = externalTopics
      .map((topic) => {
        const annual = annualByLabel.get(topic.label);
        const annualScore = annual?.score || 0;
        return {
          ...topic,
          annualScore,
          externalScore: topic.score,
          gapScore: Math.max(0, topic.score - annualScore),
          evidence: topic.evidence?.length ? topic.evidence : annual?.evidence || [],
          sources: topic.sources?.length ? topic.sources : annual?.sources || [],
        };
      })
      .filter((topic) => !annualByLabel.has(topic.label) || topic.gapScore > 0 || topic.externalScore >= (topic.annualScore * 1.35))
      .sort((a, b) => b.gapScore - a.gapScore || b.externalScore - a.externalScore || a.label.localeCompare(b.label));
    return {
      externalItems,
      annualItems,
      externalTopics,
      annualTopics,
      externalOnly,
      annualOnly,
      researchGaps,
      overlap,
    };
  }

  function renderPriorityOverlapPills(rows, emptyText, limit = 5, extraClass = "") {
    const visible = rows.slice(0, limit);
    if (!visible.length) return `<span class="venn-empty">${escapeHtml(emptyText)}</span>`;
    return visible.map((row) => `
      <span class="venn-topic-pill ${extraClass} ${row.outlier ? "company-outlier" : ""}" title="${attr((row.evidence || []).join(" | "))}">
        ${escapeHtml(row.label)}
      </span>
    `).join("");
  }

  function renderPriorityOverlapEvidence(title, rows, emptyText, extraClass = "") {
    if (!rows.length) {
      return `<article><h4>${escapeHtml(title)}</h4><p>${escapeHtml(emptyText)}</p></article>`;
    }
    return `<article class="${attr(extraClass)}">
      <h4>${escapeHtml(title)}</h4>
      ${rows.slice(0, 3).map((row) => `
        <div class="venn-evidence-item">
          <strong>${escapeHtml(row.label)}</strong>
          <p>${escapeHtml(cleanEvidenceFragment((row.evidence || []).join(" | ") || (row.sources || []).join(", ") || "Evidence exists in the source set but needs a richer quote.", 220))}</p>
          ${row.externalScore != null ? `<small>External signal ${escapeHtml(String(row.externalScore))}${row.annualScore != null ? ` / annual-report signal ${escapeHtml(String(row.annualScore))}` : ""}</small>` : ""}
          ${row.sources && row.sources.length ? `<small>${escapeHtml(row.sources.join(" / "))}</small>` : ""}
        </div>
      `).join("")}
    </article>`;
  }

  function renderPriorityOverlapVenn(business) {
    const model = priorityOverlapModel(business);
    if (!model.externalItems.length && !model.annualItems.length) return "";
    const externalCount = model.externalTopics.length;
    const annualCount = model.annualTopics.length;
    const overlapCount = model.overlap.length;
    const researchAskText = model.externalTopics.length
      ? `External research is asking the account team to focus on ${model.externalTopics.slice(0, 4).map((row) => row.label).join(", ")}.`
      : "External research priorities are not yet populated.";
    const gapText = model.researchGaps.length
      ? `The clearest gaps or underweighted themes versus company annual-report priorities are ${model.researchGaps.slice(0, 3).map((row) => row.label).join(", ")}.`
      : "The annual-report evidence broadly reflects the current external research agenda.";
    const convergenceText = overlapCount
      ? `Shared themes to lead with are ${model.overlap.slice(0, 3).map((row) => row.label).join(", ")}.`
      : "There is limited explicit convergence yet; refresh research or annual-report evidence before treating this as a firm narrative.";
    const executiveSummary = `${researchAskText} ${gapText} ${convergenceText}`;
    return `
      <section class="section priority-overlap-section">
        <div class="section-heading">
          <div>
            <h2>Priority Overlap: External Research vs Annual Report</h2>
            <p class="muted">Shows where industry research priorities overlap with company-specific annual-report priorities.</p>
          </div>
          <span class="status-pill benchmark">${escapeHtml(String(overlapCount))} shared themes</span>
        </div>
        <div class="priority-overlap-layout">
          <div class="priority-venn-wrap">
            <svg class="priority-venn-svg graph-animate" viewBox="0 0 760 430" role="img" aria-labelledby="priority-venn-title priority-venn-desc">
              <title id="priority-venn-title">Priority overlap between external research and annual-report priorities</title>
              <desc id="priority-venn-desc">Venn diagram comparing industry research priorities with company annual-report priorities.</desc>
              <circle class="venn-circle venn-external" cx="295" cy="215" r="168"></circle>
              <circle class="venn-circle venn-annual" cx="465" cy="215" r="168"></circle>
              <text class="venn-heading" x="210" y="64" text-anchor="middle">External research</text>
              <text class="venn-heading" x="550" y="64" text-anchor="middle">Annual report</text>
              <text class="venn-count" x="210" y="103" text-anchor="middle">${externalCount}</text>
              <text class="venn-count" x="550" y="103" text-anchor="middle">${annualCount}</text>
              <text class="venn-overlap-count" x="380" y="180" text-anchor="middle">${overlapCount}</text>
              <text class="venn-overlap-label" x="380" y="208" text-anchor="middle">shared priorities</text>
            </svg>
            <div class="priority-venn-labels">
              <div class="venn-label-panel external">
                <strong>External research asks</strong>
                <div>${renderPriorityOverlapPills(model.externalTopics, "No external research themes yet.", 7)}</div>
              </div>
              <div class="venn-label-panel overlap">
                <strong>Shared agenda</strong>
                <div>${renderPriorityOverlapPills(model.overlap, "No shared themes yet.", 6)}</div>
              </div>
              <div class="venn-label-panel annual">
                <strong>Company priorities</strong>
                <div>${renderPriorityOverlapPills(model.annualTopics.map((topic) => model.annualOnly.some((outlier) => outlier.label === topic.label) ? { ...topic, outlier: true } : topic), "No annual-report themes yet.", 7)}</div>
              </div>
            </div>
          </div>
          <aside class="priority-overlap-commentary">
            <h3>What this means for the account team</h3>
            <p>${escapeHtml(executiveSummary)}</p>
            <div class="priority-overlap-evidence-grid">
              ${renderPriorityOverlapEvidence("External research asks to focus on", model.externalTopics, "No external research asks are available yet.")}
              ${renderPriorityOverlapEvidence("Potential gaps / underweighted themes", model.researchGaps, "No material research-to-company gaps detected.")}
              ${renderPriorityOverlapEvidence("Additional company priority outlier", model.annualOnly, "No additional company-only priority outliers detected.", "company-priority-outlier-card")}
              ${renderPriorityOverlapEvidence("Shared C-suite themes", model.overlap, "No overlap yet.")}
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  function renderDeepAnalysisEtsEntryPoints(business) {
    const evidenceSnippets = outsideInEvidenceSnippets(business);
    if (!evidenceSnippets.length) return "";
    const themeRows = outsideInThemeRows(business, evidenceSnippets);
    const opportunities = outsideInOpportunityRows(themeRows);
    const rows = outsideInEtsEntryPointRows(opportunities, [], []);
    if (!rows.length) return "";
    return `
      <section class="section deep-analysis-ets-section">
        <div class="section-heading">
          <div>
            <h2>ETS Sales Entry Points &amp; Business Angles</h2>
            <p class="muted">Executive-ready opportunity cards linking each priority to its owner, value hypothesis, evidence and ETS Strategy &amp; Advisory entry point.</p>
          </div>
        </div>
        <div class="ets-entry-card-grid">
          ${rows.map((row) => `
            <article class="ets-entry-card">
              <header class="ets-entry-card-header">
                <span class="ets-stack-label">${escapeHtml(row.stack)}</span>
                <span class="status-pill ${String(row.urgency || "").toLowerCase() === "high" ? "pressure" : "benchmark"}">${escapeHtml(row.urgency)} priority</span>
              </header>
              <h3>${escapeHtml(row.priorities[0] || row.entryPoint)}</h3>
              ${row.priorities.slice(1, 3).length ? `
                <div class="ets-supporting-priorities">
                  ${row.priorities.slice(1, 3).map((priority) => `<p>${escapeHtml(priority)}</p>`).join("")}
                </div>
              ` : ""}
              <div class="ets-entry-card-meta">
                <div>
                  <span class="ets-field-label">Executive owner</span>
                  <strong>${escapeHtml(row.stakeholders.join(" / ") || "Executive sponsor to confirm")}</strong>
                </div>
                <div>
                  <span class="ets-field-label">Value hypothesis</span>
                  <p>${escapeHtml(row.values.join(" | ") || "Value hypothesis to validate")}</p>
                </div>
              </div>
              <div class="ets-entry-card-evidence">
                <span class="ets-field-label">Evidence basis</span>
                <p>${escapeHtml(cleanEvidenceFragment(row.evidence || "Annual-report evidence is linked through the contributing analysis sections.", 420))}</p>
                <div class="ets-coverage-tags">
                  ${row.coverage.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
                </div>
                ${renderOutsideInSources(row.sources)}
              </div>
              <footer class="ets-entry-card-action">
                <span>Sales Entry Point / ETS Business Angle</span>
                <strong>${escapeHtml(row.entryPoint)}</strong>
                ${row.businessAngles.length ? `<p>${escapeHtml(row.businessAngles.join(" "))}</p>` : ""}
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function outsideInSignalTermHits(text, terms) {
    const haystack = ` ${String(text || "").toLowerCase()} `;
    return (terms || []).reduce((count, term) => {
      const needle = String(term || "").toLowerCase().trim();
      if (!needle) return count;
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      const matches = haystack.match(new RegExp(`\\b${escaped}\\b`, "g"));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  function outsideInResearchEvidenceSummary(item) {
    if (!item) return "No matching research-firm signal in the current research set.";
    const firm = item.firm || "Research";
    const report = item.reportTitle || item.report_title || "";
    const date = item.publicationDate || item.publication_date || "";
    const citation = [report, date].filter(Boolean).join(" | ");
    const signal = cleanEvidenceFragment(cleanResearchDisplayText(item.signal || item.priority || ""), 300);
    const implication = cleanEvidenceFragment(cleanResearchDisplayText(item.implication || ""), 240);
    if (signal && implication) return `${firm}${citation ? ` (${citation})` : ""}: ${signal} Company read-through: ${implication}`;
    return `${firm}${citation ? ` (${citation})` : ""}: ${signal || implication || "Research finding unavailable."}`;
  }

  function outsideInSignalGraphRows(themeRows, business, evidenceSnippets) {
    const company = currentPriorityCompany();
    const researchRows = mergeResearchFirmPriorities(business && business.researchFirmPriorities, company);
    const researchTextRows = researchRows.map((row) => `${row.firm || ""} ${row.priority || ""} ${row.signal || ""} ${row.implication || ""}`);
    const evidenceRows = (evidenceSnippets || []).map((snippet) => ({
      text: `${snippet.label || ""} ${snippet.snippet || ""}`,
      detail: outsideInEvidenceText(snippet),
    }));
    const max = Math.max(1, ...themeRows.map((row) => {
      const annualMentions = evidenceRows.filter((item) => outsideInSignalTermHits(item.text, row.terms)).length;
      const researchMentions = researchTextRows.filter((text) => outsideInSignalTermHits(text, row.terms)).length;
      const keywordHits = outsideInSignalTermHits(`${row.theme} ${row.evidenceText}`, row.terms);
      return 1 + (annualMentions * 2) + researchMentions + keywordHits;
    }));
    const usedAnnualEvidence = new Set();
    const usedResearchEvidence = new Set();
    return themeRows.map((row) => {
      const matchingEvidence = evidenceRows.filter((item) => outsideInSignalTermHits(item.text, row.terms));
      const matchingResearch = researchRows
        .map((item, index) => ({
          item,
          index,
          score: outsideInSignalTermHits(`${item.firm || ""} ${item.priority || ""} ${item.signal || ""} ${item.implication || ""}`, row.terms),
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => {
          const aKey = `${a.item.firm || ""}|${a.item.priority || ""}`;
          const bKey = `${b.item.firm || ""}|${b.item.priority || ""}`;
          const aUsed = usedResearchEvidence.has(aKey) ? 1 : 0;
          const bUsed = usedResearchEvidence.has(bKey) ? 1 : 0;
          return aUsed - bUsed || b.score - a.score || a.index - b.index;
        })
        .map((candidate) => candidate.item);
      const annualMentions = matchingEvidence.length;
      const researchMentions = matchingResearch.length;
      const keywordHits = outsideInSignalTermHits(`${row.theme} ${row.evidenceText}`, row.terms);
      const weight = 1 + (annualMentions * 2) + researchMentions + keywordHits;
      const percent = Math.max(0.15, weight / max);
      const selectedAnnualEvidence = matchingEvidence.find((item) => !usedAnnualEvidence.has(item.detail)) || matchingEvidence[0] || null;
      if (selectedAnnualEvidence && selectedAnnualEvidence.detail) usedAnnualEvidence.add(selectedAnnualEvidence.detail);
      const selectedResearch = matchingResearch[0] || null;
      if (selectedResearch) usedResearchEvidence.add(`${selectedResearch.firm || ""}|${selectedResearch.priority || ""}`);
      const matchedTerms = (row.terms || [])
        .filter((term) => outsideInSignalTermHits(`${row.theme} ${row.evidenceText} ${matchingEvidence.map((item) => item.text).join(" ")} ${matchingResearch.map((item) => `${item.priority || ""} ${item.signal || ""}`).join(" ")}`, [term]))
        .slice(0, 5);
      const rationale = [
        `${annualMentions} annual-report evidence mention${annualMentions === 1 ? "" : "s"}`,
        `${researchMentions} industry-research mention${researchMentions === 1 ? "" : "s"}`,
        keywordHits ? `${keywordHits} matching priority term${keywordHits === 1 ? "" : "s"}` : "",
      ].filter(Boolean).join("; ");
      return {
        label: row.theme,
        weight,
        annualMentions,
        researchMentions,
        keywordHits,
        matchedTerms,
        percent,
        rationale,
        evidence: row.evidenceText,
        annualEvidence: selectedAnnualEvidence?.detail || row.evidenceText || "No annual-report quote/data point matched this signal.",
        researchEvidence: outsideInResearchEvidenceSummary(selectedResearch),
        implication: `${row.enabler || "Technology enablement"} should be tested against ${row.impact || "measurable business impact"}.`,
      };
    });
  }

  function outsideInSpiderLabel(label) {
    const text = String(label || "");
    if (/cost optimisation|operational efficiency/i.test(text)) return "Cost optimisation";
    if (/revenue growth|digital channels/i.test(text)) return "Revenue growth";
    if (/data\s*&\s*ai/i.test(text)) return "Data & AI";
    if (/risk|security|compliance/i.test(text)) return "Risk & compliance";
    if (/platform|cloud migration/i.test(text)) return "Cloud & platforms";
    return cleanNarrativeFragment(text, 28);
  }

  function renderOutsideInSignalGraph(themeRows, business, evidenceSnippets) {
    const rows = outsideInSignalGraphRows(themeRows, business, evidenceSnippets);
    if (!rows.length) return "";
    const svgWidth = 900;
    const svgHeight = 620;
    const centerX = 450;
    const centerY = 315;
    const radius = 176;
    const labelRadius = 286;
    const rings = [0.25, 0.5, 0.75, 1];
    const points = rows.map((row, index) => {
      const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / rows.length;
      const rawLabelX = centerX + Math.cos(angle) * labelRadius;
      const rawLabelY = centerY + Math.sin(angle) * labelRadius;
      const horizontalAnchor = rawLabelX < centerX - 12 ? "end" : rawLabelX > centerX + 12 ? "start" : "middle";
      const labelX = horizontalAnchor === "end"
        ? Math.max(rawLabelX, 168)
        : horizontalAnchor === "start"
          ? Math.min(rawLabelX, svgWidth - 168)
          : rawLabelX;
      const labelY = Math.min(Math.max(rawLabelY, 42), svgHeight - 48);
      return {
        ...row,
        graphLabel: outsideInSpiderLabel(row.label),
        angle,
        x: centerX + Math.cos(angle) * radius * row.percent,
        y: centerY + Math.sin(angle) * radius * row.percent,
        axisX: centerX + Math.cos(angle) * radius,
        axisY: centerY + Math.sin(angle) * radius,
        labelX,
        labelY,
        labelAnchor: horizontalAnchor,
      };
    });
    const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const ringPolygons = rings.map((ring, ringIndex) => {
      const ringPoints = rows.map((_, index) => {
        const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / rows.length;
        return `${(centerX + Math.cos(angle) * radius * ring).toFixed(1)},${(centerY + Math.sin(angle) * radius * ring).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${ringPoints}" class="spider-ring" style="--spider-delay:${ringIndex * 85}ms"></polygon>`;
    }).join("");
    const areaRevealDelay = 1140 + (points.length * 210);
    const rankedRows = [...rows].sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));
    const maxWeight = Math.max(1, ...rankedRows.map((row) => row.weight));
    return `
      <div class="deep-analysis-signal-visual">
      <div class="research-spider-panel deep-analysis-spider-panel" aria-label="Evidence-weighted technology priority spider chart">
        <div class="research-spider-chart">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-labelledby="outside-in-spider-title outside-in-spider-desc">
            <title id="outside-in-spider-title">Evidence-weighted technology priority signals</title>
            <desc id="outside-in-spider-desc">Spider chart showing weighted annual-report and industry-research technology priority signals.</desc>
            ${ringPolygons}
            ${points.map((point, index) => `
              <line class="spider-axis" style="--spider-delay:${420 + (index * 210)}ms" x1="${centerX}" y1="${centerY}" x2="${point.axisX.toFixed(1)}" y2="${point.axisY.toFixed(1)}"></line>
            `).join("")}
            <polygon points="${polygon}" class="spider-area" style="--spider-delay:${areaRevealDelay}ms"></polygon>
            <g class="spider-line-layer">
              ${points.map((point, index) => {
                const nextPoint = points[(index + 1) % points.length];
                return `<line class="spider-line spider-segment" style="--spider-delay:${760 + ((index + 1) * 210)}ms" x1="${point.x.toFixed(1)}" y1="${point.y.toFixed(1)}" x2="${nextPoint.x.toFixed(1)}" y2="${nextPoint.y.toFixed(1)}"></line>`;
              }).join("")}
            </g>
            <g class="spider-point-layer">
              ${points.map((point, index) => `<circle class="spider-point" style="--spider-delay:${570 + (index * 210)}ms" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.8"></circle>`).join("")}
            </g>
            <g class="spider-label-layer">
              ${points.map((point, index) => `
                <g class="spider-label-item" style="--spider-delay:${640 + (index * 210)}ms">
                  <text class="spider-label" x="${point.labelX.toFixed(1)}" y="${point.labelY.toFixed(1)}" text-anchor="${point.labelAnchor}">${escapeHtml(point.graphLabel)}</text>
                  <text class="spider-count" x="${point.labelX.toFixed(1)}" y="${(point.labelY + 12).toFixed(1)}" text-anchor="${point.labelAnchor}">weight ${point.weight}</text>
                </g>
              `).join("")}
            </g>
          </svg>
        </div>
        <div class="research-frequency-list deep-analysis-weight-list">
          <h3>Rationale For Weightings</h3>
          ${rankedRows.map((row) => {
            const width = Math.max(4, Math.round((row.weight / maxWeight) * 100));
            return `
              <div class="frequency-row">
                <div>
                  <strong>${escapeHtml(row.label)}</strong>
                  <span>${escapeHtml(`${row.rationale}. ${cleanEvidenceFragment(row.researchEvidence, 165)}`)}</span>
                </div>
                <div class="frequency-track"><div style="--bar-width:${width}%"></div></div>
                <b>${escapeHtml(String(row.weight))}</b>
              </div>
            `;
          }).join("")}
        </div>
        </div>
        <details class="deep-analysis-evidence-toggle">
          <summary>
            <span class="collapse-arrow" aria-hidden="true">&gt;</span>
            <span class="deep-analysis-evidence-summary-copy">
              <strong>Detailed Evidence Basis</strong>
              <small>Annual-report, industry-research and weighting logic for each technology priority signal.</small>
            </span>
            <span class="case-meta">${rankedRows.length} signals</span>
          </summary>
        <div class="outside-in-signal-rationale deep-analysis-weighting-evidence">
          ${renderOutsideInTable(
            ["Priority Signal", "Weighting Logic", "Evidence Basis", "Technology Implication"],
            rankedRows,
            (row) => `
              <tr>
                <td><strong>${escapeHtml(row.label)}</strong><br><small>Weight ${escapeHtml(String(row.weight))}</small></td>
                <td>
                  Base 1 + annual report mentions (${escapeHtml(String(row.annualMentions))} Ã— 2) + industry research mentions (${escapeHtml(String(row.researchMentions))}) + matched terms (${escapeHtml(String(row.keywordHits))}).
                  <br><small>${escapeHtml(row.matchedTerms.length ? `Matched terms: ${row.matchedTerms.join(", ")}` : "Matched terms are inferred from the annual-report evidence and current research set.")}</small>
                </td>
                <td>
                  <strong>Annual report:</strong> ${escapeHtml(cleanEvidenceFragment(row.annualEvidence, 360))}
                  <br><small><strong>Industry research:</strong> ${escapeHtml(cleanEvidenceFragment(row.researchEvidence, 520))}</small>
                </td>
                <td>${escapeHtml(row.implication)}</td>
              </tr>
            `
          )}
        </div>
        </details>
      </div>
    `;
  }

  function renderOutsideInTable(headers, rows, rowRenderer) {
    const hasEtsAngle = headers.includes("Sales Entry Point / ETS Business Angle");
    const tableClass = `outside-in-table${hasEtsAngle ? " outside-in-table-ets-angle" : ""}`;
    const colgroup = hasEtsAngle
      ? `<colgroup>${headers.map((header, index) => `<col class="${index === headers.length - 1 ? "ets-angle-col" : "standard-col"}">`).join("")}</colgroup>`
      : "";
    return `
      <div class="outside-in-table-wrap">
        <table class="${tableClass}">
          ${colgroup}
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows.map(rowRenderer).join("")}</tbody>
        </table>
      </div>
    `;
  }

  function revenueDivisionAnalysisSources(business) {
    const analysis = business && business.annualReportAnalysis;
    const snapshot = (business && business.snapshot) || {};
    return [
      analysis && analysis.revenueByDivision,
      business && business.revenueByDivision,
      snapshot && snapshot.revenueByDivision,
      analysis && analysis.segmentRevenue,
      snapshot && snapshot.segmentRevenue,
    ].filter(Boolean);
  }

  function revenueDivisionRows(business) {
    const sources = revenueDivisionAnalysisSources(business);
    const source = sources.find((item) => Array.isArray(item.rows) && item.rows.length) ||
      sources.find((item) => Array.isArray(item) && item.length);
    const rawRows = Array.isArray(source) ? source : (source && source.rows) || [];
    const rows = rawRows
      .map((row) => {
        const division = row.division || row.segment || row.business || row.name || "";
        const currency = row.currency || currencyCode(row.revenue || row.value || "") || (source && source.currency) || "";
        let valueMillions = Number(row.revenueMillions || row.valueMillions || row.amountMillions);
        if (!Number.isFinite(valueMillions)) {
          const parsed = parseCurrencyAmount(row.revenue || row.value || row.amount);
          valueMillions = parsed == null ? NaN : parsed * 1000;
        }
        return {
          division: cleanNarrativeFragment(division, 64),
          revenueMillions: valueMillions,
          currency,
          share: Number(row.share),
          evidence: row.evidence || row.snippet || "",
          source: row.source || (source && source.source) || "",
          url: row.url || (source && source.url) || "",
        };
      })
      .filter((row) => row.division && Number.isFinite(row.revenueMillions) && row.revenueMillions > 0)
      .sort((a, b) => b.revenueMillions - a.revenueMillions)
      .slice(0, 8);
    const total = rows.reduce((sum, row) => sum + row.revenueMillions, 0);
    return rows.map((row) => ({
      ...row,
      share: Number.isFinite(row.share) && row.share > 0 ? row.share : (total ? (row.revenueMillions / total) * 100 : 0),
    }));
  }

  function revenueDivisionStructureRows(business, revenueRows) {
    const sources = revenueDivisionAnalysisSources(business);
    const source = sources.find((item) => Array.isArray(item.structureRows) && item.structureRows.length);
    const rawRows = source ? source.structureRows : revenueRows;
    return (rawRows || [])
      .map((row) => {
        const unit = row.unit || row.division || row.segment || row.business || row.name || "";
        const currency = row.currency || currencyCode(row.revenue || row.value || "") || "";
        let valueMillions = Number(row.revenueMillions || row.valueMillions || row.amountMillions);
        if (!Number.isFinite(valueMillions)) {
          const parsed = parseCurrencyAmount(row.revenue || row.value || row.amount);
          valueMillions = parsed == null ? NaN : parsed * 1000;
        }
        return {
          unit: cleanNarrativeFragment(unit, 68),
          category: row.category || "Operating segment",
          revenueMillions: valueMillions,
          currency,
          share: Number(row.share),
          revenueDriverTerms: Array.isArray(row.revenueDriverTerms) ? row.revenueDriverTerms : [],
          evidence: row.evidence || row.snippet || "",
          source: row.source || (source && source.source) || "",
          url: row.url || (source && source.url) || "",
        };
      })
      .filter((row) => row.unit)
      .slice(0, 8);
  }

  function formatRevenueDivisionMoney(valueMillions, currency) {
    if (!Number.isFinite(valueMillions)) return "n/a";
    const prefix = currency ? `${currency} ` : "";
    if (valueMillions >= 1000) return `${prefix}${(Math.round((valueMillions / 1000) * 10) / 10).toFixed(1)}B`;
    return `${prefix}${Math.round(valueMillions).toLocaleString()}M`;
  }

  function revenueDivisionComments(business, rows) {
    const source = revenueDivisionAnalysisSources(business).find((item) => item && Array.isArray(item.comments) && item.comments.length);
    const sourceComments = source ? source.comments : [];
    if (sourceComments.length) return sourceComments.slice(0, 4);
    if (!rows.length) return [];
    const top = rows[0];
    const topTwoShare = rows.slice(0, 2).reduce((sum, row) => sum + Number(row.share || 0), 0);
    const latestRevenue = latestFinancialRevenue(business || {});
    const comments = [
      `${top.division} is the largest disclosed division in the extracted annual-report revenue mix at ${Math.round(top.share * 10) / 10}%.`,
      `The top two divisions represent ${Math.round(topTwoShare * 10) / 10}% of extracted divisional revenue, so technology opportunities should be tested against these revenue pools first.`,
      `Compare the division mix with the latest company revenue signal${latestRevenue.value ? ` (${latestRevenue.value})` : ""} to identify whether the upload covers all reported revenue or only continuing/reportable segments.`,
      "Use the comments as a portfolio lens: growth, automation, resilience and AI investments should be anchored to the divisions carrying the largest revenue exposure.",
    ];
    return comments;
  }

  function renderRevenueDivisionPie(rows) {
    const colors = ["#e2543f", "#3f7d45", "#47727b", "#0f2b1b", "#a88f56", "#d9896b", "#6f8c75", "#9b6b53"];
    const total = rows.reduce((sum, row) => sum + row.revenueMillions, 0);
    if (!rows.length || !total) return "";
    let offset = 25;
    const circles = rows.map((row, index) => {
      const share = Math.max(0, (row.revenueMillions / total) * 100);
      const dash = `${share} ${Math.max(0, 100 - share)}`;
      const segment = `
        <circle
          class="division-pie-segment"
          r="15.9155"
          cx="21"
          cy="21"
          style="--pie-delay:${index * 120}ms; stroke:${colors[index % colors.length]}; stroke-dasharray:${dash}; stroke-dashoffset:${offset};"
        ></circle>
      `;
      offset -= share;
      return segment;
    }).join("");
    return `
      <div class="division-pie-wrap graph-animate" aria-label="Revenue by division pie chart">
        <svg class="division-pie" viewBox="0 0 42 42" role="img" aria-labelledby="division-pie-title division-pie-desc">
          <title id="division-pie-title">Revenue by company division</title>
          <desc id="division-pie-desc">Pie chart showing extracted annual-report revenue split by division.</desc>
          <circle class="division-pie-base" r="15.9155" cx="21" cy="21"></circle>
          ${circles}
        </svg>
        <div class="division-pie-total">
          <span>Extracted revenue</span>
          <strong>${escapeHtml(formatRevenueDivisionMoney(total, rows[0].currency || ""))}</strong>
        </div>
      </div>
      <div class="division-pie-legend">
        ${rows.map((row, index) => `
          <div>
            <i style="background:${colors[index % colors.length]}"></i>
            <span>${escapeHtml(row.division)}</span>
            <strong>${escapeHtml(`${Math.round(row.share * 10) / 10}%`)}</strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderRevenueByDivisionSection(business) {
    const rows = revenueDivisionRows(business);
    const structureRows = revenueDivisionStructureRows(business, rows);
    const loading = !rows.length && !structureRows.length && annualReportAnalysisInProgress();
    const analysis = (business && business.annualReportAnalysis) || {};
    const sourceLink = analysis.sourceUrl || (business && business.snapshot && business.snapshot.annualReportDocument && business.snapshot.annualReportDocument.url) || "";
    if (!rows.length && !structureRows.length) {
      return `
        <section class="section revenue-division-section source-required">
          <div class="section-heading">
            <div>
              <h2>Revenue By Company Division</h2>
              <p class="muted">${loading ? "AI is analysing the annual report for division-level revenue." : "Upload or reprocess the annual report to extract source-backed division revenue."}</p>
            </div>
          </div>
          ${loading ? renderAnnualReportAnalysisLoader(
            "AI analysing annual report for revenue by division",
            "Looking for segment, division, business-line and reportable-revenue disclosures in the uploaded PDF."
          ) : `<div class="empty">No division-level revenue split has been extracted yet. Use the Annual Report upload or Refresh Analysis to populate this source-backed chart.</div>`}
        </section>
      `;
    }
    const comments = revenueDivisionComments(business, rows);
    return `
      <section class="section revenue-division-section">
        <div class="section-heading">
          <div>
            <h2>Revenue By Company Division</h2>
            <p class="muted">Annual-report-backed view of disclosed reportable revenue segments plus service and practice areas that drive revenue.</p>
          </div>
          ${sourceLink ? `<a class="button ghost" href="${attr(sourceLink)}" target="_blank" rel="noopener">Annual Report Source</a>` : ""}
        </div>
        <div class="revenue-division-layout">
          <div class="revenue-division-chart-card">
            ${rows.length ? renderRevenueDivisionPie(rows) : `<div class="empty">The annual report disclosed operating structure, but no numeric revenue split was extracted.</div>`}
          </div>
          <div class="revenue-division-commentary">
            <div class="block-label">Comments</div>
            <ul>
              ${comments.map((comment) => `<li>${escapeHtml(comment)}</li>`).join("")}
            </ul>
            <div class="revenue-division-evidence">
              <strong>Evidence basis</strong>
              ${rows.slice(0, 4).map((row) => `
                <p><span>${escapeHtml(row.division)}:</span> ${escapeHtml(cleanEvidenceFragment(row.evidence || "Annual-report segment revenue evidence extracted.", 220))}</p>
              `).join("")}
            </div>
          </div>
        </div>
        ${renderCompanyStructureBreakdown(structureRows)}
      </section>
    `;
  }

  function renderCompanyStructureBreakdown(rows) {
    if (!rows.length) return "";
    return `
      <div class="company-structure-breakdown">
        <div class="section-heading compact">
          <div>
            <h3>Service Lines, Product Divisions And Revenue Drivers</h3>
            <p class="muted">How the annual report describes service lines, product groups and operating structure; revenue is shown only where separately disclosed.</p>
          </div>
        </div>
        <div class="company-structure-grid">
          ${rows.map((row) => `
            <article class="company-structure-card">
              <div class="company-structure-card-head">
                <span>${escapeHtml(row.category || "Operating segment")}</span>
                ${Number.isFinite(row.share) && row.share > 0 ? `<strong>${escapeHtml(`${Math.round(row.share * 10) / 10}%`)}</strong>` : ""}
              </div>
              <h3>${escapeHtml(row.unit)}</h3>
              ${Number.isFinite(row.revenueMillions) ? `<p class="company-structure-revenue">${escapeHtml(formatRevenueDivisionMoney(row.revenueMillions, row.currency || ""))}</p>` : `<p class="company-structure-revenue muted">Revenue not separately disclosed</p>`}
              ${row.revenueDriverTerms.length ? `
                <div class="company-structure-tags">
                  ${row.revenueDriverTerms.map((term) => `<span>${escapeHtml(term)}</span>`).join("")}
                </div>
              ` : ""}
              <blockquote>${escapeHtml(cleanEvidenceFragment(row.evidence || "Annual-report operating structure evidence extracted.", 260))}</blockquote>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderOutsideInOpportunityAnalysis(business) {
    const company = currentPriorityCompany();
    const evidenceSnippets = outsideInEvidenceSnippets(business);
    const loading = !evidenceSnippets.length && annualReportAnalysisInProgress();
    const fallbackSources = annualReportSourceLinks(company, activeCaseCompanyProfile(state.activeCase));
    if (!evidenceSnippets.length) {
      return `
        <section class="section outside-in-section source-required">
          <div class="section-heading">
            <div>
              <h2>Outside-In Opportunity Analysis</h2>
              <p class="muted">${loading ? "Annual-report evidence is being analysed for technology opportunity signals." : "Upload the annual report or investor pack before generating C-level opportunity analysis."}</p>
            </div>
          </div>
          ${loading ? renderAnnualReportAnalysisLoader(
            "AI analysing annual report for Outside-In Opportunity Analysis",
            "Reading the report for leadership priorities, technology signals, financial pressure, risk themes and transformation opportunities."
          ) : ""}
          <div class="board-exco-bullets">
            <div class="block-label">Annual report required</div>
            <ul>
              <li>No annual-report, 10-K, investor-relations or results evidence is loaded for this value case yet.</li>
              <li>Upload the official annual report PDF so this section can produce sourced C-level priorities, competitor benchmark hypotheses and sales-ready opportunities.</li>
              <li>Until evidence is loaded, the app intentionally withholds opportunity claims.</li>
            </ul>
            ${renderOutsideInSources(fallbackSources)}
          </div>
          <label class="btn primary annual-upload-inline">
            Upload Annual Report
            <input type="file" accept="application/pdf,.pdf" data-input="annualReportUpload" hidden>
          </label>
        </section>
      `;
    }
    const themeRows = outsideInThemeRows(business, evidenceSnippets);
    const opportunities = outsideInOpportunityRows(themeRows);
    const competitors = outsideInCompetitorBenchmarks(business, evidenceSnippets);
    return `
      <section class="section outside-in-section">
        <div class="section-heading">
          <div>
            <h2>Outside-In Opportunity Analysis</h2>
            <p class="muted">Annual-report-grounded technology priorities, competitor benchmark hypotheses and sales-ready opportunities.</p>
          </div>
        </div>

        <div class="outside-in-subsection">
          <h3>1. C-Level Technology Priorities &amp; Opportunity Roadmap</h3>
          ${renderOutsideInTable(
            ["C-Level Priority / Executive Owner / Value Hypothesis", "Annual Report / IR Evidence", "Opportunity", "Sales Entry Point / ETS Business Angle"],
            opportunities,
            (row) => `
              <tr>
                <td>
                  <strong>${escapeHtml(row.cLevelPriority)}</strong>
                  <br><small>${escapeHtml(row.priorityWhy)}</small>
                  <dl class="c-level-priority-meta">
                    <div><dt>Executive owner</dt><dd>${escapeHtml(row.stakeholder)}</dd></div>
                    <div><dt>Value hypothesis</dt><dd>${escapeHtml(row.value)}</dd></div>
                  </dl>
                </td>
                <td>${renderPriorityOpportunityEvidence(row)}</td>
                <td>
                  <strong>${escapeHtml(row.stack)}</strong>
                  <br>${escapeHtml(row.opportunity)}
                  <br><small>${escapeHtml(row.description)}</small>
                  ${renderPriorityOpportunityVendors(row)}
                </td>
                <td>
                  <strong>${escapeHtml(row.urgency)} priority</strong><small>${escapeHtml(row.salesAngle)}</small>
                  ${renderSuggestedEntryPoint(row.entryPoint, row.entryPointRationale)}
                </td>
              </tr>
            `
          )}
        </div>

        <div class="outside-in-subsection">
          <h3>2. Competitor AI &amp; Digital Benchmarking</h3>
          ${competitors.length ? renderOutsideInTable(
            ["Industry Peer", "AI Use Case", "Key Benefits", "Sales Entry Point / ETS Business Angle"],
            competitors,
            (peer) => `
              <tr>
                <td><strong>${escapeHtml(peer.company)}</strong></td>
                <td>${escapeHtml(peer.useCase)}<br><small>${escapeHtml(peer.gap)}</small></td>
                <td>${escapeHtml(peer.benefit)}<br><small>${escapeHtml(peer.evidence)}</small>${renderOutsideInSources(peer.sources)}</td>
                <td>${renderSuggestedEntryPoint(peer.entryPoint, peer.entryPointRationale)}</td>
              </tr>
            `
          ) : `<div class="empty">Add validated same-industry peers to show the AI and digital benchmarking table.</div>`}
        </div>

      </section>
    `;
  }

  function renderTransformationAgenda(agenda) {
    const company = currentPriorityCompany();
    const resolved = transformationAgendaNeedsRefresh(agenda, company)
      ? sourceRefreshRequiredAgenda(company)
      : normalizeTransformationAgenda(agenda, company);
    const rows = resolved.rows || [];
    const footnotes = agendaFootnotes(rows, company);
    return `
      <section class="section transformation-agenda-section" data-transformation-agenda>
        <div class="section-heading">
          <div>
            <h2>Business Transformation - Agenda</h2>
            <p class="muted">Official-source agenda signals from annual reports, investor-relations materials, results releases and press announcements.</p>
          </div>
        </div>
        ${resolved.sourceRequired ? `
          <div class="agenda-pending">
            <strong>Two-year annual-report-backed refresh required</strong>
            <span>No generated agenda is being shown. Refresh Analysis will find the companyâ€™s last two annual reports through Google/web search, analyse those reports against each Dimension question, and answer only from annual-report findings.</span>
          </div>
        ` : ""}
        <p class="agenda-executive-summary">${escapeHtml(resolved.executiveSummary || "")}</p>
        ${renderAgendaOverview(resolved.overview)}
        <div class="agenda-table-card">
          <table class="agenda-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>What it looks like now</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, index) => renderTransformationAgendaRow(row, index, footnotes, company)).join("")}
            </tbody>
          </table>
        </div>
        ${renderAgendaFootnotes(footnotes)}
        ${renderAgendaSourceNotes(resolved.sourceNotes)}
      </section>
    `;
  }

  function renderAgendaOverview(overview) {
    const items = agendaTextList(overview, 5);
    if (!items.length) return "";
    return `
      <div class="agenda-overview">
        <div class="block-label">Overview</div>
        <ul>
          ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function renderTransformationAgendaRow(row, index, footnotes, company) {
    const sources = officialAgendaSources(row, company);
    const visibleAnswer = agendaVisibleAnswer(row);
    return `
      <tr>
        <td>
          <span class="agenda-row-index">${index + 1}</span>
          <strong>${escapeHtml(row.dimension || row.question || transformationAgendaDimensions[index] || "Agenda dimension")}</strong>
          <small>${escapeHtml(row.question || transformationAgendaQuestions[index] || "")}</small>
        </td>
        <td>
          ${visibleAnswer
            ? renderAgendaDetailList(visibleAnswer)
            : `<div class="agenda-empty-answer">No source-backed answer stored yet for this question.</div>`}
          <div class="priority-source-links">
            ${sources.map((source) => `
              <a href="${attr(source.url || "#")}" target="_blank" rel="noopener"><sup>[${escapeHtml(agendaFootnoteNumber(source, footnotes))}]</sup> ${escapeHtml(source.label || "Source")}</a>
            `).join("")}
          </div>
        </td>
      </tr>
    `;
  }

  function agendaVisibleAnswer(row) {
    const answerLines = agendaText(row.answer || "").split("\n").map((line) => line.trim()).filter(Boolean);
    if (answerLines.length >= 3) return answerLines.slice(0, 3).join("\n");
    const answerKeys = new Set(answerLines.map((line) => normalizeLookupQuery(line)));
    const evidenceLines = agendaText(row.evidence || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => agendaLineHasQuoteOrStatistic(line))
      .filter((line) => !/\b(?:source basis|should be read|public places to validate|best public evidence|evidence not found)\b/i.test(line))
      .filter((line) => {
        const key = normalizeLookupQuery(line);
        if (!key || answerKeys.has(key)) return false;
        answerKeys.add(key);
        return true;
      })
      .slice(0, 2);
    return [...answerLines, ...evidenceLines].join("\n");
  }

  function renderAgendaFootnotes(footnotes) {
    if (!footnotes.length) return "";
    return `
      <div class="agenda-footnotes" aria-label="Official source footnotes">
        ${footnotes.map((source) => `
          <a href="${attr(source.url || "#")}" target="_blank" rel="noopener">
            <sup>[${source.number}]</sup>
            <span>${escapeHtml(source.label || "Official source")}</span>
          </a>
        `).join("")}
      </div>
    `;
  }

  function renderAgendaSourceNotes(sourceNotes) {
    const notes = agendaTextList(sourceNotes, 12);
    if (!notes.length) return "";
    return `
      <div class="agenda-source-notes">
        <div class="block-label">Source Notes</div>
        <ul>
          ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function renderAgendaDetailList(value) {
    const lines = agendaText(value).split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return "";
    if (lines.length === 1) return `<p>${escapeHtml(lines[0])}</p>`;
    return `
      <ul class="agenda-detail-list">
        ${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
    `;
  }

  function renderBenchmarkLibrary() {
    const rows = state.benchmarks.slice(0, 5);
    if (!rows.length) return "";
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Admin Benchmark Library</th>
              <th>Financial</th>
              <th>Operational</th>
              <th>Customer / Market</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.industry)}</td>
                <td>${escapeHtml(row.financial_benchmarks)}</td>
                <td>${escapeHtml(row.operational_benchmarks)}</td>
                <td>${escapeHtml(row.customer_market_benchmarks)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSignalScan(business) {
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Competitor & Partner Signal Scan</h2>
            <p class="muted">News and press signals that shape the account narrative.</p>
          </div>
          ${addRowButton("signalScan")}
        </div>
        ${renderEditableTable("signalScan", business.signalScan || [])}
      </section>
    `;
  }

  function renderCsuitePriorities(business) {
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>C-Suite Priorities & Quotes</h2>
            <p class="muted">Quotes are grouped by CEO, CIO, CISO, CFO, and priority theme.</p>
          </div>
          ${addRowButton("csuiteQuotes")}
        </div>
        ${renderEditableTable("csuiteQuotes", business.csuiteQuotes || [])}
        <div class="spacer"></div>
        <h2>Mention Frequency</h2>
        ${themeFrequencyChart(business.csuiteQuotes || [])}
      </section>
    `;
  }

  function renderNarrative(narrative) {
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Business Priority Narrative</h2>
            <p class="muted">A working synthesis for account-team review and later report output.</p>
          </div>
        </div>
        ${renderSynthesizedNarrative()}
        <div class="grid-3">
          ${narrativeField("observed", "Observed", narrative.observed)}
          ${narrativeField("whyItMatters", "Why It Matters", narrative.whyItMatters)}
          ${narrativeField("actions", "Actions / Questions", narrative.actions)}
        </div>
      </section>
    `;
  }

  function renderSynthesizedNarrative() {
    const syn = state.business && state.business.synthesizedNarrative;
    const busy = !!state.synthesizing;
    const citeMap = {};
    ((syn && syn.citations) || []).forEach(function (c) { citeMap[c.n] = c; });
    function citeChips(nums) {
      return (nums || []).map(function (n) {
        const c = citeMap[n];
        if (!c) return "";
        return `<a class="cite" href="${attr(c.url)}" target="_blank" rel="noopener" title="${attr(c.label)}">${n}</a>`;
      }).join("");
    }
    let body;
    if (syn) {
      body = `
        <p class="synth-summary">${escapeHtml(syn.executiveSummary || "")}</p>
        ${(syn.paragraphs || []).map(function (p) {
          return `<p class="synth-para">${escapeHtml(p.text || "")}${citeChips(p.citations)}</p>`;
        }).join("")}
        ${(syn.disputes && syn.disputes.length) ? `<div class="synth-disputes"><strong>Verify before quoting:</strong> ${syn.disputes.map(function (d) {
          return `${escapeHtml(d.field)} (${(d.values || []).map(function (v) { return escapeHtml(v); }).join(" vs ")})`;
        }).join("; ")}</div>` : ""}
        ${(syn.citations && syn.citations.length) ? `<ol class="synth-sources">${syn.citations.map(function (c) {
          return `<li><a href="${attr(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a></li>`;
        }).join("")}</ol>` : ""}
        <p class="muted synth-meta">${syn.mode === "ai" ? "AI-synthesized" : "Template synthesis"}${syn.generatedAt ? " &middot; " + escapeHtml(String(syn.generatedAt).slice(0, 10)) : ""}</p>
      `;
    } else {
      body = `<p class="muted">Generate a cited executive narrative from the current company data, financials and priorities.</p>`;
    }
    return `
      <div class="synth-card">
        <div class="synth-head">
          <h3>Synthesized Executive Narrative</h3>
          <button class="btn accent compact" type="button" data-action="synthesize-narrative" ${busy ? "disabled" : ""}>${busy ? "Generating&hellip;" : (syn ? "Regenerate" : "Generate")}</button>
        </div>
        ${body}
      </div>
    `;
  }

  function narrativeField(key, label, value) {
    return `
      <label class="field">
        <span>${escapeHtml(label)}</span>
        <textarea data-narrative="${key}">${escapeHtml(value || "")}</textarea>
      </label>
    `;
  }

  function addRowButton(collection) {
    return `<button class="btn icon secondary" type="button" title="Add row" data-action="add-row" data-collection="${collection}">+</button>`;
  }

  function renderEditableTable(collection, rows) {
    const fields = tableDefs[collection];
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${fields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join("")}
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${(rows || []).map((row, index) => `
              <tr>
                ${fields.map((field) => `<td>${tableControl(collection, index, field, row[field.key])}</td>`).join("")}
                <td class="tight">
                  <button class="btn icon secondary" type="button" title="Remove row" data-action="remove-row" data-collection="${collection}" data-index="${index}">-</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function tableControl(collection, index, field, value) {
    const common = `data-collection="${collection}" data-index="${index}" data-key="${field.key}"`;
    if (field.type === "checkbox") {
      return `<input type="checkbox" ${common} ${value ? "checked" : ""}>`;
    }
    if (field.options) {
      return `
        <select ${common}>
          ${field.options.map((option) => `<option value="${attr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      `;
    }
    if (field.wide) {
      return `<textarea ${common}>${escapeHtml(value || "")}</textarea>`;
    }
    return `<input type="${field.type || "text"}" ${common} value="${attr(value || "")}">`;
  }

  function activePeers(business) {
    return (business.peers || []).filter((peer) => peer.enabled);
  }

  function barChart(rows, labelKey, valueKey, suffix, className) {
    if (!rows.length) return `<div class="empty">No data.</div>`;
    const max = Math.max(1, ...rows.map((row) => numberValue(row[valueKey])));
    return `
      <div class="chart-grid">
        ${rows.map((row) => {
          const value = numberValue(row[valueKey]);
          const width = Math.max(2, Math.round((value / max) * 100));
          return `
            <div class="chart-row">
              <div class="case-meta">${escapeHtml(row[labelKey] || "Unlabeled")}</div>
              <div class="bar-track"><div class="bar-fill ${className || ""}" style="--bar-width:${width}%"></div></div>
              <div>${escapeHtml(row[valueKey] || "0")}${suffix || ""}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function stackedMarginChart(rows) {
    if (!rows.length) return `<div class="empty">No active peers.</div>`;
    return `
      <div class="chart-grid">
        ${rows.map((row) => {
          const operating = Math.min(100, numberValue(row.operatingMargin));
          const net = Math.min(100, numberValue(row.netMargin));
          return `
            <div class="chart-row">
              <div class="case-meta">${escapeHtml(row.company || "Unlabeled")}</div>
              <div class="stacked">
                <div class="stack-a" style="--a:${Math.max(1, operating)}%"></div>
                <div class="stack-b" style="--b:${Math.max(1, net)}%"></div>
              </div>
              <div>${operating || 0}% / ${net || 0}%</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function themeFrequencyChart(rows) {
    const counts = {};
    themeOptions.forEach((theme) => { counts[theme] = 0; });
    rows.forEach((row) => {
      const theme = row.priorityTheme || "Growth";
      counts[theme] = (counts[theme] || 0) + 1;
    });
    return barChart(
      Object.keys(counts).map((theme) => ({ theme, count: counts[theme] })),
      "theme",
      "count",
      "",
      "red"
    );
  }

  function renderAdmin() {
    if (!canAdmin()) {
      return `<section class="section"><div class="empty">Admin access is required.</div></section>`;
    }
    if (!state.admin) {
      return `<section class="section"><div class="empty">Loading admin configuration...</div></section>`;
    }
    return `
      ${pageHeading(
        "Value Creation / Strategic Narrative / Admin",
        "Admin Configuration",
        "Global controls for data sources, benchmarks, knowledge uploads, and prompt/change visibility.",
        ""
      )}
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>Configuration Areas</h2>
            <p class="muted">Choose a register to maintain. Changes save to the standalone SQLite database.</p>
          </div>
        </div>
        <div class="segmented">
          ${adminTabButton("research", "Research Sources")}
          ${adminTabButton("financial", "Financial Sources")}
          ${adminTabButton("ai", "AI Providers")}
          ${adminTabButton("users", "Users & Access")}
          ${adminTabButton("usage", "Usage Statistics")}
          ${adminTabButton("benchmarks", "Benchmarks")}
          ${adminTabButton("knowledge", "Knowledge Base")}
          ${adminTabButton("prompts", "Prompt Log")}
          ${adminTabButton("settings", "Settings")}
        </div>
      </section>
      ${renderAdminTab()}
    `;
  }

  function pageHeading(breadcrumb, title, lede, actions) {
    return `
      <div class="page-heading">
        <div>
          <p class="breadcrumb">${escapeHtml(breadcrumb)}</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="lede">${escapeHtml(lede)}</p>
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  function activeCaseBadges() {
    if (!state.activeCase) return "";
    return `
      <span class="status-pill evidence">${escapeHtml(state.activeCase.status)}</span>
      <span class="status-pill validate">${escapeHtml(state.activeCase.industry || "Industry pending")}</span>
    `;
  }

  function activeCaseActions(options = {}) {
    if (!state.activeCase) return "";
    if (state.sharedAccess.readOnly) {
      return `${activeCaseBadges()}<span class="status-pill shared">Shared read-only view</span>`;
    }
    const includeAnnualReport = Boolean(options.includeAnnualReport);
    const disabled = state.businessProcessing ? "disabled" : "";
    const disabledClass = state.businessProcessing ? " disabled" : "";
    return `
      ${activeCaseBadges()}
      <button class="btn secondary compact" type="button" data-action="refresh-preview" ${disabled}>Refresh Analysis</button>
      ${includeAnnualReport ? `
        <label class="btn secondary compact annual-report-upload${disabledClass}">
          Upload Annual Report
          <input type="file" accept="application/pdf,.pdf" data-input="annualReportUpload" ${disabled} hidden>
        </label>
      ` : ""}
      <button class="btn accent compact" type="button" data-action="generate-report" ${disabled}>
        ${state.businessProcessing ? `<span class="button-loader" aria-hidden="true"></span> Working...` : "Generate Report"}
      </button>
    `;
  }

  function adminTabButton(tab, label) {
    return `<button class="segment ${state.adminTab === tab ? "active" : ""}" data-action="admin-tab" data-tab="${tab}">${escapeHtml(label)}</button>`;
  }

  function renderAdminTab() {
    if (state.adminTab === "users") return renderAdminAccess();
    if (state.adminTab === "usage") return renderAdminUsage();
    if (state.adminTab === "ai") return renderAiProviderAdmin();
    if (state.adminTab === "financial") return renderAdminCollection("financial_sources", "Financial Data Sources", [
      { key: "name", label: "Source Name" },
      { key: "endpoint_url", label: "Endpoint / URL" },
      { key: "api_key_masked", label: "API Key / Credential" },
      { key: "priority_order", label: "Priority", type: "number" },
      { key: "enabled", label: "Enabled", type: "checkbox" },
    ]);
    if (state.adminTab === "benchmarks") return renderAdminCollection("business_benchmarks", "Business Benchmark Library", [
      { key: "industry", label: "Industry" },
      { key: "financial_benchmarks", label: "Financial Benchmarks", type: "textarea" },
      { key: "operational_benchmarks", label: "Operational Benchmarks", type: "textarea" },
      { key: "customer_market_benchmarks", label: "Customer / Market Benchmarks", type: "textarea" },
    ], "benchmarks");
    if (state.adminTab === "knowledge") return renderKnowledgeAdmin();
    if (state.adminTab === "prompts") return renderPromptAdmin();
    if (state.adminTab === "settings") return renderSettingsAdmin();
    return renderResearchSourcesAdmin();
  }

  function renderAdminAccess() {
    const rows = [...(state.admin.admin_access_emails || [])]
      .sort((a, b) => Number(b.active || 0) - Number(a.active || 0) || String(a.email || "").localeCompare(String(b.email || "")));
    const authConfig = state.admin.authConfig || {};
    return `
      <section class="section admin-access-section">
        <div class="section-heading admin-access-heading">
          <div>
            <h2>Users &amp; Admin Access</h2>
            <p class="muted">Only active emails in this register can open Admin. Every other verified user sees their own Value Cases.</p>
          </div>
          <span class="pill ${authConfig.smtpConfigured ? "positive" : ""}">${escapeHtml(authConfig.deliveryMode || "Magic link")}</span>
        </div>
        <div class="auth-status-strip">
          <div><span>Sign-in</span><strong>One-time magic link</strong></div>
          <div><span>Link expiry</span><strong>${escapeHtml(authConfig.ttlMinutes || 15)} minutes</strong></div>
          <div><span>Session</span><strong>${escapeHtml(authConfig.sessionDays || 30)} days</strong></div>
          <div><span>Sender</span><strong>${escapeHtml(authConfig.sender || (authConfig.localPreviewEnabled ? "Local preview" : "Not configured"))}</strong></div>
        </div>
        <div class="admin-access-table-wrap">
          <table class="admin-access-table">
            <thead>
              <tr><th>Email</th><th>Access</th><th>Active</th><th>Added</th><th><span class="sr-only">Action</span></th></tr>
            </thead>
            <tbody>
              ${renderAdminAccessRow({}, true)}
              ${rows.map((row) => renderAdminAccessRow(row, false)).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderAdminAccessRow(row, isNew) {
    return `
      <tr class="admin-access-row ${isNew ? "is-new" : ""}" data-admin-row data-collection="admin_access_emails" data-id="${attr(row.id || "")}">
        <td>${adminTableField({ key: "email", label: "Email", type: "email", placeholder: "name@company.com" }, row.email)}</td>
        <td>${adminTableField({ key: "access_level", label: "Access", options: [
          { value: "admin", label: "Admin" },
          { value: "super_user", label: "Super User" },
        ] }, row.access_level || "admin")}</td>
        <td class="admin-access-toggle-cell">${adminTableToggle("active", "Active", row.active == null ? true : row.active)}</td>
        <td class="admin-access-date">${isNew ? "After saving" : escapeHtml(dateLabel(row.created_at))}</td>
        <td class="admin-access-action"><button class="btn ${isNew ? "accent" : "secondary"} compact" data-action="admin-save-row" type="button">${isNew ? "Add" : "Save"}</button></td>
      </tr>
    `;
  }

  function renderQuickAdminModal() {
    const qa = state.quickAdmin || {};
    if (!qa.open) return "";
    const body = qa.unlocked ? renderQuickAdminForm(qa) : renderQuickAdminPin(qa);
    return `
      <div class="qa-overlay">
        <div class="qa-modal" role="dialog" aria-modal="true" aria-label="Admin settings">
          <div class="qa-modal-head">
            <h2>Admin Settings</h2>
            <button type="button" class="qa-close" data-action="close-quick-admin" aria-label="Close">&times;</button>
          </div>
          ${body}
        </div>
      </div>
    `;
  }

  function renderQuickAdminPin(qa) {
    return `
      <p class="muted">Enter the admin number to manage AI provider settings.</p>
      ${qa.error ? `<div class="qa-error">${escapeHtml(qa.error)}</div>` : ""}
      <label class="field">
        <span>Admin number</span>
        <input id="qa-pin" type="password" inputmode="numeric" autocomplete="off"
               placeholder="••••" value="${attr(qa.pin || "")}" data-qa-submit-on-enter>
      </label>
      <div class="qa-actions">
        <button type="button" class="btn accent" data-action="quick-admin-unlock" ${qa.saving ? "disabled" : ""}>
          ${qa.saving ? "Checking&hellip;" : "Unlock"}
        </button>
      </div>
    `;
  }

  function renderQuickAdminForm(qa) {
    const config = qa.config || {};
    const models = config.openaiModels || [];
    const currentModel = config.openaiModel || "";
    const pplxPlaceholder = config.perplexityHasKey ? "•••••••• key saved — leave blank to keep" : "Paste Perplexity API key";
    const openaiPlaceholder = config.openaiHasKey ? "•••••••• key saved — leave blank to keep" : "Paste OpenAI API key";
    return `
      ${qa.message ? `<div class="qa-success">${escapeHtml(qa.message)}</div>` : ""}
      ${qa.error ? `<div class="qa-error">${escapeHtml(qa.error)}</div>` : ""}
      <p class="muted">Leave a key blank to keep the existing one. Keys are stored encrypted.</p>
      <label class="field">
        <span>Perplexity API key</span>
        <input id="qa-perplexity" type="password" autocomplete="off" placeholder="${attr(pplxPlaceholder)}">
      </label>
      <label class="field">
        <span>OpenAI API key</span>
        <input id="qa-openai" type="password" autocomplete="off" placeholder="${attr(openaiPlaceholder)}">
      </label>
      <label class="field">
        <span>OpenAI model</span>
        <select id="qa-model">
          ${models.map(function (m) {
            return `<option value="${attr(m)}" ${m === currentModel ? "selected" : ""}>${escapeHtml(m)}</option>`;
          }).join("")}
        </select>
      </label>
      <div class="qa-actions">
        <button type="button" class="btn secondary" data-action="close-quick-admin">Close</button>
        <button type="button" class="btn accent" data-action="quick-admin-save" ${qa.saving ? "disabled" : ""}>
          ${qa.saving ? "Saving&hellip;" : "Save changes"}
        </button>
      </div>
    `;
  }

  function renderAiUsageCard(aiUsage) {
    if (!aiUsage) return "";
    const totals = aiUsage.totals || {};
    const providers = aiUsage.providers || [];
    const tokens = totals.tokens || 0;
    const tokensLabel = tokens >= 1000 ? (tokens / 1000).toFixed(1) + "k" : String(tokens);
    const cost = Number(totals.cost || 0);
    return `
      <div class="ai-usage-card">
        <div class="ai-usage-head">
          <h3>AI Spend &amp; Latency</h3>
          <span class="muted">Last ${escapeHtml(aiUsage.days || 30)} days &middot; estimated</span>
        </div>
        <div class="ai-cost-strip">
          <div><div class="m">Provider calls</div><div class="v">${escapeHtml(totals.calls || 0)}</div></div>
          <div><div class="m">Tokens</div><div class="v">${escapeHtml(tokensLabel)}</div></div>
          <div><div class="m">Est. spend</div><div class="v">$${cost.toFixed(2)}</div></div>
          <div><div class="m">Cache hits</div><div class="v mut">${escapeHtml(totals.cacheHits || 0)}</div></div>
        </div>
        ${providers.length ? `
        <div class="table-wrap">
          <table class="ai-usage-table">
            <thead><tr><th>Provider</th><th>Calls</th><th>Tokens</th><th>Est. $</th><th>Avg latency</th></tr></thead>
            <tbody>
              ${providers.map(function (p) {
                return `<tr>
                  <td><strong>${escapeHtml(p.provider || "")}</strong></td>
                  <td>${escapeHtml(p.calls || 0)}</td>
                  <td>${escapeHtml(p.tokens || 0)}</td>
                  <td>$${Number(p.estCostUsd || 0).toFixed(2)}</td>
                  <td>${escapeHtml(p.avgLatencyMs || 0)} ms</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>` : `<p class="muted">No AI calls recorded yet.</p>`}
      </div>
    `;
  }

  function renderAdminUsage() {
    const usage = state.adminUsage;
    if (!usage) {
      return `<section class="section"><div class="empty">Loading usage statistics...</div></section>`;
    }
    const summary = usage.summary || {};
    const users = usage.users || [];
    const logins = usage.recentLogins || [];
    const valueCases = usage.valueCases || [];
    return `
      <section class="section admin-usage-section">
        <div class="section-heading">
          <div>
            <h2>Tool Usage Statistics</h2>
            <p class="muted">Successful magic-link logins and every saved Value Case across the workspace.</p>
          </div>
          <div class="compact-actions">
            <button class="btn secondary compact" type="button" data-action="refresh-admin-usage">Refresh</button>
            <a class="btn accent compact" href="/api/admin/value-cases.csv" download="strategic-narrative-value-cases.csv">Export CSV</a>
          </div>
        </div>
        <div class="usage-summary-grid">
          ${usageSummaryCard("Users", summary.totalUsers || 0, "Verified identities")}
          ${usageSummaryCard("Successful Logins", summary.successfulLogins || 0, "Magic-link sessions")}
          ${usageSummaryCard("Active Users", summary.activeUsers30d || 0, "Last 30 days")}
          ${usageSummaryCard("Value Cases", summary.totalValueCases || 0, "All owners")}
        </div>
        ${renderAiUsageCard(usage.aiUsage)}
        <div class="usage-register">
          <div class="section-heading compact-heading"><div><h3>Usage By Login</h3></div></div>
          <div class="table-wrap usage-table-wrap">
            <table class="usage-user-table">
              <thead><tr><th>Email</th><th>Access</th><th>Logins</th><th>Last Login</th><th>Value Cases</th><th>Joined</th></tr></thead>
              <tbody>
                ${users.map((user) => `
                  <tr>
                    <td><strong>${escapeHtml(user.email || "")}</strong></td>
                    <td>${escapeHtml(user.admin_access ? roleLabel(user.role) : "Standard User")}</td>
                    <td>${escapeHtml(user.login_count || 0)}</td>
                    <td>${escapeHtml(user.last_login_at ? dateLabel(user.last_login_at) : "No recorded login")}</td>
                    <td>${escapeHtml(user.value_case_count || 0)}</td>
                    <td>${escapeHtml(dateLabel(user.created_at))}</td>
                  </tr>
                `).join("") || `<tr><td colspan="6">No users recorded.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="usage-register">
          <div class="section-heading compact-heading"><div><h3>Recent Login Activity</h3></div></div>
          <div class="table-wrap usage-table-wrap usage-login-wrap">
            <table class="usage-login-table">
              <thead><tr><th>Email</th><th>Signed In</th><th>IP Address</th></tr></thead>
              <tbody>
                ${logins.slice(0, 100).map((login) => `
                  <tr><td>${escapeHtml(login.email || "")}</td><td>${escapeHtml(dateLabel(login.created_at))}</td><td>${escapeHtml(login.ip_address || "")}</td></tr>
                `).join("") || `<tr><td colspan="3">No successful magic-link logins recorded yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="usage-register">
          <div class="section-heading compact-heading">
            <div><h3>All Value Cases</h3><p class="muted">Owner, creation history and evidence-derived ETS sales angles.</p></div>
          </div>
          <div class="table-wrap usage-table-wrap usage-value-case-wrap">
            <table class="usage-value-case-table">
              <thead><tr><th>Company</th><th>Owner</th><th>Industry</th><th>Status</th><th>Created</th><th>Updated</th><th>ETS Sales Angles</th></tr></thead>
              <tbody>
                ${valueCases.map((item) => `
                  <tr>
                    <td><strong>${escapeHtml(item.company_name || "")}</strong></td>
                    <td>${escapeHtml(item.owner_email || "")}</td>
                    <td>${escapeHtml(item.industry || "")}</td>
                    <td>${escapeHtml(item.status || "")}</td>
                    <td>${escapeHtml(dateLabel(item.created_at))}</td>
                    <td>${escapeHtml(dateLabel(item.updated_at))}</td>
                    <td>${renderUsageEtsAngles(item.ets_sales_angles || [])}</td>
                  </tr>
                `).join("") || `<tr><td colspan="7">No Value Cases created.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function usageSummaryCard(label, value, note) {
    return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
  }

  function renderUsageEtsAngles(rows) {
    if (!rows.length) return `<span class="muted">No evidence-derived angle saved yet.</span>`;
    return `<div class="usage-angle-list">${rows.map((row) => `
      <div><strong>${escapeHtml(row.entryPoint || "")}</strong>${row.businessAngle ? `<span>${escapeHtml(row.businessAngle)}</span>` : ""}</div>
    `).join("")}</div>`;
  }

  function renderResearchSourcesAdmin() {
    const rows = [...(state.admin.research_sources || [])]
      .sort((a, b) => Number(a.priority_order || 999) - Number(b.priority_order || 999) || String(a.name || "").localeCompare(String(b.name || "")));
    return `
      <section class="section admin-research-section">
        <div class="section-heading">
          <div>
            <h2>Preferred Research Sources</h2>
            <p class="muted">${rows.length} sources configured across industry, technology, strategy and academic research.</p>
          </div>
        </div>
        <div class="admin-source-table-wrap">
          <table class="admin-source-table">
            <colgroup>
              <col class="source-col-name">
              <col class="source-col-coverage">
              <col class="source-col-focus">
              <col class="source-col-access">
              <col class="source-col-credential">
              <col class="source-col-priority">
              <col class="source-col-enabled">
              <col class="source-col-action">
            </colgroup>
            <thead>
              <tr>
                <th>Source</th>
                <th>Coverage</th>
                <th>Research Focus</th>
                <th>Access</th>
                <th>Credential</th>
                <th>Priority</th>
                <th>Enabled</th>
                <th><span class="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              ${renderResearchSourceTableRow({}, true)}
              ${rows.map((row) => renderResearchSourceTableRow(row, false)).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderResearchSourceTableRow(row, isNew) {
    const categoryOptions = ["Industry Research", "Technology & IT", "Strategy Consulting", "Multi-Industry", "Academic Institutions"];
    const sourceTypeOptions = ["API endpoint", "Website URL", "Manual upload"];
    return `
      <tr class="admin-source-row ${isNew ? "is-new" : ""}" data-admin-row data-collection="research_sources" data-id="${attr(row.id || "")}">
        <td>${adminTableField({ key: "name", label: "Name", placeholder: "Source name" }, row.name)}</td>
        <td class="admin-source-stacked">
          ${adminTableField({ key: "industry", label: "Industry", placeholder: "e.g. Financial services" }, row.industry)}
          ${adminTableField({ key: "category", label: "Category", options: categoryOptions }, row.category || categoryOptions[0])}
        </td>
        <td class="admin-source-stacked">
          ${adminTableField({ key: "specialty", label: "Specialty", type: "textarea", placeholder: "Primary research themes" }, row.specialty)}
          ${adminTableField({ key: "best_for", label: "Best for", type: "textarea", placeholder: "Best-fit analysis" }, row.best_for)}
        </td>
        <td class="admin-source-stacked">
          ${adminTableField({ key: "source_type", label: "Source type", options: sourceTypeOptions }, row.source_type || sourceTypeOptions[1])}
          ${adminTableField({ key: "base_url", label: "Base URL", type: "url", placeholder: "https://" }, row.base_url)}
        </td>
        <td>${adminTableField({ key: "api_key_masked", label: "API key", type: "password", placeholder: "Optional" }, row.api_key_masked)}</td>
        <td>${adminTableField({ key: "priority_order", label: "Order", type: "number", min: 1 }, row.priority_order == null ? 100 : row.priority_order)}</td>
        <td class="admin-source-toggle-cell">${adminTableToggle("enabled", "Enabled", row.enabled == null ? true : row.enabled)}</td>
        <td class="admin-source-action-cell">
          <button class="btn ${isNew ? "accent" : "secondary"} compact" data-action="admin-save-row" type="button">${isNew ? "Add" : "Save"}</button>
        </td>
      </tr>
    `;
  }

  function adminTableField(field, value) {
    const inputValue = value == null ? "" : value;
    if (field.options) {
      return `
        <label class="admin-table-field">
          <span>${escapeHtml(field.label)}</span>
          <select data-admin-field="${field.key}" aria-label="${attr(field.label)}">
            ${field.options.map((option) => {
              const optionValue = typeof option === "object" ? option.value : option;
              const optionLabel = typeof option === "object" ? option.label : option;
              return `<option value="${attr(optionValue)}" ${optionValue === inputValue ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
            }).join("")}
          </select>
        </label>
      `;
    }
    if (field.type === "textarea") {
      return `
        <label class="admin-table-field">
          <span>${escapeHtml(field.label)}</span>
          <textarea rows="2" data-admin-field="${field.key}" aria-label="${attr(field.label)}" placeholder="${attr(field.placeholder || "")}">${escapeHtml(inputValue)}</textarea>
        </label>
      `;
    }
    return `
      <label class="admin-table-field">
        <span>${escapeHtml(field.label)}</span>
        <input type="${field.type || "text"}" data-admin-field="${field.key}" aria-label="${attr(field.label)}" value="${attr(inputValue)}" placeholder="${attr(field.placeholder || "")}" ${field.min == null ? "" : `min="${attr(field.min)}"`}>
      </label>
    `;
  }

  function adminTableToggle(key, label, value) {
    const checked = value !== 0 && value !== "0" && value !== false;
    return `
      <label class="admin-table-toggle" title="${attr(label)}">
        <input type="checkbox" data-admin-field="${key}" aria-label="${attr(label)}" ${checked ? "checked" : ""}>
        <span aria-hidden="true"></span>
      </label>
    `;
  }

  function renderAdminCollection(collection, title, fields, rowClass) {
    const rows = state.admin[collection] || [];
    return `
      <section class="section">
        <div class="section-heading">
          <div><h2>${escapeHtml(title)}</h2></div>
        </div>
        ${renderAdminRow(collection, {}, fields, true, rowClass)}
        <div class="spacer"></div>
        ${rows.map((row) => renderAdminRow(collection, row, fields, false, rowClass)).join("")}
      </section>
    `;
  }

  function renderAiProviderAdmin() {
    const rows = state.admin.ai_provider_configs || [];
    const fields = [
      { key: "provider", label: "Provider" },
      { key: "display_name", label: "Name" },
      { key: "endpoint_url", label: "Endpoint" },
      { key: "model", label: "Model" },
      { key: "api_key", label: "API Key", type: "password" },
      { key: "enabled", label: "On", type: "checkbox" },
      { key: "use_for_company_lookup", label: "Lookup", type: "checkbox" },
      { key: "extract_with_tables", label: "Table Extract", type: "checkbox" },
      { key: "priority_order", label: "Priority", type: "number" },
    ];
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>AI Provider Configuration</h2>
            <p class="muted">OpenAI and Perplexity can enrich company lookup with revenue, stock ticker, industry and source-backed evidence. Saved keys are masked; leave the masked value unchanged to keep it, or type CLEAR to remove it.</p>
          </div>
        </div>
        ${rows.map((row) => renderAdminRow("ai_provider_configs", row, fields, false, "ai-provider")).join("")}
      </section>
    `;
  }

  function renderAdminRow(collection, row, fields, isNew, rowClass) {
    return `
      <div class="admin-row ${rowClass || ""}" data-admin-row data-collection="${collection}" data-id="${attr(row.id || "")}">
        ${fields.map((field) => adminField(field, row[field.key])).join("")}
        <button class="btn secondary" data-action="admin-save-row" type="button">${isNew ? "Add" : "Save"}</button>
      </div>
    `;
  }

  function adminField(field, value) {
    if (field.type === "checkbox") {
      return `
        <label class="field">
          <span>${escapeHtml(field.label)}</span>
          <input type="checkbox" data-admin-field="${field.key}" ${value ? "checked" : ""}>
        </label>
      `;
    }
    if (field.options) {
      return `
        <label class="field">
          <span>${escapeHtml(field.label)}</span>
          <select data-admin-field="${field.key}">
            ${field.options.map((option) => `<option value="${attr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
          </select>
        </label>
      `;
    }
    if (field.type === "textarea") {
      return `
        <label class="field">
          <span>${escapeHtml(field.label)}</span>
          <textarea data-admin-field="${field.key}">${escapeHtml(value || "")}</textarea>
        </label>
      `;
    }
    return `
      <label class="field">
        <span>${escapeHtml(field.label)}</span>
        <input type="${field.type || "text"}" data-admin-field="${field.key}" value="${attr(value || "")}">
      </label>
    `;
  }

  function renderKnowledgeAdmin() {
    const docs = state.admin.knowledge_docs || [];
    return `
      <section class="section">
        <div class="section-heading">
          <div><h2>Knowledge Base Uploads</h2></div>
        </div>
        <form id="upload-form" class="upload-zone">
          <div class="grid-4">
            <label class="field">
              <span>Title</span>
              <input name="title" required>
            </label>
            <label class="field">
              <span>Type</span>
              <select name="doc_type">
                <option value="tlp_deck">TLP Deck</option>
                <option value="win_coach">Win Coach</option>
                <option value="general">General</option>
              </select>
            </label>
            <label class="field">
              <span>Version</span>
              <input name="version" value="1.0">
            </label>
            <label class="field">
              <span>File</span>
              <input name="file" type="file">
            </label>
          </div>
          <label class="field">
            <span>Notes</span>
            <textarea name="notes"></textarea>
          </label>
          <button class="btn" type="submit">Upload Document</button>
        </form>
        <div class="spacer"></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Version</th><th>File</th><th>Uploaded</th></tr></thead>
            <tbody>
              ${docs.map((doc) => `
                <tr>
                  <td>${escapeHtml(doc.title)}</td>
                  <td>${escapeHtml(doc.doc_type)}</td>
                  <td>${escapeHtml(doc.version)}</td>
                  <td>${escapeHtml(doc.file_name || "Metadata only")}</td>
                  <td>${escapeHtml(dateLabel(doc.created_at))}</td>
                </tr>
              `).join("") || `<tr><td colspan="5">No documents uploaded.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderPromptAdmin() {
    const logs = (state.admin.prompt_change_log || []).filter((log) =>
      String(`${log.area || ""}${log.change_summary || ""}${log.prompt_text || ""}`).trim()
    );
    return `
      <section class="section">
        <div class="section-heading">
          <div><h2>Prompt & Change Log</h2></div>
        </div>
        <div class="admin-row prompt" data-admin-row data-collection="prompt_change_log">
          ${adminField({ key: "area", label: "Area" }, "")}
          ${adminField({ key: "change_summary", label: "Change Summary" }, "")}
          ${adminField({ key: "prompt_text", label: "Prompt", type: "textarea" }, "")}
          ${adminField({ key: "visible_to_all", label: "Visible", type: "checkbox" }, 0)}
          <button class="btn secondary" data-action="admin-save-row" type="button">Log</button>
        </div>
        <div class="spacer"></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Area</th><th>Change</th><th>Prompt</th><th>Visible</th><th>Created</th></tr></thead>
            <tbody>
              ${logs.map((log) => `
                <tr>
                  <td>${escapeHtml(log.area)}</td>
                  <td>${escapeHtml(log.change_summary)}</td>
                  <td>${escapeHtml(log.prompt_text)}</td>
                  <td>${log.visible_to_all ? "Yes" : "No"}</td>
                  <td>${escapeHtml(dateLabel(log.created_at))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderSettingsAdmin() {
    const rows = state.admin.admin_settings || [];
    const smtp = state.admin.smtpConfig || {};
    const smtpStatus = smtp.configured ? "Ready for magic links" : smtp.enabled ? "Configuration incomplete" : "Email delivery disabled";
    const credentialStatus = smtp.passwordValid === false
      ? "Saved password must be re-entered"
      : smtp.hasPassword
        ? "Password configured"
        : smtp.username
          ? "Password not configured"
          : "Unauthenticated relay";
    const busy = Boolean(state.smtpBusy);
    return `
      <section class="section smtp-settings-section">
        <div class="section-heading">
          <div>
            <h2>Magic Link Email Delivery</h2>
            <p class="muted">Connect an SMTP mailbox or relay to send one-time sign-in links.</p>
          </div>
          <span class="pill ${smtp.configured ? "positive" : smtp.enabled ? "warning" : ""}">${escapeHtml(smtpStatus)}</span>
        </div>
        <div class="smtp-status-strip">
          <div><span>Configuration</span><strong>${escapeHtml(smtp.source || "Environment")}</strong></div>
          <div><span>Sender</span><strong>${escapeHtml(smtp.fromEmail || "Not set")}</strong></div>
          <div><span>Credentials</span><strong>${escapeHtml(credentialStatus)}</strong></div>
          <div><span>Last updated</span><strong>${escapeHtml(smtp.updatedAt ? dateLabel(smtp.updatedAt) : "Not saved in Admin")}</strong></div>
        </div>
        ${smtp.passwordValid === false ? `<div class="notice error">The saved SMTP password cannot be decrypted on this server. Enter it again before testing email delivery.</div>` : ""}
        <div class="smtp-settings-grid" data-smtp-form>
          <label class="field smtp-host-field">
            <span>SMTP host</span>
            <input type="text" autocomplete="off" data-smtp-field="host" value="${attr(smtp.host || "")}" placeholder="smtp.office365.com">
          </label>
          <label class="field smtp-port-field">
            <span>Port</span>
            <input type="number" min="1" max="65535" data-smtp-field="port" value="${attr(smtp.port || 587)}">
          </label>
          <label class="field smtp-security-field">
            <span>Encryption</span>
            <select data-smtp-field="security">
              <option value="starttls" ${smtp.security === "starttls" || !smtp.security ? "selected" : ""}>STARTTLS</option>
              <option value="ssl" ${smtp.security === "ssl" ? "selected" : ""}>SSL / TLS</option>
              <option value="none" ${smtp.security === "none" ? "selected" : ""}>None</option>
            </select>
          </label>
          <label class="field smtp-sender-field">
            <span>Sender email</span>
            <input type="email" autocomplete="email" data-smtp-field="fromEmail" value="${attr(smtp.fromEmail || "")}" placeholder="no-reply@company.com">
          </label>
          <label class="field smtp-username-field">
            <span>Username</span>
            <input type="text" autocomplete="username" data-smtp-field="username" value="${attr(smtp.username || "")}" placeholder="Usually the sender email">
          </label>
          <label class="field smtp-password-field">
            <span>Password</span>
            <input type="password" autocomplete="new-password" data-smtp-field="password" value="" placeholder="${attr(smtp.hasPassword ? "Leave blank to keep saved password" : "Enter SMTP password")}">
          </label>
          <label class="field smtp-url-field">
            <span>Public app URL</span>
            <input type="url" autocomplete="url" data-smtp-field="publicBaseUrl" value="${attr(smtp.publicBaseUrl || "")}" placeholder="https://strategic-narrative.company.com">
            <small>Used in magic links when the app is externally hosted.</small>
          </label>
          <label class="field smtp-test-field">
            <span>Test recipient</span>
            <input type="email" autocomplete="email" data-smtp-field="testRecipient" value="${attr((state.me && state.me.email) || "")}" placeholder="name@company.com">
          </label>
        </div>
        <div class="smtp-options-row">
          <label class="smtp-check"><input type="checkbox" data-smtp-field="enabled" ${smtp.enabled ? "checked" : ""}><span>Enable SMTP email delivery</span></label>
          <label class="smtp-check"><input type="checkbox" data-smtp-field="clearPassword"><span>Remove saved password</span></label>
        </div>
        <div class="smtp-actions">
          <button class="btn secondary" data-action="save-smtp-settings" type="button" ${busy ? "disabled" : ""}>${state.smtpBusy === "save" ? "Saving..." : "Save SMTP Settings"}</button>
          <button class="btn accent" data-action="test-smtp-settings" type="button" ${busy ? "disabled" : ""}>${state.smtpBusy === "test" ? "Sending..." : "Save & Send Test Email"}</button>
        </div>
      </section>
      <section class="section admin-application-settings">
        <div class="section-heading">
          <div><h2>Application Settings</h2></div>
        </div>
        <div class="admin-row settings" data-admin-row data-collection="admin_settings">
          ${adminField({ key: "key", label: "Key" }, "")}
          ${adminField({ key: "value", label: "Value" }, "")}
          ${adminField({ key: "description", label: "Description" }, "")}
          <button class="btn secondary" data-action="admin-save-row" type="button">Add</button>
        </div>
        <div class="spacer"></div>
        ${rows.map((row) => `
          <div class="admin-row settings" data-admin-row data-collection="admin_settings">
            ${adminField({ key: "key", label: "Key" }, row.key)}
            ${adminField({ key: "value", label: "Value" }, row.value)}
            ${adminField({ key: "description", label: "Description" }, row.description)}
            <button class="btn secondary" data-action="admin-save-row" type="button">Save</button>
          </div>
        `).join("")}
      </section>
    `;
  }

  function readSmtpSettingsForm() {
    const form = app.querySelector("[data-smtp-form]");
    if (!form) return null;
    const record = {};
    app.querySelectorAll("[data-smtp-field]").forEach((input) => {
      record[input.dataset.smtpField] = input.type === "checkbox" ? input.checked : input.value;
    });
    return record;
  }

  async function saveSmtpSettings(sendTest = false) {
    const record = readSmtpSettingsForm();
    if (!record) return;
    const recipient = record.testRecipient;
    delete record.testRecipient;
    state.smtpBusy = sendTest ? "test" : "save";
    setMessage("");
    render();
    try {
      const saved = await api("/api/admin/smtp/save", {
        method: "POST",
        body: JSON.stringify(record),
      });
      state.admin.smtpConfig = saved.smtpConfig;
      state.admin.authConfig = saved.authConfig;
      if (sendTest) {
        const tested = await api("/api/admin/smtp/test", {
          method: "POST",
          body: JSON.stringify({ recipient }),
        });
        state.admin.smtpConfig = tested.smtpConfig;
        setMessage(`SMTP settings saved. Test email sent to ${tested.recipient}.`);
      } else {
        setMessage("SMTP settings saved. Magic-link delivery will use this configuration immediately.");
      }
    } finally {
      state.smtpBusy = "";
    }
    render();
  }

  function buildBusinessAiContext(business) {
    const company = currentPriorityCompany();
    const profile = activeCaseCompanyProfile(state.activeCase);
    const latest = latestFinancialTrendRow(business);
    const researchRows = mergeResearchFirmPriorities(business.researchFirmPriorities, company);
    const topResearchThemes = researchTopicFrequencies(researchRows)
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map((item) => ({
        label: item.label,
        count: item.count,
        firms: item.firms,
      }));
    const benchmarkAnalysis = benchmarkPeerAnalysisData(business);
    const priorityEvidenceSnippets = businessAnnualReportEvidenceSnippets(business);
    const sourceRequiredPriorityInsights = {
      sourceRequired: true,
      industryTrends: [
        {
          title: "Official source evidence required",
          summary: `No ${company.name || "company"} annual-report or investor-result snippets are loaded yet. Industry trend commentary is withheld so the page does not imply company-specific research was performed.`,
          sources: annualReportSourceLinks(company, profile),
        },
      ],
      businessPriorities: [
        {
          title: "Annual-report readout not generated",
          summary: "Load official annual report, investor pack, results, or press-release snippets before business-priority bullets are stored for AI narrative reuse.",
          sources: annualReportSourceLinks(company, profile),
        },
      ],
    };
    return {
      generatedAt: new Date().toISOString(),
      company: {
        name: company.name,
        ticker: company.ticker,
        industry: company.industry,
        primaryIndustry: company.primaryIndustry || company.industry || "",
        subSector: company.subSector || "",
        website: company.website || "",
        domain: company.domain || "",
        hq: company.hq || "",
        hqCountry: company.hqCountry || "",
        cik: company.cik || "",
        companyNumber: company.companyNumber || "",
        employees: company.employees || "",
        revenue: company.revenue || "",
        annualRevenueUsd: company.annualRevenueUsd || "",
        ebitdaUsd: company.ebitdaUsd || "",
        totalAssetsUsd: company.totalAssetsUsd || "",
        netProfit: company.netProfit || "",
        fiscalYear: company.fiscalYear || "",
        sharePriceNotes: company.sharePriceNotes || "",
      },
      strategicBusinessNarrative: {
        paragraphs: strategicBusinessNarrativeParagraphs(business),
      },
      financialSummary: {
        latestRevenue: latest.revenue || "",
        latestGrowth: latest.yoyGrowth || "",
        latestOperatingMargin: latest.operatingMargin || "",
        latestNetMargin: latest.netMargin || "",
        fiveYearTrendRows: business.financialTrends || [],
        peerComparisonRows: topPeerComparisonRows(business).map((row) => ({
          company: row.company || "",
          isCustomer: Boolean(row.isCustomer),
          revenue: row.revenue || "",
          operatingMargin: row.operatingMargin || "",
          growth: row.cagr3 || "",
          netMargin: row.netMargin || "",
        })),
      },
      industryResearch: {
        executiveSummary: business.industryResearchSummary || researchExecutiveSummary(researchRows, company),
        topThemes: topResearchThemes,
        firmPriorities: researchRows.map((row) => ({
          firm: row.firm || "",
          reportTitle: row.reportTitle || row.report_title || "",
          publicationDate: row.publicationDate || row.publication_date || "",
          priority: row.priority || "",
          signal: row.signal || "",
          evidence: row.evidence || "",
          implication: row.implication || "",
          themes: Array.isArray(row.themes) ? row.themes : [],
          sources: Array.isArray(row.sources) ? row.sources : [],
        })),
      },
      priorityInsights: priorityEvidenceSnippets.length
        ? (hasPriorityInsights(business.priorityInsights) && (businessHasAnnualReportEvidence(business) || !priorityInsightsNeedSourceRefresh(business.priorityInsights, company))
          ? business.priorityInsights
          : buildPriorityInsights(company))
        : sourceRequiredPriorityInsights,
      benchmarkAnalysis: benchmarkAnalysis || { cards: [], heatmapRows: [] },
    };
  }

  function readBusinessForm() {
    if (!document.querySelector("[data-business-form]")) return state.business;
    const payload = {
      snapshot: { ...((state.business && state.business.snapshot) || {}) },
      financialTrends: readCollectionOrExisting("financialTrends"),
      marketTriggers: readCollectionOrExisting("marketTriggers"),
      marketShare: readCollectionOrExisting("marketShare"),
      peers: readCollectionOrExisting("peers"),
      benchmarkNotes: readCollectionOrExisting("benchmarkNotes"),
      signalScan: readCollectionOrExisting("signalScan"),
      csuiteQuotes: readCollectionOrExisting("csuiteQuotes"),
      peerNarrative: document.querySelector("[data-peer-narrative]")?.value || ((state.business && state.business.peerNarrative) || ""),
      priorityInsights: state.business && hasPriorityInsights(state.business.priorityInsights) && (businessHasAnnualReportEvidence(state.business) || !priorityInsightsNeedSourceRefresh(state.business.priorityInsights, currentPriorityCompany()))
        ? state.business.priorityInsights
        : buildPriorityInsights(currentPriorityCompany()),
      researchFirmPriorities: state.business && hasResearchFirmPriorities(state.business.researchFirmPriorities)
        ? mergeResearchFirmPriorities(state.business.researchFirmPriorities, currentPriorityCompany())
        : buildResearchFirmPriorities(currentPriorityCompany()),
      industryResearchSummary: (state.business && state.business.industryResearchSummary) || "",
      industryResearchStatus: {
        ...((state.business && state.business.industryResearchStatus) || {}),
      },
      annualReportAnalysis: {
        ...((state.business && state.business.annualReportAnalysis) || {}),
      },
      privateEquityAnalysis: {
        ...((state.business && state.business.privateEquityAnalysis) || {}),
      },
      refreshStatus: {
        ...((state.business && state.business.refreshStatus) || {}),
      },
      narrative: { ...((state.business && state.business.narrative) || {}) },
    };
    document.querySelectorAll("[data-snapshot]").forEach((input) => {
      payload.snapshot[input.dataset.snapshot] = input.value;
    });
    document.querySelectorAll("[data-narrative]").forEach((input) => {
      payload.narrative[input.dataset.narrative] = input.value;
    });
    payload.aiContext = buildBusinessAiContext(payload);
    return payload;
  }

  function readCollectionOrExisting(collection) {
    if (document.querySelector(`[data-collection="${collection}"]`)) return readCollection(collection);
    const existing = state.business && state.business[collection];
    return Array.isArray(existing) ? existing : [];
  }

  function readCollection(collection) {
    const rows = {};
    document.querySelectorAll(`[data-collection="${collection}"]`).forEach((input) => {
      const index = input.dataset.index;
      const key = input.dataset.key;
      if (index == null || !key) return;
      rows[index] = rows[index] || {};
      rows[index][key] = input.type === "checkbox" ? input.checked : input.value;
    });
    return Object.keys(rows)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => rows[key]);
  }

  function readAdminRow(row) {
    const record = {};
    if (row.dataset.id) record.id = row.dataset.id;
    row.querySelectorAll("[data-admin-field]").forEach((input) => {
      record[input.dataset.adminField] = input.type === "checkbox" ? input.checked : input.value;
    });
    return record;
  }

  async function saveAdminRow(row) {
    const collection = row.dataset.collection;
    const record = readAdminRow(row);
    if (collection === "prompt_change_log" && !String(record.prompt_text || "").trim()) {
      setError("Prompt text is required before logging a prompt.");
      render();
      return;
    }
    await api("/api/admin/save", {
      method: "POST",
      body: JSON.stringify({ collection, record }),
    });
    await loadAdmin();
    if (collection === "research_sources") await loadResearchSources();
    if (collection === "admin_access_emails") {
      state.adminUsage = null;
    }
    setMessage("Admin configuration saved.");
    render();
  }

  function trimPromptLogText(value, maxLength = 12000) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3).trim()}...`;
  }

  function pushPromptLogRecord(record) {
    if (!record || !state.admin || !Array.isArray(state.admin.prompt_change_log)) return;
    state.admin.prompt_change_log = [
      record,
      ...state.admin.prompt_change_log.filter((item) => item.id !== record.id),
    ];
  }

  async function logPromptEntry(area, changeSummary, promptText, options = {}) {
    const record = {
      area: trimPromptLogText(area || "User Prompt", 120),
      change_summary: trimPromptLogText(changeSummary || "Prompt captured from application workflow.", 300),
      prompt_text: trimPromptLogText(promptText),
      visible_to_all: Boolean(options.visibleToAll),
    };
    if (!record.prompt_text || !state.me) return;
    try {
      const data = await api("/api/prompt-log", {
        method: "POST",
        body: JSON.stringify(record),
      });
      pushPromptLogRecord(data.record);
    } catch (error) {
      if (!canAdmin()) return;
      try {
        const data = await api("/api/admin/save", {
          method: "POST",
          body: JSON.stringify({ collection: "prompt_change_log", record }),
        });
        pushPromptLogRecord(data.record);
      } catch (_) {
        // Prompt logging should never block the user's workflow.
      }
    }
  }

  function companyLookupPromptLogText(query, data) {
    const chatgpt = data.chatgptLookup || {};
    const perplexity = data.perplexityLookup || {};
    const matches = (data.matches || [])
      .slice(0, 6)
      .map((match) => {
        const profile = [
          match.ticker || match.cik ? `ticker/CIK ${match.ticker || match.cik}` : "ticker/CIK n/a",
          match.industry || match.primaryIndustry ? `industry ${match.primaryIndustry || match.industry}` : "industry n/a",
          match.subSector ? `sub-sector ${match.subSector}` : "sub-sector n/a",
          match.hqCountry ? `HQ country ${match.hqCountry}` : "HQ country n/a",
          match.domain || match.website ? `domain ${match.domain || match.website}` : "domain n/a",
          match.revenue && !isValidationPlaceholder(match.revenue) ? `revenue ${match.revenue}` : "revenue n/a",
          match.annualRevenueUsd ? `annual revenue USD ${match.annualRevenueUsd}` : "annual revenue USD n/a",
          match.ebitdaUsd ? `EBITDA USD ${match.ebitdaUsd}` : "EBITDA USD n/a",
          match.totalAssetsUsd ? `total assets USD ${match.totalAssetsUsd}` : "total assets USD n/a",
        ].join(", ");
        return `${match.name || "Unknown"} - ${profile} - ${match.confidence || 0}%`;
      })
      .join("; ");
    const snippets = (data.sourceSnippets || [])
      .slice(0, 3)
      .map((snippet) => `${snippet.label || snippet.source || "Source"}: ${snippet.snippet || ""}`)
      .join(" | ");
    return [
      `Prompt: ChatGPT Company Name lookup for "${query}". Return official company name, stock ticker/CIK, revenue, industry, sub-sector, website/domain, HQ country, EBITDA, total assets, employees and source evidence.`,
      `Perplexity lookup: ${perplexity.used ? `used${perplexity.model ? ` (${perplexity.model})` : ""}` : perplexity.configured ? "configured but no usable profile returned" : "not configured - API key missing"}.`,
      `Perplexity table extraction: ${perplexity.tableExtraction ? "enabled" : "disabled"}.`,
      `ChatGPT lookup: ${chatgpt.used ? `used${chatgpt.model ? ` (${chatgpt.model})` : ""}` : chatgpt.configured ? "configured but no usable profile returned" : "not configured - OPENAI_API_KEY missing"}.`,
      matches ? `Returned options: ${matches}.` : "Returned options: none.",
      snippets ? `Source snippets: ${snippets}.` : "",
    ].filter(Boolean).join("\n");
  }

  function selectedCompanyPromptLogText(match) {
    return [
      `Prompt: Use the selected company lookup result to refresh profile, financials, research priorities and benchmark context.`,
      `Selected company: ${match.name || ""}`,
      `Ticker / CIK: ${match.ticker || match.cik || "n/a"}`,
      `Industry: ${match.primaryIndustry || match.industry || "n/a"}`,
      `Sub-sector: ${match.subSector || "n/a"}`,
      `Website/domain: ${match.website || match.domain || "n/a"}`,
      `HQ country: ${match.hqCountry || "n/a"}`,
      `Revenue: ${match.revenue && !isValidationPlaceholder(match.revenue) ? match.revenue : "n/a"}`,
      `Annual revenue USD: ${match.annualRevenueUsd || "n/a"}`,
      `EBITDA USD: ${match.ebitdaUsd || "n/a"}`,
      `Total assets USD: ${match.totalAssetsUsd || "n/a"}`,
      `Employees: ${match.employees || "n/a"}`,
      `Source: ${match.source || "n/a"}`,
      `Confidence: ${match.confidence || "n/a"}%`,
    ].join("\n");
  }

  function businessPromptLogText(business, intent) {
    const context = buildBusinessAiContext(business);
    const company = context.company || {};
    const financial = context.financialSummary || {};
    const peers = (financial.peerComparisonRows || [])
      .filter((row) => !row.isCustomer)
      .slice(0, 5)
      .map((row) => row.company)
      .filter(Boolean);
    const themes = ((context.industryResearch && context.industryResearch.topThemes) || [])
      .slice(0, 6)
      .map((theme) => `${theme.label} (${theme.count})`)
      .join(", ");
    const narrative = ((context.strategicBusinessNarrative && context.strategicBusinessNarrative.paragraphs) || [])
      .join("\n\n");
    return [
      `Prompt: ${intent}`,
      `Company: ${company.name || "n/a"}${company.ticker ? ` (${company.ticker})` : ""}`,
      `Industry: ${company.industry || "n/a"}`,
      `Financial evidence: revenue ${financial.latestRevenue || "n/a"}, growth ${financial.latestGrowth || "n/a"}, operating margin ${financial.latestOperatingMargin || "n/a"}.`,
      peers.length ? `Peer benchmark set: ${joinReadableList(peers)}.` : "Peer benchmark set: n/a.",
      themes ? `Research themes: ${themes}.` : "Research themes: n/a.",
      narrative ? `Generated executive narrative:\n${narrative}` : "",
    ].filter(Boolean).join("\n");
  }

  function transformationAgendaPromptLogText(business) {
    const context = buildBusinessAiContext(business || state.business || {});
    const company = context.company || {};
    const rows = [
      ["Top of mind for Board & ExCo", "What is currently top of mind for the executive team and Board?"],
      ["Strategic priorities & transformation initiatives", "Strategic priorities and transformation initiatives underway."],
      ["Where investment is going", "Where investment is being directed across business and technology."],
      ["Challenges and pressure points", "Key operational, regulatory, financial or customer-related challenges."],
      ["Leadership and market signals", "Significant leadership commentary, market announcements or investor messages that help explain their agenda."],
    ].map(([dimension, question]) => `- ${dimension}: ${question}`).join("\n");
    return [
      `Prompt: Perplexity/OpenAI Business Transformation - Agenda per-question refresh for ${company.name || "selected company"}.`,
      `Role: AI research and finance analyst helping an IT consulting team prepare a board-level Business Transformation - Agenda section.`,
      `Run a separate Perplexity or OpenAI research pass for each Dimension row using this workflow: 1. Use Google/web search to find the company's last two full-year annual reports or equivalent filings. 2. Look at the Dimension question. 3. Analyse both annual reports for that question. 4. Answer based only on findings in those annual reports.`,
      `Use Google/web search only to discover actual annual report PDFs/pages from Investor Relations or trusted filing repositories; do not cite search-result URLs.`,
      `Return a table with five Q rows and Source Notes listing the latest annual report and prior-year annual report used.`,
      `For every Dimension row, answer the question directly in the What it looks like now column using exactly 3 bullet points.`,
      `Each bullet must include company-specific evidence, an annual-report source label, and either a C-level quote/close paraphrase or hard annual-report data.`,
      `Do not use generic language such as likely, typically, commonly, should be read, should show, source basis, or use the annual report.`,
      `Dimensions:\n${rows}`,
    ].join("\n");
  }

  function refreshCompanyLookupUi() {
    const lookup = state.companyLookup;
    const input = document.getElementById("companyNameInput");
    const suggestions = document.getElementById("companyNameSuggestions");
    const status = document.getElementById("companyLookupStatus");
    const suggestionsOpen = shouldShowCompanySuggestions();

    if (input) {
      input.setAttribute("aria-expanded", suggestionsOpen ? "true" : "false");
    }
    if (suggestions) {
      suggestions.hidden = !suggestionsOpen;
      suggestions.innerHTML = renderCompanySuggestions();
    }
    if (status) {
      status.className = `lookup-status ${lookup.level || "muted"}`;
      status.innerHTML = renderCompanyLookupStatusContent();
    }
  }

  function clearFieldValidation(form) {
    form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
    form.querySelectorAll("[data-field-error]").forEach((field) => {
      field.textContent = "";
    });
  }

  function markInvalid(form, fieldName, message) {
    const input = form.querySelector(`[name="${fieldName}"]`);
    if (!input) return null;
    input.classList.add("is-invalid");
    const holder = form.querySelector(`[data-field-error="${fieldName}"]`);
    if (holder) holder.textContent = message;
    return input;
  }

  function syncNewCaseCompanyFields(fields, clearValidationState) {
    const form = document.getElementById("new-case-form");
    const headerInput = document.getElementById("companyNameInput");
    const caseCompanyInput = document.getElementById("newCaseCompanyName");

    if (Object.prototype.hasOwnProperty.call(fields, "companyName")) {
      const value = fields.companyName || "";
      if (headerInput) headerInput.value = value;
      if (caseCompanyInput) caseCompanyInput.value = value;
    }
    if (form) {
      if (Object.prototype.hasOwnProperty.call(fields, "ticker")) form.elements.ticker.value = fields.ticker || "";
      if (Object.prototype.hasOwnProperty.call(fields, "industry")) form.elements.industry.value = fields.industry || "";
      if (Object.prototype.hasOwnProperty.call(fields, "website") && form.elements.website) form.elements.website.value = fields.website || "";
      if (Object.prototype.hasOwnProperty.call(fields, "hq_country") && form.elements.hq_country) form.elements.hq_country.value = fields.hq_country || "";
      if (Object.prototype.hasOwnProperty.call(fields, "sub_sector") && form.elements.sub_sector) form.elements.sub_sector.value = fields.sub_sector || "";
      if (Object.prototype.hasOwnProperty.call(fields, "cik") && form.elements.cik) form.elements.cik.value = fields.cik || "";
      if (Object.prototype.hasOwnProperty.call(fields, "revenue") && form.elements.revenue) form.elements.revenue.value = fields.revenue || "";
      if (Object.prototype.hasOwnProperty.call(fields, "annual_revenue_usd") && form.elements.annual_revenue_usd) form.elements.annual_revenue_usd.value = fields.annual_revenue_usd || "";
      if (Object.prototype.hasOwnProperty.call(fields, "ebitda_usd") && form.elements.ebitda_usd) form.elements.ebitda_usd.value = fields.ebitda_usd || "";
      if (Object.prototype.hasOwnProperty.call(fields, "total_assets_usd") && form.elements.total_assets_usd) form.elements.total_assets_usd.value = fields.total_assets_usd || "";
      if (Object.prototype.hasOwnProperty.call(fields, "employees") && form.elements.employees) form.elements.employees.value = fields.employees || "";
      if (clearValidationState) clearFieldValidation(form);
    }
  }

  function currentCompanyInputValue() {
    return (
      document.getElementById("newCaseCompanyName")?.value ||
      document.getElementById("companyNameInput")?.value ||
      state.companyLookup.query ||
      ""
    );
  }

  function emptyNewCaseCompanyProfileFields(companyName) {
    return {
      companyName,
      ticker: "",
      industry: "",
      website: "",
      hq_country: "",
      sub_sector: "",
      cik: "",
      revenue: "",
      annual_revenue_usd: "",
      ebitda_usd: "",
      total_assets_usd: "",
      employees: "",
    };
  }

  function normalizedMatchId(value) {
    return normalizeLookupQuery(value).replace(/\s+/g, "-");
  }

  function localCompanyMatchById(matchId) {
    const wanted = normalizedMatchId(matchId);
    if (!wanted) return null;
    const query = state.companyLookup.query ||
      document.getElementById("newCaseCompanyName")?.value ||
      document.getElementById("companyNameInput")?.value ||
      "";
    return localCompanyLookup(query).matches.find((match) =>
      normalizedMatchId(match.id) === wanted ||
      normalizedMatchId(match.ticker) === wanted ||
      normalizedMatchId(match.name) === wanted ||
      normalizedMatchId(match.legalName) === wanted
    ) || null;
  }

  function findValueCaseForCompany(match) {
    if (!match) return null;
    const matchName = normalizeLookupQuery(match.name || "");
    const matchTicker = normalizeLookupQuery(match.ticker || "");
    return state.valueCases.find((valueCase) => {
      const caseName = normalizeLookupQuery(valueCase.company_name || "");
      const caseTicker = normalizeLookupQuery(valueCase.ticker || "");
      return (matchTicker && caseTicker === matchTicker) || (matchName && caseName === matchName);
    }) || null;
  }

  function validateNewCaseForm(form) {
    clearFieldValidation(form);
    const company = String(form.elements.company_name.value || "").trim();
    const ticker = String(form.elements.ticker.value || "").trim();
    const industry = String(form.elements.industry.value || "").trim();
    const invalidFields = [];

    if (company.length < 2) {
      invalidFields.push(markInvalid(form, "company_name", "Enter at least two characters for the company name."));
    } else if (!selectedCompanyStillCurrent(company) && !state.companyLookup.typedAccepted) {
      invalidFields.push(
        markInvalid(form, "company_name", "Select a lookup match, or choose Use typed company after validation.")
      );
      setCompanyLookupStatus(
        "Company changed. Select the right company match before profile, revenue, benchmarks, and analysis refresh.",
        "warning"
      );
      refreshCompanyLookupUi();
    }

    if (ticker && !/^[A-Za-z0-9.-]{1,14}$/.test(ticker)) {
      invalidFields.push(markInvalid(form, "ticker", "Use a short market symbol such as HSBA.L, KD, or MSFT."));
    }
    if (!industry) {
      invalidFields.push(markInvalid(form, "industry", "Industry is required so benchmarks can be selected correctly."));
    }

    const firstInvalid = invalidFields.find(Boolean);
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  async function beginCompanyLookup(query, manual) {
    const cleaned = String(query || "").trim();
    state.companyLookup.query = cleaned;
    state.companyLookup.selected = selectedCompanyStillCurrent(cleaned) ? state.companyLookup.selected : null;
    state.companyLookup.typedAccepted = false;
    state.companyLookup.noMatch = false;

    if (cleaned.length < 2) {
      state.companyLookup.matches = [];
      state.companyLookup.validationLinks = [];
      state.companyLookup.sourceSnippets = [];
      state.companyLookup.sourcesChecked = [];
      state.companyLookup.scope = "local";
      setCompanyLookupStatus(
        manual ? "Enter at least two characters to look up a company." : "Type a customer name, then look up and select the correct company match.",
        manual ? "error" : "muted"
      );
      refreshCompanyLookupUi();
      return;
    }

    state.companyLookup.loading = true;
    setCompanyLookupStatus("Looking up company matches...", "muted");
    refreshCompanyLookupUi();

    try {
      let data;
      const localData = localCompanyLookup(cleaned);
      const completeLocalMatch = (localData.matches || []).find((match) => {
        const exactName = normalizeLookupQuery(match.name || match.legalName || "") === normalizeLookupQuery(cleaned);
        const aliasMatch = (match.aliases || []).some((alias) => normalizeLookupQuery(alias) === normalizeLookupQuery(cleaned));
        const hasCoreFinancials = !lookupValueMissing(match.revenue || match.annualRevenueUsd) && !lookupValueMissing(match.industry || match.primaryIndustry);
        return (exactName || aliasMatch || Number(match.confidence || 0) >= 90) && hasCoreFinancials;
      });
      if (completeLocalMatch) {
        data = localData;
      } else {
        try {
          data = await api(`/api/company-lookup?q=${encodeURIComponent(cleaned)}`, { timeoutMs: 45000 });
        } catch (error) {
          data = localData;
        }
      }
      if (normalizeLookupQuery(currentCompanyInputValue()) !== normalizeLookupQuery(data.query)) return;

      const mergedMatches = mergeCompanyLookupMatches(data.matches || [], localData.matches || []).map(enrichLookupMatchFromEvidence);
      const localOnly = !(data.matches || []).length && (localData.matches || []).length;
      state.companyLookup.matches = mergedMatches;
      state.companyLookup.validationLinks = data.validationLinks || localData.validationLinks || [];
      state.companyLookup.sourceSnippets = [
        ...((data.sourceSnippets || []).slice(0, 4)),
        ...((localOnly ? localData.sourceSnippets || [] : []).slice(0, 2)),
      ];
      state.companyLookup.sourcesChecked = data.sourcesChecked || localData.sourcesChecked || [];
      state.companyLookup.scope = localOnly ? "local" : (data.scope || "global");
      state.companyLookup.noMatch = !state.companyLookup.matches.length;
      state.companyLookup.loading = false;
      setCompanyLookupStatus(
        localOnly
          ? "Perplexity/server lookup did not return a usable match quickly, so the local fallback profile filled revenue and company fields. Validate against annual report before client use."
          : data.message || "Select a company profile with revenue, industry and ticker where available.",
        state.companyLookup.noMatch ? "warning" : "success"
      );
      refreshCompanyLookupUi();
      if (manual) {
        await logPromptEntry(
          "Company Lookup",
          `Company lookup prompt for ${cleaned}`,
          companyLookupPromptLogText(cleaned, data)
        );
      }
    } catch (error) {
      state.companyLookup.matches = [];
      state.companyLookup.loading = false;
      state.companyLookup.noMatch = false;
      state.companyLookup.sourceSnippets = [];
      state.companyLookup.sourcesChecked = [];
      state.companyLookup.scope = "local";
      setCompanyLookupStatus(error.message || "Company lookup failed.", "error");
      refreshCompanyLookupUi();
    }
  }

  function scheduleCompanyValidation(value) {
    if (companyLookupTimer) window.clearTimeout(companyLookupTimer);
    companyLookupTimer = window.setTimeout(() => beginCompanyLookup(value, false), 420);
  }

  function handleCompanyInput(value) {
    const previousQuery = state.companyLookup.query;
    const previousNormalized = normalizeLookupQuery(previousQuery);
    const nextNormalized = normalizeLookupQuery(value);
    state.companyLookup.query = value;

    if (state.companyLookup.selected && !selectedCompanyStillCurrent(value)) {
      state.companyLookup.selected = null;
      state.companyLookup.typedAccepted = false;
      state.companyLookup.sourceSnippets = [];
      state.companyLookup.sourcesChecked = [];
      setCompanyLookupStatus(
        "Company changed. Select the right company match before profile, revenue, benchmarks, and analysis refresh.",
        "warning"
      );
    }
    if (state.companyLookup.typedAccepted && nextNormalized !== previousNormalized) {
      state.companyLookup.typedAccepted = false;
      setCompanyLookupStatus("Company changed. Revalidate the typed company before creating a value case.", "warning");
    }
    syncNewCaseCompanyFields(
      state.companyLookup.selected || state.companyLookup.typedAccepted
        ? { companyName: value }
        : emptyNewCaseCompanyProfileFields(value),
      false
    );
    state.companyLookup.noMatch = false;
    state.companyLookup.sourceSnippets = [];
    state.companyLookup.sourcesChecked = [];
    scheduleCompanyValidation(value);
    refreshCompanyLookupUi();
  }

  async function selectCompanyMatch(matchId) {
    const match = enrichLookupMatchFromEvidence(
      state.companyLookup.matches.find((item) => item.id === matchId) ||
      localCompanyMatchById(matchId)
    );
    if (!match) {
      setCompanyLookupStatus("The selected company match expired. Run lookup again and select the company result.", "warning");
      refreshCompanyLookupUi();
      return;
    }
    const hasNewCaseForm = Boolean(document.getElementById("new-case-form"));
    syncNewCaseCompanyFields({
      companyName: match.name || "",
      ticker: lookupFieldValue(match, "ticker", "cik", "companyNumber"),
      industry: lookupFieldValue(match, "primaryIndustry", "industry"),
      website: lookupFieldValue(match, "website", "domain"),
      hq_country: lookupFieldValue(match, "hqCountry"),
      sub_sector: lookupFieldValue(match, "subSector", "industry"),
      cik: lookupFieldValue(match, "cik", "companyNumber"),
      revenue: companyRevenueDisplay(match),
      annual_revenue_usd: lookupFieldValue(match, "annualRevenueUsd"),
      ebitda_usd: lookupFieldValue(match, "ebitdaUsd"),
      total_assets_usd: lookupFieldValue(match, "totalAssetsUsd"),
      employees: lookupFieldValue(match, "employees"),
    }, true);
    state.companyLookup.query = match.name || "";
    state.companyLookup.selected = match;
    state.companyLookup.matches = [];
    state.companyLookup.noMatch = false;
    state.companyLookup.typedAccepted = false;
    state.companyLookup.validationLinks = match.validationLinks || [];
    state.companyLookup.sourceSnippets = match.sourceSnippets || [];
    state.companyLookup.sourcesChecked = state.companyLookup.sourcesChecked || [];
    const profileSummary = [
      match.ticker || match.cik,
      match.primaryIndustry || match.industry,
      match.hqCountry,
      match.revenue && !isValidationPlaceholder(match.revenue) ? match.revenue : "",
      match.annualRevenueUsd ? `USD revenue ${match.annualRevenueUsd}` : "",
    ].filter(Boolean).join(" / ");
    setCompanyLookupStatus(
      `Selected ${match.name}${profileSummary ? `: ${profileSummary}` : ""}. Validate values against current filings before client use.`,
      "success"
    );
    await logPromptEntry(
      "Company Lookup",
      `Selected lookup match for ${match.name || "company"}`,
      selectedCompanyPromptLogText(match)
    );
      if (!hasNewCaseForm) {
        const existingCase = findValueCaseForCompany(match);
        if (existingCase) {
          openValueCaseInStages(existingCase.id);
          if (state.business) {
            applyCompanyMatchToBusiness(match, { force: true });
            saveBusinessPayload(JSON.parse(JSON.stringify(state.business))).catch(() => null);
          }
          setMessage(`${match.name} value case opened. Modules are refreshing in stages.`);
      } else {
        state.view = "cases";
        setMessage(`${match.name} selected. Create a value case to use it.`);
      }
      render();
      return;
    }
    refreshCompanyLookupUi();
  }

  async function useTypedCompany() {
    const input = document.getElementById("companyNameInput");
    const value = input ? input.value.trim() : state.companyLookup.query;
    state.companyLookup.query = value;
    state.companyLookup.selected = null;
    state.companyLookup.matches = [];
    state.companyLookup.noMatch = false;
    state.companyLookup.sourceSnippets = [];
    state.companyLookup.sourcesChecked = [];
    state.companyLookup.typedAccepted = value.length >= 2;
    syncNewCaseCompanyFields({ companyName: value }, state.companyLookup.typedAccepted);
    setCompanyLookupStatus(
      state.companyLookup.typedAccepted
        ? "Using typed company. Keep validation links and source evidence updated before client use."
        : "Enter at least two characters before using a typed company.",
      state.companyLookup.typedAccepted ? "success" : "error"
    );
    refreshCompanyLookupUi();
    if (state.companyLookup.typedAccepted) {
      await logPromptEntry(
        "Company Lookup",
        `Used typed company name ${value}`,
        `Prompt: Use typed company "${value}" after validating source links manually.`
      );
    }
  }

  function dismissCompanyValidation() {
    state.companyLookup.matches = [];
    state.companyLookup.noMatch = false;
    state.companyLookup.sourceSnippets = [];
    state.companyLookup.sourcesChecked = [];
    refreshCompanyLookupUi();
  }

  app.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const form = event.target;
      if (form.id === "login-form") {
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        state.magicLink.sending = true;
        state.error = "";
        render();
        const data = await api("/api/auth/magic/request", {
          method: "POST",
          body: JSON.stringify({
            email,
            return_to: `${window.location.pathname}${window.location.search}`,
          }),
        });
        state.magicLink = {
          sending: false,
          requested: true,
          email: data.email || email,
          previewUrl: data.previewUrl || "",
          deliveryMode: data.deliveryMode || "Magic link",
          deliveryNote: data.deliveryNote || "",
          expiresInMinutes: data.expiresInMinutes || 15,
        };
        render();
      }
      if (form.id === "new-case-form") {
        if (!validateNewCaseForm(form)) return;
        const formData = new FormData(form);
        const companyName = String(formData.get("company_name") || "").trim();
        const industry = String(formData.get("industry") || "").trim();
        const ticker = String(formData.get("ticker") || "").trim();
        const website = String(formData.get("website") || "").trim();
        const hqCountry = String(formData.get("hq_country") || "").trim();
        const subSector = String(formData.get("sub_sector") || "").trim();
        const cik = String(formData.get("cik") || "").trim();
        const revenue = String(formData.get("revenue") || "").trim();
        const annualRevenueUsd = annualRevenueUsdPlainNumber(formData.get("annual_revenue_usd")) ||
          String(formData.get("annual_revenue_usd") || "").trim();
        const ebitdaUsd = annualRevenueUsdPlainNumber(formData.get("ebitda_usd")) ||
          String(formData.get("ebitda_usd") || "").trim();
        const totalAssetsUsd = annualRevenueUsdPlainNumber(formData.get("total_assets_usd")) ||
          String(formData.get("total_assets_usd") || "").trim();
        const employees = String(formData.get("employees") || "").trim();
        const selected = selectedCompanyStillCurrent(companyName) ? enrichLookupMatchFromEvidence(state.companyLookup.selected) : null;
        const creationMatch = selected || {
          name: companyName,
          ticker,
          industry,
          primaryIndustry: industry,
          website,
          hqCountry,
          subSector,
          cik,
          revenue,
          annualRevenueUsd,
          ebitdaUsd,
          totalAssetsUsd,
          employees,
          source: "Validated typed company profile",
          confidence: state.companyLookup.typedAccepted ? 45 : "",
          priorityInsights: buildPriorityInsights({ name: companyName, ticker, industry }),
          researchFirmPriorities: buildResearchFirmPriorities({ name: companyName, ticker, industry }),
        };
        state.caseProcessing = true;
        setMessage(`Building value case analysis for ${companyName}...`);
        render();
        const data = await api("/api/value-cases", {
          method: "POST",
          body: JSON.stringify({
            company_name: companyName,
            ticker,
            industry,
            description: selected ? lookupFieldValue(selected, "description") : "",
            hq: selected ? lookupFieldValue(selected, "hq") : "",
            website: website || (selected ? lookupFieldValue(selected, "website", "domain") : ""),
            domain: selected ? lookupFieldValue(selected, "domain") || domainFromUrl(lookupFieldValue(selected, "website")) : "",
            hq_country: hqCountry || (selected ? lookupFieldValue(selected, "hqCountry") : ""),
            sub_sector: subSector || (selected ? lookupFieldValue(selected, "subSector") : ""),
            cik: cik || (selected ? lookupFieldValue(selected, "cik", "companyNumber") : ""),
            company_number: selected ? lookupFieldValue(selected, "companyNumber") : "",
            primary_industry: industry,
            annual_revenue_usd: annualRevenueUsd || (selected ? lookupFieldValue(selected, "annualRevenueUsd") : ""),
            ebitda_usd: ebitdaUsd || (selected ? lookupFieldValue(selected, "ebitdaUsd") : ""),
            total_assets_usd: totalAssetsUsd || (selected ? lookupFieldValue(selected, "totalAssetsUsd") : ""),
            fiscal_year: selected ? lookupFieldValue(selected, "fiscalYear") : "",
            employees: employees || (selected ? lookupFieldValue(selected, "employees") : ""),
            revenue: revenue || (selected && !isValidationPlaceholder(selected.revenue) ? selected.revenue : companyRevenueDisplay(selected)),
            net_profit: selected ? lookupFieldValue(selected, "netProfit") : "",
            financial_trends: selected ? selected.financialRows || buildCompanyFinancialRows(selected) : [],
            priority_insights: selected
              ? selected.priorityInsights || buildPriorityInsights(selected)
              : buildPriorityInsights({ name: companyName, ticker, industry }),
            research_firm_priorities: selected
              ? mergeResearchFirmPriorities(selected.researchFirmPriorities, selected)
              : buildResearchFirmPriorities({ name: companyName, ticker, industry }),
            lookup_profile: selected || null,
            lookup_source: selected ? selected.source : "",
            lookup_confidence: selected ? selected.confidence : "",
          }),
        });
        resetCompanyLookup();
        await loadCases();
        state.caseProcessing = false;
        openValueCaseInStages(data.valueCase.id);
        if (creationMatch) {
          applyCompanyMatchToBusiness(creationMatch, { force: true });
          saveBusinessPayload(JSON.parse(JSON.stringify(state.business))).catch(() => null);
        }
        logPromptEntry(
          "Value Case",
          `Created Business Priorities workspace for ${companyName}`,
          businessPromptLogText(
            state.business,
            `Create a new Strategic Narrative Builder value case and Business Priorities prompt for ${companyName}.`
          )
        ).catch(() => null);
        state.caseProcessing = false;
        setMessage("Value Case created.");
        render();
      }
      if (form.id === "upload-form") {
        const formData = new FormData(form);
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        await loadAdmin();
        setMessage("Document uploaded.");
        render();
      }
    } catch (error) {
      state.caseProcessing = false;
      state.businessProcessing = "";
      state.magicLink.sending = false;
      setError(error);
      render();
    }
  });

  app.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action === "open-quick-admin") {
        state.quickAdmin = { open: true, unlocked: false, pin: "", error: "", saving: false, message: "", config: null };
        render();
      }
      if (action === "close-quick-admin") {
        state.quickAdmin = { open: false, unlocked: false, pin: "", error: "", saving: false, message: "", config: null };
        render();
      }
      if (action === "quick-admin-unlock") {
        const pinEl = document.getElementById("qa-pin");
        const pin = pinEl ? pinEl.value.trim() : "";
        state.quickAdmin.pin = pin;
        state.quickAdmin.saving = true;
        state.quickAdmin.error = "";
        render();
        try {
          const cfg = await api("/api/quick-admin/config", { method: "POST", body: JSON.stringify({ pin: pin }) });
          state.quickAdmin.unlocked = true;
          state.quickAdmin.config = cfg;
          state.quickAdmin.error = "";
        } catch (err) {
          state.quickAdmin.error = "Incorrect admin number.";
        } finally {
          state.quickAdmin.saving = false;
          render();
        }
      }
      if (action === "quick-admin-save") {
        const pxEl = document.getElementById("qa-perplexity");
        const oaEl = document.getElementById("qa-openai");
        const mdEl = document.getElementById("qa-model");
        const payload = {
          pin: state.quickAdmin.pin,
          perplexityKey: pxEl ? pxEl.value.trim() : "",
          openaiKey: oaEl ? oaEl.value.trim() : "",
          openaiModel: mdEl ? mdEl.value : "",
        };
        state.quickAdmin.saving = true;
        state.quickAdmin.error = "";
        state.quickAdmin.message = "";
        render();
        try {
          const res = await api("/api/quick-admin/save", { method: "POST", body: JSON.stringify(payload) });
          state.quickAdmin.message = (res.updated && res.updated.length) ? ("Saved: " + res.updated.join(", ")) : "No changes to save.";
          const cfg = await api("/api/quick-admin/config", { method: "POST", body: JSON.stringify({ pin: state.quickAdmin.pin }) });
          state.quickAdmin.config = cfg;
        } catch (err) {
          state.quickAdmin.error = "Could not save. Check the admin number and try again.";
        } finally {
          state.quickAdmin.saving = false;
          render();
        }
      }
      if (action === "synthesize-narrative") {
        const caseId = state.activeCaseId;
        if (caseId) {
          state.synthesizing = true;
          render();
          try {
            const data = await api(`/api/value-cases/${encodeURIComponent(caseId)}/business-priorities/synthesize`, { method: "POST", body: "{}" });
            if (state.business) state.business.synthesizedNarrative = data.synthesizedNarrative;
          } finally {
            state.synthesizing = false;
            render();
          }
        }
      }
      if (action === "logout") {
        await api("/api/logout", { method: "POST", body: "{}" });
        state.me = null;
        state.valueCases = [];
        state.activeCaseId = null;
        state.activeCase = null;
        state.business = null;
        state.admin = null;
        state.adminUsage = null;
        state.magicLink = {
          sending: false,
          requested: false,
          email: "",
          previewUrl: "",
          deliveryMode: "",
          deliveryNote: "",
          expiresInMinutes: 15,
        };
        state.view = "cases";
        resetCompanyLookup();
        render();
      }
      if (action === "magic-link-reset") {
        state.magicLink = {
          sending: false,
          requested: false,
          email: "",
          previewUrl: "",
          deliveryMode: "",
          deliveryNote: "",
          expiresInMinutes: 15,
        };
        state.error = "";
        render();
      }
      if (action === "account-admin") {
        state.view = "admin";
        if (!state.admin) await loadAdmin();
        if (state.adminTab === "usage" && !state.adminUsage) await loadAdminUsage();
        setMessage("");
        render();
      }
      if (action === "lookup-company") {
        await beginCompanyLookup(currentCompanyInputValue(), true);
      }
      if (action === "select-company-match") {
        await selectCompanyMatch(button.dataset.companyId);
      }
      if (action === "use-typed-company") {
        await useTypedCompany();
      }
      if (action === "dismiss-company-validation") {
        dismissCompanyValidation();
      }
      if (action === "nav") {
        state.view = button.dataset.view;
        if (state.view === "admin" && !state.admin) await loadAdmin();
        if ((state.view === "business" || state.view === "deep" || state.view === "financial" || state.view === "ai" || state.view === "ceo") && state.activeCaseId && !state.business) {
          openValueCaseInStages(state.activeCaseId, state.view);
        }
        setMessage("");
        render();
      }
      if (action === "open-case") {
        openValueCaseInStages(button.dataset.id);
      }
      if (action === "share-case") {
        await shareValueCase(button.dataset.id);
      }
      if (action === "download-c-level-pdf") {
        setMessage("Preparing C-level narrative PDF deck...");
        await downloadCLevelDeck(button.dataset.id, "pdf");
        setMessage("C-level narrative PDF deck downloaded.");
      }
      if (action === "download-c-level-pptx") {
        setMessage("Preparing editable C-level PowerPoint deck...");
        await downloadCLevelDeck(button.dataset.id, "pptx");
        setMessage("Editable C-level PowerPoint deck downloaded.");
      }
      if (action === "ceo-reset-narrative") {
        const builder = buildDefaultCeoNarrative(state.business || {});
        await saveCeoNarrativeBuilder(builder, "CEO narrative and agenda rebuilt from current analysis.");
      }
      if (action === "ceo-save-narrative") {
        const builder = readCeoNarrativeBuilderFromDom();
        builder.status = builder.status || "draft";
        await saveCeoNarrativeBuilder(builder, "CEO narrative and slide headings saved.");
      }
      if (action === "ceo-generate-content") {
        const builder = readCeoNarrativeBuilderFromDom();
        builder.status = "content_generated";
        builder.generatedAt = new Date().toISOString();
        builder.slides = (builder.slides || []).map((slide, index) => ({
          ...slide,
          content: ceoSlideGeneratedContent(slide, index, state.business || {}),
        }));
        await saveCeoNarrativeBuilder(builder, "CEO deck content generated from the confirmed narrative.");
      }
      if (action === "save-business") {
        state.businessProcessing = "Saving Business Priorities and report context...";
        render();
        await refreshBusinessPayload(false);
        await logPromptEntry(
          "Business Priorities",
          `Saved Business Priorities prompt for ${(state.activeCase && state.activeCase.company_name) || "selected company"}`,
          businessPromptLogText(
            state.business,
            "Save Business Priorities and preserve the generated AI context for later narrative use."
          )
        );
        state.businessProcessing = "";
        setMessage("Business Priorities saved.");
        render();
      }
      if (action === "refresh-preview") {
        state.business = readBusinessForm();
        state.businessProcessing = "Refreshing company-specific analysis in stages...";
        await runBusinessAnalysisStages({ force: true, save: true, lookupTimeoutMs: 15000 });
        await refreshPrivateEquityPeerData();
        logPromptEntry(
          "Business Priorities",
          `Updated Business Priorities preview for ${(state.activeCase && state.activeCase.company_name) || "selected company"}`,
          businessPromptLogText(
            state.business,
            "Refresh the Business Priorities preview and regenerate the executive narrative from current page data."
          )
        ).catch(() => null);
        state.businessProcessing = "";
        setMessage("Business Priorities and Private Equity analysis refreshed and saved.");
        render();
      }
      if (action === "generate-report") {
        state.business = readBusinessForm();
        state.businessProcessing = "Preparing report context in stages...";
        await runBusinessAnalysisStages({ force: true, save: true, lookupTimeoutMs: 15000, refreshCases: false });
        logPromptEntry(
          "Business Priorities",
          `Generated Business Priorities report for ${(state.activeCase && state.activeCase.company_name) || "selected company"}`,
          businessPromptLogText(
            state.business,
            "Generate a downloadable Business Priorities report from refreshed company profile, financial, peer, research and narrative data."
          )
        ).catch(() => null);
        await downloadBusinessReport();
        state.businessProcessing = "";
        setMessage("Business Priorities report generated.");
        render();
      }
      if (action === "add-row") {
        state.business = readBusinessForm();
        const collection = button.dataset.collection;
        state.business[collection] = state.business[collection] || [];
        state.business[collection].push({ ...emptyRows[collection] });
        render();
      }
      if (action === "remove-row") {
        state.business = readBusinessForm();
        const collection = button.dataset.collection;
        const index = Number(button.dataset.index);
        state.business[collection].splice(index, 1);
        render();
      }
      if (action === "admin-tab") {
        state.adminTab = button.dataset.tab;
        if (state.adminTab === "usage" && !state.adminUsage) await loadAdminUsage();
        render();
      }
      if (action === "refresh-admin-usage") {
        await loadAdminUsage();
        setMessage("Usage statistics refreshed.");
        render();
      }
      if (action === "save-smtp-settings") {
        await saveSmtpSettings(false);
      }
      if (action === "test-smtp-settings") {
        await saveSmtpSettings(true);
      }
      if (action === "admin-save-row") {
        await saveAdminRow(button.closest("[data-admin-row]"));
      }
    } catch (error) {
      state.businessProcessing = "";
      state.smtpBusy = "";
      setError(error);
      render();
    }
  });

  app.addEventListener("input", (event) => {
    const input = event.target.closest("[data-input='companyName']");
    if (!input) return;
    handleCompanyInput(input.value);
  });

  app.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-input='annualReportUpload']");
    if (!input) return;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      await uploadAnnualReport(file);
    } catch (error) {
      state.businessProcessing = "";
      setError(error);
      render();
    } finally {
      input.value = "";
    }
  });

  app.addEventListener("toggle", (event) => {
    const details = event.target.closest("[data-financial-table-toggle]");
    if (!details) return;
    state.financialTableOpen = details.open;
  }, true);

  boot();
})();
