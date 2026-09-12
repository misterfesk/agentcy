"""Populate each Agentcy Discord channel with a realistic demo activity history."""

import asyncio
import os

import discord

BASE_UPDATES = (
    "[DEMO] Intake logged: Harbor & Pine Hospitality requested a spring campaign discovery call.",
    "[DEMO] Client context refreshed: Northstar Marketing remains active on paid media and campaign strategy.",
    "[DEMO] Work update: campaign brief review is in progress; no customer commitment has been sent.",
    "[DEMO] Reminder: confirm the next owner before the work item becomes overdue.",
    "[DEMO] Internal note: scope-sensitive requests require approval before an external reply.",
    "[DEMO] Project signal: Harbor & Pine Spring Launch is in discovery, with timeline still pending approval.",
    "[DEMO] Delivery signal: Mosaic Creative Studio needs a brand-system review attendee list.",
    "[DEMO] Daily check: open work is visible, client context is stored, and the team can follow linked activity.",
)

CHANNEL_CONTEXT = {
    "agentcy-command-center": "Command Center",
    "agentcy-employee-work": "Employee Work",
    "agentcy-client-escalations": "Client Escalation",
    "agentcy-approvals": "Approval Queue",
    "agentcy-agent-activity": "Agent Activity",
    "agentcy-ceo-briefings": "CEO Briefing",
    "agentcy-ops-alerts": "Operations Alert",
    "agentcy-setup-and-context": "Agency Context",
}


class VolumePoster(discord.Client):
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
            by_name = {
                channel.name: channel
                for channel in channels
                if isinstance(channel, discord.TextChannel)
            }
            for channel_name, context in CHANNEL_CONTEXT.items():
                channel = by_name.get(channel_name)
                if channel is None:
                    raise RuntimeError(f"missing channel {channel_name}")
                for number, update in enumerate(BASE_UPDATES, start=1):
                    await channel.send(f"{update} [{context} update {number}/8]")
                print(f"Posted 8 additional messages to #{channel_name}")
        except Exception as error:
            self.failure = error
        finally:
            await self.close()


async def main() -> None:
    client = VolumePoster(int(os.environ["DISCORD_HOME_CHANNEL"]))
    await client.start(os.environ["DISCORD_BOT_TOKEN"])
    if client.failure is not None:
        raise client.failure


if __name__ == "__main__":
    asyncio.run(main())
