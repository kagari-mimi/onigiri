import {
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionProviding,
  DiscoverSectionType,
  Extension,
  PagedResults,
} from "@paperback/types";
import { HomepageProvider } from "./providers/HomepageProvider";
import { LatestUpdatesProvider } from "./providers/LatestUpdatesProvider";

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
  private latestUpdatesProvider: LatestUpdatesProvider =
    new LatestUpdatesProvider();

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
    metadata: DynastyScans.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    switch (section.id) {
      case "latest_updates":
        // Use homepageProvider for first page
        return metadata == undefined
          ? this.homepageProvider.getLatestUpdates(this.latestUpdatesProvider)
          : this.latestUpdatesProvider.getLatestUpdates(metadata);
      default:
        return { items: [] };
    }
  }
}

export const DynastyScans = new DynastyScansExtension();
