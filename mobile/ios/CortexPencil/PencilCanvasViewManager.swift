import Foundation

@objc(CortexPencilCanvasManager)
class CortexPencilCanvasManager: RCTViewManager {

  override func view() -> UIView! {
    return PencilCanvasView()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  // ── Commands ──────────────────────────────────────────────────────────────
  @objc func clear(_ node: NSNumber) {
    DispatchQueue.main.async {
      if let view = self.bridge.uiManager.view(forReactTag: node) as? PencilCanvasView {
        view.clear()
      }
    }
  }

  @objc func undo(_ node: NSNumber) {
    DispatchQueue.main.async {
      if let view = self.bridge.uiManager.view(forReactTag: node) as? PencilCanvasView {
        view.undo()
      }
    }
  }

  @objc func redo(_ node: NSNumber) {
    DispatchQueue.main.async {
      if let view = self.bridge.uiManager.view(forReactTag: node) as? PencilCanvasView {
        view.redo()
      }
    }
  }

  @objc func setTool(_ node: NSNumber, tool: String) {
    DispatchQueue.main.async {
      if let view = self.bridge.uiManager.view(forReactTag: node) as? PencilCanvasView {
        view.setTool(tool)
      }
    }
  }

  @objc func recognizeText(_ node: NSNumber) {
    DispatchQueue.main.async {
      if let view = self.bridge.uiManager.view(forReactTag: node) as? PencilCanvasView {
        view.recognizeText()
      }
    }
  }
}
