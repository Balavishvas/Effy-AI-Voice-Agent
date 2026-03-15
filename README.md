# Effi AI Voice Agent

Effi is a friendly, intelligent voice assistant built with [LiveKit](https://livekit.io/) and Google's Realtime LLM. She is designed to speak like a close, supportive friend using simple, natural, and human-like language.

## Features

- **LiveKit Agents Setup**: Built upon `livekit-agents` for seamless voice interaction.
- **Google Realtime Model**: Powered by Google's voice and text model for responsive, low-latency conversational AI.
- **Advanced Noise Cancellation**: Uses `livekit-plugins-noise-cancellation` to ensure clear audio in varying environments.
- **Human-like Prompting**: Configured with prompts to sound warm, empathetic, and slightly playful, avoiding robotic tones.

## Requirements

Ensure you have Python installed. You will also need credentials for your API services, primarily LiveKit and Google (if applicable through your environment configuration).

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Balavishvas/Effy-AI-Voice-Agent.git
   cd Effy-AI-Voice-Agent
   ```

2. **Set up a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

The agent uses environment variables to keep your API keys secure. 

1. Create a `.env` file in the root directory.
2. Add your required authentication keys. Example:
   ```env
   LIVEKIT_URL=your_livekit_url
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret
   # Include any additional required keys for your LLM or context as shown in your original .env
   ```

## Usage

To start the Effi Voice agent, run the following command:

```bash
python agent.py start
```

## Customizing the Agent

- The underlying prompts and conversational behavior are fully customizable. Check `prompt.py` to adjust Effi's persona and initial instructions.
- To modify the voice model, agent context, or noise cancellation configurations, see `agent.py`.
