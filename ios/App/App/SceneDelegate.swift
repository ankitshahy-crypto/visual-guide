import UIKit
import Capacitor

/// UIScene lifecycle required by current Xcode. Without this, launch hits
/// `EXC_BREAKPOINT` on `AppDelegate` (`@UIApplicationMain`) and the phone stays black.
///
/// Matches the Capacitor iOS template: the bridge window is created here, not only
/// via the storyboard. URL opens go through `ApplicationDelegateProxy` (Capacitor 7).
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

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

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
