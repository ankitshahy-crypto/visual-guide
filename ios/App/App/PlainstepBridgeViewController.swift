import UIKit
import WebKit
import Capacitor

/// Storyboard root (`Main.storyboard`). Owns the WKWebView load path:
/// a real frame, bundled `public/index.html`, and a visible error if that file
/// never becomes a document. Capacitor's stock controller creates the web view
/// at `.zero` and calls `exit` when `index.html` is missing — both look like a
/// black screen on a phone.
class PlainstepBridgeViewController: CAPBridgeViewController {

    private var didLogAppearance = false
    private var didInstallFallback = false

    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        dropUnreachableLiveReload(on: descriptor)
        return descriptor
    }

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let web = super.webView(with: frame, configuration: configuration)
        // Stock Capacitor builds this view at `.zero` with no autoresizing mask.
        // If the window bounds are still empty when it becomes root, it never
        // grows and the phone stays black while the bridge is "running".
        let initial = frame.width > 2 && frame.height > 2 ? frame : UIScreen.main.bounds
        web.frame = initial
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = true
        return web
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView?.isInspectable = true
        }
        #endif
        let file = bridge?.config.appStartFileURL.path ?? "nil"
        let url = bridge?.config.appStartServerURL.absoluteString ?? "nil"
        NSLog("Plainstep: bridge ready. index=\(file) startURL=\(url)")
    }

    override func viewDidLoad() {
        let startPath = bridge?.config.appStartFileURL.path
        if let startPath, !FileManager.default.fileExists(atPath: startPath) {
            // Do not call super. CAPBridgeViewController.viewDidLoad exits the
            // process when index.html is missing, which looks like a black screen.
            NSLog("Plainstep: index.html missing at \(startPath). Run npm run ios:sync.")
            installFallback(
                title: "Plainstep has no web bundle",
                detail: "Missing \(startPath).\n\nOn the Mac, from the repo: git pull, npm install, unset CAPACITOR_LIVE_RELOAD, unset VITE_BASE, npm run ios:sync, then Xcode Run."
            )
            return
        }
        super.viewDidLoad()
        watchForEmptyDocument()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        expandIfCollapsed()
        if !didLogAppearance {
            didLogAppearance = true
            NSLog("Plainstep: bridge bounds=\(view.bounds) window=\(view.window?.bounds ?? .zero) url=\(webView?.url?.absoluteString ?? "not loaded")")
        }
    }

    /// `server.url` of localhost is the `ios:live-sync` default. Simulator shares
    /// the Mac loopback. A physical iPhone does not — WKWebView waits on a host
    /// that is the phone itself and stays black. Bundled `public/` is used instead.
    private func dropUnreachableLiveReload(on descriptor: InstanceDescriptor) {
        #if targetEnvironment(simulator)
        return
        #else
        guard let raw = descriptor.serverURL, let url = URL(string: raw) else { return }
        let host = (url.host ?? "").lowercased()
        let loopback = host == "localhost" || host == "127.0.0.1" || host == "::1"
        guard loopback else { return }
        NSLog("Plainstep: ignoring live-reload \(raw) on a physical iPhone. Loading bundled public/. For device live-reload use the Mac LAN IP, not localhost.")
        descriptor.serverURL = nil
        #endif
    }

    private func expandIfCollapsed() {
        guard view.bounds.width < 2 || view.bounds.height < 2 else { return }
        let windowBounds = view.window?.bounds ?? .zero
        let sceneBounds = view.window?.windowScene?.coordinateSpace.bounds ?? UIScreen.main.bounds
        let bounds = windowBounds.width > 2 ? windowBounds : sceneBounds
        view.frame = bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        NSLog("Plainstep: expanded zero-size WKWebView to \(bounds)")
    }

    private func watchForEmptyDocument() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in
            guard let self, let webView = self.webView else { return }
            webView.evaluateJavaScript(
                "(function(){var b=document.body;return b?b.innerText.length:0})()"
            ) { [weak self] value, error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    let length = (value as? NSNumber)?.intValue
                    let url = webView.url?.absoluteString
                        ?? self.bridge?.config.appStartServerURL.absoluteString
                        ?? "unknown"
                    if error != nil || length == 0 {
                        NSLog("Plainstep: WKWebView has no document. url=\(url) error=\(String(describing: error))")
                        self.installFallback(
                            title: "Plainstep could not load index.html",
                            detail: "Start URL: \(url)\n\ngit pull, unset CAPACITOR_LIVE_RELOAD, unset VITE_BASE, npm run ios:sync, then Xcode Run. Safari → Develop → your iPhone → Plainstep. Xcode lines start with Plainstep:."
                        )
                    } else {
                        NSLog("Plainstep: WKWebView document loaded (\(length ?? -1) chars) url=\(url)")
                    }
                }
            }
        }
    }

    private func installFallback(title: String, detail: String) {
        guard !didInstallFallback else { return }
        didInstallFallback = true
        let label = UILabel()
        label.numberOfLines = 0
        label.textColor = UIColor(red: 243 / 255, green: 244 / 255, blue: 245 / 255, alpha: 1)
        label.font = .systemFont(ofSize: 17, weight: .semibold)
        label.text = "\(title)\n\n\(detail)"
        label.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = UIColor(red: 17 / 255, green: 18 / 255, blue: 20 / 255, alpha: 1)
        view.addSubview(label)
        let guide = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -24),
            label.topAnchor.constraint(equalTo: guide.topAnchor, constant: 48),
        ])
    }
}
