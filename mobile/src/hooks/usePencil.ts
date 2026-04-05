import { useRef, useState, useCallback } from 'react'
import { PencilCanvasRef, PencilTool } from '../services/pencil'

export function usePencil() {
  const canvasRef = useRef<PencilCanvasRef>(null)
  const [tool, setToolState] = useState<PencilTool>('pen')
  const [recognizedText, setRecognizedText] = useState('')

  const setTool = useCallback((t: PencilTool) => {
    setToolState(t)
    canvasRef.current?.setTool(t)
  }, [])

  const clear = useCallback(() => canvasRef.current?.clear(), [])
  const undo  = useCallback(() => canvasRef.current?.undo(),  [])
  const redo  = useCallback(() => canvasRef.current?.redo(),  [])

  const recognize = useCallback(() => {
    canvasRef.current?.recognizeText()
  }, [])

  const appendText = useCallback((text: string) => {
    setRecognizedText(prev => prev ? prev + '\n' + text : text)
  }, [])

  return {
    canvasRef,
    tool, setTool,
    recognizedText, setRecognizedText, appendText,
    clear, undo, redo, recognize,
  }
}
