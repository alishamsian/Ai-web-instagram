export type BusinessAnalysisSource = "rules" | "ai" | "hybrid";

export type ClassificationEvidence = {
  signal: string;
  source: string;
  weight: number;
  vertical?: string;
  subVertical?: string;
};

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
  /** Vertical score totals */
  scores?: Record<string, number>;
  /** Explainable classification evidence */
  evidence?: ClassificationEvidence[];
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
