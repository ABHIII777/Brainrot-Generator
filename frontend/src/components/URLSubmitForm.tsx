import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Loader2, Play, Youtube } from "lucide-react";
import { extractHighlights, APIError } from "../lib/api";
import type { HighlightsResponse } from "../lib/types";

interface URLSubmitFormProps {
  onSuccess: (
    data: HighlightsResponse,
    videoUrl: string,
    language: string,
    noAutoSubs: boolean
  ) => void;
}

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
];

export function URLSubmitForm({ onSuccess }: URLSubmitFormProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [language, setLanguage] = useState("en");
  const [noAutoSubs, setNoAutoSubs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateYouTubeURL = (url: string): boolean => {
    const regex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return regex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!videoUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    if (!validateYouTubeURL(videoUrl)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setLoading(true);

    try {
      const response = await extractHighlights({
        video_url: videoUrl,
        subtitle_language: language,
        no_auto_subs: noAutoSubs,
      });

      onSuccess(response, videoUrl, language, noAutoSubs);
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Failed to extract highlights: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to extract highlights: ${err.message}`);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Youtube className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            Yapper
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Turn YouTube videos into viral shorts with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="video-url"
                className="text-sm font-medium text-gray-700"
              >
                YouTube Video URL
              </label>
              <Input
                id="video-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setVideoUrl(e.target.value)
                }
                className="h-12 text-base"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="language"
                  className="text-sm font-medium text-gray-700"
                >
                  Subtitle Language
                </label>
                <Select
                  value={language}
                  onValueChange={setLanguage}
                  disabled={loading}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="auto-subs"
                  className="text-sm font-medium text-gray-700"
                >
                  Skip Auto-Generated Subtitles
                </label>
                <div className="flex items-center space-x-2 h-12">
                  <Switch
                    id="auto-subs"
                    checked={noAutoSubs}
                    onCheckedChange={setNoAutoSubs}
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-600">
                    {noAutoSubs ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Extracting Highlights...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Extract Highlights
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
