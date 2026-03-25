![Version](https://img.shields.io/badge/Version-0.2.6-blue)
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
  - Advanced camera-independent steering and `Right Mouse Button` rotation (rotate character while mouse dragging)
  - Character model smoothly catches up to camera heading when `Right Mouse Button` is held
  - Strafe movement with `A` and `D` while holding `Right Mouse Button`
  - Input action mapping system
  - Ground detection via downward raycast with gravity and vertical snapping
  - Horizontal collision detection with smooth wall-sliding (independent X/Z axis evaluation)
  - Slope detection: surfaces steeper than 46° are treated as impassable
- **Physics Module** (New):
  - Custom pure-TypeScript, zero-dependency collision system (`src/physics/`)
  - `Ray` / AABB math with Möller–Trumbore triangle intersection
  - `Collider` abstraction with `BoxCollider` implementation
  - `PhysicsWorld` spatial query manager with broadphase AABB culling
- **Camera System** (In Development):
  - Reflection camera with oblique projection
  - Dual camera modes with seamless switching
  - First-person free-flight camera for exploration
  - Third-person camera with fully decoupled absolute orbit architecture and spring arm system
  - Spring Arm system for dynamic distance control with smooth zoom
  - Dynamic camera position switching (Left Shoulder, Center, Right Shoulder via `1`, `2`, `3` keys) with ease-out quart transitions
  - Zero-allocation update loops (cached vectors) for ultra-responsive stutter-free performance
  - Camera smoothing (position and rotation lerp/slerp) with intelligent momentum stops
- **Pointer Lock Integration**: Seamless 360-degree rotation with automatic cursor restoration
- **Debug UI System**:
  - Abstraction layer (`IDebugUI`) for backend-agnostic implementation
  - Tweakpane backend for modern, polished developer tools
  - Tabbed interface with draggable, floating window functionality (Toggle with `F1` key)
  - Real-time performance monitoring: FPS and Frame Time with historical line graphs
  - Deep parameter binding with reactive state (e.g., conditional disabling of controls)
  - Zero-allocation data binding via proxy adapters
  - Interaction-aware input muting (hover vs. active UI engagement)

---

## Debug UI System

The project features a highly modular debug system designed to be easily swappable.

### Backend Abstraction

- **IDebugUI**: The core interface that decouples domain panels from UI libraries.
- **TweakpaneUI**: The current concrete implementation using [Tweakpane](https://tweakpane.github.io/docs/).
- **Panels**: `StatsPanel`, `ControlsPanel`, and `CameraPanel` are built against the abstraction, ensuring zero friction when moving to a custom UI.

### Future Displacement

The Tweakpane implementation is considered temporary (marked with `! TEMPORARY UI IMPLEMENTATION` in `main.ts`). To replace it:

1. Implement a new class satisfying the `IDebugUI` interface (e.g., `CustomWebGPUI`).
2. Swap the instantiation in `main.ts`.

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

2. **Navigate into the project directory**

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
  - [x] Add darker / creepier water appearance
  - [ ] Add dense fog
  - [ ] Add dense clouds
- [x] Implement character controller
  - [x] FBX model loader
  - [x] Basic character movement `WASD` + `QE`
  - [ ] Character state machine (idle, walk)
  - [ ] Smooth acceleration/deceleration curves
  - [x] Ground detection and snapping
  - [x] Slope handling (> 46° impassable)
  - [x] Input action mapping
- [x] Implement camera system
  - [x] Refactor camera into base class + controllers
  - [x] Third-person camera controller
  - [x] Camera mode switching `Tab`
  - [x] Position/rotation smoothing (lerp/slerp)
  - [x] Spring arm system for dynamic distance
  - [ ] Camera collision detection
  - [ ] Look-at smoothing
  - [ ] FOV transitions
  - [ ] Camera shake system
- [ ] Optimize performance
- [x] Implement modular debug UI system
  - [x] Backend-agnostic abstraction layer
  - [x] Tweakpane integration
  - [x] Draggable/Tabbed interface with performance graphs
  - [ ] Replace with a custom WebGPU-rendered UI system
- [ ] Add LICENSE.md

### COMPLETED

- [x] Project setup
- [x] Update README.md
- [x] Create CHANGELOG.md
- [x] GitHub repository setup
  - [x] Initialize git repository
  - [x] Create initial commit

---

## License

**All Rights Reserved.**

This software and associated documentation files (the "Software") are proprietary and confidential. The Software is provided for viewing purposes only. Unauthorized copying, modification, distribution, or use of this Software, via any medium, is strictly prohibited.

For further details, please refer to [LICENSE.md](LICENSE.md).
