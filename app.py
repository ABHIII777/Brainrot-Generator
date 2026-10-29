import asyncio
import json
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from urllib.parse import urlparse
import threading

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from download_video import download_video
from highlights import HighlightExtractor, IDHighlightSegment, obey_valid_length
from subtitles import chunk_subtitles, download_subtitles
from video_gen import ShortGenerator
from fastapi import Body
from mcp_client import MCPAgentRunner

origins = [
    "*",
]


app = FastAPI(title="Yapper Video Processing API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
mcp_agent_runner = MCPAgentRunner()

# Configuration
GAMEPLAYS_PATH = "./gameplays"
MAX_HIGHLIGHT_WORKERS = 10
MAX_VIDEO_WORKERS = 4

# Global storage for video generation status
video_generation_jobs: Dict[str, dict] = {}

# Video generation queue and worker pool
video_generation_queue = []
video_generation_executor = ThreadPoolExecutor(max_workers=MAX_VIDEO_WORKERS)
generation_lock = threading.Lock()


class VideoGenerationStatus(Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    GENERATING = "generating"
    FINISHED = "finished"
    ERROR = "error"


class HighlightsRequest(BaseModel):
    video_url: str
    subtitle_language: str = "en"
    no_auto_subs: bool = False


class HighlightsResponse(BaseModel):
    video_id: str
    highlights: List[IDHighlightSegment]
    total_count: int


class GenerateVideoRequest(BaseModel):
    video_url: str
    highlights: List[IDHighlightSegment]


class VideoGenerationResponse(BaseModel):
    job_id: str
    status: VideoGenerationStatus
    message: str


class VideoGenerationStatusResponse(BaseModel):
    job_id: str
    status: VideoGenerationStatus
    progress: Optional[int] = None
    current_task: Optional[str] = None
    finished_videos: List[str] = []
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


def get_yt_video_id(url: str) -> str:
    """Extract YouTube video ID from URL"""
    parsed = urlparse(url)
    if not parsed.query:
        raise ValueError(f"{url} doesn't have a query param")

    query_params = {
        item.split("=")[0]: item.split("=")[1] for item in parsed.query.split("&")
    }

    if "v" not in query_params:
        raise ValueError(f"No video ID found in URL: {url}")

    return query_params["v"]


def process_queue():
    """Process the video generation queue"""
    with generation_lock:
        # Check if we have capacity and jobs in queue
        active_jobs = sum(
            1
            for job in video_generation_jobs.values()
            if job["status"]
            in [VideoGenerationStatus.DOWNLOADING, VideoGenerationStatus.GENERATING]
        )

        while active_jobs < MAX_VIDEO_WORKERS and video_generation_queue:
            job_id = video_generation_queue.pop(0)
            if job_id in video_generation_jobs:
                # Submit job to executor
                video_generation_executor.submit(process_video_generation, job_id)
                active_jobs += 1


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Yapper Video Processing API is running!"}


@app.get("/test-job")
async def create_test_job():
    """Create a test job for SSE testing"""
    job_id = str(uuid.uuid4())

    # Create a test job that goes through all states
    video_generation_jobs[job_id] = {
        "job_id": job_id,
        "status": VideoGenerationStatus.QUEUED,
        "progress": 0,
        "current_task": "Test job created",
        "finished_videos": [],
        "error_message": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "video_id": "test",
        "video_url": "test",
        "highlights": [],
    }

    # Start a test process
    def test_process():
        import time

        job_data = video_generation_jobs[job_id]

        # Simulate different states
        time.sleep(2)
        job_data.update(
            {
                "status": VideoGenerationStatus.DOWNLOADING,
                "current_task": "Downloading test video...",
                "progress": 25,
                "updated_at": datetime.now(),
            }
        )

        time.sleep(3)
        job_data.update(
            {
                "status": VideoGenerationStatus.GENERATING,
                "current_task": "Generating test clips...",
                "progress": 75,
                "updated_at": datetime.now(),
            }
        )

        time.sleep(2)
        job_data.update(
            {
                "status": VideoGenerationStatus.FINISHED,
                "current_task": "Completed!",
                "progress": 100,
                "finished_videos": ["./output/test/test_video.mp4"],
                "updated_at": datetime.now(),
            }
        )

    video_generation_executor.submit(test_process)

    return {"job_id": job_id, "message": "Test job created"}


@app.post("/highlights", response_model=HighlightsResponse)
async def extract_highlights(request: HighlightsRequest):
    """
    Extract highlights from a YouTube video.

    - **video_url**: YouTube video URL
    - **subtitle_language**: Language code for subtitles (e.g., 'en', 'hi')
    - **no_auto_subs**: Whether to skip auto-generated subtitles
    """
    try:
        video_id = get_yt_video_id(request.video_url)
        print(f"Processing video with ID: {video_id}")

        # File paths
        subtitles_file = f"subs_{video_id}.srt"
        highlights_file = f"highlights_{video_id}.json"

        # Check if highlights are cached
        if os.path.exists(highlights_file):
            try:
                with open(highlights_file) as f:
                    cached_highlights = json.load(f)
                segments = [IDHighlightSegment(**s) for s in cached_highlights]
                print("Found cached highlights, returning them.")
                return HighlightsResponse(
                    video_id=video_id, highlights=segments, total_count=len(segments)
                )
            except Exception as e:
                print(f"Failed to load cached highlights: {e}")

        # Download subtitles if not cached
        if not os.path.exists(subtitles_file):
            print("Downloading subtitles...")
            download_subtitles(
                request.video_url,
                subtitles_file,
                request.subtitle_language,
                not request.no_auto_subs,
            )
        else:
            print("Subtitles exist, skipping download.")

        # Extract highlights
        print("Extracting highlights...")
        subtitle_chunks = chunk_subtitles(subtitles_file)
        he = HighlightExtractor()

        with ThreadPoolExecutor(
            max_workers=min(MAX_HIGHLIGHT_WORKERS, len(subtitle_chunks))
        ) as pool:
            segments = list(pool.map(he.extract, subtitle_chunks))

        # Flatten and filter segments
        flattened_segments = [s for ss in segments for s in ss if obey_valid_length(s)]
        print(f"Found {len(flattened_segments)} valid segments.")

        # Cache highlights
        with open(highlights_file, "w") as f:
            json.dump([fs.model_dump() for fs in flattened_segments], f)

        return HighlightsResponse(
            video_id=video_id,
            highlights=flattened_segments,
            total_count=len(flattened_segments),
        )

    except Exception as e:
        print(f"Error extracting highlights: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to extract highlights: {str(e)}"
        )


@app.post("/generate", response_model=VideoGenerationResponse)
async def generate_videos(request: GenerateVideoRequest):
    """
    Generate short videos from highlights.

    - **video_url**: YouTube video URL
    - **highlights**: List of highlight segments to generate videos from
    """
    try:
        video_id = get_yt_video_id(request.video_url)
        job_id = str(uuid.uuid4())

        # Initialize job status
        video_generation_jobs[job_id] = {
            "job_id": job_id,
            "status": VideoGenerationStatus.QUEUED,
            "progress": 0,
            "current_task": "Initializing...",
            "finished_videos": [],
            "error_message": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "video_id": video_id,
            "video_url": request.video_url,
            "highlights": request.highlights,
        }

        # Add to queue and start processing
        with generation_lock:
            video_generation_queue.append(job_id)

        # Start background processing if not already running
        process_queue()

        return VideoGenerationResponse(
            job_id=job_id,
            status=VideoGenerationStatus.QUEUED,
            message="Video generation job queued successfully",
        )

    except Exception as e:
        print(f"Error starting video generation: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to start video generation: {str(e)}"
        )


@app.get("/generate/{job_id}/status")
async def get_generation_status(job_id: str):
    """
    Get the status of a video generation job.

    - **job_id**: The job ID returned from the generate endpoint
    """
    if job_id not in video_generation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return video_generation_jobs[job_id]


@app.get("/generate/{job_id}/stream")
async def stream_generation_status(job_id: str):
    """
    Stream the status of a video generation job using Server-Sent Events.

    - **job_id**: The job ID returned from the generate endpoint
    """
    if job_id not in video_generation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def generate_status_updates():
        try:
            while True:
                if job_id not in video_generation_jobs:
                    break

                job_data = video_generation_jobs[job_id]
                job_data_to_send = job_data.copy()
                job_data_to_send["status"] = job_data_to_send["status"].value
                # Proper SSE format with data: prefix and double newline
                yield f"data: {json.dumps(job_data_to_send, default=str)}\n\n"

                # Stop streaming if job is finished or errored
                if job_data["status"] in [
                    VideoGenerationStatus.FINISHED,
                    VideoGenerationStatus.ERROR,
                ]:
                    break

                await asyncio.sleep(1)  # Update every second
        except Exception as e:
            print(f"SSE Error: {e}")
            yield f"data: {json.dumps({'error': str(e)}, default=str)}\n\n"

    return StreamingResponse(
        generate_status_updates(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.get("/jobs")
async def list_jobs():
    """List all video generation jobs with queue information"""
    with generation_lock:
        queue_info = {
            "queued_jobs": len(video_generation_queue),
            "active_jobs": sum(
                1
                for job in video_generation_jobs.values()
                if job["status"]
                in [VideoGenerationStatus.DOWNLOADING, VideoGenerationStatus.GENERATING]
            ),
            "max_concurrent": MAX_VIDEO_WORKERS,
        }

    return {"jobs": list(video_generation_jobs.values()), "queue_info": queue_info}


@app.get("/queue/status")
async def get_queue_status():
    """Get current queue status"""
    with generation_lock:
        active_jobs = [
            job
            for job in video_generation_jobs.values()
            if job["status"]
            in [VideoGenerationStatus.DOWNLOADING, VideoGenerationStatus.GENERATING]
        ]
        queued_jobs = [
            video_generation_jobs[job_id]
            for job_id in video_generation_queue
            if job_id in video_generation_jobs
        ]

        return {
            "queue_length": len(video_generation_queue),
            "active_count": len(active_jobs),
            "max_concurrent": MAX_VIDEO_WORKERS,
            "available_slots": MAX_VIDEO_WORKERS - len(active_jobs),
            "queued_jobs": queued_jobs,
            "active_jobs": active_jobs,
        }


@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a video generation job"""
    if job_id not in video_generation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    del video_generation_jobs[job_id]
    return {"message": "Job deleted successfully"}


@app.get("/files/{file_path:path}")
async def serve_file(file_path: str):
    """Serve generated video files"""
    # Decode the file path
    import urllib.parse

    decoded_path = urllib.parse.unquote(file_path)

    # Ensure the file exists and is within allowed directories
    if not os.path.exists(decoded_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Security check: ensure file is in output directory
    abs_path = os.path.abspath(decoded_path)
    output_dir = os.path.abspath("./output")

    if not abs_path.startswith(output_dir):
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        path=decoded_path,
        filename=os.path.basename(decoded_path),
        media_type="video/mp4",
    )


@app.get("/download/{file_path:path}")
async def download_file(file_path: str):
    """Download generated video files"""
    # Decode the file path
    import urllib.parse

    decoded_path = urllib.parse.unquote(file_path)

    # Ensure the file exists and is within allowed directories
    if not os.path.exists(decoded_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Security check: ensure file is in output directory
    abs_path = os.path.abspath(decoded_path)
    output_dir = os.path.abspath("./output")

    if not abs_path.startswith(output_dir):
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        path=decoded_path,
        filename=os.path.basename(decoded_path),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f"attachment; filename={os.path.basename(decoded_path)}"
        },
    )


def process_video_generation(job_id: str):
    """Background task to process video generation"""
    job_data = video_generation_jobs[job_id]

    try:
        video_id = job_data["video_id"]
        video_url = job_data["video_url"]
        highlights = [
            IDHighlightSegment(**h) if isinstance(h, dict) else h
            for h in job_data["highlights"]
        ]

        # Update status
        job_data.update(
            {
                "status": VideoGenerationStatus.DOWNLOADING,
                "current_task": "Downloading video...",
                "updated_at": datetime.now(),
            }
        )

        # Setup paths
        vid_name = f"clip_{video_id}"
        input_vid_path = os.path.join("./input", f"{vid_name}.webm")
        input_vid_wo_ext = os.path.join("./input", vid_name)
        output_vids_dir = os.path.join("./output", video_id)

        # Download video if not exists
        if not os.path.exists(input_vid_path):
            download_video(video_url, input_vid_wo_ext)

        # Update status
        job_data.update(
            {
                "status": VideoGenerationStatus.GENERATING,
                "current_task": "Generating video clips...",
                "progress": 10,
                "updated_at": datetime.now(),
            }
        )

        # Create output directory
        os.makedirs(output_vids_dir, exist_ok=True)

        # Generate videos
        short_gen = ShortGenerator(input_vid_path, GAMEPLAYS_PATH, output_vids_dir)

        total_highlights = len(highlights)
        finished_videos = []

        for i, highlight in enumerate(highlights):
            try:
                job_data.update(
                    {
                        "current_task": f"Generating video {i + 1}/{total_highlights}: {highlight.title}",
                        "progress": 10 + int((i / total_highlights) * 80),
                        "updated_at": datetime.now(),
                    }
                )

                # Generate the video
                short_gen.generate_short_clip(highlight)

                # Check if video was created
                video_path = os.path.join(output_vids_dir, f"out_{highlight.id_}.mp4")
                if os.path.exists(video_path):
                    finished_videos.append(video_path)
                    job_data["finished_videos"] = finished_videos

            except Exception as e:
                print(f"Error generating video for highlight {highlight.id_}: {e}")
                continue

        # Final update
        job_data.update(
            {
                "status": VideoGenerationStatus.FINISHED,
                "current_task": "Completed!",
                "progress": 100,
                "finished_videos": finished_videos,
                "updated_at": datetime.now(),
            }
        )

    except Exception as e:
        print(f"Error in video generation job {job_id}: {e}")
        job_data.update(
            {
                "status": VideoGenerationStatus.ERROR,
                "error_message": str(e),
                "updated_at": datetime.now(),
            }
        )

    # Process next items in queue when this job finishes
    process_queue()


@app.get("/mcp-agent/followers")
async def get_followers():
    """
    Get follower list.
    """
    try:
        result = await mcp_agent_runner.get_followers()
        return {"followers": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


class ReelUploadRequest(BaseModel):
    file_path: str
    title: str


class UploadReelsRequest(BaseModel):
    reels_to_upload: list[ReelUploadRequest]


class DMFollowersRequest(BaseModel):
    reel_links: list[str]
    followers: list[str]


@app.post("/mcp-agent/upload-reels")
async def upload_reels(req: UploadReelsRequest):
    """
    Upload videos to YouTube as Shorts.
    """
    try:
        result = await mcp_agent_runner.upload_reels_and_stories(
            [r.model_dump() for r in req.reels_to_upload]
        )
        return {"reel_links": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.post("/mcp-agent/dm-followers")
async def dm_followers(req: DMFollowersRequest):
    """
    Send DMs to followers with the provided reel links.
    """
    try:
        result = await mcp_agent_runner.dm_followers_with_reels(
            req.reel_links, req.followers
        )
        print(f"DM follower {result=}")
        return {"dm_status": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.post("/mcp-agent/run")
async def run_mcp_agent(query: str = Body(..., embed=True)):
    """
    Run a query using the MCPAgent.
    - **query**: The query string to run
    """
    try:
        result = await mcp_agent_runner.run(query)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
