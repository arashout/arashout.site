export interface Review {
  id: TextContainer;
  book: Book;
  rating: TextContainer;
  votes: TextContainer;
  spoiler_flag: TextContainer;
  spoilers_state: TextContainer;
  shelves: Shelves;
  recommended_for: Empty;
  recommended_by: Empty;
  started_at: TextContainer;
  read_at: TextContainer;
  date_added: TextContainer;
  date_updated: TextContainer;
  read_count: TextContainer;
  body: CData;
  comments_count: TextContainer;
  url: LinkOrUrl;
  link: LinkOrUrl;
  owned: TextContainer;
}
export interface TextContainer {
  _text: string;
}
export interface CData {
  _cdata: string;
}
export interface Book {
  id: IdOrTextReviewsCount;
  isbn: TextContainer;
  isbn13: TextContainer;
  text_reviews_count: IdOrTextReviewsCount;
  uri: TextContainer;
  title: TextContainer;
  title_without_series: TextContainer;
  image_url: TextContainer;
  small_image_url: TextContainer;
  large_image_url: Empty;
  link: TextContainer;
  num_pages: TextContainer;
  format: TextContainer;
  edition_information: TextContainer;
  publisher: TextContainer;
  publication_day: TextContainer;
  publication_year: TextContainer;
  publication_month: TextContainer;
  average_rating: TextContainer;
  ratings_count: TextContainer;
  description: TextContainer;
  authors: Authors;
  published: TextContainer;
  work: Work;
}
export interface IdOrTextReviewsCount {
  _attributes: Attributes;
  _text: string;
}
export interface Attributes {
  type: string;
}
export interface Empty {
}
export interface Authors {
  author: Author;
}
export interface Author {
  id: TextContainer;
  name: TextContainer;
  role: Empty;
  image_url: ImageUrlOrSmallImageUrl;
  small_image_url: ImageUrlOrSmallImageUrl;
  link: LinkOrUrl;
  average_rating: TextContainer;
  ratings_count: TextContainer;
  text_reviews_count: TextContainer;
}
export interface ImageUrlOrSmallImageUrl {
  _attributes: Attributes1;
  _cdata: string;
}
export interface Attributes1 {
  nophoto: string;
}
export interface LinkOrUrl {
  _cdata: string;
}
export interface Work {
  id: TextContainer;
  uri: TextContainer;
}
export interface Shelves {
  shelf: Shelf;
}
export interface Shelf {
  _attributes: Attributes2;
}
export interface Attributes2 {
  name: string;
  exclusive: string;
  id: string;
  review_shelf_id: string;
}
