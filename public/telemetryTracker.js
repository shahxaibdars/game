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

    getClickType(event) {
        if (!event) return 'unknown';
        if (event.pointerType) {
            if (event.pointerType === 'mouse') {
                if (event.button === 0) return 'mouse_left';
                if (event.button === 1) return 'mouse_middle';
                if (event.button === 2) return 'mouse_right';
            }
            return event.pointerType; // e.g. "touch" or "pen"
        }
        if (event.type.includes('touch')) return 'touch';
        if (event.isTrusted === false) return 'synthetic';
        return 'unknown';
    },


    recordClick(index, gridElement, event) {
        if (!this.isTracking) return;

        const rect = gridElement.getBoundingClientRect();

        const clickData = {
            index,
            clientTs: Date.now(),
            xPx: rect.left + rect.width / 2,
            yPx: rect.top + rect.height / 2,
            clickType: this.getClickType(event),
            isTrusted: event.isTrusted,
            eventType: event.type,
            button: event.button
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