// core/input-manager.ts

export class InputManager
{
    private _keysPressed: Set<string> = new Set();
    private _mouseDelta = { x: 0, y: 0 };
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

            if (e.buttons !== 0) document.body.style.cursor = 'none';
        });
        window.addEventListener('mouseup', (e) => {
            this._mouseButtons = e.buttons;

            if (e.buttons === 0) document.body.style.cursor = '';
        });

        window.addEventListener('mousemove', (e) => {
            // Accumulate movement
            this._mouseDelta.x += e.movementX;
            this._mouseDelta.y += e.movementY;
        });
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

    public dispose(): void
    {
        // In a real app we might want to remove listeners,
        // but for this singleton-like usage it's fine.
    }
}
