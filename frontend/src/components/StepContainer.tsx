import { useState, useCallback } from "react";
import { URLSubmitForm } from "./URLSubmitForm";
import { HighlightsSelector } from "./HighlightsSelector";
import { JobStatusStream } from "./JobStatusStream";
import { UploadReelsForm } from "./UploadReelsForm";
import { DMFollowersForm } from "./DMFollowersForm";
import { CampaignComplete } from "./CampaignComplete";
import { generateVideos, APIError } from "../lib/api";
import type {
  HighlightsResponse,
  HighlightSegment,
  AppStep,
} from "../lib/types";

interface AppState {
  currentStep: AppStep;
  highlights: HighlightSegment[];
  selectedHighlights: HighlightSegment[];
  videoUrl: string;
  language: string;
  noAutoSubs: boolean;
  jobId: string | null;
  finishedVideos: string[];
  reelLinks: string[];
}

export function StepContainer() {
  const [state, setState] = useState<AppState>({
    currentStep: "url-submit",
    highlights: [],
    selectedHighlights: [],
    videoUrl: "",
    language: "en",
    noAutoSubs: false,
    jobId: null,
    finishedVideos: [],
    reelLinks: [],
  });

  const [error, setError] = useState<string | null>(null);

  const handleHighlightsSuccess = useCallback(
    (
      data: HighlightsResponse,
      videoUrl: string,
      language: string,
      noAutoSubs: boolean
    ) => {
      setState((prev) => ({
        ...prev,
        currentStep: "highlights-select",
        highlights: data.highlights,
        videoUrl,
        language,
        noAutoSubs,
      }));
      setError(null);
    },
    []
  );

  const handleBackToUrl = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: "url-submit",
      jobId: null,
    }));
    setError(null);
  }, []);

  const handleGenerateVideos = useCallback(
    async (selectedHighlights: HighlightSegment[]) => {
      setError(null);

      try {
        const response = await generateVideos({
          video_url: state.videoUrl,
          highlights: selectedHighlights,
        });

        setState((prev) => ({
          ...prev,
          currentStep: "job-status",
          selectedHighlights,
          jobId: response.job_id,
        }));
      } catch (err) {
        if (err instanceof APIError) {
          setError(`Failed to start video generation: ${err.message}`);
        } else if (err instanceof Error) {
          setError(`Failed to start video generation: ${err.message}`);
        } else {
          setError(
            "An unexpected error occurred while starting video generation."
          );
        }
      }
    },
    [state.videoUrl]
  );

  const handleBackToHighlights = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: "highlights-select",
      jobId: null,
    }));
    setError(null);
  }, []);

  const handleRestart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: "highlights-select",
      jobId: null,
    }));
    setError(null);
  }, []);

  const handleJobComplete = useCallback((finishedVideos: string[]) => {
    setState((prev) => ({
      ...prev,
      currentStep: "upload-reels",
      finishedVideos,
    }));
    setError(null);
  }, []);

  const handleBackToJobStatus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: "job-status",
    }));
    setError(null);
  }, []);

  const handleUploadSuccess = useCallback((reelLinks: string[]) => {
    setState((prev) => ({
      ...prev,
      currentStep: "dm-followers",
      reelLinks,
    }));
    setError(null);
  }, []);

  const handleBackToUpload = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: "upload-reels",
    }));
    setError(null);
  }, []);

  const handleCampaignComplete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: "complete",
    }));
    setError(null);
  }, []);

  const handleStartNewCampaign = useCallback(() => {
    setState({
      currentStep: "url-submit",
      highlights: [],
      selectedHighlights: [],
      videoUrl: "",
      language: "en",
      noAutoSubs: false,
      jobId: null,
      finishedVideos: [],
      reelLinks: [],
    });
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="container mx-auto">
        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-2 overflow-x-auto">
            <div
              className={`flex items-center space-x-2 ${state.currentStep === "url-submit"
                ? "text-red-600"
                : "text-gray-400"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${state.currentStep === "url-submit"
                  ? "bg-red-600 text-white"
                  : "bg-green-500 text-white"
                  }`}
              >
                1
              </div>
              <span className="text-sm font-medium">Submit URL</span>
            </div>

            <div
              className={`w-6 h-px ${state.currentStep !== "url-submit"
                ? "bg-green-500"
                : "bg-gray-300"
                }`}
            />

            <div
              className={`flex items-center space-x-2 ${state.currentStep === "highlights-select"
                ? "text-red-600"
                : "text-gray-400"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${state.currentStep === "highlights-select"
                  ? "bg-red-600 text-white"
                  : ["job-status", "upload-reels", "dm-followers"].includes(state.currentStep)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                  }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Select</span>
            </div>

            <div
              className={`w-6 h-px ${["job-status", "upload-reels", "dm-followers"].includes(state.currentStep)
                ? "bg-green-500"
                : "bg-gray-300"
                }`}
            />

            <div
              className={`flex items-center space-x-2 ${state.currentStep === "job-status"
                ? "text-red-600"
                : "text-gray-400"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${state.currentStep === "job-status"
                  ? "bg-red-600 text-white"
                  : ["upload-reels", "dm-followers"].includes(state.currentStep)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                  }`}
              >
                3
              </div>
              <span className="text-sm font-medium">Generate</span>
            </div>

            <div
              className={`w-6 h-px ${["upload-reels", "dm-followers"].includes(state.currentStep)
                ? "bg-green-500"
                : "bg-gray-300"
                }`}
            />

            <div
              className={`flex items-center space-x-2 ${state.currentStep === "upload-reels"
                ? "text-red-600"
                : "text-gray-400"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${state.currentStep === "upload-reels"
                  ? "bg-red-600 text-white"
                  : state.currentStep === "dm-followers"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                  }`}
              >
                4
              </div>
              <span className="text-sm font-medium">Upload</span>
            </div>

            <div
              className={`w-6 h-px ${state.currentStep === "dm-followers"
                ? "bg-green-500"
                : "bg-gray-300"
                }`}
            />

            <div
              className={`flex items-center space-x-2 ${state.currentStep === "dm-followers"
                ? "text-red-600"
                : "text-gray-400"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${state.currentStep === "dm-followers"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-600"
                  }`}
              >
                5
              </div>
              <span className="text-sm font-medium">Share</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="transition-all duration-300 ease-in-out">
          {state.currentStep === "url-submit" && (
            <URLSubmitForm onSuccess={handleHighlightsSuccess} />
          )}

          {state.currentStep === "highlights-select" && (
            <HighlightsSelector
              highlights={state.highlights}
              onBack={handleBackToUrl}
              onGenerate={handleGenerateVideos}
            />
          )}

          {state.currentStep === "job-status" && state.jobId && (
            <JobStatusStream
              jobId={state.jobId}
              onBack={handleBackToHighlights}
              onRestart={handleRestart}
              onComplete={handleJobComplete}
            />
          )}

          {state.currentStep === "upload-reels" && (
            <UploadReelsForm
              finishedVideos={state.finishedVideos}
              selectedHighlights={state.selectedHighlights}
              onBack={handleBackToJobStatus}
              onSuccess={handleUploadSuccess}
            />
          )}

          {state.currentStep === "dm-followers" && (
            <DMFollowersForm
              reelLinks={state.reelLinks}
              onBack={handleBackToUpload}
              onComplete={handleCampaignComplete}
            />
          )}

          {state.currentStep === "complete" && (
            <CampaignComplete onStartNew={handleStartNewCampaign} />
          )}
        </div>
      </div>
    </div>
  );
}
