// rendering/shader-manager.ts

export class ShaderManager
{
    private static _cache: Map<string, string> = new Map();

    // Automatically includes all WGSL files under ../shaders/ at build time
    private static _shaderModules = import.meta.glob('../shaders/**/*.wgsl', {
        query: '?raw',
        import: 'default'
    });

    private static async _loadShaderCode(url: string): Promise<string>
    {
        if (url in this._shaderModules)
        {
            const loader = this._shaderModules[url];

            const code = await loader();

            return code as string;
        }

        // Optional: fallback for runtime fetch (e.g., legacy /public shaders)
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load shader: ${url}`);

        return await res.text();
    }

    static async load(path: string): Promise<string>
    {
        if (this._cache.has(path)) return this._cache.get(path)!;

        const code = await this._loadShaderCode(path);

        this._cache.set(path, code);

        return code;
    }

    static clearCache()
    {
        this._cache.clear();
    }
}