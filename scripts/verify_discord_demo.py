"""Verify Agentcy demo messages exist in every internal Discord channel."""

import asyncio
import os

import discord

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


class Verifier(discord.Client):
    def __init__(self, home_channel_id: int) -> None:
        super().__init__(intents=discord.Intents.none())
        self.home_channel_id = home_channel_id
        self.failure: Exception | None = None

    async def on_ready(self) -> None:
        try:
            home = await self.fetch_channel(self.home_channel_id)
            guild_ref = getattr(home, "guild", None)
            guild_id = getattr(guild_ref, "id", None) or getattr(home, "guild_id", None)
            if guild_id is None:
                raise RuntimeError("DISCORD_HOME_CHANNEL is not a guild channel")
            guild = await self.fetch_guild(guild_id)
            by_name = {
                channel.name: channel
                for channel in await guild.fetch_channels()
                if isinstance(channel, discord.TextChannel)
            }
            for channel_name in CHANNELS:
                channel = by_name.get(channel_name)
                if channel is None:
                    raise RuntimeError(f"missing channel {channel_name}")
                messages = [message async for message in channel.history(limit=20)]
                demo_count = sum(message.content.startswith("[DEMO") for message in messages)
                print(f"#{channel_name}: demo_messages={demo_count}")
                if demo_count == 0:
                    raise RuntimeError(f"no demo message in #{channel_name}")
        except Exception as error:
            self.failure = error
        finally:
            await self.close()


async def main() -> None:
    client = Verifier(int(os.environ["DISCORD_HOME_CHANNEL"]))
    await client.start(os.environ["DISCORD_BOT_TOKEN"])
    if client.failure is not None:
        raise client.failure


if __name__ == "__main__":
    asyncio.run(main())
