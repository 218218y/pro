export type InstallContext<TOwner extends object = object> = {
  App: TOwner;
};

export function resolveInstallContext<TSurface extends object, TOwner extends object>(
  owners: WeakMap<object, InstallContext<TOwner>>,
  surface: TSurface,
  App: TOwner
): InstallContext<TOwner> {
  let context = owners.get(surface as object);
  if (!context) {
    context = { App };
    owners.set(surface as object, context);
    return context;
  }
  context.App = App;
  return context;
}
