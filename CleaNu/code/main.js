// main.js
// CommandProsses and CommandHandler
// ...other code

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  });
  
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
  });
  
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
  
    if (interaction.commandName === 'cleanu') {
      if (!interaction.member.permissions.has('Administrator')) {
        await interaction.reply({ 
          content: 'このコマンドは管理者のみが使用できます。', 
          ephemeral: true 
        });
        return;
      }
  
      const targetUser = interaction.options.getUser('user');
      const type = interaction.options.getString('type');
      const targetChannel = interaction.options.getString('channel');
  
      // チャンネルの取得処理
      let targetChannels = [];
      if (targetChannel) {
        // 特定のチャンネルが指定された場合
        const channelName = targetChannel.trim();
        const foundChannel = interaction.guild.channels.cache.find(
          ch => ch.name === channelName && ch.type === ChannelType.GuildText
        );
        
        if (!foundChannel) {
          await interaction.reply({
            content: `チャンネル "${channelName}" が見つかりませんでした。`,
            ephemeral: true
          });
          return;
        }
        targetChannels = [foundChannel];
      } else {
        // チャンネル指定がない場合は全テキストチャンネルを対象とする
        targetChannels = interaction.guild.channels.cache
          .filter(ch => ch.type === ChannelType.GuildText)
          .toArray();
      }
  
      await interaction.deferReply({ ephemeral: true });
  
      try {
        let totalDeleted = 0;
  
        for (const channel of targetChannels) {
          if (type === 'AllMessage') {
            let lastMessageId = null;
            
            while (true) {
              const options = { limit: 100 };
              if (lastMessageId) options.before = lastMessageId;
              
              const messages = await channel.messages.fetch(options);
              if (messages.size === 0) break;
              
              const userMessages = messages.filter(msg => msg.author.id === targetUser.id);
              if (messages.size > 0) {
                lastMessageId = messages.last().id;
              }
  
              // 2週間以内のメッセージはbulkDeleteで削除
              const recentMessages = userMessages.filter(msg => Date.now() - msg.createdTimestamp < 1209600000);
              if (recentMessages.size > 0) {
                await channel.bulkDelete(recentMessages);
              }
  
              // 2週間以上前のメッセージは個別に削除
              const oldMessages = userMessages.filter(msg => Date.now() - msg.createdTimestamp >= 1209600000);
              for (const message of oldMessages.values()) {
                await message.delete().catch(() => {});
              }
  
              totalDeleted += userMessages.size;
              
              // 進捗を更新
              await interaction.editReply(
                `${targetUser.username}のメッセージを${totalDeleted}件削除中...\n` +
                `現在のチャンネル: #${channel.name}`
              );
              
              if (messages.size < 100) break;
            }
          } else if (type === 'ValueMessage') {
            const value = interaction.options.getInteger('value');
            let deletedCount = 0;
            let lastMessageId = null;
  
            while (deletedCount < value) {
              const options = { limit: 100 };
              if (lastMessageId) options.before = lastMessageId;
  
              const messages = await channel.messages.fetch(options);
              if (messages.size === 0) break;
  
              const userMessages = messages.filter(msg => msg.author.id === targetUser.id);
              if (messages.size > 0) {
                lastMessageId = messages.last().id;
              }
  
              const remainingToDelete = value - deletedCount;
              const messagesToDelete = userMessages.first(remainingToDelete);
  
              // 2週間以内のメッセージはbulkDeleteで削除
              const recentMessages = messagesToDelete.filter(msg => Date.now() - msg.createdTimestamp < 1209600000);
              if (recentMessages.length > 0) {
                await channel.bulkDelete(recentMessages);
              }
  
              // 2週間以上前のメッセージは個別に削除
              const oldMessages = messagesToDelete.filter(msg => Date.now() - msg.createdTimestamp >= 1209600000);
              for (const message of oldMessages) {
                await message.delete().catch(() => {});
              }
  
              deletedCount += messagesToDelete.length;
              totalDeleted += messagesToDelete.length;
              
              await interaction.editReply(
                `${targetUser.username}のメッセージを${totalDeleted}/${value}件削除中...\n` +
                `現在のチャンネル: #${channel.name}`
              );
              
              if (messages.size < 100 || deletedCount >= value) break;
            }
          }
        }
  
        // 最終結果の表示
        const channelInfo = targetChannels.length === 1 
          ? `(#${targetChannels[0].name}で)` 
          : '(全チャンネルで)';
        await interaction.editReply(
          `${targetUser.username}のメッセージを${totalDeleted}件${channelInfo}削除しました。`
        );
      } catch (error) {
        console.error(error);
        await interaction.editReply('メッセージの削除中にエラーが発生しました。');
      }
    }
  });
  
  client.login(DISCORD_BOT_SECRET);