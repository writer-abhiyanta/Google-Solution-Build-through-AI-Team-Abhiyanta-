/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, Briefcase, Heart, Microscope, Palette, Sparkles, Terminal, Zap } from "lucide-react";
import { MicroAgent } from "./types";

export const MICRO_AGENTS: MicroAgent[] = [
  { id: '1', name: 'PubMed Diagnostics', icon: 'Microscope', description: 'Evidence-based medical reasoning.', domain: 'Medicine' },
  { id: '2', name: 'Planetary Ephemeris', icon: 'Sparkles', description: 'Pattern recognition & cosmic cycles.', domain: 'Astrology' },
  { id: '3', name: 'Venture Capitalist', icon: 'Briefcase', description: 'ROI, TAM, and market risk analysis.', domain: 'Business' },
  { id: '4', name: 'Visual Composer', icon: 'Palette', description: 'Aesthetic balance & creative impact.', domain: 'Art' },
  { id: '5', name: 'Code Architect', icon: 'Terminal', description: 'Scalability, modularity & efficiency.', domain: 'Technology' },
  { id: '6', name: 'Philosophical Sage', icon: 'Heart', description: 'Ethical implications & deep meaning.', domain: 'Humanities' },
];

export const getIcon = (name: string) => {
  switch (name) {
    case 'Microscope': return <Microscope className="w-5 h-5" />;
    case 'Sparkles': return <Sparkles className="w-5 h-5" />;
    case 'Briefcase': return <Briefcase className="w-5 h-5" />;
    case 'Palette': return <Palette className="w-5 h-5" />;
    case 'Terminal': return <Terminal className="w-5 h-5" />;
    case 'Heart': return <Heart className="w-5 h-5" />;
    case 'BookOpen': return <BookOpen className="w-5 h-5" />;
    case 'Zap': return <Zap className="w-5 h-5" />;
    default: return <Sparkles className="w-5 h-5" />;
  }
};
