// debug/debug-panels/ControlsPanel.ts

import type { IDebugFolder } from '../IDebugUI';

/**
 * Creates a debug panel showing the current control scheme.
 * @param folder The debug folder to add the panel to.
 */
export function createControlsDebugPanel(folder: IDebugFolder): void
{
    try
    {
        const generalFolder = folder.addFolder('Camera');

        const generalState = {
            switchCamera: '[Tab]',
            toggleUI: '[F1]',
            cameraShoulderLeft: '[1]',
            cameraCenter: '[2]',
            cameraShoulderRight: '[3]'
        };

        generalFolder.addBinding(generalState, 'switchCamera', { readonly: true, label: 'Switch Camera Mode' });
        generalFolder.addBinding(generalState, 'toggleUI', { readonly: true, label: 'Toggle Debug UI' });
        generalFolder.addBinding(generalState, 'cameraShoulderLeft', { readonly: true, label: 'Camera: Left Shoulder' });
        generalFolder.addBinding(generalState, 'cameraCenter', { readonly: true, label: 'Camera: Center' });
        generalFolder.addBinding(generalState, 'cameraShoulderRight', { readonly: true, label: 'Camera: Right Shoulder' });

        const tpFolder = folder.addFolder('Third-Person Mode');
        const tpState = {
            forward: '[W]',
            backward: '[S]',
            turnLeft: '[A]',
            turnRight: '[D]',
            strafeLeft: '[Q] / [RMB] (hold) + [A]',
            strafeRight: '[E] / [RMB] (hold) + [D]',
            lookLmb: '[LMB] (hold)',
            lookRmb: '[RMB] (hold)'
        };

        tpFolder.addBinding(tpState, 'forward', { readonly: true, label: 'Move Forward' });
        tpFolder.addBinding(tpState, 'backward', { readonly: true, label: 'Move Backward' });
        tpFolder.addBinding(tpState, 'turnLeft', { readonly: true, label: 'Turn Left' });
        tpFolder.addBinding(tpState, 'turnRight', { readonly: true, label: 'Turn Right' });
        tpFolder.addBinding(tpState, 'strafeLeft', { readonly: true, label: 'Strafe Left' });
        tpFolder.addBinding(tpState, 'strafeRight', { readonly: true, label: 'Strafe Right' });
        tpFolder.addBinding(tpState, 'lookLmb', { readonly: true, label: 'Orbit (Momentum)' });
        tpFolder.addBinding(tpState, 'lookRmb', { readonly: true, label: 'Orbit + Face Cam' });

        const ffFolder = folder.addFolder('Free-Flight Mode');
        const ffState = {
            forward: '[W]',
            backward: '[S]',
            left: '[A]',
            right: '[D]',
            up: '[E]',
            down: '[Q]',
            look: '[LMB] (hold) / [RMB] (hold)'
        };

        ffFolder.addBinding(ffState, 'forward', { readonly: true, label: 'Move Forward' });
        ffFolder.addBinding(ffState, 'backward', { readonly: true, label: 'Move Backward' });
        ffFolder.addBinding(ffState, 'left', { readonly: true, label: 'Move Left' });
        ffFolder.addBinding(ffState, 'right', { readonly: true, label: 'Move Right' });
        ffFolder.addBinding(ffState, 'up', { readonly: true, label: 'Move Up' });
        ffFolder.addBinding(ffState, 'down', { readonly: true, label: 'Move Down' });
        ffFolder.addBinding(ffState, 'look', { readonly: true, label: 'Look around' });

    }
    catch (e)
    {
        console.error('Failed to initialize Controls Debug Panel:', e);
    }
}
