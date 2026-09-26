import os
from flask import Flask, request, jsonify, render_template_string
from agent import run_agent

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Software Engineer Agent</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; margin: 0; padding: 2rem; }
    .card { max-width: 800px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; color: #60a5fa; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
    p { color: #9ca3af; font-size: 0.9rem; line-height: 1.5; }
    textarea { width: 100%; height: 100px; background: #030712; border: 1px solid #374151; border-radius: 8px; color: #fff; padding: 0.75rem; font-size: 0.9rem; box-sizing: border-box; resize: vertical; }
    button { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 0.75rem 1.5rem; font-weight: 600; cursor: pointer; margin-top: 1rem; transition: background 0.2s; }
    button:hover { background: #1d4ed8; }
    #output { margin-top: 1.5rem; padding: 1rem; background: #030712; border: 1px solid #1f2937; border-radius: 8px; font-family: monospace; white-space: pre-wrap; font-size: 0.85rem; color: #34d399; }
    .badge { display: inline-block; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color: #60a5fa; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 9999px; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Commudle Buildathon • LangGraph ReAct Agent</div>
    <h1>🤖 AI Software Engineer Agent</h1>
    <p>Coordinates incident response across Jira (<code>{{ jira }}</code>), GitHub (<code>{{ repo }}</code>), and Slack (<code>{{ channel }}</code>).</p>
    
    <form id="agentForm">
      <textarea id="prompt" placeholder="Enter incident report (e.g. Memory leak in auth container, log Jira bug and alert Slack)...">Payment gateway returned 502 Bad Gateway during checkout. Create a P1 Jira bug, alert the backend team in Slack, and log an issue in GitHub.</textarea>
      <br>
      <button type="submit" id="btn">Run Agent</button>
    </form>

    <div id="output" style="display:none;"></div>
  </div>

  <script>
    const form = document.getElementById('agentForm');
    const out = document.getElementById('output');
    const btn = document.getElementById('btn');

    form.onsubmit = async (e) => {
      e.preventDefault();
      btn.innerText = 'Reasoning & Executing...';
      btn.disabled = true;
      out.style.display = 'block';
      out.innerText = 'Agent initialized. Formulating plan and calling tools...';

      try {
        const res = await fetch('/run', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({prompt: document.getElementById('prompt').value})
        });
        const data = await res.json();
        out.innerText = data.output || data.error;
      } catch (err) {
        out.innerText = 'Error: ' + err.message;
      } finally {
        btn.innerText = 'Run Agent';
        btn.disabled = false;
      }
    };
  </script>
</body>
</html>
"""

@app.route("/")
def home():
    return render_template_string(
        HTML_TEMPLATE,
        jira=os.getenv("JIRA_BASE_URL", "https://kaliawasthi63.atlassian.net"),
        repo=f"{os.getenv('GITHUB_OWNER', 'itkali07')}/{os.getenv('GITHUB_REPO', 'Buildathon_Agent')}",
        channel=os.getenv("SLACK_CHANNEL_ID", "C0C4HJK2PG9")
    )

@app.route("/run", methods=["POST"])
def run_endpoint():
    data = request.get_json() or {}
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400
    
    result = run_agent(prompt)
    return jsonify({"output": result})

@app.route("/health")
def health():
    return jsonify({"status": "healthy", "service": "buildathon-agent"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)
