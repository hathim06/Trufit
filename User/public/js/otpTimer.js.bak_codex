/**
 * Reusable OTP Timer Function
 * @param {Object} config - Configuration object
 * @param {string} config.timerElementId - ID of timer display element (e.g., 'timer')
 * @param {string} config.timerContainerId - ID of container showing "Resend in Xs" (e.g., 'timer-container')
 * @param {string} config.resendButtonId - ID of resend link/button (e.g., 'resend-link')
 * @param {number} config.duration - Timer duration in seconds (default: 60)
 * @param {string} config.storageKey - sessionStorage key for timer (default: 'otpTimerExpiry')
 * @param {function} config.onTimerEnd - Callback when timer ends (optional)
 */
function initializeOtpTimer(config) {
    // Set defaults
    const timerElement = document.getElementById(config.timerElementId);
    const timerContainer = document.getElementById(config.timerContainerId);
    const resendButton = document.getElementById(config.resendButtonId);
    const duration = config.duration || 60;
    const storageKey = config.storageKey || 'otpTimerExpiry';
    const onTimerEnd = config.onTimerEnd || null;

    if (!timerElement || !timerContainer || !resendButton) {
        console.error('OTP Timer: Missing required HTML elements');
        return;
    }

    let timeLeft;
    const storedExpiry = sessionStorage.getItem(storageKey);
    const now = Date.now();

    // Calculate remaining time
    if (storedExpiry && now < parseInt(storedExpiry, 10)) {
        // Timer still running from previous session
        timeLeft = Math.ceil((parseInt(storedExpiry, 10) - now) / 1000);
    } else {
        // Start fresh timer
        timeLeft = duration;
        sessionStorage.setItem(storageKey, now + (duration * 1000));
    }

    timerElement.textContent = timeLeft;

    // If timer already expired
    if (timeLeft <= 0) {
        showResendButton();
        return;
    }

    // Start countdown
    const countdown = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            showResendButton();
            sessionStorage.removeItem(storageKey);

            // Execute callback if provided
            if (onTimerEnd && typeof onTimerEnd === 'function') {
                onTimerEnd();
            }
        }
    }, 1000);

    // Helper function to show resend button
    function showResendButton() {
        timerContainer.style.display = 'none';
        resendButton.style.display = 'inline';
        resendButton.classList.remove('disabled');
    }

    // Return object with cleanup/reset functions (optional)
    return {
        reset: () => {
            clearInterval(countdown);
            sessionStorage.removeItem(storageKey);
            initializeOtpTimer(config); // Restart timer
        },
        stop: () => clearInterval(countdown)
    };
}

// Export for use in modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeOtpTimer };
}
