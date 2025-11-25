# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.1] - 2025-11-25

### 🚀 Core Engine

- Implemented oblique near-plane clipping for water reflections
- Added dual render pass system (main + reflection)
- Reflection texture management with automatic resize handling

### 🎮 Input & Camera

- Extended camera system with clip plane support
- Oblique projection matrix calculation for reflection camera
- Mirrored camera view matrix for reflection rendering

### 🎨 Shader

- **Water Shader Enhancements**:
  - Physically-based water rendering with Fresnel effect
  - Procedural wave normals using gradient-based approach
  - Normal-based reflection distortion
  - Deep water color mixing based on viewing angle
- **Cube Shader Updates**:
  - Added world position output for water clipping
  - Fragment-level water surface clipping using discard
  - Custom lighting model (even top/sides, dark bottom)
- **Skybox Improvements**:
  - Corrected cubemap direction calculation for reflections
  - Updated to work with mirrored camera views
- **Code Quality**:
  - Standardized formatting across all WGSL shaders
  - Improved struct and function declarations consistency

### 💡 Lighting & Environment

- Updated skybox assets (skybox2)
- Reflection integration with skybox cubemap
- Reduced reflection clear color artifacts
- Adjusted distortion strength for cleaner reflections

### 🧰 Build & Platform

- Texture loader updated for PNG format cubemaps

### 📖 Documentation

- Updated README.md with reflection features
- Added TODOs for water height uniform system
- Code comments for oblique projection implementation

---

## [0.1.0] - 2025-11-21

### 🚀 Core Engine

- Initial WebGPU rendering pipeline setup.
- Basic 3D rendering system for scene rendering.
- Scene graph system with meshes and skybox.

### 🎮 Input & Camera

- Fly camera controls:
  - Movement: `W`, `A`, `S`, `D`, `Q`, `E`.
  - Mouse: Look direction control.
- Input handling via `KeyboardEvent` and `MouseEvent` listeners.

### 🎨 Shader

- Modular WGSL shader design:
  - `water/`: Vertex and fragment shaders for water rendering with displacement and normal mapping.
  - `skybox/`: Shaders for skybox rendering.
  - `cube/`: Simple cube shaders for testing.
  - `simple/`: Basic shaders.

### 💡 Lighting & Environment

- Skybox support with cubemap textures.
- Basic lighting model in shaders.
- Water rendering with:
  - Reflection/refraction approximations.
  - Fresnel effects.
  - Wave displacement.

### 🧰 Build & Platform

- Vite-based build system with TypeScript support.
- Project structure organization:
  - `src/`: TypeScript source code (core, rendering, scene, shaders).
  - - `core/`: WebGPU utilities.
  - - `rendering/`: Renderer implementation.
  - - `scene/`: Scene management.
  - - `shaders/`: WGSL shader files.
  - `public/`: Static assets including textures (skybox, water).
  - - `textures/`: Textures for skybox, water, and other assets.

---

## Legend

Emoji | Category | Description
:---:|:---|:---
`🚀` | `Core Engine` | Core systems: initialization, render loop, time, configuration.
`🎮` | `Input & Camera` | Input handling (keyboard, mouse, controller) and camera systems.
`🧱` | `ECS & Game Logic` | Entity-component-system, gameplay logic, AI behaviors, rules.
`🖥️` | `User Interface` | UI systems: HUD, menus, overlays, input handling.
`🎨` | `Shader` | GLSL/HLSL/WGSL shader design, materials, UBOs, push constants.
`💡` | `Lighting & Environment` | Lights, shadows, global illumination, skybox, weather.
`🌍` | `World & Levels` | Terrain, world gen, level streaming, map formats.
`📦` | `Asset Pipeline` | Resource loading, asset bundling, formats, import/export systems.
`🖼️` | `Art & Assets` | Textures, 3D models, sprites, animations, and related content.
`🌐` | `Networking` | Multiplayer, client/server architecture, synchronization.
`🔊` | `Audio System` | Sound effects, music playback, 3D audio, mixers.
`🧪` | `Debug & Tooling` | Developer tools, profilers, editors, logging, in-engine views.
`📊` | `Analytics` | Telemetry, user behavior tracking, heatmaps.
`🧰` | `Build & Platform` | Build scripts, platform fixes, CI/CD integration, cross-compilation.
`📖` | `Documentation` | In-code comments, guides, changelogs, and written documentation.
`🛠️` | `Configuration` | Runtime/game config files, settings systems, profiles.
`🔐` | `Security & Safety` | Anti-cheat, encryption, crash protection, sandboxing.
`📤` | `Deployment` | Packaging, installers, release automation, patching.
