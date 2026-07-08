import asyncio
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import (
    google,
    noise_cancellation,
)
from prompt import INSTRUTION, RESPONSE

load_dotenv(".env")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions= INSTRUTION )

server = AgentServer(
    load_fnc=lambda: 0.0
)

@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    session = AgentSession(
    llm=google.realtime.RealtimeModel(
        voice="Puck",
        temperature=0.8,
        instructions= INSTRUTION ,
        )
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=None,
            ),
        ),
    )

    await session.generate_reply(
        instructions= RESPONSE
    )

    while ctx.room.isconnected():
        await asyncio.sleep(1)


if __name__ == "__main__":
    agents.cli.run_app(server)