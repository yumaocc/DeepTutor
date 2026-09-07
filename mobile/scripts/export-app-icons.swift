// macOS asset export: reuse the approved orb, without redrawing it.
import AppKit
import Foundation
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let orb = NSImage(contentsOf: root.appendingPathComponent("src/chat/assets/chat-orb.png"))!
func export(_ path: String, _ size: Int, _ fraction: CGFloat, _ opaque: Bool = true) {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let context = NSGraphicsContext(bitmapImageRep: bitmap)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    if opaque {
        NSColor(srgbRed: 246/255, green: 245/255, blue: 250/255, alpha: 1).setFill()
        NSRect(x: 0, y: 0, width: size, height: size).fill()
    }
    let side = CGFloat(size) * fraction
    orb.draw(in: NSRect(x: (CGFloat(size)-side)/2, y: (CGFloat(size)-side)/2, width: side, height: side))
    NSGraphicsContext.restoreGraphicsState()
    let url = root.appendingPathComponent(path)
    try! FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    var output = bitmap
    if opaque {
        let rgb = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        rgb.draw(bitmap.cgImage!, in: CGRect(x: 0, y: 0, width: size, height: size))
        output = NSBitmapImageRep(cgImage: rgb.makeImage()!)
    }
    try! output.representation(using: .png, properties: [:])!.write(to: url)
}
for (density, size) in [("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)] {
    for name in ["ic_launcher", "ic_launcher_round"] { export("android/app/src/main/res/mipmap-\(density)/\(name).png", size, 0.8) }
}
export("android/app/src/main/res/drawable-xxxhdpi/orb_foreground.png", 432, 0.60, false)
export("android/app/src/main/res/drawable-xxxhdpi/launch_orb.png", 384, 1, false)
let catalog = root.appendingPathComponent("ios/DeepTutorRNOH/Images.xcassets/AppIcon.appiconset/Contents.json")
var json = try! JSONSerialization.jsonObject(with: Data(contentsOf: catalog)) as! [String: Any]
var images = json["images"] as! [[String:String]]
for i in images.indices {
    let size = Int(Double(images[i]["size"]!.components(separatedBy: "x")[0])! * Double(images[i]["scale"]!.dropLast())!)
    let filename = "icon-\(size).png"
    export("ios/DeepTutorRNOH/Images.xcassets/AppIcon.appiconset/\(filename)", size, 0.8)
    images[i]["filename"] = filename
}
json["images"] = images
try! JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys]).write(to: catalog)
export("harmony/AppScope/resources/base/media/app_icon.png", 512, 0.8)
export("harmony/entry/src/main/resources/base/media/app_icon.png", 512, 0.8)
export("ios/DeepTutorRNOH/Images.xcassets/LaunchOrb.imageset/orb.png", 288, 1, false)
