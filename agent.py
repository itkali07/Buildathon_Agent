import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from swytchcode_runtime import Swytchcode

# ==========================================
# 1. Load Environment Variables
# ==========================================
load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    raise ValueError(
        "GROQ_API_KEY not found. Please add GROQ_API_KEY=your_key "
        "in the .env file."
    )

# ==========================================
# 2. Initialize Swytchcode Runtime
# ==========================================
swx = Swytchcode()

# ==========================================
# 3. Swytchcode Tools wrapped for LangGraph
# ==========================================
@tool
def github_create_issue(title: str, body_text: str) -> str:
    """Creates an issue in the GitHub repository."""
    payload = {
        "owner": "KaliAwasthi",
        "repo": "Buildathon-Agent",
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
        "baseUrl": "https://dummy.atlassian.net",
        "projectKey": "PROJ",
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
    """Sends notification message to a Slack channel."""
    payload = {
        "token": "xoxb-12345-dummy-token",
        "body": {
            "text": text,
            "channel": "C0123456789"
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

# ==========================================
# 5. Groq Model Setup (Fixed Model Name)
# ==========================================
llm = ChatGroq(
    model="openai/gpt-oss-20b",
    temperature=0
)

# ==========================================
# 6. Create AI Agent
# ==========================================
agent_executor = create_react_agent(
    llm,
    tools
)

# ==========================================
# 7. Run Agent
# ==========================================
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("AI SOFTWARE ENGINEER AGENT")
    print("Groq + LangChain + Swytchcode")
    print("=" * 60)

    # Detailed prompt with dummy data so APIs don't reject the request
    # Interactive prompt interface for judges
    user_prompt = input("Enter your command for the AI Software Engineer: ")
    
    print("\nUser Intent:")
    print(user_prompt)

    print("\nRunning agent...\n")

    try:
        response = agent_executor.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            }
        )

        print("=" * 60)
        print("AGENT EXECUTION OUTPUT")
        print("=" * 60)

        messages = response.get("messages", [])
        
        if messages:
            final_message = messages[-1]
            
            if hasattr(final_message, "content"):
                final_output = final_message.content
            else:
                final_output = str(final_message)
                
            if isinstance(final_output, list):
                text_parts = []
                for item in final_output:
                    if isinstance(item, dict):
                        if "text" in item:
                            text_parts.append(item["text"])
                        else:
                            text_parts.append(str(item))
                    else:
                        text_parts.append(str(item))
                print("\n".join(text_parts))
            else:
                print(final_output)
        else:
            print(response)

    except Exception as e:
        print("\n" + "=" * 60)
        print("ERROR")
        print("=" * 60)
        print(str(e))
