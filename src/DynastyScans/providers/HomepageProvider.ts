import { DiscoverSectionItem, PagedResults } from "@paperback/types";
import { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio/slim";
import { LatestUpdatesProvider } from "./LatestUpdatesProvider";

/**
 * Provides data for discovery from the homepage of the site.
 *
 * This is similar to `LastUpdatesProvider`, but because homepage has a lot of
 * useful data, we can use this provider to fetch the homepage once, then
 * reuse the fetched data for multiple sections of the discovery page.
 */
export class HomepageProvider {
  // Base URL for the homepage
  private readonly baseUrl = "https://dynasty-scans.com";

  // List of anthology tags to ignore
  private readonly notAnthologies = ["pixiv", "oneshots", "no_title"];

  // Concurrency control for fetching the homepage
  private isLoadingHomepageHtml = false;
  private homepageHtmlPromise: Promise<CheerioAPI> | null = null;

  /**
   * Returns latest update chapters from the home page.
   */
  async getLatestUpdates(
    latestUpdatesProvider: LatestUpdatesProvider,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const [$, json] = await Promise.all([
      this.fetchHomepageHtml(),
      this.fetchHomepageJson(),
    ]);
    const collectedMangaIds: string[] = [];
    const items = await latestUpdatesProvider.constructDiscoverSectionItems(
      $,
      json,
      collectedMangaIds,
    );

    return {
      items,
      metadata:
        json.current_page < json.total_pages
          ? { page: json.current_page + 1, collectedMangaIds }
          : undefined,
    };
  }

  // Fetch HTML content of the homepage
  private async fetchHomepageHtml(): Promise<CheerioAPI> {
    // Make other asynchronous calls waiting for the first call
    if (this.isLoadingHomepageHtml && this.homepageHtmlPromise) {
      return await this.homepageHtmlPromise;
    } else {
      this.isLoadingHomepageHtml = true;
      this.homepageHtmlPromise = (async () => {
        const [, buffer] = await Application.scheduleRequest({
          url: this.baseUrl,
          method: "GET",
        });
        const html = Application.arrayBufferToUTF8String(buffer);
        return cheerio.load(html);
      })();

      return await this.homepageHtmlPromise;
    }
  }

  // Fetch JSON data of the homepage
  private async fetchHomepageJson(): Promise<DynastyScans.PaginatedResponse> {
    const [, buffer] = await Application.scheduleRequest({
      url: this.baseUrl + "?format=json",
      method: "GET",
    });
    return JSON.parse(
      Application.arrayBufferToUTF8String(buffer),
    ) as DynastyScans.PaginatedResponse;
  }
}
