import { bundleSources, readSource } from './_source_bundle.js';

export function readServicesApiEntrypoint(baseUrl = import.meta.url) {
  return readSource('../esm/native/services/api.ts', baseUrl);
}

export function bundleServicesApiPublicSources(baseUrl = import.meta.url, opts = {}) {
  return bundleSources(
    [
      '../esm/native/services/api_feature_surface.ts',
      '../esm/native/services/api_state_surface.ts',
      '../esm/native/services/api_services_surface.ts',
      '../esm/native/services/api_services_core_surface.ts',
      '../esm/native/services/api_services_ui_surface.ts',
      '../esm/native/services/api_services_project_surface.ts',
      '../esm/native/services/api_services_platform_surface.ts',
      '../esm/native/services/api_runtime_base_surface.ts',
      '../esm/native/services/api_actions_surface.ts',
    ],
    baseUrl,
    opts
  );
}

export function readServicesApiPublicSurface(baseUrl = import.meta.url, opts = {}) {
  return `${readServicesApiEntrypoint(baseUrl)}\n${bundleServicesApiPublicSources(baseUrl, opts)}`;
}
