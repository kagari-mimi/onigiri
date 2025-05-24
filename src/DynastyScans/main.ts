import { Extension } from "@paperback/types";

/**
 * Interface defining all the capabilities this extension implements.
 */
type DynastyScansImplementation = Extension;

/**
 * Main extension class that implements all functionality for Dynasty Reader.
 * Acts as an entry to the individual provider services.
 */
export class DynastyScansExtension implements DynastyScansImplementation {
  // Extension implementation
  async initialise(): Promise<void> {}
}

export const DynastyScans = new DynastyScansExtension();
