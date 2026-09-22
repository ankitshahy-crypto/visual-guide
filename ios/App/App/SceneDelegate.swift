import UIKit
import Capacitor

/// UIScene lifecycle required by current Xcode. Without this, launch hits
/// `EXC_BREAKPOINT` on `AppDelegate` (`@UIApplicationMain`) and the phone stays black.
///
/// The bridge window comes from `Main.storyboard` (`UISceneStoryboardFile`), which
/// `AppDelegate.configurationForConnecting` must also set — that method replaces the
/// Info.plist scene, so a missing storyboard there drops `CAPBridgeViewController`.
/// Replacing the storyboard window with a second `UIWindow` leaves a zero-size
/// WKWebView (Capacitor builds it at `.zero`) and the phone stays black.
///
/// URL opens go through `ApplicationDelegateProxy` (Capacitor 7).
/// `SceneDelegateProxy` is the same job on Capacitor 8.5+; this project stays on the
/// proxy that already ships with the installed iOS package.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else {
            NSLog("Plainstep: scene is not a UIWindowScene. Capacitor bridge was not installed.")
            return
        }

        if window == nil || window?.rootViewController == nil {
            NSLog("Plainstep: storyboard window missing. Creating CAPBridgeViewController().")
            let created = UIWindow(windowScene: windowScene)
            let bounds = windowScene.coordinateSpace.bounds
            created.frame = bounds
            created.backgroundColor = UIColor(red: 17 / 255, green: 18 / 255, blue: 20 / 255, alpha: 1)
            let bridge = PlainstepBridgeViewController()
            created.rootViewController = bridge
            created.makeKeyAndVisible()
            bridge.view.frame = created.bounds
            bridge.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            window = created
        } else if !(window?.rootViewController is CAPBridgeViewController) {
            NSLog("Plainstep: root is \(type(of: window?.rootViewController)). Installing CAPBridgeViewController().")
            let bridge = PlainstepBridgeViewController()
            window?.rootViewController = bridge
            window?.makeKeyAndVisible()
            bridge.view.frame = window?.bounds ?? windowScene.coordinateSpace.bounds
            bridge.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        } else {
            NSLog("Plainstep: using Main.storyboard window. Not replacing it. bounds=\(window?.bounds ?? .zero)")
            window?.backgroundColor = UIColor(red: 17 / 255, green: 18 / 255, blue: 20 / 255, alpha: 1)
        }

        // Plugins register while the bridge view loads. Deliver launch URLs on the
        // next turn so listeners exist. `lastURL` is still set for getLaunchUrl().
        let urlContexts = connectionOptions.urlContexts
        let activities = Array(connectionOptions.userActivities)
        DispatchQueue.main.async {
            self.forward(urlContexts: urlContexts)
            for activity in activities {
                _ = ApplicationDelegateProxy.shared.application(
                    UIApplication.shared,
                    continue: activity,
                    restorationHandler: { _ in }
                )
            }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        forward(urlContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }

    private func forward(urlContexts: Set<UIOpenURLContext>) {
        for context in urlContexts {
            var options: [UIApplication.OpenURLOptionsKey: Any] = [
                .openInPlace: context.options.openInPlace,
            ]
            if let source = context.options.sourceApplication {
                options[.sourceApplication] = source
            }
            if let annotation = context.options.annotation {
                options[.annotation] = annotation
            }
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: context.url,
                options: options
            )
        }
    }
}
