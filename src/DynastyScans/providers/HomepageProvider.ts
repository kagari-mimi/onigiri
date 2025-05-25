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
  async getLatestUpdates(): Promise<PagedResults<DiscoverSectionItem>> {
    const [$, json] = await Promise.all([
      this.fetchHomepageHtml(),
      this.fetchHomepageJson(),
    ]);
    const latestUpdates: DiscoverSectionItem[] = [];

    // Extract latest updates
    $(".chapters .chapter").each((index, element) => {
      const chapterData = json.chapters![index];
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
          : chapterElement.find(".title small").first().text() || "Oneshot";

      // contentRating: if it's tagged with NSFW, then it's ADULT.
      const contentRating = chapterData.tags.some(
        (tag) => tag.permalink == "nsfw",
      )
        ? ContentRating.ADULT
        : ContentRating.EVERYONE;

      // Construct latest update chapter
      latestUpdates.push({
        type: "chapterUpdatesCarouselItem",
        mangaId: mangaId,
        chapterId: chapterId,
        imageUrl: imageUrl,
        title: title,
        subtitle: subtitle,
        contentRating: contentRating,
      });
    });

    return { items: latestUpdates };
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
