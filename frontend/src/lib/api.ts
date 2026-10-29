import type { HighlightsRequest, HighlightsResponse, GenerateVideoRequest, GenerateVideoResponse, JobStreamUpdate, UploadReelsRequest, UploadReelsResponse, DMFollowersRequest, DMStatusResponse, FollowersResponse } from './types';

export const API_BASE_URL = 'http://localhost:8001';

export class APIError extends Error {
	public status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'APIError';
		this.status = status;
	}
}

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
		...options,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new APIError(response.status, errorText || response.statusText);
	}

	return response.json();
}

export async function extractHighlights(request: HighlightsRequest): Promise<HighlightsResponse> {
	return fetchJSON<HighlightsResponse>('/highlights', {
		method: 'POST',
		body: JSON.stringify(request),
	});
}

export async function generateVideos(request: GenerateVideoRequest): Promise<GenerateVideoResponse> {
	return fetchJSON<GenerateVideoResponse>('/generate', {
		method: 'POST',
		body: JSON.stringify(request),
	});
}

export async function uploadReels(request: UploadReelsRequest): Promise<UploadReelsResponse> {
	return fetchJSON<UploadReelsResponse>('/mcp-agent/upload-reels', {
		method: 'POST',
		body: JSON.stringify(request),
	});
}

export async function getFollowers(): Promise<FollowersResponse> {
	return fetchJSON<FollowersResponse>('/mcp-agent/followers');
}

export async function dmFollowers(request: DMFollowersRequest): Promise<DMStatusResponse> {
	return fetchJSON<DMStatusResponse>('/mcp-agent/dm-followers', {
		method: 'POST',
		body: JSON.stringify(request),
	});
}

export function createJobStream(jobId: string): EventSource {
	return new EventSource(`${API_BASE_URL}/generate/${jobId}/stream`);
}

export function parseJobStreamData(data: string): JobStreamUpdate {
	return JSON.parse(data);
}

export function formatTimestamp(timeStr: string): string {
	// Convert SRT timestamp format (00:01:30,500) to readable format
	const cleanTime = timeStr.replace(',', '.');
	const [hours, minutes, seconds] = cleanTime.split(':');
	const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
	const secs = Math.floor(parseFloat(seconds));

	if (totalMinutes === 0) {
		return `${secs}s`;
	} else {
		return `${totalMinutes}:${secs.toString().padStart(2, '0')}`;
	}
}

export function getVideoDuration(startTime: string, endTime: string): string {
	// Simple duration calculation for display
	const start = timeStringToSeconds(startTime);
	const end = timeStringToSeconds(endTime);
	const duration = Math.floor(end - start);

	const minutes = Math.floor(duration / 60);
	const seconds = duration % 60;

	if (minutes > 0) {
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	} else {
		return `${seconds}s`;
	}
}

function timeStringToSeconds(timeStr: string): number {
	const cleanTime = timeStr.replace(',', '.');
	const [hours, minutes, seconds] = cleanTime.split(':');
	return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
}
