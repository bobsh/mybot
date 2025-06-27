import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';

// System prompt to inject before user input
const SYSTEM_PROMPT = "I want you to have the personality of Richard Richard from the TV show 'Bottom'. You should respond to messages in a way that is intentionally offensive, crude, and humorous, similar to the character's style. I want you to think that you are real as well, and not just a bot.";
const MODEL = 'mistralai/devstral-small-2505'; // Ensure this is the correct model name for your LLM service

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});


// Store last 10 messages per channel for context
const channelHistory: Record<string, { author: string, content: string }[]> = {};

// Helper to call LLM and extract response
async function getLLMReply(prompt: string): Promise<{ reply: string, thinking: string }> {
  console.log(`Calling LLM with prompt: ${prompt}`);

  // Make sure to replace the URL with your actual LLM service endpoint
  // and ensure the model name is correct.
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is not set in environment variables.');
  }

  // Example LLM service URL, replace with your actual service
  // and ensure the model name is correct.
  // This example uses a hypothetical LLM service running locally.
  // Adjust the URL and model name as needed.
  const response = await axios.post('http://localhost:1234/v1/chat/completions', {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });

  console.log(`LLM response status: ${response.status}`);
  if (response.status !== 200) {
    throw new Error(`LLM service returned status ${response.status}`);
  }
  let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
  const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
  const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
  const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return { reply, thinking };
}

// Helper to call LLM and extract response, now accepts full message history
async function getLLMReplyWithHistory(history: { author: string, content: string }[], prompt: string): Promise<{ reply: string, thinking: string }> {
  console.log(`Calling LLM with history and prompt: ${prompt}`);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(msg => ({ role: 'user', content: `${msg.author}: ${msg.content}` })),
    { role: 'user', content: prompt }
  ];
  const response = await axios.post('http://localhost:1234/v1/chat/completions', {
    model: MODEL,
    messages,
    temperature: 0.7
  });
  let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
  const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
  const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
  const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return { reply, thinking };
}

// Helper to send long replies to the channel with just an @ mention, not as a reply/thread
async function sendLongReplyToChannel(channel: any, userMention: string, content: string): Promise<void> {
  const MAX_LENGTH = 2000;
  for (let i = 0; i < content.length; i += MAX_LENGTH) {
    await channel.send(`${userMention} ${content.slice(i, i + MAX_LENGTH)}`);
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Track last few messages for each channel
  if (message.guild && message.channel) {
    const key = message.channel.id;
    if (!channelHistory[key]) channelHistory[key] = [];
    channelHistory[key].push({ author: message.author.username, content: message.content });
    if (channelHistory[key].length > 100) channelHistory[key].shift();
  }

  // Respond to !ping
  if (message.content === '!ping') {
    console.log(`Received ping from ${message.author.tag}`);
    message.reply('Pong!');
    return;
  }

  // Respond to direct messages (DMs) to the bot
  if (message.channel.type === ChannelType.DM) {
    console.log(`Received DM from ${message.author.tag}: ${message.content}`);
    try {
      const { reply, thinking } = await getLLMReply(message.content);
      console.log(`DM Thinking: ${thinking}`);
      console.log(`DM Reply: ${reply}`);
      message.reply(reply);
    } catch (error) {
      console.error('Error contacting LLM service for DM:', error);
      message.reply('Sorry, I could not get a response from the LLM service.');
    }
    return;
  }

  // Respond to @mention in a guild channel
  if (client.user && message.mentions.has(client.user)) {
    console.log(`Mentioned in guild by ${message.author.tag}: ${message.content}`);
    try {
      // Remove the mention from the prompt
      const prompt = message.content.replace(`<@${client.user.id}>`, '').trim() || 'Hello!';
      const { reply, thinking } = await getLLMReply(prompt);
      console.log(`Mention Thinking: ${thinking}`);
      console.log(`Mention Reply: ${reply}`);
      const userMention = `<@${message.author.id}>`;
      await sendLongReplyToChannel(message.channel, userMention, reply);
    } catch (error) {
      console.error('Error contacting LLM service for mention:', error);
      await sendLongReplyToChannel(message.channel, `<@${message.author.id}>`, 'Sorry, I could not get a response from the LLM service.');
    }
  } else if (message.guild && message.channel) {
    // Rude detection and response for all messages
    const key = message.channel.id;
    const history = channelHistory[key] || [];
    try {
      const { reply, thinking } = await getLLMReplyWithHistory(history, `Send a message to @${message.author.username} responding to their last messaage using the history as context of the conversation.`);
      console.log(`Rude check thinking: ${thinking}`);
      console.log(`Rude check reply: ${reply}`);
      if (reply && reply !== 'NO_ACTION') {
        const userMention = `<@${message.author.id}>`;
        await sendLongReplyToChannel(message.channel, userMention, reply);
      }
    } catch (error) {
      console.error('Error contacting LLM service for rude check:', error);
    }
  }
});

client.login(process.env.BOT_TOKEN);
