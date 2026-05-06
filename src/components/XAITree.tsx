import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Circle, Network } from 'lucide-react';
import { DecisionNode } from '../types';

interface XAITreeProps {
  node: DecisionNode;
  level?: number;
  isLast?: boolean;
}

export const XAITree: React.FC<XAITreeProps> = ({ node, level = 0, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node?.children && node?.children.length > 0;

  return (
    <div className="relative">
      <div className="flex items-start gap-3 group">
        {/* Connection lines */}
        {level > 0 && (
          <div className="absolute -left-6 top-0 bottom-0 w-px bg-slate-800">
            {isLast && <div className="absolute top-4 left-0 right-0 h-full bg-slate-950"></div>}
            <div className="absolute top-4 left-0 w-6 h-px bg-slate-800"></div>
          </div>
        )}

        <div className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${
          node?.isHighlight 
            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {hasChildren ? (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1 rounded-md transition-colors ${
                  node?.isHighlight ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-slate-800 text-slate-500'
                }`}
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <Circle className={`w-2 h-2 ${node?.isHighlight ? 'text-emerald-400 fill-emerald-400' : 'text-slate-600'}`} />
            )}
            <h5 className={`text-[10px] font-black uppercase tracking-widest ${
              node?.isHighlight ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {typeof node?.label === 'string' ? node.label : JSON.stringify(node?.label || '')}
            </h5>
          </div>
          <p className={`text-xs leading-relaxed ${node?.isHighlight ? 'text-slate-200' : 'text-slate-400'}`}>
            {typeof node?.reason === 'string' ? node.reason : JSON.stringify(node?.reason || '')}
          </p>
          {node?.evidence && (
            <div className="mt-2 pt-2 border-t border-slate-800/50">
              <span className="text-[9px] text-slate-500 uppercase font-mono">Evidence: {node.evidence}</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-10 mt-4 space-y-4 overflow-hidden"
          >
            {(node?.children || []).map((child, idx) => (
              <XAITree 
                key={child?.id || idx} 
                node={child} 
                level={level + 1} 
                isLast={idx === (node?.children?.length || 0) - 1} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
