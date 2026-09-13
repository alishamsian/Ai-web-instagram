export type BusinessAnalysisSource = "rules" | "ai" | "hybrid";

export type BusinessAnalysis = {
  vertical: string;
  subVertical?: string | null;
  style?: string | null;
  mood?: string | null;
  confidence: number;
  confidenceBand: "high" | "medium" | "low";
  recommendedTemplate?: string | null;
  recommendedModules: string[];
  productAttributes: string[];
  productSignals: string[];
  contentSignals: string[];
  brandSignals: string[];
  source: BusinessAnalysisSource;
  /** Debug / tests — rule score breakdown */
  scores?: Record<string, number>;
};

export type ClassificationRule = {
  id: string;
  vertical: string;
  subVertical?: string;
  keywords?: string[];
  categories?: string[];
  attributes?: string[];
  weight: number;
};

export type StyleRule = {
  id: string;
  style: string;
  mood?: string;
  keywords: string[];
  weight: number;
};
