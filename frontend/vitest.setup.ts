import '@testing-library/jest-dom';

// Mock WebGL / Three.js canvas contexts in jsdom
HTMLCanvasElement.prototype.getContext = function (contextType: string) {
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    return {
      getExtension: () => null,
      getParameter: () => '',
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      enable: () => {},
      disable: () => {},
    };
  }
  return null;
} as any;
