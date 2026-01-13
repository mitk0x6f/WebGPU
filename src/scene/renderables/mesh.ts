// scene/renderables/mesh.ts

// TODO: Adjust size of buffers

import { mat4, quat } from "gl-matrix";

import { BindGroupIndex } from "../../core/bindgroup-indices";
import type { BindGroupLayouts } from "../../core/bindgroup-layouts";
import { Renderable } from "./renderable";

export interface SubMesh {
    start: number;
    count: number;
    materialIndex: number;
}

export class Mesh extends Renderable
{
    private _vertexBuffer!: GPUBuffer;
    private _indexBuffer!: GPUBuffer;
    private _indexCount = 0;
    private _modelMatrix = mat4.create();
    private _rotationQuat = quat.create();

    private _modelData = new Float32Array(20);

    private _modelBuffer!: GPUBuffer;
    private _modelBindGroup!: GPUBindGroup;

    public readonly type = 'mesh';
    public translucent: boolean = false;
    public materialBindGroups: GPUBindGroup[] = [];
    public subMeshes: SubMesh[] = [];
    public pipeline: GPURenderPipeline | null = null;

    get indexCount(): number
    {
        return this._indexCount;
    }

    constructor(
        device: GPUDevice,
        bindGroupLayout: BindGroupLayouts,
        vertexData: Float32Array,
        indexData: Uint16Array | Uint32Array,
        subMeshes: SubMesh[] = []
    )
    {
        super();

        this._modelBuffer = device.createBuffer({
            size: 80, // modelMatrix = 64, remaining 16 = ? scale ?
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this._modelBindGroup = device.createBindGroup({
            layout: bindGroupLayout.model,
            entries: [
                { binding: 0, resource: { buffer: this._modelBuffer } }
            ]
        });

        this._vertexBuffer = device.createBuffer({
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this._vertexBuffer.getMappedRange()).set(vertexData);
        this._vertexBuffer.unmap();

        // Calculate padded size (must be multiple of 4)
        const indexByteLength = indexData.byteLength;
        const paddedIndexByteLength = (indexByteLength + 3) & ~3;

        this._indexBuffer = device.createBuffer({
            size: paddedIndexByteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        if (indexData instanceof Uint16Array)
        {
            new Uint16Array(this._indexBuffer.getMappedRange(), 0, indexData.length).set(indexData);
        }
        else
        {
            new Uint32Array(this._indexBuffer.getMappedRange(), 0, indexData.length).set(indexData);
        }

        this._indexBuffer.unmap();

        this._indexCount = indexData.length;
        this.subMeshes = subMeshes;
    }

    updateModelMatrix(device: GPUDevice): void
    {
        // Much slower:
        // mat4.identity(this._modelMatrix);
        // mat4.translate(this._modelMatrix, this._modelMatrix, this.position);
        // mat4.rotateX(this._modelMatrix, this._modelMatrix, this.rotation[0]);
        // mat4.rotateY(this._modelMatrix, this._modelMatrix, this.rotation[1]);
        // mat4.rotateZ(this._modelMatrix, this._modelMatrix, this.rotation[2]);
        // mat4.scale(this._modelMatrix, this._modelMatrix, this.scale);

        // Much faster:
        quat.fromEuler(this._rotationQuat, this.rotation[0], this.rotation[1], this.rotation[2]);
        mat4.fromRotationTranslationScale(this._modelMatrix, this._rotationQuat, this.position, this.scale);

        // Copy data to buffer
        this._modelData.set(this._modelMatrix, 0);
        this._modelData.set(this.scale, 16);

        // Write to GPU buffer
        // Could be used without .buffer, but this way is safer
        device.queue.writeBuffer(this._modelBuffer, 0, this._modelData.buffer);
    }

    bind(pass: GPURenderPassEncoder): void
    {
        pass.setVertexBuffer(0, this._vertexBuffer);

        // Determine index format based on buffer size and count
        // If size / count == 4, it's uint32, otherwise uint16
        pass.setIndexBuffer(this._indexBuffer, (this._indexBuffer.size / this._indexCount) === 4 ? 'uint32' : 'uint16');

        pass.setBindGroup(BindGroupIndex.Model, this._modelBindGroup);
    }

    destroy(): void
    {
        this._vertexBuffer.destroy();
        this._indexBuffer.destroy();
        this._modelBuffer.destroy();
    }

    setPipeline(pipeline: GPURenderPipeline): void
    {
        this.pipeline = pipeline;
    }
}