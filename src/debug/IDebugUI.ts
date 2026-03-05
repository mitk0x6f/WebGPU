// debug/IDebugUI.ts

/**
 * Abstract interface for debug UI binding.
 * This ensures our debug system is decoupled from any specific implementation (like Tweakpane).
 * We can later replace this with a custom WebGPU-rendered UI.
 */
export interface IDebugUI
{
    /**
     * Creates a new collapsible folder for grouping related properties.
     * @param title The title of the folder.
     */
    addFolder(title: string): IDebugFolder;

    /**
     * Adds a set of tabs to the root of the UI.
     * @param options Configuration for tabs (titles).
     */
    addTabs(options: { pages: { title: string }[] }): IDebugTabContainer;

    /**
     * Refreshes all bindings to match current values in the target objects.
     */
    refresh(): void;

    /**
     * Cleans up all resources associated with the UI.
     */
    dispose(): void;

    /**
     * Is the UI currently visible?
     */
    get visible(): boolean;
    set visible(value: boolean);

    /**
     * Whether the mouse pointer is currently over the debug UI.
     * Useful for disabling game controls during UI interaction.
     */
    readonly isPointerOver: boolean;

    /**
     * Whether the user is currently typing in an input field within the debug UI.
     */
    readonly isTyping: boolean;

    /**
     * Whether the user is currently interacting with the UI (mouse button down on it).
     */
    readonly isInteracting: boolean;
}

export interface IDebugFolder
{
    /**
     * Adds an interactive binding to a property of an object.
     * @param target The object containing the property.
     * @param key The property key to bind to.
     * @param options Optional configuration (min, max, step, options).
     */
    addBinding<T extends object>(target: T, key: keyof T, options?: any): IDebugBinding;

    /**
     * Adds a special UI component (Tweakpane Blade).
     * @param options Blade configuration.
     */
    addBlade(options: any): any;

    /**
     * Adds a simple button that triggers a callback.
     * @param title The label on the button.
     * @param onClick The function to call when clicked.
     */
    addButton(title: string, onClick: () => void): this;

    /**
     * Adds a nested folder inside this folder.
     * @param title The title of the nested folder.
     */
    addFolder(title: string): IDebugFolder;

    /**
     * Adds a set of tabs inside this folder.
     */
    addTabs(options: { pages: { title: string }[] }): IDebugTabContainer;
}

export interface IDebugBinding
{
    /**
     * Enables or disables the binding in the UI.
     */
    disabled: boolean;

    /**
     * Triggers a callback when the binding value changes.
     */
    onChange(callback: () => void): this;
}

export interface IDebugTabContainer
{
    /**
     * Gets a specific page/tab by index.
     * @param index The index of the tab.
     */
    pages: IDebugFolder[];
}
