import {
  ContentRating,
  DiscoverSectionItem,
  PagedResults,
} from "@paperback/types";
import { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio/slim";

/**
 * Provides data for discovery from the homepage of the site.
 */
export class HomepageProvider {
  // List of anthology tags to ignore
  private readonly notAnthologies = ["pixiv", "oneshots", "no_title"];

  // Store latest updates from the homepage
  private latestUpdates: DiscoverSectionItem[] = [];

  // Concurrency control for fetching the homepage
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Returns latest update chapters from the home page.
   */
  async getLatestUpdates(): Promise<PagedResults<DiscoverSectionItem>> {
    await this.fetchHomepageData();

    return { items: this.latestUpdates };
  }

  // Fetch homepage and extract data for various discovery sections
  private async fetchHomepageData() {
    // Blocking other async calls to this functon
    if (this.isLoading && this.loadingPromise) {
      await this.loadingPromise;
    } else {
      this.isLoading = true;
      this.loadingPromise = (async () => {
        const requests = [
          { url: "https://dynasty-scans.com", method: "GET" },
          { url: "https://dynasty-scans.com/?format=json", method: "GET" },
        ];
        let htmlBuffer: ArrayBuffer | null = null;
        let jsonBuffer: ArrayBuffer | null = null;
        try {
          [htmlBuffer, jsonBuffer] = await Promise.all(
            requests.map((request) =>
              Application.scheduleRequest(request).then(([, buffer]) => buffer),
            ),
          );
        } catch (error) {
          console.error("Failed to fetch homepage data:", error);
          htmlBuffer = jsonBuffer = null;
        }

        // Parse both HTML and JSON response
        let $: CheerioAPI | undefined;
        let chapters: DynastyScans.Chapter[] | undefined;
        if (htmlBuffer) {
          const htmlResponseBody =
            Application.arrayBufferToUTF8String(htmlBuffer);
          $ = cheerio.load(htmlResponseBody);
        }
        if (jsonBuffer) {
          try {
            const response = JSON.parse(
              Application.arrayBufferToUTF8String(jsonBuffer),
            ) as DynastyScans.PaginatedResponse;

            chapters = response.chapters;
          } catch (error) {
            console.error("Failed to parse homepage JSON:", error);
          }
        }

        if (chapters && $) {
          // Extract latest updates
          $(".chapters .chapter").each((index, element) => {
            const chapterData = chapters[index];
            const chapterElement = $(element);

            // Pre-lookup anthology tag and filter out non-anothology
            const anthologyTag = chapterData.tags.find(
              (tag) =>
                tag.type == "Anthology" &&
                !this.notAnthologies.includes(tag.permalink),
            );

            // mangaId:
            // - If this is part of a series, use permalink of the series.
            // - If this chapter is part of an anthology, use anthology's permalink.
            // - Otherwise, prefix the chapter's permalink with `oneshot/`.
            let mangaId = undefined;
            if (chapterData.series) {
              mangaId =
                "series/" +
                chapterData.tags.find((tag) => tag.type == "Series")!.permalink;
            } else if (anthologyTag) {
              mangaId = "anthologies/" + anthologyTag.permalink;
            } else {
              mangaId = "oneshots/" + chapterData.permalink;
            }

            // imageUrl: from `<img>` tag on the HTML page, substitute thumbnail
            // size to medium size.
            const imageUrl =
              "https://dynasty-scans.com" +
              chapterElement
                .find("img")
                .first()
                .attr("src")
                ?.replace("thumbnail.jpg", "medium.jpg");

            // chapterId: chapter's permalink (as it's unique).
            const chapterId = chapterData.permalink;

            // title: Use `series` if available, and fallback to `title` for
            // oneshots.
            const title = chapterData.series || chapterData.title;

            // subtitle:
            // - If the chapter is part of a series, remove the series' title from
            //   chapter's title to get the chapter number and chapter name.
            // - If the chapter is part of an anthology, display the anthology's
            //   name using the tag.
            // - If the chapter is a oneshot, display the text inside `<small>` tag.
            //   Usually this will say "Original Doujin"or something.
            const subtitle = chapterData.series
              ? chapterData.title
                  .replace(chapterData.series, "")
                  .trim()
                  .replace(/^ch0?/, "Ch. ")
              : anthologyTag
                ? anthologyTag.name
                : chapterElement.find(".title small").first().text() ||
                  "Oneshot";

            // contentRating: if it's tagged with NSFW, then it's ADULT.
            const contentRating = chapterData.tags.some(
              (tag) => tag.permalink == "nsfw",
            )
              ? ContentRating.ADULT
              : ContentRating.EVERYONE;

            // Construct latest update chapters
            this.latestUpdates.push({
              type: "chapterUpdatesCarouselItem",
              mangaId: mangaId,
              chapterId: chapterId,
              imageUrl: imageUrl,
              title: title,
              subtitle: subtitle,
              contentRating: contentRating,
            });

            // Mark the update progress as finished
            this.isLoading = false;
            this.loadingPromise = null;
          });
        }
      })();
      await this.loadingPromise;
    }
  }
}
