// debug/debug-panels/SettingsPanel.ts

import type { IDebugFolder } from '../IDebugUI';
import { InputAction, bindingToString } from '../../core/input-action';
import type { InputBinding } from '../../core/input-action';
import { InputMapper } from '../../core/input-mapper';
import { InputManager } from '../../core/input-manager';

/**
 * Creates a debug panel for settings (Keybindings and Gameplay).
 */
export function createSettingsDebugPanel(folder: IDebugFolder, inputMapper: InputMapper, inputManager: InputManager): void
{
    try
    {
        const tabs = folder.addTabs({
            pages: [
                { title: 'Keybindings' },
                { title: 'Gameplay' }
            ]
        });

        const kbPage = tabs.pages[0];
        const gpPage = tabs.pages[1];

        // * Keybindings *
        const bindAction = (parent: IDebugFolder, action: InputAction, label: string) => {
            const binding = inputMapper.getBinding(action);

            const getDisplayString = (b: InputBinding | InputBinding[] | null): string => {
                if (!b) return 'None';
                if (Array.isArray(b)) return b.map(bindingToString).join(' / ');

                return bindingToString(b);
            };

            const state = {
                key: getDisplayString(binding),
                isRecording: false
            };

            const debugBinding = parent.addBinding(state, 'key', { readonly: true, label });

            parent.addButton('Rebind', () => {
                if (state.isRecording) return;

                state.isRecording = true;
                state.key = '...';
                debugBinding.disabled = true;

                const stopRecording = (newBinding: any) => {
                    inputMapper.setBinding(action, newBinding);
                    state.key = getDisplayString(newBinding);
                    state.isRecording = false;
                    debugBinding.disabled = false;

                    window.removeEventListener('keyup', onKeyUp);
                    window.removeEventListener('mouseup', onMouseUp);
                    window.removeEventListener('contextmenu', preventDefault);
                };

                const preventDefault = (e: MouseEvent) => e.preventDefault();
                window.addEventListener('contextmenu', preventDefault);

                const onKeyUp = (e: KeyboardEvent) => {
                    e.preventDefault();
                    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

                    stopRecording({
                        key: e.key.toLowerCase(),
                        shift: e.shiftKey,
                        ctrl: e.ctrlKey,
                        alt: e.altKey,
                        meta: e.metaKey,
                        rmb: inputManager.modifiers.rmb
                    });
                };

                const onMouseUp = (e: MouseEvent) => {
                    stopRecording({
                        key: `mouse${e.button}`,
                        shift: e.shiftKey,
                        ctrl: e.ctrlKey,
                        alt: e.altKey,
                        meta: e.metaKey,
                        rmb: false
                    });
                };

                window.addEventListener('keyup', onKeyUp);
                window.addEventListener('mouseup', onMouseUp);
            });
        };

        const camFolder = kbPage.addFolder('Camera Controls');
        bindAction(camFolder, InputAction.Look, 'Orbit (LMB)');
        bindAction(camFolder, InputAction.LookRotate, 'Turn & Orbit (RMB)');
        bindAction(camFolder, InputAction.SwitchCamera, 'Switch Camera');
        bindAction(camFolder, InputAction.ToggleUI, 'Toggle UI');
        bindAction(camFolder, InputAction.CameraShoulderLeft, 'Left Shoulder');
        bindAction(camFolder, InputAction.CameraCenter, 'Center');
        bindAction(camFolder, InputAction.CameraShoulderRight, 'Right Shoulder');
        bindAction(camFolder, InputAction.CameraShoulderToggle, 'Toggle Shoulder');

        const moveFolder = kbPage.addFolder('Movement');
        bindAction(moveFolder, InputAction.MoveForward, 'Move Forward');
        bindAction(moveFolder, InputAction.MoveBackward, 'Move Backward');
        bindAction(moveFolder, InputAction.TurnLeft, 'Turn Left');
        bindAction(moveFolder, InputAction.TurnRight, 'Turn Right');
        bindAction(moveFolder, InputAction.StrafeLeft, 'Strafe Left');
        bindAction(moveFolder, InputAction.StrafeRight, 'Strafe Right');
        bindAction(moveFolder, InputAction.MoveUp, 'Move Up');
        bindAction(moveFolder, InputAction.MoveDown, 'Move Down');

        kbPage.addSeparator();
        kbPage.addButton('Reset All Keybindings', () => {
            if (confirm('Reset all keybindings to defaults?'))
            {
                inputMapper.resetBindingsToDefaults();

                kbPage.refresh();
            }
        });

        // * Gameplay Settings *
        const gameplaySettings = inputMapper.getGameplaySettings();
        const gameplayState = {
            toggleFirstSide: gameplaySettings.shoulderToggleFirstSide
        };

        gpPage.addBinding(gameplayState, 'toggleFirstSide', {
            options: {
                Left: 'Left',
                Right: 'Right',
            },
            label: 'Shoulder Toggle First Side'
        }).onChange((value: any) => {
            gameplaySettings.shoulderToggleFirstSide = value;
            inputMapper.save();
        });

        gpPage.addSeparator();
        gpPage.addButton('Reset Gameplay Settings', () => {
            if (confirm('Reset gameplay settings to defaults?'))
            {
                inputMapper.resetGameplayToDefaults();

                gameplayState.toggleFirstSide = inputMapper.getGameplaySettings().shoulderToggleFirstSide;

                gpPage.refresh();
            }
        });
    }
    catch (e)
    {
        console.error('Failed to initialize Settings Debug Panel:', e);
    }
}
