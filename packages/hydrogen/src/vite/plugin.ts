import type {Plugin, ResolvedConfig} from 'vite';
import {
  setupHydrogenMiddleware,
  SUBREQUEST_PROFILER_EVENT_EMITTER_ENDPOINT,
} from './hydrogen-middleware.js';
import type {HydrogenPluginOptions} from './types.js';

// @ts-ignore -- Module outside of the rootDir
import type {OxygenApiOptions} from '~/mini-oxygen/vite/plugin.js';

export type {HydrogenPluginOptions};

/**
 * Enables Hydrogen utilities for local development
 * such as GraphiQL, Subrequest Profiler, etc.
 * It must be used in combination with the `oxygen` plugin and Hydrogen CLI.
 * @experimental
 */
export function hydrogen(pluginOptions: HydrogenPluginOptions = {}): Plugin[] {
  let apiOptions: HydrogenPluginOptions = {};
  const isRemixChildCompiler = (config: ResolvedConfig) =>
    !config.plugins?.some((plugin) => plugin.name === 'remix');

  return [
    {
      name: 'hydrogen:main',
      config() {
        return {
          ssr: {
            optimizeDeps: {
              // Add CJS dependencies that break code in workerd
              // with errors like "require/module/exports is not defined":
              include: [
                // React deps:
                'react',
                'react/jsx-runtime',
                'react/jsx-dev-runtime',
                'react-dom',
                'react-dom/server',
                // Remix deps:
                'set-cookie-parser',
                'cookie',
                // Hydrogen deps:
                'content-security-policy-builder',
              ],
            },
          },
        };
      },
      api: {
        registerPluginOptions(newOptions: HydrogenPluginOptions) {
          apiOptions = mergeOptions(apiOptions, newOptions);
        },
        getPluginOptions() {
          return mergeOptions(pluginOptions, apiOptions);
        },
      },
      configResolved(resolvedConfig) {
        // Pass the setup functions to the Oxygen runtime.
        const oxygenPlugin = resolvedConfig.plugins.find(
          (plugin) => plugin.name === 'oxygen:main',
        );

        oxygenPlugin?.api?.registerPluginOptions?.({
          shouldStartRuntime: () => !isRemixChildCompiler(resolvedConfig),
          services: {
            H2O_LOG_EVENT: SUBREQUEST_PROFILER_EVENT_EMITTER_ENDPOINT,
          },
          crossBoundarySetup: [
            /**
             * To avoid initial CSS flash during development,
             * most frameworks implement a way to gather critical CSS.
             * Remix does this by calling a global function that their
             * Vite plugin creates in the Node.js process:
             * @see https://github.com/remix-run/remix/blob/b07921efd5e8eed98e2996749852777c71bc3e50/packages/remix-server-runtime/dev.ts#L37-L47
             *
             * Here we are setting up a stub function in the Oxygen worker
             * that will be called by Remix during development. Then, we forward
             * this request to the Node.js process (Vite server) where the actual
             * Remix function is called and the critical CSS is returned to the worker.
             */
            {
              script: (binding) => {
                // Setup global dev hooks in Remix in the worker environment
                // using the binding function passed from Node environment:
                // @ts-expect-error Remix global magic
                globalThis.__remix_devServerHooks = {getCriticalCss: binding};
              },
              binding: (...args) => {
                // Call the global Remix dev hook for critical CSS in Node environment:
                // @ts-expect-error Remix global magic
                return globalThis.__remix_devServerHooks?.getCriticalCss?.(
                  ...args,
                );
              },
            },
          ],
        } satisfies OxygenApiOptions);
      },
      configureServer(viteDevServer) {
        if (isRemixChildCompiler(viteDevServer.config)) return;

        return () => {
          setupHydrogenMiddleware(
            viteDevServer,
            mergeOptions(pluginOptions, apiOptions),
          );
        };
      },
    },
  ];
}

function mergeOptions(
  acc: HydrogenPluginOptions,
  newOptions: HydrogenPluginOptions,
) {
  const newOptionsWithoutUndefined = Object.fromEntries(
    Object.entries(newOptions).filter(([_, value]) => value !== undefined),
  );

  return {...acc, ...newOptionsWithoutUndefined};
}