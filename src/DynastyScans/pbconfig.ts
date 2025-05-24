import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  version: "0.1.0",
  name: "Dynasty Reader",
  icon: "icon.jpg",
  description: "Extension that pulls content from dynasty-scans.com.",
  contentRating: ContentRating.MATURE,
  developers: [
    {
      name: "Kagari Mimi",
      website: "https://kagari-mimi.github.io/onigiri",
      github: "https://github.com/kagari-mimi",
    },
  ],
  language: "English",
  badges: [],
  capabilities: [SourceIntents.DISCOVER_SECIONS],
} as SourceInfo;
