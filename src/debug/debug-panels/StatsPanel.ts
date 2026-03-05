// debug/debug-panels/StatsPanel.ts

import type { IDebugFolder } from '../IDebugUI';

/**
 * Creates a debug panel for general stats and utilities.
 * @param folder The debug folder to add the panel to.
 */
export function createStatsDebugPanel(folder: IDebugFolder): { update: (deltaTime: number, frameCount: number) => void }
{
    try
    {
        // We maintain a local state object for Tweakpane to bind to
        const state = {
            fps: 0,
            frameCount: 0,
            frameTimeMs: 0
        };

        const statsFolder = folder.addFolder('Performance Stats');

        // * Performance Graphs & Text *
        statsFolder.addBinding(state, 'fps', {
            readonly: true,
            label: 'FPS History',
            view: 'graph',
            min: 0,
            max: 144,
            interval: 2000
        });
        statsFolder.addBinding(state, 'fps', { readonly: true, label: 'FPS' });

        statsFolder.addBlade({ view: 'separator' });

        statsFolder.addBinding(state, 'frameTimeMs', {
            readonly: true,
            label: 'Time History',
            view: 'graph',
            min: 0,
            max: 33,
            interval: 2000
        });
        statsFolder.addBinding(state, 'frameTimeMs', { readonly: true, label: 'Frame Time (ms)' });

        statsFolder.addBlade({ view: 'separator' });

        statsFolder.addBinding(state, 'frameCount', { readonly: true, label: 'Frame Count' });

        const utilsFolder = folder.addFolder('Utilities');
        utilsFolder.addButton('Visit Project GitHub', () => window.open('https://github.com/mitk0x6f/WebGPU', '_blank'));
        utilsFolder.addButton('Reload Page', () => window.location.reload());

        let fpsTimer = 0;
        let framesThisSecond = 0;

        // Return an object with an update method to be called in the render loop
        return {
            update: (deltaTime: number, totalFrames: number) => {
                state.frameCount = totalFrames;

                // Update metrics half as frequent (sampling rate reduction)
                // Frame Time: every 2nd frame
                if (totalFrames % 2 === 0) state.frameTimeMs = deltaTime;

                framesThisSecond++;
                fpsTimer += deltaTime;

                // FPS: every 2 seconds
                if (fpsTimer >= 2000)
                {
                    state.fps = Math.round(framesThisSecond / 2);
                    framesThisSecond = 0;
                    fpsTimer -= 2000;
                }
            }
        };
    }
    catch (e)
    {
        console.error('Failed to initialize Stats Debug Panel:', e);

        return { update: () => {} };
    }
}
