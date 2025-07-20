import { z } from 'zod';

// Tool parameter schemas using Zod for validation
export const ServerInfoSchema = z.object({
  guildId: z.string().optional().describe("Discord server ID")
});

export const SendMessageSchema = z.object({
  channelId: z.string().describe("Discord channel ID"),
  message: z.string().describe("Message content")
});

export const EditMessageSchema = z.object({
  channelId: z.string().describe("Discord channel ID"),
  messageId: z.string().describe("Specific message ID"),
  newMessage: z.string().describe("New message content")
});

export const DeleteMessageSchema = z.object({
  channelId: z.string().describe("Discord channel ID"),
  messageId: z.string().describe("Specific message ID")
});

export const ReadMessagesSchema = z.object({
  channelId: z.string().describe("Discord channel ID"),
  count: z.string().optional().describe("Number of messages to retrieve")
});

export const GetUserIdByNameSchema = z.object({
  username: z.string().describe("Discord username (optionally username#discriminator)"),
  guildId: z.string().optional().describe("Discord server ID")
});

export const SendPrivateMessageSchema = z.object({
  userId: z.string().describe("Discord user ID"),
  message: z.string().describe("Message content")
});

export const EditPrivateMessageSchema = z.object({
  userId: z.string().describe("Discord user ID"),
  messageId: z.string().describe("Specific message ID"),
  newMessage: z.string().describe("New message content")
});

export const DeletePrivateMessageSchema = z.object({
  userId: z.string().describe("Discord user ID"),
  messageId: z.string().describe("Specific message ID")
});

export const ReadPrivateMessagesSchema = z.object({
  userId: z.string().describe("Discord user ID"),
  count: z.string().optional().describe("Number of messages to retrieve")
});

export const AddReactionSchema = z.object({
  channelId: z.string().describe("Discord channel ID"),
  messageId: z.string().describe("Discord message ID"),
  emoji: z.string().describe("Emoji (Unicode or string)")
});

export const RemoveReactionSchema = z.object({
  channelId: z.string().describe("Discord channel ID"),
  messageId: z.string().describe("Discord message ID"),
  emoji: z.string().describe("Emoji (Unicode or string)")
});

export const CreateTextChannelSchema = z.object({
  guildId: z.string().optional().describe("Discord server ID"),
  name: z.string().describe("Channel name"),
  categoryId: z.string().optional().describe("Category ID (optional)")
});

export const DeleteChannelSchema = z.object({
  guildId: z.string().optional().describe("Discord server ID"),
  channelId: z.string().describe("Discord channel ID")
});

export const FindChannelSchema = z.object({
  guildId: z.string().optional().describe("Discord server ID"),
  channelName: z.string().describe("Discord channel name")
});

export const ListChannelsSchema = z.object({
  guildId: z.string().optional().describe("Discord server ID")
});

export const CreateCategorySchema = z.object({
  guildId: z.string().optional().describe("Discord server ID"),
  name: z.string().describe("Discord category name")
});

export const DeleteCategorySchema = z.object({
  guildId: z.string().optional().describe("Discord server ID"),
  categoryId: z.string().describe("Discord category ID")
});

export const FindCategorySchema = z.object({
  guildId: z.string().optional().describe("Discord server ID"),
  categoryName: z.string().describe("Discord category name")
});

export const ListChannelsInCategorySchema = z.object({
  guildId: z.string().optional().describe("Discord server ID"),
  categoryId: z.string().describe("Discord category ID")
});

export const CreateWebhookSchema = z.object({
  channelId: z.string().describe("Discord channel ID"),
  name: z.string().describe("Webhook name")
});

export const DeleteWebhookSchema = z.object({
  webhookId: z.string().describe("Discord webhook ID")
});

export const ListWebhooksSchema = z.object({
  channelId: z.string().describe("Discord channel ID")
});

export const SendWebhookMessageSchema = z.object({
  webhookUrl: z.string().describe("Discord webhook link"),
  message: z.string().describe("Message content")
});
