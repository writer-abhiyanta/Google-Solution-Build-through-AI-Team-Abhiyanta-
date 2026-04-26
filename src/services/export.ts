import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DecisionResult } from '../types';

export const exportToPDF = (prompt: string, agentName: string, result: DecisionResult) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  const emerald: [number, number, number] = [16, 185, 129];
  const darkEmerald: [number, number, number] = [5, 150, 105];

  // Helper for drawing technical lines
  const drawDecor = (y: number) => {
    doc.setDrawColor(emerald[0], emerald[1], emerald[2]);
    doc.setLineWidth(0.1);
    doc.line(14, y, 196, y);
    doc.circle(14, y, 0.5, 'F');
    doc.circle(196, y, 0.5, 'F');
  };

  // Background Grid Illustration (Light)
  doc.setDrawColor(240);
  for (let i = 0; i < 210; i += 10) doc.line(i, 0, i, 297);
  for (let i = 0; i < 297; i += 10) doc.line(0, i, 210, i);

  // Header
  doc.setFontSize(24);
  doc.setTextColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('NEUTRAL-IQ', 14, 25);
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text('SYNCHRONICITY_ENGINE_LOG // V5.0.0_ULTRA', 14, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`TIMESTAMP: ${timestamp}`, 140, 25);
  doc.text(`AGENT_ID: ${agentName.toUpperCase()}`, 140, 30);

  drawDecor(35);

  // Decision Context
  doc.setFontSize(12);
  doc.setTextColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
  doc.text('RAW_INPUT_CONTEXT', 14, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  const splitPrompt = doc.splitTextToSize(`"${prompt}"`, 180);
  doc.text(splitPrompt, 14, 52);

  let currentY = 52 + (splitPrompt.length * 5) + 15;

  // NEURAL MIND MAP DIAGRAM
  doc.setDrawColor(emerald[0], emerald[1], emerald[2]);
  doc.setLineWidth(0.3);
  
  const centerX = 105;
  const centerY = currentY + 40;
  
  // Central Brain Core
  doc.setDrawColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
  doc.circle(centerX, centerY, 15);
  doc.setFontSize(7);
  doc.text('CORE_LOGIC', centerX - 8, centerY + 2);
  
  // Branching Nodes for Swarm
  result.swarm.forEach((s, i) => {
    const angle = (i / result.swarm.length) * Math.PI * 2;
    const distance = 45;
    const nodeX = centerX + Math.cos(angle) * distance;
    const nodeY = centerY + Math.sin(angle) * distance;
    
    // Connection Line with technical dots
    doc.setDrawColor(emerald[0], emerald[1], emerald[2], 0.3);
    doc.line(centerX, centerY, nodeX, nodeY);
    doc.circle(centerX + Math.cos(angle) * 15, centerY + Math.sin(angle) * 15, 0.5, 'F');
    
    // Node
    doc.setDrawColor(emerald[0], emerald[1], emerald[2]);
    doc.rect(nodeX - 10, nodeY - 5, 20, 10);
    doc.setFontSize(6);
    const shortPersona = s.persona.length > 10 ? s.persona.substring(0, 8) + '..' : s.persona;
    doc.text(shortPersona.toUpperCase(), nodeX - 8, nodeY + 1);
    
    // Confidence Indicator
    const scoreLen = (s.score / 100) * 12;
    doc.setDrawColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
    doc.line(nodeX - 6, nodeY + 3, nodeX - 6 + scoreLen, nodeY + 3);
  });

  currentY += 100;

  // Consensus
  if (currentY > 250) { doc.addPage(); currentY = 20; }
  doc.setFontSize(12);
  doc.setTextColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
  doc.text('SYNTHESIZED_CONSENSUS', 14, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  const splitConsensus = doc.splitTextToSize(result.consensus, 180);
  doc.text(splitConsensus, 14, currentY + 8);
  
  currentY += 8 + (splitConsensus.length * 5) + 15;

  // Swarm Table
  autoTable(doc, {
    startY: currentY,
    head: [['ADVERSARIAL_PERSONA', 'VERDICT', 'CONFIDENCE', 'REASONING_LOG']],
    body: result.swarm.map(s => [s.persona.toUpperCase(), s.verdict.toUpperCase(), `${s.score}%`, s.thought]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: emerald },
    alternateRowStyles: { fillColor: [245, 255, 250] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  if (currentY > 230) { doc.addPage(); currentY = 20; }
  
  // Roadmap
  doc.setFontSize(12);
  doc.setTextColor(darkEmerald[0], darkEmerald[1], darkEmerald[2]);
  doc.text('STRATEGIC_DEPLOYMENT_ROADMAP', 14, currentY);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['PHASE_INDEX', 'ACTION_ITEM', 'RISK_VECTORS']],
    body: result.roadmap.map(r => [r.phase.toUpperCase(), r.action, r.risk]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229] }
  });

  doc.save(`NEUTRAL_IQ_REP_${Date.now()}.pdf`);
};

export const exportToCSV = (prompt: string, agentName: string, result: DecisionResult) => {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `Report,Neutral-IQ Analysis\n`;
  csvContent += `Agent,${agentName}\n`;
  csvContent += `Date,${new Date().toISOString()}\n`;
  csvContent += `Prompt,"${prompt.replace(/"/g, '""')}"\n\n`;
  
  csvContent += `SWARM PERSPECTIVES\n`;
  csvContent += `Persona,Verdict,Score,Thought\n`;
  result.swarm.forEach(s => {
    csvContent += `${s.persona},${s.verdict},${s.score},"${s.thought.replace(/"/g, '""')}"\n`;
  });
  
  csvContent += `\nROADMAP\n`;
  csvContent += `Phase,Action,Risk\n`;
  result.roadmap.forEach(r => {
    csvContent += `"${r.phase.replace(/"/g, '""')}","${r.action.replace(/"/g, '""')}","${r.risk.replace(/"/g, '""')}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Neutral-IQ-Data-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToJSON = (prompt: string, agentName: string, result: DecisionResult) => {
  const data = {
    metadata: {
      engine: "Neutral-IQ",
      version: "5.0.0",
      timestamp: new Date().toISOString(),
      agent: agentName,
    },
    input: prompt,
    intelligence: result
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Neural-Schema-${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
