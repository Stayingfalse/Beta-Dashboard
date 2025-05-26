// Types shared by API routes
export interface LinkRow {
  id: number;
  url: string;
  times_allocated: number;
  times_purchased: number;
  error_count: number;
}

export interface LinkIdRow {
  link_id: number;
}
