// Dynamic Weather System (Break the Skyline)
// Manages smooth, gradual transitions of scene lighting, sky colors, fog densities,
// and precipitation intensities during active flight sessions.

import * as THREE from 'three';

export class WeatherTransitioner {
  constructor(scene, sunLight, ambientLight, renderer, rainParticles, snowParticles) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.ambientLight = ambientLight;
    this.renderer = renderer;
    this.rainParticles = rainParticles; // THREE.Points
    this.snowParticles = snowParticles; // THREE.Points

    this.currentWeather = null;
    this.targetWeather = null;
    this.transitionTime = 0;
    this.transitionDuration = 5.0; // 5 seconds gradual transition
    this.isTransitioning = false;

    // Cache initial target values
    this.startValues = {
      skyColor: new THREE.Color(),
      fogDensity: 0,
      lightColor: new THREE.Color(),
      lightIntensity: 1.0,
      rainOpacity: 0.0,
      snowOpacity: 0.0
    };
  }

  // Begin a gradual transition to a new weather preset
  startTransition(currentPreset, targetPreset) {
    if (!targetPreset) return;
    
    this.currentWeather = { ...currentPreset };
    this.targetWeather = { ...targetPreset };
    this.transitionTime = 0;
    this.isTransitioning = true;

    // Snapshot current active values to interpolate from
    if (this.scene.fog) {
      this.startValues.skyColor.copy(this.scene.fog.color);
      this.startValues.fogDensity = this.scene.fog.density;
    } else {
      this.startValues.skyColor.set(currentPreset.skyColor || '#bae6fd');
      this.startValues.fogDensity = currentPreset.fogDensity || 0.0003;
    }

    if (this.sunLight) {
      this.startValues.lightColor.copy(this.sunLight.color);
      this.startValues.lightIntensity = this.sunLight.intensity;
    } else {
      this.startValues.lightColor.set(currentPreset.lightColor || '#ffffff');
      this.startValues.lightIntensity = currentPreset.lightIntensity || 1.3;
    }

    // Capture particle opacities
    if (this.rainParticles && this.rainParticles.material) {
      this.startValues.rainOpacity = this.rainParticles.material.opacity;
    }
    if (this.snowParticles && this.snowParticles.material) {
      this.startValues.snowOpacity = this.snowParticles.material.opacity;
    }
  }

  // Called inside the Three.js render loop (mainLoop)
  update(dt, physics) {
    if (!this.isTransitioning || !this.targetWeather) return;

    this.transitionTime += dt;
    const progress = Math.min(1.0, this.transitionTime / this.transitionDuration);

    // Easing function (easeInOutCubic)
    const t = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    // 1. INTERPOLATE SKY & FOG COLORS
    const currentSky = this.startValues.skyColor;
    const targetSky = new THREE.Color(this.targetWeather.skyColor);
    const blendSky = currentSky.clone().lerp(targetSky, t);

    if (this.scene.fog) {
      this.scene.fog.color.copy(blendSky);
      
      const targetDensity = this.targetWeather.fogDensity;
      this.scene.fog.density = this.startValues.fogDensity + (targetDensity - this.startValues.fogDensity) * t;
    }

    if (this.renderer) {
      this.renderer.setClearColor(blendSky);
    }

    // 2. INTERPOLATE SUNLIGHT & LIGHTS
    if (this.sunLight) {
      const sunStartCol = this.startValues.lightColor;
      const sunTargetCol = new THREE.Color(this.targetWeather.lightColor);
      this.sunLight.color.copy(sunStartCol.clone().lerp(sunTargetCol, t));

      const targetIntensity = this.targetWeather.lightIntensity;
      this.sunLight.intensity = this.startValues.lightIntensity + (targetIntensity - this.startValues.lightIntensity) * t;
    }

    if (this.ambientLight) {
      const targetIntensity = this.targetWeather.lightIntensity * 0.4;
      const startAmbientInt = this.startValues.lightIntensity * 0.4;
      this.ambientLight.intensity = startAmbientInt + (targetIntensity - startAmbientInt) * t;
    }

    // 3. INTERPOLATE PRECIPITATION SYSTEMS (RAIN/SNOW OPACITIES)
    const targetRainOpacity = this.targetWeather.hasRain ? 0.8 : 0.0;
    if (this.rainParticles && this.rainParticles.material) {
      this.rainParticles.material.opacity = this.startValues.rainOpacity + (targetRainOpacity - this.startValues.rainOpacity) * t;
      // Manage visibility state
      this.rainParticles.visible = this.rainParticles.material.opacity > 0.01;
    }

    const targetSnowOpacity = this.targetWeather.id === 'snow' ? 0.75 : 0.0;
    if (this.snowParticles && this.snowParticles.material) {
      this.snowParticles.material.opacity = this.startValues.snowOpacity + (targetSnowOpacity - this.startValues.snowOpacity) * t;
      this.snowParticles.visible = this.snowParticles.material.opacity > 0.01;
    }

    // 4. WEATHER TURBULENCE/WIND PHYSICS OVERRIDES
    if (physics) {
      // Wind speed transitions gradually
      const startWind = this.currentWeather.windSpeed || 2;
      const targetWind = this.targetWeather.windSpeed;
      physics.windSpeedValue = startWind + (targetWind - startWind) * t;
    }

    // Terminate transition once we hit 1.0
    if (progress >= 1.0) {
      this.isTransitioning = false;
      this.currentWeather = { ...this.targetWeather };
    }
  }
}
