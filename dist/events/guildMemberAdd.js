"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInviteCache = updateInviteCache;
exports.default = guildMemberAdd;
const updateBattlePassProgress_1 = require("../services/battlepass/updateBattlePassProgress");
const inviteCache = new Map(); // guildId -> code -> uses
async function updateInviteCache(guild) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites)
        return;
    const cache = new Map();
    // invites is Collection<string, Invite>
    invites.forEach((invite) => {
        cache.set(invite.code, invite.uses ?? 0);
    });
    inviteCache.set(guild.id, cache);
}
async function guildMemberAdd(bot, member) {
    try {
        const guild = member.guild;
        let inviterId = undefined;
        let foundInvite = null; // <--- Обязательно типизируй!
        const invites = await guild.invites.fetch().catch(() => null);
        if (invites && inviteCache.has(guild.id)) {
            const prevCache = inviteCache.get(guild.id);
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
            await (0, updateBattlePassProgress_1.updateBattlePassProgress)({
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
    }
    catch (error) {
        console.error('Error in guildMemberAdd:', error);
    }
}
//# sourceMappingURL=guildMemberAdd.js.map