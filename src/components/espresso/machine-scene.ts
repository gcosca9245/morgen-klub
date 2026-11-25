import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import {
  badgeTexture,
  contactShadowTexture,
  cremaTexture,
  gaugeTexture,
  puffTexture,
  rng,
  walnutTexture,
} from './textures';

export type Hotspot = 'power' | 'hopper' | 'grinder' | 'paddle';

export interface SceneOptions {
  reducedMotion: boolean;
  onHotspot: (h: Hotspot) => void;
}

/* ------------------------------------------------------------------------------------------------
 * Maße (1 Einheit ≈ 10 cm). Maschine steht rechts, Mühle links, beide mit Front Richtung +z.
 * ---------------------------------------------------------------------------------------------- */
const MACHINE_X = 0.85;
const GRINDER = new THREE.Vector3(-2.75, 0, 0.1);
const GROUP_Z = 2.05;
const PF_LOCKED = new THREE.Vector3(MACHINE_X, 2.0, GROUP_Z);
const PF_AT_GRINDER = new THREE.Vector3(GRINDER.x, 1.36, GRINDER.z + 0.98);
const CUP_POS = new THREE.Vector3(MACHINE_X, 0.53, GROUP_Z);
const HOPPER_BOTTOM = 2.56;
const HOPPER_H = 1.25;
const HOPPER_R0 = 0.3;
const HOPPER_R1 = 0.64;
const BEANS = 260;
const CUP_INNER_H = 0.34;
const STEAM_POOL = 26;

const BAR_TO_ANGLE = (bar: number) => -((Math.PI * 1.5 * bar) / 15) + Math.PI * 0.75 - Math.PI / 2;

/**
 * Fotostudio als Umgebung: dunkler Raum mit großen Softboxen und Lichtstreifen.
 * Erzeugt die kontrastreichen Spiegelungen, an denen man polierten Edelstahl erkennt.
 */
function studioEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#1d1b1a');
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(30, 16, 30),
    new THREE.MeshBasicMaterial({ color: '#4a4542', side: THREE.BackSide }),
  );
  room.position.y = 6;
  env.add(room);
  const light = (color: string, intensity: number, w: number, h: number, pos: [number, number, number], look: [number, number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos);
    m.lookAt(...look);
    env.add(m);
  };
  light('#fff4e6', 6, 12, 7, [0, 13, 2], [0, 0, 0]); // große Deckensoftbox
  light('#ffffff', 9, 1.4, 12, [-12, 6, 4], [0, 4, 0]); // Streifen links
  light('#fff0e0', 7, 1.4, 12, [12, 6, -2], [0, 4, 0]); // Streifen rechts, leicht warm
  light('#fff8ee', 5, 18, 3.2, [0, 7.5, 14], [0, 3, 0]); // Front-Softbox (obere Hälfte)
  light('#fff8ee', 1.4, 18, 2.4, [0, 1.6, 14], [0, 3, 0]); // Front-Aufheller unten
  light('#b8a493', 0.55, 30, 30, [0, -1.9, 0], [0, 10, 0]); // dezenter Bodenreflex (Tischplatte)
  return env;
}

function rounded(w: number, h: number, d: number, r = 0.08, seg = 4) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos?: [number, number, number], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

interface Puff {
  sprite: THREE.Sprite;
  life: number;
  ttl: number;
  vel: THREE.Vector3;
  grow: number;
}

/**
 * Echtzeit-3D-Szene der Siebträgermaschine im Dual-Boiler-Stil mit Mühle.
 * Alle Abläufe sind GSAP-Timelines und liefern Promises, damit die UI sauber Zustände wechseln kann.
 */
export class EspressoScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  private readonly target = new THREE.Vector3(-0.3, 1.95, 0.85);
  private readonly pointer = new THREE.Vector2();
  private readonly look = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly hotspots = new Map<Hotspot, THREE.Object3D>();
  private readonly disposables: { dispose: () => void }[] = [];
  private readonly ctx: gsap.Context;
  private readonly clock = new THREE.Clock();
  private readonly opts: SceneOptions;

  // bewegliche Teile
  private readonly needle = new THREE.Group();
  private readonly powerLever = new THREE.Group();
  private readonly paddle = new THREE.Group();
  private readonly portafilter = new THREE.Group();
  private readonly grinderBody = new THREE.Group();
  private readonly ledMat: THREE.MeshStandardMaterial;
  private readonly grinderLedMat: THREE.MeshStandardMaterial;
  private readonly workLightMat: THREE.MeshStandardMaterial;
  private readonly workLight: THREE.SpotLight;
  private readonly coffeeBed: THREE.Mesh;
  private readonly beans: THREE.InstancedMesh;
  private readonly beanTargets: THREE.Vector3[] = [];
  private readonly beanStart: THREE.Vector3[] = [];
  private readonly beanRot: THREE.Euler[] = [];
  private readonly streams: THREE.Mesh[] = [];
  private readonly liquid: THREE.Mesh;
  private readonly liquidMat: THREE.MeshPhysicalMaterial;
  private readonly grounds: THREE.Points;
  private readonly groundsVel: Float32Array;
  private readonly hint: THREE.Mesh;
  private readonly puffs: Puff[] = [];
  private readonly puffMat: THREE.SpriteMaterial;

  private readonly state = {
    bar: 0,
    beanLevel: 0,
    /** Anteil der Bohnen, der noch nicht gemahlen wurde. */
    beanCap: 1,
    fill: 0,
    stream: 0,
    shake: 0,
    grinding: 0,
    steamCup: 0,
    steamWand: 0,
    hint: null as Hotspot | null,
  };
  private hovered: Hotspot | null = null;
  private running = false;
  private disposed = false;
  private size = { w: 1, h: 1 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: SceneOptions,
  ) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const studio = studioEnvironment();
    this.scene.environment = pmrem.fromScene(studio, 0.02).texture;
    this.scene.environmentIntensity = 1.25;
    studio.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    pmrem.dispose();

    this.ctx = gsap.context(() => {});

    /* ---------- Materialien ---------- */
    const steel = new THREE.MeshPhysicalMaterial({ color: '#f2f2f3', metalness: 1, roughness: 0.07 });
    const brushed = new THREE.MeshPhysicalMaterial({ color: '#dcdde0', metalness: 1, roughness: 0.28 });
    const enamel = new THREE.MeshPhysicalMaterial({
      color: '#6a3a22',
      roughness: 0.32,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const rubber = new THREE.MeshStandardMaterial({ color: '#17110e', roughness: 0.62 });
    const wood = new THREE.MeshPhysicalMaterial({ map: walnutTexture(), roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const ceramic = new THREE.MeshPhysicalMaterial({ color: '#ebe4d9', roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.15, envMapIntensity: 0.7, side: THREE.DoubleSide });
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.16,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const dark = new THREE.MeshStandardMaterial({ color: '#0d0907', roughness: 0.8 });
    this.ledMat = new THREE.MeshStandardMaterial({ color: '#2b1d16', emissive: '#ffb25c', emissiveIntensity: 0 });
    this.grinderLedMat = this.ledMat.clone();
    this.workLightMat = new THREE.MeshStandardMaterial({ color: '#3a2a22', emissive: '#ffd9a8', emissiveIntensity: 0 });
    this.disposables.push(steel, brushed, enamel, rubber, wood, ceramic, glass, dark, this.ledMat, this.grinderLedMat, this.workLightMat);

    /* ---------- Licht ---------- */
    const key = new THREE.DirectionalLight('#fff1e0', 2.1);
    key.position.set(-5, 9, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 14;
    key.shadow.blurSamples = 16;
    this.scene.add(key, new THREE.HemisphereLight('#fff6ea', '#a9693b', 0.5));
    const rim = new THREE.DirectionalLight('#ffd7b0', 1.2);
    rim.position.set(6, 5, -6);
    this.scene.add(rim);

    this.workLight = new THREE.SpotLight('#ffd9a8', 0, 4, 0.7, 0.6, 1.2);
    this.workLight.position.set(MACHINE_X, 2.45, GROUP_Z + 0.25);
    this.workLight.target.position.copy(CUP_POS);
    this.scene.add(this.workLight, this.workLight.target);

    /* ---------- Boden ---------- */
    const floor = mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.22 }), undefined, false);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const contact = new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false });
    for (const [x, z, sx, sz] of [
      [MACHINE_X, 0.25, 5.2, 5.6],
      [GRINDER.x, GRINDER.z, 2.4, 2.6],
    ] as const) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), contact);
      s.rotation.x = -Math.PI / 2;
      s.position.set(x, 0.004, z);
      this.scene.add(s);
    }
    this.disposables.push(contact);

    /* ---------- Maschine ---------- */
    const m = new THREE.Group();
    m.position.x = MACHINE_X;
    this.scene.add(m);

    for (const [x, z] of [[-1.5, -1.6], [1.5, -1.6], [-1.5, 1.15], [1.5, 1.15]] as const) {
      m.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 24), rubber, [x, 0.1, z]));
    }
    // Korpus mit lackierten Seiten, Edelstahl-Front und auskragender Haube
    m.add(mesh(rounded(3.6, 2.35, 3.2, 0.14), enamel, [0, 0.2 + 1.175, -0.3]));
    m.add(mesh(rounded(3.3, 1.9, 0.06, 0.03), brushed, [0, 1.25, 1.31]));
    m.add(mesh(rounded(3.66, 1.04, 4.6, 0.16, 6), steel, [0, 3.07, 0.34]));
    m.add(mesh(rounded(3.3, 0.04, 4.15, 0.02), brushed, [0, 3.6, 0.325]));
    // Tassenablage-Reling
    const railY = 3.66;
    const railMat = steel;
    const rail = (len: number, pos: [number, number, number], rotZ = 0, rotX = 0) => {
      const r = mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 12), railMat, pos);
      r.rotation.set(rotX, 0, rotZ);
      m.add(r);
    };
    rail(3.2, [0, railY, -1.7], Math.PI / 2);
    rail(3.2, [0, railY, 2.35], Math.PI / 2);
    rail(4.05, [-1.6, railY, 0.325], 0, Math.PI / 2);
    rail(4.05, [1.6, railY, 0.325], 0, Math.PI / 2);
    for (const [x, z] of [[-1.6, -1.7], [1.6, -1.7], [-1.6, 2.35], [1.6, 2.35]] as const) {
      m.add(mesh(new THREE.SphereGeometry(0.05, 16, 12), railMat, [x, railY, z]));
      m.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10), railMat, [x, railY - 0.06, z]));
    }
    // Arbeitslicht unter der Haube
    m.add(mesh(new THREE.BoxGeometry(2.6, 0.02, 0.08), this.workLightMat, [0, 2.54, 2.45], false));

    // Brühgruppe
    m.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 48), steel, [0, 2.49, GROUP_Z]));
    m.add(mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.34, 48), steel, [0, 2.26, GROUP_Z]));
    const gasket = mesh(new THREE.TorusGeometry(0.42, 0.04, 12, 48), rubber, [0, 2.09, GROUP_Z]);
    gasket.rotation.x = Math.PI / 2;
    m.add(gasket);

    // Paddel auf der Haube
    this.paddle.position.set(0, 3.6, GROUP_Z);
    this.paddle.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 32), steel));
    const blade = mesh(rounded(0.95, 0.12, 0.22, 0.05), wood, [0.5, 0.1, 0]);
    this.paddle.add(blade);
    this.paddle.rotation.y = 0.55;
    m.add(this.paddle);
    this.register('paddle', blade);

    // Manometer
    const gauge = new THREE.Group();
    gauge.position.set(-0.95, 3.08, 2.66);
    const bezel = mesh(new THREE.TorusGeometry(0.3, 0.05, 16, 64), steel);
    gauge.add(bezel);
    const faceMat = new THREE.MeshStandardMaterial({ map: gaugeTexture(), roughness: 0.5 });
    gauge.add(mesh(new THREE.CircleGeometry(0.3, 64), faceMat, [0, 0, 0.005], false));
    const needleMat = new THREE.MeshStandardMaterial({ color: '#864d28', roughness: 0.4 });
    const needleBar = mesh(new THREE.BoxGeometry(0.018, 0.24, 0.01), needleMat, [0, 0.09, 0.02], false);
    this.needle.add(needleBar, mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), steel, [0, 0, 0.02], false));
    this.needle.children[1]?.rotateX(Math.PI / 2);
    this.needle.rotation.z = BAR_TO_ANGLE(0);
    gauge.add(this.needle);
    gauge.add(mesh(new THREE.CircleGeometry(0.3, 64), glass, [0, 0, 0.045], false));
    m.add(gauge);
    this.disposables.push(faceMat, needleMat);

    // Markenplakette + Bereitschafts-LED
    const badgeMat = new THREE.MeshStandardMaterial({ map: badgeTexture(), transparent: true, roughness: 0.4, metalness: 0.2 });
    m.add(mesh(new THREE.PlaneGeometry(1.25, 0.31), badgeMat, [0.62, 3.1, 2.652], false));
    m.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24).rotateX(Math.PI / 2), this.ledMat, [1.48, 3.1, 2.65], false));
    this.disposables.push(badgeMat);

    // Netzschalter (Kippschalter) unten links
    const switchPlate = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32).rotateX(Math.PI / 2), steel, [-1.2, 0.95, 1.36]);
    m.add(switchPlate);
    this.powerLever.position.set(-1.2, 0.95, 1.39);
    const lever = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.28, 16), steel, [0, 0.14, 0]);
    this.powerLever.add(lever, mesh(new THREE.SphereGeometry(0.06, 16, 12), rubber, [0, 0.29, 0]));
    this.powerLever.rotation.x = 0.9;
    m.add(this.powerLever);
    this.register('power', this.powerLever);
    this.register('power', switchPlate);

    // Tropfschale mit Gitter
    m.add(mesh(rounded(2.9, 0.3, 1.6, 0.06), steel, [0, 0.35, 2.15]));
    m.add(mesh(new THREE.BoxGeometry(2.7, 0.01, 1.35), dark, [0, 0.49, 2.15], false));
    const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 0.03, 0.045), brushed, 16);
    const mx = new THREE.Matrix4();
    for (let i = 0; i < 16; i++) slats.setMatrixAt(i, mx.makeTranslation(0, 0.505, 1.53 + i * 0.083));
    slats.receiveShadow = true;
    m.add(slats);

    // Dampflanze + Knauf
    const wand = new THREE.Group();
    wand.position.set(1.42, 2.5, 2.1);
    wand.add(mesh(new THREE.SphereGeometry(0.09, 20, 16), steel));
    const tube = mesh(new THREE.CylinderGeometry(0.045, 0.04, 1.35, 16), steel, [0.12, -0.66, 0.08]);
    tube.rotation.z = 0.18;
    tube.rotation.x = -0.1;
    wand.add(tube);
    m.add(wand);
    const knob = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 32).rotateZ(Math.PI / 2), wood, [1.95, 3.07, 1.9]);
    m.add(knob);

    /* ---------- Siebträger ---------- */
    const pf = this.portafilter;
    pf.add(mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.22, 48, 1, true), steel));
    pf.add(mesh(new THREE.CircleGeometry(0.36, 48).rotateX(Math.PI / 2), steel, [0, -0.11, 0]));
    const rimRing = mesh(new THREE.TorusGeometry(0.42, 0.03, 12, 48).rotateX(Math.PI / 2), steel, [0, 0.11, 0]);
    pf.add(rimRing);
    const bedMat = new THREE.MeshStandardMaterial({ color: '#2a170e', roughness: 0.95 });
    this.coffeeBed = mesh(new THREE.CylinderGeometry(0.39, 0.36, 0.2, 40), bedMat, [0, 0, 0], false);
    this.coffeeBed.scale.y = 0.001;
    this.coffeeBed.visible = false;
    pf.add(this.coffeeBed);
    pf.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.12, 24), steel, [0, -0.17, 0]));
    for (const x of [-0.11, 0.11]) pf.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 12), steel, [x, -0.27, 0]));
    const neck = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 16).rotateX(Math.PI / 2), steel, [0, -0.02, 0.58]);
    pf.add(neck);
    const handle = mesh(new THREE.CylinderGeometry(0.105, 0.085, 1.0, 24).rotateX(Math.PI / 2), wood, [0, -0.07, 1.25]);
    handle.rotation.x += 0.12;
    pf.add(handle);
    pf.add(mesh(new THREE.SphereGeometry(0.105, 20, 14), steel, [0, -0.13, 1.76]));
    pf.position.copy(PF_LOCKED);
    this.scene.add(pf);
    this.disposables.push(bedMat);

    /* ---------- Tasse ---------- */
    const cup = new THREE.Group();
    cup.position.copy(CUP_POS);
    const saucer = new THREE.LatheGeometry(
      [[0, 0], [0.42, 0], [0.5, 0.02], [0.6, 0.05], [0.64, 0.075], [0.62, 0.085], [0.5, 0.06], [0.3, 0.045], [0, 0.045]].map(
        ([x, y]) => new THREE.Vector2(x, y),
      ),
      72,
    );
    cup.add(mesh(saucer, ceramic));
    const cupProfile = [
      [0, 0.05], [0.18, 0.05], [0.2, 0.07], [0.27, 0.16], [0.31, 0.3], [0.33, 0.42], [0.31, 0.42], [0.29, 0.3], [0.25, 0.17], [0.19, 0.09], [0, 0.09],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    cup.add(mesh(new THREE.LatheGeometry(cupProfile, 64), ceramic));
    const cupHandle = mesh(new THREE.TorusGeometry(0.1, 0.03, 12, 32, Math.PI * 1.3), ceramic, [0.34, 0.27, 0]);
    cupHandle.rotation.z = -Math.PI * 0.65;
    cup.add(cupHandle);
    this.liquidMat = new THREE.MeshPhysicalMaterial({ map: cremaTexture(), roughness: 0.35, clearcoat: 0.6 });
    this.liquid = mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), this.liquidMat, [0, 0.09, 0], false);
    this.liquid.visible = false;
    cup.add(this.liquid);
    cup.rotation.y = -0.5;
    // Unter der Haube steht die Tasse im Arbeitslicht; harte Schlagschatten des Siebträgers wirken dort unnatürlich.
    cup.traverse((o) => {
      o.receiveShadow = false;
    });
    this.scene.add(cup);
    this.disposables.push(this.liquidMat);

    // Espressostrahlen aus beiden Ausläufen
    const streamMat = new THREE.MeshPhysicalMaterial({ color: '#4a2412', roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.95 });
    for (const x of [-0.11, 0.11]) {
      const geo = new THREE.CylinderGeometry(0.016, 0.022, 1, 10, 1, true).translate(0, -0.5, 0);
      const s = mesh(geo, streamMat, [PF_LOCKED.x + x, PF_LOCKED.y - 0.33, PF_LOCKED.z], false);
      s.scale.set(0.001, 0.001, 0.001);
      s.visible = false;
      this.streams.push(s);
      this.scene.add(s);
    }
    this.disposables.push(streamMat);

    /* ---------- Mühle ---------- */
    const g = this.grinderBody;
    g.position.copy(GRINDER);
    this.scene.add(g);
    g.add(mesh(rounded(1.4, 0.24, 1.75, 0.08), steel, [0, 0.12, 0.05]));
    g.add(mesh(rounded(1.15, 2.05, 1.3, 0.14), enamel, [0, 0.24 + 1.025, -0.15]));
    g.add(mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.32, 48), steel, [0, 2.44, -0.1]));
    const hopper = mesh(new THREE.CylinderGeometry(HOPPER_R1, HOPPER_R0, HOPPER_H, 48, 1, true), glass, [0, HOPPER_BOTTOM + HOPPER_H / 2, -0.1], false);
    hopper.renderOrder = 2;
    g.add(hopper);
    g.add(mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 48), rubber, [0, HOPPER_BOTTOM + HOPPER_H + 0.04, -0.1]));
    g.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), wood, [0, HOPPER_BOTTOM + HOPPER_H + 0.12, -0.1]));
    g.add(mesh(rounded(0.32, 0.36, 0.5, 0.06), steel, [0, 1.9, 0.62]));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), dark, [0, 1.7, 0.82]));
    const fork = mesh(rounded(0.9, 0.06, 0.28, 0.02), brushed, [0, 1.08, 0.7]);
    g.add(fork);
    const grindBtn = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 32).rotateX(Math.PI / 2), steel, [0, 0.72, 0.52]);
    g.add(grindBtn);
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16).rotateX(Math.PI / 2), this.grinderLedMat, [0, 0.92, 0.51], false));
    this.register('grinder', grindBtn);
    this.register('hopper', hopper);

    // Bohnen (instanziert): Zielpositionen im Trichter, Startpositionen darüber
    const beanGeo = new THREE.SphereGeometry(0.06, 12, 8).scale(1, 0.62, 0.78);
    const beanMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42 });
    this.beans = new THREE.InstancedMesh(beanGeo, beanMat, BEANS);
    this.beans.castShadow = false;
    const r = rng(42);
    const col = new THREE.Color();
    for (let i = 0; i < BEANS; i++) {
      const y = Math.pow(i / BEANS, 0.85) * HOPPER_H * 0.8 + 0.06;
      const rad = (HOPPER_R0 + ((HOPPER_R1 - HOPPER_R0) * y) / HOPPER_H - 0.07) * Math.sqrt(r());
      const a = r() * Math.PI * 2;
      this.beanTargets.push(new THREE.Vector3(Math.cos(a) * rad, HOPPER_BOTTOM + y, -0.1 + Math.sin(a) * rad));
      this.beanStart.push(new THREE.Vector3((r() - 0.5) * 0.35, HOPPER_BOTTOM + HOPPER_H + 1.2 + r() * 0.8, -0.1 + (r() - 0.5) * 0.35));
      this.beanRot.push(new THREE.Euler(r() * 6, r() * 6, r() * 6));
      this.beans.setColorAt(i, col.setHSL(0.06 + r() * 0.02, 0.55, 0.12 + r() * 0.07));
    }
    g.add(this.beans);
    this.disposables.push(beanMat);
    this.updateBeans();

    // Kaffeemehl-Partikel (Mühle → Siebträger)
    const GP = 160;
    const gp = new THREE.BufferGeometry();
    gp.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GP * 3).fill(-99), 3));
    this.groundsVel = new Float32Array(GP);
    this.grounds = new THREE.Points(gp, new THREE.PointsMaterial({ color: '#2f1a0f', size: 0.035, sizeAttenuation: true }));
    this.grounds.frustumCulled = false;
    this.scene.add(this.grounds);

    // Dampf
    this.puffMat = new THREE.SpriteMaterial({ map: puffTexture(), depthWrite: false, transparent: true, opacity: 0 });
    for (let i = 0; i < STEAM_POOL; i++) {
      const sprite = new THREE.Sprite(this.puffMat.clone());
      sprite.visible = false;
      this.scene.add(sprite);
      this.puffs.push({ sprite, life: 0, ttl: 1, vel: new THREE.Vector3(), grow: 1 });
    }
    this.disposables.push(this.puffMat);

    // Hinweis-Ring am nächsten Bedienelement
    const hintMat = new THREE.MeshBasicMaterial({ color: '#a9693b', transparent: true, opacity: 0, depthTest: false });
    this.hint = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 48), hintMat);
    this.hint.renderOrder = 10;
    this.scene.add(this.hint);
    this.disposables.push(hintMat);

    /* ---------- Interaktion ---------- */
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('click', this.onClick);
    this.resize();
  }

  /* ================================ öffentliche API ================================ */

  /** Animationsschleife nur, solange die Bühne sichtbar ist. */
  setVisible(v: boolean) {
    if (this.disposed || v === this.running) return;
    this.running = v;
    this.renderer.setAnimationLoop(v ? this.frame : null);
    if (v) this.clock.getDelta();
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Markiert das nächste Bedienelement mit einem pulsierenden Ring. */
  setHint(h: Hotspot | null) {
    this.state.hint = h;
  }

  powerOn() {
    return this.play((tl) => {
      tl.to(this.powerLever.rotation, { x: -0.9, duration: 0.25, ease: 'back.out(2)' })
        .to(this.ledMat, { emissiveIntensity: 1.6, duration: 0.3, repeat: 5, yoyo: true, ease: 'sine.inOut' }, 0.2)
        .to(this.workLightMat, { emissiveIntensity: 2.2, duration: 0.8 }, 0.3)
        .to(this.workLight, { intensity: 9, duration: 0.8 }, 0.3)
        .to(this.state, { bar: 1.3, duration: 2.6, ease: 'power2.inOut' }, 0.3)
        .to(this.state, { steamWand: 1, duration: 0.4 }, 1.6)
        .to(this.state, { steamWand: 0, duration: 0.6 }, 2.6)
        .to(this.ledMat, { emissiveIntensity: 2.4, duration: 0.3 }, 2.9)
        .set(this.ledMat.emissive, { r: 1, g: 0.86, b: 0.62 }, 2.9);
    });
  }

  fillBeans() {
    return this.play((tl) => {
      tl.to(this.state, { beanLevel: 1, duration: 2.4, ease: 'none', onUpdate: () => this.updateBeans() });
    });
  }

  grind() {
    const pf = this.portafilter;
    return this.play((tl) => {
      tl.to(pf.rotation, { y: -0.55, duration: 0.4, ease: 'power2.inOut' })
        .to(pf.position, { y: PF_LOCKED.y - 0.35, duration: 0.35, ease: 'power2.in' })
        .to(pf.rotation, { y: 0, duration: 0.6 }, '>-0.1')
        .to(pf.position, { x: PF_AT_GRINDER.x, z: PF_AT_GRINDER.z, duration: 1.1, ease: 'power2.inOut' }, '<')
        .to(pf.position, { y: PF_AT_GRINDER.y, duration: 1.1, ease: 'sine.inOut' }, '<')
        .add(() => {
          this.coffeeBed.visible = true;
        })
        .to(this.grinderLedMat, { emissiveIntensity: 2, duration: 0.2 })
        .to(this.state, { grinding: 1, shake: 1, duration: 0.2 }, '<')
        .to(this.coffeeBed.scale, { y: 1, duration: 2.4, ease: 'power1.out' }, '<0.3')
        .to(this.coffeeBed.position, { y: 0.02, duration: 2.4, ease: 'power1.out' }, '<')
        .to(this.state, { beanCap: 0.62, duration: 2.4, ease: 'none', onUpdate: () => this.updateBeans() }, '<')
        .to(this.state, { grinding: 0, shake: 0, duration: 0.25 })
        .to(this.grinderLedMat, { emissiveIntensity: 0, duration: 0.3 }, '<')
        .to(pf.position, { x: PF_LOCKED.x, z: PF_LOCKED.z, duration: 1.1, ease: 'power2.inOut' }, '+=0.2')
        .to(pf.position, { y: PF_LOCKED.y - 0.35, duration: 1.1, ease: 'sine.inOut' }, '<')
        .to(pf.rotation, { y: -0.55, duration: 0.3 }, '<0.7')
        .to(pf.position, { y: PF_LOCKED.y, duration: 0.35, ease: 'power2.out' })
        .to(pf.rotation, { y: 0, duration: 0.45, ease: 'back.out(2)' });
    });
  }

  /** Bezug: Paddel umlegen, Druck auf 9 bar, zwei Strahlen füllen die Tasse (≈ 6 s). */
  brew(onProgress?: (p: number) => void) {
    return this.play((tl) => {
      tl.to(this.paddle.rotation, { y: -0.75, duration: 0.6, ease: 'back.out(1.4)' })
        .to(this.state, { bar: 3, duration: 0.8, ease: 'power1.in' }, 0.3)
        .to(this.state, { bar: 9, duration: 1.0, ease: 'power2.out' })
        .add(() => {
          for (const s of this.streams) s.visible = true;
          this.liquid.visible = true;
        }, 0.9)
        .to(this.state, { stream: 1, duration: 0.4 }, 1.0)
        .to(this.state, { fill: 1, duration: 5.2, ease: 'power1.inOut', onUpdate: () => onProgress?.(this.state.fill) }, 1.1)
        .to(this.state, { stream: 0, duration: 0.6, ease: 'power2.in' }, 5.9)
        .to(this.state, { bar: 0, duration: 1.4, ease: 'power2.inOut' }, 6.0)
        .to(this.paddle.rotation, { y: 0.55, duration: 0.6, ease: 'power2.inOut' }, 6.1)
        .to(this.state, { steamCup: 1, duration: 1.2 }, 6.2)
        .add(() => {
          for (const s of this.streams) s.visible = false;
        });
    });
  }

  reset() {
    this.ctx.revert();
    const s = this.state;
    s.bar = 0;
    s.beanLevel = 0;
    s.beanCap = 1;
    s.fill = 0;
    s.stream = 0;
    s.shake = 0;
    s.grinding = 0;
    s.steamCup = 0;
    s.steamWand = 0;
    this.powerLever.rotation.x = 0.9;
    this.paddle.rotation.y = 0.55;
    this.portafilter.position.copy(PF_LOCKED);
    this.portafilter.rotation.set(0, 0, 0);
    this.coffeeBed.visible = false;
    this.coffeeBed.scale.y = 0.001;
    this.liquid.visible = false;
    this.ledMat.emissiveIntensity = 0;
    this.ledMat.emissive.set('#ffb25c');
    this.grinderLedMat.emissiveIntensity = 0;
    this.workLightMat.emissiveIntensity = 0;
    this.workLight.intensity = 0;
    for (const st of this.streams) st.visible = false;
    this.updateBeans();
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.ctx.revert();
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('click', this.onClick);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          (mat as THREE.Material & { map?: THREE.Texture | null }).map?.dispose();
          mat.dispose();
        }
      }
    });
    for (const d of this.disposables) d.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }

  /* ================================ intern ================================ */

  private register(h: Hotspot, o: THREE.Object3D) {
    o.traverse((c) => {
      c.userData.hotspot = h;
    });
    if (!this.hotspots.has(h)) this.hotspots.set(h, o);
  }

  private play(build: (tl: gsap.core.Timeline) => void) {
    return new Promise<void>((resolve) => {
      this.ctx.add(() => {
        const tl = gsap.timeline({ onComplete: resolve });
        build(tl);
        // Reduzierte Bewegung: gleiche Zustände, aber nahezu ohne Animationsdauer.
        if (this.opts.reducedMotion) tl.timeScale(12);
      });
    });
  }

  private updateBeans() {
    const cap = Math.round(this.state.beanCap * BEANS);
    const filling = this.state.beanLevel;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < BEANS; i++) {
      const t = this.beanTargets[i] ?? p;
      // Jede Bohne fällt in ihrem eigenen Zeitfenster (untere zuerst).
      const k = THREE.MathUtils.clamp(filling * BEANS - i, 0, 6) / 6;
      if (i >= cap || k <= 0) {
        m.makeScale(0, 0, 0);
      } else {
        const s = this.beanStart[i] ?? t;
        p.lerpVectors(s, t, k * k);
        q.setFromEuler(this.beanRot[i] ?? new THREE.Euler());
        m.compose(p, q, one);
      }
      this.beans.setMatrixAt(i, m);
    }
    this.beans.instanceMatrix.needsUpdate = true;
  }

  private readonly onPointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.hovered = this.pick();
    this.canvas.style.cursor = this.hovered ? 'pointer' : '';
  };

  private readonly onPointerLeave = () => {
    this.pointer.set(0, 0);
    this.hovered = null;
    this.canvas.style.cursor = '';
  };

  private readonly onClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const h = this.pick();
    if (h) this.opts.onHotspot(h);
  };

  private pick(): Hotspot | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objs = [...this.hotspots.values()];
    const hit = this.raycaster.intersectObjects(objs, true)[0];
    return (hit?.object.userData.hotspot as Hotspot | undefined) ?? null;
  }

  private spawnPuff(origin: THREE.Vector3, spread: number, up: number) {
    const p = this.puffs.find((x) => x.life <= 0);
    if (!p) return;
    p.life = p.ttl = 1.4 + Math.random() * 0.8;
    p.sprite.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread));
    p.vel.set((Math.random() - 0.5) * 0.15, up * (0.5 + Math.random() * 0.4), (Math.random() - 0.5) * 0.1);
    p.grow = 0.3 + Math.random() * 0.4;
    p.sprite.scale.setScalar(0.15);
    p.sprite.visible = true;
  }

  private readonly frame = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.state;
    const calm = this.opts.reducedMotion;

    // Kamera: Bildausschnitt passt sich dem Seitenverhältnis an, sanfte Zeiger-Parallaxe
    const aspect = this.size.w / this.size.h;
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(2.45 / halfH, 3.9 / (halfH * aspect)) * 1.06;
    if (!calm) this.look.lerp(this.pointer, 0.04);
    const dir = new THREE.Vector3(0.36 + this.look.x * 0.12, 0.3 + this.look.y * 0.06, 1).normalize();
    this.camera.position.copy(this.target).addScaledVector(dir, dist);
    this.camera.lookAt(this.target);

    // Manometer mit leichtem Zittern unter Druck
    const jitter = s.bar > 2 && !calm ? Math.sin(t * 31) * 0.08 + Math.sin(t * 17) * 0.05 : 0;
    this.needle.rotation.z = BAR_TO_ANGLE(s.bar + jitter);

    // Mühle vibriert, Mehl rieselt
    this.grinderBody.position.x = GRINDER.x + (calm ? 0 : Math.sin(t * 90) * 0.006 * s.shake);
    this.grinderBody.position.z = GRINDER.z + (calm ? 0 : Math.cos(t * 77) * 0.004 * s.shake);
    const pos = this.grounds.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < this.groundsVel.length; i++) {
      const iy = i * 3 + 1;
      if ((arr[iy] ?? -99) < PF_AT_GRINDER.y) {
        if (s.grinding > 0.5 && Math.random() < 0.25) {
          arr[i * 3] = GRINDER.x + (Math.random() - 0.5) * 0.12;
          arr[iy] = 1.66;
          arr[i * 3 + 2] = GRINDER.z + 0.98 + (Math.random() - 0.5) * 0.1;
          this.groundsVel[i] = 0.2 + Math.random() * 0.3;
        } else {
          arr[iy] = -99;
        }
      } else {
        this.groundsVel[i] = (this.groundsVel[i] ?? 0) + 9.8 * dt * 0.4;
        arr[iy] = (arr[iy] ?? 0) - (this.groundsVel[i] ?? 0) * dt;
      }
    }
    pos.needsUpdate = true;

    // Strahlen: Länge bis zur Füllhöhe, leichtes Pendeln, zum Ende hin heller
    const surfaceY = CUP_POS.y + 0.09 + s.fill * CUP_INNER_H * 0.82;
    for (const [i, st] of this.streams.entries()) {
      const top = PF_LOCKED.y - 0.33;
      const len = Math.max(0.001, top - surfaceY);
      const w = s.stream * (0.9 + (calm ? 0 : Math.sin(t * 23 + i) * 0.1));
      st.scale.set(Math.max(w, 0.001), len * Math.min(1, s.stream * 1.6), Math.max(w, 0.001));
      st.position.x = PF_LOCKED.x + (i === 0 ? -0.11 : 0.11) + (calm ? 0 : Math.sin(t * 13 + i * 2) * 0.004);
    }
    const blond = THREE.MathUtils.smoothstep(s.fill, 0.65, 1);
    (this.streams[0]?.material as THREE.MeshPhysicalMaterial | undefined)?.color.setRGB(
      0.29 + blond * 0.28,
      0.14 + blond * 0.16,
      0.07 + blond * 0.08,
      THREE.SRGBColorSpace,
    );
    // Füllstand in der Tasse (Radius folgt der Innenwand)
    if (this.liquid.visible) {
      const h = s.fill * CUP_INNER_H * 0.82;
      this.liquid.position.y = 0.09 + h;
      const r = 0.19 + (0.12 * h) / 0.25;
      this.liquid.scale.setScalar(Math.min(r, 0.305));
      this.liquid.rotation.y += dt * 0.15 * s.stream;
    }

    // Dampf
    const wandTip = new THREE.Vector3(MACHINE_X + 1.62, 1.2, 2.22);
    if (!calm && s.steamWand > 0.2 && Math.random() < 0.5) this.spawnPuff(wandTip, 0.08, 0.6);
    if (!calm && s.steamCup > 0.2 && Math.random() < 0.08) {
      this.spawnPuff(new THREE.Vector3(CUP_POS.x, CUP_POS.y + 0.45, CUP_POS.z), 0.25, 0.25);
    }
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const k = 1 - p.life / p.ttl;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.scale.setScalar(0.15 + k * p.grow);
      (p.sprite.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * k) * 0.5;
      if (p.life <= 0) p.sprite.visible = false;
    }

    // Hinweis-Ring (zur Kamera ausgerichtet) und Hover-Hervorhebung
    const hintMat = this.hint.material as THREE.MeshBasicMaterial;
    const anchor = s.hint ? this.hotspots.get(s.hint) : undefined;
    if (anchor) {
      anchor.getWorldPosition(this.hint.position);
      if (s.hint === 'hopper') this.hint.position.y += 0.15;
      if (s.hint === 'paddle') this.hint.position.x += 0.35;
      this.hint.quaternion.copy(this.camera.quaternion);
      const pulse = calm ? 0.5 : (Math.sin(t * 3.2) + 1) / 2;
      const base = s.hint === 'hopper' ? 2.6 : 1.1;
      this.hint.scale.setScalar(base * (1 + pulse * 0.35) * (this.hovered === s.hint ? 1.15 : 1));
      hintMat.opacity = THREE.MathUtils.lerp(hintMat.opacity, 0.35 + pulse * 0.5, 0.2);
    } else {
      hintMat.opacity = THREE.MathUtils.lerp(hintMat.opacity, 0, 0.2);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
