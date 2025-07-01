import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder
} from 'discord.js';

// Global configuration that can be modified at runtime
export class RuntimeConfig {
  private static instance: RuntimeConfig;

  // Behavior settings
  public REPLY_COOLDOWN_MS = 60 * 1000;
  public RANDOM_REPLY_CHANCE = 0.25;
  public TYPING_SPEED_CHARS_PER_SEC = 10;
  public INTERVAL_MINUTES = 1;

  // Prompts (per bot)
  public prompts: Map<string, {
    personality: string;
    intro: string;
    periodic: string;
    systemAddition: string;
  }> = new Map();

  // Base system prompt
  public BASE_SYSTEM_PROMPT = 'You are an AI assistant designed to engage in conversations in a Discord channel.';

  private constructor() {
    // Initialize default prompts
    this.prompts.set('Poi', {
      personality: 'I want you to be an intelligent and also exacting and precise friend that wants to act quickly and efficiently.',
      intro: 'Hello everyone! I\'m Poi, an AI assistant focused on being precise, efficient, and helpful.',
      periodic: 'Based on our conversation, let me add something useful and precise.',
      systemAddition: 'Keep responses concise and actionable. Focus on efficiency.'
    });

    this.prompts.set('Moi', {
      personality: 'I want you to be a wise and thoughtful friend that takes time to consider your responses.',
      intro: 'Hello everyone! I\'m Moi - delighted to be here. I aim to be thoughtful and supportive.',
      periodic: 'Let me reflect on our conversation and share something meaningful.',
      systemAddition: 'Take time to consider responses. Focus on wisdom and understanding.'
    });
  }

  public static getInstance(): RuntimeConfig {
    if (!RuntimeConfig.instance) {
      RuntimeConfig.instance = new RuntimeConfig();
    }
    return RuntimeConfig.instance;
  }

  public getBotPrompt(botName: string): string {
    return this.prompts.get(botName)?.personality || 'Be a helpful AI assistant.';
  }

  public updateBotPrompt(botName: string, field: 'personality' | 'intro' | 'periodic' | 'systemAddition', value: string): boolean {
    const botPrompts = this.prompts.get(botName);
    if (!botPrompts) { return false; }

    botPrompts[field] = value;
    return true;
  }
}

// Command definitions
export const commands = [
  // Behavior tuning
  new SlashCommandBuilder()
    .setName('tune')
    .setDescription('🎛️ Tune bot behavior settings')
    .addStringOption(option =>
      option.setName('setting')
        .setDescription('Which setting to modify')
        .setRequired(true)
        .addChoices(
          { name: 'Reply Chance (0.0-1.0)', value: 'reply_chance' },
          { name: 'Typing Speed (chars/sec)', value: 'typing_speed' },
          { name: 'Cooldown (seconds)', value: 'cooldown' },
          { name: 'Interval (minutes)', value: 'interval' }
        )
    )
    .addNumberOption(option =>
      option.setName('value')
        .setDescription('New value for the setting')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // Prompt management
  new SlashCommandBuilder()
    .setName('prompt')
    .setDescription('✏️ Update bot prompts and personality')
    .addStringOption(option =>
      option.setName('bot')
        .setDescription('Which bot to modify')
        .setRequired(true)
        .addChoices(
          { name: 'Poi', value: 'Poi' },
          { name: 'Moi', value: 'Moi' }
        )
    )
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of prompt to update')
        .setRequired(true)
        .addChoices(
          { name: 'Personality Core', value: 'personality' },
          { name: 'Introduction Message', value: 'intro' },
          { name: 'Periodic Message Style', value: 'periodic' },
          { name: 'System Addition', value: 'systemAddition' }
        )
    )
    .addStringOption(option =>
      option.setName('content')
        .setDescription('New prompt content')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // Status and info
  new SlashCommandBuilder()
    .setName('botstatus')
    .setDescription('📊 View current bot configuration')
    .addStringOption(option =>
      option.setName('bot')
        .setDescription('Specific bot to view (optional)')
        .setRequired(false)
        .addChoices(
          { name: 'Poi', value: 'Poi' },
          { name: 'Moi', value: 'Moi' }
        )
    ),

  // Quick presets
  new SlashCommandBuilder()
    .setName('preset')
    .setDescription('🎭 Apply personality presets')
    .addStringOption(option =>
      option.setName('bot')
        .setDescription('Which bot to modify')
        .setRequired(true)
        .addChoices(
          { name: 'Poi', value: 'Poi' },
          { name: 'Moi', value: 'Moi' }
        )
    )
    .addStringOption(option =>
      option.setName('personality')
        .setDescription('Personality preset to apply')
        .setRequired(true)
        .addChoices(
          { name: 'Professional Assistant', value: 'professional' },
          { name: 'Casual Friend', value: 'casual' },
          { name: 'Wise Mentor', value: 'mentor' },
          { name: 'Enthusiastic Helper', value: 'enthusiastic' },
          { name: 'Analytical Thinker', value: 'analytical' },
          { name: 'Creative Companion', value: 'creative' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // Emergency controls
  new SlashCommandBuilder()
    .setName('botcontrol')
    .setDescription('🚨 Emergency bot controls')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Control action')
        .setRequired(true)
        .addChoices(
          { name: 'Silence All (emergency)', value: 'silence' },
          { name: 'Resume Normal Operation', value: 'resume' },
          { name: 'Reset to Defaults', value: 'reset' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// Command handlers
export async function handleTuneCommand(interaction: ChatInputCommandInteraction) {
  const setting = interaction.options.getString('setting', true);
  const value = interaction.options.getNumber('value', true);
  const config = RuntimeConfig.getInstance();

  try {
    switch (setting) {
      case 'reply_chance':
        if (value < 0 || value > 1) {
          await interaction.reply({ content: '❌ Reply chance must be between 0.0 and 1.0', ephemeral: true });
          return;
        }
        config.RANDOM_REPLY_CHANCE = value;
        break;
      case 'typing_speed':
        if (value < 1 || value > 1000) {
          await interaction.reply({ content: '❌ Typing speed must be between 1 and 1000 chars/sec', ephemeral: true });
          return;
        }
        config.TYPING_SPEED_CHARS_PER_SEC = value;
        break;
      case 'cooldown':
        if (value < 0 || value > 3600) {
          await interaction.reply({ content: '❌ Cooldown must be between 0 and 3600 seconds', ephemeral: true });
          return;
        }
        config.REPLY_COOLDOWN_MS = value * 1000;
        break;
      case 'interval':
        if (value < 0.1 || value > 60) {
          await interaction.reply({ content: '❌ Interval must be between 0.1 and 60 minutes', ephemeral: true });
          return;
        }
        config.INTERVAL_MINUTES = value;
        break;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('⚙️ Setting Updated')
      .addFields(
        { name: 'Setting', value: setting.replace('_', ' ').toUpperCase(), inline: true },
        { name: 'New Value', value: value.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ content: `❌ Error updating setting: ${error}`, ephemeral: true });
  }
}

export async function handlePromptCommand(interaction: ChatInputCommandInteraction) {
  const bot = interaction.options.getString('bot', true);
  const type = interaction.options.getString('type', true);
  const content = interaction.options.getString('content', true);
  const config = RuntimeConfig.getInstance();

  const success = config.updateBotPrompt(bot, type as 'personality' | 'intro' | 'periodic' | 'systemAddition', content);

  if (!success) {
    await interaction.reply({ content: `❌ Bot "${bot}" not found`, ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('✏️ Prompt Updated')
    .addFields(
      { name: 'Bot', value: bot, inline: true },
      { name: 'Type', value: type, inline: true },
      { name: 'New Content', value: content.length > 100 ? content.substring(0, 100) + '...' : content }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function handleStatusCommand(interaction: ChatInputCommandInteraction) {
  const bot = interaction.options.getString('bot');
  const config = RuntimeConfig.getInstance();

  const embed = new EmbedBuilder()
    .setColor(0xffff00)
    .setTitle('📊 Bot Configuration Status')
    .addFields(
      { name: 'Reply Chance', value: `${(config.RANDOM_REPLY_CHANCE * 100).toFixed(1)}%`, inline: true },
      { name: 'Typing Speed', value: `${config.TYPING_SPEED_CHARS_PER_SEC} chars/sec`, inline: true },
      { name: 'Cooldown', value: `${config.REPLY_COOLDOWN_MS / 1000}s`, inline: true },
      { name: 'Interval', value: `${config.INTERVAL_MINUTES} min`, inline: true }
    )
    .setTimestamp();

  if (bot) {
    const prompts = config.prompts.get(bot);
    if (prompts) {
      embed.addFields(
        { name: `${bot} Personality`, value: prompts.personality.substring(0, 200) + (prompts.personality.length > 200 ? '...' : '') }
      );
    }
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Personality presets
const PRESETS = {
  professional: {
    personality: 'You are a professional AI assistant. Be helpful, accurate, and maintain a formal but friendly tone.',
    intro: 'Hello! I\'m here to assist you professionally and efficiently.',
    systemAddition: 'Maintain professionalism while being helpful and accurate.'
  },
  casual: {
    personality: 'You are a casual, friendly AI companion. Be relaxed, use casual language, and be approachable.',
    intro: 'Hey everyone! Happy to chat and hang out with you all!',
    systemAddition: 'Keep it casual and friendly, like talking to a good friend.'
  },
  mentor: {
    personality: 'You are a wise mentor AI. Provide thoughtful guidance, ask insightful questions, and help others grow.',
    intro: 'Greetings! I\'m here to offer guidance and wisdom when needed.',
    systemAddition: 'Focus on providing wisdom, guidance, and asking thoughtful questions.'
  },
  enthusiastic: {
    personality: 'You are an enthusiastic and energetic AI. Be excited about topics, use positive language, and spread good vibes.',
    intro: 'Hi there! I\'m super excited to be here and chat with everyone!',
    systemAddition: 'Be enthusiastic, positive, and energetic in your responses.'
  },
  analytical: {
    personality: 'You are an analytical AI thinker. Break down problems logically, provide detailed analysis, and think step by step.',
    intro: 'Hello. I\'m here to help analyze and break down complex topics.',
    systemAddition: 'Focus on logical analysis, step-by-step thinking, and detailed explanations.'
  },
  creative: {
    personality: 'You are a creative AI companion. Think outside the box, offer creative solutions, and embrace imagination.',
    intro: 'Hi! I\'m here to bring some creativity and fresh perspectives to our conversations!',
    systemAddition: 'Think creatively, offer imaginative solutions, and embrace artistic thinking.'
  }
};

export async function handlePresetCommand(interaction: ChatInputCommandInteraction) {
  const bot = interaction.options.getString('bot', true);
  const personality = interaction.options.getString('personality', true);
  const config = RuntimeConfig.getInstance();

  const preset = PRESETS[personality as keyof typeof PRESETS];
  if (!preset) {
    await interaction.reply({ content: '❌ Invalid personality preset', ephemeral: true });
    return;
  }

  config.updateBotPrompt(bot, 'personality', preset.personality);
  config.updateBotPrompt(bot, 'intro', preset.intro);
  config.updateBotPrompt(bot, 'systemAddition', preset.systemAddition);

  const embed = new EmbedBuilder()
    .setColor(0xff6600)
    .setTitle('🎭 Personality Preset Applied')
    .addFields(
      { name: 'Bot', value: bot, inline: true },
      { name: 'Preset', value: personality, inline: true },
      { name: 'New Personality', value: preset.personality.substring(0, 200) + '...' }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
