import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  ExternalLink,
} from "lucide-react";
import { createJobStream, parseJobStreamData } from "../lib/api";
import type { JobStreamUpdate } from "../lib/types";
import { API_BASE_URL } from "../lib/api";

interface JobStatusStreamProps {
  jobId: string;
  onBack: () => void;
  onRestart: () => void;
  onComplete?: (finishedVideos: string[]) => void;
}

export function JobStatusStream({
  jobId,
  onBack,
  onRestart,
  onComplete,
}: JobStatusStreamProps) {
  const [status, setStatus] = useState<JobStreamUpdate | null>(null);
  console.log("status object", status)
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout;

    const connectToStream = () => {
      const es = createJobStream(jobId);

      es.onopen = () => {
        console.log('SSE connection opened');
        retryCount = 0; // Reset retry count on successful connection
        setError(null);
      };

      es.onmessage = (event) => {
        try {
          const data = parseJobStreamData(event.data);
          console.log('SSE data received:', data);
          setStatus(data);
          setError(null);
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
          setError('Failed to parse status update');
        }
      };

      es.onerror = (event) => {
        console.error('SSE Error:', event);
        console.log('EventSource readyState:', es.readyState);

        es.close();

        if (retryCount < maxRetries) {
          retryCount++;
          setError(`Connection failed, retrying (${retryCount}/${maxRetries})...`);
          retryTimeout = setTimeout(() => {
            connectToStream();
          }, 2000 * retryCount); // Exponential backoff
        } else {
          setError('Connection to status stream failed after multiple attempts');
        }
      };

      return es;
    };

    const eventSource = connectToStream();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      eventSource.close();
    };
  }, [jobId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return "bg-blue-100 text-blue-800";
      case "downloading":
        return "bg-yellow-100 text-yellow-800";
      case "generating":
        return "bg-purple-100 text-purple-800";
      case "finished":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "finished":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "queued":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case "downloading":
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />;
      case "generating":
        return <Loader2 className="h-5 w-5 animate-spin text-purple-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
  };

  const isCompleted =
    status?.status === "finished" || status?.status === "error";

  const handleDownload = async (videoPath: string) => {
    try {
      // Create a download URL for the video file
      const response = await fetch(`${API_BASE_URL}/download/${encodeURIComponent(videoPath)}`);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = videoPath.split('/').pop() || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // For now, just open the file path in a new tab as fallback
      window.open(`${API_BASE_URL}/files/${encodeURIComponent(videoPath)}`, '_blank');
    }
  };

  const handleView = (videoPath: string) => {
    // Open video in a new tab for viewing
    window.open(`${API_BASE_URL}/files/${encodeURIComponent(videoPath)}`, '_blank');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Generating Your Shorts
              </CardTitle>
              <p className="text-gray-600 mt-1">Job ID: {jobId}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && !status && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Connection Error</h3>
              </div>
              <p className="text-red-700 text-sm">{error}</p>
              <Button
                onClick={onRestart}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          )}

          {status && (
            <>
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.status)}
                  <div>
                    <Badge className={getStatusColor(status.status)}>
                      {status.status.charAt(0).toUpperCase() +
                        status.status.slice(1)}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      {status.current_task || "Processing..."}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>
                    Started: {new Date(status.created_at).toLocaleTimeString()}
                  </div>
                  <div>
                    Updated: {new Date(status.updated_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {status.progress !== undefined &&
                status.status !== "finished" &&
                status.status !== "error" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{status.progress}%</span>
                    </div>
                    <Progress value={status.progress} className="h-2" />
                  </div>
                )}

              {/* Error Message */}
              {status.error_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">
                      Generation Failed
                    </h3>
                  </div>
                  <p className="text-red-700 text-sm">{status.error_message}</p>
                  <Button
                    onClick={onRestart}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {/* Finished Videos */}
              {status.finished_videos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">
                      Generated Videos ({status.finished_videos.length})
                    </h3>
                  </div>

                  <div className="grid gap-3">
                    {status.finished_videos.map((videoPath, index) => {
                      const fileName =
                        videoPath.split("/").pop() || `video_${index + 1}.mp4`;
                      return (
                        <div
                          key={videoPath}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-green-900">
                                {fileName}
                              </p>
                              <p className="text-xs text-green-700">
                                {videoPath}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(videoPath)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleView(videoPath)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completion Actions */}
              {isCompleted && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {status.status === "finished"
                      ? `Successfully generated ${status.finished_videos.length} video(s)`
                      : "Generation failed"}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={onRestart} variant="outline">
                      Generate More
                    </Button>
                    {status.status === "finished" && status.finished_videos.length > 0 && onComplete && (
                      <Button
                        onClick={() => onComplete(status.finished_videos)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        Continue to Upload
                      </Button>
                    )}
                    <Button onClick={onBack} variant="outline">Start Over</Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading State */}
          {!status && !error && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">
                Connecting to generation status...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
