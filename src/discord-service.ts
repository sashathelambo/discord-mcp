import { 
  Client, 
  GatewayIntentBits, 
  Guild, 
  TextChannel, 
  Message,
  User,
  GuildMember,
  CategoryChannel,
  ChannelType,
  WebhookClient
} from 'discord.js';

export class DiscordService {
  private client: Client;
  private defaultGuildId?: string;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ]
    });

    this.defaultGuildId = process.env.DISCORD_GUILD_ID;
  }

  async initialize(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      console.error("ERROR: The environment variable DISCORD_TOKEN is not set. Please set it to run the application properly.");
      process.exit(1);
    }

    return new Promise((resolve, reject) => {
      this.client.once('ready', () => {
        console.error(`Discord bot logged in as ${this.client.user?.tag}`);
        this.isReady = true;
        resolve();
      });

      this.client.on('error', (error) => {
        console.error('Discord client error:', error);
      });

      this.client.login(token).catch(reject);
    });
  }

  private resolveGuildId(guildId?: string): string {
    const resolved = guildId || this.defaultGuildId;
    if (!resolved) {
      throw new Error("guildId cannot be null");
    }
    return resolved;
  }

  private ensureReady(): void {
    if (!this.isReady) {
      throw new Error("Discord client is not ready");
    }
  }

  // Server Information Tool
  async getServerInfo(guildId?: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const owner = await guild.fetchOwner();
    
    return `Server Name: ${guild.name}
Server ID: ${guild.id}
Owner: ${owner.user.username}
Created On: ${guild.createdAt.toLocaleDateString()}
Members: ${guild.memberCount}
Channels:
 - Text: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}
 - Voice: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}
  - Categories: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size}
Boosts:
 - Count: ${guild.premiumSubscriptionCount || 0}
 - Tier: ${guild.premiumTier}`;
  }

  // Message Management Tools
  async sendMessage(channelId: string, message: string): Promise<string> {
    this.ensureReady();
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const sentMessage = await channel.send(message);
    return `Message sent successfully. Message link: ${sentMessage.url}`;
  }

  async editMessage(channelId: string, messageId: string, newMessage: string): Promise<string> {
    this.ensureReady();
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      throw new Error("Message not found by messageId");
    }

    const editedMessage = await message.edit(newMessage);
    return `Message edited successfully. Message link: ${editedMessage.url}`;
  }

  async deleteMessage(channelId: string, messageId: string): Promise<string> {
    this.ensureReady();
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      throw new Error("Message not found by messageId");
    }

    await message.delete();
    return "Message deleted successfully";
  }

  async readMessages(channelId: string, count?: string): Promise<string> {
    this.ensureReady();
    
    const limit = count ? parseInt(count) : 100;
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const messages = await channel.messages.fetch({ limit });
    const formattedMessages = this.formatMessages(Array.from(messages.values()));
    
    return `**Retrieved ${messages.size} messages:** \n${formattedMessages.join('\n')}`;
  }

  async getUserIdByName(username: string, guildId?: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    let name = username;
    let discriminator: string | null = null;
    
    if (username.includes('#')) {
      const idx = username.lastIndexOf('#');
      name = username.substring(0, idx);
      discriminator = username.substring(idx + 1);
    }

    // Fetch all members if not cached
    await guild.members.fetch();
    
    let members = guild.members.cache.filter(m => 
      m.user.username.toLowerCase() === name.toLowerCase()
    );

    if (discriminator) {
      members = members.filter(m => m.user.discriminator === discriminator);
    }

    if (members.size === 0) {
      throw new Error(`No user found with username ${username}`);
    }

    if (members.size > 1) {
      const userList = members.map(m => 
        `${m.user.username}#${m.user.discriminator} (ID: ${m.user.id})`
      ).join(', ');
      throw new Error(`Multiple users found with username '${username}'. List: ${userList}. Please specify the full username#discriminator.`);
    }

    return members.first()!.user.id;
  }

  async sendPrivateMessage(userId: string, message: string): Promise<string> {
    this.ensureReady();
    
    const user = await this.client.users.fetch(userId);
    if (!user) {
      throw new Error("User not found by userId");
    }

    const dmChannel = await user.createDM();
    const sentMessage = await dmChannel.send(message);
    
    return `Message sent successfully. Message link: ${sentMessage.url}`;
  }

  async editPrivateMessage(userId: string, messageId: string, newMessage: string): Promise<string> {
    this.ensureReady();
    
    const user = await this.client.users.fetch(userId);
    if (!user) {
      throw new Error("User not found by userId");
    }

    const dmChannel = await user.createDM();
    const message = await dmChannel.messages.fetch(messageId);
    if (!message) {
      throw new Error("Message not found by messageId");
    }

    const editedMessage = await message.edit(newMessage);
    return `Message edited successfully. Message link: ${editedMessage.url}`;
  }

  async deletePrivateMessage(userId: string, messageId: string): Promise<string> {
    this.ensureReady();
    
    const user = await this.client.users.fetch(userId);
    if (!user) {
      throw new Error("User not found by userId");
    }

    const dmChannel = await user.createDM();
    const message = await dmChannel.messages.fetch(messageId);
    if (!message) {
      throw new Error("Message not found by messageId");
    }

    await message.delete();
    return "Message deleted successfully";
  }

  async readPrivateMessages(userId: string, count?: string): Promise<string> {
    this.ensureReady();
    
    const limit = count ? parseInt(count) : 100;
    
    const user = await this.client.users.fetch(userId);
    if (!user) {
      throw new Error("User not found by userId");
    }

    const dmChannel = await user.createDM();
    const messages = await dmChannel.messages.fetch({ limit });
    const formattedMessages = this.formatMessages(Array.from(messages.values()));
    
    return `**Retrieved ${messages.size} messages:** \n${formattedMessages.join('\n')}`;
  }

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<string> {
    this.ensureReady();
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      throw new Error("Message not found by messageId");
    }

    await message.react(emoji);
    return `Added reaction successfully. Message link: ${message.url}`;
  }

  async removeReaction(channelId: string, messageId: string, emoji: string): Promise<string> {
    this.ensureReady();
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      throw new Error("Message not found by messageId");
    }

    const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
    if (reaction) {
      await reaction.users.remove(this.client.user!.id);
    }
    
    return `Removed reaction successfully. Message link: ${message.url}`;
  }

  // Channel Management Tools
  async createTextChannel(guildId: string | undefined, name: string, categoryId?: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    let textChannel;
    if (categoryId) {
      const category = guild.channels.cache.get(categoryId) as CategoryChannel;
      if (!category || category.type !== ChannelType.GuildCategory) {
        throw new Error("Category not found by categoryId");
      }
      textChannel = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category
      });
      return `Created new text channel: ${textChannel.name} (ID: ${textChannel.id}) in category: ${category.name}`;
    } else {
      textChannel = await guild.channels.create({
        name,
        type: ChannelType.GuildText
      });
      return `Created new text channel: ${textChannel.name} (ID: ${textChannel.id})`;
    }
  }

  async deleteChannel(guildId: string | undefined, channelId: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      throw new Error("Channel not found by channelId");
    }

    const channelType = ChannelType[channel.type];
    const channelName = channel.name;
    
    await channel.delete();
    return `Deleted ${channelType} channel: ${channelName}`;
  }

  async findChannel(guildId: string | undefined, channelName: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const channels = guild.channels.cache.filter(c => 
      c.name.toLowerCase() === channelName.toLowerCase()
    );

    if (channels.size === 0) {
      throw new Error(`No channels found with name ${channelName}`);
    }

    if (channels.size > 1) {
      const channelList = channels.map(c => 
        `- ${ChannelType[c.type]} channel: ${c.name} (ID: ${c.id})`
      ).join('\n');
      return `Retrieved ${channels.size} channels:\n${channelList}`;
    }

    const channel = channels.first()!;
    return `Retrieved ${ChannelType[channel.type]} channel: ${channel.name} (ID: ${channel.id})`;
  }

  async listChannels(guildId?: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const channels = guild.channels.cache;
    if (channels.size === 0) {
      throw new Error("No channels found by guildId");
    }

    const channelList = channels.map(c => 
      `- ${ChannelType[c.type]} channel: ${c.name} (ID: ${c.id})`
    ).join('\n');
    
    return `Retrieved ${channels.size} channels:\n${channelList}`;
  }

  // Category Management Tools
  async createCategory(guildId: string | undefined, name: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory
    });
    
    return `Created new category: ${category.name}`;
  }

  async deleteCategory(guildId: string | undefined, categoryId: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const category = guild.channels.cache.get(categoryId) as CategoryChannel;
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new Error("Category not found by categoryId");
    }

    const categoryName = category.name;
    await category.delete();
    
    return `Deleted category: ${categoryName}`;
  }

  async findCategory(guildId: string | undefined, categoryName: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const categories = guild.channels.cache.filter(c => 
      c.type === ChannelType.GuildCategory && 
      c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (categories.size === 0) {
      throw new Error(`Category ${categoryName} not found`);
    }

    if (categories.size > 1) {
      const categoryList = categories.map(c => 
        `**${c.name}** - \`${c.id}\``
      ).join(', ');
      throw new Error(`Multiple channels found with name ${categoryName}.\nList: ${categoryList}.\nPlease specify the channel ID.`);
    }

    const category = categories.first()!;
    return `Retrieved category: ${category.name}, with ID: ${category.id}`;
  }

  async listChannelsInCategory(guildId: string | undefined, categoryId: string): Promise<string> {
    this.ensureReady();
    const resolvedGuildId = this.resolveGuildId(guildId);
    
    const guild = this.client.guilds.cache.get(resolvedGuildId);
    if (!guild) {
      throw new Error("Discord server not found by guildId");
    }

    const category = guild.channels.cache.get(categoryId) as CategoryChannel;
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new Error("Category not found by categoryId");
    }

    const channels = category.children.cache;
    if (channels.size === 0) {
      throw new Error("Category not contains any channels");
    }

    const channelList = channels.map(c => 
      `- ${ChannelType[c.type]} channel: ${c.name} (ID: ${c.id})`
    ).join('\n');
    
    return `Retrieved ${channels.size} channels:\n${channelList}`;
  }

  // Webhook Management Tools
  async createWebhook(channelId: string, name: string): Promise<string> {
    this.ensureReady();
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const webhook = await channel.createWebhook({
      name
    });
    
    return `Created ${name} webhook: ${webhook.url}`;
  }

  async deleteWebhook(webhookId: string): Promise<string> {
    this.ensureReady();
    
    const webhook = await this.client.fetchWebhook(webhookId);
    if (!webhook) {
      throw new Error("Webhook not found by webhookId");
    }

    const webhookName = webhook.name;
    await webhook.delete();
    
    return `Deleted ${webhookName} webhook`;
  }

  async listWebhooks(channelId: string): Promise<string> {
    this.ensureReady();
    
    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Channel not found by channelId");
    }

    const webhooks = await channel.fetchWebhooks();
    if (webhooks.size === 0) {
      throw new Error("No webhooks found");
    }

    const formattedWebhooks = webhooks.map(w => 
      `- (ID: ${w.id}) **[${w.name}]** \`\`\`${w.url}\`\`\``
    );
    
    return `**Retrieved ${formattedWebhooks.length} webhooks:** \n${formattedWebhooks.join('\n')}`;
  }

  async sendWebhookMessage(webhookUrl: string, message: string): Promise<string> {
    this.ensureReady();
    
    const webhookClient = new WebhookClient({ url: webhookUrl });
    const sentMessage = await webhookClient.send(message);
    
    // Webhook messages don't have a direct URL, so we return success
    return "Message sent successfully via webhook";
  }

  // Helper methods
  private formatMessages(messages: Message[]): string[] {
    return messages.map(m => {
      const authorName = m.author.username;
      const timestamp = m.createdAt.toISOString();
      const content = m.content || '[No content]';
      const messageId = m.id;

      return `- (ID: ${messageId}) **[${authorName}]** \`${timestamp}\`: \`\`\`${content}\`\`\``;
    });
  }

  async destroy(): Promise<void> {
    await this.client.destroy();
  }
}
