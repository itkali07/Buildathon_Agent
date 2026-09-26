import warnings
warnings.filterwarnings("ignore")

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

# ==========================================
# 1. Load Environment Variables
# ==========================================
load_dotenv()

# Optional top-level check (validated lazily at runtime)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Configurable Service Settings (loaded from environment)
GITHUB_OWNER = os.getenv("GITHUB_OWNER", "itkali07")
GITHUB_REPO = os.getenv("GITHUB_REPO", "Buildathon_Agent")
JIRA_BASE_URL = os.getenv("JIRA_BASE_URL", "https://kaliawasthi63.atlassian.net")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY", "PROJ")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN") or os.getenv("SLACK_TOKEN", "")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL_ID") or os.getenv("SLACK_CHANNEL", "C0C4HJK2PG9")

# ==========================================
# 2. Initialize Swytchcode Runtime (with Fallback)
# ==========================================
try:
    from swytchcode_runtime import Swytchcode
    swx = Swytchcode()
except ImportError:
    import requests

    class SwytchcodeMockTools:
        def execute(self, action: str, payload: dict):
            # Real fallback execution when Swytchcode proprietary CLI is not installed
            if action == "slack.chat.postmessage.create":
                token = payload.get("token")
                channel = payload.get("body", {}).get("channel")
                text = payload.get("body", {}).get("text")
                if token and str(token).startswith("xoxb-"):
                    try:
                        res = requests.post(
                            "https://slack.com/api/chat.postMessage",
                            headers={
                                "Authorization": f"Bearer {token}",
                                "Content-Type": "application/json; charset=utf-8"
                            },
                            json={"channel": channel, "text": text},
                            timeout=8
                        )
                        return res.json()
                    except Exception as e:
                        return {"ok": False, "error": str(e)}
                return {"ok": False, "error": "invalid_auth"}

            return {
                "status": "simulated_success",
                "action": action,
                "payload": payload
            }

    class SwytchcodeFallbackRuntime:
        tools = SwytchcodeMockTools()

    swx = SwytchcodeFallbackRuntime()

# ==========================================
# 3. Swytchcode Tools wrapped for LangGraph
# ==========================================
@tool
def github_create_issue(title: str, body_text: str) -> str:
    """Creates an issue in the configured GitHub repository."""
    payload = {
        "owner": GITHUB_OWNER,
        "repo": GITHUB_REPO,
        "body": {
            "title": title,
            "body": body_text
        }
    }
    try:
        result = swx.tools.execute(
            "github.issue.create",
            payload
        )
        return str(result)
    except Exception as e:
        return f"GitHub tool error: {str(e)}"

@tool
def jira_create_task(summary: str, description: str) -> str:
    """Creates a high priority bug tracking task in Jira."""
    payload = {
        "baseUrl": JIRA_BASE_URL,
        "projectKey": JIRA_PROJECT_KEY,
        "body": {
            "summary": summary,
            "description": description
        }
    }
    try:
        result = swx.tools.execute(
            "jira.api.issue.create",
            payload
        )
        return str(result)
    except Exception as e:
        return f"Jira tool error: {str(e)}"

@tool
def slack_send_message(text: str) -> str:
    """Sends notification message to the configured Slack channel."""
    if not SLACK_BOT_TOKEN:
        return "Slack tool error: SLACK_BOT_TOKEN is not set in environment variables."

    payload = {
        "token": SLACK_BOT_TOKEN,
        "body": {
            "text": text,
            "channel": SLACK_CHANNEL
        }
    }
    try:
        result = swx.tools.execute(
            "slack.chat.postmessage.create",
            payload
        )
        return str(result)
    except Exception as e:
        return f"Slack tool error: {str(e)}"

# ==========================================
# 4. Register Tools
# ==========================================
tools = [
    github_create_issue,
    jira_create_task,
    slack_send_message
]

# Lazy agent executor initialization
_agent_executor = None

def get_agent_executor():
    global _agent_executor
    if _agent_executor is not None:
        return _agent_executor

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError(
            "GROQ_API_KEY is not set. Please add your Groq API key in the environment variables."
        )

    # Groq Model Setup
    llm = ChatGroq(
        model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
        temperature=0,
        api_key=groq_api_key
    )

    # Create AI Agent
    _agent_executor = create_react_agent(
        llm,
        tools
    )
    return _agent_executor

# Function to run agent programmatically
def run_agent(prompt: str) -> str:
    try:
        executor = get_agent_executor()
        response = executor.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
        )
        messages = response.get("messages", [])
        if messages:
            return messages[-1].content
        return "No response generated by agent."
    except Exception as e:
        return f"Agent execution error: {str(e)}"

# ==========================================
# 7. Run Agent CLI
# ==========================================
if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    if len(sys.argv) > 1:
        user_prompt = sys.argv[1]
    else:
        user_prompt = input("Enter your command for the AI Software Engineer: ")

    print(run_agent(user_prompt))
