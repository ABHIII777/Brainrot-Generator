export type HighlightSegment = {
	id_: string;
	start_time: string;
	end_time: string;
	title: string;
};

export type FinishedVideo = {
	file_path: string;
	highlight: HighlightSegment;
};

export type HighlightsRequest = {
	video_url: string;
	subtitle_language: string;
	no_auto_subs: boolean;
};

export type HighlightsResponse = {
	video_id: string;
	highlights: HighlightSegment[];
	total_count: number;
};

export type GenerateVideoRequest = {
	video_url: string;
	highlights: HighlightSegment[];
};

export type GenerateVideoResponse = {
	job_id: string;
	status: "queued" | "downloading" | "generating" | "finished" | "error";
	message: string;
};

export type JobStreamUpdate = {
	job_id: string;
	status: "queued" | "downloading" | "generating" | "finished" | "error";
	progress?: number;
	current_task?: string;
	finished_videos: string[];
	error_message?: string;
	created_at: string;
	updated_at: string;
};

export type ReelUploadRequest = {
	file_path: string;
	title: string;
};

export type UploadReelsRequest = {
	reels_to_upload: ReelUploadRequest[];
};

export type UploadReelsResponse = {
	reel_links: string[]; // YouTube video URLs
};

export type DMFollowersRequest = {
	reel_links: string[]; // YouTube video URLs to share
	followers: string[];
};

export type DMStatusResponse = {
	dm_status: { [follower: string]: "sent" | "failed" };
};

export type FollowersResponse = {
	followers: string[];
};

export type AppStep = "url-submit" | "highlights-select" | "job-status" | "upload-reels" | "dm-followers" | "complete";

export type AppState = {
	currentStep: AppStep;
	videoUrl: string;
	highlights: HighlightSegment[];
	selectedHighlights: HighlightSegment[];
	jobId: string | null;
	language: string;
	noAutoSubs: boolean;
	finishedVideos: string[];
	reelLinks: string[];
};
