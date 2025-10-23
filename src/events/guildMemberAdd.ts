import { Guild, Invite, GuildMember } from 'discord.js';
import { DiscordBot } from '../index';
import { updateBattlePassProgress } from '../services/battlepass/updateBattlePassProgress';

const inviteCache = new Map<string, Map<string, number>>(); // guildId -> code -> uses

export async function updateInviteCache(guild: Guild) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites) return;
    const cache = new Map<string, number>();
    // invites is Collection<string, Invite>
    invites.forEach((invite: Invite) => {
        cache.set(invite.code, invite.uses ?? 0);
    });
    inviteCache.set(guild.id, cache);
}

export default async function guildMemberAdd(bot: DiscordBot, member: GuildMember) {
    try {
        const guild = member.guild;

        let inviterId: string | undefined = undefined;
        let foundInvite: Invite | null = null; // <--- Обязательно типизируй!

        const invites = await guild.invites.fetch().catch(() => null);
        if (invites && inviteCache.has(guild.id)) {
            const prevCache = inviteCache.get(guild.id)!;
            for (const invite of invites.values()) {
                const oldUses = prevCache.get(invite.code) ?? 0;
                if ((invite.uses ?? 0) > oldUses && invite.inviter?.id) {
                    foundInvite = invite;
                    break; // нашли — выходим из цикла
                }
            }
            if (foundInvite && foundInvite.inviter?.id) {
                inviterId = foundInvite.inviter.id;
            }
        }

        if (inviterId) {
            await updateBattlePassProgress({
                bot,
                userId: inviterId,
                guildId: guild.id,
                type: 'invites',
                amount: 1,
                isDaily: true,
                channel: null
            });
        }
        await updateInviteCache(guild);

    } catch (error) {
        console.error('Error in guildMemberAdd:', error);
    }
}