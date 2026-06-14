# Break the Sky Flight Simulator

Break the Sky is an immersive, high-performance in-browser flight simulation engine utilizing advanced WebGL/Three.js rendering, custom aerodynamic physics, procedural audio synthesis, dynamic weather, and flight logging.

## Core Features
- **Aero Engine & Physics**: Authentic thrust, lift, drag, gravity, surface friction, and stall aerodynamics.
- **Flight Logbook**: Automatic landing/crash scoring and flight metrics stored in local storage.
- **Procedural Synthesizers**: Realistic in-browser piston engine and jet sound synthesis using Web Audio API.
- **PWA & Mobile Ready**: Full offline capability, custom application manifest, responsive HUD layouts, and touch-optimized controls designed for iPhone and mobile screens.

---

## Developer Diagnostics

To ensure the high-fidelity mechanics, missions, and controllers remain perfectly integrated and responsive before publishing, a diagnostic playability audit tool is configured.

### Running the Playability Audit

To verify aircraft specs, missions, keyboard listeners, mobile input references, and render loops, execute:

```bash
npm run playability-check
```

### Explaining the Audit Indicators

The automated audit prints a colorful systems analysis using three indicators:

- **`[PASS]`**: Indicates that the checked system fully adheres to the required design standards. Inputs are mapped, values are in safe ranges, and loop handles are completely intact.
- **`[WARN]`**: Highlights items that aren't critical showstoppers, but demand attention — for example, unpowered gliders configured with zero horsepower (an fully expected design restriction!) or minor system configs.
- **`[FAIL]`**: Signals a critical flight playability bug. This must be resolved immediately before uploading or packaging (e.g., disconnected pointer paths, broken flight threads, or severe drag ranges).

---

## Recommended Manual Browser Smoke Test Checklist

1. Execute `npm run dev` to boot the workspace engine on local servers.
2. Select **FREE FLIGHT** from the main launcher interface.
3. Choose the **Skyhopper Prop Plane** or any active aircraft.
4. Scale the virtual throttle slider up (or hold down the key `W` on desktop).
5. Ensure the airspeed indicator successfully rises from `0 KTS` on the HUD dial.
6. Pull down on the flight stick or trigger `ArrowDown` to rotate and climb.
7. Confirm that yaw buttons, retracting landing gear, and custom camera views function as expected.
