// debug/debug-panels/CameraPanel.ts

import { BaseCamera } from '../../scene/camera/base-camera';
import { ThirdPersonCameraController } from '../../scene/camera/third-person-camera-controller';
import type { IDebugFolder } from '../IDebugUI';

/**
 * Creates a debug panel for a camera and its controller.
 */
export function createCameraDebugPanel(
    folder: IDebugFolder,
    camera: BaseCamera,
    controller: ThirdPersonCameraController
): void
{
    try
    {
        const fovFolder = folder.addFolder('Field of View');
        fovFolder.addBinding(camera, 'fov', { min: 30, max: 150, step: 1 });

        const clipFolder = folder.addFolder('Clipping Planes');
        clipFolder.addBinding(camera, 'near', { min: 0.01, max: 5, step: 0.1 });
        clipFolder.addBinding(camera, 'far', { min: 5, max: 1000, step: 5 });

        const ctrlFolder = folder.addFolder('Controller Settings');

        // * Layout Refinement *
        // Shoulder Side Dropdown (Reordered above offset)
        const sideBinding = ctrlFolder.addBinding(controller, 'shoulderSide', {
            label: 'Shoulder Side',
            options: {
                'Left': -1.0,
                'Center': 0.0,
                'Right': 1.0
            }
        });

        // Shoulder Offset (Disabled when Center)
        const offsetBinding = ctrlFolder.addBinding(controller, 'shoulderOffset', {
            min: 0.0,
            max: 2.0,
            step: 0.1,
            label: 'Shoulder Offset'
        });

        // Initialize disabled state
        offsetBinding.disabled = controller.shoulderSide === 0;

        // Add shoulder height binding
        ctrlFolder.addBinding(controller, 'height', { min: 0.5, max: 3.0, step: 0.1, label: 'Shoulder Height' });

        // Reactive update for disabled state
        sideBinding.onChange(() => {
            offsetBinding.disabled = controller.shoulderSide === 0;
        });

        ctrlFolder.addBinding(controller, 'distance', { min: 1.0, max: 10.0, step: 0.1, label: 'Zoom Distance' });

        // * Rock-Solid XYZ *
        // Using a single string binding is guaranteed to be stable and fit on one line
        const posProxy = {
            get pos()
            {
                const p = camera.position;

                return `${p[0].toFixed(2)}, ${p[1].toFixed(2)}, ${p[2].toFixed(2)}`;
            }
        };

        const posFolder = folder.addFolder('World Position');
        posFolder.addBinding(posProxy, 'pos', { readonly: true, label: 'Position' });

        // * Reset Button *
        folder.addButton('Reset to Defaults', () => {
            if (confirm('Reset camera settings to defaults?'))
            {
                camera.resetToDefaults();
                controller.resetToDefaults();

                offsetBinding.disabled = controller.shoulderSide === 0;

                folder.refresh();
            }
        });
    }
    catch (e)
    {
        console.error('Failed to initialize Camera Debug Panel:', e);
    }
}
