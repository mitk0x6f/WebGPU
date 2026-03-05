import { InputManager } from "./core/input-manager";
import { Renderer } from "./rendering/renderer";
import { BaseCamera } from "./scene/camera/base-camera";
import { FreeCameraController } from "./scene/camera/free-camera-controller";
import { ThirdPersonCameraController } from "./scene/camera/third-person-camera-controller";
import { initializeScene, updateScene } from "./scene/bootstrap";
// ! TEMPORARY UI IMPLEMENTATION [START]
import { TweakpaneUI, createCameraDebugPanel, createStatsDebugPanel } from "./debug";
// ! TEMPORARY UI IMPLEMENTATION [END]

async function main()
{
    const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;
    const inputManager = new InputManager();

    const renderer = new Renderer(canvas);
    await renderer.initialize();

    const camera = new BaseCamera(canvas, renderer.device, renderer.bindGroupLayouts, renderer.fallbackResources, renderer.reflectionTextureView, 70);

    const { scene, character } = await initializeScene(renderer, camera);

    const freeController = new FreeCameraController(camera);
    const tpcController = new ThirdPersonCameraController(camera, character);

    let activeController: FreeCameraController | ThirdPersonCameraController = tpcController;

    // ! TEMPORARY UI IMPLEMENTATION [START]
    // * Debug UI *
    let debugUI: TweakpaneUI | undefined;
    let statsDebug: { update: (deltaTime: number, frameCount: number) => void } | undefined;

    try {
        debugUI = new TweakpaneUI("github.com/mitk0x6f");
        const tabs = debugUI.addTabs({
            pages: [
                { title: "Stats" },
                { title: "Camera" }
            ]
        });

        statsDebug = createStatsDebugPanel(tabs.pages[0]);
        createCameraDebugPanel(tabs.pages[1], camera, tpcController);
    } catch (e) {
        console.error("Failed to initialize Debug UI:", e);
    }
    // ! TEMPORARY UI IMPLEMENTATION [END]

    let lastTime = 0;
    let globalTime = 0;

    // TODO: Move below event listener to input manager ?
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab')
        {
            e.preventDefault();

            activeController = (activeController === freeController) ? tpcController : freeController;
        }

        // ! TEMPORARY UI IMPLEMENTATION [START]
        if (e.key === 'F1' && debugUI)
        {
            e.preventDefault();

            debugUI.visible = !debugUI.visible;
        }
        // ! TEMPORARY UI IMPLEMENTATION [END]
    });

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

        // ! TEMPORARY UI IMPLEMENTATION [START]
        // Only mute if actively interacting (dragging a slider) or typing.
        // Simple hover NO LONGER blocks the game.
        const isUIFocused = debugUI?.visible && (debugUI?.isTyping || debugUI?.isInteracting);

        if (debugUI) debugUI.refresh();
        // ! TEMPORARY UI IMPLEMENTATION [END]

        if (activeController === tpcController)
        {
            character.update(deltaTime, inputManager, isUIFocused);
        }

        activeController.update(deltaTime, inputManager, isUIFocused);

        updateScene(scene, camera, globalTime, deltaTime);

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