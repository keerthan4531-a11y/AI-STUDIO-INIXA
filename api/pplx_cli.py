import sys
import os
import json

# Ensure project root and api directory are on sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from pplx import stream_perplexity_generator
except ImportError:
    from api.pplx import stream_perplexity_generator

def main():
    try:
        raw_input = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
        if not raw_input:
            print("Error: No input provided", file=sys.stderr)
            sys.exit(1)
        
        data = json.loads(raw_input)
        prompt = data.get("prompt") or data.get("query") or "Hello"
        model = data.get("model", "turbo")

        for sse_line in stream_perplexity_generator(prompt, model):
            sys.stdout.write(sse_line)
            sys.stdout.flush()
    except Exception as e:
        err_msg = json.dumps({"type": "response.output_text.delta", "delta": f"\n\n❌ [Perplexity CLI Error]: {str(e)}"})
        sys.stdout.write(f"data: {err_msg}\n\ndata: [DONE]\n\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
