import React, { forwardRef, useImperativeHandle } from 'react'
import {
  View, Text, StyleSheet, Platform,
  requireNativeComponent, NativeModules, UIManager, findNodeHandle,
} from 'react-native'
import { colors } from '../theme/colors'
import { PencilCanvasRef, PencilTool } from '../services/pencil'

// ─── Native view ──────────────────────────────────────────────────────────────
// Only available on iOS after running `expo prebuild --platform ios`
let NativePencilCanvas: any = null

if (Platform.OS === 'ios') {
  try {
    NativePencilCanvas = requireNativeComponent('CortexPencilCanvas')
  } catch {
    // Native module not yet compiled (before expo prebuild)
    NativePencilCanvas = null
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  onTextRecognized?: (text: string) => void
  onStrokeEnd?: () => void
  pencilOnly?: boolean
  style?: object
}

// ─── Component ────────────────────────────────────────────────────────────────
export const PencilCanvas = forwardRef<PencilCanvasRef, Props>(
  ({ onTextRecognized, onStrokeEnd, pencilOnly = false, style }, ref) => {
    const nativeRef = React.useRef<any>(null)

    useImperativeHandle(ref, () => ({
      clear() {
        dispatchCommand('clear', [])
      },
      undo() {
        dispatchCommand('undo', [])
      },
      redo() {
        dispatchCommand('redo', [])
      },
      setTool(tool: PencilTool) {
        dispatchCommand('setTool', [tool])
      },
      recognizeText() {
        dispatchCommand('recognizeText', [])
      },
    }))

    function dispatchCommand(command: string, args: unknown[]) {
      if (!nativeRef.current) return
      const node = findNodeHandle(nativeRef.current)
      if (!node) return
      UIManager.dispatchViewManagerCommand(node, command, args)
    }

    // ── Fallback: not on iPad or native module not available ────────────────
    if (!NativePencilCanvas || Platform.OS !== 'ios' || !(Platform as any).isPad) {
      return (
        <View style={[styles.fallback, style]}>
          <Text style={styles.fallbackIcon}>✏️</Text>
          <Text style={styles.fallbackTitle}>Apple Pencil</Text>
          <Text style={styles.fallbackText}>
            {Platform.OS !== 'ios'
              ? 'Apple Pencil is only available on iPad.'
              : !(Platform as any).isPad
              ? 'Apple Pencil requires an iPad. Use the keyboard mode on iPhone.'
              : 'Run `expo prebuild --platform ios` and build with Xcode to enable PencilKit.'}
          </Text>
        </View>
      )
    }

    return (
      <NativePencilCanvas
        ref={nativeRef}
        style={[styles.canvas, style]}
        pencilOnly={pencilOnly}
        onTextRecognized={(e: any) => onTextRecognized?.(e.nativeEvent.text)}
        onStrokeEnd={onStrokeEnd}
      />
    )
  }
)

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  fallbackIcon: {
    fontSize: 36,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fallbackText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
