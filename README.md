![Version](https://img.shields.io/badge/Version-0.2.0-blue)
![WIP](https://img.shields.io/badge/Work_In_Progress-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![WebGPU](https://img.shields.io/badge/WebGPU-00599C?logo=webgpu&logoColor=white)

# WebGPU Project

A modular WebGPU application built with Vite and TypeScript, featuring atmospheric water rendering, fog effects, and dual camera systems.

---

## Features

- **WebGPU Rendering**: Modern GPU-accelerated graphics using WebGPU API
- **Dynamic Skybox**: Cubemap-based environment with seamless reflection integration
- **Advanced Water Rendering**:
  - Real-time water reflections with oblique near-plane clipping
  - Physically-based water shader with Fresnel effect
  - Procedural wave normals for realistic distortion
  - Water surface clipping for underwater objects
- **Atmospheric Effects**: Dense fog and cloud systems for a creepy, immersive environment
- **Character Controller** (In Development):
  - Third-person character movement with `WASD` + `QE` + `mouse` controls
  - State machine (idle, walk)
  - Smooth acceleration / deceleration curves
  - Ground detection and slope handling
  - Input action mapping system
- **Camera System** (In Development):
  - Reflection camera with oblique projection
  - Dual camera modes with seamless switching
  - First-person free-flight camera for exploration
  - Third-person camera with spring arm system
  - Camera smoothing (position and rotation lerp/slerp)
  - Collision detection (prevents clipping through geometry)
  - Look-at smoothing and FOV transitions
  - Camera shake support

---

## Prerequisites

- **Node.js** v16+ and npm installed
- **WebGPU-capable browser** (e.g., Chrome Canary, Edge Canary, or Safari Technology Preview)

---

## Project Setup

1. **Create the Vite project**

    ```bash
    npm create vite@latest m0x6f-webgpu-vite -- --template vanilla-ts
    ```

2. **Navigate into the project director**

    ```bash
    cd m0x6f-webgpu-vite
    ```

3. **Install dependencies**

    ```bash
    npm install vite@^5.2.0 typescript@^5.3.3 --save-dev
    ```

    ```bash
    npm install gl-matrix
    ```

    ```bash
    npm install --save-dev @webgpu/types
    ```

4. **Run development server**

    ```bash
    npm run dev
    ```

---

## Project Progress

### TODO

- [ ] Enhance scene visuals
  - [X] Add darker / creepier water appearance
  - [ ] Add dense fog
  - [ ] Add dense clouds
- [x] Implement character controller
  - [x] FBX model loader
  - [x] Basic character movement `WASD` + `QE`
  - [ ] Character state machine (idle, walk)
  - [ ] Smooth acceleration/deceleration curves
  - [ ] Ground detection and snapping
  - [ ] Slope handling
  - [ ] Input action mapping
- [x] Implement camera system
  - [x] Refactor camera into base class + controllers
  - [x] Third-person camera controller
  - [x] Camera mode switching `Tab`
  - [x] Position/rotation smoothing (lerp/slerp)
  - [ ] Spring arm system for dynamic distance
  - [ ] Camera collision detection
  - [ ] Look-at smoothing
  - [ ] FOV transitions
  - [ ] Camera shake system
- [ ] Optimize performance
- [ ] Add LICENSE.md

### COMPLETED

- [x] Project setup
- [x] Update README.md
- [x] Create CHANGELOG.md
- [x] GitHub repository setup
- - [x] Initialize git repository
- - [x] Create initial commit

---

## License

**All Rights Reserved.**

This software and associated documentation files (the "Software") are proprietary and confidential. The Software is provided for viewing purposes only. Unauthorized copying, modification, distribution, or use of this Software, via any medium, is strictly prohibited.

For further details, please refer to [LICENSE.md](LICENSE.md).
