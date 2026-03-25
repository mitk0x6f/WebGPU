// debug/TweakpaneUI.ts

import { Pane } from 'tweakpane';
import type { IDebugFolder, IDebugUI, IDebugTabContainer, IDebugBinding } from './IDebugUI';

/**
 * Concrete implementation of IDebugUI using Tweakpane.
 */
export class TweakpaneUI implements IDebugUI
{
    private pane: any;
    private _isPointerOver: boolean = false;
    private _isInteracting: boolean = false;

    constructor(title: string = 'Debug Menu')
    {
        this.pane = new Pane({ title });

        const element = this.pane.element;

        // * Draggable Logic *
        element.style.position = 'fixed';
        element.style.top = '10px';
        element.style.right = '10px';
        element.style.width = '300px';
        element.style.maxHeight = '90vh';
        element.style.cursor = 'default';
        element.style.zIndex = '1000';

        // Mouse listeners for isPointerOver & isInteracting
        element.addEventListener('mouseenter', () => this._isPointerOver = true);
        element.addEventListener('mouseleave', () => {
            this._isPointerOver = false;
            // If mouse leaves while holding, we might still be interacting
            // (e.g. dragging a slider outside the box).
            // We'll rely on global mouseup for the true 'end'.
        });

        element.addEventListener('mousedown', () => this._isInteracting = true);
        window.addEventListener('mouseup', () => this._isInteracting = false);

        // Simple Drag implementation via title element
        const titleElement = element.querySelector('.tp-rotv_t') as HTMLElement;

        if (titleElement)
        {
            titleElement.style.cursor = 'move';

            let isDragging = false;
            let hasMovedSignificantValue = false;
            let offset = { x: 0, y: 0 };
            let startPos = { x: 0, y: 0 };

            titleElement.addEventListener('mousedown', (e: MouseEvent) => {
                isDragging = true;
                hasMovedSignificantValue = false;
                startPos = { x: e.clientX, y: e.clientY };
                offset = {
                    x: e.clientX - element.offsetLeft,
                    y: e.clientY - element.offsetTop
                };
            });

            window.addEventListener('mousemove', (e: MouseEvent) => {
                if (!isDragging) return;

                // Track if we moved enough to be considered a drag, not just a click
                const dx = e.clientX - startPos.x;
                const dy = e.clientY - startPos.y;

                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedSignificantValue = true;

                // Disable 'right' to allow 'left' movement
                element.style.right = 'auto';
                element.style.left = `${e.clientX - offset.x}px`;
                element.style.top = `${e.clientY - offset.y}px`;
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
            }, { capture: true });

            // CRITICAL: Prevent Tweakpane from toggling minimize/maximize if we just dragged
            titleElement.addEventListener('click', (e: MouseEvent) => {
                if (hasMovedSignificantValue)
                {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            }, { capture: true });
        }
    }

    get isPointerOver(): boolean
    {
        return this._isPointerOver;
    }

    get isTyping(): boolean
    {
        const active = document.activeElement;

        if (!active) return false;

        const tagName = active.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

        return isInput && this.pane.element.contains(active);
    }

    get isInteracting(): boolean
    {
        return this._isInteracting;
    }

    addFolder(title: string): IDebugFolder
    {
        const folder = this.pane.addFolder({ title });

        return new TweakpaneFolder(folder);
    }

    addTabs(options: { pages: { title: string }[] }): IDebugTabContainer
    {
        const tabs = this.pane.addTab(options);

        return new TweakpaneTabContainer(tabs);
    }

    refresh(): void
    {
        this.pane.refresh();
    }

    dispose(): void
    {
        this.pane.dispose();
    }

    get visible(): boolean
    {
        return !this.pane.hidden;
    }

    set visible(value: boolean)
    {
        this.pane.hidden = !value;
    }
}

/**
 * Wrapper for Tweakpane components that support 'disabled' state.
 */
class TweakpaneBinding implements IDebugBinding
{
    private binding: any;

    constructor(binding: any)
    {
        this.binding = binding;
    }

    get disabled(): boolean
    {
        return this.binding.disabled;
    }

    set disabled(value: boolean)
    {
        this.binding.disabled = value;
    }

    onChange(callback: (value: any) => void): this
    {
        this.binding.on('change', (ev: any) => callback(ev.value));

        return this;
    }
}

/**
 * Wrapper for Tweakpane's TabApi to match IDebugTabContainer.
 */
class TweakpaneTabContainer implements IDebugTabContainer
{
    public pages: IDebugFolder[];

    constructor(tabApi: any)
    {
        this.pages = tabApi.pages.map((page: any) => new TweakpaneFolder(page));
    }
}

/**
 * Wrapper for Tweakpane's FolderApi to match IDebugFolder.
 */
class TweakpaneFolder implements IDebugFolder
{
    private folder: any;

    constructor(folder: any)
    {
        this.folder = folder;
    }

    get element(): HTMLElement
    {
        return this.folder.element;
    }

    addBinding<T extends object>(target: T, key: keyof T, options?: any): IDebugBinding
    {
        return new TweakpaneBinding(this.folder.addBinding(target, key as any, options));
    }

    addBlade(options: any): any
    {
        return this.folder.addBlade(options);
    }

    addButton(title: string, onClick: () => void): this
    {
        this.folder.addButton({ title }).on('click', onClick);

        return this;
    }

    addFolder(title: string): IDebugFolder
    {
        return new TweakpaneFolder(this.folder.addFolder({ title }));
    }

    addTabs(options: { pages: { title: string }[] }): IDebugTabContainer
    {
        return new TweakpaneTabContainer(this.folder.addTab(options));
    }

    addSeparator(): void
    {
        this.folder.addBlade({ view: 'separator' });
    }

    refresh(): void
    {
        this.folder.refresh();
    }
}
