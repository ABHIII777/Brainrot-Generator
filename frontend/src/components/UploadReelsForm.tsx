import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { ArrowLeft, Upload, Loader2, Video, Sparkles } from "lucide-react";
import { uploadReels, APIError } from "../lib/api";
import type { ReelUploadRequest, HighlightSegment } from "../lib/types";

interface UploadReelsFormProps {
	finishedVideos: string[];
	selectedHighlights: HighlightSegment[];
	onBack: () => void;
	onSuccess: (reelLinks: string[]) => void;
}

export function UploadReelsForm({
	finishedVideos,
	selectedHighlights,
	onBack,
	onSuccess,
}: UploadReelsFormProps) {
	const [selectedVideos, setSelectedVideos] = useState<Set<string>>(
		new Set(finishedVideos)
	);
	const [titles, setTitles] = useState<{ [path: string]: string }>(() => {
		const initialTitles: { [path: string]: string } = {};

		// Create a map of highlight ID to title
		const highlightTitles = new Map(selectedHighlights.map(h => [h.id_, h.title]));

		finishedVideos.forEach((path) => {
			// Extract highlight ID from filename (e.g., "out_abc123.mp4" -> "abc123")
			const filename = path.split('/').pop()?.replace('.mp4', '') || '';
			const highlightId = filename.replace(/^out_/, '');

			// Use highlight title if available, otherwise fall back to filename
			const highlightTitle = highlightTitles.get(highlightId);
			if (highlightTitle) {
				initialTitles[path] = highlightTitle;
			} else {
				// Fallback to cleaned filename
				const cleanTitle = filename.replace(/^out_/, '').replace(/_/g, ' ');
				initialTitles[path] = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
			}
		});
		return initialTitles;
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const toggleVideo = (videoPath: string) => {
		const newSelection = new Set(selectedVideos);
		if (newSelection.has(videoPath)) {
			newSelection.delete(videoPath);
		} else {
			newSelection.add(videoPath);
		}
		setSelectedVideos(newSelection);
	};

	const selectAll = () => {
		setSelectedVideos(new Set(finishedVideos));
	};

	const clearAll = () => {
		setSelectedVideos(new Set());
	};

	const updateTitle = (videoPath: string, title: string) => {
		setTitles((prev) => ({ ...prev, [videoPath]: title }));
	};

	const handleUpload = async () => {
		setError(null);
		setLoading(true); try {
			const reelsToUpload: ReelUploadRequest[] = Array.from(selectedVideos).map(
				(videoPath) => ({
					file_path: videoPath,
					title: titles[videoPath] || "Generated Short",
				})
			);

			const response = await uploadReels({ reels_to_upload: reelsToUpload });
			onSuccess(response.reel_links);
		} catch (err) {
			if (err instanceof APIError) {
				setError(`Failed to upload videos: ${err.message}`);
			} else if (err instanceof Error) {
				setError(`Failed to upload videos: ${err.message}`);
			} else {
				setError("An unexpected error occurred while uploading videos.");
			}
		} finally {
			setLoading(false);
		}
	};

	if (finishedVideos.length === 0) {
		return (
			<div className="w-full max-w-3xl mx-auto">
				<Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
					<CardContent className="text-center py-12">
						<Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							No Videos Available
						</h3>
						<p className="text-gray-600 mb-6">
							No finished videos found to upload. Please go back and generate some videos first.
						</p>
						<Button onClick={onBack} variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Generation
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="w-full max-w-4xl mx-auto">
			<Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
				<CardHeader className="pb-6">
					<div className="flex items-center gap-4 mb-4">
						<Button
							variant="outline"
							size="sm"
							onClick={onBack}
							className="flex items-center gap-2"
							disabled={loading}
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
						<div className="flex-1">
							<CardTitle className="text-2xl font-bold text-gray-900">
								Upload to YouTube Shorts
							</CardTitle>
							<p className="text-gray-600 mt-1">
								Select videos and customize titles before uploading
							</p>
						</div>
					</div>

					<div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
						<div className="flex items-center gap-4">
							<Button
								variant="outline"
								size="sm"
								onClick={selectAll}
								disabled={selectedVideos.size === finishedVideos.length || loading}
							>
								Select All
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={clearAll}
								disabled={selectedVideos.size === 0 || loading}
							>
								Clear All
							</Button>
						</div>
						<Badge variant="secondary" className="text-sm">
							{selectedVideos.size} of {finishedVideos.length} selected
						</Badge>
					</div>
				</CardHeader>

				<CardContent className="space-y-6">
					{error && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-red-700 text-sm">{error}</p>
						</div>
					)}

					<div className="space-y-4 max-h-96 overflow-y-auto pr-2">
						{finishedVideos.map((videoPath) => {
							const isSelected = selectedVideos.has(videoPath);
							const filename = videoPath.split('/').pop() || '';

							return (
								<div
									key={videoPath}
									className={`p-4 border-2 rounded-lg transition-all ${isSelected
										? "border-red-300 bg-red-50"
										: "border-gray-200 bg-white"
										}`}
								>
									<div className="flex items-start gap-4">
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => toggleVideo(videoPath)}
											disabled={loading}
											className="mt-1"
										/>

										<div className="flex-1 space-y-3">
											<div className="flex items-center gap-2">
												<Video className="h-4 w-4 text-gray-500" />
												<code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
													{filename}
												</code>
											</div>

											<div className="space-y-2">
												<label className="text-sm font-medium text-gray-700">
													YouTube Short Title
												</label>
												<Input
													value={titles[videoPath] || ""}
													onChange={(e) => updateTitle(videoPath, e.target.value)}
													placeholder="Enter a title for this YouTube Short..."
													disabled={!isSelected || loading}
													className={!isSelected ? "opacity-50" : ""}
												/>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{selectedVideos.size > 0 && (
						<div className="sticky bottom-0 bg-white border-t pt-6">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<Sparkles className="h-4 w-4" />
									Ready to upload {selectedVideos.size} video
									{selectedVideos.size !== 1 ? "s" : ""} to YouTube Shorts
								</div>
								<div className="text-sm text-gray-500">
									Estimated time: ~{Math.ceil(selectedVideos.size * 30)} seconds
								</div>
							</div>

							<Button
								onClick={handleUpload}
								disabled={loading}
								className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
							>							{loading ? (
								<>
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									Uploading Videos...
								</>
							) : (
								<>
									<Upload className="mr-2 h-5 w-5" />
									Upload {selectedVideos.size} Video
									{selectedVideos.size !== 1 ? "s" : ""}
								</>
							)}
							</Button>
						</div>
					)}

					{selectedVideos.size === 0 && (
						<div className="text-center py-8 text-gray-500">
							<Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p>Select videos above to upload to YouTube</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
