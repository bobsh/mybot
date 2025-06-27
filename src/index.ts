import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

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
    model: 'deepseek/deepseek-r1-0528-qwen3-8b',
    messages: [
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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Respond to !ping
  if (message.content === '!ping') {
    console.log(`Received ping from ${message.author.tag}`);
    message.reply('Pong!');
    return;
  }

  // Respond to !poem
  if (message.content === '!poem') {
    try {
      console.log(`Received poem request from ${message.author.tag}`);
      const { reply, thinking } = await getLLMReply('Write a short poem.');
      console.log(`Thinking: ${thinking}`);
      console.log(`Generated poem: ${reply}`);
      message.reply(reply);
    } catch (error) {
      console.error('Error contacting LLM service:', error);
      message.reply('Sorry, I could not get a poem from the LLM service.');
    }
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
      message.reply(reply);
    } catch (error) {
      console.error('Error contacting LLM service for mention:', error);
      message.reply('Sorry, I could not get a response from the LLM service.');
    }
  }
});

client.login(process.env.BOT_TOKEN);
