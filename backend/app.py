import os
import uvicorn
import gradio as gr
from app.main import app

# Friendly UI for the Hugging Face Space preview
with gr.Blocks(title="Speech Partner Backend API") as demo:
    gr.Markdown("# 🎙️ Speech Partner Backend API")
    gr.Markdown(
        "Welcome! This Hugging Face Space hosts the FastAPI backend for the **Speech Partner** application.\n\n"
        "- **Status**: 🟢 Online\n"
        "- **Health Check**: [`/health`](/health)\n"
        "- **Interactive API Docs**: [`/docs`](/docs)\n\n"
        "Requests from your Vercel frontend are handled directly by this backend."
    )

# Mount Gradio onto the existing FastAPI application
# Existing FastAPI endpoints (/narrations, /drills, /health, /docs) take precedence
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
