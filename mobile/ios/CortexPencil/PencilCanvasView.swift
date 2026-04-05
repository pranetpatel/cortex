import UIKit
import PencilKit
import Vision

@objc(CortexPencilCanvas)
class PencilCanvasView: UIView, PKCanvasViewDelegate {

  // ── Sub-views ───────────────────────────────────────────────────────────────
  private let canvasView  = PKCanvasView()
  private let toolPicker  = PKToolPicker()

  // ── RN event callbacks ──────────────────────────────────────────────────────
  @objc var onTextRecognized: RCTBubblingEventBlock?
  @objc var onStrokeEnd:      RCTBubblingEventBlock?

  // ── Props ───────────────────────────────────────────────────────────────────
  @objc var pencilOnly: Bool = false {
    didSet {
      canvasView.drawingPolicy = pencilOnly ? .pencilOnly : .anyInput
    }
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  override init(frame: CGRect) {
    super.init(frame: frame)
    setupCanvas()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupCanvas()
  }

  private func setupCanvas() {
    canvasView.drawingPolicy    = pencilOnly ? .pencilOnly : .anyInput
    canvasView.backgroundColor  = UIColor(red: 0.055, green: 0.055, blue: 0.067, alpha: 1) // #0e0e11
    canvasView.overrideUserInterfaceStyle = .dark
    canvasView.delegate         = self

    // Default tool: white ink pen, width 2
    canvasView.tool = PKInkingTool(.pen, color: .white, width: 2)

    addSubview(canvasView)

    // Show PencilKit tool picker on iPad
    if UIDevice.current.userInterfaceIdiom == .pad {
      toolPicker.setVisible(true, forFirstResponder: canvasView)
      toolPicker.addObserver(canvasView)
      canvasView.becomeFirstResponder()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    canvasView.frame = bounds
  }

  // ── PKCanvasViewDelegate ─────────────────────────────────────────────────────
  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    onStrokeEnd?([:])
  }

  // ── Commands from React Native ────────────────────────────────────────────────
  @objc func clear() {
    canvasView.drawing = PKDrawing()
  }

  @objc func undo() {
    canvasView.undoManager?.undo()
  }

  @objc func redo() {
    canvasView.undoManager?.redo()
  }

  @objc func setTool(_ tool: String) {
    switch tool {
    case "pen":
      canvasView.tool = PKInkingTool(.pen,       color: .white, width: 2)
    case "pencil":
      canvasView.tool = PKInkingTool(.pencil,    color: .white, width: 3)
    case "marker":
      canvasView.tool = PKInkingTool(.marker,    color: .white, width: 10)
    case "eraser":
      canvasView.tool = PKEraserTool(.vector)
    default:
      break
    }
  }

  // ── Handwriting recognition via Vision ─────────────────────────────────────
  @objc func recognizeText() {
    let drawing  = canvasView.drawing
    let image    = drawing.image(from: drawing.bounds, scale: UIScreen.main.scale)

    guard let cgImage = image.cgImage else { return }

    let request  = VNRecognizeTextRequest { [weak self] req, _ in
      guard let self = self else { return }

      let strings = (req.results as? [VNRecognizedTextObservation])?.compactMap {
        $0.topCandidates(1).first?.string
      } ?? []

      let combined = strings.joined(separator: "\n")
      guard !combined.isEmpty else { return }

      DispatchQueue.main.async {
        self.onTextRecognized?(["text": combined])
        // Optionally clear the canvas after recognition
        self.canvasView.drawing = PKDrawing()
      }
    }

    request.recognitionLevel  = .accurate
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    DispatchQueue.global(qos: .userInitiated).async {
      try? handler.perform([request])
    }
  }
}
