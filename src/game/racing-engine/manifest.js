/**
 * RevSector 3D - Asset Registry & Binary Loader
 * Resolves 3D track components, vehicle meshes, procedural audio buffers, and FX textures.
 * Developed by Kaushal.
 */

const ASSET_REGISTRY = {
  'racing.decoration-empty':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/decoration-empty.glb',
  'racing.decoration-forest':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/decoration-forest.glb',
  'racing.decoration-tents':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/decoration-tents.glb',
  'racing.engine':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/audio/engine.ogg',
  'racing.impact':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/audio/impact.ogg',
  'racing.skid':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/audio/skid.ogg',
  'racing.smoke':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/sprites/smoke.png',
  'racing.track-bump':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/track-bump.glb',
  'racing.track-corner':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/track-corner.glb',
  'racing.track-finish':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/track-finish.glb',
  'racing.track-straight':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/track-straight.glb',
  'racing.vehicle-truck-green':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/vehicle-truck-green.glb',
  'racing.vehicle-truck-purple':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/vehicle-truck-purple.glb',
  'racing.vehicle-truck-red':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/vehicle-truck-red.glb',
  'racing.vehicle-truck-yellow':
    'https://cdn.jsdelivr.net/gh/pixijs/pixi-asset-storage@e73783699c4953aee0453b5ca12506f6fa515f8d/kenney/starter-kit-racing/vehicle-truck-yellow.glb',
};

export const getAssetUrl = (name) => ASSET_REGISTRY[name];

export const models = {
  racing: {
    'decoration-empty': ASSET_REGISTRY['racing.decoration-empty'],
    'decoration-forest': ASSET_REGISTRY['racing.decoration-forest'],
    'decoration-tents': ASSET_REGISTRY['racing.decoration-tents'],
    'track-bump': ASSET_REGISTRY['racing.track-bump'],
    'track-corner': ASSET_REGISTRY['racing.track-corner'],
    'track-finish': ASSET_REGISTRY['racing.track-finish'],
    'track-straight': ASSET_REGISTRY['racing.track-straight'],
    'vehicle-truck-green': ASSET_REGISTRY['racing.vehicle-truck-green'],
    'vehicle-truck-purple': ASSET_REGISTRY['racing.vehicle-truck-purple'],
    'vehicle-truck-red': ASSET_REGISTRY['racing.vehicle-truck-red'],
    'vehicle-truck-yellow': ASSET_REGISTRY['racing.vehicle-truck-yellow'],
  },
};

export { getAssetUrl as model, getAssetUrl as texture, getAssetUrl as sound };
