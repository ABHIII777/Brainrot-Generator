import json
import secrets
import string
import time

from dotenv import load_dotenv
from groq import BadRequestError, Groq, RateLimitError
from pydantic import BaseModel

from subtitles import srt_time_to_seconds


def _generate_id(length: int = 8) -> str:
    characters = string.ascii_letters + string.digits
    return "".join(secrets.choice(characters) for _ in range(length))


class HighlightSegment(BaseModel):
    start_time: str
    end_time: str
    title: str


class IDHighlightSegment(HighlightSegment):
    id_: str


def obey_valid_length(segment: IDHighlightSegment) -> bool:
    """
    Predicate function to check whether the segment obeys valid short duration.

    10s is too short, and 3 mins is YT's defined limit for a short.
    """
    start = srt_time_to_seconds(segment.start_time)
    end = srt_time_to_seconds(segment.end_time)
    duration = end - start
    max_video_len = 60 * 3  # 3 mins
    min_video_len = 10
    return min_video_len <= duration <= max_video_len


load_dotenv()


SYSTEM_MESSAGE = """
**Analyze the following podcast transcript, which is in SRT format, and identify key segments that would make excellent YouTube Shorts or TikTok videos. Each segment should be atleast 20s long.**

**Your Goal:** For each segment, provide the start time, end time, and a catchy, clickbaity title. You can use CAPS for emphasis, emojis and add hashtags as well for virality.

**Look for segments that contain:**
* Strong, controversial, or surprising statements.
* Highly emotional moments (laughter, frustration, excitement).
* Actionable advice, tips, or "hacks."
* A compelling short story or anecdote.
* A "mic drop" moment or a powerful concluding thought.
* A heated debate or a moment of clear disagreement.

**Output Format:**
For each identified segment, provide the following in JSON format:

- **Segment #:**
- **Start Time:** [Provide the start timestamp from the SRT file, e.g., HH:MM:SS,ms]
- **End Time:** [Provide the end timestamp from the SRT file, e.g., HH:MM:SS,ms]
- **Proposed Title:** [Your catchy, clickbaity title]
""".strip()


class HighlightExtractor:
    def __init__(self) -> None:
        self.client = Groq()

    def extract(self, subtitle_chunk: str) -> list[IDHighlightSegment]:
        print("Extracting highlights from subtitle chunk...")
        retries = 5
        delay = 15  # seconds

        for i in range(retries):
            try:
                response = self.client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=[
                        {"role": "system", "content": SYSTEM_MESSAGE},
                        {"role": "user", "content": subtitle_chunk},
                    ],
                    temperature=1,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": "highlight_extraction",
                            "strict": True,
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "highlights": {
                                        "type": "array",
                                        "items": HighlightSegment.model_json_schema()
                                        | {"additionalProperties": False},
                                    }
                                },
                                "required": ["highlights"],
                                "additionalProperties": False,
                            },
                        },
                    },
                )

                segments_raw = json.loads(response.choices[0].message.content)[
                    "highlights"
                ]
                segments: list[HighlightSegment] = [
                    HighlightSegment.model_validate(s) for s in segments_raw
                ]
                return [
                    IDHighlightSegment(id_=_generate_id(), **s.model_dump())
                    for s in segments
                ]
            except (RateLimitError, BadRequestError) as e:
                # RateLimitError → the 429 token-burst limit, handled by backoff.
                # BadRequestError → Groq's strict-JSON validator rejecting empty
                # or schema-nonconforming output (`json_validate_failed`), a
                # stochastic failure of reasoning models; a reroll usually
                # succeeds. Deterministic errors (e.g. 413 size) still propagate.
                if i < retries - 1:
                    print(
                        f"Groq call failed. Retrying in {delay} seconds... ({i + 1}/{retries})"
                    )
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                else:
                    print("Max retries reached. Failed to extract highlights.")
                    raise e
        return []


if __name__ == "__main__":
    gcm = HighlightExtractor()
    with open("./subs.srt") as f:
        print(gcm.extract("".join(f.readlines(1000))))
