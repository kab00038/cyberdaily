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
  ransomware: "bg-red-500/20 text-red-400 border-red-500/30",
  phishing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  apt: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "zero-day": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "data-breach": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  malware: "bg-red-500/20 text-red-400 border-red-500/30",
  vulnerability: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "supply-chain": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  compliance: "bg-green-500/20 text-green-400 border-green-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
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
        model: GROQ_MODELS[0], // gpt-oss-120b (primary)
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

    // Parse JSON response
    const parsed = JSON.parse(content);

    // Validate
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

// Batch summarize with rate limiting (stay within Groq's free tier)
export async function summarizeBatch(
  articles: { title: string; snippet: string; source: string }[],
  maxBatch: number = 10
): Promise<Map<number, AISummary>> {
  const results = new Map<number, AISummary>();

  // Process in small batches to respect rate limits
  for (let i = 0; i < Math.min(articles.length, maxBatch); i++) {
    const article = articles[i];
    const summary = await summarizeArticle(article.title, article.snippet, article.source);
    if (summary) {
      results.set(i, summary);
    }
    // Small delay between requests
    if (i < articles.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
