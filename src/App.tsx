import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  GitBranch,
  MessageSquare,
  ListTodo,
  ShieldAlert,
  Layers,
  Activity,
  Sparkles,
  Clock,
  ArrowRight,
  Info,
  Wrench,
  Server
} from 'lucide-react';

interface ToolExecution {
  tool: string;
  payload: Record<string, unknown>;
  status: string;
  output: string;
  isSimulatedDummy: boolean;
  timestamp: string;
}

interface AgentRunResponse {
  success: boolean;
  userPrompt: string;
  durationMs: number;
  toolExecutions: ToolExecution[];
  actionsPlanned: { tool: string; reason: string; params: Record<string, string> }[];
  agentOutput: string;
  modelUsed: string;
  agentArchitecture: string;
}

interface ModelInfo {
  id: string;
  provider: string;
  role: string;
  status: string;
  contextWindow: string;
  isDefault: boolean;
}

const PRESET_COMMANDS = [
  {
    title: 'Payment Gateway 502 Outage',
    desc: 'Triages critical production checkout failure across Jira, GitHub & Slack',
    prompt: 'Payment gateway returned 502 Bad Gateway during checkout spike. Create a P1 Jira bug, alert the backend team in Slack, and log an issue in GitHub with reproduction details.'
  },
  {
    title: 'Auth Service Memory Leak',
    desc: 'Escalates heap memory exhaustion in auth container',
    prompt: 'Memory leak detected in user authentication microservice under heavy load (OOMKilled pods). Create an urgent Jira tracking ticket, notify on-call in Slack, and log GitHub issue.'
  },
  {
    title: 'SQL Injection Security Vulnerability',
    desc: 'Immediate emergency protocol for unsanitized query param',
    prompt: 'High severity security vulnerability found in search endpoint input validation. File a private GitHub security advisory, file a Jira security task, and ping security lead on Slack.'
  },
  {
    title: 'Mobile Safari Checkout Regression',
    desc: 'Frontend rendering bug affecting iOS customers',
    prompt: 'Checkout button unresponsive on iOS Safari 17. Log a frontend bug in GitHub and create a Jira task for sprint backlog.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'console' | 'tools' | 'models' | 'architecture'>('console');
  const [prompt, setPrompt] = useState(PRESET_COMMANDS[0].prompt);
  const [loading, setLoading] = useState(false);
  const [currentRun, setCurrentRun] = useState<AgentRunResponse | null>(null);
  const [history, setHistory] = useState<AgentRunResponse[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Tools sandbox state
  const [selectedTool, setSelectedTool] = useState<'github_create_issue' | 'jira_create_task' | 'slack_send_message'>('jira_create_task');
  const [toolParams, setToolParams] = useState({
    jiraSummary: 'Auth token validation latency spike above 800ms',
    jiraDescription: 'Observed sudden P99 latency degradation following commit #9f8a2e.',
    ghTitle: 'Investigate token verification cache miss rate',
    ghBody: 'Token cache hit rate dropped from 94% to 12%. Check Redis TTL logic.',
    slackText: '🚨 [DevOps Alert] Token verification latency threshold exceeded (>800ms). Investigating.'
  });
  const [toolSandboxOutput, setToolSandboxOutput] = useState<any>(null);
  const [toolSandboxLoading, setToolSandboxLoading] = useState(false);

  // Models state
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsCheckedTime, setModelsCheckedTime] = useState<string>('');

  // Fetch initial models & config
  const fetchModels = async () => {
    setModelsLoading(true);
    try {
      const res = await fetch('/api/agent/models');
      const data = await res.json();
      setModels(data.models || []);
      setModelsCheckedTime(new Date(data.timestamp).toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching models:', err);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleRunAgent = async (overridePrompt?: string) => {
    const textToRun = (overridePrompt ?? prompt).trim();
    if (!textToRun) return;

    setLoading(true);
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToRun })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run agent');
      }

      setCurrentRun(data);
      setHistory(prev => [data, ...prev.slice(0, 9)]);
    } catch (err: any) {
      alert(`Error running agent: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSingleTool = async () => {
    setToolSandboxLoading(true);
    let params: Record<string, string> = {};

    if (selectedTool === 'jira_create_task') {
      params = { summary: toolParams.jiraSummary, description: toolParams.jiraDescription };
    } else if (selectedTool === 'github_create_issue') {
      params = { title: toolParams.ghTitle, body_text: toolParams.ghBody };
    } else {
      params = { text: toolParams.slackText };
    }

    try {
      const res = await fetch('/api/agent/tool-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selectedTool, params })
      });
      const data = await res.json();
      setToolSandboxOutput(data);
    } catch (err: any) {
      setToolSandboxOutput({ error: err.message });
    } finally {
      setToolSandboxLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">AI Software Engineer Agent</span>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                  Buildathon Edition
                </span>
              </div>
              <p className="text-xs text-slate-400">ReAct Autonomous Architecture • Swytchcode Tools • Kali Awasthi</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'console'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Agent Console</span>
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'tools'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Swytchcode Sandbox</span>
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'models'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Model Inspector</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'architecture'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Architecture</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'console' && (
          <div className="space-y-6">
            {/* Hero / Quick Presets */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
              
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Autonomous ReAct Agent Loop</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Direct the Autonomous Software Engineering Agent
                </h1>
                <p className="text-sm text-slate-400 mb-4">
                  Input any incident report or development task. The agent will formulate a plan, execute Jira, GitHub, and Slack tools via Swytchcode, and apply intelligent reasoning when environment credentials require developer verification.
                </p>

                {/* Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-slate-500 flex items-center mr-1">Quick Presets:</span>
                  {PRESET_COMMANDS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(p.prompt);
                        handleRunAgent(p.prompt);
                      }}
                      className="text-xs bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition text-left flex items-center gap-1.5"
                    >
                      <span>{p.title}</span>
                      <ArrowRight className="h-3 w-3 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input & Execution Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>COMMAND PROMPT FOR THE AI SOFTWARE ENGINEER:</span>
                <span className="text-slate-500 font-normal">Supports Jira, GitHub issue, and Slack actions</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Memory leak in auth container, create Jira ticket, notify team in Slack, and log GitHub issue..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                />
                <button
                  onClick={() => handleRunAgent()}
                  disabled={loading || !prompt.trim()}
                  className="sm:w-44 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium px-5 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:cursor-not-allowed self-end sm:self-stretch"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Reasoning...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Execute Agent</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Agent Live Output Display */}
            {currentRun && (
              <div className="space-y-6 animate-fade-in">
                {/* Executive Summary Bar */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">ReAct Agent Execution Complete</h3>
                      <p className="text-xs text-slate-400">
                        Executed in <span className="text-emerald-400 font-mono">{currentRun.durationMs}ms</span> using{' '}
                        <span className="text-blue-400 font-mono">{currentRun.modelUsed}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-slate-300">
                      {currentRun.toolExecutions.length} Tools Invoked
                    </span>
                    <span className="text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md text-amber-400 font-medium">
                      Smart Fallback Reasoning Activated
                    </span>
                  </div>
                </div>

                {/* Two Column Layout: Tool Executions vs Reasoning / Debugging Guide */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Tool Actions & Flow (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-blue-400" />
                        <span>Swytchcode Tool Invocations</span>
                      </h4>

                      <div className="space-y-3">
                        {currentRun.toolExecutions.map((t, idx) => {
                          const isJira = t.tool.includes('jira');
                          const isGithub = t.tool.includes('github');
                          const isSlack = t.tool.includes('slack');

                          return (
                            <div
                              key={idx}
                              className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs space-y-2 hover:border-slate-700 transition"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isJira && <ListTodo className="h-4 w-4 text-blue-400" />}
                                  {isGithub && <GitBranch className="h-4 w-4 text-purple-400" />}
                                  {isSlack && <MessageSquare className="h-4 w-4 text-emerald-400" />}
                                  <span className="font-mono font-semibold text-white">{t.tool}</span>
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  API Test Rejection
                                </span>
                              </div>

                              {/* Payload Preview */}
                              <div className="bg-slate-900 p-2 rounded border border-slate-800/60 font-mono text-[11px] text-slate-300">
                                <div className="text-[10px] text-slate-500 mb-1 font-sans font-medium">DISPATCHED PAYLOAD:</div>
                                <pre className="overflow-x-auto whitespace-pre-wrap max-h-24">
                                  {JSON.stringify(t.payload, null, 2)}
                                </pre>
                              </div>

                              {/* Tool Output */}
                              <div className="text-slate-400 bg-red-950/20 border border-red-900/30 p-2 rounded text-[11px]">
                                <div className="text-[10px] text-red-400 font-sans font-medium flex items-center gap-1 mb-0.5">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>OBSERVATION (SIMULATED RETURN):</span>
                                </div>
                                <p className="font-mono text-red-300/90 break-words">{t.output}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Architecture diagram card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Execution Pipeline</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          <div className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">1</div>
                          <span>User Prompt Received & Parsed</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">2</div>
                          <span>LangGraph ReAct Planner Formulates Tool Calls</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          <div className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">3</div>
                          <span>Swytchcode Tools Invoked (Jira, GitHub, Slack)</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">4</div>
                          <span>Smart Reasoning Generates Developer Fallback Guide</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Agent Output / Debugging Guide (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-emerald-400" />
                          <span className="font-semibold text-sm text-white">AGENT EXECUTION OUTPUT & DEBUGGING GUIDE</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(currentRun.agentOutput, 'main-output')}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition"
                        >
                          {copiedIndex === 'main-output' ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Guide</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-5 text-sm font-sans leading-relaxed text-slate-200 overflow-x-auto space-y-4">
                        {/* Render markdown-like sections nicely */}
                        <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm whitespace-pre-line font-mono bg-slate-950 p-4 rounded-lg border border-slate-800/80">
                          {currentRun.agentOutput}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History of runs */}
            {history.length > 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Recent Agent Executions ({history.length})</span>
                </h4>
                <div className="divide-y divide-slate-800 text-xs">
                  {history.map((h, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded">
                      <div className="flex items-center gap-2 truncate pr-4">
                        <span className="text-slate-500 font-mono">#{i + 1}</span>
                        <span className="text-slate-200 truncate">{h.userPrompt}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-slate-500 font-mono">{h.durationMs}ms</span>
                        <button
                          onClick={() => {
                            setCurrentRun(h);
                            setPrompt(h.userPrompt);
                          }}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Swytchcode Tool Sandbox */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-400" />
                <span>Swytchcode Tool Execution Sandbox</span>
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Test the three Swytchcode tools directly with customized parameters to inspect payload assembly and simulated responses.
              </p>

              {/* Tool Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <button
                  onClick={() => setSelectedTool('jira_create_task')}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedTool === 'jira_create_task'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <ListTodo className="h-5 w-5 text-blue-400" />
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                      jira.api.issue.create
                    </span>
                  </div>
                  <div className="font-semibold text-sm">jira_create_task</div>
                  <div className="text-xs text-slate-500 mt-1">Creates Jira bug tickets</div>
                </button>

                <button
                  onClick={() => setSelectedTool('github_create_issue')}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedTool === 'github_create_issue'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <GitBranch className="h-5 w-5 text-purple-400" />
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                      github.issue.create
                    </span>
                  </div>
                  <div className="font-semibold text-sm">github_create_issue</div>
                  <div className="text-xs text-slate-500 mt-1">Logs GitHub repo issues</div>
                </button>

                <button
                  onClick={() => setSelectedTool('slack_send_message')}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedTool === 'slack_send_message'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <MessageSquare className="h-5 w-5 text-emerald-400" />
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                      slack.chat.postmessage.create
                    </span>
                  </div>
                  <div className="font-semibold text-sm">slack_send_message</div>
                  <div className="text-xs text-slate-500 mt-1">Dispatches Slack channel alerts</div>
                </button>
              </div>

              {/* Tool Parameters Form */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                {selectedTool === 'jira_create_task' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Summary</label>
                      <input
                        type="text"
                        value={toolParams.jiraSummary}
                        onChange={(e) => setToolParams({ ...toolParams, jiraSummary: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                      <textarea
                        value={toolParams.jiraDescription}
                        onChange={(e) => setToolParams({ ...toolParams, jiraDescription: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                      />
                    </div>
                  </>
                )}

                {selectedTool === 'github_create_issue' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Title</label>
                      <input
                        type="text"
                        value={toolParams.ghTitle}
                        onChange={(e) => setToolParams({ ...toolParams, ghTitle: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Body / Reproduction</label>
                      <textarea
                        value={toolParams.ghBody}
                        onChange={(e) => setToolParams({ ...toolParams, ghBody: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                      />
                    </div>
                  </>
                )}

                {selectedTool === 'slack_send_message' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Notification Text</label>
                    <textarea
                      value={toolParams.slackText}
                      onChange={(e) => setToolParams({ ...toolParams, slackText: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
                    />
                  </div>
                )}

                <button
                  onClick={handleExecuteSingleTool}
                  disabled={toolSandboxLoading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition"
                >
                  {toolSandboxLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Executing Tool...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Trigger Swytchcode Execution</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tool Execution Result */}
              {toolSandboxOutput && (
                <div className="mt-6 bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Swytchcode Return Payload</span>
                    <span className="text-[10px] font-mono text-amber-400">Status: {toolSandboxOutput.status}</span>
                  </h4>
                  <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(toolSandboxOutput, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Models & Connection Inspector (check_models.py migration) */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    <span>Model & Connection Inspector</span>
                  </h2>
                  <p className="text-sm text-slate-400">
                    Live inspection of configured LLM backends (migrated from <code className="text-blue-400">check_models.py</code>).
                  </p>
                </div>

                <button
                  onClick={fetchModels}
                  disabled={modelsLoading}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${modelsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </button>
              </div>

              {modelsCheckedTime && (
                <div className="text-xs text-slate-500 mb-4">
                  Last verified at: <span className="font-mono text-slate-400">{modelsCheckedTime}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((m, idx) => (
                  <div
                    key={idx}
                    className={`bg-slate-950 border rounded-xl p-5 space-y-3 ${
                      m.isDefault ? 'border-blue-500/50 shadow-lg shadow-blue-500/5' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-mono font-bold text-sm text-white">{m.id}</div>
                      {m.isDefault && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                          Active Core
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400">{m.role}</div>

                    <div className="pt-2 border-t border-slate-850 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Provider:</span>
                        <span className="text-slate-300 font-medium">{m.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Context Window:</span>
                        <span className="text-slate-300 font-mono">{m.contextWindow}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                          {m.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Original check_models.py comparison */}
              <div className="mt-6 bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-slate-400" />
                  <span>Original CLI Python Equivalent</span>
                </h4>
                <div className="bg-slate-900 p-3 rounded font-mono text-xs text-slate-300 overflow-x-auto">
                  <p className="text-slate-500"># In the original repo:</p>
                  <p className="text-blue-400">$ python check_models.py</p>
                  <p className="text-slate-300">Fetching active models for your API key...</p>
                  <p className="text-emerald-400">✅ gemini-3.8-flash (AI Studio Full-Stack Node)</p>
                  <p className="text-emerald-400">✅ openai/gpt-oss-20b (Groq Cloud)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Architecture & Workflow Guide */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <span>AI Software Engineer Agent Architecture</span>
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Originally created by Kali Awasthi for the Commudle Buildathon. This application coordinates full-lifecycle software incident remediation.
              </p>

              {/* Visual Flow Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm text-white">1. Incident Trigger</div>
                  <p className="text-xs text-slate-400">User prompts agent with production incident, bug report, or system error.</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm text-white">2. ReAct Decision Loop</div>
                  <p className="text-xs text-slate-400">Agent reasons through required actions and schedules tool calls.</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm text-white">3. Swytchcode Execution</div>
                  <p className="text-xs text-slate-400">Jira task created, GitHub issue opened, and Slack alert sent.</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm text-white">4. Smart Fallback</div>
                  <p className="text-xs text-slate-400">Intelligent error reasoning generates copyable curl commands & docs.</p>
                </div>
              </div>

              {/* Tool Matrix */}
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Tool Integrations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Tool Name</th>
                      <th className="p-3">Swytchcode Identifier</th>
                      <th className="p-3">Target Platform</th>
                      <th className="p-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-blue-400">jira_create_task</td>
                      <td className="p-3 font-mono text-slate-300">jira.api.issue.create</td>
                      <td className="p-3 text-slate-300">Atlassian Jira</td>
                      <td className="p-3 text-slate-400">High priority bug tracking and SLA management</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-purple-400">github_create_issue</td>
                      <td className="p-3 font-mono text-slate-300">github.issue.create</td>
                      <td className="p-3 text-slate-300">GitHub Issues</td>
                      <td className="p-3 text-slate-400">Codebase bug logging with reproduction details</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-emerald-400">slack_send_message</td>
                      <td className="p-3 font-mono text-slate-300">slack.chat.postmessage.create</td>
                      <td className="p-3 text-slate-300">Slack Chat</td>
                      <td className="p-3 text-slate-400">Real-time team notification and on-call escalation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Author: Kali Awasthi | Project: Buildathon-Agent</span>
          <span>Migrated to AI Studio Node.js Web Runtime (Port 3000)</span>
        </div>
      </footer>
    </div>
  );
}
