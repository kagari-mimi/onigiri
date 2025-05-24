import {
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionProviding,
  DiscoverSectionType,
  Extension,
  PagedResults,
} from "@paperback/types";
import { HomepageProvider } from "./providers/HomepageProvider";

/**
 * Interface defining all the capabilities this extension implements.
 */
type DynastyScansImplementation = Extension & DiscoverSectionProviding;

/**
 * Main extension class that implements all functionality for Dynasty Reader.
 * Acts as an entry to the individual provider services.
 */
export class DynastyScansExtension implements DynastyScansImplementation {
  // Provider instances for different functions of the extension
  private homepageProvider: HomepageProvider = new HomepageProvider();

  // Extension implementation
  async initialise(): Promise<void> {}

  // DiscoverSectionProviding implementation
  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "latest_updates",
        title: "Latest Updates",
        type: DiscoverSectionType.chapterUpdates,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    switch (section.id) {
      case "latest_updates":
        return this.homepageProvider.getLatestUpdates();
      default:
        return { items: [] };
    }
  }
}

export const DynastyScans = new DynastyScansExtension();
