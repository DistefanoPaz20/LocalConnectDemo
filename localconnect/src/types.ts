export type User = {
  id: number;
  name: string;
  email: string;
  role: "visitor" | "merchant" | "admin";
};
export type Business = {
  id: number;
  owner_id: number;
  category_id: number;
  node_id: number | null;
  name: string;
  description: string;
  address: string;
  phone: string;
  instagram: string;
  website: string;
  hours: string;
  image: string;
  price_level: string;
  status: string;
  category: string;
  rating: number | null;
  review_count: number;
  location: string;
  floor: string;
  gallery: string;
};
export type Category = { id: number; name: string; icon: string };
export type Post = {
  id: number;
  business_id: number;
  business_name: string;
  title: string;
  content: string;
  type: string;
  price: number | null;
  image: string;
  expires_at: string | null;
  status: string;
};
export type MapNode = {
  id: number;
  floor_id: number;
  label: string;
  kind: string;
  x: number;
  y: number;
};
export type Edge = {
  id: number;
  from_id: number;
  to_id: number;
  distance: number;
  accessible: number;
  active: number;
};
export type Gallery = {
  id: number;
  name: string;
  address: string;
  description: string;
  simulated: number;
};
export type Floor = {
  id: number;
  gallery_id: number;
  name: string;
  level: number;
};
export type MapData = {
  galleries: Gallery[];
  floors: Floor[];
  nodes: MapNode[];
  edges: Edge[];
};
export type Route = { nodes: MapNode[]; distance: number; accessible: boolean };
export type Review = {
  id: number;
  user_id: number;
  business_id: number;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: string;
  business_name?: string;
};
export type Catalog = {
  businesses: Business[];
  categories: Category[];
  favorites: number[];
  posts: Post[];
};
