// main.ts

import { InputManager } from './core/input-manager';
import { InputMapper } from './core/input-mapper';
import { InputAction } from './core/input-action';
import { Renderer } from './rendering/renderer';
import { BaseCamera } from './scene/camera/base-camera';
import { FreeCameraController } from './scene/camera/free-camera-controller';
import { ThirdPersonCameraController } from './scene/camera/third-person-camera-controller';
import { initializeScene, updateScene } from './scene/bootstrap';
// ! TEMPORARY UI IMPLEMENTATION [START]
import { TweakpaneUI, createCameraDebugPanel, createStatsDebugPanel, createSettingsDebugPanel, createStateDebugPanel } from './debug';

// ! TEMPORARY UI IMPLEMENTATION [END]

async function main()
{
    const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;
    const inputMapper = new InputMapper();
    const inputManager = new InputManager(inputMapper);

    const renderer = new Renderer(canvas);
    await renderer.initialize();

    const camera = new BaseCamera(canvas, renderer.device, renderer.bindGroupLayouts, renderer.fallbackResources, renderer.reflectionTextureView, 70);

    const { scene, character } = await initializeScene(renderer, camera);

    const freeController = new FreeCameraController(camera);
    const tpcController = new ThirdPersonCameraController(camera, character, inputMapper);

    let activeController: FreeCameraController | ThirdPersonCameraController = tpcController;

    // ! TEMPORARY UI IMPLEMENTATION [START]
    // * Debug UI *
    let debugUI: TweakpaneUI | undefined;
    let statsDebug: { update: (deltaTime: number, frameCount: number) => void } | undefined;

    try
    {
        debugUI = new TweakpaneUI('github.com/mitk0x6f');
        const tabs = debugUI.addTabs({
            pages: [
                { title: 'Stats' },
                { title: 'Controls' },
                { title: 'Camera' },
                { title: 'State' }
            ]
        });

        statsDebug = createStatsDebugPanel(tabs.pages[0]);
        createSettingsDebugPanel(tabs.pages[1], inputMapper, inputManager);
        createCameraDebugPanel(tabs.pages[2], camera, tpcController);
        createStateDebugPanel(tabs.pages[3], character, camera);

    }
    catch (e)
    {
        console.error('Failed to initialize Debug UI:', e);
    }
    // ! TEMPORARY UI IMPLEMENTATION [END]

    let lastTime = 0;
    let globalTime = 0;

    // ! TEMPORARY UI IMPLEMENTATION [START]
    window.addEventListener('mousedown', (e) => {
        if (debugUI?.visible && debugUI?.isPointerOver) return;

        // If clicking outside UI, request pointer lock for seamless camera control
        if (e.button === 0 || e.button === 2)
        {
            canvas.requestPointerLock();
        }
    });
    // ! TEMPORARY UI IMPLEMENTATION [END]

    function tick(timestamp: number)
    {
        const deltaTime = timestamp - lastTime;

        lastTime = timestamp;
        globalTime += deltaTime;

        // Update action history (JustPressed logic) at the START of the frame
        inputManager.update();

        // Global Toggles (Single press)
        if (inputManager.isActionJustPressed(InputAction.SwitchCamera))
        {
            activeController = (activeController === freeController) ? tpcController : freeController;
        }

        // ! TEMPORARY UI IMPLEMENTATION [START]
        if (inputManager.isActionJustPressed(InputAction.ToggleUI) && debugUI)
        {
            debugUI.visible = !debugUI.visible;
        }

        // Only mute if actively interacting (dragging a slider) or typing.
        // Simple hover NO LONGER blocks the game.
        const isUIFocused = debugUI?.visible && (debugUI?.isTyping || debugUI?.isInteracting);

        if (debugUI) debugUI.refresh();
        // ! TEMPORARY UI IMPLEMENTATION [END]

        if (activeController === tpcController)
        {
            character.update(deltaTime, inputManager, scene.physicsWorld, isUIFocused);
        }

        activeController.update(deltaTime, inputManager, isUIFocused);

        updateScene(scene, camera);

        renderer.render(scene, camera, timestamp);

        // ! TEMPORARY UI IMPLEMENTATION [START]
        // Since we don't have a frame counter in renderer directly yet, use a rough frame estimate
        if (statsDebug) statsDebug.update(deltaTime, Math.floor(timestamp / 16.6));
        if (debugUI) debugUI.refresh();
        // ! TEMPORARY UI IMPLEMENTATION [END]

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

main();