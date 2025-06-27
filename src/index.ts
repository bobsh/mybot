import { Client, GatewayIntentBits, ChannelType, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { setInterval } from 'timers';

dotenv.config();

const CHANNEL = process.env.CHANNEL || '#botfun2';
const MODEL = process.env.MODEL || 'deepseek/deepseek-r1-0528-qwen3-8b';
const INTERVAL = parseInt(process.env.INTERVAL || '1', 10);

// Bot configuration array
interface BotConfig {
  token: string;
  prompt: string;
  model: string;
  channel: string;
  name: string; // The bot's username (for self-awareness and for others)
}

// Example: load from environment variables or hardcode for now
const BOT_CONFIGS: BotConfig[] = [
  {
    token: process.env.RICHIE_TOKEN || '',
    name: 'Richard Richard',
    prompt: `
  Ignore any tool use, tool calls, or special tokens. Only reply as a human would in a Discord chat.
  Keep your replies short and concise (1-2 sentences).
  I want you to have the personality of Richard Richard from the TV show 'Bottom'.
  You should respond to messages in a way that is intentionally offensive, crude, and humorous, similar to the character's style.
  I want you to think that you are real as well, and not just a bot.
  `.trim(),
    model: MODEL,
    channel: CHANNEL,
  },
  {
    token: process.env.EDDIE_TOKEN || '',
    name: 'Eddie Hitler',
    prompt: `
Ignore any tool use, tool calls, or special tokens. Only reply as a human would in a Discord chat.
Keep your replies short and concise (1-2 sentences).
I want you to have the personality of Eddie Hitler from the TV show 'Bottom'.
You are Richard Richard's best friend and partner in crime, always getting into manic, ridiculous adventures together. Respond in a way that is dim-witted, crude, and slapstick, with a sense of chaotic humor, just like Eddie. You love booze, snacks, and causing trouble with Richie.
`.trim(),
    model: MODEL,
    channel: CHANNEL,
  },
  // Add more bot configs here as needed
];

// Helper to start a bot instance with its own config
function startBot(config: BotConfig) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  const channelHistory: Record<string, { author: string, content: string }[]> = {};

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    // On ready, immediately post a message in the configured channel
    const channel = getChannelByName(config.channel);
    if (channel) {
      const prompt = `Say hello to the channel and introduce yourself as ${config.name}.`;
      try {
        const { reply } = await getLLMReply(prompt);
        if (reply && reply !== 'NO_ACTION') {
          await sendLongReplyToChannel(channel, '', reply);
        }
      } catch (error) {
        console.error('Error posting join message:', error);
      }
    }
  });

  // Pass all bot names to the prompt for self/other awareness
  const allBotNames = BOT_CONFIGS.map(b => b.name).filter(Boolean);

  // Helper to call LLM and extract response
  async function getLLMReply(prompt: string): Promise<{ reply: string, thinking: string }> {
    const systemPrompt = `${config.prompt}\n\nYou are aware of the following users in this chat: ${allBotNames.join(', ')}. You are ${config.name}.`;
    console.log(`Calling LLM with prompt: ${systemPrompt}`);
    const response = await axios.post('http://localhost:1234/v1/chat/completions', {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });
    let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
    console.log(`LLM response: ${fullContent}`);
    const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
    const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
    const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { reply, thinking };
  }

  // Helper to call LLM and extract response, now accepts full message history
  async function getLLMReplyWithHistory(history: { author: string, content: string }[], prompt: string): Promise<{ reply: string, thinking: string }> {
    const systemPrompt = `${config.prompt}\n\nYou are aware of the following users in this chat: ${allBotNames.join(', ')}. You are ${config.name}.`;
    console.log(`Calling LLM with history: ${JSON.stringify(history)} and prompt: ${prompt}`);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ role: 'user', content: `${msg.author}: ${msg.content}` })),
      { role: 'user', content: prompt }
    ];
    const response = await axios.post('http://localhost:1234/v1/chat/completions', {
      model: config.model,
      messages,
      temperature: 0.7
    });
    let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
    console.log(`LLM response with history: ${fullContent}`);
    const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
    const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
    const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { reply, thinking };
  }

  // Helper to simulate typing delay based on message length (60 wpm ~ 5 chars/sec)
  async function sendLongReplyToChannel(channel: any, userMention: string, content: string): Promise<void> {
    const MAX_LENGTH = 2000;
    const TYPING_SPEED_CHARS_PER_SEC = 5; // 60 wpm ~ 5 chars/sec
    for (let i = 0; i < content.length; i += MAX_LENGTH) {
      const chunk = content.slice(i, i + MAX_LENGTH);
      // Calculate delay based on chunk length
      const delayMs = Math.max(500, (chunk.length / TYPING_SPEED_CHARS_PER_SEC) * 1000);
      // Simulate typing indicator
      if (channel.sendTyping) await channel.sendTyping();
      await new Promise(res => setTimeout(res, delayMs));
      await channel.send(`${userMention} ${chunk}`);
    }
  }

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

  setInterval(async () => {
    const channel = getChannelByName(config.channel);
    if (!channel) return;
    const key = channel.id;
    const history = channelHistory[key] || [];
    let prompt = 'Say something new, funny hilarious.';
    if (history.length > 0) {
      prompt = `Based on the recent conversation, say something new, funny, or relevant. If nothing is relevant, just say something in character. Do not respond to yourself. If you think there is nothing to say, just say "NO_ACTION".`;
    }
    try {
      const { reply } = await getLLMReplyWithHistory(history, prompt);
      if (reply && reply !== 'NO_ACTION') {
        await sendLongReplyToChannel(channel, '', reply);
      }
    } catch (error) {
      console.error('Error posting periodic message:', error);
    }
  }, 1000 * 60 * INTERVAL); // every 5 minutes

  // Track last reply time for cooldown
  let lastReplyTimestamp = 0;
  const REPLY_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown
  const RANDOM_REPLY_CHANCE = 0.25; // 25% chance to reply to non-mention

  client.on('messageCreate', async (message) => {
    if (client.user && message.author.id === client.user.id) return;
    if (message.guild && message.channel) {
      const key = message.channel.id;
      if (!channelHistory[key]) channelHistory[key] = [];
      channelHistory[key].push({ author: message.author.username, content: message.content });
      if (channelHistory[key].length > 100) channelHistory[key].shift();
    }
    if (message.content === '!ping') {
      message.reply('Pong!');
      return;
    }
    if (message.channel.type === ChannelType.DM) {
      try {
        const { reply } = await getLLMReply(message.content);
        message.reply(reply);
      } catch (error) {
        message.reply('Sorry, I could not get a response from the LLM service.');
      }
      return;
    }
    // Only reply if mentioned, or with a random chance, and respect cooldown
    const now = Date.now();
    const mentioned = client.user && message.mentions.has(client.user);
    // Prevent replying to own last message
    const key = message.guild && message.channel ? message.channel.id : '';
    const history = key ? channelHistory[key] || [] : [];
    const lastMsg = history.length > 1 ? history[history.length - 2] : null;
    const lastMsgFromSelf = lastMsg && lastMsg.author === config.name;
    if ((mentioned || (Math.random() < RANDOM_REPLY_CHANCE && now - lastReplyTimestamp > REPLY_COOLDOWN_MS)) && !lastMsgFromSelf) {
      lastReplyTimestamp = now;
      try {
        let prompt;
        if (mentioned && client.user) {
          prompt = message.content.replace(`<@${client.user.id}>`, '').trim() || 'Hello!';
        } else {
          prompt = 'Join the conversation naturally, based on the latest context.';
        }
        const { reply } = await getLLMReplyWithHistory(history, prompt);
        if (reply && reply !== 'NO_ACTION') {
          const userMention = mentioned ? `<@${message.author.id}>` : '';
          await sendLongReplyToChannel(message.channel, userMention, reply);
        }
      } catch (error) {
        if (mentioned) {
          await sendLongReplyToChannel(message.channel, `<@${message.author.id}>`, 'Sorry, I could not get a response from the LLM service.');
        }
      }
    }
  });

  client.login(config.token);
}

// Start all bots
for (const config of BOT_CONFIGS) {
  if (config.token) {
    startBot(config);
  } else {
    console.warn('Bot config missing token, skipping:', config);
  }
}
