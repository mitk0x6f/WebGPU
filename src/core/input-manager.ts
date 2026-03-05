// core/input-manager.ts

export class InputManager
{
    private _keysPressed: Set<string> = new Set();
    private _mouseDelta = { x: 0, y: 0 };
    private _scrollDelta = 0;
    private _mouseButtons = 0;

    constructor()
    {
        this._initListeners();
    }

    private _initListeners(): void
    {
        window.addEventListener('keydown', (e) => this._keysPressed.add(e.key.toLowerCase()));
        window.addEventListener('keyup', (e) => this._keysPressed.delete(e.key.toLowerCase()));

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('mousedown', (e) => {
            this._mouseButtons = e.buttons;

            // * Pointer Lock Logic *
            // We only request lock if we are NOT clicking on a UI element (handled by main.ts usually,
            // but we can check if the target is the body or canvas here if needed).
            // For now, we'll provide the mechanism.
            if (e.button === 0 || e.button === 2)
            {
                // We'll let the caller decide if they want to lock,
                // but standard behavior for this app is locking on drag.
            }
        });

        window.addEventListener('mouseup', (e) => {
            this._mouseButtons = e.buttons;

            if (this._mouseButtons === 0 && document.pointerLockElement) document.exitPointerLock();
        });

        window.addEventListener('mousemove', (e) => {
            // Accumulate movement
            this._mouseDelta.x += e.movementX;
            this._mouseDelta.y += e.movementY;
        });

        window.addEventListener('wheel', (e) => {
            // Accumulate scroll
            this._scrollDelta += Math.sign(e.deltaY);
        }, { passive: true });
    }

    public isKeyPressed(key: string): boolean
    {
        return this._keysPressed.has(key.toLowerCase());
    }

    public getMouseButtons(): number
    {
        return this._mouseButtons;
    }

    public consumeMouseDelta(): { x: number, y: number }
    {
        const delta = { ...this._mouseDelta };

        this._mouseDelta.x = 0;
        this._mouseDelta.y = 0;

        return delta;
    }

    public consumeScrollDelta(): number
    {
        const scroll = this._scrollDelta;
        this._scrollDelta = 0;

        return scroll;
    }

    public dispose(): void
    {
        // In a real app we might want to remove listeners,
        // but for this singleton-like usage it's fine.
    }
}
