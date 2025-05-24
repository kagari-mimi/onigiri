declare namespace DynastyScans {
  interface PaginatedResponse {
    chapters?: Chapter[];
    current_page: number;
    total_pages: number;
  }

  interface Chapter {
    title: string;
    series: string;
    permalink: string;
    tags: Tag[];
  }

  interface Tag {
    type: string;
    name: string;
    permalink: string;
  }
}
