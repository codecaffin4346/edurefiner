import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Key, 
  BookOpen, 
  HelpCircle, 
  Globe, 
  Youtube, 
  Compass, 
  Send, 
  History, 
  Loader2, 
  AlertCircle, 
  FileText, 
  ChevronRight,
  ListTodo,
  ExternalLink,
  RefreshCw,
  Image
} from "lucide-react";
import { CHIPS, PIPELINE_STEPS, PROVIDERS, generateContent, generateSVG, refineContent } from "./utils/ai";
import InteractiveSvg from "./components/InteractiveSvg";

export default function App() {
  const [provider, setProvider] = useState("github");
  const [githubKey, setGithubKey] = useState(import.meta.env.VITE_GITHUB_TOKEN || "");
  const [sambanovaKey, setSambanovaKey] = useState(import.meta.env.VITE_SAMBANOVA_TOKEN || "");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("gpt-4o");
  const [query, setQuery] = useState("");
  const [lengthMode, setLengthMode] = useState("long"); // "short" or "long"
  
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [pipelineState, setPipelineState] = useState({});
  const [error, setError] = useState("");
  
  // Results
  const [data, setData] = useState(null);
  const [svgDiagram, setSvgDiagram] = useState(null);
  const [generatedImage, setGeneratedImage] = useState("");
  const [imageSeed, setImageSeed] = useState(12345);
  const [imageLoading, setImageLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Refinement Follow-up
  const [refinePrompt, setRefinePrompt] = useState("");
  const [activeTab, setActiveTab] = useState("concept"); // "concept" | "diagram" | "test" | "roadmap"

  const inputRef = useRef(null);

  const activeKey = provider === "github" ? githubKey : sambanovaKey;

  // Load configuration and history on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("edu_provider");
    if (savedProvider && PROVIDERS[savedProvider]) {
      setProvider(savedProvider);
      setModel(PROVIDERS[savedProvider].defaultModel);
    }

    const savedGithubKey = localStorage.getItem("edu_github_token");
    if (savedGithubKey) setGithubKey(savedGithubKey);

    const savedSambaKey = localStorage.getItem("edu_sambanova_token");
    if (savedSambaKey) setSambanovaKey(savedSambaKey);

    const savedHistory = localStorage.getItem("edu_query_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse query history", e);
      }
    }
  }, []);

  const saveApiKey = (key) => {
    if (provider === "github") {
      setGithubKey(key);
      localStorage.setItem("edu_github_token", key);
    } else {
      setSambanovaKey(key);
      localStorage.setItem("edu_sambanova_token", key);
    }
  };

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    localStorage.setItem("edu_provider", newProvider);
    setModel(PROVIDERS[newProvider].defaultModel);
  };

  const updatePipelineState = (stepId, status) => {
    setPipelineState(prev => ({ ...prev, [stepId]: status }));
  };

  const addToHistory = (topic, subject) => {
    const newItem = { topic, subject, timestamp: new Date().toLocaleTimeString() };
    const updatedHistory = [newItem, ...history.filter(h => h.topic !== topic)].slice(0, 8);
    setHistory(updatedHistory);
    localStorage.setItem("edu_query_history", JSON.stringify(updatedHistory));
  };

  const handleRun = async (overrideQuery = "") => {
    const activeQuery = overrideQuery || query.trim();
    if (!activeQuery) return;
    if (!activeKey) {
      setError(`Please add a valid API key in the settings sidebar to connect to ${PROVIDERS[provider].name}.`);
      return;
    }

    setLoading(true);
    setError("");
    setData(null);
    setSvgDiagram(null);
    setGeneratedImage("");
    setPipelineState({});
    setStatusMsg(`Establishing connection to ${PROVIDERS[provider].name}...`);

    try {
      // Step 1: Connect API
      updatePipelineState("api", "active");
      await new Promise(r => setTimeout(r, 400));
      updatePipelineState("api", "done");

      // Step 2: Content Gen
      updatePipelineState("gen", "active");
      setStatusMsg(`Analyzing query & generating ${lengthMode === "short" ? "short summary" : "detailed study guide"}...`);
      const responseData = await generateContent(provider, activeKey, activeQuery, lengthMode, model);
      setData(responseData);
      
      // Generate AI Illustration URL
      if (responseData.image_prompt) {
        const newSeed = Math.floor(Math.random() * 1000000);
        setImageSeed(newSeed);
        setImageLoading(true);
        setGeneratedImage(`https://image.pollinations.ai/prompt/${encodeURIComponent(responseData.image_prompt)}?width=800&height=500&nologo=true&seed=${newSeed}`);
      } else {
        setGeneratedImage("");
      }
      updatePipelineState("gen", "done");

      // Step 3: SVG Design
      updatePipelineState("svg", "active");
      setStatusMsg("Designing custom educational SVG diagram...");
      
      let svgCode = null;
      try {
        svgCode = await generateSVG(provider, activeKey, responseData.topic, responseData.image_prompt, model);
        setSvgDiagram(svgCode);
        updatePipelineState("svg", "done");
      } catch (svgErr) {
        console.warn("SVG diagram failed to generate:", svgErr);
        updatePipelineState("svg", "err");
      }

      // Step 4: Formatting
      updatePipelineState("fmt", "active");
      setStatusMsg("Formatting and compiling resources...");
      await new Promise(r => setTimeout(r, 300));
      updatePipelineState("fmt", "done");
      setStatusMsg("Ready!");

      addToHistory(responseData.topic, responseData.subject);
      setActiveTab("concept");
    } catch (err) {
      setError(err.message || "An unexpected error occurred during generation.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    const instruction = refinePrompt.trim();
    if (!instruction || !data) return;

    setRefining(true);
    setError("");
    try {
      setStatusMsg("Refining content according to instruction...");
      const refinedData = await refineContent(provider, activeKey, data, query, instruction, model);
      setData(refinedData);
      if (refinedData.image_prompt) {
        const newSeed = Math.floor(Math.random() * 1000000);
        setImageSeed(newSeed);
        setImageLoading(true);
        setGeneratedImage(`https://image.pollinations.ai/prompt/${encodeURIComponent(refinedData.image_prompt)}?width=800&height=500&nologo=true&seed=${newSeed}`);
      }
      setRefinePrompt("");
    } catch (err) {
      setError(`Refinement failed: ${err.message}`);
    } finally {
      setRefining(false);
    }
  };

  // Web search helpers
  const getResourceUrl = (site, term) => {
    const encoded = encodeURIComponent(term || "");
    switch (site) {
      case "khan_academy": return `https://www.khanacademy.org/search?page_search_query=${encoded}`;
      case "wikipedia": return `https://en.wikipedia.org/wiki/Special:Search?search=${encoded}`;
      case "britannica": return `https://www.britannica.com/search?query=${encoded}`;
      case "youtube": return `https://www.youtube.com/results?search_query=${encoded}`;
      default: return "#";
    }
  };

  // Convert custom markdown syntax in LLM content to basic safe HTML
  const formatMarkdownToHtml = (text) => {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/### (.+)/g, "<h3>$1</h3>")
      .replace(/## (.+)/g, "<h2>$1</h2>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\`(.+?)\`/g, "<code>$1</code>")
      .replace(/\n- (.+)/g, "\n<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n\n/g, "</p><p>")
      .replace(/^([^<].+)/gm, m => m.trim() && !m.startsWith("<") ? `<p>${m}</p>` : m);
  };

  const pipelineColor = (status) => {
    if (status === "active") return "var(--primary)";
    if (status === "done") return "var(--secondary)";
    if (status === "err") return "var(--danger)";
    return "var(--text-muted)";
  };

  return (
    <div className="app-container">
      {/* ── Left Sidebar Settings Panel ── */}
      <aside className="sidebar">
        <div className="brand-container">
          <Sparkles size={28} style={{ color: "var(--primary)" }} />
          <h1 className="brand-logo">EduRefiner</h1>
        </div>

        {/* API Credentials */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#FFF" }}>
            <Key size={16} />
            <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>API Configuration</h2>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
            Configure model provider and API key directly.
          </p>

          <div className="input-group">
            <label className="input-label" htmlFor="provider-select">Model Provider</label>
            <select
              id="provider-select"
              value={provider}
              onChange={e => handleProviderChange(e.target.value)}
              className="input-control"
              style={{ width: "100%", background: "#1F2937" }}
            >
              <option value="github">GitHub Models</option>
              <option value="sambanova">SambaNova Cloud</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="token-input">
              {provider === "github" ? "GitHub Personal Access Token" : "SambaNova API Key"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="token-input"
                type={showKey ? "text" : "password"}
                value={activeKey}
                onChange={e => saveApiKey(e.target.value)}
                placeholder={PROVIDERS[provider].tokenPlaceholder}
                className="input-control"
                style={{ width: "100%", paddingRight: "2.5rem" }}
              />
              <button 
                type="button" 
                onClick={() => setShowKey(!showKey)} 
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                {showKey ? "🔒" : "👁"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: activeKey.length > 8 ? "var(--secondary)" : "var(--text-muted)", display: "inline-block" }} />
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {activeKey.length > 8 ? "Token active locally" : "Token required"}
              </span>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="model-select">Target Model</label>
            <select
              id="model-select"
              value={model}
              onChange={e => setModel(e.target.value)}
              className="input-control"
              style={{ width: "100%", background: "#1F2937" }}
            >
              {PROVIDERS[provider].models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

        {/* Refinement Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#FFF", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={16} /> Content Settings
          </h2>
          
          <div className="input-group">
            <label className="input-label">Output Length Refinement</label>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "4px" }}>
              <button 
                onClick={() => setLengthMode("short")}
                className={`btn ${lengthMode === "short" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, padding: "0.5rem 0.25rem", fontSize: "0.8rem", borderRadius: "8px" }}
              >
                Short Summary
              </button>
              <button 
                onClick={() => setLengthMode("long")}
                className={`btn ${lengthMode === "long" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, padding: "0.5rem 0.25rem", fontSize: "0.8rem", borderRadius: "8px" }}
              >
                Detailed Guide
              </button>
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

        {/* Query History */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.85rem", overflow: "hidden" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#FFF", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <History size={16} /> Recent Queries
          </h2>
          
          {history.length === 0 ? (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>No recent queries yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto", paddingRight: "4px" }}>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(h.topic);
                    handleRun(h.topic);
                  }}
                  className="btn btn-secondary"
                  style={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    padding: "0.6rem 0.8rem",
                    fontSize: "0.8rem",
                    borderRadius: "8px",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  title={h.topic}
                >
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{h.topic}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{h.subject}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main View Content ── */}
      <main className="main-content">
        {/* Top bar search container */}
        <div style={{ padding: "2rem 2.5rem 1.5rem", borderBottom: "1px solid var(--border-color)", background: "rgba(11, 15, 25, 0.8)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", gap: "0.75rem", background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-full)", padding: "6px 6px 6px 1.5rem", alignItems: "center", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)" }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && handleRun()}
                placeholder="What is photosynthesis? / How does recursion work?"
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "inherit", fontSize: "1rem", color: "#FFF" }}
                disabled={loading}
              />
              <button 
                onClick={() => handleRun()} 
                disabled={loading || !query.trim()} 
                className="btn btn-primary"
                style={{ borderRadius: "var(--radius-full)", padding: "0.6rem 1.75rem", fontSize: "0.9rem" }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Generate"}
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
              {CHIPS.map(c => (
                <button
                  key={c}
                  onClick={() => { setQuery(c); handleRun(c); }}
                  className="btn btn-secondary"
                  disabled={loading}
                  style={{ padding: "0.35rem 0.85rem", fontSize: "0.75rem", borderRadius: "50px", background: "rgba(255, 255, 255, 0.03)" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Central Display Area */}
        <div style={{ flex: 1, padding: "2rem 2.5rem 6rem", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
          
          {/* Pipeline Tracker */}
          {(loading || data) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", alignItems: "center", marginBottom: "2rem" }}>
              {PIPELINE_STEPS.map((step, idx) => {
                const stepStatus = pipelineState[step.id];
                return (
                  <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ 
                      background: stepStatus === "active" ? "rgba(99, 102, 241, 0.1)" : stepStatus === "done" ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.02)", 
                      border: `1px solid ${pipelineColor(stepStatus)}`, 
                      borderRadius: "6px", 
                      padding: "4px 12px", 
                      fontSize: "0.75rem", 
                      color: pipelineColor(stepStatus), 
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      {stepStatus === "active" && <Loader2 size={10} className="animate-spin" />}
                      {step.label}
                    </div>
                    {idx < PIPELINE_STEPS.length - 1 && <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ display: "flex", gap: "0.85rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "2rem", color: "#FCA5A5", fontSize: "0.9rem" }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: "block", marginBottom: "0.25rem", color: "#FFF" }}>Generation Stopped</strong>
                {error}
              </div>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <span className="skeleton" style={{ width: "80px", height: "24px", borderRadius: "50px" }} />
                <span className="skeleton" style={{ width: "100px", height: "24px", borderRadius: "50px" }} />
              </div>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" style={{ width: "95%" }} />
              <div className="skeleton skeleton-text" style={{ width: "90%" }} />
              <div className="skeleton skeleton-text" style={{ width: "85%" }} />
              <div className="skeleton skeleton-rect" style={{ margin: "1.5rem 0", borderRadius: "var(--radius-md)" }} />
              <div className="skeleton skeleton-text" style={{ width: "95%" }} />
              <div className="skeleton skeleton-text" style={{ width: "90%" }} />
            </div>
          )}

          {/* Refinement Loader Backdrop */}
          {refining && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "4rem 0", color: "var(--primary)" }}>
              <Loader2 size={36} className="animate-spin" />
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>Updating your explanation...</div>
            </div>
          )}

          {/* Generated Result Container */}
          {data && !loading && !refining && (
            <article>
              {/* Header */}
              <header style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
                  <span style={{ fontSize: "0.75rem", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "var(--radius-full)", padding: "3px 12px", fontWeight: 600 }}>
                    {data.subject}
                  </span>
                  <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--secondary)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-full)", padding: "3px 12px", fontWeight: 600 }}>
                    {data.education_level}
                  </span>
                </div>
                <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#FFF", marginBottom: "1rem", lineHeight: "1.2", letterSpacing: "-0.03em" }}>{data.topic}</h1>
                {data.revision_summary && (
                  <p style={{ fontStyle: "italic", borderLeft: "3px solid var(--primary)", paddingLeft: "1rem", color: "var(--text-secondary)", fontSize: "1.05rem" }}>
                    "{data.revision_summary}"
                  </p>
                )}
              </header>

              {/* Navigation Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "2rem", gap: "1rem", overflowX: "auto" }}>
                {[
                  { id: "concept", label: "Core Concept", icon: <BookOpen size={16} /> },
                  { id: "diagram", label: "Interactive Diagram", icon: <Globe size={16} /> },
                  { id: "illustration", label: "AI Illustration", icon: <Image size={16} /> },
                  { id: "roadmap", label: "Roadmap & Application", icon: <Compass size={16} /> },
                  { id: "test", label: "Practice & Review", icon: <HelpCircle size={16} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="btn"
                    style={{
                      background: "none",
                      border: "none",
                      color: activeTab === tab.id ? "var(--primary)" : "var(--text-secondary)",
                      borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                      borderRadius: 0,
                      padding: "0.75rem 0.5rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "none"
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Panels */}
              <div style={{ minHeight: "300px" }}>
                
                {/* 1. Core Concept */}
                {activeTab === "concept" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    <div className="prose" dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(data.explanation) }} />
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
                      <div className="glass-card">
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#FFF", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <ListTodo size={16} style={{ color: "var(--primary)" }} /> What You Need To Know
                        </h3>
                        <ul style={{ paddingLeft: "1.25rem", color: "var(--text-secondary)", fontSize: "0.925rem" }}>
                          {(data.key_learning_points || []).map((point, idx) => (
                            <li key={idx} style={{ marginBottom: "0.5rem" }}>{point}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="glass-card">
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#FFF", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Sparkles size={16} style={{ color: "var(--accent)" }} /> Important Facts
                        </h3>
                        <ol style={{ paddingLeft: "1.25rem", color: "var(--text-secondary)", fontSize: "0.925rem" }}>
                          {(data.important_facts || []).map((fact, idx) => (
                            <li key={idx} style={{ marginBottom: "0.5rem" }}>{fact}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SVG Diagram */}
                {activeTab === "diagram" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                     {svgDiagram ? (
                       <InteractiveSvg svgContent={svgDiagram} topic={data.topic} />
                     ) : (
                       <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "4rem 2rem", textAlign: "center" }}>
                         <div style={{ fontSize: "2rem" }}>🖼</div>
                         <h3 style={{ fontSize: "1.1rem", color: "#FFF" }}>Diagram Not Available</h3>
                         <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Diagram creation failed or was skipped during execution.</p>
                       </div>
                     )}
                  </div>
                )}

                {/* 3. AI Illustration */}
                {activeTab === "illustration" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {generatedImage ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div className="glass-card" style={{ position: "relative", overflow: "hidden", minHeight: "350px", display: "flex", alignItems: "center", justifyContent: "center", background: "#111827", borderRadius: "var(--radius-md)" }}>
                          {imageLoading && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(17, 24, 39, 0.8)", zIndex: 5, gap: "1rem" }}>
                              <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary)" }} />
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Drawing illustration from prompt...</span>
                            </div>
                          )}
                          <img 
                            src={generatedImage} 
                            alt={data.topic} 
                            onLoad={() => setImageLoading(false)}
                            onError={() => setImageLoading(false)}
                            style={{ maxWidth: "100%", maxHeight: "500px", objectFit: "contain", display: "block", borderRadius: "6px" }}
                          />
                        </div>
                        
                        {/* Controls and Prompt Display */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                            <button 
                              onClick={() => {
                                const newSeed = Math.floor(Math.random() * 1000000);
                                setImageSeed(newSeed);
                                setImageLoading(true);
                                setGeneratedImage(`https://image.pollinations.ai/prompt/${encodeURIComponent(data.image_prompt)}?width=800&height=500&nologo=true&seed=${newSeed}`);
                              }}
                              className="btn btn-secondary"
                              style={{ fontSize: "0.85rem", padding: "0.6rem 1.25rem", borderRadius: "8px" }}
                            >
                              <RefreshCw size={14} /> Regenerate Variation
                            </button>
                            <a 
                              href={generatedImage} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="btn btn-secondary"
                              style={{ fontSize: "0.85rem", padding: "0.6rem 1.25rem", borderRadius: "8px", textDecoration: "none" }}
                            >
                              <ExternalLink size={14} /> Open in New Tab
                            </a>
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(generatedImage);
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${data.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-illustration.jpg`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error("Failed to download image:", err);
                                  window.open(generatedImage, "_blank");
                                }
                              }}
                              className="btn btn-primary"
                              style={{ fontSize: "0.85rem", padding: "0.6rem 1.25rem", borderRadius: "8px" }}
                            >
                              📥 Download Illustration
                            </button>
                          </div>

                          {/* Prompt detail */}
                          <div className="glass-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                            <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#FFF", marginBottom: "0.5rem" }}>AI Illustration Prompt</h4>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: "1.5" }}>
                              "{data.image_prompt}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "4rem 2rem", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem" }}>🖼</div>
                        <h3 style={{ fontSize: "1.1rem", color: "#FFF" }}>Illustration Not Available</h3>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>No image prompt was generated for this topic.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Real World & Learning Roadmap */}
                {activeTab === "roadmap" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
                    {/* Real World Cards */}
                    <div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#FFF", marginBottom: "1rem" }}>Real-World Relevance</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                        {(data.real_world_applications || []).map((app, idx) => (
                          <div key={idx} className="glass-card" style={{ height: "100%" }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
                              {app.category}
                            </span>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>{app.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Learning Roadmap Nodes */}
                    {data.learning_roadmap && (
                      <div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#FFF", marginBottom: "1.25rem" }}>Structured Learning Roadmap</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {[
                            { label: "Prerequisites", items: data.learning_roadmap.prerequisites || [], badgeBg: "rgba(239, 68, 68, 0.1)", badgeBorder: "rgba(239, 68, 68, 0.2)", badgeColor: "var(--danger)" },
                            { label: "Current Core", items: [data.learning_roadmap.current_topic || data.topic], badgeBg: "rgba(99, 102, 241, 0.15)", badgeBorder: "rgba(99, 102, 241, 0.3)", badgeColor: "var(--primary)" },
                            { label: "Next Milestones", items: data.learning_roadmap.next_topics || [], badgeBg: "rgba(16, 185, 129, 0.1)", badgeBorder: "rgba(16, 185, 129, 0.2)", badgeColor: "var(--secondary)" }
                          ].map((node, nIdx) => (
                            <div key={nIdx} className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", padding: "1rem 1.5rem" }}>
                              <div style={{ width: "120px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>{node.label}</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {node.items.length === 0 ? (
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>None needed</span>
                                ) : (
                                  node.items.map((item, iIdx) => (
                                    <span key={iIdx} style={{
                                      background: node.badgeBg,
                                      border: `1px solid ${node.badgeBorder}`,
                                      color: node.badgeColor,
                                      fontSize: "0.75rem",
                                      padding: "3px 12px",
                                      borderRadius: "50px",
                                      fontWeight: 500
                                    }}>
                                      {item}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Self-Test & Review */}
                {activeTab === "test" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    
                    {/* Yellow callout for revision notes */}
                    {data.revision_notes && data.revision_notes.length > 0 && (
                      <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          ⚡ Quick Review Notes
                        </h3>
                        <ul style={{ paddingLeft: "1.25rem", color: "var(--text-primary)", fontSize: "0.925rem" }}>
                          {data.revision_notes.map((note, idx) => (
                            <li key={idx} style={{ marginBottom: "0.4rem" }}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Test questions sorted by level */}
                    <div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#FFF", marginBottom: "1rem" }}>Test Your Understanding</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {[
                          { key: "easy", label: "Easy Questions", border: "#10B981", bg: "rgba(16, 185, 129, 0.05)" },
                          { key: "medium", label: "Intermediate Questions", border: "#F59E0B", bg: "rgba(245, 158, 11, 0.05)" },
                          { key: "advanced", label: "Challenge Questions", border: "#EF4444", bg: "rgba(239, 68, 68, 0.05)" }
                        ].map((level) => {
                          const questions = data.practice_questions?.[level.key] || [];
                          if (questions.length === 0) return null;
                          
                          return (
                            <div key={level.key} className="glass-card" style={{ borderLeft: `4px solid ${level.border}` }}>
                              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFF", marginBottom: "0.75rem" }}>{level.label}</h3>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {questions.map((q, idx) => (
                                  <div key={idx} style={{ padding: "0.75rem 1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                    {idx + 1}. {q}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "3rem 0" }} />

              {/* Exploration Resources */}
              <section style={{ marginBottom: "4rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFF", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Globe size={20} style={{ color: "var(--primary)" }} /> Reference Material & Help
                </h2>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
                  {/* Web Resources links */}
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>Academic References</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {[
                        { name: "Khan Academy", provider: "khan_academy", icon: "🎓", query: data.resource_queries?.khan_academy },
                        { name: "Wikipedia Academic", provider: "wikipedia", icon: "🌐", query: data.resource_queries?.wikipedia },
                        { name: "Encyclopedia Britannica", provider: "britannica", icon: "📚", query: data.resource_queries?.britannica }
                      ].map((site, idx) => (
                        <a
                          key={idx}
                          href={getResourceUrl(site.provider, site.query || data.topic)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-card"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            textDecoration: "none",
                            padding: "0.85rem 1.25rem",
                            borderRadius: "10px"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "1.25rem" }}>{site.icon}</span>
                            <div>
                              <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#FFF" }}>{site.name}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Search: {site.query || data.topic}</span>
                            </div>
                          </div>
                          <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* YouTube Lectures */}
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>Video Tutorials</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {(data.youtube_queries || []).map((searchQuery, idx) => (
                        <a
                          key={idx}
                          href={getResourceUrl("youtube", searchQuery)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-card"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            textDecoration: "none",
                            padding: "0.85rem 1.25rem",
                            borderRadius: "10px"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <Youtube size={18} style={{ color: "var(--danger)" }} />
                            <div>
                              <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#FFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>
                                {searchQuery}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Query YouTube Lectures</span>
                            </div>
                          </div>
                          <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Refinement Follow-up Chat ── */}
              <section className="glass-card glass-card-glow" style={{ padding: "1.5rem 2rem", background: "rgba(99, 102, 241, 0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <RefreshCw size={16} style={{ color: "var(--primary)" }} />
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#FFF", margin: 0 }}>Refine This Output</h3>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Adjust the explanation dynamically (e.g., "explain it like I am 10 years old", "translate the description to German", "use simple bullet points instead").
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <input
                    value={refinePrompt}
                    onChange={e => setRefinePrompt(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRefine()}
                    placeholder="Tweak style, target age, translation, complexity..."
                    className="input-control"
                    style={{ flex: 1, borderRadius: "8px" }}
                  />
                  <button
                    onClick={handleRefine}
                    disabled={!refinePrompt.trim() || refining}
                    className="btn btn-primary"
                    style={{ borderRadius: "8px", padding: "0.75rem 1.25rem" }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </section>

            </article>
          )}

          {/* Empty State Screen */}
          {!data && !loading && !error && (
            <div style={{ textAlign: "center", padding: "8rem 1rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ background: "rgba(99, 102, 241, 0.1)", width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                <BookOpen size={32} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#FFF", marginBottom: "0.5rem" }}>Ask and Learn Simply</h2>
                <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", maxWidth: "450px", margin: "0 auto" }}>
                  Enter a topic or select one of the preset chips above. Make sure your GitHub Token is saved in the configuration panel!
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
