import { useState, useEffect } from 'react';
import './InstallPrompt.css';

const InstallPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        console.log('[InstallPrompt] Component mounted');

        // Check if already installed (running as standalone app)
        const standalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');

        console.log('[InstallPrompt] Standalone mode:', standalone);
        setIsStandalone(standalone);

        // Check if iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        console.log('[InstallPrompt] Is iOS:', iOS);
        setIsIOS(iOS);

        // Check if user has already dismissed the prompt
        const dismissed = localStorage.getItem('installPromptDismissed');
        const dismissedTime = localStorage.getItem('installPromptDismissedTime');
        console.log('[InstallPrompt] Dismissed:', dismissed, 'Time:', dismissedTime);

        // Show again after 7 days if previously dismissed
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const shouldShowAgain = dismissedTime && parseInt(dismissedTime) < sevenDaysAgo;
        console.log('[InstallPrompt] Should show again:', shouldShowAgain);

        if (standalone) {
            console.log('[InstallPrompt] Not showing - already in standalone mode');
            return; // Already installed
        }

        if (dismissed && !shouldShowAgain) {
            console.log('[InstallPrompt] Not showing - user dismissed recently');
            return; // User dismissed and 7 days haven't passed
        }

        // For Android/Chrome - listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e) => {
            console.log('[InstallPrompt] beforeinstallprompt event fired!');
            e.preventDefault();
            setDeferredPrompt(e);

            // Show prompt after a short delay (better UX)
            setTimeout(() => {
                console.log('[InstallPrompt] Showing prompt (Android/Chrome)');
                setShowPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS - show manual instructions after a delay
        if (iOS && !standalone) {
            setTimeout(() => {
                console.log('[InstallPrompt] Showing prompt (iOS)');
                setShowPrompt(true);
            }, 3000);
        }

        // Fallback: If beforeinstallprompt doesn't fire after 5 seconds (Chrome/Android),
        // show the prompt anyway so users can see manual install instructions
        if (!iOS && !standalone) {
            const fallbackTimer = setTimeout(() => {
                console.log('[InstallPrompt] beforeinstallprompt did not fire, showing fallback prompt');
                setShowPrompt(true);
            }, 5000);

            // Clear fallback if the event fires
            const originalHandler = handleBeforeInstallPrompt;
            const wrappedHandler = (e) => {
                clearTimeout(fallbackTimer);
                originalHandler(e);
            };
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.addEventListener('beforeinstallprompt', wrappedHandler);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt && !isIOS) {
            return;
        }

        if (deferredPrompt) {
            // Android/Chrome - show native prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }

            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('installPromptDismissedTime', Date.now().toString());
        setShowPrompt(false);
    };

    if (!showPrompt || isStandalone) {
        return null;
    }

    return (
        <div className="install-prompt-overlay">
            <div className="install-prompt">
                <button className="install-close" onClick={handleDismiss}>×</button>

                <div className="install-icon">📱</div>
                <h3>Install KinPulse</h3>

                {isIOS ? (
                    // iOS Instructions
                    <div className="install-content">
                        <p>Add KinPulse to your home screen for the best experience!</p>
                        <div className="ios-instructions">
                            <div className="instruction-step">
                                <span className="step-number">1</span>
                                <span>Tap the <strong>Share</strong> button <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" /></svg></span>
                            </div>
                            <div className="instruction-step">
                                <span className="step-number">2</span>
                                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                            </div>
                            <div className="instruction-step">
                                <span className="step-number">3</span>
                                <span>Tap <strong>"Add"</strong> to confirm</span>
                            </div>
                        </div>
                        <button className="install-dismiss" onClick={handleDismiss}>
                            Maybe Later
                        </button>
                    </div>
                ) : (
                    // Android/Chrome
                    <div className="install-content">
                        <p>Install KinPulse for quick access and a better experience!</p>
                        <div className="install-benefits">
                            <div className="benefit">✓ Works offline</div>
                            <div className="benefit">✓ Faster loading</div>
                            <div className="benefit">✓ Full screen experience</div>
                        </div>
                        {deferredPrompt ? (
                            <button className="install-button" onClick={handleInstallClick}>
                                Install App
                            </button>
                        ) : (
                            <div className="ios-instructions">
                                <div className="instruction-step">
                                    <span className="step-number">1</span>
                                    <span>Click the <strong>⋮</strong> menu (top right)</span>
                                </div>
                                <div className="instruction-step">
                                    <span className="step-number">2</span>
                                    <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                                </div>
                                <div className="instruction-step">
                                    <span className="step-number">3</span>
                                    <span>Tap <strong>"Install"</strong> to confirm</span>
                                </div>
                            </div>
                        )}
                        <button className="install-dismiss" onClick={handleDismiss}>
                            Not Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstallPrompt;
