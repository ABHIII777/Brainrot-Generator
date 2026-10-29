import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { ArrowLeft, Play, Clock, FileText, Sparkles } from "lucide-react";
import { formatTimestamp, getVideoDuration } from "../lib/api";
import type { HighlightSegment } from "../lib/types";

interface HighlightsSelectorProps {
  highlights: HighlightSegment[];
  onBack: () => void;
  onGenerate: (selectedHighlights: HighlightSegment[]) => void;
}

export function HighlightsSelector({
  highlights,
  onBack,
  onGenerate,
}: HighlightsSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleHighlight = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(highlights.map((h) => h.id_)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleGenerate = () => {
    const selectedHighlights = highlights.filter((h) => selectedIds.has(h.id_));
    onGenerate(selectedHighlights);
  };

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
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Select Highlights to Generate
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Found {highlights.length} potential highlights from your video
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedIds.size === highlights.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={selectedIds.size === 0}
              >
                Clear All
              </Button>
            </div>
            <Badge variant="secondary" className="text-sm">
              {selectedIds.size} of {highlights.length} selected
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 max-h-96 overflow-y-auto pr-2">
            {highlights.map((highlight) => {
              const isSelected = selectedIds.has(highlight.id_);
              const duration = getVideoDuration(
                highlight.start_time,
                highlight.end_time
              );

              return (
                <div
                  key={highlight.id_}
                  className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => toggleHighlight(highlight.id_)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleHighlight(highlight.id_)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                          {highlight.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {duration}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {formatTimestamp(highlight.start_time)} -{" "}
                          {formatTimestamp(highlight.end_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedIds.size > 0 && (
            <div className="sticky bottom-0 bg-white border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="h-4 w-4" />
                  Ready to generate {selectedIds.size} short
                  {selectedIds.size !== 1 ? "s" : ""}
                </div>
                <div className="text-sm text-gray-500">
                  Estimated time: ~{Math.ceil(selectedIds.size * 1.5)} minutes
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition-all duration-200"
              >
                <Play className="mr-2 h-5 w-5" />
                Generate {selectedIds.size} Short
                {selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </div>
          )}

          {selectedIds.size === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select highlights above to generate shorts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
