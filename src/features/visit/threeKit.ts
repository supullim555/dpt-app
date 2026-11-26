// v1.00: everything the 3D view takes from three.js, in one module that's only ever loaded with import() (hospitalScene.ts).
// When the pieces were imported one by one, the bundler put three.js itself (about 840 KB) in the chunk every page loads
// first, so the notice and the title waited for it; now it comes in its own chunk, fetched ahead while you're on the title.
import * as THREE from 'three';

export { THREE };
export { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
export { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
export { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
export { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
export { Water } from 'three/examples/jsm/objects/Water2.js';
export { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
export { Reflector } from 'three/examples/jsm/objects/Reflector.js';
