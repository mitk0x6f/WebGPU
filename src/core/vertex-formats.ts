// core/vertex-formats.ts


export const vertexFormatPosition: GPUVertexBufferLayout = {
    arrayStride: 3 * 4, // 3 pos
    attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' }  // position
    ],
};

export const vertexFormatPositionUV: GPUVertexBufferLayout = {
    arrayStride: 5 * 4, // 3 pos + 2 uv
    attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
        { shaderLocation: 1, offset: 3 * 4, format: 'float32x2' } // uv
    ],
};

export const vertexFormatPositionNormalUV: GPUVertexBufferLayout = {
    arrayStride: 8 * 4, // 3 pos + 3 normal + 2 uv = 8 floats * 4 bytes
    attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
        { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' }, // normal
        { shaderLocation: 2, offset: 6 * 4, format: 'float32x2' } // uv
    ],
};