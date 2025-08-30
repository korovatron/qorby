// InputManager.js
export class InputManager {
	constructor() {
		this.keys = {
			ArrowUp: false,
			ArrowDown: false,
			ArrowLeft: false,
			ArrowRight: false,
			Space: false
		};
		this.minDelta = 2;
		this.swipeThreshold = 10;
		this.onTap = null;
		this.resetTouch();
		this.attachEvents();
	}

	resetTouch() {
		this.startX = null;
		this.startY = null;
		this.lastX = null;
		this.lastY = null;
		this.swipeDirection = null;
		this.isTap = false;
		this.moveTouchId = null;
		this.hasMovedBeyondThreshold = false;
	}

	setKey(key, state) {
		if (this.keys[key] !== undefined) {
			this.keys[key] = state;
		}
	}

	attachEvents() {
		// Store bound handlers so we can remove them later
		this.keydownHandler = e => {
			this.setKey(e.code === 'Space' ? 'Space' : e.key, true);
		};
		this.keyupHandler = e => {
			this.setKey(e.code === 'Space' ? 'Space' : e.key, false);
		};
		this.touchStartHandler = this.handleTouchStart.bind(this);
		this.touchMoveHandler = this.handleTouchMove.bind(this);
		this.touchEndHandler = this.handleTouchEnd.bind(this);
		this.gestureStartHandler = e => e.preventDefault();

		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
		document.addEventListener('touchstart', this.touchStartHandler, { passive: false });
		document.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
		document.addEventListener('touchend', this.touchEndHandler, { passive: false });
		document.addEventListener('gesturestart', this.gestureStartHandler, { passive: false });
	}

	detachEvents() {
		if (this.keydownHandler) {
			document.removeEventListener('keydown', this.keydownHandler);
		}
		if (this.keyupHandler) {
			document.removeEventListener('keyup', this.keyupHandler);
		}
		if (this.touchStartHandler) {
			document.removeEventListener('touchstart', this.touchStartHandler);
		}
		if (this.touchMoveHandler) {
			document.removeEventListener('touchmove', this.touchMoveHandler);
		}
		if (this.touchEndHandler) {
			document.removeEventListener('touchend', this.touchEndHandler);
		}
		if (this.gestureStartHandler) {
			document.removeEventListener('gesturestart', this.gestureStartHandler);
		}
	}

	resetEventSystem() {
		this.detachEvents();
		this.attachEvents();
	}

	handleTouchStart(e) {
		e.preventDefault();
		for (let touch of e.changedTouches) {
			if (this.moveTouchId === null) {
				this.moveTouchId = touch.identifier;
				this.startX = touch.clientX;
				this.startY = touch.clientY;
				this.lastX = this.startX;
				this.lastY = this.startY;
				this.swipeDirection = null;
				this.isTap = true;
				this.hasMovedBeyondThreshold = false;
			} else {
				this.setKey('Space', true);
				setTimeout(() => this.setKey('Space', false), 50);
			}
		}
	}

	handleTouchMove(e) {
		e.preventDefault();
		for (let touch of e.changedTouches) {
			if (touch.identifier === this.moveTouchId) {
				const dx = touch.clientX - this.lastX;
				const dy = touch.clientY - this.lastY;
				this.lastX = touch.clientX;
				this.lastY = touch.clientY;
				if (!this.hasMovedBeyondThreshold) {
					const totalDx = touch.clientX - this.startX;
					const totalDy = touch.clientY - this.startY;
					if (Math.abs(totalDx) > this.swipeThreshold || Math.abs(totalDy) > this.swipeThreshold) {
						this.hasMovedBeyondThreshold = true;
						this.isTap = false;
					} else {
						return;
					}
				}
				if (Math.abs(dx) < this.minDelta && Math.abs(dy) < this.minDelta) {
					return;
				}
				let newDirection = Math.abs(dx) > Math.abs(dy)
					? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
					: (dy > 0 ? 'ArrowDown' : 'ArrowUp');
				if (newDirection !== this.swipeDirection) {
					if (this.swipeDirection) this.setKey(this.swipeDirection, false);
					this.swipeDirection = newDirection;
					this.setKey(this.swipeDirection, true);
				}
			}
		}
	}

	handleTouchEnd(e) {
		e.preventDefault();
		for (let touch of e.changedTouches) {
			if (touch.identifier === this.moveTouchId) {
				if (this.swipeDirection) {
					this.setKey(this.swipeDirection, false);
					this.swipeDirection = null;
				} else if (this.isTap) {
					if (this.onTap) this.onTap(touch);
				}
				this.moveTouchId = null;
				this.hasMovedBeyondThreshold = false;
				this.lastX = null;
				this.lastY = null;
			}
		}
	}
}
