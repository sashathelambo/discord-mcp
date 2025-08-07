/**
 * Production-Ready Workflow Examples for Discord MCP Server
 * Demonstrates advanced integration patterns and workflow automation
 */

import { WorkflowDefinition, CompositeRequest, ToolChain, CEPRule, Saga } from '../src/workflow-engine';

// Example 1: Complete Discord Server Setup Workflow
export const serverSetupWorkflow: WorkflowDefinition = {
  id: 'discord-server-setup-advanced',
  name: 'Advanced Discord Server Setup',
  version: '2.0.0',
  description: 'Comprehensive server setup with role hierarchy, channel organization, and automation',
  steps: [
    // Phase 1: Create foundational structure
    {
      id: 'create-category-structure',
      name: 'Create Category Structure',
      type: 'parallel',
      parallel: {
        operations: [
          {
            name: 'create_category',
            parameters: { name: 'Information' }
          },
          {
            name: 'create_category', 
            parameters: { name: 'General Channels' }
          },
          {
            name: 'create_category',
            parameters: { name: 'Gaming' }
          },
          {
            name: 'create_category',
            parameters: { name: 'Voice Channels' }
          },
          {
            name: 'create_category',
            parameters: { name: 'Staff Only' }
          }
        ],
        maxConcurrency: 3,
        failureStrategy: 'fail-fast',
        aggregation: { type: 'array', arrayKey: 'categories' }
      }
    },

    // Phase 2: Create role hierarchy
    {
      id: 'create-role-hierarchy',
      name: 'Create Server Role Hierarchy',
      type: 'tool',
      dependsOn: ['create-category-structure'],
      tool: {
        name: 'comprehensive_channel_management',
        parameters: {
          operations: [
            {
              action: 'create_role',
              name: 'Server Owner',
              color: '#FF0000',
              permissions: ['ADMINISTRATOR']
            },
            {
              action: 'create_role', 
              name: 'Admin',
              color: '#FFA500',
              permissions: ['MANAGE_GUILD', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS']
            },
            {
              action: 'create_role',
              name: 'Moderator',
              color: '#00FF00', 
              permissions: ['MANAGE_MESSAGES', 'KICK_MEMBERS', 'MUTE_MEMBERS', 'MANAGE_NICKNAMES']
            },
            {
              action: 'create_role',
              name: 'VIP',
              color: '#FFD700',
              permissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS']
            },
            {
              action: 'create_role',
              name: 'Member',
              color: '#0000FF',
              permissions: ['SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'CONNECT', 'SPEAK']
            }
          ]
        }
      },
      timeout: 30000,
      retryPolicy: {
        maxAttempts: 3,
        baseDelay: 5000,
        maxDelay: 15000,
        backoffFactor: 2
      }
    },

    // Phase 3: Create channels with proper organization
    {
      id: 'create-organized-channels',
      name: 'Create and Organize Channels',
      type: 'tool',
      dependsOn: ['create-role-hierarchy'],
      tool: {
        name: 'comprehensive_channel_management',
        parameters: {
          operations: [
            // Information channels
            {
              action: 'create_text_channel',
              name: 'rules',
              categoryId: '{{results.create-category-structure.categories[0].id}}',
              topic: 'Server rules and guidelines',
              isPrivate: false
            },
            {
              action: 'create_text_channel',
              name: 'announcements', 
              categoryId: '{{results.create-category-structure.categories[0].id}}',
              topic: 'Important server announcements',
              isPrivate: false
            },
            // General channels
            {
              action: 'create_text_channel',
              name: 'general-chat',
              categoryId: '{{results.create-category-structure.categories[1].id}}',
              topic: 'General discussion'
            },
            {
              action: 'create_text_channel',
              name: 'off-topic',
              categoryId: '{{results.create-category-structure.categories[1].id}}',
              topic: 'Off-topic discussions'
            },
            // Gaming channels
            {
              action: 'create_text_channel',
              name: 'game-chat',
              categoryId: '{{results.create-category-structure.categories[2].id}}',
              topic: 'Gaming discussions'
            },
            {
              action: 'create_forum_channel',
              name: 'lfg-looking-for-group',
              categoryId: '{{results.create-category-structure.categories[2].id}}',
              topic: 'Find players for games',
              defaultReactionEmoji: '🎮'
            },
            // Voice channels
            {
              action: 'create_voice_channel',
              name: 'General Voice',
              categoryId: '{{results.create-category-structure.categories[3].id}}',
              userLimit: 10,
              bitrate: 64000
            },
            {
              action: 'create_voice_channel',
              name: 'Gaming Voice 1',
              categoryId: '{{results.create-category-structure.categories[3].id}}',
              userLimit: 8,
              bitrate: 64000
            },
            {
              action: 'create_voice_channel',
              name: 'Gaming Voice 2', 
              categoryId: '{{results.create-category-structure.categories[3].id}}',
              userLimit: 8,
              bitrate: 64000
            },
            // Staff channels
            {
              action: 'create_text_channel',
              name: 'staff-chat',
              categoryId: '{{results.create-category-structure.categories[4].id}}',
              isPrivate: true,
              allowedRoles: ['{{results.create-role-hierarchy.roles.Admin.id}}', '{{results.create-role-hierarchy.roles.Moderator.id}}']
            },
            {
              action: 'create_text_channel',
              name: 'mod-logs',
              categoryId: '{{results.create-category-structure.categories[4].id}}',
              isPrivate: true,
              allowedRoles: ['{{results.create-role-hierarchy.roles.Admin.id}}', '{{results.create-role-hierarchy.roles.Moderator.id}}']
            }
          ]
        }
      }
    },

    // Phase 4: Setup welcome system and automation
    {
      id: 'setup-welcome-automation',
      name: 'Configure Welcome System',
      type: 'tool',
      dependsOn: ['create-organized-channels'],
      tool: {
        name: 'edit_welcome_screen',
        parameters: {
          enabled: true,
          description: 'Welcome to our Discord community! Please read the rules and introduce yourself.',
          welcomeChannels: [
            {
              channelId: '{{results.create-organized-channels.channels.rules.id}}',
              description: 'Server rules and guidelines',
              emoji: '📋'
            },
            {
              channelId: '{{results.create-organized-channels.channels.general-chat.id}}',
              description: 'Main chat channel',
              emoji: '💬'
            },
            {
              channelId: '{{results.create-organized-channels.channels.announcements.id}}',
              description: 'Important announcements',
              emoji: '📢'
            }
          ]
        }
      }
    },

    // Phase 5: Setup automod rules
    {
      id: 'setup-automod',
      name: 'Configure Automatic Moderation',
      type: 'parallel',
      dependsOn: ['setup-welcome-automation'],
      parallel: {
        operations: [
          {
            name: 'create_automod_rule',
            parameters: {
              name: 'Spam Protection',
              eventType: 'MESSAGE_SEND',
              triggerType: 'SPAM',
              enabled: true
            }
          },
          {
            name: 'create_automod_rule',
            parameters: {
              name: 'Profanity Filter',
              eventType: 'MESSAGE_SEND',
              triggerType: 'KEYWORD_PRESET',
              presets: ['profanity', 'sexual_content', 'slurs'],
              enabled: true
            }
          },
          {
            name: 'create_automod_rule',
            parameters: {
              name: 'Mention Spam',
              eventType: 'MESSAGE_SEND', 
              triggerType: 'MENTION_SPAM',
              mentionLimit: 5,
              enabled: true
            }
          }
        ],
        failureStrategy: 'continue-on-error'
      }
    },

    // Phase 6: Create initial server events
    {
      id: 'create-initial-events',
      name: 'Schedule Welcome Events',
      type: 'tool',
      dependsOn: ['setup-automod'],
      tool: {
        name: 'create_event',
        parameters: {
          name: 'Weekly Community Meetup',
          description: 'Join us for our weekly community gathering and games!',
          startTime: '{{context.nextFriday8PM}}',
          endTime: '{{context.nextFriday10PM}}',
          channelId: '{{results.create-organized-channels.channels.General Voice.id}}'
        }
      }
    }
  ],
  
  triggers: [
    {
      type: 'manual',
      name: 'Manual Server Setup'
    },
    {
      type: 'webhook',
      name: 'API Triggered Setup',
      webhook: {
        path: '/setup-server',
        method: 'POST',
        authentication: 'bearer'
      }
    }
  ],

  errorHandling: {
    strategy: 'retry-then-fail',
    maxRetries: 3,
    retryDelay: 10000,
    retryBackoff: 'exponential',
    deadLetterQueue: true
  },

  timeout: 600000, // 10 minutes
  
  parallelism: {
    maxConcurrent: 5,
    strategy: 'resource-aware',
    resourceLimits: {
      memory: 512,
      cpu: 2,
      network: 10
    }
  }
};

// Example 2: Advanced Content Moderation Composite Operation
export const contentModerationComposite: CompositeRequest = {
  id: 'content-moderation-advanced',
  name: 'Advanced Content Moderation Pipeline',
  operations: [
    {
      id: 'fetch-message-context',
      toolName: 'get_message_history',
      parameters: {
        channelId: '{{input.channelId}}',
        limit: 10,
        before: '{{input.messageId}}'
      },
      timeout: 5000
    },
    {
      id: 'analyze-content-parallel',
      toolName: 'parallel_analysis',
      parameters: {
        analyses: [
          {
            type: 'spam_detection',
            content: '{{input.messageContent}}',
            context: '{{results.fetch-message-context}}'
          },
          {
            type: 'sentiment_analysis',
            content: '{{input.messageContent}}'
          },
          {
            type: 'toxicity_check',
            content: '{{input.messageContent}}'
          },
          {
            type: 'link_safety',
            content: '{{input.messageContent}}'
          }
        ]
      },
      dependsOn: ['fetch-message-context'],
      timeout: 15000,
      retryPolicy: {
        maxAttempts: 2,
        baseDelay: 3000,
        maxDelay: 10000,
        backoffFactor: 2
      }
    },
    {
      id: 'calculate-risk-score',
      toolName: 'risk_calculator',
      parameters: {
        spamScore: '{{results.analyze-content-parallel.spam_score}}',
        toxicityScore: '{{results.analyze-content-parallel.toxicity_score}}',
        sentimentScore: '{{results.analyze-content-parallel.sentiment_score}}',
        linkSafetyScore: '{{results.analyze-content-parallel.link_safety_score}}',
        userHistory: '{{input.userHistory}}',
        channelContext: '{{input.channelContext}}'
      },
      dependsOn: ['analyze-content-parallel'],
      condition: {
        expression: 'results["analyze-content-parallel"].spam_score > 0 || results["analyze-content-parallel"].toxicity_score > 0',
        skipOnFalse: false,
        failOnFalse: false
      }
    },
    {
      id: 'apply-moderation-action',
      toolName: 'moderation_action',
      parameters: {
        action: '{{context.determineAction(results["calculate-risk-score"].risk_level)}}',
        messageId: '{{input.messageId}}',
        channelId: '{{input.channelId}}',
        userId: '{{input.userId}}',
        reason: '{{results.calculate-risk-score.reason}}',
        evidence: '{{results.analyze-content-parallel}}'
      },
      dependsOn: ['calculate-risk-score'],
      condition: {
        expression: 'results["calculate-risk-score"].risk_level > 0.3',
        skipOnFalse: true,
        failOnFalse: false
      }
    },
    {
      id: 'log-moderation-action',
      toolName: 'send_message',
      parameters: {
        channelId: '{{config.moderation_log_channel}}',
        message: {
          embed: {
            title: 'Moderation Action Taken',
            fields: [
              {
                name: 'User',
                value: '{{input.username}}',
                inline: true
              },
              {
                name: 'Action',
                value: '{{results.apply-moderation-action.action}}',
                inline: true
              },
              {
                name: 'Risk Score',
                value: '{{results.calculate-risk-score.risk_level}}',
                inline: true
              },
              {
                name: 'Reason',
                value: '{{results.calculate-risk-score.reason}}',
                inline: false
              }
            ],
            color: '{{context.getColorForRiskLevel(results["calculate-risk-score"].risk_level)}}',
            timestamp: '{{context.now()}}'
          }
        }
      },
      dependsOn: ['apply-moderation-action'],
      condition: {
        expression: 'results["apply-moderation-action"] != null',
        skipOnFalse: true,
        failOnFalse: false
      }
    }
  ],
  execution: 'sequential',
  aggregation: {
    type: 'merge',
    mergeKeys: ['action_taken', 'risk_score', 'evidence', 'user_id']
  },
  timeout: 30000,
  failureStrategy: 'partial-success',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    keyGenerator: (request) => `moderation_${request.parameters.messageId}`,
    invalidationRules: [
      {
        pattern: 'message.edited.*',
        events: ['discord.message.edited']
      }
    ]
  }
};

// Example 3: Event-Driven Member Onboarding Tool Chain
export const memberOnboardingChain: ToolChain = {
  id: 'member-onboarding-advanced',
  name: 'Advanced Member Onboarding',
  description: 'Comprehensive member onboarding with role assignment and welcome sequence',
  
  trigger: {
    type: 'event',
    eventPattern: {
      type: 'discord.member.joined',
      metadata: {
        guildId: '{{config.guild_id}}'
      }
    }
  },

  steps: [
    {
      id: 'welcome-dm',
      name: 'Send Welcome Direct Message',
      type: 'tool',
      tool: {
        toolName: 'send_private_message',
        parameters: {
          userId: '{{event.data.user.id}}',
          message: {
            embed: {
              title: 'Welcome to {{event.data.guild.name}}! 🎉',
              description: 'We\'re excited to have you join our community!',
              fields: [
                {
                  name: 'Getting Started',
                  value: 'Please read our rules in <#{{config.rules_channel_id}}> and introduce yourself in <#{{config.intro_channel_id}}>',
                  inline: false
                },
                {
                  name: 'Need Help?',
                  value: 'Feel free to ask questions in <#{{config.help_channel_id}}> or DM a moderator',
                  inline: false
                }
              ],
              color: '#00FF00',
              thumbnail: {
                url: '{{event.data.guild.iconURL}}'
              }
            }
          }
        }
      },
      timeout: 10000,
      retryPolicy: {
        maxAttempts: 3,
        baseDelay: 5000,
        maxDelay: 15000,
        backoffFactor: 2
      }
    },

    {
      id: 'assign-newcomer-role',
      name: 'Assign Newcomer Role',
      type: 'tool',
      tool: {
        toolName: 'add_role_to_member',
        parameters: {
          userId: '{{event.data.user.id}}',
          roleId: '{{config.newcomer_role_id}}'
        }
      },
      timeout: 5000
    },

    {
      id: 'check-account-age',
      name: 'Check Account Age and Apply Security Measures',
      type: 'condition',
      condition: {
        expression: 'event.data.user.accountAge < 7', // Less than 7 days old
        onTrue: 'apply-new-account-restrictions',
        onFalse: 'log-standard-join'
      }
    },

    {
      id: 'apply-new-account-restrictions',
      name: 'Apply New Account Restrictions',
      type: 'tool',
      tool: {
        toolName: 'timeout_member',
        parameters: {
          userId: '{{event.data.user.id}}',
          duration: 1440, // 24 hours in minutes
          reason: 'New account - automatic security measure'
        }
      },
      onSuccess: [
        {
          type: 'notify',
          configuration: {
            channelId: '{{config.staff_channel_id}}',
            message: 'New account joined: {{event.data.user.username}} ({{event.data.user.id}}) - Applied 24h timeout'
          }
        }
      ]
    },

    {
      id: 'log-standard-join',
      name: 'Log Standard Member Join',
      type: 'tool',
      tool: {
        toolName: 'send_message',
        parameters: {
          channelId: '{{config.join_log_channel_id}}',
          message: {
            embed: {
              title: 'New Member Joined',
              fields: [
                {
                  name: 'User',
                  value: '{{event.data.user.username}}#{{event.data.user.discriminator}}',
                  inline: true
                },
                {
                  name: 'Account Created',
                  value: '{{event.data.user.createdAt}}',
                  inline: true
                },
                {
                  name: 'Member Count',
                  value: '{{event.data.guild.memberCount}}',
                  inline: true
                }
              ],
              color: '#00FF00',
              thumbnail: {
                url: '{{event.data.user.avatarURL}}'
              }
            }
          }
        }
      }
    },

    {
      id: 'schedule-followup',
      name: 'Schedule Follow-up Check',
      type: 'delay',
      delay: {
        duration: 24,
        unit: 'h',
        reason: 'Wait 24 hours before follow-up'
      }
    },

    {
      id: 'followup-check',
      name: 'Check Member Activity and Upgrade Role',
      type: 'tool',
      tool: {
        toolName: 'member_activity_check',
        parameters: {
          userId: '{{event.data.user.id}}',
          timeWindow: 24, // Hours
          minimumMessages: 3,
          readRules: true
        }
      },
      transform: {
        type: 'custom',
        customFunction: 'evaluateOnboardingProgress'
      }
    },

    {
      id: 'upgrade-to-member',
      name: 'Upgrade to Full Member',
      type: 'condition',
      condition: {
        expression: 'results["followup-check"].activity_score >= 0.5',
        onTrue: 'assign-member-role',
        onFalse: 'send-engagement-prompt'
      }
    },

    {
      id: 'assign-member-role',
      name: 'Assign Member Role',
      type: 'parallel',
      parallel: {
        operations: [
          {
            toolName: 'add_role_to_member',
            parameters: {
              userId: '{{event.data.user.id}}',
              roleId: '{{config.member_role_id}}'
            }
          },
          {
            toolName: 'remove_role_from_member',
            parameters: {
              userId: '{{event.data.user.id}}',
              roleId: '{{config.newcomer_role_id}}'
            }
          }
        ]
      }
    },

    {
      id: 'send-engagement-prompt',
      name: 'Send Engagement Prompt',
      type: 'tool',
      tool: {
        toolName: 'send_private_message',
        parameters: {
          userId: '{{event.data.user.id}}',
          message: {
            embed: {
              title: 'We\'d love to see more of you! 😊',
              description: 'We noticed you haven\'t been very active yet. Here are some ways to get involved:',
              fields: [
                {
                  name: 'Introduce Yourself',
                  value: 'Tell us about yourself in <#{{config.intro_channel_id}}>',
                  inline: false
                },
                {
                  name: 'Join Conversations',
                  value: 'Jump into discussions in <#{{config.general_channel_id}}>',
                  inline: false
                },
                {
                  name: 'Check Events',
                  value: 'See upcoming events and activities',
                  inline: false
                }
              ],
              color: '#FFA500'
            }
          }
        }
      }
    },

    {
      id: 'emit-onboarding-complete',
      name: 'Emit Onboarding Complete Event',
      type: 'emit',
      emit: {
        eventType: 'member.onboarding.completed',
        eventData: {
          userId: '{{event.data.user.id}}',
          finalRole: '{{results.upgrade-to-member == "assign-member-role" ? "member" : "newcomer"}}',
          activityScore: '{{results.followup-check.activity_score}}',
          onboardingDuration: '{{context.calculateDuration()}}'
        }
      }
    }
  ],

  errorHandling: {
    strategy: 'continue',
    deadLetterQueue: true,
    notification: {
      channels: ['{{config.staff_channel_id}}'],
      template: 'Onboarding failed for user {{event.data.user.username}}: {{error.message}}',
      severity: 'warning'
    }
  },

  timeout: 86400000 // 24 hours
};

// Example 4: Complex Event Processing Rule for Raid Detection
export const raidDetectionCEP: CEPRule = {
  id: 'raid-detection-advanced',
  name: 'Advanced Raid Detection',
  enabled: true,
  priority: 1,

  pattern: {
    type: 'sequence',
    timeWindow: { value: 5, unit: 'm' },
    events: [
      {
        type: 'discord.member.joined',
        data: {
          accountAge: { $lt: 86400000 } // Less than 1 day old
        }
      }
    ],
    minOccurrences: 10, // 10 or more new accounts in 5 minutes
    maxOccurrences: 1000
  },

  condition: 'events.length >= 10 && events.filter(e => e.data.user.accountAge < 86400000).length / events.length > 0.8',

  action: {
    type: 'tool',
    configuration: {
      toolName: 'comprehensive_channel_management',
      parameters: {
        operations: [
          {
            action: 'edit_server',
            verificationLevel: 'VERY_HIGH'
          },
          {
            action: 'send_message',
            channelId: '{{config.staff_channel_id}}',
            message: {
              embed: {
                title: '🚨 POTENTIAL RAID DETECTED 🚨',
                description: 'Automatic security measures have been activated',
                fields: [
                  {
                    name: 'New Members',
                    value: '{{events.length}} in 5 minutes',
                    inline: true
                  },
                  {
                    name: 'New Accounts',
                    value: '{{events.filter(e => e.data.user.accountAge < 86400000).length}}',
                    inline: true
                  },
                  {
                    name: 'Actions Taken',
                    value: '• Verification level raised to Very High\n• All new members will be flagged',
                    inline: false
                  }
                ],
                color: '#FF0000'
              }
            }
          }
        ]
      }
    }
  }
};

// Example 5: Distributed Transaction Saga for Multi-Server Event
export const multiServerEventSaga: Saga = {
  name: 'Multi-Server Event Coordination',
  
  steps: [
    {
      id: 'create-primary-event',
      name: 'Create Event in Primary Server',
      toolInvocation: {
        toolName: 'create_event',
        parameters: {
          guildId: '{{config.primary_guild_id}}',
          name: '{{input.event_name}}',
          description: '{{input.event_description}}',
          startTime: '{{input.start_time}}',
          endTime: '{{input.end_time}}'
        }
      },
      compensationStep: 'delete-primary-event',
      timeout: { value: 30, unit: 's' }
    },
    
    {
      id: 'create-secondary-events',
      name: 'Create Events in Secondary Servers',
      toolInvocation: {
        toolName: 'parallel_event_creation',
        parameters: {
          guilds: '{{config.secondary_guild_ids}}',
          eventTemplate: {
            name: '{{input.event_name}} (Partner Server)',
            description: '{{input.event_description}}\n\nJoin the main event at: {{results.create-primary-event.invite_url}}',
            startTime: '{{input.start_time}}',
            endTime: '{{input.end_time}}'
          }
        }
      },
      compensationStep: 'delete-secondary-events',
      timeout: { value: 60, unit: 's' }
    },

    {
      id: 'cross-promote-events',
      name: 'Cross-Promote Events Across Servers',
      toolInvocation: {
        toolName: 'cross_server_promotion',
        parameters: {
          primaryEvent: '{{results.create-primary-event}}',
          secondaryEvents: '{{results.create-secondary-events}}',
          promotionChannels: '{{config.promotion_channels}}'
        }
      },
      compensationStep: 'remove-promotions',
      timeout: { value: 45, unit: 's' }
    },

    {
      id: 'setup-cross-server-roles',
      name: 'Setup Temporary Cross-Server Roles',
      toolInvocation: {
        toolName: 'temporary_role_setup',
        parameters: {
          guilds: '{{config.all_guild_ids}}',
          roleName: 'Event Participant - {{input.event_name}}',
          duration: '{{input.event_duration_plus_buffer}}',
          permissions: ['SEND_MESSAGES', 'CONNECT', 'SPEAK']
        }
      },
      compensationStep: 'cleanup-roles',
      timeout: { value: 90, unit: 's' }
    }
  ],

  compensations: [
    {
      id: 'delete-primary-event',
      name: 'Delete Primary Server Event',
      toolInvocation: {
        toolName: 'delete_event',
        parameters: {
          guildId: '{{config.primary_guild_id}}',
          eventId: '{{results.create-primary-event.event_id}}'
        }
      }
    },
    
    {
      id: 'delete-secondary-events',
      name: 'Delete Secondary Server Events', 
      toolInvocation: {
        toolName: 'parallel_event_deletion',
        parameters: {
          events: '{{results.create-secondary-events.events}}'
        }
      }
    },

    {
      id: 'remove-promotions',
      name: 'Remove Event Promotions',
      toolInvocation: {
        toolName: 'bulk_message_deletion',
        parameters: {
          promotionMessages: '{{results.cross-promote-events.message_ids}}'
        }
      }
    },

    {
      id: 'cleanup-roles', 
      name: 'Clean Up Temporary Roles',
      toolInvocation: {
        toolName: 'bulk_role_deletion',
        parameters: {
          roles: '{{results.setup-cross-server-roles.created_roles}}'
        }
      }
    }
  ],

  timeout: { value: 10, unit: 'm' }
};

// Example 6: Dynamic Server Scaling Workflow
export const serverScalingWorkflow: WorkflowDefinition = {
  id: 'dynamic-server-scaling',
  name: 'Dynamic Server Scaling Based on Activity',
  version: '1.0.0',
  
  steps: [
    {
      id: 'monitor-server-activity',
      name: 'Monitor Server Activity Metrics',
      type: 'tool',
      tool: {
        name: 'get_server_stats',
        parameters: {
          includeMetrics: ['active_users', 'message_volume', 'voice_activity', 'new_members']
        }
      }
    },

    {
      id: 'calculate-scaling-needs',
      name: 'Calculate Scaling Requirements',
      type: 'condition',
      dependsOn: ['monitor-server-activity'],
      condition: {
        expression: 'results["monitor-server-activity"].active_users > 500 || results["monitor-server-activity"].message_volume > 1000',
        onTrue: 'scale-up',
        onFalse: 'check-scale-down',
        context: ['server_stats', 'scaling_thresholds']
      }
    },

    {
      id: 'scale-up',
      name: 'Scale Up Server Resources',
      type: 'parallel',
      parallel: {
        operations: [
          {
            name: 'create_voice_channel',
            parameters: {
              name: 'Overflow Voice {{context.timestamp}}',
              categoryId: '{{config.voice_category_id}}',
              userLimit: 10
            }
          },
          {
            name: 'create_text_channel', 
            parameters: {
              name: 'overflow-chat-{{context.timestamp}}',
              categoryId: '{{config.general_category_id}}',
              topic: 'Temporary channel for high activity periods'
            }
          },
          {
            name: 'send_message',
            parameters: {
              channelId: '{{config.announcements_channel_id}}',
              message: {
                embed: {
                  title: 'Server Scaled Up! 📈',
                  description: 'Additional channels created due to high activity',
                  color: '#00FF00'
                }
              }
            }
          }
        ],
        failureStrategy: 'continue-on-error'
      }
    },

    {
      id: 'check-scale-down',
      name: 'Check if Scale Down is Needed',
      type: 'condition',
      condition: {
        expression: 'results["monitor-server-activity"].active_users < 50 && context.has_overflow_channels',
        onTrue: 'scale-down',
        onFalse: 'maintain-current-scale'
      }
    },

    {
      id: 'scale-down',
      name: 'Scale Down Server Resources',
      type: 'tool',
      tool: {
        name: 'cleanup_overflow_channels',
        parameters: {
          maxAge: { value: 24, unit: 'h' },
          minActivity: 10,
          preserveWithActivity: true
        }
      }
    },

    {
      id: 'maintain-current-scale', 
      name: 'Maintain Current Scale',
      type: 'tool',
      tool: {
        name: 'log_scaling_decision',
        parameters: {
          decision: 'maintain',
          metrics: '{{results.monitor-server-activity}}',
          timestamp: '{{context.now()}}'
        }
      }
    }
  ],

  triggers: [
    {
      type: 'schedule',
      name: 'Hourly Scaling Check',
      schedule: '0 * * * *' // Every hour
    },
    {
      type: 'event',
      name: 'High Activity Trigger',
      eventPattern: {
        type: 'system.metric',
        data: {
          metric_name: 'active_users',
          value: { $gt: 400 }
        }
      }
    }
  ],

  errorHandling: {
    strategy: 'retry-then-fail',
    maxRetries: 2,
    retryDelay: 30000,
    deadLetterQueue: false
  },

  timeout: 300000, // 5 minutes
  
  parallelism: {
    maxConcurrent: 3,
    strategy: 'adaptive'
  }
};

export {
  serverSetupWorkflow,
  contentModerationComposite,
  memberOnboardingChain,
  raidDetectionCEP,
  multiServerEventSaga,
  serverScalingWorkflow
};