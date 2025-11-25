// main.ts

import { Renderer } from "./rendering/renderer";
import { initializeScene, updateScene } from "./scene/bootstrap";
import { Camera } from "./scene/camera";

async function main()
{
    const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;

    const renderer = new Renderer(canvas);
    await renderer.initialize();

    const camera = new Camera(canvas, renderer.device, renderer.bindGroupLayouts, renderer.fallbackResources, renderer.reflectionTextureView, 70);

    const scene = await initializeScene(renderer, camera);

    let lastTime = 0;

    function tick(timestamp: number)
    {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        updateScene(scene, camera, deltaTime);

        renderer.render(scene, camera, timestamp);

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

main();