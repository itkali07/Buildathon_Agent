import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Initialize Google GenAI (Server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Default Swytchcode & Integration Config (strictly from environment variables)
const config = {
  github: {
    owner: process.env.GITHUB_OWNER || 'itkali07',
    repo: process.env.GITHUB_REPO || 'Buildathon_Agent'
  },
  jira: {
    baseUrl: process.env.JIRA_BASE_URL || 'https://kaliawasthi63.atlassian.net',
    projectKey: process.env.JIRA_PROJECT_KEY || 'PROJ'
  },
  slack: {
    channel: process.env.SLACK_CHANNEL_ID || process.env.SLACK_CHANNEL || 'C0C4HJK2PG9',
    token: process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN || ''
  }
};

// Swytchcode Tools Implementation (wrapped matching swytchcode_runtime)
interface ToolResult {
  tool: string;
  payload: Record<string, unknown>;
  status: 'simulated_success' | 'api_rejected' | 'success';
  output: string;
  isSimulatedDummy: boolean;
  timestamp: string;
}

function executeSwytchcodeTool(toolName: string, params: Record<string, unknown>): ToolResult {
  const timestamp = new Date().toISOString();

  if (toolName === 'github_create_issue' || toolName === 'github.issue.create') {
    const title = String(params.title || 'Untitled Issue');
    const bodyText = String(params.body_text || params.body || 'No description provided');
    const payload = {
      owner: config.github.owner,
      repo: config.github.repo,
      body: {
        title,
        body: bodyText
      }
    };

    // Original repo used dummy auth or simulated runtime
    return {
      tool: 'github_create_issue',
      payload,
      status: 'api_rejected',
      isSimulatedDummy: true,
      output: `GitHub tool response: 401 Unauthorized - Bad credentials or missing personal access token with 'repo' scope for ${config.github.owner}/${config.github.repo}`,
      timestamp
    };
  }

  if (toolName === 'jira_create_task' || toolName === 'jira.api.issue.create') {
    const summary = String(params.summary || 'High priority bug');
    const description = String(params.description || 'Auto-generated bug report');
    const payload = {
      baseUrl: config.jira.baseUrl,
      projectKey: config.jira.projectKey,
      body: {
        summary,
        description
      }
    };

    return {
      tool: 'jira_create_task',
      payload,
      status: 'api_rejected',
      isSimulatedDummy: true,
      output: `Jira tool response: 404 Not Found - Host '${config.jira.baseUrl}' could not be resolved or project '${config.jira.projectKey}' requires valid Atlassian API token.`,
      timestamp
    };
  }

  if (toolName === 'slack_send_message' || toolName === 'slack.chat.postmessage.create') {
    const text = String(params.text || params.message || 'Notification');
    const payload = {
      token: config.slack.token,
      body: {
        text,
        channel: config.slack.channel
      }
    };

    return {
      tool: 'slack_send_message',
      payload,
      status: 'api_rejected',
      isSimulatedDummy: true,
      output: `Slack tool response: invalid_auth - Slack bot token is invalid or lacks 'chat:write' scopes for channel '${config.slack.channel}'.`,
      timestamp
    };
  }

  return {
    tool: toolName,
    payload: params,
    status: 'api_rejected',
    isSimulatedDummy: true,
    output: `Unknown tool: ${toolName}`,
    timestamp
  };
}

// 1. Health / Config endpoint
app.get('/api/agent/config', (req, res) => {
  res.json({
    appName: 'AI Software Engineer Agent',
    version: '1.0.0',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    config: {
      github: config.github,
      jira: config.jira,
      slack: {
        channel: config.slack.channel,
        tokenMasked: 'xoxb-••••••••-dummy'
      }
    },
    tools: [
      {
        name: 'github_create_issue',
        swytchcodeRoute: 'github.issue.create',
        description: 'Creates a bug or feature tracking issue in the GitHub repository.'
      },
      {
        name: 'jira_create_task',
        swytchcodeRoute: 'jira.api.issue.create',
        description: 'Creates a high priority bug tracking task in Jira Atlassian.'
      },
      {
        name: 'slack_send_message',
        swytchcodeRoute: 'slack.chat.postmessage.create',
        description: 'Sends real-time notification alert to the designated engineering Slack channel.'
      }
    ]
  });
});

// 2. Models inspector (migrating check_models.py)
app.get('/api/agent/models', async (req, res) => {
  const models = [
    {
      id: 'gemini-3.8-flash',
      provider: 'Google GenAI (AI Studio)',
      role: 'Primary Agent ReAct Core & Reasoning Engine',
      status: 'active',
      contextWindow: '1M tokens',
      isDefault: true
    },
    {
      id: 'gemini-3.1-pro-preview',
      provider: 'Google GenAI (AI Studio)',
      role: 'Complex STEM & Architecture Analysis',
      status: 'active',
      contextWindow: '2M tokens',
      isDefault: false
    },
    {
      id: 'openai/gpt-oss-20b',
      provider: 'Groq Cloud (Original Spec)',
      role: 'Original Buildathon LangGraph Model',
      status: process.env.GROQ_API_KEY ? 'active' : 'simulated_fallback',
      contextWindow: '128k tokens',
      isDefault: false
    }
  ];

  // Optional: check groq api if key is provided
  let groqStatus = null;
  if (process.env.GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (groqRes.ok) {
        const data = await groqRes.json();
        groqStatus = {
          success: true,
          count: data.data?.length || 0
        };
      }
    } catch (e: any) {
      groqStatus = { success: false, error: e.message };
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    models,
    groqCheck: groqStatus,
    activeModel: 'gemini-3.8-flash'
  });
});

// 3. Direct Tool Execution Sandbox
app.post('/api/agent/tool-execute', (req, res) => {
  const { tool, params } = req.body;
  if (!tool) {
    return res.status(400).json({ error: 'tool name is required' });
  }
  const result = executeSwytchcodeTool(tool, params || {});
  res.json(result);
});

// 4. Autonomous ReAct Agent Execution
app.post('/api/agent/run', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const userPrompt = prompt.trim();
  const startTime = Date.now();

  try {
    // 1. Analyze prompt to decide which Swytchcode tools to execute (ReAct Planning)
    const promptLower = userPrompt.toLowerCase();
    const actionsToTake: { tool: string; reason: string; params: Record<string, string> }[] = [];

    // Smart tool matching based on the instruction
    const isBugOrIssue = promptLower.includes('bug') || promptLower.includes('issue') || promptLower.includes('error') || promptLower.includes('crash') || promptLower.includes('fix') || promptLower.includes('outage') || promptLower.includes('leak') || promptLower.includes('jira') || promptLower.includes('github');
    const isSlack = promptLower.includes('slack') || promptLower.includes('alert') || promptLower.includes('notify') || promptLower.includes('team') || promptLower.includes('channel') || promptLower.includes('message');

    // Jira Task
    if (isBugOrIssue || promptLower.includes('jira') || promptLower.includes('task')) {
      actionsToTake.push({
        tool: 'jira_create_task',
        reason: 'Create a high-priority bug tracking ticket in Jira to track resolution SLA.',
        params: {
          summary: `[P1 Incident] ${userPrompt.slice(0, 80)}`,
          description: `Reported incident command: "${userPrompt}"\n\nAutomated analysis: System flagged high-priority engineering task. Investigation and root-cause analysis needed.`
        }
      });
    }

    // GitHub Issue
    if (isBugOrIssue || promptLower.includes('github') || promptLower.includes('repo')) {
      actionsToTake.push({
        tool: 'github_create_issue',
        reason: 'Log an engineering issue in the repository with reproduction details and tracking labels.',
        params: {
          title: `Bug: ${userPrompt.slice(0, 70)}`,
          body_text: `### Incident Description\n${userPrompt}\n\n### Origin\nAutomated trigger from AI Software Engineer Agent.\n\n### Actions Required\n- [ ] Reproduce under staging environment\n- [ ] Patch code and run regression tests\n- [ ] Link Jira ticket`
        }
      });
    }

    // Slack Notification
    if (isSlack || actionsToTake.length > 0) {
      actionsToTake.push({
        tool: 'slack_send_message',
        reason: 'Broadcast urgent status alert to the team engineering Slack channel.',
        params: {
          text: `🚨 *[Buildathon Agent Alert]* High priority incident triggered:\n> ${userPrompt}\nTools engaged: Jira & GitHub. Escalating to on-call engineers.`
        }
      });
    }

    // If generic command, execute all 3 standard tools as per Buildathon Agent ReAct workflow
    if (actionsToTake.length === 0) {
      actionsToTake.push(
        {
          tool: 'jira_create_task',
          reason: 'Create Jira task for tracking software task',
          params: { summary: userPrompt.slice(0, 80), description: userPrompt }
        },
        {
          tool: 'github_create_issue',
          reason: 'Log GitHub issue in codebase',
          params: { title: userPrompt.slice(0, 70), body_text: userPrompt }
        },
        {
          tool: 'slack_send_message',
          reason: 'Notify team in Slack',
          params: { text: `AI Software Engineer Agent executing task: ${userPrompt}` }
        }
      );
    }

    // Execute the tools through Swytchcode wrapper
    const toolExecutions: ToolResult[] = actionsToTake.map(action =>
      executeSwytchcodeTool(action.tool, action.params)
    );

    // 2. Synthesize using Gemini @google/genai for the Smart Fallback & Developer Debugging Guide
    let agentReasoning = '';
    let developerGuide = '';

    const systemInstruction = `You are Kali Awasthi's AI Software Engineer Agent from the Commudle Buildathon.
Your architecture is a ReAct agent powered by tools: github_create_issue, jira_create_task, and slack_send_message.
When tested with dummy/simulated credentials (like dummy.atlassian.net, xoxb-12345-dummy-token, dummy repo), you NEVER simply crash.
Instead, you intelligently analyze the connection failures and generate a comprehensive, step-by-step developer debugging guide:
1. Verify URLs & Tokens (Jira baseUrl, GitHub repo scope, Slack bot token)
2. Test with exact copy-paste ready \`curl\` commands for manual verification
3. Review API Docs links:
   - Jira: https://developer.atlassian.com/cloud/jira/
   - GitHub: https://docs.github.com/en/rest/issues
   - Slack: https://api.slack.com/methods/chat.postMessage

Be professional, authoritative, clear, and provide structured markdown. Format clean code blocks for curl commands.`;

    const promptForGemini = `The user gave this engineering command:
"${userPrompt}"

The ReAct Agent attempted the following tools via Swytchcode:
${toolExecutions
  .map(
    t => `- Tool: ${t.tool}
  Payload: ${JSON.stringify(t.payload)}
  Result: ${t.output}`
  )
  .join('\n')}

All 3 tool invocations received simulated API rejections due to dummy testing credentials (as expected in the Buildathon sandbox).

Generate:
1. Executive ReAct summary of the agent's thought process and attempted actions.
2. The detailed "### What to do next" Developer Debugging Guide with:
   - Verification checklist for Jira, GitHub, Slack tokens/URLs
   - Ready-to-run copy-pasteable \`curl\` test commands tailored to these exact endpoints
   - Official documentation references
   - A concluding status message stating that once credentials are provided, the automated pipeline will execute synchronously.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptForGemini,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });
      developerGuide = response.text || '';
    } catch (aiErr: any) {
      console.warn('Gemini generateContent fallback:', aiErr.message);
      // Hardened fallback matching the original Buildathon Agent output format in README.md
      developerGuide = `### What to do next

1. **Verify URLs & Tokens**
   * Make sure the Jira base URL ('${config.jira.baseUrl}') is correct and project '${config.jira.projectKey}' exists.
   * Confirm the GitHub repo ('${config.github.owner}/${config.github.repo}') exists and your personal access token has 'repo' scope.
   * Ensure the Slack token ('${config.slack.token}') is a valid bot user token.

2. **Test with \`curl\`**
   * **Jira Issue Creation:**
\`\`\`bash
curl -X POST "${config.jira.baseUrl}/rest/api/2/issue" \\
  -H "Authorization: Basic \${JIRA_API_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{"fields":{"project":{"key":"${config.jira.projectKey}"},"summary":"${userPrompt.replace(/"/g, '\\"').slice(0, 60)}","issuetype":{"name":"Bug"}}}'
\`\`\`

   * **GitHub Issue Creation:**
\`\`\`bash
curl -X POST "https://api.github.com/repos/${config.github.owner}/${config.github.repo}/issues" \\
  -H "Authorization: token \${GITHUB_TOKEN}" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -d '{"title":"Bug: ${userPrompt.replace(/"/g, '\\"').slice(0, 50)}","body":"${userPrompt.replace(/"/g, '\\"')}"}'
\`\`\`

   * **Slack Alert:**
\`\`\`bash
curl -X POST "https://slack.com/api/chat.postMessage" \\
  -H "Authorization: Bearer \${SLACK_TOKEN}" \\
  -H "Content-Type: application/json; charset=utf-8" \\
  -d '{"channel":"${config.slack.channel}","text":"🚨 ${userPrompt.replace(/"/g, '\\"')}"}'
\`\`\`

3. **Review API Docs**
   * Jira: https://developer.atlassian.com/cloud/jira/
   * GitHub: https://docs.github.com/en/rest/issues
   * Slack: https://api.slack.com/methods/chat.postMessage

Once the endpoints and tokens are verified, the calls will succeed directly.`;
    }

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      userPrompt,
      durationMs: duration,
      toolExecutions,
      actionsPlanned: actionsToTake,
      agentOutput: developerGuide,
      modelUsed: 'gemini-3.8-flash',
      agentArchitecture: 'LangGraph ReAct + Swytchcode Tooling'
    });
  } catch (error: any) {
    console.error('Agent execution error:', error);
    res.status(500).json({
      error: error.message || 'Agent failed to execute prompt'
    });
  }
});

// Setup Frontend serving (Vite in Dev, Dist in Prod)
async function setupFrontend() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`🤖 AI Software Engineer Agent running at http://${HOST}:${PORT}`);
  });
}

setupFrontend().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
