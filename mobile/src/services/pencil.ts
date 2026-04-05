// JS-side service for Apple Pencil / handwriting
// The actual PencilKit bridge lives in ios/CortexPencil/
// This module provides a clean API consumed by PencilCanvas.tsx and usePencil.ts

import { Platform } from 'react-native'

export const isPencilSupported =
  Platform.OS === 'ios' && (Platform as any).isPad === true

export type PencilTool = 'pen' | 'pencil' | 'marker' | 'eraser'

// These are sent as commands to the native PKCanvasView via ref methods
export interface PencilCanvasRef {
  clear: () => void
  undo: () => void
  redo: () => void
  setTool: (tool: PencilTool) => void
  recognizeText: () => void
}

// Parse any [[wiki links]] from recognized text to maintain consistency
export function parseWikiLinksFromText(text: string): string[] {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1])
}
