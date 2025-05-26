// Types shared by API routes
export interface LinkRow {
  id: number | bigint;
  url: string;
  times_allocated: number | bigint;
  times_purchased: number | bigint;
  error_count: number | bigint;
}

export interface LinkIdRow {
  link_id: number | bigint;
}
