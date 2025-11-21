![Version](https://img.shields.io/badge/Version-0.1.0-blue)
![WIP](https://img.shields.io/badge/Work_In_Progress-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![WebGPU](https://img.shields.io/badge/WebGPU-00599C?logo=webgpu&logoColor=white)

# WebGPU Project

A modular WebGPU application built with Vite and TypeScript, featuring atmospheric water rendering, fog effects, and dual camera systems.

---

## Features

- **Advanced Water Rendering**: Dynamic water with displacement mapping, normal mapping, and depth-based coloring
- **Atmospheric Effects**: Dense fog and cloud systems for a creepy, immersive environment
- **Dual Camera System**:
  - First-person fly camera for exploration
  - Third-person camera following a character controller
- **WebGPU Rendering**: Modern GPU-accelerated graphics using WebGPU API

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

- [ ] Update the scene
- - [ ] Make the water look blacker/creepy
- - [ ] Add dense fog
- - [ ] Add dense clouds
- [ ] Implement third-person character controller
- [ ] Implement third-person camera
- [ ] Dual camera system with switching capability
- [ ] Performance optimization
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
