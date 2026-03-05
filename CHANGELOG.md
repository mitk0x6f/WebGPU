# Changelog

All notable changes to this project will be documented in this file.

---

## [0.2.4] - 2026-03-05

### 🚀 Core Engine

- **Project-wide Memory Optimization**:
  - Eliminated per-frame memory allocations in the main update loop to prevent Garbage Collection (GC) pressure and micro-stutters
  - Refactored `Character` controller to use pre-allocated scratch vectors for movement and velocity calculations
  - Optimized `BaseCamera` oblique clipping logic to reuse internal matrix and vector objects
  - Refactored `RenderPassManager` reflection pass to avoid cloning camera state objects during the mirrored pass
  - Achieved a stable heap profile during continuous gameplay

### 🧪 Debug & Tooling

- **Controls Reference Panel**:
  - Implemented a dedicated "Controls" tab in the debug UI
    - Provides a list of keybindings
    - Organized by category: Camera, Third-Person Mode, and Free-Flight Mode
    - High-readability layout with granular key-to-action mapping

---

## [0.2.3] - 2026-03-05

### 🎮 Input & Camera

- **Pointer Lock Integration**:
  - Implemented `Pointer Lock API` to enable infinite 360-degree camera rotation without cursor boundary interruptions
  - Added automatic cursor position restoration to the original screen coordinates upon releasing mouse buttons
- **Refined Input Muting**:
  - Transitioned from `hover-based muting` to `selective interaction muting`
  - Game controls (rotation/movement) now remain active while hovering the UI, only muting when actively clicking, dragging sliders, or typing

### 🧪 Debug & Tooling

- **Performance Monitoring**:
  - Reduced graph sampling frequency for `FPS` and `Frame Time` to provide a more stable, long-term performance trend
  - High-precision text values remain live for immediate frame-by-frame monitoring
  - Added dual-mode stats showing both real-time text values and historical line graphs for `FPS` and `Frame Time (ms)`
  - Optimized graph refresh rates for modern high-refresh displays
- **Draggable UI**:
  - Implemented a floating, repositionable debug window with a dedicated title bar handle
- **Reactive UI Bindings**:
  - Added intelligent control state management (`Shoulder Offset` automatically disables when camera is centered)
  - Implemented `Reset to Defaults` functionality for quick camera recalibration
- **Layout Improvements**:
  - Adopted a tabbed interface (`Stats` and `Camera`) for a cleaner, organized workspace

### 🚀 Core Engine

- **Immediate Feedback Loop**:
  - Synchronized the main tick loop to ensure that UI parameter changes reflect in the viewport with zero latency

---

## [0.2.2] - 2026-03-04

### 🎮 Input & Camera

- **Third-Person Camera**:
  - Shoulder offset transitions now use an `ease-out quart` curve for smooth, polished side-switching
  - Implemented shoulder offset control with the following control scheme:
    - `1`: Over left shoulder
    - `2`: Over character's head
    - `3`: Over right shoulder
  - Configurable transition duration via `_shoulderEaseDuration` (default `0.4s`)
  - Seamless mid-transition direction changes without visual jumps

### 🧪 Debug & Tooling

- **Modular Debug UI System**:
  - Implemented a backend-agnostic abstraction layer (`IDebugUI`) for developer tools
  - Integrated `Tweakpane` as the initial concrete implementation for 2026-standard debug panels
  - Created `CameraPanel` with real-time controls for `FOV`, `near / far clipping`, and `position monitoring`
  - Created `RendererPanel` for live `FPS` and `frame-time` statistics
  - Added support for `F1` toggling of the debug interface
  - Designed with future extensibility in mind to allow seamless replacement with custom WebGPU-rendered UI

### 📖 Documentation

- Updated `README.md` with the new modular Debug UI system documentation and architecture overview
- Added explicit `TODO` for future replacement of Tweakpane with a custom WebGPU-rendered system
- Standardized naming and writing style across `CHANGELOG.md` entries

---

## [0.2.1] - 2026-03-04

### 🎮 Input & Camera

- **Third-Person Camera**:
  - Fully decoupled absolute orbit architecture
  - Advanced smoothing with momentum on `Left Mouse Button` release and instant stop on `Right Mouse Button` release
  - Camera follows character rotation automatically when steering with `A` and `D`
  - Zero-allocation update loops via pre-cached vectors to eliminate GC frame-stutters
- **Free-Flight Camera**:
  - Simplified controls to allow camera rotation with both `Left Mouse Button` and `Right Mouse Button`
- **Character Controller**:
  - Smooth character catch-up interpolation when steering via the camera
  - Character rotates to face camera direction while holding `Right Mouse Button`
  - Strafe movement with `A` and `D` while holding `Right Mouse Button`
- **General Input**:
  - Cursor hiding for both `Left Mouse Button` and `Right Mouse Button` holds
  - Disabled default browser context menu for improved camera control experience

---

## [0.2.0] - 2026-01-13

### 🚀 Core Engine

- **Grouping System**: Implemented simple object organization
  - Optional `groupId` property on all renderables
  - `GroupManager` utility with O(1) group lookups
  - Explicit assignment API: `scene.groupManager.assign(object, groupId)`
  - Scene-level convenience methods: `getMeshesByGroup()`, `setGroupVisibility()`
  - Foundation for future ECS architecture migration

- **Optimization**:
  - Defined build-time constants in `src/core/math-constants.ts`
  - Replaced selected runtime divisions with multiplications or built-time constants

### 🎮 Input & Camera

- **Third-Person Camera**:
  - Implemented `over-the-shoulder` style view
  - Added camera smoothing (lerp) for rotation and pitch
  - Added configurable parameters for `height`, `pitch`, `shoulder offset`, and `smoothing`
- **Free-Flight Camera**: Unchanged
  - Control scheme:
    - `W`: Move forward
    - `S`: Move backwards
    - `A`: Move left
    - `D`: Move right
    - `Q`: Move down
    - `E`: Move up
    - `Mouse`: Hold left mouse button and move mouse to look around
- **Character Controller**:
  - Integrated `three.js FBXLoader` for FBX models
  - Implemented basic `WASD` movement relative to camera view with the following control scheme:
    - `W`: Move forward
    - `S`: Move backwards
    - `A`: Rotate left (CCW)
    - `D`: Rotate right (CW)
    - `Q`: Move left
    - `E`: Move right
    - `Mouse`: Hold left mouse button and move mouse to look around

### 📦 Asset Pipeline

- Added support for loading FBX models
- Implemented model scaling and rotation adjustments during load

### 🧰 Build & Platform

- Project structure adjusted:
  - `public/`:
    - `models/`: FBX models `NEW`

### 📖 Documentation

- Updated `Features` and `TODO` sections in `README.md`
- Updated formatting for `0.1.1` patch notes in `CHANGELOG.md`

---

## [0.1.1] - 2025-11-25

<details>
  <summary>View</summary>

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

- Updated skybox `skybox2` assets
- Reflection integration with skybox cubemap
- Reduced reflection clear color artifacts
- Adjusted distortion strength for cleaner reflections

### 🧰 Build & Platform

- Texture loader updated for `PNG` format cubemaps

### 📖 Documentation

- Updated `README.md` with reflection features
- Added TODOs for water height uniform system
- Code comments for oblique projection implementation

</details>

---

## [0.1.0] - 2025-11-21

<details>
  <summary>View</summary>

### 🚀 Core Engine

- Initial WebGPU rendering pipeline setup
- Basic 3D rendering system for scene rendering
- Scene graph system with meshes and skybox

### 🎮 Input & Camera

- Fly camera controls:
  - Movement: `W`, `A`, `S`, `D`, `Q`, `E`
  - Mouse: Look direction control
- Input handling via `KeyboardEvent` and `MouseEvent` listeners

### 🎨 Shader

- Modular WGSL shader design:
  - `water/`: Vertex and fragment shaders for water rendering with displacement and normal mapping
  - `skybox/`: Shaders for skybox rendering
  - `cube/`: Simple cube shaders for testing
  - `simple/`: Basic shaders

### 💡 Lighting & Environment

- Skybox support with cubemap textures
- Basic lighting model in shaders
- Water rendering with:
  - Reflection/refraction approximations
  - Fresnel effects
  - Wave displacement

### 🧰 Build & Platform

- Vite-based build system with TypeScript support
- Project structure organization:
  - `src/`: TypeScript source code (core, rendering, scene, shaders)
    - `core/`: WebGPU utilities
    - `rendering/`: Renderer implementation
    - `scene/`: Scene management
    - `shaders/`: WGSL shader files
  - `public/`: Static assets including textures (skybox, water)
    - `textures/`: Textures for skybox, water, and other assets

</details>

---

## Legend

Emoji | Category | Description
:---: | :--- | :---
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
