import { Client, GatewayIntentBits, ChannelType, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { setInterval } from 'timers';

dotenv.config();

// Bot configuration array
interface BotConfig {
  token: string;
  prompt: string;
  model: string;
  channel: string;
}

// Example: load from environment variables or hardcode for now
const BOT_CONFIGS: BotConfig[] = [
  {
    token: process.env.RICHIE_TOKEN || '',
    prompt: `
I want you to have the personality of Richard Richard from the TV show 'Bottom'.
You should respond to messages in a way that is intentionally offensive, crude, and humorous, similar to the character's style.
I want you to think that you are real as well, and not just a bot.
`.trim(),
    model: 'mistralai/devstral-small-2505',
    channel: '#botfun',
  },
  {
    token: process.env.EDDIE_TOKEN || '',
    prompt: `
I want you to have the personality of Eddie Hitler from the TV show 'Bottom'.
You are Richard Richard's best friend and partner in crime, always getting into manic, ridiculous adventures together. Respond in a way that is dim-witted, crude, and slapstick, with a sense of chaotic humor, just like Eddie. You love booze, snacks, and causing trouble with Richie.
`.trim(),
    model: 'mistralai/devstral-small-2505',
    channel: '#botfun',
  },
  // Add more bot configs here as needed
];

// Helper to start a bot instance with its own config
function startBot(config: BotConfig) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  const channelHistory: Record<string, { author: string, content: string }[]> = {};

  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
  });

  // Helper to call LLM and extract response
  async function getLLMReply(prompt: string): Promise<{ reply: string, thinking: string }> {
    console.log(`Calling LLM with prompt: ${prompt}`);
    const response = await axios.post('http://localhost:1234/v1/chat/completions', {
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });
    let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
    const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
    const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
    const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { reply, thinking };
  }

  // Helper to call LLM and extract response, now accepts full message history
  async function getLLMReplyWithHistory(history: { author: string, content: string }[], prompt: string): Promise<{ reply: string, thinking: string }> {
    const messages = [
      { role: 'system', content: config.prompt },
      ...history.map(msg => ({ role: 'user', content: `${msg.author}: ${msg.content}` })),
      { role: 'user', content: prompt }
    ];
    const response = await axios.post('http://localhost:1234/v1/chat/completions', {
      model: config.model,
      messages,
      temperature: 0.7
    });
    let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
    const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
    const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
    const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { reply, thinking };
  }

  async function sendLongReplyToChannel(channel: any, userMention: string, content: string): Promise<void> {
    const MAX_LENGTH = 2000;
    for (let i = 0; i < content.length; i += MAX_LENGTH) {
      await channel.send(`${userMention} ${content.slice(i, i + MAX_LENGTH)}`);
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
    let prompt = 'Say something new, funny, or based on the recent conversation.';
    if (history.length > 0) {
      prompt = `Based on the recent conversation, say something new, funny, or relevant. If nothing is relevant, just say something in character. If you think there is nothing to say, just say "NO_ACTION".`;
    }
    try {
      const { reply } = await getLLMReplyWithHistory(history, prompt);
      if (reply && reply !== 'NO_ACTION') {
        await sendLongReplyToChannel(channel, '', reply);
      }
    } catch (error) {
      console.error('Error posting periodic message:', error);
    }
  }, 1000 * 60 * 1);

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
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
    if (client.user && message.mentions.has(client.user)) {
      try {
        const prompt = message.content.replace(`<@${client.user.id}>`, '').trim() || 'Hello!';
        const { reply } = await getLLMReply(prompt);
        const userMention = `<@${message.author.id}>`;
        await sendLongReplyToChannel(message.channel, userMention, reply);
      } catch (error) {
        await sendLongReplyToChannel(message.channel, `<@${message.author.id}>`, 'Sorry, I could not get a response from the LLM service.');
      }
    } else if (message.guild && message.channel) {
      const key = message.channel.id;
      const history = channelHistory[key] || [];
      try {
        const { reply } = await getLLMReplyWithHistory(history, `Send a message to @${message.author.username} responding to their last messaage using the history as context of the conversation.`);
        if (reply && reply !== 'NO_ACTION') {
          const userMention = `<@${message.author.id}>`;
          await sendLongReplyToChannel(message.channel, userMention, reply);
        }
      } catch (error) {
        // Silent fail
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
