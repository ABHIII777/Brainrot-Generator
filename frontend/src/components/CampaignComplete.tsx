import { Button } from "./ui/button";
import { Card, CardContent, CardTitle } from "./ui/card";
import { CheckCircle, Sparkles, RefreshCw } from "lucide-react";

interface CampaignCompleteProps {
	onStartNew: () => void;
}

export function CampaignComplete({ onStartNew }: CampaignCompleteProps) {
	return (
		<div className="w-full max-w-2xl mx-auto">
			<Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
				<CardContent className="text-center py-12">
					<div className="mb-6">
						<div className="p-4 bg-green-100 rounded-full inline-block mb-4">
							<CheckCircle className="h-12 w-12 text-green-600" />
						</div>
						<CardTitle className="text-3xl font-bold text-gray-900 mb-2">
							Campaign Complete! 🎉
						</CardTitle>
						<p className="text-lg text-gray-600">
							Your viral content pipeline has been successfully executed
						</p>
					</div>          <div className="space-y-4 mb-8">
						<div className="flex items-center justify-center gap-2 text-green-700">
							<CheckCircle className="h-5 w-5" />
							<span>Videos generated from YouTube highlights</span>
						</div>
						<div className="flex items-center justify-center gap-2 text-green-700">
							<CheckCircle className="h-5 w-5" />
							<span>Videos uploaded to YouTube Shorts</span>
						</div>
						<div className="flex items-center justify-center gap-2 text-green-700">
							<CheckCircle className="h-5 w-5" />
							<span>DMs sent to followers with video links</span>
						</div>
					</div>          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-8">
						<Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-3" />
						<h3 className="font-semibold text-gray-900 mb-2">
							Your content is now live on YouTube!
						</h3>
						<p className="text-sm text-gray-600">
							Monitor your YouTube analytics to track views, engagement and reach.
						</p>
					</div>

					<Button
						onClick={onStartNew}
						className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition-all duration-200"
					>
						<RefreshCw className="mr-2 h-5 w-5" />
						Create Another Campaign
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
