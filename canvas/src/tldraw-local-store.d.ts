import type { TLStoreOptions, TLStoreWithStatus } from "tldraw";
import type { TLAssetStore } from "@tldraw/tlschema";

/**
 * `useLocalStore` is the hook `<Tldraw persistenceKey>` uses internally to build its store and
 * keep it in IndexedDB. It is exported at runtime from `@tldraw/editor`, and so from `tldraw`,
 * which re-exports that package wholesale, but it is marked "Excluded from this release type",
 * so it ships without a declaration. Hence this one.
 *
 * App.tsx needs it because the comment record types have to be registered on the store
 * (`records: commentSchemaRecords`) and `<Tldraw>` takes no `records` prop: it destructures a
 * fixed list of options on its way to building the store. Calling the hook directly keeps the
 * IndexedDB persistence exactly as it was. The alternative, `createTLStore` plus hand-rolled
 * snapshot saving, would reimplement it.
 */
declare module "tldraw" {
  export function useLocalStore(
    options: TLStoreOptions & { persistenceKey?: string; sessionId?: string },
  ): TLStoreWithStatus;

  /**
   * The asset store `createTLStore` installs when given none: uploads become `data:` URIs and
   * every asset resolves to its own `src`. Same packaging gap as above — `@tldraw/editor`
   * exports it, `tldraw` re-exports it at runtime, and the rolled-up declaration omits it.
   * App.tsx spreads it so that adding a `resolve` does not also mean reimplementing `upload`.
   */
  export const inlineBase64AssetStore: TLAssetStore;
  export type { TLAssetStore } from "@tldraw/tlschema";
}
