import UIKit
import AVFoundation
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Clip player, hashed TTS, and speechSynthesis need playback even when
        // the hardware Silent switch is on. A failed session must not abort launch.
        configurePlaybackSession()
        return true
    }

    /// `.playback` ignores the Silent switch. `.spokenAudio` can trap
    /// (`EXC_BREAKPOINT`) on device during launch instead of throwing, so this
    /// uses the default mode and mixes with other audio. Thrown errors are logged.
    private func configurePlaybackSession() {
        let session = AVAudioSession.sharedInstance()
        let configured = applyPlaybackCategory(session, options: [.mixWithOthers])
            || applyPlaybackCategory(session, options: [])
        guard configured else { return }
        do {
            try session.setActive(true)
        } catch {
            NSLog("Plainstep: AVAudioSession setActive failed: \(error.localizedDescription). Launch continues.")
        }
    }

    private func applyPlaybackCategory(_ session: AVAudioSession, options: AVAudioSession.CategoryOptions) -> Bool {
        do {
            try session.setCategory(.playback, mode: .default, options: options)
            return true
        } catch {
            NSLog("Plainstep: AVAudioSession setCategory(.playback, options: \(options.rawValue)) failed: \(error.localizedDescription). Launch continues.")
            return false
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        // Returning a configuration replaces the Info.plist scene entirely.
        // Without the Main storyboard here, UIKit never installs
        // CAPBridgeViewController and the phone stays black.
        let config = UISceneConfiguration(
            name: "Default Configuration",
            sessionRole: connectingSceneSession.role
        )
        config.delegateClass = SceneDelegate.self
        config.storyboard = UIStoryboard(name: "Main", bundle: nil)
        return config
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
