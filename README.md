# My bot

A simple bot that uses the LM Studio API to chat with a model via discord.

## Installation

(needs improvements)

Start LM Studio service:

<https://lmstudio.ai/docs/app/api/headless>

```text
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] Success! HTTP server listening on port 1234
2025-06-28 05:33:51  [INFO]
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
2025-06-28 05:33:51  [INFO]
2025-06-28 05:33:51  [INFO]
 [LM STUDIO SERVER] Logs are saved into C:\Users\Ken\.lmstudio\server-logs
2025-06-28 05:33:51  [INFO]
 Server started.
2025-06-28 05:33:51  [INFO]
 Just-in-time model loading active.
```

The run command:

```bash
 npx ts-node .\src\index.ts
```
