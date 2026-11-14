import json
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

CODEX = shutil.which("codex")          # finds codex / codex.cmd on PATH
MODEL = "gpt-6.1-terra"
EFFORT = "high"


def ask(system: str, user: str, label: str) -> str:
    """One stateless Codex run = one fresh 'instance'.
    Auth comes from ~/.codex/auth.json (your ChatGPT OAuth login), no API key."""
    # codex exec has no separate system-prompt flag, so we fold it into the prompt.
    prompt = f"{system}\n\n---\n\n{user}"

    start = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        out_file = Path(tmp) / "reply.txt"
        subprocess.run(
            [
                CODEX, "exec",
                "--model", MODEL,
                "-c", f'model_reasoning_effort="{EFFORT}"',
                "--sandbox", "read-only",     # these agents only need to talk
                "--skip-git-repo-check",
                "--ephemeral",                # don't save a session file per call
                "--output-last-message", str(out_file),   # just the final answer
                "-",                          # read the prompt from stdin
            ],
            input=prompt,
            text=True,
            encoding="utf-8",
            cwd=tmp,                          # empty folder: nothing to wander into
            capture_output=True,
            check=True,
        )
        reply = out_file.read_text(encoding="utf-8").strip()
    print(f"  [{label} took {time.time() - start:.0f}s]", flush=True)
    return reply


def parse_json(text: str) -> dict:
    """No JSON mode here, so strip any ```json fences the model adds."""
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
    return json.loads(text)


# ---- Agent 1: the WRITER -------------------------------------------------
def write_poem(writer_prompt: str) -> str:
    return ask(writer_prompt, "Write the poem now. Output only the poem.", "writer")


# ---- Agent 2: the GRADER -------------------------------------------------
GRADER_PROMPT = """You are a strict poetry critic.
Grade the poem from 1 to 10 on imagery, originality, and nature theme.
Respond ONLY with JSON: {"score": <number>, "feedback": "<2-3 sentences>"}"""

def grade_poem(poem: str) -> dict:
    return parse_json(ask(GRADER_PROMPT, poem, "grader"))


# ---- Agent 3: the PROMPT REVISER ----------------------------------------
REVISER_PROMPT = """You improve prompts for a poetry-writing AI.
You will be given the current prompt, the poem it produced, and a critic's
score and feedback. Rewrite the prompt so the next poem scores higher.
Respond with ONLY the new prompt text, nothing else."""

def revise_prompt(old_prompt: str, poem: str, grade: dict) -> str:
    user = (
        f"CURRENT PROMPT:\n{old_prompt}\n\n"
        f"POEM IT PRODUCED:\n{poem}\n\n"
        f"SCORE: {grade['score']}/10\n"
        f"FEEDBACK: {grade['feedback']}"
    )
    return ask(REVISER_PROMPT, user, "reviser")


# ---- The loop ------------------------------------------------------------
if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    writer_prompt = "Write a short nature-themed poem."   # deliberately bland start

    for round_num in range(1, 4):
        print(f"\n=== Round {round_num} ===", flush=True)
        poem = write_poem(writer_prompt)
        grade = grade_poem(poem)

        print(f"PROMPT:\n{writer_prompt}\n")
        print(f"POEM:\n{poem}\n")
        print(f"SCORE: {grade['score']}/10 - {grade['feedback']}", flush=True)

        writer_prompt = revise_prompt(writer_prompt, poem, grade)
