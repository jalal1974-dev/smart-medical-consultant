import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  CheckCircle2, 
  Clock,
  Loader2 
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  researchPriority: "high" | "medium" | "low";
  researched: boolean;
  researchContent?: string;
  children?: MindMapNode[];
}

interface MindMapVisualizationProps {
  consultationId: number;
}

export function MindMapVisualization({ consultationId }: MindMapVisualizationProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const { data: topics, isLoading, refetch } = trpc.research.getMindMap.useQuery(
    { consultationId },
    { refetchOnWindowFocus: false }
  );

  const generateMindMap = trpc.research.generateMindMap.useMutation({
    onSuccess: () => {
      toast.success("Mind map generated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to generate mind map: ${error.message}`);
    },
  });

  const performResearch = trpc.research.performDeepResearch.useMutation({
    onSuccess: () => {
      toast.success("Research completed successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Research failed: ${error.message}`);
    },
  });

  // Build hierarchical structure from flat topics
  const buildHierarchy = (topics: any[]): MindMapNode[] => {
    const topicMap = new Map<string, MindMapNode>();
    const rootNodes: MindMapNode[] = [];

    // First pass: create all nodes
    topics.forEach((topic) => {
      topicMap.set(topic.topicId, {
        id: topic.topicId,
        label: topic.label,
        description: topic.description,
        researchPriority: topic.researchPriority,
        researched: topic.researched,
        researchContent: topic.researchContent,
        children: [],
      });
    });

    // Second pass: build hierarchy
    topics.forEach((topic) => {
      const node = topicMap.get(topic.topicId)!;
      if (topic.parentTopicId) {
        const parent = topicMap.get(topic.parentTopicId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleResearch = (topicId: string) => {
    performResearch.mutate({ consultationId, topicId });
    setSelectedTopic(topicId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const renderNode = (node: MindMapNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedTopic === node.id;
    const isResearching = performResearch.isPending && isSelected;

    return (
      <div key={node.id} className="mb-2">
        <Card
          className={`p-4 transition-all ${
            isSelected ? "ring-2 ring-emerald-500" : ""
          } ${level > 0 ? "ml-8" : ""}`}
        >
          <div className="flex items-start gap-3">
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleNode(node.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}

            <div className="flex-1">
              {/* Topic Header */}
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-lg">{node.label}</h4>
                <Badge className={getPriorityColor(node.researchPriority)}>
                  {node.researchPriority}
                </Badge>
                {node.researched ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Researched
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>

              {/* Description */}
              {node.description && (
                <p className="text-sm text-gray-600 mb-3">{node.description}</p>
              )}

              {/* Research Content */}
              {node.researched && node.researchContent && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                  <h5 className="font-medium text-sm text-emerald-900 mb-2">
                    Research Findings:
                  </h5>
                  <p className="text-sm text-emerald-800 whitespace-pre-wrap">
                    {node.researchContent}
                  </p>
                </div>
              )}

              {/* Research Button */}
              {!node.researched && (
                <Button
                  size="sm"
                  onClick={() => handleResearch(node.id)}
                  disabled={isResearching}
                  className="mt-2"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Perform Deep Research
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-3 text-gray-600">Loading mind map...</span>
        </div>
      </Card>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Brain className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Mind Map Generated</h3>
          <p className="text-gray-600 mb-4">
            Generate a research mind map to explore medical topics related to this consultation.
          </p>
          <Button
            onClick={() => generateMindMap.mutate({ consultationId })}
            disabled={generateMindMap.isPending}
          >
            {generateMindMap.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Mind Map
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const hierarchy = buildHierarchy(topics);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold">Research Mind Map</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMindMap.mutate({ consultationId })}
          disabled={generateMindMap.isPending}
        >
          {generateMindMap.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            "Regenerate Mind Map"
          )}
        </Button>
      </div>

      <div className="space-y-2">
        {hierarchy.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
