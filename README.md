# 🤖 AI Software Engineer Agent

An intelligent, autonomous AI agent built for the Commudle Buildathon. Powered by **LangGraph**, **Groq (openai/gpt-oss-20b)**, and the **Swytchcode SDK**, this agent seamlessly interacts with GitHub, Jira, and Slack to manage high-priority software engineering tasks.

## 🚀 Key Features
* **Agentic Workflow:** Utilizes LangGraph's ReAct architecture for dynamic decision-making and tool execution.
* **Swytchcode Integration:** Securely wrapped Swytchcode tools for creating Jira bugs, logging GitHub issues, and sending Slack alerts.
* **Smart Error Handling & Reasoning:** Instead of crashing on API payload rejections (due to dummy testing data), the agent intelligently analyzes connection failures and generates a comprehensive, step-by-step developer debugging guide.
## 🏗️ Architecture Flow
```mermaid
graph TD;
    A[User Prompt] --> B[LangGraph ReAct Agent];
    B --> C{Tool Execution via Swytchcode};
    C -->|Jira API| D[Create Jira Bug];
    C -->|GitHub API| E[Log GitHub Issue];
    C -->|Slack API| F[Send Team Alert];
    D & E & F --> G[Agent Analyzes Response & Outputs Final State];

💻 Agent Execution Output (Smart Fallback)
When tested with simulated environment variables, the agent successfully attempts the tool calls, recognizes the missing real credentials, and provides an intelligent fallback response:
============================================================
AGENT EXECUTION OUTPUT
============================================================
### What to do next

1. **Verify URLs & Tokens**
   * Make sure the Jira base URL ('https://dummy.atlassian.net') is correct.
   * Confirm the GitHub repo exists and your personal access token has 'repo' scope.
   * Ensure the Slack token ('xoxb-12345-dummy') is valid.

2. **Test with `curl`**
   * (Agent provides automated curl commands for manual testing)

3. **Review API Docs**
   * Jira: https://developer.atlassian.com/cloud/jira/
   * GitHub: https://docs.github.com/en/rest/issues
   * Slack: https://api.slack.com/methods/chat.postMessage

Once the endpoints and tokens are verified, the calls should succeed.

🛠️ Setup & Installation
 * Clone the repository.
 * Create a .env file and add your Groq API Key: GROQ_API_KEY=your_key_here
 * Install dependencies: pip install -r requirements.txt
 * Run the agent: python agent.py
Author: Kali Awasthi | Project: Buildathon-Agent
