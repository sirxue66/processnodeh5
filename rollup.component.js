import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
    input: 'src/process-node-diagram.js',
	output: [
        {
            sourcemap: false,
            format: 'es',
            file: 'build/ProcessNodeDiagram.es.js'
        },
        {
            sourcemap: false,
            format: 'umd',
            file: 'build/ProcessNodeDiagram.umd.js',
            name: 'ProcessNodeDiagram'
        }
    ],
    plugins: [
		svelte({
			compilerOptions: {
				customElement: true
			}
		}),
		commonjs(),
        resolve()
	]
}