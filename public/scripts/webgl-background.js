import * as THREE from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);

const bgScene = new THREE.Scene();
const mainScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

const rtParams = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
const rtBackground = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtParams);
const rtBlurA = new THREE.WebGLRenderTarget(window.innerWidth/2, window.innerHeight/2, rtParams);
const rtBlurB = new THREE.WebGLRenderTarget(window.innerWidth/2, window.innerHeight/2, rtParams);

const bgGroup = new THREE.Group();
bgScene.add(bgGroup);
const orbGeometry = new THREE.SphereGeometry(1, 32, 32);

for(let i = 0; i < 6; i++) {
    const colors = ['#2997ff', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    const orb = new THREE.Mesh(orbGeometry, new THREE.MeshBasicMaterial({
        color: colors[i % colors.length], transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
    }));
    orb.position.set((Math.random()-0.5)*12, (Math.random()-0.5)*8, (Math.random()-0.5)*6-5);
    orb.scale.setScalar(1 + Math.random()*2.5);
    orb.userData = { speed: Math.random()*0.015+0.005, offset: Math.random()*100, axis: Math.random()>0.5?'x':'y' };
    bgGroup.add(orb);
}

const glassVertexShader = `
    varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewPosition;
    void main() {
        vUv = uv; vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const glassFragmentShader = `
    uniform sampler2D uBlurTexture; uniform vec2 uResolution; uniform float uTime;
    uniform float uRefractPower; uniform float uDispersion;
    varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewPosition;
    float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }
    void main() {
        vec2 screenUV = gl_FragCoord.xy / uResolution;
        vec2 offset = vNormal.xy * uRefractPower;
        float r = texture2D(uBlurTexture, screenUV + offset * (1.0 + uDispersion)).r;
        float g = texture2D(uBlurTexture, screenUV + offset * 1.0).g;
        float b = texture2D(uBlurTexture, screenUV + offset * (1.0 - uDispersion)).b;
        vec3 color = vec3(r, g, b);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
        color += vec3(1.0) * fresnel * 0.35;
        float noise = (rand(screenUV * uTime) - 0.5) * 0.04;
        color += noise;
        gl_FragColor = vec4(color, 1.0);
    }
`;

const glassMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uBlurTexture: { value: null },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 }, uRefractPower: { value: 0.18 }, uDispersion: { value: 0.025 }
    },
    vertexShader: glassVertexShader, fragmentShader: glassFragmentShader
});

const geometry = new THREE.IcosahedronGeometry(2, 80);
const originalPositions = geometry.attributes.position.clone();
const sphere = new THREE.Mesh(geometry, glassMaterial);
mainScene.add(sphere);

const blurVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const blurFragment = `
    uniform sampler2D tDiffuse; uniform vec2 uResolution; uniform vec2 uDirection; varying vec2 vUv;
    void main() {
        vec4 color = vec4(0.0); vec2 off = vec2(1.5) * uDirection;
        color += texture2D(tDiffuse, vUv) * 0.2;
        color += texture2D(tDiffuse, vUv + (off / uResolution)) * 0.3;
        color += texture2D(tDiffuse, vUv - (off / uResolution)) * 0.3;
        color += texture2D(tDiffuse, vUv + (off * 2.0 / uResolution)) * 0.1;
        color += texture2D(tDiffuse, vUv - (off * 2.0 / uResolution)) * 0.1;
        gl_FragColor = color;
    }
`;

const blurMaterial = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(window.innerWidth/2, window.innerHeight/2) },
        uDirection: { value: new THREE.Vector2(1, 0) }
    },
    vertexShader: blurVertex, fragmentShader: blurFragment
});

const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postScene = new THREE.Scene();
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial));

const clock = new THREE.Clock();
const simplex = new SimplexNoise();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    
    bgGroup.children.forEach(mesh => {
        if (mesh.userData.axis === 'x') {
            mesh.position.x = Math.sin(time * mesh.userData.speed + mesh.userData.offset) * 7;
            mesh.position.y = Math.cos(time * mesh.userData.speed * 0.7 + mesh.userData.offset) * 4;
        } else {
            mesh.position.y = Math.sin(time * mesh.userData.speed + mesh.userData.offset) * 5;
            mesh.position.x = Math.cos(time * mesh.userData.speed * 0.8 + mesh.userData.offset) * 6;
        }
    });
    
    const posAttr = geometry.attributes.position;
    for(let i = 0; i < posAttr.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(originalPositions, i);
        const noise = simplex.noise4d(v.x*0.5, v.y*0.5, v.z*0.5, time*0.3);
        v.multiplyScalar(1 + noise * 0.25);
        posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;
    sphere.rotation.y = time * 0.08;
    sphere.rotation.x = Math.sin(time * 0.2) * 0.1;
    
    renderer.setRenderTarget(rtBackground); renderer.clear(); renderer.render(bgScene, camera);
    blurMaterial.uniforms.tDiffuse.value = rtBackground.texture;
    blurMaterial.uniforms.uDirection.value.set(2.5, 0);
    renderer.setRenderTarget(rtBlurA); renderer.clear(); renderer.render(postScene, orthoCamera);
    blurMaterial.uniforms.tDiffuse.value = rtBlurA.texture;
    blurMaterial.uniforms.uDirection.value.set(0, 2.5);
    renderer.setRenderTarget(rtBlurB); renderer.clear(); renderer.render(postScene, orthoCamera);
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(bgScene, camera);
    glassMaterial.uniforms.uBlurTexture.value = rtBlurB.texture;
    glassMaterial.uniforms.uTime.value = time;
    renderer.render(mainScene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    glassMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

animate();
