"""Create Agentcy's internal Discord workspace structure idempotently."""

import asyncio
import os
from collections.abc import Iterable

import discord

CATEGORY_NAME = "AGENTCY OPERATIONS"
CHANNELS = (
    "agentcy-command-center",
    "agentcy-employee-work",
    "agentcy-client-escalations",
    "agentcy-approvals",
    "agentcy-agent-activity",
    "agentcy-ceo-briefings",
    "agentcy-ops-alerts",
    "agentcy-setup-and-context",
)


def required_environment(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def matching_category(
    categories: Iterable[discord.CategoryChannel],
) -> discord.CategoryChannel | None:
    return next((category for category in categories if category.name == CATEGORY_NAME), None)


class Provisioner(discord.Client):
    def __init__(self, home_channel_id: int) -> None:
        super().__init__(intents=discord.Intents.none())
        self.home_channel_id = home_channel_id
        self.created: list[str] = []
        self.existing: list[str] = []
        self.failure: Exception | None = None

    async def on_ready(self) -> None:
        try:
            home_channel = await self.fetch_channel(self.home_channel_id)
            guild = getattr(home_channel, "guild", None)
            guild_id = getattr(guild, "id", None) or getattr(home_channel, "guild_id", None)
            if guild_id is None:
                raise RuntimeError("DISCORD_HOME_CHANNEL is not a guild channel")
            guild = await self.fetch_guild(guild_id)
            channels = await guild.fetch_channels()
            category = matching_category(
                channel for channel in channels if isinstance(channel, discord.CategoryChannel)
            )
            if category is None:
                category = await guild.create_category(
                    CATEGORY_NAME,
                    reason="Provision Agentcy workspace",
                )
                self.created.append(CATEGORY_NAME)

            existing_names = {
                channel.name for channel in channels if isinstance(channel, discord.TextChannel)
            }
            for channel_name in CHANNELS:
                if channel_name in existing_names:
                    self.existing.append(channel_name)
                    continue
                await guild.create_text_channel(
                    channel_name,
                    category=category,
                    reason="Provision Agentcy workspace",
                )
                self.created.append(channel_name)
        except Exception as error:
            self.failure = error
        finally:
            await self.close()


async def main() -> None:
    token = required_environment("DISCORD_BOT_TOKEN")
    home_channel_id = int(required_environment("DISCORD_HOME_CHANNEL"))
    client = Provisioner(home_channel_id)
    await client.start(token)
    if client.failure is not None:
        raise client.failure
    print(f"Created: {', '.join(client.created) or 'none'}")
    print(f"Already present: {', '.join(client.existing) or 'none'}")


if __name__ == "__main__":
    asyncio.run(main())
