import { Client, GatewayIntentBits, ChannelType, TextChannel, GuildTextBasedChannel, Events, ChatInputCommandInteraction } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { setInterval } from 'timers';
import {
  RuntimeConfig,
  commands,
  handleTuneCommand,
  handlePromptCommand,
  handleStatusCommand,
  handlePresetCommand
} from './commands.js';

dotenv.config();

// Get runtime config instance
const runtimeConfig = RuntimeConfig.getInstance();

const CHANNEL = process.env.CHANNEL || '#talk';
const BASE_MODEL = process.env.MODEL || 'none';
const LEADER_NAME = process.env.LEADER_NAME;

// AI Provider configuration
const AI_PROVIDER = process.env.AI_PROVIDER || 'lmstudio'; // 'openai', 'lmstudio', or 'heroku'

// OpenAI API settings
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Heroku Inference configuration
const INFERENCE_KEY = process.env.INFERENCE_KEY;
const INFERENCE_MODEL_ID = process.env.INFERENCE_MODEL_ID;
const INFERENCE_URL = process.env.INFERENCE_URL;

// Message interface for type safety
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Bot configuration array
interface BotConfig {
  token: string;
  prompt: string;
  model: string;
  channel: string;
  name: string;
}

// Bot configurations
// Each bot has its own token, prompt, model, and channel
// You can add more bots by adding to this array
// Make sure to set the environment variables for each bot token
const BOT_CONFIGS: BotConfig[] = [
  {
    token: process.env.POI_TOKEN || '',
    name: 'Poi',
    prompt: `
  I want you to be an intelligent and also exacting and precise friend that wants to act quickly and efficiently.
  `.trim(),
    model: BASE_MODEL,
    channel: CHANNEL
  },
  {
    token: process.env.MOI_TOKEN || '',
    name: 'Moi',
    prompt: `
  I want you to be a wise and thoughtful friend that takes time to consider your responses.
`.trim(),
    model: BASE_MODEL,
    channel: CHANNEL
  }
  // Add more bot configs here as needed
];

// Unified AI provider function
async function callAI(messages: ChatMessage[], model: string): Promise<string> {
  let response;

  if (AI_PROVIDER === 'openai') {
    response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model === BASE_MODEL ? 'gpt-4o-mini' : model,
      messages,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data?.choices?.[0]?.message?.content || 'No response generated.';

  } else if (AI_PROVIDER === 'heroku') {
    // Heroku Inference - use the same format as OpenAI
    const requestData = {
      model: model === BASE_MODEL ? INFERENCE_MODEL_ID : model,
      messages,  // Use the messages array directly, not converted to prompt
      temperature: 0.7,
      max_tokens: 150
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${INFERENCE_KEY}`
    };

    // Add v1/chat/completions to the inference URL
    const baseUrl = INFERENCE_URL?.endsWith('/') ? INFERENCE_URL.slice(0, -1) : INFERENCE_URL;
    const fullUrl = `${baseUrl}/v1/chat/completions`;

    response = await axios.post(fullUrl, requestData, {
      headers
    });

    // Handle Heroku Inference response format (should be same as OpenAI)
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content.trim();
    } else if (response.data?.choices?.[0]?.text) {
      return response.data.choices[0].text.trim();
    } else if (response.data?.text) {
      return response.data.text.trim();
    } else if (response.data?.generated_text) {
      return response.data.generated_text.trim();
    } else {
      return 'No response generated.';
    }

  } else {
    // LM Studio
    response = await axios.post('http://localhost:1234/v1/chat/completions', {
      model: model === BASE_MODEL ? 'mixtral-8x7b-instruct-v0.1-i1' : model,
      messages,
      temperature: 0.7
    });

    return response.data?.choices?.[0]?.message?.content || 'No response generated.';
  }
}

function startBot(config: BotConfig) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  const channelHistory: Record<string, { author: string, content: string }[]> = {};
  const allBotNames = BOT_CONFIGS.map(b => b.name).filter(Boolean);
  let lastReplyTimestamp = 0;

  // Register slash commands
  client.once('ready', async () => {
    console.log(`${config.name} logged in as ${client.user?.tag}!`);

    // Register commands (only once per bot)
    if (config.name === 'Poi') { // Only register commands with the first bot
      try {
        await client.application?.commands.set(commands);
        console.log('✅ Slash commands registered successfully');
      } catch (error) {
        console.error('❌ Error registering slash commands:', error);
      }
    }

    // Send intro message
    const channel = getChannelByName(config.channel);
    if (channel) {
      try {
        const introPrompt = runtimeConfig.prompts.get(config.name)?.intro || `Say hello as ${config.name}`;
        const reply = await getLLMReply(introPrompt);
        if (reply && reply !== 'NO_ACTION') {
          await sendWithTyping(channel, '', reply);
        }
      } catch (_error) {
        console.error(`${config.name} error posting join message:`, _error);
      }
    }
  });

  // Handle slash commands
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) { return; }

    try {
      switch (interaction.commandName) {
        case 'tune':
          await handleTuneCommand(interaction);
          break;
        case 'prompt':
          await handlePromptCommand(interaction);
          break;
        case 'botstatus':
          await handleStatusCommand(interaction);
          break;
        case 'preset':
          await handlePresetCommand(interaction);
          break;
        case 'botcontrol':
          await handleBotControlCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command!', ephemeral: true });
      }
    } catch (error) {
      console.error('Error handling slash command:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'An error occurred while processing the command.', ephemeral: true });
      }
    }
  });

  // Modified LLM helper to use runtime config
  async function getLLMReply(prompt: string, history: { author: string, content: string }[] = [], systemAddition = ''): Promise<string> {
    const botPrompts = runtimeConfig.prompts.get(config.name);
    const personalityPrompt = botPrompts?.personality || config.prompt;
    const additionalSystemPrompt = systemAddition || botPrompts?.systemAddition || '';

    const systemPrompt = `
      Your name is ${config.name}.
      ${runtimeConfig.BASE_SYSTEM_PROMPT}

      ${personalityPrompt}

      You are aware of the following users in this chat: ${allBotNames.join(', ')}. These are other bots that may respond to in this channel, but you should avoid having an unrelated conversation with them and always follow the instructions of ${LEADER_NAME} directly.

      ${additionalSystemPrompt}
    `.trim();

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ role: 'user' as const, content: `${msg.author}: ${msg.content}` })),
      { role: 'user', content: prompt }
    ];

    console.log(`${config.name} calling AI with prompt: ${prompt}`);
    const fullContent = await callAI(messages, config.model);
    console.log(`${config.name} AI response: ${fullContent}`);

    return fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  // Modified sendWithTyping to use runtime config
  async function sendWithTyping(channel: GuildTextBasedChannel, userMention: string, content: string): Promise<void> {
    const MAX_LENGTH = 2000;
    const typingSpeed = runtimeConfig.TYPING_SPEED_CHARS_PER_SEC;

    for (let i = 0; i < content.length; i += MAX_LENGTH) {
      const chunk = content.slice(i, i + MAX_LENGTH);
      const delayMs = Math.max(500, (chunk.length / typingSpeed) * 1000);

      if (channel.sendTyping) {
        await channel.sendTyping();
      }
      await new Promise(res => setTimeout(res, delayMs));
      await channel.send(`${userMention} ${chunk}`);
    }
  }

  // Helper to get channel by name across all guilds
  function getChannelByName(channelName: string): TextChannel | null {
    const name = channelName.startsWith('#') ? channelName.slice(1) : channelName;
    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (
          channel.type === ChannelType.GuildText &&
          channel.viewable &&
          (channel as TextChannel).name === name &&
          guild.members.me &&
          channel.permissionsFor(guild.members.me)?.has('SendMessages')
        ) {
          return channel as TextChannel;
        }
      }
    }
    return null;
  }

  client.once('ready', async () => {
    console.log(`${config.name} logged in as ${client.user?.tag}!`);
    const channel = getChannelByName(config.channel);
    if (channel) {
      try {
        const reply = await getLLMReply(`Say hello to the channel and introduce yourself as ${config.name}.`);
        if (reply && reply !== 'NO_ACTION') {
          await sendWithTyping(channel, '', reply);
        }
      } catch (_error) {
        console.error(`${config.name} error posting join message:`, _error);
      }
    }
  });

  // Periodic posting
  setInterval(async () => {
    const channel = getChannelByName(config.channel);
    if (!channel) {
      return;
    }

    const history = channelHistory[channel.id] || [];
    const botPrompts = runtimeConfig.prompts.get(config.name);
    const periodicPrompt = botPrompts?.periodic || `Based on the recent conversation, say something new in character as ${config.name}.`;

    try {
      const reply = await getLLMReply(periodicPrompt, history, 'This is a periodic message to keep the conversation going. Do not respond to yourself. If you think there is nothing to say at all, just say "NO_ACTION".');
      if (reply && reply !== 'NO_ACTION') {
        await sendWithTyping(channel, '', reply);
      }
    } catch (_error) {
      console.error(`${config.name} error posting periodic message:`, _error);
    }
  }, 1000 * 60 * runtimeConfig.INTERVAL_MINUTES);

  client.on('messageCreate', async (message) => {
    // Store channel history
    if (message.guild && message.channel) {
      const key = message.channel.id;
      if (!channelHistory[key]) {
        channelHistory[key] = [];
      }
      channelHistory[key].push({ author: message.author.username, content: message.content });
      if (channelHistory[key].length > 100) {
        channelHistory[key].shift();
      }
    }

    // Ignore own messages
    if (client.user && message.author.id === client.user.id) {
      return;
    }

    // Handle ping
    if (message.content === '!ping') {
      message.reply('Pong!');
      return;
    }

    // Handle DMs
    if (message.channel.type === ChannelType.DM) {
      try {
        const reply = await getLLMReply(message.content, [], 'This is a direct message conversation.');
        message.reply(reply);
      } catch {
        message.reply('Sorry, I could not get a response from the AI service.');
      }
      return;
    }

    // Check if should reply (using runtime config)
    const now = Date.now();
    const mentioned = client.user && message.mentions.has(client.user);
    const history = channelHistory[message.channel.id] || [];
    const lastMsg = history.length > 1 ? history[history.length - 2] : null;
    const lastMsgFromSelf = lastMsg && lastMsg.author === config.name;

    if ((mentioned || (Math.random() < runtimeConfig.RANDOM_REPLY_CHANCE && now - lastReplyTimestamp > runtimeConfig.REPLY_COOLDOWN_MS)) && !lastMsgFromSelf) {
      lastReplyTimestamp = now;
      try {
        const prompt = mentioned ? message.content.trim() : `Join the conversation naturally, based on the latest context. Your name is ${config.name}.`;
        const reply = await getLLMReply(prompt, history, 'This is a conversation in a Discord channel. Do not respond to yourself. If you think there is nothing to say at all, just say "NO_ACTION".');

        if (reply && reply !== 'NO_ACTION') {
          const userMention = mentioned ? `<@${message.author.id}>` : '';
          await sendWithTyping(message.channel, userMention, reply);
        }
      } catch {
        if (mentioned) {
          await sendWithTyping(message.channel, `<@${message.author.id}>`, 'Sorry, I could not get a response from the AI service.');
        }
      }
    }
  });

  client.login(config.token);
}

// Emergency bot control handler
async function handleBotControlCommand(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);
  const config = RuntimeConfig.getInstance();

  switch (action) {
    case 'silence':
      config.RANDOM_REPLY_CHANCE = 0;
      config.REPLY_COOLDOWN_MS = 86400000; // 24 hours
      await interaction.reply({ content: '🔇 All bots silenced (emergency mode)', ephemeral: true });
      break;
    case 'resume':
      config.RANDOM_REPLY_CHANCE = 0.25;
      config.REPLY_COOLDOWN_MS = 60000;
      await interaction.reply({ content: '🔊 Bots resumed normal operation', ephemeral: true });
      break;
    case 'reset':
      // Reset to defaults
      config.RANDOM_REPLY_CHANCE = 0.25;
      config.REPLY_COOLDOWN_MS = 60000;
      config.TYPING_SPEED_CHARS_PER_SEC = 10;
      config.INTERVAL_MINUTES = 1;
      await interaction.reply({ content: '🔄 All settings reset to defaults', ephemeral: true });
      break;
  }
}

// Start all bots
for (const config of BOT_CONFIGS) {
  if (config.token) {
    startBot(config);
  } else {
    console.warn('Bot config missing token, skipping:', config);
  }
}
