"""Post clearly labelled MVP demo activity into Agentcy Discord channels."""

import asyncio
import os

import discord

MESSAGES = {
    "agentcy-command-center": (
        "[DEMO] New client intake: Harbor & Pine Hospitality is evaluating a spring campaign. "
        "Next step: qualify goals, budget range, and launch date."
    ),
    "agentcy-employee-work": (
        "[DEMO TASK] Engineering: validate Telegram inbound idempotency, then post the result here. "
        "Reminder is due today at 16:00 UTC."
    ),
    "agentcy-client-escalations": (
        "[DEMO CLIENT DETAIL] Northstar Marketing is active. Services: paid media and campaign strategy. "
        "Current priority: Q4 demand-generation launch."
    ),
    "agentcy-approvals": (
        "[DEMO APPROVAL] Client reply draft is ready for review. It acknowledges the request "
        "without committing to a timeline or price."
    ),
    "agentcy-agent-activity": (
        "[DEMO ACTIVITY] Support agent received a Telegram message, resolved client identity, "
        "stored the thread, and queued the correct route."
    ),
    "agentcy-ceo-briefings": (
        "[DEMO PROJECT UPDATE] New project: Harbor & Pine Spring Launch. "
        "Status: discovery. Owner assignment and timeline approval are pending."
    ),
    "agentcy-ops-alerts": (
        "[DEMO ISSUE] Reminder: check the inbound support queue before end of day. "
        "The web UI, database, Redis, and Telegram worker are healthy."
    ),
    "agentcy-setup-and-context": (
        "[DEMO CONTEXT] Mosaic Creative Studio is active. Services: brand identity and content production. "
        "Current priority: hospitality-client brand-system rollout."
    ),
}


class DemoPoster(discord.Client):
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
            channels = await guild.fetch_channels()
            by_name = {channel.name: channel for channel in channels if isinstance(channel, discord.TextChannel)}
            for channel_name, content in MESSAGES.items():
                channel = by_name.get(channel_name)
                if channel is None:
                    raise RuntimeError(f"missing expected channel {channel_name}")
                await channel.send(content)
                print(f"Posted demo update to #{channel_name}")
        except Exception as error:
            self.failure = error
        finally:
            await self.close()


async def main() -> None:
    token = os.environ["DISCORD_BOT_TOKEN"]
    home_channel_id = int(os.environ["DISCORD_HOME_CHANNEL"])
    client = DemoPoster(home_channel_id)
    await client.start(token)
    if client.failure is not None:
        raise client.failure


if __name__ == "__main__":
    asyncio.run(main())
