import { InputManager } from "./core/input-manager";
import { Renderer } from "./rendering/renderer";
import { BaseCamera } from "./scene/camera/base-camera";
import { FreeCameraController } from "./scene/camera/free-camera-controller";
import { ThirdPersonCameraController } from "./scene/camera/third-person-camera-controller";
import { initializeScene, updateScene } from "./scene/bootstrap";

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

    let lastTime = 0;
    let globalTime = 0;

    // TODO: Move below event listener to input manager ?
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab')
        {
            e.preventDefault();

            activeController = (activeController === freeController) ? tpcController : freeController;
        }
    });

    function tick(timestamp: number)
    {
        const deltaTime = timestamp - lastTime;

        lastTime = timestamp;
        globalTime += deltaTime;

        if (activeController === tpcController)
        {
            character.update(deltaTime, inputManager);
        }

        activeController.update(deltaTime, inputManager);

        updateScene(scene, camera, globalTime, deltaTime);

        renderer.render(scene, camera, timestamp);

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

main();