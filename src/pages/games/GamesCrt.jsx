import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as THREE from "three";
import AppText from "../../AppText.jsx";
import {
  CRT_TEXT,
  CRT_BROADCAST_TRANSLATIONS,
  CRT_DEPLOY_TRANSLATIONS,
} from "../../text/GamesText.jsx";
import {
  align_crt_bracket,
  create_crt_model,
  crt_screen_outline,
  dispose_crt_scene,
} from "./CrtModel.js";
import { pose_crt } from "./CrtMotion.js";
import { create_crt_screen } from "./CrtScreen.js";
import { defer_crt_initialization } from "./CrtInitialization.js";

const Mount = styled.div`
  position: relative;
  width: 100%;
  height: clamp(220px, 22vw, 280px);
  overflow: hidden;
  background: transparent;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    filter: drop-shadow(10px 16px 18px rgb(0 0 0 / 65%));
  }
`;
const Control = styled.button`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  clip-path: polygon(0 0, 0 0, 0 0);
  pointer-events: auto;
  cursor: pointer;
  &:focus-visible {
    outline: none;
    background: #80ffd040;
  }
`;
const Fallback = styled.p`
  margin: 0;
  padding: 1rem;
  color: #3d565b;
  font-size: 0.875rem;
`;

export default function GamesCrt({ screen_content } = {}) {
  const host = useRef(null),
    screen_control = useRef(null),
    content_ref = useRef(screen_content),
    extended = useRef(true);
  const [is_extended, set_extended] = useState(true);
  const [unavailable, set_unavailable] = useState(false);
  useEffect(() => {
    content_ref.current = screen_content;
    host.current?.dispatchEvent(new Event("crt-content"));
  }, [screen_content]);
  useEffect(() => {
    return defer_crt_initialization(() => {
      const element = host.current;
      const scene = new THREE.Scene();
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        // WebGL availability is known only after attempting mounted initialization.
        set_unavailable(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      element.prepend(renderer.domElement);
      renderer.domElement.setAttribute("aria-hidden", "true");
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
      camera.zoom = 1.4;
      camera.position.set(3.4, 2.2, 7.5);
      camera.lookAt(-0.4, 0.65, 0);
      scene.add(new THREE.HemisphereLight(0xf1ffff, 0x61717a, 2.6));
      const light = new THREE.DirectionalLight(0xffebd2, 3.3);
      light.position.set(-3, 5, 6);
      scene.add(light);
      const model = create_crt_model(scene);
      const display = create_crt_screen(model.screen_canvas, {
        static_flash: AppText.get(CRT_TEXT.husker_du),
        broadcast: {
          message: AppText.get(CRT_TEXT.broadcast),
          alert: AppText.get(CRT_TEXT.deploy),
          translations: Object.entries(CRT_BROADCAST_TRANSLATIONS).map(
            ([language, key]) => ({
              language,
              message: AppText.get(key),
              deploy: AppText.get(CRT_DEPLOY_TRANSLATIONS[language]),
              direction: language === "ar" ? "rtl" : "ltr",
            }),
          ),
        },
        on_ready: () => restart(),
        on_error: (error) =>
          console.warn("CRT screen content unavailable", error),
      });
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const pointer = { x: 0, y: 0 },
        target = { x: 0, y: 0 };
      let extension = 1,
        previous = 0,
        face_time = 0,
        screen_dt = 0,
        frame = null,
        visible = true;
      const render = (stamp = 0) => {
        const dt = Math.min((stamp - previous) / 1000 || 0, 0.05);
        previous = stamp;
        screen_dt += dt;
        const smoothing = motion.matches ? 1 : 1 - Math.exp(-dt * 5);
        pointer.x += (target.x - pointer.x) * smoothing;
        pointer.y += (target.y - pointer.y) * smoothing;
        extension += ((extended.current ? 1 : 0) - extension) * smoothing;
        // Keep the small display's dynamic texture at 24 fps.
        if (stamp - face_time > 1000 / 24 || motion.matches || stamp === 0) {
          pose_crt(model, stamp / 1000, pointer, extension, motion.matches);
          display.set_active(visible && !document.hidden && !motion.matches);
          display.set_content(content_ref.current);
          element.dataset.crtScreenMode = display.paint({
            dt: screen_dt,
            pointer,
            reduced_motion: motion.matches,
          });
          element.dataset.crtScreenSource = display.source;
          screen_dt = 0;
          model.texture.needsUpdate = true;
          renderer.render(scene, camera);
          if (screen_control.current) {
            screen_control.current.style.clipPath = crt_screen_outline(
              model.screen,
              camera,
            );
          }
          face_time = stamp;
        }
        frame = null;
        if (visible && !document.hidden && !motion.matches)
          frame = requestAnimationFrame(render);
      };
      const restart = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        previous = performance.now();
        display.set_active(visible && !document.hidden && !motion.matches);
        if (visible && !document.hidden) render(previous);
      };
      const resize = new ResizeObserver(() => {
        const { width, height } = element.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.position
          .set(3.4, 2.2, 7.5)
          .multiplyScalar(Math.max(1, 1.1 / camera.aspect));
        camera.lookAt(-0.4, 0.65, 0);
        camera.updateProjectionMatrix();
        align_crt_bracket(camera, model.bracket, width, height);
        restart();
      });
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        restart();
      });
      const follow = (event) => {
        target.x = (event.clientX / window.innerWidth) * 2 - 1;
        target.y = 1 - (event.clientY / window.innerHeight) * 2;
        if (motion.matches) restart();
      };
      resize.observe(element);
      intersection.observe(element);
      window.addEventListener("pointermove", follow, { passive: true });
      document.addEventListener("visibilitychange", restart);
      motion.addEventListener("change", restart);
      element.addEventListener("crt-pose", restart);
      element.addEventListener("crt-content", restart);
      render();
      return () => {
        if (frame !== null) cancelAnimationFrame(frame);
        resize.disconnect();
        intersection.disconnect();
        window.removeEventListener("pointermove", follow);
        document.removeEventListener("visibilitychange", restart);
        motion.removeEventListener("change", restart);
        element.removeEventListener("crt-pose", restart);
        element.removeEventListener("crt-content", restart);
        display.dispose();
        dispose_crt_scene(scene);
        renderer.dispose();
        renderer.domElement.remove();
      };
    });
  }, []);
  const toggle = () => {
    extended.current = !extended.current;
    set_extended(extended.current);
    host.current.dispatchEvent(new Event("crt-pose"));
  };
  return (
    <Mount ref={host} role="group" aria-label={AppText.get(CRT_TEXT.label)}>
      {unavailable ? (
        <Fallback>{AppText.get(CRT_TEXT.unavailable)}</Fallback>
      ) : (
        <Control
          ref={screen_control}
          type="button"
          onClick={toggle}
          aria-pressed={is_extended}
          aria-label={AppText.get(CRT_TEXT.toggle)}
          title={AppText.get(CRT_TEXT.toggle)}
        />
      )}
    </Mount>
  );
}
