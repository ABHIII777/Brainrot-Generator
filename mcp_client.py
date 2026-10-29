# import logging
import asyncio
import json
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from mcp_use import MCPAgent, MCPClient
from publish import upload_short


# logging.basicConfig(level=logging.INFO)


class MCPAgentRunner:
    """Reusable class to run MCPAgent queries."""

    def __init__(self):
        load_dotenv()
        config = {"mcpServers": {"instagram_dms": {"url": "http://localhost:8000/sse"}}}
        self.client = MCPClient.from_dict(config)
        self.llm = ChatGroq(
            model="openai/gpt-oss-20b", api_key=os.environ["GROQ_API_KEY"]
        )
        self.agent: MCPAgent | None = None
        self._init_lock = asyncio.Lock()
        self._initialized = False

    async def initialize(self):
        async with self._init_lock:
            if not self._initialized:
                await self.client.create_all_sessions()
                self.agent = MCPAgent(llm=self.llm, client=self.client, max_steps=30)
                self._initialized = True

    async def run(self, query: str):
        await self.initialize()
        if self.agent:
            return await self.agent.run(query)
        return None

    async def get_followers(self):
        await self.initialize()
        if not self.agent:
            return None

        output = await self.agent.run(
            f"Give me the list of my followers: {os.environ["INSTAGRAM_USERNAME"]}. The output format must be strictly json with a `followers` key that contains an array of all usernames."
        )
        res = json.loads(output.replace("```json", "").replace("```", ""))
        return res["followers"]

    async def upload_reels_and_stories(self, file_paths: list[dict[str, str]]):
        """
        Uploads videos to YouTube as Shorts.
        Args:
            file_paths: List of dicts with 'file_path' and 'title'.
        Returns:
            List of uploaded YouTube video URLs.
        """
        await self.initialize()
        if not self.agent:
            return []

        uploaded_videos = []
        for video in file_paths:
            try:
                # Upload to YouTube using the publish.py functionality
                video_path = video["file_path"]
                title = video["title"]

                # Create a description with hashtags for better discoverability
                description = f"{title}\n\n#Shorts #Viral #AI #Content"

                # Upload to YouTube
                response = upload_short(
                    video_path=video_path,
                    title=title,
                    description=description,
                    tags=["shorts", "viral", "ai", "content", "highlights"],
                )

                # Construct YouTube URL from video ID
                video_id = response.get("id")
                if video_id:
                    youtube_url = f"https://www.youtube.com/watch?v={video_id}"
                    uploaded_videos.append(youtube_url)
                    print(f"✅ Uploaded to YouTube: {youtube_url}")
                else:
                    print(f"❌ Failed to get video ID for {video_path}")

            except Exception as e:
                print(f"❌ Failed to upload {video.get('file_path', 'unknown')}: {e}")
                continue

        return uploaded_videos

    async def dm_followers_with_reels(
        self, reel_links: list[str], followers: list[str]
    ):
        """
        Sends YouTube video links to Instagram followers via DM.
        Args:
            reel_links: List of YouTube video URLs.
            followers: List of follower usernames.
        Returns:
            Dict with DM status for each follower (flattened across all videos).
        """
        await self.initialize()
        if not self.agent:
            return {}

        dm_status = {}
        for video_url in reel_links:
            for follower in followers:
                dm_query = f"Send a DM to {follower} with my new YouTube Short: {video_url}. Add a nice message about checking out the content. Confirm with JSON: {{'dm_sent': true}}."
                dm_result = await self.agent.run(dm_query)
                try:
                    result = json.loads(dm_result.replace("```json", "").replace("```", ""))
                    print(result)
                    # Convert boolean to "sent"/"failed" and track overall status per follower
                    sent = result.get("success", False) or result.get("dm_sent", False)
                    status = "sent" if sent else "failed"
                    # If any video fails for a follower, mark them as failed
                    if follower not in dm_status or dm_status[follower] == "sent":
                        dm_status[follower] = status
                except Exception as e:
                    print(e)
                    dm_status[follower] = "failed"

        return dm_status
