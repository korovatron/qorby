import { Game, loadImages } from './Game.js';

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=2025-08-21-18:57')
            .then(reg => {
                console.log('Service Worker registered:', reg);
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

// --- iOS Audio Resume System ---
// iOS detection
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document);
}

// Overlay creation
let audioOverlay = null;
function showAudioOverlay() {
    if (!audioOverlay) {
        audioOverlay = document.createElement('div');
        audioOverlay.id = 'audio-resume-overlay';
        audioOverlay.style.position = 'fixed';
        audioOverlay.style.top = '0';
        audioOverlay.style.left = '0';
        audioOverlay.style.width = '100vw';
        audioOverlay.style.height = '100vh';
        audioOverlay.style.background = 'rgba(0,0,0,0.85)';
        audioOverlay.style.display = 'flex';
        audioOverlay.style.flexDirection = 'column';
        audioOverlay.style.justifyContent = 'center';
        audioOverlay.style.alignItems = 'center';
        audioOverlay.style.zIndex = '9999';
        audioOverlay.innerHTML = '<div style="color: white; font-size: 2em; text-align: center; margin-bottom: 1em;">Audio paused by iOS.<br>Tap anywhere to resume.</div>';
        document.body.appendChild(audioOverlay);
    } else {
        audioOverlay.style.display = 'flex';
    }
    
    // Add direct event handlers to the overlay itself
    audioOverlay.addEventListener('click', function(e) {
        recreateHowlerAndResume();
    }, { once: true });
    
    audioOverlay.addEventListener('touchstart', function(e) {
        e.preventDefault();
        recreateHowlerAndResume();
    }, { once: true });
}

function hideAudioOverlay() {
    if (audioOverlay) {
        audioOverlay.style.display = 'none';
    }
}

// Track if any audio was playing and not muted before suspend
let wasAudioPlaying = false;
let originalOnTapCallback = null;
let manualInputHandler = null;

// Fix for broken InputManager event listeners after audio recreation
function addManualInputManagerHandler() {
    // Remove any existing manual handler
    if (manualInputHandler) {
        document.removeEventListener('touchstart', manualInputHandler.touchStartHandler);
        document.removeEventListener('touchmove', manualInputHandler.touchMoveHandler);
        document.removeEventListener('touchend', manualInputHandler.touchEndHandler);
    }
    
    // Add manual handlers that forward to InputManager
    const touchStartHandler = function(e) {
        if (window.game && window.game.input && window.game.input.handleTouchStart) {
            window.game.input.handleTouchStart(e);
        }
    };
    
    const touchMoveHandler = function(e) {
        if (window.game && window.game.input && window.game.input.handleTouchMove) {
            window.game.input.handleTouchMove(e);
        }
    };
    
    const touchEndHandler = function(e) {
        if (window.game && window.game.input && window.game.input.handleTouchEnd) {
            window.game.input.handleTouchEnd(e);
        }
    };
    
    // Store reference for cleanup
    manualInputHandler = { touchStartHandler, touchMoveHandler, touchEndHandler };
    
    // Add the manual handlers
    document.addEventListener('touchstart', touchStartHandler, { passive: false });
    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('touchend', touchEndHandler, { passive: false });
}

function recreateHowlerAndResume() {
    // Remove old Howler instance's audio context if possible
    try {
        if (Howler.ctx && Howler.ctx.close) {
            Howler.ctx.close();
        }
    } catch (e) {}
    // Remove Howler global ctx to force new context
    try {
        delete Howler.ctx;
        Howler._setup();
    } catch (e) {}

    // Recreate audioSprite
    window.audioSprite = new Howl({
        src: [
            'sounds/qorbyAudioSprite.ogg',
            'sounds/qorbyAudioSprite.m4a',
            'sounds/qorbyAudioSprite.mp3',
            'sounds/qorbyAudioSprite.ac3'
        ],
        sprite: {
            'gameOver': [0, 2037.5510204081634],
            'newLevel': [3500, 2712.0181405895687],
            'smash': [7000, 3384.013605442178],
            'fall': [11500, 346.5306122448979],
            'notRed': [13000, 89.34240362811785],
            'red': [14500, 127.1201814058962]
        },
        volume: 0.7,
        preload: true
    });

    // Play a short silent sound to unlock audio (iOS hack)
    try {
        var ctx = Howler.ctx;
        var buffer = ctx.createBuffer(1, 1, 22050);
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) {}

    // Play test sound to help unlock audio and give feedback
    try {
        if (window.audioSprite && typeof window.audioSprite.play === 'function') {
            window.audioSprite.play('red');
        }
    } catch (e) {}

    hideAudioOverlay();
    
    // Fix: Add manual event handler to bypass broken InputManager listeners
    addManualInputManagerHandler();
    
    // Also reset InputManager to clean state
    if (window.game && window.game.input) {
        window.game.input.resetTouch();
    }
}

// Resume audio or show overlay on iOS
const resumeAudio = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {
            if (isIOS()) showAudioOverlay();
        });
    } else if (isIOS() && (!Howler.ctx || Howler.ctx.state !== 'running')) {
        showAudioOverlay();
    }
    window.removeEventListener('touchstart', resumeAudio);
    window.removeEventListener('click', resumeAudio);
};

// Track if app has been backgrounded (to avoid showing overlay on first launch)
let hasBeenBackgrounded = false;

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        hasBeenBackgrounded = true;
    } else if (document.visibilityState === 'visible') {
        if (isIOS() && hasBeenBackgrounded) {
            // Always show overlay after backgrounding on iOS
            showAudioOverlay();
        } else if (!isIOS()) {
            // Non-iOS: try to resume audio context
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().catch(() => {
                    window.addEventListener('touchstart', resumeAudio, { once: true });
                    window.addEventListener('click', resumeAudio, { once: true });
                });
            }
        }
    }
});

// --- Audio Sprite Definition ---
window.audioSprite = new Howl({
    src: [
        'sounds/qorbyAudioSprite.ogg',
        'sounds/qorbyAudioSprite.m4a',
        'sounds/qorbyAudioSprite.mp3',
        'sounds/qorbyAudioSprite.ac3'
    ],
    sprite: {
        'gameOver': [0, 2037.5510204081634],
        'newLevel': [3500, 2712.0181405895687],
        'smash': [7000, 3384.013605442178],
        'fall': [11500, 346.5306122448979],
        'notRed': [13000, 89.34240362811785],
        'red': [14500, 127.1201814058962]
    },
    volume: 0.7,
    preload: true
});

// --- Game Initialization ---
window.onload = () => {
    loadImages(() => {
        window.game = new Game();
    });
};
