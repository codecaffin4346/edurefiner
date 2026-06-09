export const CHIPS = [
  "Photosynthesis",
  "Newton's Laws of Motion",
  "DNA Replication",
  "Recursion in CS",
  "The Water Cycle",
  "Ohm's Law"
];

export const PIPELINE_STEPS = [
  { id: "api", label: "Connect API" },
  { id: "gen", label: "Analyze & Gen Text" },
  { id: "svg", label: "Design SVG" },
  { id: "fmt", label: "Format output" }
];

export const PROVIDERS = {
  github: {
    name: "GitHub Models",
    url: "https://models.inference.ai.azure.com/chat/completions",
    models: [
      { id: "gpt-4o", label: "GPT-4o (Premium)" },
      { id: "gpt-4o-mini", label: "GPT-4o-mini (Fast)" }
    ],
    defaultModel: "gpt-4o",
    tokenPlaceholder: "github_pat_...",
    localStorageKey: "edu_github_token",
    envKey: "VITE_GITHUB_TOKEN"
  },
  sambanova: {
    name: "SambaNova Cloud",
    url: "https://api.sambanova.ai/v1/chat/completions",
    models: [
      { id: "Meta-Llama-3.3-70B-Instruct", label: "Llama 3.3 70B (Ultra Fast)" },
      { id: "Meta-Llama-3.1-70B-Instruct", label: "Llama 3.1 70B" },
      { id: "Meta-Llama-3.1-405B-Instruct", label: "Llama 3.1 405B (High Quality)" },
      { id: "Qwen2.5-72B-Instruct", label: "Qwen 2.5 72B" }
    ],
    defaultModel: "Meta-Llama-3.3-70B-Instruct",
    tokenPlaceholder: "SambaNova API Key...",
    localStorageKey: "edu_sambanova_token",
    envKey: "VITE_SAMBANOVA_TOKEN"
  }
};

const makeSystemPrompt = (length = "long") => {
  const explanationStyle = length === "short"
    ? "A short, concise summary (1-2 paragraphs) of the topic. Align with the NCERT syllabus standard (6th to 12th Grade level). Clear, supportive, and direct."
    : "A comprehensive, deep-dive educational guide. Write in the supportive, engaging tone of an expert AI Tutor. Align explanations with NCERT syllabus guidelines (6th to 12th Grade level) and other standard curriculum frameworks. Use '###' for subheadings. Start with an intuitive introduction, go step-by-step, define key terminology, and provide real-world analogies/examples.";

  const counts = length === "short"
    ? { key_points: "3-5 items", facts: "exactly 3 facts", notes: "max 3 bullet points" }
    : { key_points: "5-10 items", facts: "exactly 5 facts", notes: "max 5 bullet points" };

  return `You are an expert AI Tutor acting simultaneously as a Curriculum Designer (specialized in standard school K-12/NCERT syllabus), Educational Content Creator, Visual Learning Expert, and Resource Curator.

Given a student query, generate a comprehensive educational package.
Return ONLY valid JSON. No markdown code fences, no extra text outside the JSON.

{
  "subject": "e.g., Biology, Physics, Computer Science",
  "topic": "The title of the topic",
  "education_level": "Recommended level (e.g., 6th Standard, 9th Standard, 11th Standard)",
  "explanation": "${explanationStyle}",
  "key_learning_points": ["${counts.key_points} containing standard curriculum core concepts"],
  "important_facts": ["${counts.facts}"],
  "real_world_applications": [{"category":"Daily Life|Technology|Science|Industry|Healthcare|Business","description":"How it applies"}],
  "image_prompt": "A detailed, descriptive text-to-image prompt (optimized for Stable Diffusion) that describes a textbook-style educational illustration representing this topic. It MUST specify the style of an Indian NCERT (National Council of Educational Research and Training) textbook diagram (specifically Class 6 to 12 Science/Social Science), utilizing simple colored graphics, clean layout, and clear shapes. The prompt should detail the colors, arrangement, and main subjects. Do NOT ask for labels or written text in the image as AI generators struggle with text rendering, but focus on schematic visual accuracy.",
  "practice_questions": {"easy":["2 questions matching school exam format"],"medium":["2 questions"],"advanced":["1 question"]},
  "youtube_queries": ["2-3 optimized search strings to find video lectures aligned with school syllabus"],
  "resource_queries": {"khan_academy":"search query","wikipedia":"search query","britannica":"search query"},
  "learning_roadmap": {"prerequisites":["pre-requisite topics in school syllabus"],"current_topic":"this topic","next_topics":["next logical topics in school syllabus"]},
  "revision_notes": ["${counts.notes}"],
  "revision_summary": "A 1-2 line quick review summary suitable for revision"
}

Verify the JSON is perfectly valid and matches the scheme. Return ONLY raw JSON text.`;
};

const SVG_PROMPT = `You are an expert educational diagram creator. Generate a complete, self-contained SVG diagram for the given topic.

Rules:
- Return ONLY the raw SVG code starting with <svg and ending with </svg>
- No markdown, no code fences, no explanation text
- Use viewBox="0 0 800 500" with width="100%" height="100%"
- Background: Use a clean dark background matching modern UIs (use #1E293B for background). Use a dark background fill for the SVG rect.
- Use clean sans-serif fonts (Arial, system-ui, Outfit)
- Diagrams must be tailored for school students of 6th to 12th standard (textbook-quality, clear, intuitive, and not overly complex).
- Flowcharts and process diagrams must be properly aligned and formatted:
  - Place flowchart steps/nodes inside clean, rounded boxes (<rect rx="8" ry="8">) with subtle borders and clear padding.
  - Align boxes horizontally or vertically in a neat grid or linear timeline with equal spacing.
  - Connect sequential nodes using straight or right-angled connecting lines or arrows (<path> or <line> with marker-end arrowheads). Avoid overlapping lines or text.
  - Use clear text annotations and labels (minimum 14px font size). Ensure text does not overflow box borders.
- Use educational color coding:
  - Blues (#3B82F6, #60A5FA) for cold, water, info
  - Greens (#10B981, #34D399) for biology, positive, organic
  - Yellows/Oranges (#F59E0B, #FBBF24) for energy, light, chemical reactions
  - Reds (#EF4444) for highlights, heat, labels
  - Grays/Borders (#475569, #94A3B8) for structures, text
- Make it textbook-quality and scientifically accurate
- Include a title at the top
- Use proper SVG grouping (<g>) and transforms for a clean layout.`;

const REFINE_PROMPT = `You are an expert AI Tutor. You are helping a student refine a previously generated educational package.
You will be provided with the original package JSON and the student's request for refinement (e.g. "Explain it like I am 5", "Translate the explanation to French", "Include a code example", "Make it simpler").

Your task is to modify the educational package JSON based on this feedback. 
Specifically:
- Update the "explanation" field to match the student's request, acting as an AI Tutor with K-12/NCERT curriculum alignment.
- Keep the explanation and learning roadmap standard suited for 6th to 12th standard.
- Update other fields like "revision_summary", "key_learning_points", "practice_questions", or "revision_notes" to align with the refined explanation level.
- Keep the overall structure of the JSON exactly the same.
- Return ONLY the updated JSON. No markdown fences, no conversational text.`;

async function fetchFromLLM(provider, apiKey, systemContent, userContent, jsonMode = false, model) {
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  const body = {
    model: model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent }
    ],
    temperature: 0.3,
    max_tokens: 4096
  };

  // GitHub Models supports response_format for GPT models
  if (jsonMode && provider === "github" && model.includes("gpt")) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(providerConfig.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorDetails = await response.json().catch(() => ({}));
    throw new Error(errorDetails?.error?.message || `${providerConfig.name} API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

export async function generateContent(provider, apiKey, query, length = "long", model) {
  const systemPrompt = makeSystemPrompt(length);
  const userPrompt = `Student question: "${query}"\n\nReturn ONLY the JSON object.`;
  
  const rawResponse = await fetchFromLLM(provider, apiKey, systemPrompt, userPrompt, true, model);
  
  // Clean potential markdown code blocks
  let clean = rawResponse.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  }
  
  const startIndex = clean.indexOf("{");
  const endIndex = clean.lastIndexOf("}");
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error("API did not return a valid JSON object. Raw response was: " + rawResponse.slice(0, 100));
  }
  
  const jsonString = clean.slice(startIndex, endIndex + 1);
  return JSON.parse(jsonString);
}

export async function generateSVG(provider, apiKey, topic, imagePrompt, model) {
  const userPrompt = `Create an educational SVG diagram for: "${topic}"\n\nDiagram details needed: ${imagePrompt}\n\nReturn ONLY the <svg>...</svg> code. Do not include markdown blocks or any other explanation.`;
  
  const rawResponse = await fetchFromLLM(provider, apiKey, SVG_PROMPT, userPrompt, false, model);
  
  let svg = rawResponse.trim();
  if (svg.startsWith("```")) {
    svg = svg.replace(/^```xml\s*/i, "").replace(/^```html\s*/i, "").replace(/^```svg\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
  }
  
  const svgStart = svg.indexOf("<svg");
  const svgEnd = svg.lastIndexOf("</svg>");
  
  if (svgStart !== -1 && svgEnd !== -1) {
    svg = svg.slice(svgStart, svgEnd + 6);
  }
  
  if (!svg.startsWith("<svg")) {
    throw new Error("No valid SVG code generated by the API.");
  }
  
  return svg;
}

export async function refineContent(provider, apiKey, originalData, query, refinementInstruction, model) {
  const userPrompt = `Original Package JSON:\n${JSON.stringify(originalData, null, 2)}\n\nUser request: "${query}"\nRefinement feedback: "${refinementInstruction}"\n\nReturn the updated JSON.`;
  
  const rawResponse = await fetchFromLLM(provider, apiKey, REFINE_PROMPT, userPrompt, true, model);
  
  let clean = rawResponse.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  }
  
  const startIndex = clean.indexOf("{");
  const endIndex = clean.lastIndexOf("}");
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Failed to parse refined content. Model returned invalid JSON structure.");
  }
  
  const jsonString = clean.slice(startIndex, endIndex + 1);
  return JSON.parse(jsonString);
}

export async function fetchWikiDiagrams(topic) {
  try {
    const query = encodeURIComponent(`${topic} diagram`);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&origin=*&gsrlimit=12`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const pages = data.query?.pages || {};
    
    return Object.values(pages)
      .map(p => {
        const info = p.imageinfo?.[0];
        return {
          id: p.pageid,
          title: p.title.replace(/^File:/, "").replace(/\.[a-zA-Z0-9]+$/, "").replace(/_/g, " "),
          url: info?.url,
          descriptionUrl: info?.descriptionurl,
        };
      })
      .filter(r => r.url && (
        r.url.endsWith(".svg") || 
        r.url.endsWith(".png") || 
        r.url.endsWith(".jpg") || 
        r.url.endsWith(".jpeg")
      ));
  } catch (err) {
    console.error("Wikimedia Commons search failed:", err);
    return [];
  }
}
