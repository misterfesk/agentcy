"""Inspect Agentcy Discord members and assign operational roles idempotently."""

import asyncio
import os

import discord

ROLE_ASSIGNMENTS = {"misterfesk": "CEO", "yoti": "Engineer"}


def required_environment(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


class RoleProvisioner(discord.Client):
    def __init__(self, home_channel_id: int) -> None:
        super().__init__(intents=discord.Intents.none())
        self.home_channel_id = home_channel_id
        self.failure: Exception | None = None

    async def on_ready(self) -> None:
        try:
            home_channel = await self.fetch_channel(self.home_channel_id)
            channel_guild = getattr(home_channel, "guild", None)
            guild_id = getattr(channel_guild, "id", None) or getattr(home_channel, "guild_id", None)
            if guild_id is None:
                raise RuntimeError("DISCORD_HOME_CHANNEL is not a guild channel")
            guild = await self.fetch_guild(guild_id)
            try:
                members = [member async for member in guild.fetch_members(limit=None)]
            except discord.ClientException:
                members_by_id: dict[int, discord.Member] = {}
                for channel in await guild.fetch_channels():
                    if not isinstance(channel, discord.TextChannel):
                        continue
                    async for message in channel.history(limit=100):
                        members_by_id[message.author.id] = await guild.fetch_member(
                            message.author.id
                        )
                members = list(members_by_id.values())
            print("Observed members:", ", ".join(sorted(member.name for member in members)))
            roles = {role.name: role for role in await guild.fetch_roles()}
            for username, role_name in ROLE_ASSIGNMENTS.items():
                matching_members = [
                    member for member in members if member.name.lower() == username
                ]
                if len(matching_members) != 1:
                    raise RuntimeError(
                        f"expected one Discord member named {username}, "
                        f"found {len(matching_members)}"
                    )
                role = roles.get(role_name)
                if role is None:
                    role = await guild.create_role(name=role_name, reason="Provision Agentcy roles")
                    roles[role_name] = role
                member = matching_members[0]
                if role not in member.roles:
                    await member.add_roles(role, reason="Provision Agentcy roles")
                print(f"Assigned {role_name} to {member.name}")
        except Exception as error:
            self.failure = error
        finally:
            await self.close()


async def main() -> None:
    token = required_environment("DISCORD_BOT_TOKEN")
    home_channel_id = int(required_environment("DISCORD_HOME_CHANNEL"))
    client = RoleProvisioner(home_channel_id)
    await client.start(token)
    if client.failure is not None:
        raise client.failure


if __name__ == "__main__":
    asyncio.run(main())
