export const rendererPreference =
  typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'webgl';
