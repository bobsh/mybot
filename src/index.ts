import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

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
      const response = await axios.post('http://localhost:1234/v1/chat/completions', {
        model: 'deepseek/deepseek-r1-0528-qwen3-8b',
        messages: [
          { role: 'user', content: 'Write a short poem.' }
        ],
        temperature: 0.7
      });
      let fullContent = response.data?.choices?.[0]?.message?.content || 'No poem generated.';
      const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
      const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
      const poem = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      console.log(`Thinking: ${thinking}`);
      console.log(`Generated poem: ${poem}`);
      message.reply(poem);
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
      const response = await axios.post('http://localhost:1234/v1/chat/completions', {
        model: 'deepseek/deepseek-r1-0528-qwen3-8b',
        messages: [
          { role: 'user', content: message.content }
        ],
        temperature: 0.7
      });
      let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
      const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
      const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
      const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
      const prompt = message.content.replace(`<@${client.user.id}>`, '').trim();
      const response = await axios.post('http://localhost:1234/v1/chat/completions', {
        model: 'deepseek/deepseek-r1-0528-qwen3-8b',
        messages: [
          { role: 'user', content: prompt || 'Hello!' }
        ],
        temperature: 0.7
      });
      let fullContent = response.data?.choices?.[0]?.message?.content || 'No response generated.';
      const thinkMatch = fullContent.match(/<think>[\s\S]*?<\/think>/i);
      const thinking = thinkMatch ? thinkMatch[0].replace(/<\/?think>/gi, '').trim() : '';
      const reply = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
