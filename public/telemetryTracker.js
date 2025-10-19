/**
 * Client-side Enhanced Telemetry Tracking
 * 
 * This script tracks comprehensive user interactions including:
 * - Mouse movements and positions
 * - Click timing and positions
 * - Device information
 * - Behavioral patterns
 */

// Global telemetry tracker
const TelemetryTracker = {
    currentRound: null,
    mouseMoves: [],
    clicks: [],
    deviceInfo: null,
    sequenceStartTs: null,
    isTracking: false,

    init() {
        this.deviceInfo = this.collectDeviceInfo();
        this.setupMouseTracking();
    },

    collectDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight
            },
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight
            }
        };
    },

    setupMouseTracking() {
        let lastMouseTime = Date.now();
        let mouseMoveThrottle = 50; // Track mouse every 50ms max

        document.addEventListener('mousemove', (e) => {
            if (!this.isTracking) return;
            
            const now = Date.now();
            if (now - lastMouseTime < mouseMoveThrottle) return;
            
            this.mouseMoves.push({
                x: e.clientX,
                y: e.clientY,
                ts: now
            });
            
            lastMouseTime = now;
        });
    },

    startRound(roundId) {
        this.currentRound = roundId;
        this.mouseMoves = [];
        this.clicks = [];
        this.sequenceStartTs = null;
        this.isTracking = true;
        console.log('📊 Telemetry tracking started for round:', roundId);
    },

    recordSequenceStart() {
        this.sequenceStartTs = Date.now();
    },

    recordClick(index, gridElement) {
        if (!this.isTracking) return;

        const rect = gridElement.getBoundingClientRect();
        const clickData = {
            index: index,
            clientTs: Date.now(),
            xPx: rect.left + rect.width / 2,  // Center of the clicked cell
            yPx: rect.top + rect.height / 2
        };

        this.clicks.push(clickData);
        console.log('🖱️ Click recorded:', clickData);
    },

    stopRound() {
        this.isTracking = false;
    },

    getTelemetryData() {
        return {
            clicks: this.clicks,
            mouseMoves: this.mouseMoves,
            sequenceStartTs: this.sequenceStartTs,
            deviceInfo: this.deviceInfo
        };
    },

    reset() {
        this.currentRound = null;
        this.mouseMoves = [];
        this.clicks = [];
        this.sequenceStartTs = null;
        this.isTracking = false;
    }
};

// Initialize on page load
if (typeof window !== 'undefined') {
    window.TelemetryTracker = TelemetryTracker;
    TelemetryTracker.init();
}