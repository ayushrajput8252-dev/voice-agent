'use client';

// ============================================================
// Live2D Avatar — PixiJS + pixi-live2d-display Kei Model
// ============================================================
// Renders the Kei Live2D model on a canvas with:
// - Mouth animation driven by mouthValue prop (0–1)
// - Automatic eye blinking
// - Physics simulation (hair, accessories)
// - State-aware idle animations

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AppState } from '@/types';
import { AlertTriangle } from 'lucide-react';

// We need to register PIXI to the window for pixi-live2d-display
// PIXI must be on window BEFORE importing pixi-live2d-display
// Inject script manually to ensure it loads before importing pixi-live2d-display
const loadCubismCore = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if ((window as any).Live2DCubismCore) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/live2d/live2dcubismcore.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cubism Core'));
    document.head.appendChild(script);
  });
};

const setupPixi = async () => {
  if (typeof window === 'undefined') return null;

  // Step 1: Ensure Cubism 4 Core is fully loaded before anything else
  await loadCubismCore();

  // Step 2: Import PIXI and register it globally
  const PIXI = await import('pixi.js');
  (window as any).PIXI = PIXI;

  // Step 3: Import only Cubism 4 support from pixi-live2d-display
  const { Live2DModel } = await import('pixi-live2d-display/cubism4');

  return { PIXI, Live2DModel };
};

interface Live2DAvatarProps {
  mouthValue: number;      // 0–1 for lip sync
  state: AppState;
  isSpeaking: boolean;
}

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({
  mouthValue,
  state,
  isSpeaking,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const blinkIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mouthValueRef = useRef(0);
  const isSpeakingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    mouthValueRef.current = mouthValue;
  }, [mouthValue]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // ---- Eye Blink System ----
  const startBlinking = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearTimeout(blinkIntervalRef.current);
    }

    const blink = () => {
      const model = modelRef.current;
      if (!model?.internalModel?.coreModel) return;

      const core = model.internalModel.coreModel;

      // Close eyes
      try {
        core.setParameterValueById('ParamEyeLOpen', 0);
        core.setParameterValueById('ParamEyeROpen', 0);
      } catch {
        // Parameters might not exist
      }

      // Open eyes after blink duration
      setTimeout(() => {
        if (!model?.internalModel?.coreModel) return;
        try {
          core.setParameterValueById('ParamEyeLOpen', 1);
          core.setParameterValueById('ParamEyeROpen', 1);
        } catch {
          // Parameters might not exist
        }
      }, 100 + Math.random() * 50);

      // Schedule next blink
      const nextBlink = 2000 + Math.random() * 4000;
      blinkIntervalRef.current = setTimeout(blink, nextBlink);
    };

    // Start first blink after a random delay
    blinkIntervalRef.current = setTimeout(blink, 1000 + Math.random() * 2000);
  }, []);

  // ---- Animation Frame Loop ----
  const startAnimationLoop = useCallback(() => {
    const tick = () => {
      const model = modelRef.current;
      if (!model?.internalModel?.coreModel) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const core = model.internalModel.coreModel;

      try {
        // Set mouth parameter from the analyzed TTS value
        core.setParameterValueById('ParamMouthOpenY', mouthValueRef.current);

        // Add subtle head movement during idle
        if (!isSpeakingRef.current) {
          const t = Date.now() / 3000;
          const headX = Math.sin(t) * 3;
          const headY = Math.sin(t * 0.7) * 2;
          try {
            core.setParameterValueById('ParamAngleX', headX);
            core.setParameterValueById('ParamAngleY', headY);
          } catch {
            // Params might not exist
          }
        } else {
          // Subtle head movement while speaking
          const t = Date.now() / 2000;
          const headX = Math.sin(t * 1.2) * 5;
          const headY = Math.sin(t * 0.8) * 3 + 2;
          try {
            core.setParameterValueById('ParamAngleX', headX);
            core.setParameterValueById('ParamAngleY', headY);
          } catch {
            // Params might not exist
          }
        }

        // Subtle body sway
        const bodyT = Date.now() / 5000;
        try {
          core.setParameterValueById('ParamBodyAngleX', Math.sin(bodyT) * 2);
        } catch {
          // Param might not exist
        }
      } catch {
        // Core model might not be ready
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // ---- Initialize PixiJS + Live2D ----
  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      if (!containerRef.current) return;

      try {
        const modules = await setupPixi();
        if (!modules || destroyed) return;

        const { PIXI, Live2DModel } = modules;

        // Create PixiJS application
        const app = new PIXI.Application({
          backgroundAlpha: 0,
          resizeTo: containerRef.current,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
        });

        if (destroyed) {
          app.destroy(true);
          return;
        }

        // Append canvas to container
        containerRef.current.appendChild(app.view as HTMLCanvasElement);
        appRef.current = app;

        // Load the Live2D model
        const model = await Live2DModel.from(
          '/live2d/kei/kei_vowels_pro.model3.json',
          { autoInteract: false }
        );

        if (destroyed) {
          app.destroy(true);
          return;
        }

        modelRef.current = model;

        // Scale and position the model to fit container
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        // Calculate scale to fit
        const modelWidth = model.width;
        const modelHeight = model.height;
        const scaleX = containerWidth / modelWidth;
        const scaleY = containerHeight / modelHeight;
        const scale = Math.min(scaleX, scaleY) * 0.85;

        model.scale.set(scale);
        model.anchor.set(0.5, 0.5);
        model.x = containerWidth / 2;
        model.y = containerHeight / 2;

        app.stage.addChild(model as any);

        // Log available parameters for debugging
        try {
          const paramIds = (model.internalModel.coreModel as any)._parameterIds;
          console.log('[Live2D] Available parameters:', paramIds);
        } catch {
          console.log('[Live2D] Could not read parameter IDs');
        }

        // Start animation systems
        startBlinking();
        startAnimationLoop();

        setIsLoaded(true);
        setLoadError(null);

        console.log('[Live2D] Kei model loaded successfully');
      } catch (error) {
        console.error('[Live2D] Failed to load model:', error);
        if (!destroyed) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load Live2D model');
        }
      }
    };

    init();

    // Cleanup
    return () => {
      destroyed = true;

      if (blinkIntervalRef.current) {
        clearTimeout(blinkIntervalRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: true, baseTexture: true });
        } catch {
          // Might already be destroyed
        }
        appRef.current = null;
      }
      modelRef.current = null;
    };
  }, [startBlinking, startAnimationLoop]);

  // ---- Handle container resize ----
  useEffect(() => {
    if (!containerRef.current || !modelRef.current || !appRef.current) return;

    const observer = new ResizeObserver(() => {
      const container = containerRef.current;
      const model = modelRef.current;
      const app = appRef.current;

      if (!container || !model || !app) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      app.renderer.resize(containerWidth, containerHeight);

      const modelWidth = model.width / model.scale.x;
      const modelHeight = model.height / model.scale.y;
      const scaleX = containerWidth / modelWidth;
      const scaleY = containerHeight / modelHeight;
      const scale = Math.min(scaleX, scaleY) * 0.85;

      model.scale.set(scale);
      model.x = containerWidth / 2;
      model.y = containerHeight / 2;
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isLoaded]);

  return (
    <div className="w-full h-full relative flex items-center justify-center" ref={containerRef} style={{ pointerEvents: 'none' }}>
      {/* Loading state */}
      {!isLoaded && !loadError && (
        <div className="absolute flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-500">Loading Live2D Model...</span>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute flex flex-col items-center justify-center gap-2 text-red-500">
          <AlertTriangle size={24} />
          <span className="text-sm font-medium">Failed to load avatar</span>
          <button
            className="px-3 py-1 bg-red-100 rounded hover:bg-red-200 transition-colors text-xs"
            onClick={() => {
              setLoadError(null);
              setIsLoaded(false);
              window.location.reload();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Speaking indicator */}
      {isLoaded && isSpeaking && (
        <div className="live2d-speaking-indicator">
          <span className="live2d-speaking-dot" />
          <span className="live2d-speaking-dot" />
          <span className="live2d-speaking-dot" />
        </div>
      )}
    </div>
  );
};
