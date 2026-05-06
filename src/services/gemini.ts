import { GoogleGenAI, Type } from "@google/genai";
import { DecisionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const schema = {
  type: Type.OBJECT,
  properties: {
    consensus: { type: Type.STRING, description: "The final consensus summary of the debate." },
    finalScore: { type: Type.NUMBER, description: "Confidence score from 0-100." },
    overallAlignment: { type: Type.STRING, description: "The overall ethical and systemic alignment of the consensus (High, Medium, Low)." },
    swarm: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          persona: { type: Type.STRING },
          thought: { type: Type.STRING },
          verdict: { type: Type.STRING },
          alignment: { type: Type.STRING, description: "Alignment with ethical and safety guardrails (High, Medium, Low)." },
          score: { type: Type.NUMBER }
        },
        required: ["persona", "thought", "verdict", "alignment", "score"]
      }
    },
    biases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          definition: { type: Type.STRING, description: "A general educational definition of the bias." },
          description: { type: Type.STRING, description: "How this bias specifically affects this decision context." },
          detectedIn: { type: Type.STRING }
        },
        required: ["name", "definition", "description", "detectedIn"]
      }
    },
    grades: {
      type: Type.ARRAY,
      description: "A detailed scorecard for this decision. Provide metrics for Code Quality, Security, Feasibility, Testing, Architecture, etc. out of 10.",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "The category being graded (e.g., 'Code Quality', 'Security', 'Testing')." },
          score: { type: Type.NUMBER, description: "The score out of 10." },
          maxScore: { type: Type.NUMBER, description: "Must be 10." },
          feedback: { type: Type.STRING, description: "A short reason for the score." }
        },
        required: ["category", "score", "maxScore", "feedback"]
      }
    },
    xaiTree: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        label: { type: Type.STRING },
        reason: { type: Type.STRING },
        isHighlight: { type: Type.BOOLEAN },
        children: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT, 
            properties: { 
              id: { type: Type.STRING }, 
              label: { type: Type.STRING }, 
              reason: { type: Type.STRING },
              isHighlight: { type: Type.BOOLEAN },
              children: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    isHighlight: { type: Type.BOOLEAN }
                  },
                  required: ["id", "label", "reason"]
                }
              }
            },
            required: ["id", "label", "reason"]
          }
        }
      },
      required: ["id", "label", "reason"]
    },
    simulation: {
      type: Type.OBJECT,
      properties: {
        labels: { type: Type.ARRAY, items: { type: Type.STRING } },
        data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        unit: { type: Type.STRING },
        prediction: { type: Type.STRING }
      },
      required: ["labels", "data", "unit", "prediction"]
    },
    ethicalChecks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          framework: { type: Type.STRING },
          frameworkDescription: { type: Type.STRING, description: "A brief description of the ethical framework being used (e.g., utilitarianism, deontology)." },
          alignment: { type: Type.STRING },
          summary: { type: Type.STRING, description: "A one-sentence concise summary of the ethical alignment." },
          analysis: { type: Type.STRING, description: "Detailed ethical analysis. Expand this field to offer a thorough breakdown of the decision's adherence to the framework." }
        },
        required: ["framework", "frameworkDescription", "alignment", "summary", "analysis"]
      }
    },
    roadmap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { type: Type.STRING },
          action: { type: Type.STRING },
          risk: { type: Type.STRING }
        },
        required: ["phase", "action", "risk"]
      }
    }
  },
  required: ["consensus", "finalScore", "overallAlignment", "swarm", "biases", "grades", "xaiTree", "simulation", "ethicalChecks", "roadmap"]
};

export async function analyzeDecision(
  prompt: string, 
  mode: string, 
  intuitionSlider: number,
  agentDomain: string,
  detectBiases: boolean
): Promise<DecisionResult> {
  const modelName = "gemini-2.5-flash";
  
  const systemInstruction = `
    You are the Aetheris Universal Decision Engine. 
    Mode: ${mode}
    Domain: ${agentDomain}
    Intuition vs Logic Slider: ${intuitionSlider}% (0% is pure logic, 100% is pure abstract intuition).
    Bias Detection Enabled: ${detectBiases}
    
    Tasks:
    1. Swarm Debate: Generate thoughts from a Pragmatist (data-driven), Skeptic (risk-focused), and Creative (unconventional). For each debtor, provide an 'alignment' status (High, Medium, Low) indicating how well their persona-driven logic adheres to ethical and rational alignment.
    1.1 Overall Alignment: Provide an 'overallAlignment' status (High, Medium, Low) for the entire consensus.
    2. Bias Detection: ${detectBiases ? "Identify cognitive biases in the user's prompt or reasoning." : "DO NOT analyze for biases. Return an empty array for 'biases'."}
    3. AI Based Grades: Provide a scorecard array ('grades') for the decision/code/topic. Include metrics exactly evaluating Code Quality, Security, Feasibility, Testing, Architecture, and optionally 1-2 more relevant technical metrics. Format as 10/10 (maxScore = 10). Provide specialized feedback.
    4. XAI Tree: Provide a multi-level logic tree (at least 2 levels deep) explaining the decision path. Mark the 'isHighlight' boolean as true for the specific path of nodes that contribute most to the 'finalScore' (the primary reasoning path).
    5. Simulation: Provide a numerical prediction sequence (e.g., 5-6 points) and a text prediction of outcomes over time.
    6. Ethical Alignment: Check the decision against 2 different ethical frameworks relevant to the domain. Provide a clear alignment status (High, Medium, Low) and a one-sentence summary for each.
    7. Strategic Roadmap: Provide 3 clear sequential phases for implementation.
    
    If the slider is high on Intuition, use more metaphorical and philosophical reasoning.
    If the slider is high on Logic, use strict evidence and peer-reviewed style reasoning.
  `;

  const result = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const responseText = result.text || "{}";
  return JSON.parse(responseText) as DecisionResult;
}
