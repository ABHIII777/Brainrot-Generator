import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import {
	ArrowLeft,
	Send,
	Loader2,
	Users,
	CheckCircle,
	XCircle,
	ExternalLink,
	MessageCircle,
	Sparkles
} from "lucide-react";
import { getFollowers, dmFollowers, APIError } from "../lib/api";

interface DMFollowersFormProps {
	reelLinks: string[];
	onBack: () => void;
	onComplete: () => void;
}

export function DMFollowersForm({
	reelLinks,
	onBack,
	onComplete,
}: DMFollowersFormProps) {
	const [followers, setFollowers] = useState<string[]>([]);
	const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set());
	const [loadingFollowers, setLoadingFollowers] = useState(true);
	const [sendingDMs, setSendingDMs] = useState(false);
	const [dmResults, setDmResults] = useState<{ [follower: string]: "sent" | "failed" } | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchFollowers = async () => {
			try {
				const response = await getFollowers();
				setFollowers(response.followers);
				setError(null);
			} catch (err) {
				if (err instanceof APIError) {
					setError(`Failed to fetch followers: ${err.message}`);
				} else if (err instanceof Error) {
					setError(`Failed to fetch followers: ${err.message}`);
				} else {
					setError("An unexpected error occurred while fetching followers.");
				}
			} finally {
				setLoadingFollowers(false);
			}
		};

		fetchFollowers();
	}, []);

	const toggleFollower = (follower: string) => {
		const newSelection = new Set(selectedFollowers);
		if (newSelection.has(follower)) {
			newSelection.delete(follower);
		} else {
			newSelection.add(follower);
		}
		setSelectedFollowers(newSelection);
	};

	const selectAll = () => {
		setSelectedFollowers(new Set(followers));
	};

	const clearAll = () => {
		setSelectedFollowers(new Set());
	};

	const handleSendDMs = async () => {
		setError(null);
		setSendingDMs(true);
		setDmResults(null);

		try {
			const response = await dmFollowers({
				reel_links: reelLinks,
				followers: Array.from(selectedFollowers),
			});

			setDmResults(response.dm_status);
		} catch (err) {
			if (err instanceof APIError) {
				setError(`Failed to send DMs: ${err.message}`);
			} else if (err instanceof Error) {
				setError(`Failed to send DMs: ${err.message}`);
			} else {
				setError("An unexpected error occurred while sending DMs.");
			}
		} finally {
			setSendingDMs(false);
		}
	};

	const getResultIcon = (status: "sent" | "failed") => {
		return status === "sent" ? (
			<CheckCircle className="h-4 w-4 text-green-600" />
		) : (
			<XCircle className="h-4 w-4 text-red-600" />
		);
	};

	const getResultColor = (status: "sent" | "failed") => {
		return status === "sent"
			? "bg-green-50 border-green-200 text-green-800"
			: "bg-red-50 border-red-200 text-red-800";
	};

	const isCompleted = dmResults !== null;

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
							disabled={sendingDMs}
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
						<div className="flex-1">              <CardTitle className="text-2xl font-bold text-gray-900">
							Share with Followers
						</CardTitle>
							<p className="text-gray-600 mt-1">
								Send DMs to your followers with the uploaded YouTube Shorts
							</p>
						</div>
					</div>

					{/* Show reel links */}
					<div className="bg-gray-50 p-4 rounded-lg mb-4">            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
						<ExternalLink className="h-4 w-4" />
						Uploaded YouTube Shorts ({reelLinks.length})
					</h3>
						<div className="space-y-2">
							{reelLinks.map((link, index) => (
								<a
									key={index}
									href={link}
									target="_blank"
									rel="noopener noreferrer" className="block text-sm text-blue-600 hover:text-blue-800 underline"
								>
									Video {index + 1}: {link}
								</a>
							))}
						</div>
					</div>

					{!isCompleted && !loadingFollowers && followers.length > 0 && (
						<div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
							<div className="flex items-center gap-4">
								<Button
									variant="outline"
									size="sm"
									onClick={selectAll}
									disabled={selectedFollowers.size === followers.length || sendingDMs}
								>
									Select All
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={clearAll}
									disabled={selectedFollowers.size === 0 || sendingDMs}
								>
									Clear All
								</Button>
							</div>
							<Badge variant="secondary" className="text-sm">
								{selectedFollowers.size} of {followers.length} selected
							</Badge>
						</div>
					)}
				</CardHeader>

				<CardContent className="space-y-6">
					{error && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-red-700 text-sm">{error}</p>
						</div>
					)}

					{/* Loading followers */}
					{loadingFollowers && (
						<div className="text-center py-8">
							<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
							<p className="text-gray-600">Loading your followers...</p>
						</div>
					)}

					{/* No followers */}
					{!loadingFollowers && followers.length === 0 && !error && (
						<div className="text-center py-8 text-gray-500">
							<Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<h3 className="font-semibold mb-2">No Followers Found</h3>
							<p>No followers available to send DMs to.</p>
						</div>
					)}

					{/* Results view */}
					{isCompleted && dmResults && (
						<div className="space-y-4">
							<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<MessageCircle className="h-5 w-5" />
								DM Results
							</h3>

							<div className="grid gap-3 max-h-64 overflow-y-auto">
								{Object.entries(dmResults).map(([follower, status]) => (
									<div
										key={follower}
										className={`p-3 rounded-lg border flex items-center justify-between ${getResultColor(status)}`}
									>
										<span className="font-medium">{follower}</span>
										<div className="flex items-center gap-2">
											{getResultIcon(status)}
											<span className="text-sm capitalize">{status}</span>
										</div>
									</div>
								))}
							</div>              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
								<CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
								<h3 className="font-semibold text-green-900 mb-1">Campaign Complete!</h3>
								<p className="text-green-700 text-sm">
									Successfully sent YouTube video links to {Object.values(dmResults).filter(s => s === "sent").length} followers
								</p>
							</div>

							<Button
								onClick={onComplete}
								className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
							>
								<CheckCircle className="mr-2 h-5 w-5" />
								Continue
							</Button>
						</div>
					)}

					{/* Followers selection */}
					{!isCompleted && !loadingFollowers && followers.length > 0 && (
						<>
							<div className="space-y-3 max-h-64 overflow-y-auto pr-2">
								{followers.map((follower) => {
									const isSelected = selectedFollowers.has(follower);

									return (
										<div
											key={follower}
											className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${isSelected
												? "border-blue-300 bg-blue-50"
												: "border-gray-200 bg-white hover:border-gray-300"
												}`}
											onClick={() => toggleFollower(follower)}
										>
											<div className="flex items-center gap-3">
												<Checkbox
													checked={isSelected}
													onCheckedChange={() => toggleFollower(follower)}
													disabled={sendingDMs}
												/>
												<div className="flex items-center gap-2">
													<Users className="h-4 w-4 text-gray-500" />
													<span className="font-medium text-gray-900">{follower}</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							{selectedFollowers.size > 0 && (
								<div className="sticky bottom-0 bg-white border-t pt-6">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Sparkles className="h-4 w-4" />
											Ready to send DMs to {selectedFollowers.size} follower
											{selectedFollowers.size !== 1 ? "s" : ""}
										</div>                    <div className="text-sm text-gray-500">
											{reelLinks.length} video{reelLinks.length !== 1 ? "s" : ""} will be shared
										</div>
									</div>

									<Button
										onClick={handleSendDMs}
										disabled={sendingDMs}
										className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
									>
										{sendingDMs ? (
											<>
												<Loader2 className="mr-2 h-5 w-5 animate-spin" />
												Sending DMs...
											</>
										) : (
											<>
												<Send className="mr-2 h-5 w-5" />
												Send DMs to {selectedFollowers.size} Follower
												{selectedFollowers.size !== 1 ? "s" : ""}
											</>
										)}
									</Button>
								</div>
							)}

							{selectedFollowers.size === 0 && (
								<div className="text-center py-8 text-gray-500">
									<Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
									<p>Select followers above to send DMs</p>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
