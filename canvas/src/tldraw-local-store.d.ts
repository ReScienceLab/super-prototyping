import type { TLStoreOptions, TLStoreWithStatus } from "tldraw";

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
}
