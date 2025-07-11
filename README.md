# Multi-Personality Discord Bot

A TypeScript Discord bot that supports multiple AI personalities and can use different LLM backends including LM Studio (local), OpenAI API, and Heroku Inference.

## Features

- 🤖 **Multiple Bot Personalities**: Support for multiple bot instances with different personalities (Poi, Moi, etc.)
- 🔄 **Multiple AI Providers**: Switch between LM Studio, OpenAI, and Heroku Inference
- ⚡ **Production Ready**: Includes linting, type checking, and CI/CD with GitHub Actions
- 🚀 **Heroku Deployment**: Ready for cloud deployment with proper configuration
- 💬 **Smart Conversation**: Context-aware replies with typing delays and cooldowns

## Quick Start

### Prerequisites

- Node.js 22.x
- Discord bot tokens (one for each personality)
- AI provider (LM Studio, OpenAI API key, or Heroku Inference)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd mybot
```markdown

2. Install dependencies:

```bash
npm install
```

1. Create a `.env` file with your configuration:

```bash
cp .env.example .env
# Edit .env with your tokens and settings
```

1. Build the project:

```bash
npm run build
```

1. Start the bot:

```bash
npm start
```

## Configuration

Create a `.env` file in the root directory:

```env
# Discord Bot Tokens
POI_TOKEN=your_poi_bot_token_here
MOI_TOKEN=your_moi_bot_token_here

# General Settings
CHANNEL=#general
MODEL=your_model_name
INTERVAL=5
LEADER_NAME=YourName

# AI Provider (choose one: 'lmstudio', 'openai', or 'heroku')
AI_PROVIDER=lmstudio

# OpenAI Settings (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key

# Heroku Inference Settings (if using Heroku Inference)
INFERENCE_KEY=your_inference_api_key
INFERENCE_MODEL_ID=your_model_id
INFERENCE_URL=https://your-inference-app.herokuapp.com
```

## Local Development

### Using LM Studio

1. Install and start LM Studio:
   - Download from <https://lmstudio.ai/>
   - Load your preferred model
   - Start the local server

1. Verify LM Studio is running:

```bash
curl http://localhost:1234/v1/models
```

1. Set your `.env`:

```env
AI_PROVIDER=lmstudio
```

1. Run in development mode:

```bash
npm run dev
```

### LM Studio Server Output Example

```text
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] Success! HTTP server listening on port 1234
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] Supported endpoints:
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] -> GET  <http://localhost:1234/v1/models>
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] -> POST <http://localhost:1234/v1/chat/completions>
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] -> POST <http://localhost:1234/v1/completions>
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] -> POST <http://localhost:1234/v1/embeddings>
```

## Heroku Deployment

### Heroku Prerequisites

1. Install Heroku CLI:
   - Download from <https://devcenter.heroku.com/articles/heroku-cli>
   - Run `heroku login`

2. Create a Heroku app:

```bash
heroku create your-bot-name
```

### Deployment Steps

1. **Create a Procfile** in your project root:

```bash
echo "worker: npm start" > Procfile
```

1. **Set environment variables on Heroku**:

```bash
# Discord tokens
heroku config:set POI_TOKEN=your_poi_bot_token_here
heroku config:set MOI_TOKEN=your_moi_bot_token_here

# General settings
heroku config:set CHANNEL=#general
heroku config:set MODEL=your_model_name
heroku config:set INTERVAL=5
heroku config:set LEADER_NAME=YourName

# For OpenAI
heroku config:set AI_PROVIDER=openai
heroku config:set OPENAI_API_KEY=your_openai_api_key

# OR for Heroku Inference
heroku config:set AI_PROVIDER=heroku
heroku config:set INFERENCE_KEY=your_inference_api_key
heroku config:set INFERENCE_MODEL_ID=your_model_id
heroku config:set INFERENCE_URL=https://your-inference-app.herokuapp.com
```

1. **Deploy to Heroku**:

```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

1. **Scale the worker dyno**:

```bash
heroku ps:scale worker=1
```

1. **Check logs**:

```bash
heroku logs --tail
```

### Heroku Configuration Options

#### Using OpenAI (Recommended for Heroku)

```bash
heroku config:set AI_PROVIDER=openai
heroku config:set OPENAI_API_KEY=your_openai_api_key
heroku config:set MODEL=gpt-4o-mini
```

#### Using Heroku Inference

```bash
heroku config:set AI_PROVIDER=heroku
heroku config:set INFERENCE_KEY=your_api_key
heroku config:set INFERENCE_MODEL_ID=your_model
heroku config:set INFERENCE_URL=https://your-inference-endpoint.herokuapp.com
```

### Troubleshooting Heroku Deployment

1. **Check dyno status**:

```bash
heroku ps
```

1. **View logs**:

```bash
heroku logs --tail --app your-app-name
```

1. **Restart the app**:

```bash
heroku restart
```

1. **Check environment variables**:

```bash
heroku config
```

## Development Scripts

```bash
npm run dev          # Run in development mode with ts-node
npm run build        # Compile TypeScript to JavaScript
npm start            # Run the compiled JavaScript
npm run lint         # Check code style and errors
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # Run TypeScript type checking
npm test             # Run Jest tests
npm run test:watch   # Run Jest tests in watch mode
npm run test:coverage # Run Jest tests with coverage report
```

## Project Structure

```markdown
mybot/
├── src/
│   └── index.ts           # Main bot logic
├── dist/                  # Compiled JavaScript (generated)
├── .github/
│   ├── workflows/
│   │   └── lint.yml       # GitHub Actions CI/CD
│   └── dependabot.yml     # Dependabot configuration
├── eslint.config.js       # ESLint configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Node.js dependencies and scripts
├── Procfile               # Heroku process configuration
├── .env                   # Environment variables (create this)
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Adding New Bot Personalities

To add a new bot personality:

1. **Get a Discord Bot Token**:
   - Go to <https://discord.com/developers/applications>
   - Create a new application
   - Create a bot and copy the token

2. **Add to environment variables**:

```bash
# Add to .env file
NEW_BOT_TOKEN=your_new_bot_token_here

# For Heroku
heroku config:set NEW_BOT_TOKEN=your_new_bot_token_here
```

1. **Update the bot configuration** in `src/index.ts`:

```typescript
const BOT_CONFIGS: BotConfig[] = [
  // ...existing bots...
  {
    token: process.env.NEW_BOT_TOKEN || '',
    name: 'NewBotName',
    prompt: 'Your bot personality description here.',
    model: BASE_MODEL,
    channel: CHANNEL
  }
];
```

## GitHub Actions CI/CD

The project includes automated linting and type checking via GitHub Actions:

- **Triggers**: On push and pull requests to `main` branch
- **Checks**: ESLint, TypeScript compilation, and build verification
- **Node.js**: Version 22.x (configurable in `.github/workflows/lint.yml`)

### Dependabot Automation

Dependabot is configured to automatically update dependencies:

- **npm dependencies**: Weekly updates on Mondays at 9:00 AM
- **GitHub Actions**: Weekly updates on Mondays at 9:00 AM
- **Grouping**: Related dependencies are grouped together (TypeScript ESLint, Discord.js, dev dependencies)
- **Auto-labeling**: PRs are automatically labeled for easy identification
- **Security updates**: Automatic security updates for vulnerable dependencies

Dependabot will create pull requests for:

- Production dependencies (`dependencies`)
- Development dependencies (`devDependencies`)
- GitHub Actions versions
- Security vulnerabilities (immediate updates)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and ensure tests pass: `npm run lint && npm run type-check`
4. Commit changes: `git commit -m "Description of changes"`
5. Push to branch: `git push origin feature-name`
6. Create a Pull Request

## Support

For support or questions:

- Create an issue in the GitHub repository
- Check the Heroku logs: `heroku logs --tail`
- Verify environment variables: `heroku config`
