import * as THREE from "three";
import { resolve_fire_colors } from "@fracto/sdk/FractoMaterialEffects.js";

// Animated fire: layered noise flames that turn to face the camera (in the vertex
// shader, so any render loop works), a soft glow, GPU-driven sparks and a
// flickering point light. The anchor follows the parent (units, position, tilt),
// but flames, sparks and light always rise along world up, so a torch mounted at
// an angle still burns vertically.

const NOISE = /* glsl */ `
  float fire_hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fire_noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fire_hash(i), fire_hash(i + vec2(1.0, 0.0)), f.x),
               mix(fire_hash(i + vec2(0.0, 1.0)), fire_hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fire_fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * fire_noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

// Cylindrical billboard around world up; position.xy is the sheet, uLift raises
// it along world up (sheet units) and uDepth pushes a layer toward/away from the
// camera for parallax. Scale comes from the model matrix, rotation does not.
const BILLBOARD_VERTEX = /* glsl */ `
  uniform float uDepth, uLift;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float height_scale = length((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    vec3 up = vec3(0.0, 1.0, 0.0);
    float width_scale = length((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
    vec3 to_camera = cameraPosition - base;
    vec3 flat_view = to_camera - up * dot(to_camera, up);
    if (dot(flat_view, flat_view) < 1e-12) flat_view = vec3(0.0, 0.0, 1.0);
    vec3 facing = normalize(flat_view);
    vec3 right = normalize(cross(up, facing));
    vec3 world = base + right * position.x * width_scale
      + up * (position.y + uLift) * height_scale + facing * uDepth * width_scale;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const FLAME_FRAGMENT = /* glsl */ `
  uniform float uTime, uSeed, uIntensity, uShape;
  uniform vec3 uCore, uBody, uTip;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    float y = vUv.y, t = uTime;
    float n = fire_fbm(vec2(vUv.x * 2.6 + uSeed, y * 3.0 - t * 2.3));
    float n2 = fire_fbm(vec2(vUv.x * 5.2 - uSeed * 1.7, y * 6.2 - t * 3.7));
    float sway = (sin(t * 1.7 + uSeed) * 0.35 + (n - 0.5)) * 0.17 * y * y;
    float x = vUv.x - 0.5 + sway + (n2 - 0.5) * 0.11 * y;
    // Teardrop: widest a little above the base, narrowing to the tip.
    float half_width = 0.31 * uShape * pow(max(1.0 - y, 0.0), 0.5)
      * smoothstep(-0.08, 0.1, y);
    float body = 1.0 - smoothstep(half_width * 0.3, half_width, abs(x));
    // Separate tongues: high-frequency noise across x eats into the upper flame.
    float tongues = fire_fbm(vec2(vUv.x * 7.0 + uSeed * 2.3, y * 2.2 - t * 2.9));
    float top = smoothstep(0.0, 0.3, (1.1 - y) - (n2 - 0.3) * 0.55 - (tongues - 0.45) * 0.7 * y);
    float flame = body * top * smoothstep(0.1, 0.5, n + 0.55 * (1.0 - y));
    float heat = clamp(flame * (1.2 - y * 0.95) * (0.7 + 0.6 * n), 0.0, 1.0);
    vec3 color = mix(uTip, uBody, smoothstep(0.06, 0.42, heat));
    color = mix(color, uCore, smoothstep(0.55, 0.92, heat));
    float alpha = smoothstep(0.02, 0.35, flame);
    // Premultiplied "over" with extra emission: covers light backgrounds,
    // glows over dark ones.
    gl_FragColor = vec4(color * alpha * uIntensity * 1.5, alpha * 0.8);
    #include <colorspace_fragment>
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform float uTime, uIntensity;
  uniform vec3 uBody;
  varying vec2 vUv;
  void main() {
    vec2 d = (vUv - vec2(0.5, 0.42)) * vec2(1.0, 0.8);
    float r = length(d) * 2.0;
    float pulse = 0.85 + 0.15 * sin(uTime * 7.3) * sin(uTime * 3.1);
    float a = pow(max(1.0 - r, 0.0), 3.0) * 0.16 * uIntensity * pulse;
    gl_FragColor = vec4(uBody * a, 0.0);
    #include <colorspace_fragment>
  }
`;

const SPARK_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime, uHeight, uWidth, uPixel;
  varying float vLife;
  varying float vSeed;
  void main() {
    float rate = 0.35 + fract(aSeed * 7.13) * 0.45;
    float life = fract(uTime * rate + aSeed);
    float angle = aSeed * 6.2831 + uTime * (0.6 + fract(aSeed * 3.7));
    float radius = uWidth * 0.22 * (0.25 + life) * fract(aSeed * 5.3);
    vec3 p = vec3(
      cos(angle) * radius + sin(uTime * 2.1 + aSeed * 20.0) * uWidth * 0.1 * life,
      uHeight * (0.15 + life * (1.2 + fract(aSeed * 9.1) * 0.9)),
      sin(angle) * radius);
    vLife = life;
    vSeed = aSeed;
    // Rise along world up from the anchor, whatever the parent's rotation.
    vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float units = length((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
    vec4 view = viewMatrix * vec4(base + p * units, 1.0);
    gl_Position = projectionMatrix * view;
    // Height is in the fire's units; scale it to world units like the position.
    gl_PointSize = clamp(
      uPixel * uHeight * units * 0.022 * (1.0 - life * 0.6) / max(-view.z, 1e-6),
      1.0,
      48.0
    );
  }
`;

const SPARK_FRAGMENT = /* glsl */ `
  uniform float uIntensity, uTime;
  uniform vec3 uCore, uBody, uTip;
  varying float vLife;
  varying float vSeed;
  void main() {
    if (fract(vSeed * 13.7) > 0.55) discard;
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float twinkle = 0.65 + 0.35 * sin(uTime * 23.0 + vSeed * 50.0);
    float a = (1.0 - d * d) * pow(1.0 - vLife, 1.6) * twinkle * uIntensity;
    vec3 color = mix(mix(uCore, uBody, smoothstep(0.0, 0.35, vLife)), uTip,
      smoothstep(0.35, 1.0, vLife));
    gl_FragColor = vec4(color * a * 1.6, a * 0.5);
    #include <colorspace_fragment>
  }
`;

const LAYERS = [
  // shape, height, depth, seed, intensity
  [1.0, 1.0, -0.06, 0.0, 0.85],
  [0.8, 0.86, 0.04, 3.7, 0.9],
  [0.55, 0.6, 0.1, 7.9, 1.25],
];
const SPARK_COUNT = 64;

const premultiplied = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  toneMapped: false,
};

export function create_fire_effect(effect, { cardinality } = {}) {
  const width = effect.width ?? effect.size * 0.8,
    // The drawn sheet is wider than the flame so swaying tongues never clip.
    sheet_width = width * 1.3,
    height = effect.size;
  const group = new THREE.Group();
  group.name = "fire";
  group.position.fromArray(effect.anchor);
  const colors = {
    core: new THREE.Color(),
    body: new THREE.Color(),
    tip: new THREE.Color(),
  };
  const shared = {
    uTime: { value: 0 },
    uIntensity: { value: effect.intensity },
    uCore: { value: colors.core },
    uBody: { value: colors.body },
    uTip: { value: colors.tip },
  };
  const sheet = new THREE.PlaneGeometry(1, 1, 1, 1);
  sheet.translate(0, 0.5, 0);
  const materials = [],
    geometries = [sheet];
  const glow_material = new THREE.ShaderMaterial({
    ...premultiplied,
    uniforms: { ...shared, uDepth: { value: -0.2 }, uLift: { value: -0.35 / 1.5 } },
    vertexShader: BILLBOARD_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
  });
  materials.push(glow_material);
  const glow = new THREE.Mesh(sheet, glow_material);
  glow.scale.set(width * 2.4, height * 1.5, 1);
  glow.renderOrder = 10;
  group.add(glow);
  for (const [shape, layer_height, depth, seed, intensity] of LAYERS) {
    const material = new THREE.ShaderMaterial({
      ...premultiplied,
      uniforms: {
        ...shared,
        uIntensity: { value: effect.intensity * intensity },
        uSeed: { value: seed },
        uLift: { value: 0 },
        uShape: { value: shape },
        uDepth: { value: depth },
      },
      vertexShader: BILLBOARD_VERTEX,
      fragmentShader: FLAME_FRAGMENT,
    });
    material.userData.layer_intensity = intensity;
    material.userData.base_seed = seed;
    materials.push(material);
    const mesh = new THREE.Mesh(sheet, material);
    mesh.scale.set(sheet_width, height * layer_height, 1);
    mesh.renderOrder = 11;
    group.add(mesh);
  }
  let sparks = null;
  if (effect.sparks) {
    const geometry = new THREE.BufferGeometry();
    const seeds = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) seeds[i] = (i * 0.618034) % 1;
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3),
    );
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      ...premultiplied,
      uniforms: {
        ...shared,
        uHeight: { value: height },
        uWidth: { value: width },
        uPixel: { value: 600 },
      },
      vertexShader: SPARK_VERTEX,
      fragmentShader: SPARK_FRAGMENT,
    });
    materials.push(material);
    geometries.push(geometry);
    sparks = new THREE.Points(geometry, material);
    sparks.renderOrder = 12;
    group.add(sparks);
  }
  let light = null;
  if (effect.light) {
    light = new THREE.PointLight(0xffffff, 0, height * 8, 2);
    light.position.y = height * 0.35;
    // Shadows only show where the renderer enables shadow maps (the components
    // stage); undefined (older records) means on.
    light.castShadow = effect.shadows !== false;
    light.shadow.mapSize.set(512, 512);
    group.add(light);
  }
  for (const child of group.children) {
    child.frustumCulled = false;
    if (child.isLight) continue; // the light's castShadow is the effect's `shadows`
    // Flames, glow and sparks neither cast nor receive shadows.
    child.castShadow = false;
    child.receiveShadow = false;
  }
  group.traverse((node) => {
    node.userData.inventory_effect = true;
    // Never picked by stage clicks, walk probes or selection rays.
    if (node.isMesh || node.isPoints) node.raycast = () => {};
  });

  // Flame colors are orbital pattern colors; null restores the saved cardinality.
  const set_cardinality = (value) => {
    const resolved = resolve_fire_colors(value ?? effect.cardinality);
    for (const key of ["core", "body", "tip"])
      colors[key].set(resolved[key]);
    light?.color.copy(colors.body).lerp(colors.core, 0.3);
  };
  set_cardinality(cardinality);

  let time = 0;
  // Each fire's own identity, from where it is placed (world position at its
  // first update), so fires that share a material never move in step: start
  // phase, drift rate, mirrored drift, a slowly wandering tempo and its own
  // flame noise. Deterministic: the same placement behaves the same each load.
  const fraction = (value) => value - Math.floor(value);
  let identity = null;
  const assign_identity = () => {
    group.updateWorldMatrix(true, false);
    const p = group.getWorldPosition(new THREE.Vector3());
    const seed = fraction(
      Math.sin(p.x * 12.9898 + p.y * 78.233 + p.z * 37.719) * 43758.5453,
    );
    identity = {
      seed,
      rate: 0.85 + 0.3 * fraction(seed * 7.31),
      mirror_x: fraction(seed * 13.7) < 0.5 ? -1 : 1,
      mirror_z: fraction(seed * 5.93) < 0.5 ? -1 : 1,
      tempo_a: 0.21 + 0.2 * fraction(seed * 3.37),
      tempo_b: 0.57 + 0.3 * fraction(seed * 9.71),
      phase: seed * 6.2832,
    };
    time = seed * 40;
    for (const material of materials)
      if (material.uniforms.uSeed)
        material.uniforms.uSeed.value =
          material.userData.base_seed + seed * 37;
  };
  // Tempo wanders between about 0.7× and 1.3× on this fire's own schedule.
  const tempo = (t) =>
    1 +
    0.2 * Math.sin(t * identity.tempo_a + identity.phase) +
    0.1 * Math.sin(t * identity.tempo_b + identity.phase * 1.7);
  const flicker = (t) =>
    0.78 +
    0.12 * Math.sin(t * 9.1) * Math.sin(t * 2.3 + 1.7) +
    0.1 * Math.sin(t * 17.3 + Math.sin(t * 5.1));
  // Optional authored light position (see the SDK's light_offset): x/z on the
  // model's own axes, y raised along world up.
  const lift = effect.light_offset ? effect.light_offset[1] : height * 0.35;
  const horizontal = new THREE.Vector3(
    effect.light_offset?.[0] ?? 0,
    0,
    effect.light_offset?.[2] ?? 0,
  );
  const rotation = new THREE.Quaternion(),
    world_scale = new THREE.Vector3();
  let world_height = height;
  // The light sits above the flame base along world up, in the fire's own units,
  // and drifts a little with the flame so the shadows it casts dance.
  const sway = new THREE.Vector3();
  const place_light = (t = 0) => {
    if (!light) return;
    group.updateWorldMatrix(true, false);
    // Light range and brightness are in world units: a fire on a model scaled
    // from centimetres to metres must not light 100x as far.
    world_height = height * group.getWorldScale(world_scale).y;
    light.distance = world_height * 8;
    // Near/far only take effect once the projection is rebuilt; without it the
    // shadow camera keeps its defaults and clips out the torch itself.
    const near = Math.max(world_height * 0.02, 1e-4);
    if (
      light.shadow.camera.near !== near ||
      light.shadow.camera.far !== light.distance
    ) {
      light.shadow.camera.near = near;
      light.shadow.camera.far = light.distance;
      light.shadow.camera.updateProjectionMatrix();
    }
    // Close, grazing light on uneven stone needs a firm bias, or each block
    // shadows its neighbours in square patches.
    light.shadow.bias = -0.003;
    light.shadow.normalBias = world_height * 0.02;
    group.getWorldQuaternion(rotation).invert();
    // World-axis drift in flame heights: side to side, toward/away, up/down,
    // at this fire's own rate and handedness.
    const rate = identity?.rate ?? 1,
      u = t * rate;
    sway.set(
      (identity?.mirror_x ?? 1) *
        0.06 *
        (Math.sin(u * 3.1) * 0.6 + Math.sin(u * 7.7 + 1.3) * 0.4),
      lift / height + 0.04 * Math.sin(u * 5.3 + 0.7) * Math.sin(u * 2.1),
      (identity?.mirror_z ?? 1) *
        0.04 *
        (Math.sin(u * 4.3 + 2.1) * 0.7 + Math.sin(u * 9.1) * 0.3),
    );
    light.position
      .copy(sway)
      .applyQuaternion(rotation)
      .multiplyScalar(height)
      .add(horizontal);
  };
  const step = (delta = 0, camera, viewport_height) => {
    if (!identity && group.parent) assign_identity();
    time += delta * effect.speed * (identity ? tempo(time) : 1);
    place_light(time);
    shared.uTime.value = time;
    if (sparks && camera?.isPerspectiveCamera && viewport_height)
      sparks.material.uniforms.uPixel.value =
        viewport_height /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    if (light) {
      // Scale with the world-space size squared so the lit area tracks the flame.
      light.intensity =
        6 * world_height * world_height * effect.intensity * flicker(time);
    }
  };
  step(0);
  return {
    object: group,
    light,
    get time() {
      return time;
    },
    /** This fire's motion identity (null until it is placed and updated). */
    get identity() {
      return identity;
    },
    update: step,
    set_cardinality,
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      light?.dispose();
      group.removeFromParent();
    },
  };
}
