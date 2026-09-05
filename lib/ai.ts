// lib/ai.ts — AI threat summarization via Groq (OpenAI-compatible, free tier)
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// Groq free-tier models (Aug 2026) — fallback chain for resilience
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
];

export interface AISummary {
  summary: string;
  category: ThreatCategory;
  urgency: "critical" | "high" | "medium" | "low";
}

export type ThreatCategory =
  | "ransomware"
  | "phishing"
  | "apt"
  | "zero-day"
  | "data-breach"
  | "malware"
  | "vulnerability"
  | "supply-chain"
  | "compliance"
  | "general";

const CATEGORY_LABELS: Record<ThreatCategory, string> = {
  ransomware: "Ransomware",
  phishing: "Phishing",
  apt: "APT / Nation-State",
  "zero-day": "Zero-Day",
  "data-breach": "Data Breach",
  malware: "Malware",
  vulnerability: "Vulnerability",
  "supply-chain": "Supply Chain",
  compliance: "Compliance",
  general: "General",
};

const CATEGORY_COLORS: Record<ThreatCategory, string> = {
  ransomware: "bg-red-500/15 text-red-400 border-red-500/30",
  phishing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  apt: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "zero-day": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "data-breach": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  malware: "bg-red-500/15 text-red-400 border-red-500/30",
  vulnerability: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "supply-chain": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  compliance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  general: "bg-gray-600/15 text-gray-400 border-gray-600/30",
};

export function getCategoryLabel(cat: ThreatCategory): string {
  return CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
}

export function getCategoryColor(cat: ThreatCategory): string {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
}

export async function summarizeArticle(
  title: string,
  snippet: string,
  source: string
): Promise<AISummary | null> {
  if (!GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set, skipping AI summarization");
    return null;
  }

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODELS[0],
        messages: [
          {
            role: "system",
            content: `You are a cybersecurity threat analyst. Analyze news articles and provide:
1. A concise 1-2 sentence summary focusing on the threat impact
2. A threat category classification
3. An urgency level

Respond ONLY with valid JSON in this exact format:
{"summary": "your summary here", "category": "ransomware|phishing|apt|zero-day|data-breach|malware|vulnerability|supply-chain|compliance|general", "urgency": "critical|high|medium|low"}

Categories:
- ransomware: Ransomware attacks, extortion
- phishing: Phishing campaigns, social engineering
- apt: Advanced persistent threats, nation-state actors
- zero-day: Zero-day vulnerabilities, unpatched exploits
- data-breach: Data breaches, leaks, exposures
- malware: Malware, trojans, worms, botnets
- vulnerability: CVEs, software vulnerabilities
- supply-chain: Supply chain attacks, dependency issues
- compliance: Regulatory, compliance, legal
- general: General cybersecurity news

Urgency:
- critical: Active exploitation, immediate action needed
- high: Significant threat, patch/mitigate soon
- medium: Moderate threat, monitor and plan
- low: Informational, awareness only`,
          },
          {
            role: "user",
            content: `Analyze this cybersecurity news article:

Title: ${title}
Source: ${source}
Content: ${snippet}

Provide your analysis as JSON.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    const parsed = JSON.parse(content);

    const validCategories: ThreatCategory[] = [
      "ransomware", "phishing", "apt", "zero-day", "data-breach",
      "malware", "vulnerability", "supply-chain", "compliance", "general",
    ];
    const validUrgencies = ["critical", "high", "medium", "low"];

    return {
      summary: parsed.summary || snippet.substring(0, 150),
      category: validCategories.includes(parsed.category) ? parsed.category : "general",
      urgency: validUrgencies.includes(parsed.urgency) ? parsed.urgency : "medium",
    };
  } catch (error) {
    console.error("AI summarization error:", error);
    return null;
  }
}

export async function summarizeBatch(
  articles: { title: string; snippet: string; source: string }[],
  maxBatch: number = 10
): Promise<Map<number, AISummary>> {
  const results = new Map<number, AISummary>();

  for (let i = 0; i < Math.min(articles.length, maxBatch); i++) {
    const article = articles[i];
    const summary = await summarizeArticle(article.title, article.snippet, article.source);
    if (summary) {
      results.set(i, summary);
    }
    if (i < articles.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
