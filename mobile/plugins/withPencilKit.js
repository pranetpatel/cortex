// Expo config plugin — adds PencilKit + Vision framework and the native Swift
// module to the iOS Xcode project during `expo prebuild`.
const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins')
const path = require('path')
const fs   = require('fs')

const SWIFT_FILES = [
  'PencilCanvasView.swift',
  'PencilCanvasViewManager.swift',
]

const BRIDGING_HEADER = 'CortexPencil-Bridging-Header.h'

const FRAMEWORKS = ['PencilKit', 'Vision']

/**
 * 1. Copies ios/CortexPencil/ files into the Xcode project group
 * 2. Adds PencilKit and Vision frameworks
 * 3. Sets the Swift bridging header build setting
 */
const withPencilKit = (config) => {
  // ── Add frameworks ─────────────────────────────────────────────────────────
  config = withXcodeProject(config, async (cfg) => {
    const proj = cfg.modResults
    const pbx  = proj.pbxProjectSection()

    for (const fw of FRAMEWORKS) {
      const fwName = `${fw}.framework`
      // Add only if not already present
      const already = Object.values(proj.pbxFileReferenceSection()).some(
        (ref) => ref && ref.path === `"${fwName}"`
      )
      if (!already) {
        proj.addFramework(fwName, { weak: false })
      }
    }

    // ── Add Swift source files to the main target ─────────────────────────
    const moduleSrcDir = path.join(
      cfg.modRequest.projectRoot,
      'ios',
      'CortexPencil'
    )

    // Ensure the source files are in ios/CortexPencil (they are committed)
    for (const file of SWIFT_FILES) {
      const src  = path.join(moduleSrcDir, file)
      const dest = path.join(cfg.modRequest.platformProjectRoot, 'CortexPencil', file)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest)
      }

      // Add to Xcode project group if not already there
      const relPath = `CortexPencil/${file}`
      const fileRef  = proj.getFile(relPath)
      if (!fileRef) {
        proj.addSourceFile(relPath, {}, proj.getFirstTarget()?.uuid)
      }
    }

    // ── Copy bridging header ───────────────────────────────────────────────
    const bhSrc  = path.join(moduleSrcDir, BRIDGING_HEADER)
    const bhDest = path.join(cfg.modRequest.platformProjectRoot, 'CortexPencil', BRIDGING_HEADER)
    if (fs.existsSync(bhSrc) && !fs.existsSync(bhDest)) {
      fs.copyFileSync(bhSrc, bhDest)
    }

    // ── Set bridging header build setting ──────────────────────────────────
    const target = proj.getFirstTarget()
    if (target) {
      const targetName = target.firstTarget.name.replace(/"/g, '')
      const headerPath = `CortexPencil/${BRIDGING_HEADER}`
      proj.addBuildProperty(
        'SWIFT_OBJC_BRIDGING_HEADER',
        `"$(SRCROOT)/${headerPath}"`,
        'Debug',
        targetName
      )
      proj.addBuildProperty(
        'SWIFT_OBJC_BRIDGING_HEADER',
        `"$(SRCROOT)/${headerPath}"`,
        'Release',
        targetName
      )
    }

    return cfg
  })

  // ── Add NSApplePencilUsageDescription to Info.plist ────────────────────────
  config = withInfoPlist(config, (cfg) => {
    if (!cfg.modResults['NSApplePencilUsageDescription']) {
      cfg.modResults['NSApplePencilUsageDescription'] =
        'Used for handwriting input in the essay editor'
    }
    return cfg
  })

  return config
}

module.exports = withPencilKit
