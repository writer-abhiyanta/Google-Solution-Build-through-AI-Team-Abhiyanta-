/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DecisionNode {
  id: string;
  label: string;
  reason: string;
  evidence?: string;
  children?: DecisionNode[];
  isHighlight?: boolean;
}

export interface SwarmOpinion {
  persona: 'Pragmatist' | 'Skeptic' | 'Creative';
  thought: string;
  verdict: 'Supportive' | 'Critical' | 'Alternative';
  alignment: 'High' | 'Medium' | 'Low';
  score: number;
}

export interface CognitiveBias {
  name: string;
  definition: string;
  description: string;
  detectedIn: string;
}

export interface StrategicStep {
  phase: string;
  action: string;
  risk: string;
}

export interface EthicalCheck {
  framework: string;
  alignment: 'High' | 'Medium' | 'Low';
  summary: string;
  analysis: string;
}

export interface DecisionResult {
  consensus: string;
  finalScore: number;
  overallAlignment: 'High' | 'Medium' | 'Low';
  swarm: SwarmOpinion[];
  biases: CognitiveBias[];
  xaiTree: DecisionNode;
  simulation: {
    labels: string[];
    data: number[];
    unit: string;
    prediction: string;
  };
  ethicalChecks: EthicalCheck[];
  roadmap: StrategicStep[];
}

export interface MicroAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  domain: string;
}
