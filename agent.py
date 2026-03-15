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

server = AgentServer()

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
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony() if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP else noise_cancellation.BVC(),
            ),
        ),
    )

    await session.generate_reply(
        instructions= RESPONSE
    )


if __name__ == "__main__":
    agents.cli.run_app(server)