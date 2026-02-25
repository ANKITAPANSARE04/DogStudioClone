import React, { useEffect, useRef, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
  useAnimations,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";

const Dog = () => {
  const model = useGLTF("/models/dog.drc.glb");
  const { camera, gl } = useThree();

  // Reference for mouse coordinates
  const mouse = useRef({ x: 0, y: 0 });

  gsap.registerPlugin(useGSAP());
  gsap.registerPlugin(ScrollTrigger);

  // Initial Setup
  useEffect(() => {
    camera.position.set(0, 0, 0.55);
    gl.toneMapping = THREE.ReinhardToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;

    // Track mouse movement
    const handleMouseMove = (event) => {
      // Normalize mouse coordinates to -1 to +1
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [camera, gl]);

  // --- NEW: Cursor Following Logic ---
  useFrame((state, delta) => {
    // We target a very small offset (0.05) to keep the effect subtle
    const targetX = mouse.current.x * 0.05;
    const targetY = mouse.current.y * 0.05;

    // Smoothly interpolate (lerp) the camera position
    // This adds the movement ON TOP of the base position
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
    
    // Always ensure the camera looks toward the center/model
    camera.lookAt(0, 0, 0);
  });

  const { actions } = useAnimations(model.animations, model.scene);

  useEffect(() => {
    if (actions["Take 001"]) actions["Take 001"].play();
  }, [actions]);

  // Texture Loading
  const textures = useTexture([
    "/dog_normals.jpg",
    "/matcap/mat-2.png",
    "/branches_diffuse.jpeg",
    "branches_normals.jpeg",
    "/matcap/mat-1.png",
    "/matcap/mat-3.png",
    "/matcap/mat-4.png",
    "/matcap/mat-5.png",
    "/matcap/mat-6.png",
    "/matcap/mat-7.png",
    "/matcap/mat-8.png",
    "/matcap/mat-9.png",
    "/matcap/mat-10.png",
    "/matcap/mat-11.png",
    "/matcap/mat-12.png",
    "/matcap/mat-13.png",
    "/matcap/mat-14.png",
    "/matcap/mat-15.png",
    "/matcap/mat-16.png",
    "/matcap/mat-17.png",
    "/matcap/mat-18.png",
    "/matcap/mat-19.png",
    "/matcap/mat-20.png",
  ]);

  const [
    normalMap, sampleMatCap, branchMap, branchNormalMap,
    mat1, mat3, mat4, mat5, mat6, mat7, mat8, mat9, mat10,
    mat11, mat12, mat13, mat14, mat15, mat16, mat17, mat18, mat19, mat20
  ] = textures.map(t => {
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

  const mat2 = sampleMatCap; // mat-2 is loaded twice in your original code, mapping it here.

  const materialUniforms = useRef({
    uMatcap1: { value: mat19 },
    uMatcap2: { value: mat2 },
    uProgress: { value: 1.0 },
  });

  const dogMaterial = useMemo(() => new THREE.MeshMatcapMaterial({
    normalMap: normalMap,
    matcap: sampleMatCap,
  }), [normalMap, sampleMatCap]);

  const branchMaterial = useMemo(() => new THREE.MeshMatcapMaterial({
    normalMap: branchNormalMap,
    map: branchMap,
  }), [branchNormalMap, branchMap]);

  dogMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uMatcapTexture1 = materialUniforms.current.uMatcap1;
    shader.uniforms.uMatcapTexture2 = materialUniforms.current.uMatcap2;
    shader.uniforms.uProgress = materialUniforms.current.uProgress;

    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `uniform sampler2D uMatcapTexture1;
       uniform sampler2D uMatcapTexture2;
       uniform float uProgress;
       void main() {`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 matcapColor = texture2D( matcap, uv );",
      `vec4 matcapColor1 = texture2D( uMatcapTexture1, uv );
       vec4 matcapColor2 = texture2D( uMatcapTexture2, uv );
       float transitionFactor = 0.2;
       float progress = smoothstep(uProgress - transitionFactor, uProgress, (vViewPosition.x + vViewPosition.y) * 0.5 + 0.5);
       vec4 matcapColor = mix(matcapColor2, matcapColor1, progress);`
    );
  };

  model.scene.traverse((child) => {
    if (child.isMesh) {
      child.material = child.name.includes("DOGSTUDIO") ? dogMaterial : branchMaterial;
    }
  });

  // GSAP Scroll Animation
  const dogModelRef = useRef(model);
  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#s1",
        endTrigger: "#s4",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
    tl.to(dogModelRef.current.scene.position, { z: "-=0.75", y: "+=0.1" })
      .to(dogModelRef.current.scene.rotation, { x: `+=${Math.PI / 20}` })
      .to(dogModelRef.current.scene.rotation, { y: `-=${Math.PI}` }, "third")
      .to(dogModelRef.current.scene.position, { x: `-=0.4`, y: "-=0.1", z: "+=0.7" }, "third");
  }, []);

  // Matcap Transition Animation Logic
  useEffect(() => {
    const handleTransition = (targetMatcap) => {
      materialUniforms.current.uMatcap1.value = targetMatcap;
      gsap.to(materialUniforms.current.uProgress, {
        value: 0.0,
        duration: 0.3,
        onComplete: () => {
          materialUniforms.current.uMatcap2.value = materialUniforms.current.uMatcap1.value;
          materialUniforms.current.uProgress.value = 1.0;
        }
      });
    };

    const config = [
      { id: "tomorrowland", mat: mat19 },
      { id: "navy-pier", mat: mat8 },
      { id: "msi-chicago", mat: mat9 },
      { id: "phone", mat: mat12 },
      { id: "kikk", mat: mat10 },
      { id: "kennedy", mat: mat8 },
      { id: "opera", mat: mat13 },
    ];

    config.forEach(item => {
      const el = document.querySelector(`.title[img-title="${item.id}"]`);
      if (el) el.addEventListener("mouseenter", () => handleTransition(item.mat));
    });

    const container = document.querySelector(`.titles`);
    if (container) container.addEventListener("mouseleave", () => handleTransition(mat2));

    return () => {
        // Cleanup listeners if necessary
    };
  }, [mat2, mat8, mat9, mat10, mat12, mat13, mat19]);

  return (
    <>
      <primitive
        object={model.scene}
        position={[0.2, -0.55, 0]}
        rotation={[0, Math.PI / 6, 0]}
      />
      <directionalLight position={[0, 5, 5]} intensity={10} />
    </>
  );
};

export default Dog; 




 