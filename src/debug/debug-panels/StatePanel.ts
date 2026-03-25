// src/debug/debug-panels/state-panel.ts

import { Character } from '../../scene/character';
import { CharacterStateId } from '../../scene/character-states/character-state-id';
import type { BaseCamera } from '../../scene/camera/base-camera';
import type { IDebugFolder } from '../IDebugUI';

export function createStateDebugPanel(
    folder: IDebugFolder,
    character: Character,
    camera: BaseCamera
): void
{
    try
    {
        // Vector proxy for the 2D graph
        const stateProxy = {
            get stateName()
            {
                // @ts-ignore
                const stateId = character.stateMachine.currentStateId;
                return stateId === CharacterStateId.Idle ? 'Idle' : 'Walk';
            }
        };

        const logicalFolder = folder.addFolder('Logical State');
        logicalFolder.addBinding(character, 'debugStateTint', { label: 'State Tint Overlay' });
        logicalFolder.addBinding(stateProxy, 'stateName', { readonly: true, label: 'Current State' });

        const movementFolder = folder.addFolder('Movement Vector');

        // Custom 2D Graph Canvas to show two vectors natively
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        canvas.style.width = '100%';
        canvas.style.aspectRatio = '1 / 1';
        canvas.style.boxSizing = 'border-box';
        canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        canvas.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d')!;
        const container = movementFolder.element.querySelector('.tp-fldv_c') || movementFolder.element;
        container.appendChild(canvas);

        let smoothedVx = 0;
        let smoothedVy = 0;

        const drawGraph = () => {
            if (!canvas.isConnected) return;

            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            // Clear
            ctx.clearRect(0, 0, w, h);

            // Draw Grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
            ctx.moveTo(0, cy); ctx.lineTo(w, cy);
            ctx.stroke();

            const scale = w / 2 * 0.8; // Leave margin

            // 1. Look Vector (Green)
            // Flatten camera forward vector on XZ plane
            const fwd = camera.front;
            const lookX = fwd[0];
            const lookY = fwd[2]; // Z becomes Y visually

            ctx.strokeStyle = '#00ff00';
            ctx.fillStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + lookX * scale, cy + lookY * scale); // Top down view
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + lookX * scale, cy + lookY * scale, 4, 0, Math.PI * 2);
            ctx.fill();

            // 2. Velocity Vector (Yellow)
            const vx = character.velocity[0];
            const vy = character.velocity[2];

            // Smooth out dt fluctuations (jittering) - using 0.6 for faster responsiveness
            smoothedVx += (vx - smoothedVx) * 0.6;
            smoothedVy += (vy - smoothedVy) * 0.6;

            // The velocity here is units per frame (e.g. 10.0 * 0.016 = ~0.16)
            const maxFrameVelocity = 0.16;
            const normVx = smoothedVx / maxFrameVelocity;
            const normVy = smoothedVy / maxFrameVelocity;

            ctx.strokeStyle = '#ffff00';
            ctx.fillStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + normVx * scale, cy + normVy * scale);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + normVx * scale, cy + normVy * scale, 4, 0, Math.PI * 2);
            ctx.fill();

            requestAnimationFrame(drawGraph);
        };

        requestAnimationFrame(drawGraph);
    }
    catch (e)
    {
        console.error('Failed to initialize State Debug Panel:', e);
    }
}
